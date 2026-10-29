import type { Feature } from 'geojson';
import type { ArcDatum } from '@/components/atlas/data';
import { atlasVar } from '@/components/atlas/theme/tokens';
import type { SelectedLocation } from '@/components/atlas/types';

/**
 * What the map says about what is under the pointer, and what a click on a
 * country or state means, as plain functions the map and its tests share.
 */

/** Event titles carry quotes and ampersands; the labels are set as HTML. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/*
 * Hover labels. Each engine puts them in its own tooltip box, which index.css
 * turns into a small panel; these set only the text, in the page's tokens.
 */
const LABEL_TEXT = `color:${atlasVar('text')};font-size:12px`;
const LABEL_STRONG = `${LABEL_TEXT};font-weight:700`;
const LABEL_QUIET = `color:${atlasVar('text-2')};font-size:12px`;

export function arcLabel(arc: Pick<ArcDatum, 'label' | 'direction'>): string {
  const arrow = arc.direction === 'upstream' ? '→' : '←';
  return `<span style="${LABEL_TEXT}">${escapeHtml(arc.label)} ${arrow}</span>`;
}

/** A country (bold) or a state or province (quiet). */
export function regionLabel(name: string, isState: boolean): string {
  if (isState) {
    return `<span style="${LABEL_QUIET}">${escapeHtml(name)}</span>`;
  }
  return `<span style="${LABEL_STRONG};font-size:13px">${escapeHtml(name)}</span>`;
}

/** An artist's event point. */
export function pointLabel(name: string): string {
  return `<span style="${LABEL_STRONG}">${escapeHtml(name)}</span>`;
}

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
