import {
  lowerBound,
  type TimelineEvent,
} from '@/components/atlas/data/timelineIndex';
import type { TimeWindow } from '@/components/atlas/timeline/timeWindow';
import type { IndexedEdge, NetworkIndex } from './networkIndex';
import type {
  NodeMetrics,
  PlaceLevel,
  PlaceLink,
  PlaceNodeId,
  ScopeLinks,
} from './types';

/**
 * The influence links rolled up into places, for the years shown. A link
 * counts in the year it arrived (the influenced event's year), so the
 * counts of two windows side by side add up to the counts of both.
 */

/** The links that arrived in `w` (all of them for null). */
export function edgesInWindow(
  ix: NetworkIndex,
  w: TimeWindow | null,
): readonly IndexedEdge[] {
  if (!w) return ix.edges;
  return ix.edges.slice(
    lowerBound(ix.edges, w.from),
    lowerBound(ix.edges, w.to + 1),
  );
}

const SAMPLE = 5;

interface TallyLink {
  id: string;
  from: PlaceNodeId;
  to: PlaceNodeId;
  weight: number;
  years: [number, number];
  sample: [string, string][];
}

/** Influences summed by the pair of places they join (self-pairs left out). */
class LinkTally {
  private links = new Map<string, TallyLink>();
  add(from: PlaceNodeId, to: PlaceNodeId, e: IndexedEdge) {
    const id = `${from}>${to}`;
    const link = this.links.get(id);
    if (!link) {
      this.links.set(id, {
        id,
        from,
        to,
        weight: 1,
        years: [e.year, e.year],
        sample: [[e.from.event.id, e.to.event.id]],
      });
      return;
    }
    link.weight += 1;
    link.years[0] = Math.min(link.years[0], e.year);
    link.years[1] = Math.max(link.years[1], e.year);
    if (link.sample.length < SAMPLE) {
      link.sample.push([e.from.event.id, e.to.event.id]);
    }
  }
  /** Heaviest first; then by id, so ties keep one order. */
  list(): PlaceLink[] {
    return [...this.links.values()].sort(
      (a, b) => b.weight - a.weight || a.id.localeCompare(b.id),
    );
  }
}

/**
 * A stop's links: its events (a place's, an artist's, an event's) against
 * every other. An influence into one of them from outside is a root, one
 * from them to outside a route, both inside is local. Joined at `level`
 * from the far event's place to the near one's; an influence between two of
 * the same place is local too.
 */
export function scopeLinks(
  ix: NetworkIndex,
  eventIds: ReadonlySet<string>,
  w: TimeWindow | null,
  level: PlaceLevel = 'city',
): ScopeLinks {
  const roots = new LinkTally();
  const routes = new LinkTally();
  let local = 0;
  let total = 0;
  for (const e of edgesInWindow(ix, w)) {
    const fromIn = eventIds.has(e.from.event.id);
    const toIn = eventIds.has(e.to.event.id);
    if (!fromIn && !toIn) continue;
    total += 1;
    const from = ix.nodeOf(e.from, level);
    const to = ix.nodeOf(e.to, level);
    if ((fromIn && toIn) || from === to) local += 1;
    else if (toIn) roots.add(from, to, e);
    else routes.add(from, to, e);
  }
  return { roots: roots.list(), routes: routes.list(), local, total };
}

/** The strongest links between places of `level` (regions, by default). */
export function worldLinks(
  ix: NetworkIndex,
  w: TimeWindow | null,
  { level = 'region', limit = 24 }: { level?: PlaceLevel; limit?: number } = {},
): PlaceLink[] {
  const tally = new LinkTally();
  for (const e of edgesInWindow(ix, w)) {
    const from = ix.nodeOf(e.from, level);
    const to = ix.nodeOf(e.to, level);
    if (from !== to) tally.add(from, to, e);
  }
  return tally.list().slice(0, limit);
}

/** The links between the places in `nodes` (the ring's chords). */
export function linksAmong(
  ix: NetworkIndex,
  nodes: ReadonlySet<PlaceNodeId>,
  w: TimeWindow | null,
  level: PlaceLevel,
): PlaceLink[] {
  const tally = new LinkTally();
  for (const e of edgesInWindow(ix, w)) {
    const from = ix.nodeOf(e.from, level);
    const to = ix.nodeOf(e.to, level);
    if (from !== to && nodes.has(from) && nodes.has(to)) tally.add(from, to, e);
  }
  return tally.list();
}

/**
 * Each place's events in the years shown and the influences it sent and
 * took. `events` are the timeline's events in year order.
 */
export function nodeMetrics(
  ix: NetworkIndex,
  events: readonly TimelineEvent[],
  w: TimeWindow | null,
  level: PlaceLevel,
): Map<PlaceNodeId, NodeMetrics> {
  const metrics = new Map<PlaceNodeId, NodeMetrics>();
  const at = (id: PlaceNodeId) => {
    let m = metrics.get(id);
    if (!m) {
      m = { events: 0, inLinks: 0, outLinks: 0, localLinks: 0 };
      metrics.set(id, m);
    }
    return m;
  };
  const from = w ? lowerBound(events, w.from) : 0;
  const to = w ? lowerBound(events, w.to + 1) : events.length;
  for (let i = from; i < to; i++) at(ix.nodeOf(events[i], level)).events += 1;
  for (const e of edgesInWindow(ix, w)) {
    const a = ix.nodeOf(e.from, level);
    const b = ix.nodeOf(e.to, level);
    if (a === b) at(a).localLinks += 1;
    else {
      at(a).outLinks += 1;
      at(b).inLinks += 1;
    }
  }
  return metrics;
}

/**
 * The busiest places in the years shown, by events, then links, then id;
 * any in `include` are kept whatever their rank.
 */
export function topNodes(
  metrics: ReadonlyMap<PlaceNodeId, NodeMetrics>,
  { limit, include = [] }: { limit: number; include?: readonly PlaceNodeId[] },
): PlaceNodeId[] {
  const ranked = [...metrics.entries()]
    .filter(([, m]) => m.events > 0)
    .sort(
      ([a, ma], [b, mb]) =>
        mb.events - ma.events ||
        mb.inLinks + mb.outLinks - (ma.inLinks + ma.outLinks) ||
        a.localeCompare(b),
    )
    .map(([id]) => id);
  const kept = new Set(include);
  for (const id of ranked) {
    if (kept.size >= limit) break;
    kept.add(id);
  }
  // In rank order; an included place with no events in the years shown last.
  const rank = new Map(ranked.map((id, i) => [id, i]));
  return [...kept].sort(
    (a, b) => (rank.get(a) ?? Infinity) - (rank.get(b) ?? Infinity),
  );
}

/** Each far place's total, from a stop's roots ('from') or routes ('to'). */
export function farTotals(
  links: readonly PlaceLink[],
  side: 'from' | 'to',
): { node: PlaceNodeId; weight: number }[] {
  const totals = new Map<PlaceNodeId, number>();
  for (const l of links)
    totals.set(l[side], (totals.get(l[side]) ?? 0) + l.weight);
  return [...totals.entries()]
    .map(([node, weight]) => ({ node, weight }))
    .sort((a, b) => b.weight - a.weight || a.node.localeCompare(b.node));
}
