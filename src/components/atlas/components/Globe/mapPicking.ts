import type { SelectedLocation } from '@/components/atlas/types';
import {
  arcLabel,
  featureName,
  placeOfRegion,
  pointLabel,
  regionLabel,
} from './globeLabels';
import { REGION_CLICK_MAX_ZOOM } from './mapGeometry';
import { CLICK_LAYERS, LAYER } from './mapStyle';

/**
 * What is under the pointer on the MapLibre globe, and what clicking it does,
 * as pure functions of the features MapLibre found there. MapLibreGlobe only
 * asks the map and acts on the answer, so all of the choosing is tested here.
 */

/** A feature as queryRenderedFeatures gives it: only what we read. */
export interface PickedFeature {
  layer: { id: string };
  properties: Record<string, unknown> | null;
}

export type MapTarget =
  | { kind: 'event'; eventId: string }
  | { kind: 'city'; cityId: string }
  | {
      kind: 'region';
      place: SelectedLocation;
      centroid: { lat: number; lng: number } | null;
    };

const priority = (layerId: string): number => {
  const i = (CLICK_LAYERS as readonly string[]).indexOf(layerId);
  return i === -1 ? Infinity : i;
};

/**
 * Countries and states answer clicks from orbit down to the country level
 * (REGION_CLICK_MAX_ZOOM). With a street basemap, a click among the streets
 * should not open the country it lands in; without one, the outlines are
 * the whole map and always answer.
 */
export const regionsClickable = (zoom: number, withBasemap: boolean): boolean =>
  !withBasemap || zoom < REGION_CLICK_MAX_ZOOM;

/** The feature a click means: the most specific layer's (CLICK_LAYERS). */
export function topFeature(
  features: readonly PickedFeature[],
  regions: boolean,
): PickedFeature | null {
  let best: PickedFeature | null = null;
  for (const feature of features) {
    const id = feature.layer.id;
    if (!regions && (id === LAYER.countriesFill || id === LAYER.statesFill)) {
      continue;
    }
    if (priority(id) === Infinity) continue;
    if (!best || priority(id) < priority(best.layer.id)) best = feature;
  }
  return best;
}

const str = (value: unknown): string | null =>
  typeof value === 'string' && value ? value : null;
const num = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

/** What clicking `feature` opens. */
export function targetOf(feature: PickedFeature | null): MapTarget | null {
  if (!feature) return null;
  const p = feature.properties ?? {};
  switch (feature.layer.id) {
    case LAYER.arcsHit:
    case LAYER.artistPoints: {
      const eventId = str(p.eventId);
      return eventId ? { kind: 'event', eventId } : null;
    }
    case LAYER.cityLabels: {
      const cityId = str(p.cityId);
      return cityId ? { kind: 'city', cityId } : null;
    }
    case LAYER.statesFill:
    case LAYER.countriesFill: {
      const lat = num(p.clat);
      const lng = num(p.clng);
      return {
        kind: 'region',
        place: placeOfRegion(p),
        centroid: lat !== null && lng !== null ? { lat, lng } : null,
      };
    }
    default:
      return null;
  }
}

/** The hover label for `feature`. */
export function labelOf(feature: PickedFeature | null): string | null {
  if (!feature) return null;
  const p = feature.properties ?? {};
  switch (feature.layer.id) {
    case LAYER.arcsHit:
      return arcLabel({
        label: str(p.label) ?? '',
        direction: p.direction === 'upstream' ? 'upstream' : 'downstream',
      });
    case LAYER.artistPoints:
      return pointLabel(str(p.name) ?? '');
    // A city is its name, already on the map and warm when hovered.
    case LAYER.cityLabels:
      return null;
    case LAYER.statesFill:
    case LAYER.countriesFill:
      return regionLabel(featureName({ properties: p }), p._layer === 'state');
    default:
      return null;
  }
}
