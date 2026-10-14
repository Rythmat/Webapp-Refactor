import { clusterDots } from '@/components/atlas/utils/clusterDots';

/**
 * Zoom levels: the river re-lays itself out and re-clusters its events only
 * when the zoom crosses one, not on every frame of a gesture. Levels step by
 * √2 in pixels per year.
 *
 * Clusters for a level are made at the level's lowest zoom: zooming in within
 * the level only spreads them further apart, so markers no wider than the
 * cluster gap never overlap anywhere in it.
 */
export const LEVEL_STEP = Math.SQRT2;

/** The level a zoom (pixels per year) is in. */
export const levelOf = (pxPerYear: number): number =>
  Math.floor(Math.log(pxPerYear) / Math.log(LEVEL_STEP));

/** The lowest zoom of a level. */
export const levelPxPerYear = (level: number): number => LEVEL_STEP ** level;

/** A marker on a lane: one event, or several too close to draw apart. */
export interface RiverCluster<T> {
  /** Stable while the level stands: its lane and first event. */
  key: string;
  lane: string;
  items: T[];
  /** Where it is drawn: its first event's year. */
  year: number;
  /** Its last event's year. */
  lastYear: number;
}

/**
 * Cluster each lane's events (in year order) for a level, so no two markers
 * on a lane are closer than `gapPx` at any zoom within it.
 */
export function clusterLanes<T extends { year: number }>(
  byLane: ReadonlyMap<string, readonly T[]>,
  level: number,
  gapPx: number,
  keyOf: (item: T) => string,
): RiverCluster<T>[] {
  const ppy = levelPxPerYear(level);
  const out: RiverCluster<T>[] = [];
  for (const [lane, items] of byLane) {
    for (const cluster of clusterDots(items, (i) => i.year * ppy, gapPx)) {
      const first = cluster.items[0];
      out.push({
        key: `${lane}:${keyOf(first)}`,
        lane,
        items: cluster.items,
        year: first.year,
        lastYear: cluster.items[cluster.items.length - 1].year,
      });
    }
  }
  return out;
}
