import { eraOfYear, type EraId } from '@/components/atlas/data/musicalEras';
import type { TimelineEvent } from '@/components/atlas/data/timelineIndex';
import type { NetworkIndex } from '@/components/atlas/network/networkIndex';
import {
  linksAmong,
  nodeMetrics,
  scopeLinks,
  topNodes,
} from '@/components/atlas/network/placeNetwork';
import type { PlaceLink, PlaceNodeId } from '@/components/atlas/network/types';
import { eventsIn } from '@/components/atlas/stats/musicWeights';
import type { StopScope } from '@/components/atlas/stats/stopScope';
import type { TimeWindow } from '@/components/atlas/timeline/timeWindow';
import type { RingPlace } from './ringLayout';

export interface RingData {
  places: (RingPlace & { lat: number })[];
  links: PlaceLink[];
  /** The places the stop is about, lit on the ring. */
  focus: Set<PlaceNodeId>;
}

/**
 * What the ring seats, pure: the busiest places in the years shown, with
 * the stop's own always among them (a city its own; a country or state its
 * cities; an artist theirs; an event its city and the places it touched);
 * each with its events and busiest era; and the links among them.
 */
export function ringData(
  ix: NetworkIndex,
  events: readonly TimelineEvent[],
  w: TimeWindow | null,
  scope: StopScope | null,
  capacity: number,
): RingData {
  const metrics = nodeMetrics(ix, events, w, 'city');
  const focus = new Set<PlaceNodeId>();
  const include: PlaceNodeId[] = [];
  if (scope) {
    const own = scope.pinned ? [scope.pinned] : scope.events;
    for (const t of own) focus.add(ix.nodeOf(t, 'city'));
    include.push(...focus);
    if (scope.pinned) {
      const s = scopeLinks(ix, new Set([scope.pinned.event.id]), null);
      for (const l of [...s.roots, ...s.routes]) {
        include.push(focus.has(l.from) ? l.to : l.from);
      }
    }
  }
  // The stop's own come first, as many as the ring seats.
  const ids = topNodes(metrics, {
    limit: capacity,
    include: [...new Set(include)].slice(0, capacity),
  });

  // Each seat's busiest era in the years shown.
  const eras = new Map<PlaceNodeId, Map<EraId, number>>();
  for (const t of eventsIn(events, w)) {
    const id = ix.nodeOf(t, 'city');
    const counts = eras.get(id) ?? new Map<EraId, number>();
    const era = eraOfYear(t.year).id;
    counts.set(era, (counts.get(era) ?? 0) + 1);
    eras.set(id, counts);
  }
  const busiest = (id: PlaceNodeId): EraId | null => {
    let best: EraId | null = null;
    let n = 0;
    for (const [era, c] of eras.get(id) ?? []) {
      if (c > n) {
        best = era;
        n = c;
      }
    }
    return best;
  };

  const places = ids.flatMap((id) => {
    const node = ix.node(id);
    if (!node) return [];
    return [
      {
        id,
        label: node.label,
        regionId: node.regionId,
        lat: node.lat,
        lng: node.lng,
        events: metrics.get(id)?.events ?? 0,
        era: busiest(id),
      },
    ];
  });
  const seated = new Set(places.map((p) => p.id));
  for (const id of focus) if (!seated.has(id)) focus.delete(id);
  return { places, links: linksAmong(ix, seated, w, 'city'), focus };
}
