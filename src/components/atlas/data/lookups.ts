import type { HistoricalEvent } from '@/components/atlas/types';
import { contentGeneration, MUSIC_HISTORY } from '@/content/contentStore';
import type { PlaceRecord } from '@/content/records/types';
import { CITIES } from './cities';

/**
 * Id lookups for the globe's data, so a render asks a Map instead of walking
 * an array of thousands.
 *
 * MUSIC_HISTORY fills in place when content hydrates (see contentStore.ts),
 * so its map rebuilds whenever the content generation moves — and when the
 * array's length does, which catches tests that push into it directly.
 * CITIES is bundled and never changes, so its maps are built once, on first
 * use rather than at import. Pathways are looked up in guides.ts, which loads
 * on demand.
 */
let events: Map<string, HistoricalEvent> | null = null;
let eventsGeneration = -1;
let eventsLength = -1;

export function getEventById(
  id: string | null | undefined,
): HistoricalEvent | undefined {
  if (!id) return undefined;
  if (
    !events ||
    eventsGeneration !== contentGeneration ||
    eventsLength !== MUSIC_HISTORY.length
  ) {
    events = new Map(MUSIC_HISTORY.map((e) => [e.id, e]));
    eventsGeneration = contentGeneration;
    eventsLength = MUSIC_HISTORY.length;
  }
  return events.get(id);
}

let citiesById: Map<string, PlaceRecord> | null = null;
let citiesByName: Map<string, PlaceRecord> | null = null;

export function getCityById(
  id: string | null | undefined,
): PlaceRecord | undefined {
  if (!id) return undefined;
  citiesById ??= new Map(CITIES.map((c) => [c.id, c]));
  return citiesById.get(id);
}

/** The first city with this name, ignoring case — as `CITIES.find` did. */
export function getCityByName(name: string): PlaceRecord | undefined {
  if (!citiesByName) {
    citiesByName = new Map();
    for (const c of CITIES) {
      const key = c.name.toLowerCase();
      if (!citiesByName.has(key)) citiesByName.set(key, c);
    }
  }
  return citiesByName.get(name.toLowerCase());
}
