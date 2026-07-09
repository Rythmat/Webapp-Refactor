import { CITIES } from '@/components/atlas/data';
import type {
  City,
  HistoricalEvent,
  SelectedLocation,
} from '@/components/atlas/types';
import { normCountry, sameCountry } from './country';

// Max squared-degree distance for the coordinate fallback (~0.6°, ≈ 66km).
const MAX_MATCH_DIST_SQ = 0.6 * 0.6;

export interface ResolvedRegion {
  /** The region to select, or null if the event's city can't be matched. */
  region: SelectedLocation | null;
  /** Where the camera should fly to frame that region (or the event). */
  fly: { lat: number; lng: number; zoom: number };
}

/**
 * Match an event's location to a CITIES entry: a name match in the SAME country
 * first (so a Birmingham-UK event resolves to Birmingham, England — not
 * Alabama), then the nearest city within ~0.6° — which covers name mismatches
 * like "New York" (event) vs "New York City" (CITIES), coordinate-placed
 * events, and same-name cities whose country doesn't line up.
 */
function matchCity(event: HistoricalEvent): City | undefined {
  const cityLower = event.location.city.toLowerCase();
  const nameMatches = CITIES.filter((c) => c.name.toLowerCase() === cityLower);
  const byCountry = nameMatches.find((c) =>
    sameCountry(c.country, event.location.country),
  );
  if (byCountry) return byCountry;

  let best: City | undefined;
  let bestDist = Infinity;
  for (const c of CITIES) {
    const dLat = c.coordinates[0] - event.location.lat;
    const dLng = c.coordinates[1] - event.location.lng;
    const dist = dLat * dLat + dLng * dLng;
    if (dist < bestDist) {
      bestDist = dist;
      best = c;
    }
  }
  return best && bestDist <= MAX_MATCH_DIST_SQ ? best : undefined;
}

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

/**
 * Resolve an event to the region a deep-link should select on the globe, plus a
 * camera target that frames that region:
 *   - a US/CA city → its STATE/province (e.g. Honolulu → Hawaii), flying to the
 *     state's centroid so the whole polygon is framed;
 *   - any other matched city → that CITY (e.g. London), flying to the city;
 *   - an unmatched location → null region, flying to the event point.
 */
export function resolveEventRegion(event: HistoricalEvent): ResolvedRegion {
  const eventFly = {
    lat: event.location.lat,
    lng: event.location.lng,
    zoom: 6,
  };

  const city = matchCity(event);
  if (!city) return { region: null, fly: eventFly };

  const isUS = normCountry(city.country) === 'US';
  const isCA = normCountry(city.country) === 'CA';

  if (city.subdivision && (isUS || isCA)) {
    const stateCities = CITIES.filter(
      (c) => c.subdivision === city.subdivision,
    );
    const c = stateCities.length
      ? centroid(stateCities)
      : { lat: city.coordinates[0], lng: city.coordinates[1] };
    return {
      region: {
        type: 'state',
        name: city.subdivision,
        country: isCA ? 'Canada' : 'United States',
      },
      fly: { lat: c.lat, lng: c.lng, zoom: 8 },
    };
  }

  return {
    region: { type: 'city', id: city.id },
    fly: { lat: city.coordinates[0], lng: city.coordinates[1], zoom: 8 },
  };
}
