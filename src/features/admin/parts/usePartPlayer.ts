/**
 * The Parts editor's audio: the part on the Studio instrument it will land on
 * (createInstrument — same samples, same voices), looped, with swing as the
 * lessons apply it. Every edit swaps the Tone.Part in without stopping, so a
 * change is heard on the next pass.
 *
 * Exposes the playhead and loop in part ticks (PPQ 480) for the piano roll's
 * host.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { swingOnset } from '@/curriculum/engine/genreGeneration/swing';
import { applyFeel, type FeelProfile } from '@/curriculum/engine/parts/feel';
import { partTicks, type InstrumentPart } from '@/curriculum/engine/parts/part';
import { createInstrument } from '@/daw/hooks/usePlaybackEngine';
import type { InstrumentAdapter } from '@/daw/instruments/InstrumentAdapter';
import { OracleSynthAdapter } from '@/daw/instruments/OracleSynthAdapter';
import { FACTORY_PRESETS } from '@/daw/oracle-synth/store/presets/factoryPresets';
import {
  applySynthStateToEngine,
  synthTrackStateFromPreset,
} from '@/daw/oracle-synth/synthTrackState';
import type { LoopState } from '@/daw/store/transportSlice';
import { countIn as countInBar, makeClick, scheduleClicks } from './metronome';
import { parseSound } from './sounds';

interface PartEvent {
  time: string;
  midi: number;
  velocity: number;
  duration: string;
}

export function usePartPlayer() {
  const instrumentRef = useRef<{
    key: string;
    adapter: InstrumentAdapter;
  } | null>(null);
  const outRef = useRef<Tone.Gain | null>(null);
  const partRef = useRef<Tone.Part<PartEvent> | null>(null);
  const clickRef = useRef<Tone.Synth | null>(null);
  const unclickRef = useRef<(() => void) | null>(null);
  const sounding = useRef(new Set<number>());
  /**
   * Keys held on the MIDI keyboard. Kept apart from the part's own notes: a
   * replay (every captured note is one) lets go of those, never of a key
   * still down.
   */
  const held = useRef(new Set<number>());
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState(0);
  /** An editor-only loop inside the part; disabled = the whole part. */
  const [loop, setLoopState] = useState<LoopState>({
    enabled: false,
    start: 0,
    end: 0,
  });
  const loopRef = useRef(loop);
  loopRef.current = loop;
  const lengthRef = useRef(1920);

  const scale = () => Tone.getTransport().PPQ / 480;

  const ensureInstrument = useCallback(async (sound: string) => {
    if (Tone.getContext().state !== 'running') await Tone.start();
    if (!outRef.current) outRef.current = new Tone.Gain(1).toDestination();
    if (instrumentRef.current?.key === sound)
      return instrumentRef.current.adapter;
    instrumentRef.current?.adapter.dispose?.();
    const { type, gmProgram, drumKit, bassVoice, synthPatch } =
      parseSound(sound);
    const adapter = createInstrument(type, gmProgram, drumKit, bassVoice);
    if (!adapter) throw new Error(`No instrument for "${sound}".`);
    setLoading(true);
    try {
      await adapter.init(
        Tone.getContext().rawContext as AudioContext,
        outRef.current.input as unknown as AudioNode,
      );
    } finally {
      setLoading(false);
    }
    // A synth part plays its patch, applied the way a saved project's is.
    const preset = FACTORY_PRESETS.find((p) => p.name === synthPatch);
    const engine =
      adapter instanceof OracleSynthAdapter ? adapter.getEngine() : null;
    if (preset && engine) {
      applySynthStateToEngine(engine, synthTrackStateFromPreset(preset, 120));
    }
    instrumentRef.current = { key: sound, adapter };
    return adapter;
  }, []);

  const releaseAll = useCallback(() => {
    const adapter = instrumentRef.current?.adapter;
    sounding.current.forEach((n) => adapter?.noteOff(n));
    sounding.current.clear();
  }, []);

  const disposePart = () => {
    try {
      partRef.current?.stop();
      partRef.current?.dispose();
    } catch {
      /* already gone */
    }
    partRef.current = null;
    unclickRef.current?.();
    unclickRef.current = null;
  };

  /** Apply the loop window (editor loop, else the whole part) to the transport. */
  const applyTransportLoop = useCallback(() => {
    const transport = Tone.getTransport();
    const l = loopRef.current;
    const s = scale();
    const [start, end] =
      l.enabled && l.end > l.start ? [l.start, l.end] : [0, lengthRef.current];
    transport.loop = true;
    transport.loopStart = `${Math.round(start * s)}i`;
    transport.loopEnd = `${Math.round(end * s)}i`;
  }, []);

  const stop = useCallback(() => {
    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel();
    disposePart();
    releaseAll();
    setPlaying(false);
  }, [releaseAll]);

  const play = useCallback(
    async (
      part: InstrumentPart,
      feel?: FeelProfile,
      /** Click every beat (the metronome), downbeats accented. */
      options: { click?: boolean } = {},
    ) => {
      const adapter = await ensureInstrument(part.sound);
      const transport = Tone.getTransport();
      const s = scale();
      const at = (tick: number) => `${Math.round(tick * s)}i`;
      lengthRef.current = partTicks(part);

      // Written notes, swung, then played: each note's own feel, else the
      // part's feel profile.
      const events: PartEvent[] = applyFeel(part.notes, feel)
        .filter((n) => n.tick < lengthRef.current)
        .map((n) => ({
          time: at(
            Math.max(0, swingOnset(n.tick, part.swing) + (n.offset ?? 0)),
          ),
          midi: n.midi,
          velocity: n.velocity,
          duration: at(Math.max(30, n.duration - 10)),
        }));

      disposePart();
      releaseAll();
      const tonePart = new Tone.Part<PartEvent>((time, ev) => {
        // A key held live on the same pitch wins over the part's own note.
        if (held.current.has(ev.midi)) return;
        adapter.noteOn(ev.midi, ev.velocity, time);
        sounding.current.add(ev.midi);
        const off = time + Tone.Time(ev.duration).toSeconds();
        // Released just ahead of time, unless that key went down live since.
        const wait = Math.max(0, (off - Tone.now() - 0.05) * 1000);
        window.setTimeout(() => {
          if (!held.current.has(ev.midi)) adapter.noteOff(ev.midi, off);
        }, wait);
      }, events);
      transport.bpm.value = part.tempo;
      transport.swing = 0;
      const starting = transport.state !== 'started';
      // Clear what an earlier session left on the timeline BEFORE scheduling
      // this part: cancel() removes everything scheduled, the part included.
      if (starting) transport.cancel();
      applyTransportLoop();
      tonePart.start(0);
      if (options.click) {
        clickRef.current ??= makeClick();
        unclickRef.current = scheduleClicks(
          clickRef.current,
          part.timeSignature,
          lengthRef.current,
          at,
        );
      }
      if (starting) {
        transport.ticks = Math.round(
          (loopRef.current.enabled ? loopRef.current.start : 0) * s,
        );
        transport.start('+0.05');
      }
      partRef.current = tonePart;
      setPlaying(true);
    },
    [ensureInstrument, releaseAll, applyTransportLoop],
  );

  const setLoop = useCallback(
    (patch: Partial<LoopState>) => {
      setLoopState((l) => {
        const next = { ...l, ...patch };
        loopRef.current = next;
        return next;
      });
      applyTransportLoop();
    },
    [applyTransportLoop],
  );

  const seek = useCallback(
    (tick: number) => {
      releaseAll();
      Tone.getTransport().ticks = Math.max(0, Math.round(tick * scale()));
      setPosition(Math.max(0, tick));
    },
    [releaseAll],
  );

  /** One note, as drawing feedback. */
  const audition = useCallback(
    async (sound: string, midi: number, velocity = 96) => {
      const adapter = await ensureInstrument(sound);
      adapter.noteOn(midi, velocity);
      adapter.noteOff(midi, Tone.now() + 0.4);
    },
    [ensureInstrument],
  );

  /** Live input: sound a key as it's played, and release it. */
  const liveOn = useCallback(
    async (sound: string, midi: number, velocity: number) => {
      const adapter = await ensureInstrument(sound);
      adapter.noteOn(midi, velocity);
      held.current.add(midi);
    },
    [ensureInstrument],
  );
  const liveOff = useCallback((midi: number) => {
    instrumentRef.current?.adapter.noteOff(midi);
    held.current.delete(midi);
  }, []);

  /** Where the transport is, in part ticks. */
  const currentTick = useCallback(
    () => Tone.getTransport().ticks / scale(),
    [],
  );

  /** One bar of clicks before `then` — a count-in for live capture. */
  const countIn = useCallback(
    (part: InstrumentPart, then: () => void) =>
      countInBar(part.timeSignature, part.tempo, then),
    [],
  );

  // Follow the transport for the playhead while playing.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      setPosition(Tone.getTransport().ticks / scale());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  // Leaving the editor stops everything. Owned here, not in a useMemo.
  useEffect(
    () => () => {
      const transport = Tone.getTransport();
      transport.stop();
      transport.cancel();
      transport.loop = false;
      disposePart();
      clickRef.current?.dispose();
      clickRef.current = null;
      instrumentRef.current?.adapter.dispose?.();
      instrumentRef.current = null;
      outRef.current?.dispose();
      outRef.current = null;
    },
    [],
  );

  return {
    play,
    stop,
    audition,
    seek,
    setLoop,
    liveOn,
    liveOff,
    currentTick,
    countIn,
    loop,
    position,
    playing,
    loading,
  };
}
