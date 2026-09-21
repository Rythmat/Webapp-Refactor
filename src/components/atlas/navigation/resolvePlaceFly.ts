import { CITIES } from '@/components/atlas/data';
import type { City, SelectedLocation } from '@/components/atlas/types';
import { normCountry, sameCountry } from '@/components/atlas/utils/country';

export interface FlyTo {
  lat: number;
  lng: number;
  zoom: number;
}

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
 * Where the camera should go for a place restored from the URL.
 *
 * A click on the globe already knows the polygon it hit and flies to its
 * centroid, but a bookmarked `?place=state:Indiana` arrives with no polygon —
 * so the camera target is rebuilt from the cities the dataset places there.
 * Returns null when nothing is known about the place, which leaves the camera
 * where it is rather than throwing it at [0, 0] in the Atlantic.
 */
export function resolvePlaceFly(place: SelectedLocation): FlyTo | null {
  if (place.type === 'city') {
    const city = CITIES.find((c) => c.id === place.id);
    if (!city) return null;
    return { lat: city.coordinates[0], lng: city.coordinates[1], zoom: 10 };
  }

  if (place.type === 'state') {
    const inState = CITIES.filter(
      (c) =>
        c.subdivision === place.name &&
        (!place.country || sameCountry(c.country, place.country)),
    );
    if (inState.length === 0) return null;
    return { ...centroid(inState), zoom: 8 };
  }

  const inCountry = CITIES.filter((c) => sameCountry(c.country, place.name));
  if (inCountry.length === 0) {
    // Country names arrive from GeoJSON ("United States of America") as often
    // as from the dataset ("US"), so fall back to a normalized comparison.
    const normalized = normCountry(place.name);
    const loose = CITIES.filter((c) => normCountry(c.country) === normalized);
    if (loose.length === 0) return null;
    return { ...centroid(loose), zoom: 6 };
  }
  return { ...centroid(inCountry), zoom: 6 };
}
