import {
  CITIES,
  getTour,
  regionTourId,
  resolveTourStops,
} from '@/components/atlas/data';
import type { City } from '@/components/atlas/types';
import { FEATURED_CITY_IDS } from './featured';

/**
 * Curated notable music cities for a region: the marquee featured cities in that
 * region first, then the region guided-tour's city stops — deduped, resolved to
 * City objects. Reuses existing curation so all 18 regions are covered. Shared by
 * the Globe dashboard "Regions & Cities" shelf and the slide-deck content picker.
 */
export function regionCities(regionId: string): City[] {
  const featured = FEATURED_CITY_IDS.filter(
    (id) => CITIES.find((c) => c.id === id)?.region === regionId,
  );
  const tour = getTour(regionTourId(regionId));
  const tourCityIds = tour
    ? resolveTourStops(tour)
        .map((s) => s.cityId)
        .filter((id): id is string => Boolean(id))
    : [];
  const orderedIds = [...new Set([...featured, ...tourCityIds])];
  return orderedIds
    .map((id) => CITIES.find((c) => c.id === id))
    .filter((c): c is City => Boolean(c));
}
