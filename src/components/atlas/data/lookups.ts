import type { City, HistoricalEvent } from '@/components/atlas/types';
import {
  eventCities,
  getEventCityById,
} from '@/components/atlas/utils/eventCities';
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

/**
 * A city by its id: a music city, or a town its events make a city of
 * (utils/eventCities.ts: Aspen, Colorado Springs).
 */
export function getCityById(
  id: string | null | undefined,
): PlaceRecord | City | undefined {
  if (!id) return undefined;
  citiesById ??= new Map(CITIES.map((c) => [c.id, c]));
  return citiesById.get(id) ?? getEventCityById(id);
}

/**
 * The first city with this name, ignoring case — as `CITIES.find` did — or
 * failing one, the town of that name.
 */
export function getCityByName(name: string): PlaceRecord | City | undefined {
  if (!citiesByName) {
    citiesByName = new Map();
    for (const c of CITIES) {
      const key = c.name.toLowerCase();
      if (!citiesByName.has(key)) citiesByName.set(key, c);
    }
  }
  const lower = name.toLowerCase();
  return (
    citiesByName.get(lower) ??
    eventCities().find((c) => c.name.toLowerCase() === lower)
  );
}

let allCities: { towns: City[]; all: City[] } | null = null;

/**
 * Every city that can be selected: the music cities, then the towns events
 * make cities of. Rebuilt when the towns change (new content).
 */
export function selectableCities(): City[] {
  const towns = eventCities();
  if (allCities?.towns !== towns) {
    allCities = { towns, all: [...CITIES, ...towns] };
  }
  return allCities.all;
}
