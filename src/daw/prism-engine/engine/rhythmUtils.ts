import type { RhythmHit } from '../types';
import { CHORD_RHYTHMS } from '../data/chordRhythms';

/**
 * Applies swing to a rhythm pattern.
 *
 * For each hit:
 * - If (start / 240) % 2 === 1 AND duration === 240:
 *   delay by 2 * amount, shorten duration by 2 * amount
 * - Else if (start / 120) % 2 === 1 AND duration === 120:
 *   delay by amount, shorten duration by amount
 * - Otherwise pass through unchanged
 */
export function swingRhythm(
  hits: RhythmHit[],
  amount: number,
): RhythmHit[] {
  const result: RhythmHit[] = [];
  for (const hit of hits) {
    if (Math.floor(hit[0] / 240) % 2 === 1 && hit[1] === 240) {
      result.push([
        hit[0] + Math.floor(2 * amount),
        hit[1] - Math.floor(2 * amount),
      ]);
    } else if (Math.floor(hit[0] / 120) % 2 === 1 && hit[1] === 120) {
      result.push([
        hit[0] + Math.floor(amount),
        hit[1] - Math.floor(amount),
      ]);
    } else {
      result.push(hit);
    }
  }
  return result;
}

/**
 * Returns true if the rhythm pattern contains any hit that matches
 * the swing conditions (i.e., can be swung).
 */
export function isSwingable(hits: RhythmHit[]): boolean {
  for (const hit of hits) {
    if (Math.floor(hit[0] / 240) % 2 === 1 && hit[1] === 240) {
      return true;
    }
    if (Math.floor(hit[0] / 120) % 2 === 1 && hit[1] === 120) {
      return true;
    }
  }
  return false;
}

/**
 * Returns all available rhythm pattern names from CHORD_RHYTHMS.
 */
export function rhythmNames(): string[] {
  return Object.keys(CHORD_RHYTHMS);
}
