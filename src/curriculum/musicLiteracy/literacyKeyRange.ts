import {
  normalizeKeyRange,
  type KeyRange,
} from '@/learn/keyboard/lessonKeyboardRange';

// ── The lesson keyboard's keys ─────────────────────────────────────────────
// Two octaves, 25 keys from a C, where the step's notes are. Melodies and
// chords alike sit in the treble staff (engine/musicLiteracy/register.ts and
// chords.ts: the fewest ledger lines), so most steps show C4–C6, and so do
// the choose steps, whose key is heard as 1, 3 and 5 there. A step whose
// notes all sit lower shows C3–C5. One that fits neither widens the two
// octaves nearer it just enough to show every note it asks for, ending on a
// white key, at the same natural proportions.

/** The keyboard most steps show: 25 keys, C4–C6. */
export const UPPER_KEY_RANGE: KeyRange = { low: 60, high: 84 };

/** The two octaves below it: 25 keys, C3–C5. */
export const LOWER_KEY_RANGE: KeyRange = { low: 48, high: 72 };

/** The two-octave keyboards a step may show, the one most steps show first. */
const TWO_OCTAVES: readonly KeyRange[] = [UPPER_KEY_RANGE, LOWER_KEY_RANGE];

/**
 * The keyboard for a step's notes (`midis`, its targets): the two octaves
 * from a C that hold them all, C4–C6 if it does; else the one needing the
 * fewest keys added, widened to show every note.
 */
export function literacyKeyRange(midis: Iterable<number>): KeyRange {
  const list = [...midis];
  if (list.length === 0) return UPPER_KEY_RANGE;
  const low = Math.min(...list);
  const high = Math.max(...list);
  const widened = TWO_OCTAVES.map((range) =>
    low >= range.low && high <= range.high
      ? range
      : normalizeKeyRange({
          low: Math.min(low, range.low),
          high: Math.max(high, range.high),
        }),
  );
  // The fewest keys; on a tie, the earlier (C4–C6).
  return widened.reduce((best, range) =>
    range.high - range.low < best.high - best.low ? range : best,
  );
}
