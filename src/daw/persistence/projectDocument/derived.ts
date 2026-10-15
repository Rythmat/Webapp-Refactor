import {
  ALL_MODES,
  FAMILY_DEGREE_ORDER,
  KEY_COLORS,
  getOptions,
  graphToken,
} from '@prism/engine';

// ── State a load derives instead of reading ──────────────────────────────
//
// Three store keys follow from others, so no draft stores them and every
// load works them out again (the registry's session scope):
// - rootTrackColor, the key colour, from the key and mode;
// - availableNextChords, the chords the Prism builder offers next, from its
//   progression and filter;
// - nextColorIndex, the palette slot the next new track takes, from the
//   track count (decision D6).
// Before codec v3 a load set none of them, so after a refresh the key chip
// lost its colour, new tracks stopped taking the key colour, and the builder
// offered nothing next until a chord was added (audit prism-ui-08).
//
// prismSlice's setRootNote, setMode, setFilterPercent, addChord and
// undoChord call the first two as well, so a load and an edit work these
// keys out one way; this module loads nothing but the Prism engine, so the
// slice can import it.

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
 * The key colour of `rootNote` (0–11) in `mode`, as setRootNote and setMode
 * leave it in rootTrackColor; null when no key is set (see keyColourOf).
 */
export function keyColourFor(
  rootNote: number | null,
  mode: string,
): string | null {
  return rootNote === null ? null : keyColourOf(rootNote, mode);
}

/**
 * The key colour of a set root (0–11) in `mode`. A diatonic mode takes the
 * colour of its parent major key, the other families a colour each, and a
 * mode in no family the colour of its own root.
 */
export function keyColourOf(rootNote: number, mode: string): string {
  for (const { label, modes } of FAMILY_DEGREE_ORDER) {
    const position = modes.indexOf(mode);
    if (position === -1) continue;
    const fixed = FAMILY_COLOUR[label];
    if (fixed !== undefined) return hex(KEY_COLORS[fixed]);
    const parentRoot = (rootNote - ALL_MODES.ionian[position] + 12) % 12;
    return hex(KEY_COLORS[ROOT_TO_KEY_INDEX[parentRoot]]);
  }
  return hex(KEY_COLORS[ROOT_TO_KEY_INDEX[rootNote]]);
}

/**
 * The chords the Prism builder offers after `stringSeq` at `filterPercent`,
 * as addChord and setFilterPercent leave availableNextChords.
 */
export function nextChordsFor(
  stringSeq: readonly string[],
  filterPercent: number,
): string[] {
  if (stringSeq.length === 0) return [];
  return getOptions(filterPercent, graphToken([...stringSeq]));
}
