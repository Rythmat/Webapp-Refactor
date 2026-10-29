import type { FlyFrame, SelectedLocation } from '@/components/atlas/types';

/**
 * The frames navigation asks the map for (FlyFrame). Each flight also keeps
 * a lat/lng/zoom, which the map uses when a frame can't be fitted.
 */

/**
 * A city's card frames the city: its centre at this street-map zoom, which
 * the map compresses to its own (capFrameZoom in mapFraming.ts). Tours pass
 * their own zoom and no city, wider for a stop with regional context
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
