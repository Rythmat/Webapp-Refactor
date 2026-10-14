// ── useGuitarMidiDetection ─────────────────────────────────────────────────
// Guitar/Bass-to-MIDI: turns a live guitar or bass audio track into a MIDI
// controller that drives a synth track's instrument in real time.
//
// Mounted once in DawApp. It reconciles a single active pairing:
//   source guitar-fx/bass-fx track (clean signal)  →  ProbabilisticOrchestrator
//     →  target MIDI/synth track's TrackEngine.noteOn/noteOff  (live sound)
//
// A MIDI (synth) track opts in via its `audioMidiSource` binding (set from the
// track controls). We tap the source adapter's clean pre-amp node with a
// NodeTapCapture (no second getUserMedia, and stop() never touches the shared
// DAW context), tune the engine for guitar/bass, and route detected notes to
// the target instrument + the on-screen keyboard + collaborators.
//
// Detection runs only while a binding is enabled AND the source has a live input
// device — otherwise the orchestrator is torn down (mirrors useAudioChordDetection's
// "find the active track or bail" gate, the false-positive guard).
//
// Nothing runs without a binding: the reconcile timer runs only while some
// MIDI track has an enabled `audioMidiSource` (a store subscription decides),
// and the keyboard flush is an engineClock task only while a pairing is live.

import { useEffect } from 'react';
import { useStore } from '@/daw/store';
import { subscribeEngineReady, trackEngineRegistry } from './usePlaybackEngine';
import { addFrameTask } from '@/daw/engine/engineClock';
import { GuitarFxAdapter } from '@/daw/instruments/GuitarFxAdapter';
import { NodeTapCapture } from '@/daw/audio/NodeTapCapture';
import {
  orchestratorOptionsFor,
  pitchProfileForInstrument,
} from '@/daw/audio/instrumentPitchProfiles';
import { ProbabilisticOrchestrator } from '@/learn/audio/v2/ProbabilisticOrchestrator';
import type { DetectionMode } from '@/learn/audio/v2/types';
import { studioRealtime } from '@/daw/collab/studioRealtime';

/** How often to re-check for binding/device changes (ms). */
const RECONCILE_MS = 300;

/** Keyboard-highlight flush cadence (~15Hz). The synth is driven per-edge and
 *  synchronously; only the on-screen keyboard is throttled, to avoid an up-to-
 *  40Hz full-keyboard React re-render storm during strums. */
const VIZ_FPS = 15;

interface ActivePairing {
  key: string;
  sourceNode: AudioNode;
  targetTrackId: string;
  instrument: 'guitar-fx' | 'bass-fx';
  mode: DetectionMode;
}

/** Whether some MIDI track has opted in to a guitar/bass source. */
function hasEnabledBinding(s: ReturnType<typeof useStore.getState>): boolean {
  return s.tracks.some(
    (t) => t.type === 'midi' && !!t.audioMidiSource?.enabled,
  );
}

/** Resolve the currently-active source→target pairing, or null if none. */
function resolvePairing(): ActivePairing | null {
  const { tracks } = useStore.getState();

  // The target is a MIDI track that has opted in.
  const target = tracks.find(
    (t) => t.type === 'midi' && t.audioMidiSource?.enabled,
  );
  if (!target?.audioMidiSource) return null;

  // Resolve the source guitar/bass track (explicit, else first available).
  const isAudioInstr = (i: string) => i === 'guitar-fx' || i === 'bass-fx';
  const src = target.audioMidiSource.sourceTrackId
    ? tracks.find(
        (t) =>
          t.id === target.audioMidiSource!.sourceTrackId &&
          isAudioInstr(t.instrument),
      )
    : tracks.find((t) => isAudioInstr(t.instrument));
  if (!src) return null;

  // The source adapter must be initialized with a live input device.
  const adapter = trackEngineRegistry.get(src.id)?.instrument;
  if (!(adapter instanceof GuitarFxAdapter)) return null;
  const sourceNode = adapter.getPitchDetectSourceNode();
  if (!sourceNode) return null;

  const instrument = src.instrument as 'guitar-fx' | 'bass-fx';
  const profile = pitchProfileForInstrument(instrument);
  const requested: DetectionMode =
    target.audioMidiSource.mode === 'poly' ? 'polyphonic' : 'monophonic';
  const mode: DetectionMode = profile.allowPolyphonic
    ? requested
    : 'monophonic';

  // Key encodes everything that requires a rebuild (incl. device swap). The
  // tapped node is compared too (see reconcile): a reloaded project makes new
  // adapters under the same ids.
  const key = `${src.id}:${src.audioInputId ?? ''}:${target.id}:${instrument}:${mode}`;
  return { key, sourceNode, targetTrackId: target.id, instrument, mode };
}

export function useGuitarMidiDetection(): void {
  useEffect(() => {
    let orchestrator: ProbabilisticOrchestrator | null = null;
    let capture: NodeTapCapture | null = null;
    let currentKey: string | null = null;
    let currentNode: AudioNode | null = null;
    let interval = 0;

    // Keyboard-highlight state: updated synchronously per note edge (cheap, no
    // store write), flushed to the store by a throttled frame task so the
    // keyboard re-renders at ~15Hz instead of up-to-40Hz during strums.
    const vizActive = new Set<number>();
    let vizFlushed = new Set<number>();
    let stopViz: (() => void) | null = null;

    const flushViz = () => {
      const add: number[] = [];
      const remove: number[] = [];
      for (const n of vizActive) if (!vizFlushed.has(n)) add.push(n);
      for (const n of vizFlushed) if (!vizActive.has(n)) remove.push(n);
      if (add.length || remove.length) {
        useStore.getState().hwNotesBatch(add, remove);
        vizFlushed = new Set(vizActive);
      }
    };

    const teardown = () => {
      // stop() releases held notes through our onNoteOff callback (so the
      // target instrument is silenced cleanly), then we disconnect the tap.
      orchestrator?.stop();
      orchestrator = null;
      capture?.stop();
      capture = null;
      // The loop stops with the pairing; the released notes leave the
      // keyboard now.
      stopViz?.();
      stopViz = null;
      vizActive.clear();
      flushViz();
    };

    const routeNoteOn = (targetTrackId: string, note: number, vel: number) => {
      trackEngineRegistry.get(targetTrackId)?.trackEngine.noteOn(note, vel);
      vizActive.add(note); // flushed to the keyboard by the throttled task
      if (studioRealtime.shouldBroadcast()) {
        studioRealtime.send({
          type: 'studio:note',
          action: 'on',
          note,
          velocity: vel,
          trackId: targetTrackId,
        });
      }
    };

    const routeNoteOff = (targetTrackId: string, note: number) => {
      trackEngineRegistry.get(targetTrackId)?.trackEngine.noteOff(note);
      vizActive.delete(note);
      if (studioRealtime.shouldBroadcast()) {
        studioRealtime.send({
          type: 'studio:note',
          action: 'off',
          note,
          velocity: 0,
          trackId: targetTrackId,
        });
      }
    };

    const reconcile = () => {
      const pairing = resolvePairing();
      const key = pairing?.key ?? null;
      const node = pairing?.sourceNode ?? null;
      if (key === currentKey && node === currentNode) return;

      teardown();
      currentKey = key;
      currentNode = node;
      if (!pairing) return;

      const { sourceNode, targetTrackId, instrument, mode } = pairing;
      const profile = pitchProfileForInstrument(instrument);

      capture = new NodeTapCapture(sourceNode, profile);
      orchestrator = new ProbabilisticOrchestrator(
        capture,
        mode,
        orchestratorOptionsFor(profile, mode),
      );
      orchestrator.setCallbacks({
        onNoteOn: (e) => routeNoteOn(targetTrackId, e.number, e.velocity),
        onNoteOff: (e) => routeNoteOff(targetTrackId, e.number),
      });
      void orchestrator.start();
      stopViz = addFrameTask(flushViz, {
        fps: VIZ_FPS,
        name: 'guitar-midi-keyboard',
      });
    };

    // The timer catches what no notice announces (an input device attached
    // to the source); it runs only while a binding is enabled.
    const syncBinding = (enabled: boolean) => {
      if (enabled && !interval) {
        interval = window.setInterval(reconcile, RECONCILE_MS);
      } else if (!enabled && interval) {
        window.clearInterval(interval);
        interval = 0;
      }
      reconcile();
    };

    const unsubscribeBinding = useStore.subscribe(
      hasEnabledBinding,
      syncBinding,
    );
    // A new engine (a project reload, an instrument swap) is a new source.
    const unsubscribeEngines = subscribeEngineReady(() => {
      if (interval) reconcile();
    });
    syncBinding(hasEnabledBinding(useStore.getState()));

    return () => {
      unsubscribeBinding();
      unsubscribeEngines();
      if (interval) window.clearInterval(interval);
      interval = 0;
      teardown();
    };
  }, []);
}
