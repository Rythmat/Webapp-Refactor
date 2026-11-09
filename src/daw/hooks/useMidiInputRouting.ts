import { useEffect, useRef } from 'react';
import { useStore } from '@/daw/store';
import { useMidiDevices } from './useMidiDevices';
import { useMidiRecording } from './useMidiRecording';
import { midiDeviceManager } from '@/daw/midi/MidiDeviceManager';
import { trackEngineRegistry } from './usePlaybackEngine';
import { useSynthStore } from '@/daw/oracle-synth/store';
import { getActiveSynthTrack } from '@/daw/oracle-synth/synthTrackState';
import {
  captureLiveNoteOff,
  captureLiveNoteOn,
  liveMidiTargets,
  playLiveNote,
  registerLiveRecorder,
  releaseLiveNote,
} from '@/daw/midi/liveNotes';
import { recordTargetTrackId } from '@/daw/midi/liveTarget';

/**
 * When the Oracle synth panel is open on one of the live tracks, mirror a
 * hardware wheel into its store so the on-screen PITCH/MOD wheels follow
 * (the store→engine sync then re-sends the same value — harmless).
 */
function mirrorToOracleWheels(
  targets: string[],
  apply: (s: ReturnType<typeof useSynthStore.getState>) => void,
): void {
  const active = getActiveSynthTrack();
  if (active && targets.includes(active)) apply(useSynthStore.getState());
}

// ── useMidiInputRouting ──────────────────────────────────────────────────
// Subscribes to ALL available MIDI input devices and routes note, CC and
// pitch-bend events to monitored (or selected) tracks, each event only to
// the tracks listening to its device or to All Devices (a track's
// midiInputId, liveTarget.trackHearsInput). Notes take the shared
// live-notes path (midi/liveNotes), which the computer keyboard uses too;
// this hook's MidiRecorder is the take they are recorded into.

export function useMidiInputRouting() {
  useMidiDevices();
  const midiRecorder = useMidiRecording();

  // Keep recorder in a ref so the effect doesn't re-fire when it changes
  const midiRecorderRef = useRef(midiRecorder);
  midiRecorderRef.current = midiRecorder;
  useEffect(
    () =>
      registerLiveRecorder({
        captureNoteOn: (note, velocity, timestamp) =>
          midiRecorderRef.current.captureNoteOn(note, velocity, timestamp),
        captureNoteOff: (note, timestamp) =>
          midiRecorderRef.current.captureNoteOff(note, timestamp),
      }),
    [],
  );

  const inputs = useStore((s) => s.inputs);
  const unsubsRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    // Clean up previous subscriptions
    for (const unsub of unsubsRef.current) unsub();
    unsubsRef.current = [];

    // Need at least one MIDI input
    if (inputs.length === 0) {
      console.log('[MIDI Routing] No inputs available');
      return;
    }

    console.log(
      `[MIDI Routing] Subscribing to ${inputs.length} input(s):`,
      inputs.map((i) => `"${i.name}"`).join(', '),
    );

    let noteCount = 0;

    // Sustain pedal (CC64) state — hold notes until pedal is released
    let sustainActive = false;
    const sustainHeldNotes = new Set<number>();

    const onNoteOn = (
      note: number,
      velocity: number,
      timestamp: number,
      source: string,
    ) => {
      // If re-striking a note held by sustain pedal, remove from pending release
      sustainHeldNotes.delete(note);

      if (noteCount++ < 3) {
        const targets = liveMidiTargets(source);
        const status = targets.map((id) => {
          const entry = trackEngineRegistry.get(id);
          if (!entry) return 'no-engine';
          return entry.trackEngine.getInstrument() ? 'ready' : 'loading';
        });
        if (targets.length > 0) {
          console.log(
            `[MIDI Routing] noteOn ${note} vel=${velocity} → ${targets.length} track(s) [${status.join(', ')}]`,
          );
        } else {
          console.warn(
            '[MIDI Routing] noteOn — no target (no monitored tracks, no selection)',
          );
        }
      }

      // Sound, keys, collaborators; then the take, when recording.
      playLiveNote(note, velocity, source);
      captureLiveNoteOn(note, velocity, timestamp, source);
    };

    const onNoteOff = (note: number, timestamp: number, source: string) => {
      // Record the physical noteOff regardless of sustain state
      captureLiveNoteOff(note, timestamp, source);

      // If sustain pedal is active, defer the release
      if (sustainActive) {
        sustainHeldNotes.add(note);
        return;
      }

      releaseLiveNote(note);
    };

    const onCC = (cc: number, value: number, source: string) => {
      // Record CC event if recording
      const state = useStore.getState();
      if (state.isRecording && recordTargetTrackId(state, source) !== null) {
        midiRecorderRef.current.captureCC(cc, value);
      }

      // Everything but sustain goes straight to the live instruments (mod
      // wheel, volume, Oracle macros CC20–27, GM controllers on SoundFont…).
      // Sustain is held here instead, so every instrument gets the same
      // pedal behaviour whether or not it implements CC64 itself.
      if (cc !== 64) {
        const targets = liveMidiTargets(source);
        for (const id of targets) {
          trackEngineRegistry.get(id)?.trackEngine.cc(cc, value);
        }
        if (cc === 1) {
          mirrorToOracleWheels(targets, (s) => s.setModWheel(value / 127));
        }
        return;
      }

      if (value >= 64) {
        sustainActive = true;
      } else {
        sustainActive = false;
        // Release all notes that were deferred while pedal was held
        for (const note of sustainHeldNotes) {
          releaseLiveNote(note);
        }
        sustainHeldNotes.clear();
      }
    };

    const onPitchBend = (value: number, source: string) => {
      const targets = liveMidiTargets(source);
      for (const id of targets) {
        trackEngineRegistry.get(id)?.trackEngine.pitchBend(value);
      }
      mirrorToOracleWheels(targets, (s) => s.setPitchBend(value));
    };

    // Subscribe to ALL inputs (not just the first — virtual ports may occupy index 0)
    for (const input of inputs) {
      const unsub = midiDeviceManager.subscribeToInput(
        input.id,
        (note, velocity, timestamp) =>
          onNoteOn(note, velocity, timestamp, input.id),
        (note, timestamp) => onNoteOff(note, timestamp, input.id),
        (cc, value) => onCC(cc, value, input.id),
        (value) => onPitchBend(value, input.id),
      );
      unsubsRef.current.push(unsub);
    }

    return () => {
      for (const unsub of unsubsRef.current) unsub();
      unsubsRef.current = [];
      sustainActive = false;
      // Notes the pedal was holding would otherwise ring on: no pedal-up
      // reaches them once the inputs are unsubscribed.
      for (const note of sustainHeldNotes) releaseLiveNote(note);
      sustainHeldNotes.clear();
    };
  }, [inputs]);
}
