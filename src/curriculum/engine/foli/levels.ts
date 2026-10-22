/**
 * Foli's levels (Peter, 2026-10-20; triplets moved up 2026-10-21).
 *
 *   Level 1     rhythms of quarters and 8ths, one bar, 90 BPM
 *   Level 2     16ths join them
 *   Level 3     two bars
 *   Level 4–9   each level 10 BPM faster: 100 to 150 BPM
 *   Level 10    8th-note triplets join them, at Level 9's 150 BPM: one
 *               triplet figure a bar at most (they came too soon at Level 2)
 *   Level 11+   10 BPM faster each level, up to 300 BPM (Level 25)
 *
 * A streak at 300 BPM beats the game; then Foli offers something harder: the
 * same levels again on four drums.
 *
 * Pure, no React.
 */

export type Subdivision = 'eighths' | 'triplets' | 'sixteenths';

export type FoliMode = 'two' | 'four';

export interface FoliLevel {
  level: number;
  bpm: number;
  bars: 1 | 2;
  subdivisions: readonly Subdivision[];
  /** The subdivision this level brings in: every call shows it off. */
  introduces?: Subdivision;
}

export const BASE_BPM = 90;
export const MAX_BPM = 300;
export const BPM_STEP = 10;

/** The level 8th-note triplets join at. */
export const TRIPLET_LEVEL = 10;

/** The last level: the one at 300 BPM. */
export const LAST_LEVEL =
  TRIPLET_LEVEL + (MAX_BPM - bpmAt(TRIPLET_LEVEL)) / BPM_STEP;

/** A level's tempo: 90 BPM to Level 3, then 10 more a level, but none for the triplets' level. */
function bpmAt(n: number): number {
  if (n <= 3) return BASE_BPM;
  const steps = n - 3 - (n >= TRIPLET_LEVEL ? 1 : 0);
  return BASE_BPM + BPM_STEP * steps;
}

export function foliLevel(level: number): FoliLevel {
  const n = Math.max(1, Math.min(LAST_LEVEL, Math.round(level)));
  const subdivisions: Subdivision[] =
    n === 1
      ? ['eighths']
      : n < TRIPLET_LEVEL
        ? ['eighths', 'sixteenths']
        : ['eighths', 'sixteenths', 'triplets'];
  return {
    level: n,
    bpm: bpmAt(n),
    bars: n >= 3 ? 2 : 1,
    subdivisions,
    ...(n === 2
      ? { introduces: 'sixteenths' as const }
      : n === TRIPLET_LEVEL
        ? { introduces: 'triplets' as const }
        : {}),
  };
}

/** What a level adds, as the level picker says it. */
export function levelNews(level: number): string {
  if (level === 1) return 'Quarters and 8ths';
  if (level === 2) return '16ths join in';
  if (level === 3) return 'Two bars';
  if (level === TRIPLET_LEVEL) return '8th-note triplets join in';
  return `${foliLevel(level).bpm} BPM`;
}
