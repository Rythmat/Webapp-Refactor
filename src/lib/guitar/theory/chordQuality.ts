// ── Chord quality from a stack ─────────────────────────────────────────────
// The chord a scale builds on a degree, named from its intervals: stack the
// scale's notes in thirds (skip one, take one) and look the semitones up.
// The lookup is CHORD_FORMULA itself, so a quality and its notes cannot
// disagree, and a stack no quality has throws instead of being misnamed.

import type { BookChordQuality } from '@/curriculum/data/guitar/types';
import { CHORD_FORMULA, chordSemitones } from './chordTones';

const QUALITY_BY_STACK = new Map<string, BookChordQuality>();
for (const quality of Object.keys(CHORD_FORMULA) as BookChordQuality[]) {
  const stack = chordSemitones(quality).slice(1).join(',');
  if (QUALITY_BY_STACK.has(stack)) {
    throw new Error(`Two chord qualities share the stack ${stack}`);
  }
  QUALITY_BY_STACK.set(stack, quality);
}

/**
 * The quality of the chord whose tones sit `stack` semitones above its root:
 * [4, 7] is major, [3, 6, 9] diminished 7, [2, 6] sus2(♭5).
 */
export function classifyStack(stack: readonly number[]): BookChordQuality {
  const quality = QUALITY_BY_STACK.get(stack.join(','));
  if (!quality) throw new Error(`No chord quality has the stack ${stack}`);
  return quality;
}
