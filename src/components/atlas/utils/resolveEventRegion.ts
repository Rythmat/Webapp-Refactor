import { CITIES, CITY_COUNTRY_TO_ISO } from '@/components/atlas/data';
import { stateBoundariesData } from '@/components/atlas/data/loaders';
import {
  cityFrame,
  regionFrame,
} from '@/components/atlas/navigation/flyFrames';
import type {
  City,
  FlyFrame,
  HistoricalEvent,
  SelectedLocation,
} from '@/components/atlas/types';
import { normCountry, sameCountry } from './country';
import { eventCityOf } from './eventCities';
import { matchMusicCity, nearestOf, sameNameCities } from './musicCityMatch';
import { stateAt, type Subdivision } from './stateAt';

export { sameNameCities } from './musicCityMatch';

/**
 * The city an event happened in: a music city (cities.ts, matched by
 * matchMusicCity), or failing one the town its own events make a city of
 * (eventCities.ts: Aspen, Colorado Springs). Undefined only for an event no
 * place can honestly be named for.
 */
export function matchCity(event: HistoricalEvent): City | undefined {
  return matchMusicCity(event) ?? eventCityOf(event);
}

const subdivisionCache = new WeakMap<HistoricalEvent, Subdivision | null>();

export interface ResolvedRegion {
  /**
   * The region to select. Always set: an event nothing else claims falls back
   * to its country, so navigating to any event lands on a panel that lists it.
   */
  region: SelectedLocation;
  /**
   * Where the camera should fly to frame that region (or the event), and
   * what the MapLibre engine frames there: the region itself.
   */
  fly: { lat: number; lng: number; zoom: number; frame: FlyFrame };
}

/**
 * The US state or Canadian province an event happened in.
 *
 * A city matched BY NAME is authoritative — its subdivision is authored data.
 * Everything else is placed by the event's own coordinates against real state
 * outlines (stateAt). That is the case for the ~80 events in towns CITIES does
 * not name; guessing from the nearest named city instead put a quarter of them
 * across a border (the Ohio Players' Dayton in Indiana, Buffalo in
 * Pennsylvania). Before either, those events could not be opened at all.
 *
 * The outlines load on demand. Until they have, an event that needs them gets
 * undefined (not remembered, so it resolves once they land): wait for
 * `stateBoundariesData` first wherever {@link needsStateBoundaries} says so.
 */
export function eventSubdivision(
  event: HistoricalEvent,
): Subdivision | undefined {
  const cached = subdivisionCache.get(event);
  if (cached !== undefined) return cached ?? undefined;

  const byName = nearestOf(event, sameNameCities(event));
  let result: Subdivision | undefined;
  if (byName?.subdivision) {
    result = {
      name: byName.subdivision,
      country:
        normCountry(byName.country) === 'CA' ? 'Canada' : 'United States',
    };
  } else {
    const boundaries = stateBoundariesData.peek();
    if (!boundaries) return undefined;
    result = stateAt(boundaries, event.location.lat, event.location.lng);
  }

  subdivisionCache.set(event, result ?? null);
  return result;
}

/**
 * Whether placing this event needs the state outlines: a US or Canadian
 * event whose town CITIES doesn't name with a state.
 */
export function needsStateBoundaries(event: HistoricalEvent): boolean {
  if (!hasStates(event.location.country)) return false;
  return !nearestOf(event, sameNameCities(event))?.subdivision;
}

/* ── Region resolution ───────────────────────────────────────────────────── */

/** Average coordinates of the given cities (their rough regional centre). */
function centroid(cities: City[]): { lat: number; lng: number } {
  const sum = cities.reduce(
    (acc, c) => ({
      lat: acc.lat + c.coordinates[0],
      lng: acc.lng + c.coordinates[1],
    }),
    { lat: 0, lng: 0 },
  );
  return { lat: sum.lat / cities.length, lng: sum.lng / cities.length };
}

function hasStates(country: string): boolean {
  const n = normCountry(country);
  return n === 'US' || n === 'CA';
}

/**
 * Resolve an event to the region navigation should select, plus a camera
 * target that frames it:
 *   - a US/CA event → its STATE/province (e.g. Honolulu → Hawaii), flying to
 *     the state's centroid so the whole polygon is framed;
 *   - any other event in or near a known city → that CITY (e.g. London);
 *   - anything else → its COUNTRY, flying to the event itself.
 *
 * The contract, enforced by resolveEventRegion.test.ts: for every event,
 * `getEventsForLocation(resolveEventRegion(e).region)` contains `e`. That is
 * what guarantees an influence pill never opens an empty panel.
 */
export function resolveEventRegion(event: HistoricalEvent): ResolvedRegion {
  const eventFly = {
    lat: event.location.lat,
    lng: event.location.lng,
    zoom: 6,
  };

  if (hasStates(event.location.country)) {
    const state = eventSubdivision(event);
    if (state) {
      const stateCities = CITIES.filter(
        (c) =>
          c.subdivision === state.name && sameCountry(c.country, state.country),
      );
      const c = stateCities.length
        ? centroid(stateCities)
        : { lat: event.location.lat, lng: event.location.lng };
      return {
        region: { type: 'state', name: state.name, country: state.country },
        fly: {
          lat: c.lat,
          lng: c.lng,
          zoom: 8,
          frame: regionFrame({
            type: 'state',
            name: state.name,
            country: state.country,
          }),
        },
      };
    }
  } else {
    const city = matchCity(event);
    if (city) {
      return {
        region: { type: 'city', id: city.id },
        fly: {
          lat: city.coordinates[0],
          lng: city.coordinates[1],
          zoom: 8,
          frame: cityFrame(undefined, city.id),
        },
      };
    }
  }

  const country: SelectedLocation = {
    type: 'country',
    name: event.location.country,
    iso: CITY_COUNTRY_TO_ISO[event.location.country] ?? '',
  };
  return { region: country, fly: { ...eventFly, frame: regionFrame(country) } };
}
