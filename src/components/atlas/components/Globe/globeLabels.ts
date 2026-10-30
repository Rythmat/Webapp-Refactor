import type { Feature } from 'geojson';
import type { SelectedLocation } from '@/components/atlas/types';

/**
 * What a click on a country or state means, and the names and centres the
 * map works out from Natural Earth's features, as plain functions the map
 * and its tests share.
 */

/** A feature's display name: Natural Earth spells it NAME or name. */
export const featureName = (feat: Pick<Feature, 'properties'>): string =>
  feat.properties?.NAME ?? feat.properties?.name ?? '';

/** Rough centroid from GeoJSON feature coordinates. */
export function getCentroid(
  feat: Feature,
): { lat: number; lng: number } | null {
  const coords: number[][] = [];
  function collect(arr: unknown) {
    if (Array.isArray(arr)) {
      if (typeof arr[0] === 'number') coords.push(arr as number[]);
      else for (const item of arr) collect(item);
    }
  }
  if (feat.geometry && 'coordinates' in feat.geometry) {
    collect(feat.geometry.coordinates);
  }
  if (coords.length === 0) return null;
  let sLat = 0,
    sLng = 0;
  for (const [lng, lat] of coords) {
    sLng += lng;
    sLat += lat;
  }
  return { lat: sLat / coords.length, lng: sLng / coords.length };
}

/**
 * The place a clicked country or state stands for. `properties` are Natural
 * Earth's, with `_layer` set to 'state' on the US/Canada admin-1 outlines.
 */
export function placeOfRegion(
  properties: Feature['properties'],
): SelectedLocation {
  const name = properties?.NAME ?? properties?.name ?? 'Unknown';
  return properties?._layer === 'state'
    ? {
        type: 'state',
        name,
        country:
          (properties?.iso_a2 ?? '') === 'CA' ? 'Canada' : 'United States',
      }
    : {
        type: 'country',
        name,
        iso: properties?.ISO_A3 ?? properties?.iso_a3 ?? '',
      };
}

/** Whether a country or state outline is the selected place. */
export function isRegionSelected(
  properties: Feature['properties'],
  selected: SelectedLocation | null,
): boolean {
  if (!selected) return false;
  const isState = properties?._layer === 'state';
  if (isState && selected.type === 'state') {
    return (properties?.NAME ?? properties?.name) === selected.name;
  }
  if (!isState && selected.type === 'country') {
    return (properties?.ISO_A3 ?? properties?.iso_a3) === selected.iso;
  }
  return false;
}
