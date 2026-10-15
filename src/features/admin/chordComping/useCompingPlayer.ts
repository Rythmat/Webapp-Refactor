/**
 * The Chord Comping editor's audio: the realized chords on the electric piano
 * the lessons comp with (epSamplerV2), over a real drum groove from Drum
 * Grooves (same DrumMachineEngine and kits), or a click, with an optional
 * bass line from Bass Lines on its sampler.
 *
 * Everything is a looping Tone.Part on the one transport. Chords and bass
 * share the progression's loop; the drums loop their own groove length. Every
 * edit rebuilds the parts without stopping, so a change is heard on the next
 * pass. Swing (from the groove) is baked into chord and bass onsets, as the
 * Bass Lines editor does.
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
import { quartersPerBar } from '@/curriculum/engine/bassLines/harmony';
import {
  patternTicks,
  PPQ as GROOVE_PPQ,
  trimmedVelocity,
  type DrumGroove,
} from '@/curriculum/engine/drumGrooves/drumGroove';
import type { BackingNote } from '@/curriculum/engine/genreGeneration/backingPatterns';
import {
  startEpSampler,
  triggerEpAttackRelease,
} from '@/curriculum/engine/genreGeneration/epSamplerV2';
import { swingOnset } from '@/curriculum/engine/genreGeneration/swing';
import { meterSwing, PPQ, type TimeSignature } from '@/curriculum/engine/meter';
import { DrumMachineEngine } from '@/daw/instruments/DrumMachineEngine';
import { DRUM_KIT_CONFIGS } from '@/daw/instruments/drumKits';

/** Lessons run the drum engine through a 1.38 bridge (useBackingTrack). */
const LESSON_DRUM_GAIN = 1.38;

export interface CompingPlayOptions {
  /** Realized chord notes, ticks at 480 per quarter. */
  chords: BackingNote[];
  /** A realized bass line over the same chart, or null. */
  bass: RealizedLine | null;
  bassInstrument: BassInstrument;
  /** Chords and bass loop here, in quarters. */
  loopQ: number;
  timeSignature: TimeSignature;
  /** Quarter-note bpm. */
  tempo: number;
  swing: number;
  swingOn: BassSwingOn;
  /** Null plays a click instead. */
  groove: DrumGroove | null;
  click: boolean;
}

interface PitchedEvent {
  time: string;
  kind: 'chord' | 'bass' | 'click';
  midi: number;
  /** Seconds for chords, transport ticks ("…i") for the rest. */
  dur: string;
  seconds: number;
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

export function useCompingPlayer(
  chordVolume: number,
  bassVolume: number,
  drumVolume: number,
) {
  const bassGain = useRef<Tone.Gain | null>(null);
  const sampler = useRef<{ kind: BassInstrument; node: Tone.Sampler } | null>(
    null,
  );
  const clickSynth = useRef<Tone.MembraneSynth | null>(null);
  const drumBridge = useRef<Tone.Gain | null>(null);
  const engine = useRef<DrumMachineEngine | null>(null);
  const kitId = useRef('');
  const pitchedPart = useRef<Tone.Part<PitchedEvent> | null>(null);
  const drumPart = useRef<Tone.Part<DrumEvent> | null>(null);
  const loopQ = useRef(0);
  // The EP sampler is shared with the lessons, so its level isn't touched:
  // the chord level scales each note's velocity instead.
  const chordLevel = useRef(chordVolume);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Quarter within the loop the playhead is on, or null. */
  const [playheadQ, setPlayheadQ] = useState<number | null>(null);

  useEffect(() => {
    chordLevel.current = chordVolume;
  }, [chordVolume]);
  useEffect(() => {
    bassGain.current?.gain.rampTo(bassVolume, 0.05);
  }, [bassVolume]);
  useEffect(() => {
    drumBridge.current?.gain.rampTo(LESSON_DRUM_GAIN * drumVolume, 0.05);
  }, [drumVolume]);

  const disposeParts = () => {
    [pitchedPart, drumPart].forEach((ref) => {
      try {
        ref.current?.stop();
      } catch {
        /* already gone */
      }
      tryDispose(ref.current);
      ref.current = null;
    });
  };

  const ensureBass = async (kind: BassInstrument) => {
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
   * Start, or — when already playing — swap in the edited pattern, groove,
   * bass or tempo without stopping.
   */
  const play = useCallback(async (o: CompingPlayOptions) => {
    setError(null);
    if (o.loopQ <= 0) return;
    try {
      if (Tone.getContext().state !== 'running') await Tone.start();
      setLoading(true);
      await startEpSampler();
      const bass = o.bass?.notes.length
        ? await ensureBass(o.bassInstrument)
        : null;
      const drums = o.groove ? await ensureDrums(o.groove) : null;
      setLoading(false);

      const transport = Tone.getTransport();
      // Transport ticks depend on PPQ (192 by default, 480 once the Studio
      // has run), so everything is placed in quarters × PPQ.
      const ppq = transport.PPQ;
      const at = (q: number) => `${Math.round(q * ppq)}i`;
      const secPerQ = 60 / o.tempo;
      const swing = meterSwing(o.swing, o.timeSignature);
      const swung = (q: number) => swingQuarters(q, swing, o.swingOn);

      const events: PitchedEvent[] = o.chords
        .filter((n) => n.onset / PPQ < o.loopQ - 1e-6)
        .map((n) => ({
          time: at(swung(n.onset / PPQ)),
          kind: 'chord',
          midi: n.note,
          dur: '',
          seconds: (n.duration / PPQ) * secPerQ,
          velocity: n.velocity / 127,
        }));
      if (bass && o.bass) {
        o.bass.notes
          .filter((n) => n.q < o.loopQ - 1e-6)
          .forEach((n) =>
            events.push({
              time: at(swung(n.q)),
              kind: 'bass',
              midi: n.midi,
              dur: `${Math.max(1, Math.round(n.dur * ppq))}i`,
              seconds: 0,
              velocity: Math.max(0.05, Math.min(1, n.velocity)),
            }),
          );
      }
      if (!o.groove && o.click) {
        if (!clickSynth.current) {
          clickSynth.current = new Tone.MembraneSynth({
            pitchDecay: 0.008,
            octaves: 2,
            envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
            volume: -14,
          }).toDestination();
        }
        const barQ = quartersPerBar(o.timeSignature);
        for (let q = 0; q < o.loopQ - 1e-6; q += 1) {
          events.push({
            time: at(q),
            kind: 'click',
            midi: q % barQ < 1e-6 ? 1 : 0,
            dur: '32n',
            seconds: 0,
            velocity: 0,
          });
        }
      }

      const synth = clickSynth.current;
      const nextPitched = new Tone.Part<PitchedEvent>((time, ev) => {
        if (ev.kind === 'click') {
          synth?.triggerAttackRelease(
            ev.midi ? 'E5' : 'E4',
            '32n',
            time,
            ev.midi ? 0.9 : 0.55,
          );
          return;
        }
        const note = Tone.Frequency(ev.midi, 'midi').toNote();
        if (ev.kind === 'chord') {
          void triggerEpAttackRelease(
            note,
            ev.seconds,
            ev.velocity * chordLevel.current,
            time,
          );
          return;
        }
        if (!bass || bass.disposed) return;
        try {
          bass.triggerAttackRelease(note, ev.dur, time, ev.velocity);
        } catch {
          /* a note outside the sampler's range is skipped, not fatal */
        }
      }, events);
      nextPitched.loop = true;
      nextPitched.loopEnd = at(o.loopQ);

      let nextDrums: Tone.Part<DrumEvent> | null = null;
      let drumLoopQ = 0;
      if (o.groove && drums) {
        const g = o.groove;
        const loopTicks = patternTicks(g);
        drumLoopQ = loopTicks / GROOVE_PPQ;
        const hits: DrumEvent[] = g.hits
          .filter((h) => h.tick < loopTicks)
          .map((h) => ({
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
      loopQ.current = o.loopQ;

      if (transport.state === 'started') {
        // Join each part on its current pass, so the edit lands without a
        // restart. Tone plays a part started in the past from its next event.
        const nowQ = transport.ticks / ppq;
        const join = (len: number) => at(nowQ - (nowQ % len));
        nextPitched.start(join(o.loopQ));
        nextDrums?.start(join(drumLoopQ));
      } else {
        transport.cancel();
        transport.position = 0;
        nextPitched.start(0);
        nextDrums?.start(0);
        transport.start('+0.05');
      }
      pitchedPart.current = nextPitched;
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

  // Leaving the editor with a pattern running would keep playing over the
  // next screen. Owned here, not in a useMemo (StrictMode double-disposes);
  // the refs are cleared so a second mount builds fresh nodes. The EP sampler
  // is the lessons' shared one, so it's left alone.
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
