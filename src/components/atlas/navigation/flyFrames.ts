import type { FlyFrame, SelectedLocation } from '@/components/atlas/types';

/**
 * The frames navigation asks the map for (FlyFrame). Each flight also keeps
 * a lat/lng/zoom, which the map uses when a frame can't be fitted.
 */

/**
 * A city's card frames the city itself: fitted to its outline, or failing
 * one at this street-map zoom, its centre and its suburbs. Tours pass their
 * own zoom and no city, wider for a stop with regional context
 * (guidedTours.ts).
 */
export const CITY_MAP_ZOOM = 10;

export const regionFrame = (place: SelectedLocation): FlyFrame =>
  place.type === 'city'
    ? { kind: 'city', zoom: CITY_MAP_ZOOM, cityId: place.id }
    : { kind: 'region', place };

export const cityFrame = (
  zoom: number = CITY_MAP_ZOOM,
  cityId?: string,
): FlyFrame => ({ kind: 'city', zoom, ...(cityId ? { cityId } : {}) });
