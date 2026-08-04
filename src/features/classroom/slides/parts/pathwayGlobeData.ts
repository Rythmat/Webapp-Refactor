/**
 * Pure builder: an ordered list of a pathway's stops (HistoricalEvents) →
 * cobe globe markers + arcs that TRACE the pathway (a dot per stop, an arc
 * between consecutive stops). The active stop is drawn larger and labelled with
 * its city. cobe has no per-arc height, so a single global `arcHeight` is picked
 * from the longest hop. Pure + React-free so it is unit-testable.
 */
import { getEventCountryColor } from '@/components/atlas/data/eventConnections';
import type { HistoricalEvent } from '@/components/atlas/types';
import type { GlobeArc, GlobeMarker } from '@/components/ui/cobe-globe-cdn';
import {
  arcHeightForAngle,
  centralAngle,
  rgb,
} from '@/components/ui/globeMath';

export interface PathwayGlobe {
  markers: GlobeMarker[];
  arcs: GlobeArc[];
  arcHeight: number;
}

const STOP_SIZE = 0.03;
const ACTIVE_SIZE = 0.055;

const coordOf = (e: HistoricalEvent): [number, number] => [
  e.location.lat,
  e.location.lng,
];

export const buildPathwayGlobeData = (
  events: HistoricalEvent[],
  activeIndex = 0,
): PathwayGlobe => {
  const markers: GlobeMarker[] = events.map((e, i) => {
    const active = i === activeIndex;
    return {
      id: `stop-${i}`,
      location: coordOf(e),
      label: active ? e.location.city : '',
      color: rgb(getEventCountryColor(e)),
      size: active ? ACTIVE_SIZE : STOP_SIZE,
    };
  });

  let maxAngle = 0;
  const arcs: GlobeArc[] = [];
  for (let i = 0; i < events.length - 1; i++) {
    const from = coordOf(events[i]);
    const to = coordOf(events[i + 1]);
    const angle = centralAngle(from, to);
    if (angle > maxAngle) maxAngle = angle;
    arcs.push({
      id: `hop-${i}`,
      from,
      to,
      color: rgb(getEventCountryColor(events[i])),
    });
  }

  return { markers, arcs, arcHeight: arcHeightForAngle(maxAngle) };
};
