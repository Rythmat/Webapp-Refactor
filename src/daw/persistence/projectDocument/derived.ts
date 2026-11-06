import { getOptions, graphToken } from '@prism/engine';
import { keyColourOf } from '@/daw/prism-engine/data/keyColour';

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

// The key colour of a set root in a mode: the rule both Cortex maps use too.
export { keyColourOf };

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
