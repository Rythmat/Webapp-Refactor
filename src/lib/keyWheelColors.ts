import {
  ALL_MODES,
  FAMILY_COLOR_INDEX,
  KEY_COLORS,
  KEYS,
  MODE_FAMILY_INFO,
  getScaleSpellings,
  type ColorIndex,
} from '@prism/engine';

/**
 * The colour of a key on the wheel.
 *
 * A key's colour belongs to its PARENT major scale, not to its tonic: A
 * aeolian is C's red, because A minor is C major's sixth mode. That is what
 * makes the ring appear to rotate as the mode changes — in Mixolydian every
 * key wears the colour of the major scale a fifth below, so C wears F's pink.
 * The seven non-diatonic families have one fixed colour each instead.
 *
 * Lifted out of the Studio's CircleOfFifths so the Song Library's wheel and
 * the key dot beside a song title cannot disagree with it.
 */

/** Circle-of-fifths position (1–12) → pitch class. */
export const CIRCLE_SEMITONES: Record<number, number> = {
  1: 0, // C
  2: 7, // G
  3: 2, // D
  4: 9, // A
  5: 4, // E
  6: 11, // B
  7: 6, // F♯
  8: 1, // D♭
  9: 8, // A♭
  10: 3, // E♭
  11: 10, // B♭
  12: 5, // F
};

/** Pitch class → circle-of-fifths position. */
export const SEMITONE_TO_CIRCLE_INDEX: Record<number, number> = {};
for (const [index, semitone] of Object.entries(CIRCLE_SEMITONES)) {
  SEMITONE_TO_CIRCLE_INDEX[semitone] = Number(index);
}

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** The colour pitch class `pc` wears as a tonic in `mode`. */
export function wedgeColorRgb(
  pc: number,
  mode: string,
): [number, number, number] {
  const familyInfo = MODE_FAMILY_INFO[mode];
  const fixed = familyInfo
    ? FAMILY_COLOR_INDEX[familyInfo.familyLabel]
    : undefined;
  if (fixed != null) return KEY_COLORS[fixed as ColorIndex];

  const offset = familyInfo ? ALL_MODES.ionian[familyInfo.position] : 0;
  const parentRoot = mod12(pc - (offset ?? 0));
  const index = SEMITONE_TO_CIRCLE_INDEX[parentRoot] as ColorIndex;
  return KEY_COLORS[index] ?? KEY_COLORS[1];
}

export interface WheelScaleInfo {
  /** Pitch classes the scale contains. */
  inScale: Set<number>;
  /** The one colour every in-scale wedge takes. */
  rgb: [number, number, number];
  /** Pitch class → how this key spells it ('B♭', not 'A♯'). */
  spellings: Map<number, string>;
}

/** What the wheel needs to draw a chosen key, or null for a mode it can't place. */
export function wheelScaleInfo(
  rootPc: number,
  mode: string,
): WheelScaleInfo | null {
  const intervals = ALL_MODES[mode];
  if (!intervals || !MODE_FAMILY_INFO[mode]) return null;
  return {
    inScale: new Set(intervals.map((i) => mod12(rootPc + i))),
    rgb: wedgeColorRgb(rootPc, mode),
    spellings: getScaleSpellings(rootPc, mode),
  };
}

/** The plain name of a circle position, for a wedge outside the chosen scale. */
export const circleKeyLabel = (index: number): string => KEYS[index];
