/**
 * Selects rhythm patterns from Prism data for game use.
 *
 * Rhythms are Record<string, [number, number][]> where each key is a pattern name
 * and the value is an array of [tick, velocity] pairs.
 */

export type RhythmHit = [number, number];
export type RhythmRecord = Record<string, RhythmHit[]>;

/** Get all pattern names from a rhythm record */
export function getPatternNames(rhythms: RhythmRecord): string[] {
  return Object.keys(rhythms);
}

/** Pick a random rhythm pattern */
export function pickRandomRhythm(
  rhythms: RhythmRecord,
): { name: string; hits: RhythmHit[] } | null {
  const names = Object.keys(rhythms);
  if (names.length === 0) return null;
  const name = names[Math.floor(Math.random() * names.length)];
  return { name, hits: rhythms[name] };
}

/** Filter rhythm patterns by hit count range */
export function filterRhythmsByHitCount(
  rhythms: RhythmRecord,
  minHits: number,
  maxHits: number,
): RhythmRecord {
  const result: RhythmRecord = {};
  for (const [name, hits] of Object.entries(rhythms)) {
    if (hits.length >= minHits && hits.length <= maxHits) {
      result[name] = hits;
    }
  }
  return result;
}

/**
 * Convert rhythm hits (tick-based) to a 16-step grid pattern.
 * Assumes 480 ticks per quarter note, 4 quarter notes per bar.
 */
export function rhythmToGrid(hits: RhythmHit[], steps = 16): boolean[] {
  const ticksPerStep = (480 * 4) / steps; // 480 ticks/quarter × 4 quarters / steps
  const grid = new Array(steps).fill(false);

  hits.forEach(([tick]) => {
    const step = Math.round(tick / ticksPerStep) % steps;
    grid[step] = true;
  });

  return grid;
}
