import type { SamplerConfig } from './SamplerInstrument';

// ── tonejs-instruments CDN ──────────────────────────────────────────────
// https://nbrosowsky.github.io/tonejs-instruments/
// MP3 files named by note: C2.mp3, Fs3.mp3, A4.mp3 ("s" = sharp)
// Tone.js Sampler interpolates between the sparse sample keys.

const TONEJS_INSTRUMENTS_BASE =
  'https://nbrosowsky.github.io/tonejs-instruments/samples/';

// ── Electric Piano ──────────────────────────────────────────────────────
// FluidR3 GM "Electric Piano 1" (a Rhodes-style tine piano) — the same samples
// the Learn lessons play through src/audio/epSampler.ts. tonejs-instruments has
// no electric piano: its `piano/` set is an acoustic grand, and it doesn't
// publish A0.mp3, which kept this sampler from ever finishing its load.

export const ELECTRIC_PIANO_CONFIG: SamplerConfig = {
  name: 'Electric Piano',
  baseUrl:
    'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/electric_piano_1-mp3/',
  sampleMap: {
    A0: 'A0.mp3',
    C1: 'C1.mp3',
    Eb1: 'Eb1.mp3',
    Gb1: 'Gb1.mp3',
    A1: 'A1.mp3',
    C2: 'C2.mp3',
    Eb2: 'Eb2.mp3',
    Gb2: 'Gb2.mp3',
    A2: 'A2.mp3',
    C3: 'C3.mp3',
    Eb3: 'Eb3.mp3',
    Gb3: 'Gb3.mp3',
    A3: 'A3.mp3',
    C4: 'C4.mp3',
    Eb4: 'Eb4.mp3',
    Gb4: 'Gb4.mp3',
    A4: 'A4.mp3',
    C5: 'C5.mp3',
    Eb5: 'Eb5.mp3',
    Gb5: 'Gb5.mp3',
    A5: 'A5.mp3',
    C6: 'C6.mp3',
    Eb6: 'Eb6.mp3',
    Gb6: 'Gb6.mp3',
    A6: 'A6.mp3',
    C7: 'C7.mp3',
    Eb7: 'Eb7.mp3',
    Gb7: 'Gb7.mp3',
    A7: 'A7.mp3',
    C8: 'C8.mp3',
  },
};

// ── Cello ───────────────────────────────────────────────────────────────

export const CELLO_CONFIG: SamplerConfig = {
  name: 'Cello',
  baseUrl: `${TONEJS_INSTRUMENTS_BASE}cello/`,
  // No F#2 or D#5: tonejs-instruments doesn't publish Fs2.mp3 / Ds5.mp3 for the
  // cello, and one missing file stops the whole sampler loading. Tone.Sampler
  // repitches the neighbouring samples across the gap.
  sampleMap: {
    C2: 'C2.mp3',
    'D#2': 'Ds2.mp3',
    A2: 'A2.mp3',
    C3: 'C3.mp3',
    'D#3': 'Ds3.mp3',
    'F#3': 'Fs3.mp3',
    A3: 'A3.mp3',
    C4: 'C4.mp3',
    'D#4': 'Ds4.mp3',
    'F#4': 'Fs4.mp3',
    A4: 'A4.mp3',
    C5: 'C5.mp3',
  },
};

// ── Organ ───────────────────────────────────────────────────────────────

export const ORGAN_CONFIG: SamplerConfig = {
  name: 'Organ',
  baseUrl: `${TONEJS_INSTRUMENTS_BASE}organ/`,
  sampleMap: {
    C2: 'C2.mp3',
    'D#2': 'Ds2.mp3',
    'F#2': 'Fs2.mp3',
    A2: 'A2.mp3',
    C3: 'C3.mp3',
    'D#3': 'Ds3.mp3',
    'F#3': 'Fs3.mp3',
    A3: 'A3.mp3',
    C4: 'C4.mp3',
    'D#4': 'Ds4.mp3',
    'F#4': 'Fs4.mp3',
    A4: 'A4.mp3',
    C5: 'C5.mp3',
    'D#5': 'Ds5.mp3',
    'F#5': 'Fs5.mp3',
    A5: 'A5.mp3',
  },
};
