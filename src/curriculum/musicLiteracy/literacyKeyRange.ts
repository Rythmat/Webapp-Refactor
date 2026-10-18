import {
  normalizeKeyRange,
  type KeyRange,
} from '@/learn/keyboard/lessonKeyboardRange';

// ── The lesson keyboard's keys ─────────────────────────────────────────────
// Two octaves, 25 keys, where the step's notes are. A melody sits in the
// treble staff (engine/musicLiteracy/register.ts: every note in C4–A5 when
// it fits), so a melody step, and a choose step whose key is heard as one,
// shows C4–C6. Chords keep the series' register (every root in D3–C♯4), so
// a chord step shows C3–C5. A step that reaches past its two octaves widens
// the keyboard just enough to show every note it asks for, ending on a
// white key, at the same natural proportions.

/** What the keyboard is for: a melody's notes, or chords. */
export type LiteracyKeyboardKind = 'melody' | 'chords';

/** A melody's keyboard: 25 keys, C4–C6. */
export const MELODY_KEY_RANGE: KeyRange = { low: 60, high: 84 };

/** A chord step's keyboard: 25 keys, C3–C5. */
export const CHORD_KEY_RANGE: KeyRange = { low: 48, high: 72 };

/** The keyboard's two octaves for a kind of step. */
export const literacyBaseRange = (kind: LiteracyKeyboardKind): KeyRange =>
  kind === 'chords' ? CHORD_KEY_RANGE : MELODY_KEY_RANGE;

/** A kind's two octaves, widened to show every one of `midis` (the step's targets). */
export function literacyKeyRange(
  midis: Iterable<number>,
  kind: LiteracyKeyboardKind = 'melody',
): KeyRange {
  const base = literacyBaseRange(kind);
  let { low, high } = base;
  for (const midi of midis) {
    if (midi < low) low = midi;
    if (midi > high) high = midi;
  }
  return low === base.low && high === base.high
    ? base
    : normalizeKeyRange({ low, high });
}
