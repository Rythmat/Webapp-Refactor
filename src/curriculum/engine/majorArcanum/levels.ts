/**
 * Major Arcanum's levels, modes and keys (Peter, 2026-10-20).
 *
 * A player climbs four modes, Novice, Pro, Expert and Maestro, each six
 * levels long, the keys around the circle of fifths, a level a step out:
 * Level 1 is C, Level 2 G and F, Level 3 D and B♭, Level 4 A and E♭, Level 5
 * E and A♭, Level 6 B and F♯. A key is cleared with a streak in Melody and a
 * streak in Chords; a level with every one of its keys; a mode with all six
 * levels, which opens the next.
 *
 *   Novice   melodies on 1–5 in short phrases; root-position triads
 *   Pro      melodies on 1–8; 7th chords join the triads
 *   Expert   melodies over two octaves; triads in every inversion
 *   Maestro  melodies over three octaves; 7th chords in every inversion
 *
 * Expert and Maestro need a MIDI keyboard; Novice and Pro play on the
 * computer keyboard too.
 *
 * Pure, no React.
 */

import type { EchoTier } from '../echo/levels';

export type ArcanumMode = 'novice' | 'pro' | 'expert' | 'maestro';
export type ArcanumPart = 'melody' | 'chords';
export type ArcanumLevel = 1 | 2 | 3 | 4 | 5 | 6;

export const ARCANUM_MODES: readonly ArcanumMode[] = [
  'novice',
  'pro',
  'expert',
  'maestro',
];
export const ARCANUM_LEVELS: readonly ArcanumLevel[] = [1, 2, 3, 4, 5, 6];
export const ARCANUM_PARTS: readonly ArcanumPart[] = ['melody', 'chords'];

/** Each level's keys, as pitch classes, in the order they're played. */
export const LEVEL_KEYS: Readonly<Record<ArcanumLevel, readonly number[]>> = {
  1: [0],
  2: [7, 5],
  3: [2, 10],
  4: [9, 3],
  5: [4, 8],
  6: [11, 6],
};

export interface ModeConfig {
  label: string;
  /** The scale positions a melody may use: 0 the 1, 7 the 8. */
  melodyRange: { low: number; high: number };
  /** A melody phrase's length in bars. */
  phraseBars: 2 | 4;
  /** The Echo rhythm tiers its melodies and comping draw on. */
  rhythmTiers: readonly EchoTier[];
  /** The Echo contour tiers its melodies draw on. */
  contourTiers: readonly EchoTier[];
  /** 7th chords join the triads. */
  sevenths: boolean;
  /** Triads come in every inversion. */
  triadInversions: boolean;
  /** 7th chords come in every inversion. */
  seventhInversions: boolean;
  /** Tempo at Level 1, and how much faster each level is. */
  bpm: number;
  bpmStep: number;
  /** Played on a MIDI keyboard only. */
  midiRequired: boolean;
  /** Phrases in a row without a miss that make a streak. */
  streakPhrases: Readonly<Record<ArcanumPart, number>>;
  /** Phrases in a run. */
  runPhrases: Readonly<Record<ArcanumPart, number>>;
}

export const MODES: Readonly<Record<ArcanumMode, ModeConfig>> = {
  novice: {
    label: 'Novice',
    melodyRange: { low: 0, high: 4 },
    phraseBars: 2,
    rhythmTiers: [1],
    contourTiers: [1, 2],
    sevenths: false,
    triadInversions: false,
    seventhInversions: false,
    bpm: 72,
    bpmStep: 4,
    midiRequired: false,
    streakPhrases: { melody: 4, chords: 3 },
    runPhrases: { melody: 10, chords: 6 },
  },
  pro: {
    label: 'Pro',
    melodyRange: { low: 0, high: 7 },
    phraseBars: 4,
    rhythmTiers: [1, 2],
    contourTiers: [1, 2, 3],
    sevenths: true,
    triadInversions: false,
    seventhInversions: false,
    bpm: 80,
    bpmStep: 4,
    midiRequired: false,
    streakPhrases: { melody: 3, chords: 3 },
    runPhrases: { melody: 6, chords: 6 },
  },
  expert: {
    label: 'Expert',
    melodyRange: { low: 0, high: 14 },
    phraseBars: 4,
    rhythmTiers: [1, 2, 3],
    contourTiers: [1, 2, 3, 4],
    sevenths: true,
    triadInversions: true,
    seventhInversions: false,
    bpm: 84,
    bpmStep: 4,
    midiRequired: true,
    streakPhrases: { melody: 3, chords: 3 },
    runPhrases: { melody: 6, chords: 6 },
  },
  maestro: {
    label: 'Maestro',
    melodyRange: { low: 0, high: 21 },
    phraseBars: 4,
    rhythmTiers: [1, 2, 3, 4],
    contourTiers: [1, 2, 3, 4],
    sevenths: true,
    triadInversions: true,
    seventhInversions: true,
    bpm: 88,
    bpmStep: 4,
    midiRequired: true,
    streakPhrases: { melody: 3, chords: 3 },
    runPhrases: { melody: 6, chords: 6 },
  },
};

/** A level's tempo in a mode. */
export const levelBpm = (mode: ArcanumMode, level: ArcanumLevel): number =>
  MODES[mode].bpm + MODES[mode].bpmStep * (level - 1);

/**
 * The 1 of a key, as a MIDI note, for a part in a mode. The music sits
 * around middle C, and the wider a mode's range the lower its 1:
 *
 *   Melody, Novice and Pro   C4–F♯4, or G3–B3
 *   Melody, Expert           C3–B3 (two octaves up to B5 at most)
 *   Melody, Maestro          C3–E3, or F2–B2 (three octaves)
 *   Chords                   C4–D4, or E♭3–B3 (a 7th on the 7 up to A5)
 */
export function keyRootMidi(
  keyPc: number,
  mode: ArcanumMode,
  part: ArcanumPart,
): number {
  const pc = ((keyPc % 12) + 12) % 12;
  if (part === 'chords') return (pc <= 2 ? 60 : 48) + pc;
  if (mode === 'expert') return 48 + pc;
  if (mode === 'maestro') return (pc <= 4 ? 48 : 36) + pc;
  return (pc <= 6 ? 60 : 48) + pc;
}
