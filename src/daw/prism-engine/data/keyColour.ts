import { KEY_COLORS } from './keyColors';
import { ALL_MODES, FAMILY_DEGREE_ORDER } from './modes';

/**
 * A key's colour: the one rule the Studio's key chip and both Cortex maps
 * (the console's and the student's) colour a key by. Plain data, no engine,
 * so pages that only need the colour can import it cheaply.
 */

/** Chromatic root (0–11) to its KEY_COLORS index, round the circle of fifths. */
const ROOT_TO_KEY_INDEX = [1, 8, 3, 10, 5, 12, 7, 2, 9, 4, 11, 6] as const;

/** Mode families drawn in one colour of their own, whatever the root. */
const FAMILY_COLOUR: Readonly<Record<string, keyof typeof KEY_COLORS>> = {
  'Melodic Minor': 13,
  'Harmonic Minor': 14,
  'Harmonic Major': 15,
  'Double Harmonic': 16,
};

function hex([r, g, b]: readonly number[]): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

/**
 * The key colour of a set root (0–11) in `mode`. A diatonic mode takes the
 * colour of its parent major key (F minor is A♭'s indigo), the other
 * families a colour each, and a mode in no family the colour of its own
 * root.
 */
export function keyColourOf(rootNote: number, mode: string): string {
  const root = ((rootNote % 12) + 12) % 12;
  for (const { label, modes } of FAMILY_DEGREE_ORDER) {
    const position = modes.indexOf(mode);
    if (position === -1) continue;
    const fixed = FAMILY_COLOUR[label];
    if (fixed !== undefined) return hex(KEY_COLORS[fixed]);
    const parentRoot = (root - ALL_MODES.ionian[position] + 12) % 12;
    return hex(KEY_COLORS[ROOT_TO_KEY_INDEX[parentRoot]]);
  }
  return hex(KEY_COLORS[ROOT_TO_KEY_INDEX[root]]);
}

/**
 * A mode as the engine names it (`harmonicMinor`), from the ways the app
 * writes one: `major`, `minor`, `Dorian`, `harmonic-minor`. Null for a word
 * that names no mode.
 */
export function engineModeName(text: string): string | null {
  const folded = text.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (folded === 'major') return 'ionian';
  if (folded === 'minor') return 'aeolian';
  for (const name of Object.keys(ALL_MODES)) {
    if (name.toLowerCase() === folded) return name;
  }
  return null;
}

/** The twelve key centres' colours, round the circle of fifths from C. */
export const KEY_CENTRE_RAINBOW: readonly string[] = Object.freeze(
  ROOT_TO_KEY_INDEX.map((_, i) =>
    hex(KEY_COLORS[(i + 1) as keyof typeof KEY_COLORS]),
  ),
);
