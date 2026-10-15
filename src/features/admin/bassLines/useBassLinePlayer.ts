/**
 * The Bass Lines editor's audio: the line over a real drum groove from Drum
 * Grooves (same DrumMachineEngine, kits and pad trims a lesson plays), or over
 * a click when no groove is picked.
 *
 * Bass and drums are two looping Tone.Parts on the one transport, each with
 * its own loop length (a 4-bar line over a 1-bar groove). The drums play
 * exactly as the groove player plays them; the bass gets its own swing, baked
 * into its onsets the same way, so the transport itself runs straight. Every
 * edit rebuilds the parts without stopping, so a change is heard on the next
 * pass.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import {
  swingQuarters,
  type BassInstrument,
  type BassSwingOn,
  type RealizedLine,
} from '@/curriculum/engine/bassLines/bassLine';
import { createBassSampler } from '@/curriculum/engine/bassLines/bassSampler';
import type { TimeSignature } from '@/curriculum/engine/bassLines/harmony';
import {
  patternTicks,
  PPQ as GROOVE_PPQ,
  trimmedVelocity,
  type DrumGroove,
} from '@/curriculum/engine/drumGrooves/drumGroove';
import { swingOnset } from '@/curriculum/engine/genreGeneration/swing';
import { DrumMachineEngine } from '@/daw/instruments/DrumMachineEngine';
import { DRUM_KIT_CONFIGS } from '@/daw/instruments/drumKits';

/** Lessons run the drum engine through a 1.38 bridge (useBackingTrack). */
const LESSON_DRUM_GAIN = 1.38;

export interface BassPlayOptions {
  realized: RealizedLine;
  instrument: BassInstrument;
  timeSignature: TimeSignature;
  /** Quarter-note bpm. */
  tempo: number;
  /** The bass's swing: 50 straight … 66 triplet. The drums keep their own. */
  swing: number;
  swingOn: BassSwingOn;
  /** Null plays a click instead. */
  groove: DrumGroove | null;
  click: boolean;
}

interface BassEvent {
  time: string;
  kind: 'note' | 'click';
  midi: number;
  dur: string;
  velocity: number;
}

interface DrumEvent {
  time: string;
  note: number;
  velocity: number;
}

const tryDispose = (node: { dispose(): unknown } | null | undefined) => {
  try {
    node?.dispose();
  } catch {
    /* already gone */
  }
};

export function useBassLinePlayer(bassVolume: number, drumVolume: number) {
  const bassGain = useRef<Tone.Gain | null>(null);
  const sampler = useRef<{ kind: BassInstrument; node: Tone.Sampler } | null>(
    null,
  );
  const clickSynth = useRef<Tone.MembraneSynth | null>(null);
  const drumBridge = useRef<Tone.Gain | null>(null);
  const engine = useRef<DrumMachineEngine | null>(null);
  const kitId = useRef('');
  const bassPart = useRef<Tone.Part<BassEvent> | null>(null);
  const drumPart = useRef<Tone.Part<DrumEvent> | null>(null);
  const loopQ = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Quarter within the realized line the playhead is on, or null. */
  const [playheadQ, setPlayheadQ] = useState<number | null>(null);

  useEffect(() => {
    bassGain.current?.gain.rampTo(bassVolume, 0.05);
  }, [bassVolume]);
  useEffect(() => {
    drumBridge.current?.gain.rampTo(LESSON_DRUM_GAIN * drumVolume, 0.05);
  }, [drumVolume]);

  const disposeParts = () => {
    [bassPart, drumPart].forEach((ref) => {
      try {
        ref.current?.stop();
      } catch {
        /* already gone */
      }
      tryDispose(ref.current);
      ref.current = null;
    });
  };

  const ensureSampler = async (kind: BassInstrument) => {
    if (!bassGain.current)
      bassGain.current = new Tone.Gain(bassVolume).toDestination();
    if (sampler.current?.kind === kind) return sampler.current.node;
    tryDispose(sampler.current?.node);
    sampler.current = null;
    const node = await createBassSampler(kind, bassGain.current);
    sampler.current = { kind, node };
    return node;
  };

  const ensureDrums = async (groove: DrumGroove) => {
    if (!engine.current) {
      drumBridge.current = new Tone.Gain(
        LESSON_DRUM_GAIN * drumVolume,
      ).toDestination();
      const e = new DrumMachineEngine();
      await e.init(
        Tone.getContext().rawContext as AudioContext,
        drumBridge.current.input as unknown as AudioNode,
      );
      engine.current = e;
    }
    const kit = DRUM_KIT_CONFIGS.some((c) => c.id === groove.kit)
      ? groove.kit
      : 'natural';
    if (kit !== kitId.current || !engine.current.isLoaded()) {
      kitId.current = kit;
      await engine.current.setKit(kit);
    }
    return engine.current;
  };

  const stop = useCallback(() => {
    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel();
    disposeParts();
    setPlaying(false);
    setPlayheadQ(null);
  }, []);

  /**
   * Start, or — when already playing — swap in the edited line, groove or
   * tempo without stopping.
   */
  const play = useCallback(async (o: BassPlayOptions) => {
    setError(null);
    if (!o.realized.totalQuarters) return;
    try {
      if (Tone.getContext().state !== 'running') await Tone.start();
      setLoading(true);
      const bass = await ensureSampler(o.instrument);
      const drums = o.groove ? await ensureDrums(o.groove) : null;
      setLoading(false);

      const transport = Tone.getTransport();
      // Transport ticks depend on PPQ (192 by default, 480 once the Studio
      // has run), so everything is placed in quarters × PPQ.
      const ppq = transport.PPQ;
      const at = (q: number) => `${Math.round(q * ppq)}i`;

      const events: BassEvent[] = o.realized.notes.map((n) => ({
        time: at(swingQuarters(n.q, o.swing, o.swingOn)),
        kind: 'note',
        midi: n.midi,
        dur: `${Math.max(1, Math.round(n.dur * ppq))}i`,
        velocity: Math.max(0.05, Math.min(1, n.velocity)),
      }));
      if (!o.groove && o.click) {
        if (!clickSynth.current) {
          clickSynth.current = new Tone.MembraneSynth({
            pitchDecay: 0.008,
            octaves: 2,
            envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
            volume: -14,
          }).toDestination();
        }
        const barQ = o.realized.barQuarters;
        for (let q = 0; q < o.realized.totalQuarters - 1e-6; q += 1) {
          events.push({
            time: at(q),
            kind: 'click',
            midi: q % barQ < 1e-6 ? 1 : 0,
            dur: '32n',
            velocity: 0,
          });
        }
      }

      const synth = clickSynth.current;
      const nextBass = new Tone.Part<BassEvent>((time, ev) => {
        if (ev.kind === 'click') {
          synth?.triggerAttackRelease(
            ev.midi ? 'E5' : 'E4',
            '32n',
            time,
            ev.midi ? 0.9 : 0.55,
          );
          return;
        }
        if (bass.disposed) return;
        try {
          bass.triggerAttackRelease(
            Tone.Frequency(ev.midi, 'midi').toNote(),
            ev.dur,
            time,
            ev.velocity,
          );
        } catch {
          /* a note outside the sampler's range is skipped, not fatal */
        }
      }, events);
      nextBass.loop = true;
      nextBass.loopEnd = at(o.realized.totalQuarters);

      let nextDrums: Tone.Part<DrumEvent> | null = null;
      let drumLoopQ = 0;
      if (o.groove && drums) {
        const g = o.groove;
        const loopTicks = patternTicks(g);
        drumLoopQ = loopTicks / GROOVE_PPQ;
        const hits: DrumEvent[] = g.hits
          .filter((h) => h.tick < loopTicks)
          .map((h) => ({
            // Exactly as the groove player plays it: its own swing, and the
            // feel (ICP Studio's swing, for its grooves) in each hit's offset.
            time: at(
              Math.max(0, swingOnset(h.tick, g.swing) + (h.offset ?? 0)) /
                GROOVE_PPQ,
            ),
            note: h.note,
            velocity: trimmedVelocity(g, h),
          }));
        nextDrums = new Tone.Part<DrumEvent>(
          (time, ev) => drums.noteOn(ev.note, ev.velocity, time),
          hits,
        );
        nextDrums.loop = true;
        nextDrums.loopEnd = at(drumLoopQ);
      }

      disposeParts();
      transport.bpm.value = o.tempo;
      transport.swing = 0; // baked into the onsets
      transport.timeSignature = o.timeSignature;
      loopQ.current = o.realized.totalQuarters;

      if (transport.state === 'started') {
        // Join each part on its current pass, so the edit lands without a
        // restart. Tone plays a part started in the past from its next event.
        const nowQ = transport.ticks / ppq;
        const join = (len: number) => at(nowQ - (nowQ % len));
        nextBass.start(join(o.realized.totalQuarters));
        nextDrums?.start(join(drumLoopQ));
      } else {
        transport.cancel();
        transport.position = 0;
        nextBass.start(0);
        nextDrums?.start(0);
        transport.start('+0.05');
      }
      bassPart.current = nextBass;
      drumPart.current = nextDrums;
      setPlaying(true);
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : String(err));
    }
    // The refs carry the audio graph; volumes are applied by the effects above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The playhead, read from the transport each frame.
  useEffect(() => {
    if (!playing) return undefined;
    let raf = 0;
    const tick = () => {
      const transport = Tone.getTransport();
      if (loopQ.current > 0)
        setPlayheadQ((transport.ticks / transport.PPQ) % loopQ.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  // Leaving the editor with a line running would keep playing over the next
  // screen. Owned here, not in a useMemo (StrictMode double-disposes); the
  // refs are cleared so a second mount builds fresh nodes.
  useEffect(
    () => () => {
      const transport = Tone.getTransport();
      transport.stop();
      transport.cancel();
      disposeParts();
      tryDispose(sampler.current?.node);
      sampler.current = null;
      tryDispose(bassGain.current);
      bassGain.current = null;
      tryDispose(clickSynth.current);
      clickSynth.current = null;
      engine.current?.dispose();
      engine.current = null;
      tryDispose(drumBridge.current);
      drumBridge.current = null;
      kitId.current = '';
    },
    [],
  );

  return { play, stop, playing, loading, error, playheadQ };
}
