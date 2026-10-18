import {
  normalizeKeyRange,
  type KeyRange,
} from '@/learn/keyboard/lessonKeyboardRange';

// ── The lesson keyboard's keys ─────────────────────────────────────────────
// 25 keys, C3–C5: the series' register (the 1 sits F♯3–F4, a melody runs
// from the low 5 to the 5 above, every chord root is in D3–C♯4). A few
// Part 2 figures reach past it, such as the 6 above the upper 5 in E or F:
// the keyboard then widens just enough to show every note the step asks
// for, ending on a white key, at the same natural proportions.

/** The keyboard: 25 keys, C3–C5. */
export const LITERACY_KEY_RANGE: KeyRange = { low: 48, high: 72 };

/** C3–C5, widened to show every one of `midis` (the step's targets). */
export function literacyKeyRange(midis: Iterable<number>): KeyRange {
  let { low, high } = LITERACY_KEY_RANGE;
  for (const midi of midis) {
    if (midi < low) low = midi;
    if (midi > high) high = midi;
  }
  return low === LITERACY_KEY_RANGE.low && high === LITERACY_KEY_RANGE.high
    ? LITERACY_KEY_RANGE
    : normalizeKeyRange({ low, high });
}
