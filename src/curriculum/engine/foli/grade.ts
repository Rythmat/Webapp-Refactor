/**
 * Grading a Foli answer, on one clock.
 *
 * Every hit is kept with the moment it was played, in audio-clock seconds
 * as the player heard the beat, from the first bar on: a hit a little ahead
 * of the answer's downbeat counts as much as one a little behind it (Foli
 * used to open its window exactly on the downbeat, so an early downbeat was
 * thrown away). Each note's window reaches both ways, and notes and hits are
 * paired closest first, so a late note can't steal the next one's hit.
 *
 * Pure, no React.
 */

import type { FoliDrum } from './drums';
import { BAR_TICKS, TICKS_PER_BEAT, type FoliNote } from './rhythms';

export interface FoliHit {
  /** When it was played, in audio-clock seconds, as heard. */
  t: number;
  drum: FoliDrum;
}

export interface FoliGrade {
  /** Each note matched, by index: how far off its hit was (+ late). */
  matched: Map<number, number>;
  /** Hits in the answer that matched no note. */
  extra: number;
  passed: boolean;
}

/** Stray hits an answer may have and still pass. */
export const ALLOWED_EXTRA = 1;

/**
 * How far either side of a note its hit may land: two fifths of the
 * shortest gap between the call's notes, between 40 and 120 ms.
 */
export function toleranceFor(notes: readonly FoliNote[], bpm: number): number {
  const tick = 60 / (bpm * TICKS_PER_BEAT);
  const starts = [...new Set(notes.map((n) => n.startTick))].sort(
    (a, b) => a - b,
  );
  const gaps = starts.slice(1).map((s, i) => s - starts[i]);
  const gap = (gaps.length ? Math.min(...gaps) : TICKS_PER_BEAT) * tick;
  return Math.max(0.04, Math.min(0.12, gap * 0.4));
}

/** The answer's notes against the hits, closest pairs first. */
export function gradeAnswer(
  notes: readonly FoliNote[],
  hits: readonly FoliHit[],
  answerStart: number,
  bpm: number,
  bars: number,
  tolerance: number,
): FoliGrade {
  const tick = 60 / (bpm * TICKS_PER_BEAT);
  const answerEnd = answerStart + bars * BAR_TICKS * tick;
  const inWindow = hits
    .map((hit, j) => ({ hit, j }))
    .filter(
      ({ hit }) =>
        hit.t >= answerStart - tolerance && hit.t <= answerEnd + tolerance,
    );
  const pairs: { i: number; j: number; d: number }[] = [];
  notes.forEach((note, i) => {
    const at = answerStart + note.startTick * tick;
    for (const { hit, j } of inWindow) {
      const d = hit.t - at;
      if (hit.drum === note.drum && Math.abs(d) <= tolerance)
        pairs.push({ i, j, d });
    }
  });
  pairs.sort((a, b) => Math.abs(a.d) - Math.abs(b.d));
  const matched = new Map<number, number>();
  const used = new Set<number>();
  for (const { i, j, d } of pairs) {
    if (matched.has(i) || used.has(j)) continue;
    matched.set(i, d);
    used.add(j);
  }
  const extra = inWindow.filter(({ j }) => !used.has(j)).length;
  return {
    matched,
    extra,
    passed: matched.size === notes.length && extra <= ALLOWED_EXTRA,
  };
}
