import type { FlyFrame, SelectedLocation } from '@/components/atlas/types';

/**
 * The frames navigation asks the MapLibre engine for (FlyFrame). Each flight
 * also keeps the lat/lng/zoom the three.js globe flies to.
 */

/**
 * A city's card frames the city itself, its centre and its suburbs: a
 * street-map zoom. Tours pass their own, wider for a stop with regional
 * context (guidedTours.ts).
 */
export const CITY_MAP_ZOOM = 10;

export const regionFrame = (place: SelectedLocation): FlyFrame =>
  place.type === 'city'
    ? { kind: 'city', zoom: CITY_MAP_ZOOM }
    : { kind: 'region', place };

export const cityFrame = (zoom: number = CITY_MAP_ZOOM): FlyFrame => ({
  kind: 'city',
  zoom,
});
