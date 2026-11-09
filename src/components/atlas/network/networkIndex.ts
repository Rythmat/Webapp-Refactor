import type { EventConnection } from '@/components/atlas/data/eventConnections';
import { getCityById } from '@/components/atlas/data/lookups';
import { regionLabel } from '@/components/atlas/data/placeTree';
import { REGIONS } from '@/components/atlas/data/regions';
import {
  getTimelineEvent,
  type TimelineEvent,
} from '@/components/atlas/data/timelineIndex';
import { normCountry } from '@/components/atlas/utils/country';
import type { PlaceLevel, PlaceNode, PlaceNodeId } from './types';

/**
 * The influence links over the loaded content, ready to be rolled up into
 * places: each link with both of its events placed (TimelineEvent), sorted
 * by the year the influence arrived (the later event's). A link whose event
 * is missing from the content (an id nothing publishes yet) is left out.
 */
export interface IndexedEdge {
  from: TimelineEvent;
  to: TimelineEvent;
  /** When the influence arrived: the influenced event's year. */
  year: number;
}

export interface NetworkIndex {
  edges: readonly IndexedEdge[];
  /** The node an event belongs to at a level. */
  nodeOf(t: TimelineEvent, level: PlaceLevel): PlaceNodeId;
  /** A node seen in the content, by id. */
  node(id: PlaceNodeId): PlaceNode | undefined;
}

/**
 * Where an event is, at a level: its music city or town, else its country
 * (an event no city claims and no town was made of); its country; its
 * region.
 */
export function nodeIdOf(t: TimelineEvent, level: PlaceLevel): PlaceNodeId {
  if (level === 'region') return `region:${t.regionId}`;
  if (level === 'city' && t.cityId) return `city:${t.cityId}`;
  return `country:${normCountry(t.event.location.country)}`;
}

const REGION_CENTER = new Map(REGIONS.map((r) => [r.id, r.center]));

interface CountryTally {
  name: string;
  lat: number;
  lng: number;
  n: number;
  regionId: TimelineEvent['regionId'];
}

export function buildNetworkIndex(
  events: readonly TimelineEvent[],
  connections: readonly EventConnection[],
  find: (id: string) => TimelineEvent | undefined = getTimelineEvent,
): NetworkIndex {
  const edges: IndexedEdge[] = [];
  for (const c of connections) {
    const from = find(c.from);
    const to = find(c.to);
    if (from && to) edges.push({ from, to, year: to.year });
  }
  edges.sort(
    (a, b) =>
      a.year - b.year ||
      a.to.event.id.localeCompare(b.to.event.id) ||
      a.from.event.id.localeCompare(b.from.event.id),
  );

  // The nodes the content holds, with a name and a point each.
  const nodes = new Map<PlaceNodeId, PlaceNode>();
  // A country's name: the longest of its events' spellings ('United States'
  // over 'US'), and its point their mean.
  const countries = new Map<string, CountryTally>();
  for (const t of events) {
    const key = normCountry(t.event.location.country);
    const raw = t.event.location.country;
    const c = countries.get(key);
    if (!c) {
      countries.set(key, {
        name: raw,
        lat: t.event.location.lat,
        lng: t.event.location.lng,
        n: 1,
        regionId: t.regionId,
      });
    } else {
      if (raw.length > c.name.length) c.name = raw;
      c.lat += t.event.location.lat;
      c.lng += t.event.location.lng;
      c.n += 1;
    }
    if (t.cityId && !nodes.has(`city:${t.cityId}`)) {
      const city = getCityById(t.cityId);
      if (city) {
        nodes.set(`city:${t.cityId}`, {
          id: `city:${t.cityId}`,
          level: 'city',
          label: city.name,
          lat: city.coordinates[0],
          lng: city.coordinates[1],
          regionId: t.regionId,
          place: { type: 'city', id: t.cityId },
        });
      }
    }
    const regionId = `region:${t.regionId}`;
    if (!nodes.has(regionId)) {
      const [lat, lng] = REGION_CENTER.get(t.regionId) ?? [0, 0];
      nodes.set(regionId, {
        id: regionId,
        level: 'region',
        label: regionLabel(t.regionId),
        lat,
        lng,
        regionId: t.regionId,
        place: null,
      });
    }
  }
  for (const [key, c] of countries) {
    nodes.set(`country:${key}`, {
      id: `country:${key}`,
      level: 'country',
      label: c.name,
      lat: c.lat / c.n,
      lng: c.lng / c.n,
      regionId: c.regionId,
      place: { type: 'country', name: c.name, iso: '' },
    });
  }

  return { edges, nodeOf: nodeIdOf, node: (id) => nodes.get(id) };
}
