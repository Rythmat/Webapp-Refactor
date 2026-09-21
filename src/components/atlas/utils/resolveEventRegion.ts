import { CITIES, CITY_COUNTRY_TO_ISO } from '@/components/atlas/data';
import type {
  City,
  HistoricalEvent,
  SelectedLocation,
} from '@/components/atlas/types';
import { normCountry, sameCountry } from './country';
import { stateAt, type Subdivision } from './stateAt';

// Max squared-degree distance for the coordinate fallback (~0.6°, ≈ 66km).
const MAX_MATCH_DIST_SQ = 0.6 * 0.6;

export interface ResolvedRegion {
  /**
   * The region to select. Always set: an event nothing else claims falls back
   * to its country, so navigating to any event lands on a panel that lists it.
   */
  region: SelectedLocation;
  /** Where the camera should fly to frame that region (or the event). */
  fly: { lat: number; lng: number; zoom: number };
}

/* ── City matching (memoized per event object) ─────────────────────────────
 *
 * Every panel list and every navigation resolves events through these two
 * functions, so each runs ~1,700 times per selection. Keyed on the event object
 * in a WeakMap: a CDN re-hydration replaces the event objects, which drops the
 * stale entries without any generation bookkeeping.
 */

const preciseCache = new WeakMap<HistoricalEvent, City | null>();
const subdivisionCache = new WeakMap<HistoricalEvent, Subdivision | null>();

function nearest(
  event: HistoricalEvent,
  candidates: City[],
): { city: City; distSq: number } | undefined {
  let best: City | undefined;
  let bestDist = Infinity;
  for (const c of candidates) {
    const dLat = c.coordinates[0] - event.location.lat;
    const dLng = c.coordinates[1] - event.location.lng;
    const dist = dLat * dLat + dLng * dLng;
    if (dist < bestDist) {
      bestDist = dist;
      best = c;
    }
  }
  return best ? { city: best, distSq: bestDist } : undefined;
}

/**
 * The CITIES entry an event happened IN: a name match in the SAME country first
 * (so a Birmingham-UK event resolves to Birmingham, England — not Alabama), then
 * the nearest city within ~0.6° — which covers name mismatches like "New York"
 * (event) vs "New York City" (CITIES), and "Brooklyn", which has no entry.
 *
 * Undefined when nothing is close enough to honestly call it that city.
 */
export function matchCity(event: HistoricalEvent): City | undefined {
  const cached = preciseCache.get(event);
  if (cached !== undefined) return cached ?? undefined;

  const cityLower = event.location.city.toLowerCase();
  const byName = CITIES.filter((c) => c.name.toLowerCase() === cityLower).find(
    (c) => sameCountry(c.country, event.location.country),
  );
  let match = byName;
  if (!match) {
    const hit = nearest(event, CITIES);
    if (hit && hit.distSq <= MAX_MATCH_DIST_SQ) match = hit.city;
  }

  preciseCache.set(event, match ?? null);
  return match;
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
 */
export function eventSubdivision(
  event: HistoricalEvent,
): Subdivision | undefined {
  const cached = subdivisionCache.get(event);
  if (cached !== undefined) return cached ?? undefined;

  const cityLower = event.location.city.toLowerCase();
  const byName = CITIES.find(
    (c) =>
      c.name.toLowerCase() === cityLower &&
      sameCountry(c.country, event.location.country),
  );
  let result: Subdivision | undefined;
  if (byName?.subdivision) {
    result = {
      name: byName.subdivision,
      country:
        normCountry(byName.country) === 'CA' ? 'Canada' : 'United States',
    };
  } else {
    result = stateAt(event.location.lat, event.location.lng);
  }

  subdivisionCache.set(event, result ?? null);
  return result;
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
        fly: { lat: c.lat, lng: c.lng, zoom: 8 },
      };
    }
  } else {
    const city = matchCity(event);
    if (city) {
      return {
        region: { type: 'city', id: city.id },
        fly: { lat: city.coordinates[0], lng: city.coordinates[1], zoom: 8 },
      };
    }
  }

  return {
    region: {
      type: 'country',
      name: event.location.country,
      iso: CITY_COUNTRY_TO_ISO[event.location.country] ?? '',
    },
    fly: eventFly,
  };
}
