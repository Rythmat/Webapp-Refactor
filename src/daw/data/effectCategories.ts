import type { EffectSlotType } from '@/daw/audio/EffectChain';

// ── The effects library's categories (milestone 2.8) ───────────────────────
//
// How the side rail's Effects library groups the audio effects, after
// Soundtrap's: each category with a one-line purpose, each effect with a
// line on what it does, in plain words for a student. Neutral: no colour
// per category (owner decision 3; Soundtrap's colour-coded categories are
// on the anatomy's "not worth copying" list).

export interface EffectCategory {
  id: string;
  label: string;
  /** What the category is for, in one line. */
  purpose: string;
  effects: readonly EffectSlotType[];
}

export const EFFECT_CATEGORIES: readonly EffectCategory[] = [
  {
    id: 'dynamics',
    label: 'Dynamics',
    purpose: 'Controls how loud and how punchy the sound is',
    effects: ['compressor', 'gate', 'multiband', 'ducker'],
  },
  {
    id: 'eq',
    label: 'EQ',
    purpose: 'Shapes the tone, from the bass to the treble',
    effects: ['eq', 'presence', 'de-esser'],
  },
  {
    id: 'reverb',
    label: 'Reverb',
    purpose: 'Puts the sound in a room',
    effects: ['reverb'],
  },
  {
    id: 'delay',
    label: 'Delay',
    purpose: 'Repeats the sound as echoes',
    effects: ['delay'],
  },
  {
    id: 'distortion',
    label: 'Distortion',
    purpose: 'Adds grit and warmth',
    effects: ['saturator'],
  },
];

/** What each effect does, in one line. */
export const EFFECT_ABOUT: Readonly<Record<EffectSlotType, string>> = {
  compressor: 'Evens out the loud and quiet moments',
  gate: 'Silences the sound between the notes',
  multiband: 'Squeezes the lows, mids and highs: loud and bright',
  ducker: 'Dips this track each time another one hits',
  eq: 'Turns bands of the sound up or down',
  presence: 'Brings a voice or a lead forward',
  'de-esser': 'Softens sharp “s” sounds',
  reverb: 'The echo of a space, from a small room to a hall',
  delay: 'Repeats each sound in time with the song',
  saturator: 'Warms and drives the sound, like tape or a tube amp',
};
