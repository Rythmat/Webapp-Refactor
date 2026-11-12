/**
 * The lesson globe's camera, as pure functions (owner, 2026-11-10: closer
 * in, the globe slowly zooming in and out, and the state or country each
 * moment happened in lifted, as the Globe section lifts a selection).
 *
 *   - `regionAt`: the region a place lies in, from the Globe's own outlines:
 *     a US or Canadian state, else a country. Selected, the Globe lifts it.
 *   - `flightMs`: a flight's length, longer the further it goes.
 *
 * `useStoryCamera.ts` drives the map with them.
 */
import type { Feature } from 'geojson';
import { featureName } from '@/components/atlas/components/Globe/globeLabels';
import { resolveIso } from '@/components/atlas/components/Globe/globeLayers';
import {
  outerRings,
  pointInRing,
  type Outlines,
  type Ring,
} from '@/components/atlas/components/Globe/mapFraming';
import type { SelectedLocation } from '@/components/atlas/types';

export type StoryRegion = Exclude<SelectedLocation, { type: 'city' }>;

export interface RegionAt {
  place: StoryRegion;
  /** Its outline's rings: what lifts, and what the path rises with. */
  rings: Ring[];
}

/** How far outside a country's coarse outline a coastal place may sit, km. */
const COAST_KM = 60;

const EARTH_KM = 6371;

/** The great-circle distance between two places, km. */
export const distanceKm = (
  [lat1, lng1]: readonly [number, number],
  [lat2, lng2]: readonly [number, number],
): number => {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(a)));
};

const containing = (
  features: readonly Feature[],
  [lat, lng]: readonly [number, number],
): { feature: Feature; rings: Ring[] } | null => {
  for (const feature of features) {
    const rings = outerRings(feature.geometry);
    if (rings.some((ring) => pointInRing(lng, lat, ring)))
      return { feature, rings };
  }
  return null;
};

/**
 * How far a place is from a ring's nearest edge, km: flat, about the place,
 * which is close enough within the few tens of km it is asked about.
 */
const edgeKm = (
  [lat0, lng0]: readonly [number, number],
  ring: Ring,
): number => {
  const kx = 111.32 * Math.cos((lat0 * Math.PI) / 180);
  const ky = 110.57;
  let best = Infinity;
  for (let i = 1; i < ring.length; i++) {
    const [lngA, latA] = ring[i - 1]!;
    const [lngB, latB] = ring[i]!;
    const ax = (lngA! - lng0) * kx;
    const ay = (latA! - lat0) * ky;
    const bx = (lngB! - lng0) * kx;
    const by = (latB! - lat0) * ky;
    const dx = bx - ax;
    const dy = by - ay;
    const len = dx * dx + dy * dy;
    const t =
      len > 0 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len)) : 0;
    best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
  }
  return best;
};

/** The outline whose edge passes closest, within `maxKm`. */
const nearest = (
  features: readonly Feature[],
  at: readonly [number, number],
  maxKm: number,
): { feature: Feature; rings: Ring[] } | null => {
  let best: { feature: Feature; rings: Ring[]; km: number } | null = null;
  for (const feature of features) {
    const rings = outerRings(feature.geometry);
    for (const ring of rings) {
      const km = edgeKm(at, ring);
      if (km <= maxKm && (!best || km < best.km)) best = { feature, rings, km };
    }
  }
  return best && { feature: best.feature, rings: best.rings };
};

/**
 * The region a place lies in: its US state or Canadian province when the
 * Globe has those outlines, else its country (a coastal city just off a
 * country's coarse outline counts as in it). Null when the outlines are not
 * there yet, or the place is at sea.
 */
export const regionAt = (
  at: readonly [number, number],
  outlines: Outlines,
): RegionAt | null => {
  const state = outlines.states ? containing(outlines.states, at) : null;
  if (state) {
    return {
      place: {
        type: 'state',
        name: featureName(state.feature),
        country:
          state.feature.properties?.iso_a2 === 'CA'
            ? 'Canada'
            : 'United States',
      },
      rings: state.rings,
    };
  }
  if (!outlines.countries) return null;
  const country =
    containing(outlines.countries, at) ??
    nearest(outlines.countries, at, COAST_KM);
  if (!country) return null;
  return {
    place: {
      type: 'country',
      name: featureName(country.feature),
      iso: resolveIso(country.feature),
    },
    rings: country.rings,
  };
};

/** Whether two regions are the same one (no new lift between them). */
export const sameRegion = (
  a: StoryRegion | null | undefined,
  b: StoryRegion | null | undefined,
): boolean => !!a && !!b && JSON.stringify(a) === JSON.stringify(b);

/** Whether a place is inside a region's outline (it rises with the lid). */
export const insideRings = (
  rings: readonly Ring[],
  [lat, lng]: readonly [number, number],
): boolean => rings.some((ring) => pointInRing(lng, lat, ring));

/**
 * A flight's length, ms: unhurried, and longer the further it goes; about a
 * fifth quicker than first built (owner, 2026-11-10).
 */
export const flightMs = (km: number): number =>
  Math.round(Math.min(6500, 2600 + 1300 * Math.log10(1 + km / 50)));
