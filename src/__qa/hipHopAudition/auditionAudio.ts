/**
 * Audio for the Hip Hop groove audition page. Owns its Tone nodes at module
 * level (never inside React hooks — see the Learn audio StrictMode rule) and
 * uses the same instruments as the lesson backing: DrumMachineEngine, the
 * electric bass sampler and the EP1 sampler. The 808 bass is a new voice.
 */

import * as Tone from 'tone';
import { startTone } from '@/audio/core/toneBridge';
import {
  createEightOhEight,
  play808,
  type EightOhEight,
} from '@/curriculum/engine/genreGeneration/eightOhEight';
import {
  startEpSampler,
  triggerEpAttackRelease,
} from '@/curriculum/engine/genreGeneration/epSamplerV2';
import { BASS_ELECTRIC_CONFIG } from '@/curriculum/hooks/useBackingTrack';
import { DrumMachineEngine } from '@/daw/instruments/DrumMachineEngine';
import type { DrumKitId } from '@/daw/instruments/drumKits';
import type { AuditionEvent, BassVoice } from './patterns';

export type AuditionPart = AuditionEvent['part'];

interface Engines {
  drums: DrumMachineEngine;
  drumBus: Tone.Gain;
  bassBus: Tone.Gain;
  electricBass: Tone.Sampler;
  sub808: EightOhEight;
}

let engines: Engines | null = null;
let loading: Promise<Engines> | null = null;
let part: Tone.Part<AuditionEvent> | null = null;

const levels: Record<AuditionPart, number> = { drums: 1, bass: 1, chords: 1 };
const muted: Record<AuditionPart, boolean> = {
  drums: false,
  bass: false,
  chords: false,
};
let bassVoice: BassVoice = 'electric';

function loadEngines(): Promise<Engines> {
  if (engines) return Promise.resolve(engines);
  if (loading) return loading;
  loading = (async () => {
    await startTone();
    const ctx = Tone.getContext().rawContext as AudioContext;

    const drumBus = new Tone.Gain(1.3).toDestination();
    const bassBus = new Tone.Gain(0.9).toDestination();

    const drums = new DrumMachineEngine();
    await drums.init(ctx, drumBus.input as unknown as AudioNode);

    const electricBass = await new Promise<Tone.Sampler>((resolve) => {
      const sampler: Tone.Sampler = new Tone.Sampler({
        urls: BASS_ELECTRIC_CONFIG.sampleMap,
        baseUrl: BASS_ELECTRIC_CONFIG.baseUrl,
        onload: () => resolve(sampler),
      });
      sampler.connect(bassBus);
    });

    const sub808 = createEightOhEight(bassBus);

    await startEpSampler();

    engines = { drums, drumBus, bassBus, electricBass, sub808 };
    return engines;
  })();
  return loading;
}

export async function prepare(kit: DrumKitId): Promise<void> {
  const e = await loadEngines();
  await e.drums.setKit(kit);
}

export function setLevel(p: AuditionPart, value: number): void {
  levels[p] = value;
  if (!engines) return;
  if (p === 'drums') engines.drumBus.gain.rampTo(1.3 * value, 0.05);
  if (p === 'bass') engines.bassBus.gain.rampTo(0.9 * value, 0.05);
}

export function setMuted(p: AuditionPart, value: boolean): void {
  muted[p] = value;
}

// General MIDI bass sets from the same CDN as the lesson's EP1 sampler.
const GM_BASSES: Partial<Record<BassVoice, string>> = {
  fretless: 'FluidR3_GM/fretless_bass',
  fretless_mk: 'MusyngKite/fretless_bass',
  finger: 'FluidR3_GM/electric_bass_finger',
  upright: 'FluidR3_GM/acoustic_bass',
};
// Level-matched to the electric bass sampler: the gap in mean loudness,
// measured with ffmpeg volumedetect on A1, C2 and E♭2 (peaks stay ~9 dB clear).
const GM_BASS_GAIN_DB: Partial<Record<BassVoice, number>> = {
  fretless: 7,
  fretless_mk: 8,
  finger: 8,
  upright: 9,
};
const GM_SAMPLE_NOTES = [
  'A0',
  'C1',
  'Eb1',
  'Gb1',
  'A1',
  'C2',
  'Eb2',
  'Gb2',
  'A2',
  'C3',
  'Eb3',
  'Gb3',
  'A3',
  'C4',
];
const gmSamplers = new Map<BassVoice, Promise<Tone.Sampler>>();
const gmLoaded = new Map<BassVoice, Tone.Sampler>();

function loadGmBass(voice: BassVoice): Promise<Tone.Sampler> | null {
  const path = GM_BASSES[voice];
  if (!path || !engines) return null;
  let loading = gmSamplers.get(voice);
  if (!loading) {
    const bus = engines.bassBus;
    loading = new Promise<Tone.Sampler>((resolve) => {
      const sampler: Tone.Sampler = new Tone.Sampler({
        urls: Object.fromEntries(GM_SAMPLE_NOTES.map((n) => [n, `${n}.mp3`])),
        baseUrl: `https://gleitz.github.io/midi-js-soundfonts/${path}-mp3/`,
        volume: GM_BASS_GAIN_DB[voice] ?? 0,
        onload: () => {
          gmLoaded.set(voice, sampler);
          resolve(sampler);
        },
      });
      sampler.connect(bus);
    });
    gmSamplers.set(voice, loading);
  }
  return loading;
}

export async function setBassVoice(voice: BassVoice): Promise<void> {
  bassVoice = voice;
  await loadGmBass(voice);
}

const midiName = (n: number) => Tone.Frequency(n, 'midi').toNote();

function trigger(time: number, ev: AuditionEvent, spt: number): void {
  const e = engines;
  if (!e || muted[ev.part]) return;
  const dur = ev.dur * spt;

  if (ev.part === 'drums') {
    e.drums.noteOn(ev.note, ev.vel, time);
    return;
  }

  if (ev.part === 'bass') {
    if (bassVoice === '808') {
      play808(e.sub808, ev.note, dur, time, ev.vel / 127, ev.glideFrom);
    } else {
      const sampler = gmLoaded.get(bassVoice) ?? e.electricBass;
      sampler.triggerAttackRelease(midiName(ev.note), dur, time, ev.vel / 127);
    }
    return;
  }

  void triggerEpAttackRelease(
    midiName(ev.note),
    dur,
    Math.round(ev.vel * levels.chords),
    time,
  );
}

/** Start (or restart) a looping playback of `events`. */
export async function play(
  events: AuditionEvent[],
  bpm: number,
  loopTicks: number,
  kit: DrumKitId,
): Promise<void> {
  await prepare(kit);
  await loadGmBass(bassVoice);
  stop();
  const transport = Tone.getTransport();
  const spt = 60 / (bpm * 480);
  transport.bpm.value = bpm;
  transport.loop = true;
  transport.loopStart = 0;
  transport.loopEnd = loopTicks * spt;

  part = new Tone.Part<AuditionEvent>(
    (time, ev) => trigger(time, ev, spt),
    events.map((ev) => ({ ...ev, time: ev.tick * spt })),
  );
  part.start(0);
  transport.start('+0.1', 0);
}

export function stop(): void {
  const transport = Tone.getTransport();
  transport.stop();
  transport.cancel();
  transport.loop = false;
  part?.dispose();
  part = null;
  engines?.sub808.synth.triggerRelease();
}

/** Current position in ticks (480 per quarter), or null when stopped. */
export function positionTicks(bpm: number): number | null {
  const transport = Tone.getTransport();
  if (transport.state !== 'started') return null;
  return transport.seconds / (60 / (bpm * 480));
}
