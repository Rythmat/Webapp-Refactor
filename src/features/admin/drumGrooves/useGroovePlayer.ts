/**
 * The designer's audio: the same DrumMachineEngine, kits, pad trims and swing a
 * student's play-along uses, so what you balance here is what they hear. An
 * editor that plays a close approximation is worse than useless for mixing a
 * hi-hat against a kick.
 *
 * Every musical edit rebuilds the Tone.Part without stopping the transport, so
 * a change is heard on the next pass of the loop.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import {
  gridTicks,
  patternTicks,
  trimmedVelocity,
  type DrumGroove,
} from '@/curriculum/engine/drumGrooves/drumGroove';
import { swingOnset } from '@/curriculum/engine/genreGeneration/swing';
import { DrumMachineEngine } from '@/daw/instruments/DrumMachineEngine';
import {
  DRUM_KIT_CONFIGS,
  type DrumKitConfig,
} from '@/daw/instruments/drumKits';

/** Lessons run the drum engine through a 1.38 bridge (useBackingTrack). */
const LESSON_DRUM_GAIN = 1.38;

/** A cursor event: no sound, just the playhead moving across empty steps. */
const CURSOR = -1;

interface PartEvent {
  time: string;
  note: number;
  velocity: number;
  tick: number;
}

export interface PlayOptions {
  /** Pads to silence while editing (not saved). */
  muted: ReadonlySet<number>;
  /** An unsaved custom kit to audition instead of `groove.kit`. */
  kitOverride?: DrumKitConfig;
}

export function useGroovePlayer(monitor: number) {
  const engineRef = useRef<DrumMachineEngine | null>(null);
  const bridgeRef = useRef<Tone.Gain | null>(null);
  const partRef = useRef<Tone.Part<PartEvent> | null>(null);
  const kitKeyRef = useRef<string>('');
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  /** Tick within the pattern the playhead is on, or null when stopped. */
  const [playTick, setPlayTick] = useState<number | null>(null);

  const ensureEngine = useCallback(async () => {
    if (Tone.getContext().state !== 'running') await Tone.start();
    if (!engineRef.current) {
      bridgeRef.current = new Tone.Gain(LESSON_DRUM_GAIN * monitor);
      bridgeRef.current.toDestination();
      const engine = new DrumMachineEngine();
      await engine.init(
        Tone.getContext().rawContext as AudioContext,
        bridgeRef.current.input as unknown as AudioNode,
      );
      engineRef.current = engine;
    }
    return engineRef.current;
    // monitor is applied by the effect below once the bridge exists.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bridgeRef.current?.gain.rampTo(LESSON_DRUM_GAIN * monitor, 0.05);
  }, [monitor]);

  /** Load the kit if it changed — by id, or by content for an unsaved kit. */
  const ensureKit = useCallback(
    async (kitId: string, override?: DrumKitConfig) => {
      const engine = await ensureEngine();
      const key = override ? JSON.stringify(override) : kitId;
      if (key === kitKeyRef.current && engine.isLoaded()) return engine;
      kitKeyRef.current = key;
      setLoading(true);
      try {
        if (override) await engine.loadKitConfig(override);
        else if (DRUM_KIT_CONFIGS.some((c) => c.id === kitId))
          await engine.setKit(kitId);
        else await engine.setKit('natural');
      } finally {
        setLoading(false);
      }
      return engine;
    },
    [ensureEngine],
  );

  const disposePart = () => {
    try {
      partRef.current?.stop();
      partRef.current?.dispose();
    } catch {
      /* already gone */
    }
    partRef.current = null;
  };

  const stop = useCallback(() => {
    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel();
    disposePart();
    setPlaying(false);
    setPlayTick(null);
  }, []);

  /**
   * Start, or — when already playing — swap in the edited pattern without
   * stopping, so you hear the change on the next pass.
   */
  const play = useCallback(
    async (groove: DrumGroove, { muted, kitOverride }: PlayOptions) => {
      const engine = await ensureKit(groove.kit, kitOverride);
      const transport = Tone.getTransport();
      // Transport ticks are PPQ-dependent (192 default, 480 once the Studio
      // has run); groove ticks are always 480.
      const scale = transport.PPQ / 480;
      const at = (tick: number) => `${Math.round(tick * scale)}i`;
      const loop = patternTicks(groove);
      if (loop <= 0) return;

      const events: PartEvent[] = groove.hits
        .filter((hit) => !muted.has(hit.note) && hit.tick < loop)
        .map((hit) => ({
          // Swing moves the written note; the played feel rides on top.
          time: at(
            Math.max(0, swingOnset(hit.tick, groove.swing) + (hit.offset ?? 0)),
          ),
          note: hit.note,
          velocity: trimmedVelocity(groove, hit),
          tick: hit.tick,
        }));
      const step = gridTicks(groove.grid);
      for (let tick = 0; tick < loop; tick += step) {
        events.push({ time: at(tick), note: CURSOR, velocity: 0, tick });
      }

      disposePart();
      const part = new Tone.Part<PartEvent>((time, ev) => {
        if (ev.note === CURSOR) {
          Tone.getDraw().schedule(() => setPlayTick(ev.tick), time);
        } else {
          engine.noteOn(ev.note, ev.velocity, time);
        }
      }, events);
      part.loop = true;
      part.loopEnd = at(loop);
      transport.bpm.value = groove.tempo;
      transport.swing = 0; // swing is baked into the onsets, as in lessons

      if (transport.state === 'started') {
        // Join on the current pass so the edit lands without a restart.
        // Tone schedules a part started in the past from its next due event.
        const now = transport.ticks;
        const loopT = Math.round(loop * scale);
        part.start(`${now - (now % loopT)}i`);
      } else {
        transport.cancel();
        transport.position = 0;
        part.start(0);
        transport.start('+0.05');
      }
      partRef.current = part;
      setPlaying(true);
    },
    [ensureKit],
  );

  /** One hit, for auditioning a pad while choosing its level or sample. */
  const audition = useCallback(
    async (
      kitId: string,
      note: number,
      velocity = 96,
      kitOverride?: DrumKitConfig,
    ) => {
      const engine = await ensureKit(kitId, kitOverride);
      engine.noteOn(note, velocity);
    },
    [ensureKit],
  );

  // Leaving the designer with a groove running would keep playing over the
  // next screen. Owned here, not in a useMemo (StrictMode double-disposes).
  useEffect(
    () => () => {
      const transport = Tone.getTransport();
      transport.stop();
      transport.cancel();
      disposePart();
      engineRef.current?.dispose();
      engineRef.current = null;
      bridgeRef.current?.dispose();
      bridgeRef.current = null;
      kitKeyRef.current = '';
    },
    [],
  );

  return { play, stop, audition, playing, loading, playTick };
}
