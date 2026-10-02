import { normalizeChordSpelling } from '@/curriculum/engine/openingTree';

/**
 * Where a progression's chords put it in Tesseract, the map of openings:
 * one tree per starting chord, a branch for each opening two progressions
 * share. Read from the library's other progressions, so the row panel can
 * say what a chord change does to the map before it is saved. Pure.
 */

export interface BranchPlace {
  /** How many leading chords it shares with the progression nearest it. */
  shared: number;
  /** Other progressions that open with those `shared` chords. */
  others: number;
  /** Other progressions that open with all of its chords and go on. */
  continuing: number;
}

const commonPrefix = (a: readonly string[], b: readonly string[]) => {
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n++;
  return n;
};

export function branchPlace(
  chords: readonly string[],
  entries: Iterable<{ id: number; chords: readonly string[] }>,
  selfId?: unknown,
): BranchPlace {
  const mine = chords.map(normalizeChordSpelling);
  const prefixes: number[] = [];
  let continuing = 0;
  for (const entry of entries) {
    if (entry.id === selfId) continue;
    const theirs = entry.chords.map(normalizeChordSpelling);
    const n = commonPrefix(mine, theirs);
    if (n === 0) continue;
    prefixes.push(n);
    if (n === mine.length && theirs.length > mine.length) continuing++;
  }
  const shared = prefixes.length ? Math.max(...prefixes) : 0;
  return {
    shared,
    others: prefixes.filter((n) => n >= shared && shared > 0).length,
    continuing,
  };
}
