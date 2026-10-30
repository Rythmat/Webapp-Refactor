import { getAtlasArtists } from '@/components/atlas/data/artists';
import type { LaneId } from '@/components/atlas/data/laneIds';
import { MUSICAL_ERAS, type EraId } from '@/components/atlas/data/musicalEras';
import type { TimelineEvent } from '@/components/atlas/data/timelineIndex';
import {
  inWindow,
  type TimeWindow,
} from '@/components/atlas/timeline/timeWindow';

/**
 * What a stop's music adds up to in the years shown, for its cards: how much
 * (events, artists, genres), when (events per span of years, the busiest
 * and quietest), in which eras, and in which lanes of music's family tree.
 * Pure over the timeline's events; the artists come in as a lookup.
 */

export interface Bin {
  /** Its first year. */
  start: number;
  /** How many years it holds. */
  size: number;
  count: number;
}

export interface ScopeStats {
  events: number;
  artists: number;
  /** Lanes of music's family tree its events touch. */
  genres: number;
  /** First and last year of its events in the years shown. */
  span: readonly [number, number] | null;
  bins: Bin[];
  binSize: number;
  /** Its events before the first bin (the chart's left stub). */
  earlier: number;
  eras: { id: EraId; count: number }[];
  /** Its busiest lanes, most first (at most five). */
  lanes: { id: LaneId; count: number }[];
  busiest: Bin | null;
  /** The emptiest bin between its first and last; ties go to the earliest. */
  quietest: Bin | null;
}

const THIS_YEAR = new Date().getFullYear();

/** Years per bin for a span: fine for a few decades, coarse for centuries. */
export function binSize(span: number): 5 | 10 | 25 | 50 {
  if (span <= 40) return 5;
  if (span <= 160) return 10;
  if (span <= 400) return 25;
  return 50;
}

/** Counts of `years` in bins of `size` over [from, to], bins aligned to `size`. */
export function binSeries(
  years: readonly number[],
  from: number,
  to: number,
  size: number,
): Bin[] {
  const first = Math.floor(from / size) * size;
  const bins: Bin[] = [];
  for (let start = first; start <= to; start += size) {
    bins.push({ start, size, count: 0 });
  }
  for (const y of years) {
    const i = Math.floor((y - first) / size);
    if (i >= 0 && i < bins.length) bins[i].count += 1;
  }
  return bins;
}

const eraOf = (year: number): EraId => {
  for (let i = MUSICAL_ERAS.length - 1; i >= 0; i--) {
    if (year >= MUSICAL_ERAS[i].yearStart) return MUSICAL_ERAS[i].id;
  }
  return MUSICAL_ERAS[0].id;
};

/** Each event's artists (slugs), built once per content load. */
let artistsByEvent: {
  from: readonly unknown[];
  map: Map<string, string[]>;
} | null = null;
export function artistsOf(eventId: string): readonly string[] {
  const artists = getAtlasArtists();
  if (artistsByEvent?.from !== artists) {
    const map = new Map<string, string[]>();
    for (const a of artists) {
      for (const id of a.eventIds) {
        const list = map.get(id);
        if (list) list.push(a.slug);
        else map.set(id, [a.slug]);
      }
    }
    artistsByEvent = { from: artists, map };
  }
  return artistsByEvent.map.get(eventId) ?? [];
}

/**
 * The stats for a stop's events (in year order) in the years shown. With no
 * window the chart runs from its first decade (from 1900 at the earliest
 * for the world, `world`) to now, and anything before is the stub.
 */
export function scopeStats(
  events: readonly TimelineEvent[],
  w: TimeWindow | null,
  {
    world = false,
    artistsFor = artistsOf,
  }: {
    world?: boolean;
    artistsFor?: (eventId: string) => readonly string[];
  } = {},
): ScopeStats {
  const shown = w ? events.filter((t) => inWindow(w, t.year)) : events;
  const years = shown.map((t) => t.year);
  const span: readonly [number, number] | null = years.length
    ? [Math.min(...years), Math.max(...years)]
    : null;

  let from: number;
  let to: number;
  if (w) {
    from = Math.round(w.from);
    to = Math.min(Math.round(w.to), THIS_YEAR);
  } else {
    from = span ? Math.floor(span[0] / 10) * 10 : 1900;
    if (world) from = Math.max(from, 1900);
    to = THIS_YEAR;
  }
  const size = binSize(to - from);
  const bins = binSeries(years, from, to, size);
  const firstBin = bins[0]?.start ?? from;
  const earlier = years.filter((y) => y < firstBin).length;

  const artists = new Set<string>();
  const lanes = new Map<LaneId, number>();
  const touched = new Set<LaneId>();
  const eras = new Map<EraId, number>();
  for (const t of shown) {
    for (const slug of artistsFor(t.event.id)) artists.add(slug);
    lanes.set(t.lane, (lanes.get(t.lane) ?? 0) + 1);
    for (const lane of t.lanes) touched.add(lane);
    touched.add(t.lane);
    const era = eraOf(t.year);
    eras.set(era, (eras.get(era) ?? 0) + 1);
  }

  // Busiest anywhere; quietest only between the first and last with music.
  let busiest: Bin | null = null;
  for (const b of bins)
    if (b.count > 0 && (!busiest || b.count > busiest.count)) busiest = b;
  const lit = bins.flatMap((b, i) => (b.count > 0 ? [i] : []));
  let quietest: Bin | null = null;
  if (lit.length >= 2) {
    for (let i = lit[0]; i <= lit[lit.length - 1]; i++) {
      if (!quietest || bins[i].count < quietest.count) quietest = bins[i];
    }
  }

  return {
    events: shown.length,
    artists: artists.size,
    genres: touched.size,
    span,
    bins,
    binSize: size,
    earlier,
    eras: MUSICAL_ERAS.filter((e) => eras.has(e.id)).map((e) => ({
      id: e.id,
      count: eras.get(e.id)!,
    })),
    lanes: [...lanes.entries()]
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))
      .slice(0, 5),
    busiest,
    quietest,
  };
}
