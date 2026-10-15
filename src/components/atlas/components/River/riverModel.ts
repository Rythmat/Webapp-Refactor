import { eventImage } from '@/components/atlas/data/eventImage';
import { LANES } from '@/components/atlas/data/lineage';
import { MUSICAL_ERAS } from '@/components/atlas/data/musicalEras';
import type { TimelineEvent } from '@/components/atlas/data/timelineIndex';
import type { TimeWindow } from '@/components/atlas/timeline/timeWindow';
import type { RiverLaneSpec } from './riverLayout';
import type { RiverCluster } from './riverLevels';

/** The family tree's lanes as the river lays them out (data/lineage.ts). */
export function lineageSpecs(): RiverLaneSpec[] {
  return LANES.map((lane) => ({
    id: lane.id,
    label: lane.label,
    born: lane.born,
    parent: lane.from[0] ?? null,
    inflows: [
      ...lane.from.slice(1).map((from) => ({ from, year: lane.born })),
      ...(lane.joins ?? []),
    ],
  }));
}

/** The events of each lane, in year order (the index already is). */
export function eventsByLane(
  index: readonly TimelineEvent[],
  keep: (t: TimelineEvent) => boolean = () => true,
): Map<string, TimelineEvent[]> {
  const out = new Map<string, TimelineEvent[]>();
  for (const t of index) {
    if (!keep(t)) continue;
    const list = out.get(t.lane);
    if (list) list.push(t);
    else out.set(t.lane, [t]);
  }
  return out;
}

/**
 * What a marker on the river shows: one event's poster, a cluster's cover
 * poster with its count (`stack`), a plain count, or a dot.
 */
export type MarkerKind = 'poster' | 'stack' | 'count' | 'dot';

/** The event whose picture stands for a cluster: its first with one. */
export const coverOf = (
  cluster: RiverCluster<TimelineEvent>,
): TimelineEvent | undefined =>
  cluster.items.find((t) => eventImage(t.event, 'lane'));

/** Up to `max` of a cluster's events with pictures, for a stack. */
export const coversOf = (
  cluster: RiverCluster<TimelineEvent>,
  max: number,
): TimelineEvent[] =>
  cluster.items.filter((t) => eventImage(t.event, 'lane')).slice(0, max);

export function markerKind(
  cluster: RiverCluster<TimelineEvent>,
  withPoster: boolean,
): MarkerKind {
  const many = cluster.items.length > 1;
  if (withPoster && coverOf(cluster)) return many ? 'stack' : 'poster';
  return many ? 'count' : 'dot';
}

/** "50+" past fifty, as Dorot counts. */
export const countLabel = (n: number): string => (n > 50 ? '50+' : String(n));

/**
 * The era gradient's stops: each era's colour at the middle of its years, so
 * the bands blend from one era to the next. Offsets are shares of `domain`.
 */
export function eraStops(
  domain: TimeWindow,
): { offset: number; color: string }[] {
  const span = domain.to - domain.from;
  return MUSICAL_ERAS.map((era) => {
    const to = Math.min(era.yearEnd, domain.to);
    const mid = (Math.max(era.yearStart, domain.from) + to) / 2;
    return {
      offset: Math.min(1, Math.max(0, (mid - domain.from) / span)),
      color: era.color,
    };
  });
}

/**
 * Which markers get a poster: at most `max`, the ones nearest the middle of
 * the view — beyond that a marker is a count or a dot, so a fast zoom never
 * asks YouTube for hundreds of images.
 */
export function posterKeys(
  clusters: readonly RiverCluster<TimelineEvent>[],
  view: TimeWindow,
  max: number,
): Set<string> {
  const mid = (view.from + view.to) / 2;
  return new Set(
    clusters
      .filter((c) => c.year >= view.from && c.year <= view.to && !!coverOf(c))
      .sort((a, b) => Math.abs(a.year - mid) - Math.abs(b.year - mid))
      .slice(0, max)
      .map((c) => c.key),
  );
}
