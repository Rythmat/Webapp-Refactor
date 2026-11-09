import {
  DEFAULT_EFFECTS,
  type EffectSlotType,
  type EqBand,
  type TrackEffectState,
} from '@/daw/audio/EffectChain';

// ── The effects' factory presets (the Add effect picker's Presets) ─────────
//
// Starting points a student can pick instead of a bare effect: each sets
// one effect's controls for a common job, with a line on what it's for in
// plain words. A preset is only values: picking it adds the effect (or, if
// the rack has it, sets it) and the student shapes it from there. Values
// stay inside each control's range (EffectChain.ts) and follow common
// studio practice: slow attacks let drum hits through a compressor, a
// vocal's mud sits near 250 Hz, a slapback is one repeat near 110 ms. The
// delays are in note lengths, so they follow the song's tempo.

export interface EffectPreset<S extends EffectSlotType = EffectSlotType> {
  id: string;
  slot: S;
  name: string;
  /** What it's for, in one line. */
  about: string;
  /** The controls it sets; the rest keep their values. */
  values(ctx: { bpm: number }): Partial<TrackEffectState[S]>;
}

const preset = <S extends EffectSlotType>(p: EffectPreset<S>) =>
  p as unknown as EffectPreset;

/** `beats` quarter notes at `bpm`, in seconds, inside the delay's 2 s. */
const beatsAt = (beats: number, bpm: number) =>
  Math.min(2, Number(((60 / Math.max(1, bpm)) * beats).toFixed(3)));

/** The EQ's default bands with `changes` by index (lowcut 0 … highcut 7). */
const eqBands = (changes: Record<number, Partial<EqBand>>): EqBand[] =>
  DEFAULT_EFFECTS.eq.bands.map((band, i) => ({ ...band, ...changes[i] }));

export const EFFECT_PRESETS: readonly EffectPreset[] = [
  // ── Compressor ──
  preset({
    id: 'compressor-glue',
    slot: 'compressor',
    name: 'Gentle glue',
    about: 'Light, slow squeeze that holds a mix or a group together',
    values: () => ({
      threshold: -18,
      ratio: 2,
      knee: 10,
      attack: 0.03,
      release: 0.3,
      makeup: 2,
    }),
  }),
  preset({
    id: 'compressor-vocal',
    slot: 'compressor',
    name: 'Vocal leveler',
    about: 'Keeps a voice at one steady level, quiet words and loud',
    values: () => ({
      threshold: -22,
      ratio: 4,
      knee: 6,
      attack: 0.005,
      release: 0.12,
      makeup: 5,
    }),
  }),
  preset({
    id: 'compressor-drums',
    slot: 'compressor',
    name: 'Punchy drums',
    about: 'A slow attack lets each hit through, then tightens the tail',
    values: () => ({
      threshold: -20,
      ratio: 4,
      knee: 2,
      attack: 0.03,
      release: 0.1,
      makeup: 4,
    }),
  }),
  preset({
    id: 'compressor-bass',
    slot: 'compressor',
    name: 'Steady bass',
    about: 'Evens out a bass line so every note sits at the same weight',
    values: () => ({
      threshold: -24,
      ratio: 5,
      knee: 6,
      attack: 0.01,
      release: 0.2,
      makeup: 4,
    }),
  }),

  // ── Gate ──
  preset({
    id: 'gate-drums',
    slot: 'gate',
    name: 'Tight drums',
    about: 'Cuts the ring between hits for a short, dry drum sound',
    values: () => ({
      threshold: -30,
      range: 60,
      hold: 0.02,
      attack: 0.001,
      release: 0.08,
    }),
  }),
  preset({
    id: 'gate-noise',
    slot: 'gate',
    name: 'Noise cleanup',
    about: 'Gently lowers hiss and hum when nobody is playing',
    values: () => ({
      threshold: -50,
      range: 20,
      hold: 0.05,
      attack: 0.002,
      release: 0.25,
    }),
  }),

  // ── EQ ──
  preset({
    id: 'eq-clean-low',
    slot: 'eq',
    name: 'Clean low end',
    about: 'Removes rumble under 100 Hz to make room for the bass',
    values: () => ({ bands: eqBands({ 0: { freq: 100, slope: 24 } }) }),
  }),
  preset({
    id: 'eq-vocal',
    slot: 'eq',
    name: 'Vocal clarity',
    about: 'Cuts the muddy 250 Hz and lifts the words around 3 kHz',
    values: () => ({
      bands: eqBands({
        0: { freq: 90 },
        2: { gain: -3 },
        5: { gain: 3 },
        6: { freq: 10000, gain: 2 },
      }),
    }),
  }),
  preset({
    id: 'eq-warm',
    slot: 'eq',
    name: 'Warm',
    about: 'More body in the lows and softer highs',
    values: () => ({
      bands: eqBands({
        1: { freq: 120, gain: 3 },
        6: { gain: -3 },
      }),
    }),
  }),
  preset({
    id: 'eq-telephone',
    slot: 'eq',
    name: 'Telephone',
    about: 'Only the middle of the sound, like a voice on an old phone',
    values: () => ({
      bands: eqBands({
        0: { freq: 400, slope: 24 },
        4: { gain: 4 },
        7: { freq: 3000, slope: 24 },
      }),
    }),
  }),

  // ── Reverb ──
  preset({
    id: 'reverb-room',
    slot: 'reverb',
    name: 'Small room',
    about: 'A short, close space, as if played in a studio room',
    values: () => ({
      type: 'room' as const,
      decay: 0.6,
      preDelay: 5,
      highPass: 150,
      lowPass: 9000,
      wet: 0.2,
    }),
  }),
  preset({
    id: 'reverb-plate',
    slot: 'reverb',
    name: 'Vocal plate',
    about: 'A smooth, bright shine that keeps a voice up front',
    values: () => ({
      type: 'plate' as const,
      decay: 1.8,
      preDelay: 30,
      highPass: 200,
      lowPass: 10000,
      wet: 0.25,
    }),
  }),
  preset({
    id: 'reverb-hall',
    slot: 'reverb',
    name: 'Big hall',
    about: 'A long, wide space for pads, strings and ballads',
    values: () => ({
      type: 'hall' as const,
      decay: 3.5,
      preDelay: 25,
      highPass: 120,
      lowPass: 8000,
      wet: 0.35,
    }),
  }),
  preset({
    id: 'reverb-spring',
    slot: 'reverb',
    name: 'Spring',
    about: 'The boingy echo of a guitar amp’s spring tank',
    values: () => ({
      type: 'spring' as const,
      decay: 1.5,
      preDelay: 0,
      highPass: 300,
      lowPass: 6000,
      wet: 0.3,
    }),
  }),

  // ── Delay (in note lengths, at the song's tempo) ──
  preset({
    id: 'delay-slapback',
    slot: 'delay',
    name: 'Slapback',
    about: 'One quick repeat: the classic 1950s rock and roll sound',
    values: () => ({ time: 0.11, feedback: 0.05, wet: 0.25 }),
  }),
  preset({
    id: 'delay-quarter',
    slot: 'delay',
    name: 'Quarter-note echo',
    about: 'Repeats on every beat of the song',
    values: ({ bpm }) => ({
      time: beatsAt(1, bpm),
      feedback: 0.35,
      wet: 0.25,
    }),
  }),
  preset({
    id: 'delay-dotted-eighth',
    slot: 'delay',
    name: 'Dotted eighth',
    about: 'Bouncing echoes that fill the gaps between notes',
    values: ({ bpm }) => ({
      time: beatsAt(0.75, bpm),
      feedback: 0.4,
      wet: 0.22,
    }),
  }),
  preset({
    id: 'delay-throw',
    slot: 'delay',
    name: 'Long throw',
    about: 'Half-note echoes that trail off behind a phrase',
    values: ({ bpm }) => ({
      time: beatsAt(2, bpm),
      feedback: 0.5,
      wet: 0.3,
    }),
  }),

  // ── Presence ──
  preset({
    id: 'presence-vocal',
    slot: 'presence',
    name: 'Vocal forward',
    about: 'Brings a voice to the front of the mix',
    values: () => ({ amount: 60, frequency: 3500, bandwidth: 1.2 }),
  }),
  preset({
    id: 'presence-air',
    slot: 'presence',
    name: 'Air',
    about: 'A breathy sparkle high above the notes',
    values: () => ({ amount: 50, frequency: 10000, bandwidth: 0.8 }),
  }),

  // ── De-esser ──
  preset({
    id: 'de-esser-gentle',
    slot: 'de-esser',
    name: 'Gentle',
    about: 'Takes the edge off “s” and “t” sounds',
    values: () => ({ amount: 40, frequency: 6500, range: 6 }),
  }),
  preset({
    id: 'de-esser-strong',
    slot: 'de-esser',
    name: 'Strong',
    about: 'For a bright voice with sharp, hissing “s” sounds',
    values: () => ({ amount: 75, frequency: 7000, range: 12 }),
  }),

  // ── Saturator ──
  preset({
    id: 'saturator-tape',
    slot: 'saturator',
    name: 'Tape warmth',
    about: 'A little roundness and glow, like recording to tape',
    values: () => ({ drive: 25, mix: 100, tone: 40 }),
  }),
  preset({
    id: 'saturator-crunch',
    slot: 'saturator',
    name: 'Tube crunch',
    about: 'Driven hard, like a small amp turned all the way up',
    values: () => ({ drive: 60, mix: 100, tone: 55 }),
  }),
  preset({
    id: 'saturator-parallel',
    slot: 'saturator',
    name: 'Parallel grit',
    about: 'Heavy drive blended under the clean sound, for weight',
    values: () => ({ drive: 80, mix: 35, tone: 60 }),
  }),

  // ── OTT ──
  preset({
    id: 'multiband-subtle',
    slot: 'multiband',
    name: 'Subtle glue',
    about: 'A light touch of OTT to thicken without squashing',
    values: () => ({ depth: 0.25, time: 0.5 }),
  }),
  preset({
    id: 'multiband-full',
    slot: 'multiband',
    name: 'Full OTT',
    about: 'Loud, dense and in your face: the EDM sound',
    values: () => ({ depth: 1, time: 0.3 }),
  }),
  preset({
    id: 'multiband-bright',
    slot: 'multiband',
    name: 'Bright lift',
    about: 'Half depth, with the highs pushed up a little',
    values: () => ({ depth: 0.5, time: 0.4, lowGain: -1, highGain: 3 }),
  }),

  // ── Sidechain ──
  preset({
    id: 'ducker-gentle',
    slot: 'ducker',
    name: 'Gentle pump',
    about: 'Makes room for the kick with a soft dip on each hit',
    values: () => ({
      threshold: -30,
      amount: 0.3,
      attack: 0.01,
      release: 0.2,
    }),
  }),
  preset({
    id: 'ducker-big',
    slot: 'ducker',
    name: 'Big pump',
    about: 'A deep, breathing duck: the house and EDM pump',
    values: () => ({
      threshold: -35,
      amount: 0.8,
      attack: 0.005,
      release: 0.25,
    }),
  }),

  // ── The guitar pedals (2026-10-22): knobs 0–1 (pedalEffects) ──
  preset({
    id: 'overdrive-crunch',
    slot: 'overdrive',
    name: 'Light crunch',
    about: 'Just breaking up: grit on the hard notes only',
    values: () => ({ drive: 0.3, tone: 0.55, volume: 0.7 }),
  }),
  preset({
    id: 'overdrive-lead',
    slot: 'overdrive',
    name: 'Lead drive',
    about: 'Thick and singing, for a solo that cuts through',
    values: () => ({ drive: 0.8, tone: 0.6, volume: 0.6 }),
  }),
  preset({
    id: 'amp-clean',
    slot: 'amp',
    name: 'Clean amp',
    about: 'A warm clean amp with a little sparkle on top',
    values: () => ({ drive: 0.15, bass: 0.5, mid: 0.45, treble: 0.6 }),
  }),
  preset({
    id: 'amp-crunch',
    slot: 'amp',
    name: 'British crunch',
    about: 'A pushed amp with forward mids, for rhythm parts',
    values: () => ({ drive: 0.6, bass: 0.45, mid: 0.65, treble: 0.55 }),
  }),
  preset({
    id: 'chorus-subtle',
    slot: 'chorus',
    name: 'Subtle width',
    about: 'A light shimmer that widens a clean part',
    values: () => ({ rate: 0.15, depth: 0.3, mix: 0.35 }),
  }),
  preset({
    id: 'chorus-lush',
    slot: 'chorus',
    name: 'Lush',
    about: 'Deep and wobbly, the eighties clean sound',
    values: () => ({ rate: 0.35, depth: 0.8, mix: 0.55 }),
  }),
  preset({
    id: 'phaser-slow',
    slot: 'phaser',
    name: 'Slow sweep',
    about: 'A gentle swirl that moves under the part',
    values: () => ({ rate: 0.01, depth: 0.6, mix: 0.5 }),
  }),
  preset({
    id: 'phaser-fast',
    slot: 'phaser',
    name: 'Fast swirl',
    about: 'Quick and bubbly, for funk and keys',
    values: () => ({ rate: 0.08, depth: 0.7, mix: 0.5 }),
  }),
  preset({
    id: 'flanger-jet',
    slot: 'flanger',
    name: 'Jet plane',
    about: 'The classic deep swoosh',
    values: () => ({ rate: 0.1, depth: 0.9, mix: 0.6 }),
  }),
  preset({
    id: 'flanger-gentle',
    slot: 'flanger',
    name: 'Gentle',
    about: 'A light metallic shimmer',
    values: () => ({ rate: 0.25, depth: 0.35, mix: 0.35 }),
  }),
  preset({
    id: 'wah-funk',
    slot: 'wah',
    name: 'Funk',
    about: 'Quacks on every hard strum',
    values: () => ({ sensitivity: 0.75, resonance: 0.6, frequency: 0.4 }),
  }),
  preset({
    id: 'wah-slow',
    slot: 'wah',
    name: 'Slow bloom',
    about: 'Opens slowly as each note rings',
    values: () => ({ sensitivity: 0.5, attack: 0.7, decay: 0.8 }),
  }),
];

/** `slot`'s state with `p` applied over `current`, switched on. */
export function presetSlotState<S extends EffectSlotType>(
  p: EffectPreset<S>,
  current: TrackEffectState[S],
  bpm: number,
): TrackEffectState[S] {
  return { ...current, ...p.values({ bpm }), enabled: true };
}

/** `base` with `p` applied to its slot: what a preset's preview draws. */
export function presetEffects(
  p: EffectPreset,
  base: TrackEffectState,
  bpm: number,
): TrackEffectState {
  return { ...base, [p.slot]: presetSlotState(p, base[p.slot], bpm) };
}
