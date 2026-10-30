import type { Feature, Geometry, Position } from 'geojson';
import { CITIES, CITY_COUNTRY_TO_ISO } from '@/components/atlas/data';
import {
  FRAME_PX,
  clampInspectorPx,
} from '@/components/atlas/layout/frameGeometry';
import { sheetHeights } from '@/components/atlas/layout/sheetSnap';
import type {
  FlyTarget,
  MapInsets,
  SelectedLocation,
} from '@/components/atlas/types';
import { featureName } from './globeLabels';
import { resolveIso } from './globeLayers';
import { flyZoom } from './mapGeometry';

/**
 * Where the MapLibre engine puts the camera for a flight (FlyTarget.frame),
 * as pure functions: a country or a state fitted to its outline, a city
 * centred with the region around it, an artist's events fitted together,
 * all inside the part of the map the page leaves clear (Insets).
 */

/** [[west, south], [east, north]], in degrees. */
export type Bounds = [[number, number], [number, number]];

/** How much of the map, in px from each edge, the page's overlays cover. */
export type Insets = MapInsets;

export const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

/** Space kept between a framed place and the overlays around it. */
export const FRAME_MARGIN_PX = 32;
/** How close a fit may come: a small country or state still shows context. */
export const COUNTRY_MAX_ZOOM = 6;
export const STATE_MAX_ZOOM = 6.5;
/** An artist whose events are all in one city sees the city's region. */
export const POINTS_MAX_ZOOM = 6.5;
/** A city is seen with the region around it: there are no streets to see. */
export const CITY_MAX_ZOOM = 7;

/**
 * A city flight's zoom on a map with no streets. Navigation still asks in
 * street-map zooms (10 for a city, 7–9.3 for a tour's stops, wider where a
 * stop shows its region): up to 5.5 they stand, past it they are compressed
 * into what is left below CITY_MAX_ZOOM, so a closer stop still lands
 * closer (10 → 7; a tour's 7 → 6.0, 9.3 → 6.8).
 */
export function capFrameZoom(zoom: number): number {
  return Math.min(
    CITY_MAX_ZOOM,
    zoom <= 5.5 ? zoom : 5.5 + (zoom - 5.5) * 0.35,
  );
}
/**
 * A part of a country or state joins its main landmass when it lies within
 * this many degrees of what is framed so far: Sicily, Hokkaido and Tasmania
 * do; Alaska, Hawaii, Svalbard and the Canaries don't.
 */
export const NEARBY_PART_DEG = 3;

/* ── Outlines ────────────────────────────────────────────────────────────── */

export type Ring = Position[];

/** The outer ring of each polygon in a geometry. */
export function outerRings(geometry: Geometry | null | undefined): Ring[] {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') return geometry.coordinates.slice(0, 1);
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.map((polygon) => polygon[0]);
  }
  return [];
}

function ringBounds(ring: Ring): Bounds {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const [lng, lat] of ring) {
    west = Math.min(west, lng);
    east = Math.max(east, lng);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  }
  return [
    [west, south],
    [east, north],
  ];
}

/** A ring's area, in square degrees narrowed by latitude: enough to rank. */
/** A ring's area, in square degrees narrowed by the cosine of its latitude. */
export function ringArea(ring: Ring): number {
  let twice = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    twice += x1 * y2 - x2 * y1;
  }
  const [[, south], [, north]] = ringBounds(ring);
  const cosLat = Math.cos((((south + north) / 2) * Math.PI) / 180);
  return (Math.abs(twice) / 2) * cosLat;
}

/** Whether a point is inside a ring (even-odd rule). */
export function pointInRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

/** The gap between two boxes, in degrees (0 where they touch or overlap). */
function boundsGap(a: Bounds, b: Bounds): number {
  const dx = Math.max(0, b[0][0] - a[1][0], a[0][0] - b[1][0]);
  const dy = Math.max(0, b[0][1] - a[1][1], a[0][1] - b[1][1]);
  return Math.hypot(dx, dy);
}

const union = (a: Bounds, b: Bounds): Bounds => [
  [Math.min(a[0][0], b[0][0]), Math.min(a[0][1], b[0][1])],
  [Math.max(a[1][0], b[1][0]), Math.max(a[1][1], b[1][1])],
];

/**
 * The bounds that frame a country or a state: its main landmass, and every
 * other part within NEARBY_PART_DEG of what is framed so far. The main
 * landmass is the part holding the most of `anchors` (the place's music
 * cities), failing that the largest: Malaysia frames the peninsula with
 * Kuala Lumpur, not the larger Malaysian Borneo; the United States frames
 * the lower 48, not Alaska.
 */
export function regionBounds(
  geometry: Geometry | null | undefined,
  anchors: readonly { lat: number; lng: number }[] = [],
): Bounds | null {
  const parts = outerRings(geometry)
    .filter((ring) => ring.length >= 4)
    .map((ring) => ({
      ring,
      bounds: ringBounds(ring),
      area: ringArea(ring),
      anchors: anchors.filter((a) => pointInRing(a.lng, a.lat, ring)).length,
    }));
  if (parts.length === 0) return null;
  const main = parts.reduce((best, part) =>
    part.anchors > best.anchors ||
    (part.anchors === best.anchors && part.area > best.area)
      ? part
      : best,
  );
  let framed = main.bounds;
  const left = parts.filter((part) => part !== main);
  // A chain of islands joins one by one: each addition may bring the next
  // within reach.
  for (let grew = true; grew; ) {
    grew = false;
    for (let i = left.length - 1; i >= 0; i--) {
      if (boundsGap(framed, left[i].bounds) <= NEARBY_PART_DEG) {
        framed = union(framed, left[i].bounds);
        left.splice(i, 1);
        grew = true;
      }
    }
  }
  return framed;
}

/**
 * The bounds of a set of points. Points on both sides of the antimeridian
 * that sit closer across it (Tokyo and Los Angeles) are framed across it,
 * east of 180°.
 */
export function pointsBounds(
  points: readonly { lat: number; lng: number }[],
): Bounds | null {
  if (points.length === 0) return null;
  const lngs = points.map((p) => p.lng);
  const span = Math.max(...lngs) - Math.min(...lngs);
  const wrapped = span > 180 ? lngs.map((l) => (l < 0 ? l + 360 : l)) : lngs;
  const wrappedSpan = Math.max(...wrapped) - Math.min(...wrapped);
  const use = wrappedSpan < span ? wrapped : lngs;
  const lats = points.map((p) => p.lat);
  return [
    [Math.min(...use), Math.min(...lats)],
    [Math.max(...use), Math.max(...lats)],
  ];
}

/* ── Finding the place ───────────────────────────────────────────────────── */

/** The country and state outlines the map draws (useGeoData). */
export interface Outlines {
  countries: readonly Feature[] | null;
  states: readonly Feature[] | null;
}

/**
 * A region's outline and its music cities, or 'loading' while its outlines
 * are still on their way, or null when there is no such outline.
 */
export function findRegion(
  place: SelectedLocation,
  outlines: Outlines,
):
  | { feature: Feature; anchors: { lat: number; lng: number }[] }
  | 'loading'
  | null {
  if (place.type === 'city') return null;
  const at = (lat: number, lng: number) => ({ lat, lng });
  if (place.type === 'state') {
    if (!outlines.states) return 'loading';
    const canada = place.country === 'Canada';
    const feature = outlines.states.find(
      (f) =>
        featureName(f) === place.name &&
        (!place.country || (f.properties?.iso_a2 === 'CA') === canada),
    );
    if (!feature) return null;
    return {
      feature,
      anchors: CITIES.filter((c) => c.subdivision === place.name).map((c) =>
        at(...c.coordinates),
      ),
    };
  }
  if (!outlines.countries) return 'loading';
  // Natural Earth's names on a click; the dataset's names (and an ISO code)
  // from a link or an event, so the code is the fallback. Several countries
  // share ISO_A3 -99 (France, Norway): never match on that.
  const feature =
    outlines.countries.find((f) => featureName(f) === place.name) ??
    (place.iso && place.iso !== '-99'
      ? outlines.countries.find(
          (f) =>
            resolveIso(f) === place.iso || f.properties?.ISO_A3 === place.iso,
        )
      : undefined);
  if (!feature) return null;
  const iso = resolveIso(feature);
  return {
    feature,
    anchors: CITIES.filter((c) => CITY_COUNTRY_TO_ISO[c.country] === iso).map(
      (c) => at(...c.coordinates),
    ),
  };
}

/* ── The camera ──────────────────────────────────────────────────────────── */

/**
 * The insets a flight lands with. A framed flight is a place, an event, an
 * artist or a tour stop opening, and its panel may not be on the page yet
 * when the flight sets off: on a desktop the Inspector is assumed at its
 * left, at the width the viewer last left it (`inspectorPx`), on a phone
 * the sheet at half. Once the panel is there and measured, the map's
 * padding (MapPadding) already matches, so nothing slides.
 */
export function landingInsets(
  measured: Insets,
  view: { phone: boolean; width: number; height: number; inspectorPx: number },
  framed: boolean,
): Insets {
  if (!framed) return measured;
  if (view.phone) {
    return {
      ...measured,
      bottom: Math.max(measured.bottom, sheetHeights(view.height).half),
    };
  }
  return {
    ...measured,
    left:
      measured.left ||
      FRAME_PX.gutter + clampInspectorPx(view.inspectorPx, view.width),
  };
}

export interface Camera {
  center: [number, number];
  zoom: number;
}

/** Fits bounds to the map's clear area, no closer than `maxZoom`. */
export type FitBounds = (bounds: Bounds, maxZoom: number) => Camera | null;

/** MapLibre's world is 512 px across at zoom 0. */
const WORLD_PX = 512;
const MAX_LAT = 85;

/** Web Mercator's y, as a fraction of the world's height (0 at the equator). */
const mercatorY = (lat: number): number => {
  const φ = (Math.max(-MAX_LAT, Math.min(MAX_LAT, lat)) * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + φ / 2)) / (2 * Math.PI);
};
const latOfMercatorY = (y: number): number =>
  (Math.atan(Math.sinh(y * 2 * Math.PI)) * 180) / Math.PI;

/**
 * The camera that fits `bounds` inside the part of a `view` the `insets`
 * leave clear, `margin` px in from it, no closer than `maxZoom`: the bounds'
 * middle (in Web Mercator) at the clear area's middle. MapLibre's globe keeps
 * the scale at the centre equal to Web Mercator's, so this is exact at the
 * zooms states and cities are seen from, and leaves a continent-sized
 * country a little more room than it needs (the globe curves away from the
 * centre). MapLibre's own cameraForBounds, under the globe projection, sizes
 * a region's height too small: Louisiana came out a third too tall.
 */
export function fitCamera(
  bounds: Bounds,
  view: { width: number; height: number },
  insets: Insets,
  maxZoom: number,
  margin = FRAME_MARGIN_PX,
): Camera {
  const [[west, south], [east, north]] = bounds;
  const width = Math.max(
    1,
    view.width - insets.left - insets.right - 2 * margin,
  );
  const height = Math.max(
    1,
    view.height - insets.top - insets.bottom - 2 * margin,
  );
  const spanX = Math.max((east - west) / 360, 1e-9);
  const spanY = Math.max(mercatorY(north) - mercatorY(south), 1e-9);
  const zoom = Math.min(
    maxZoom,
    Math.log2(width / (spanX * WORLD_PX)),
    Math.log2(height / (spanY * WORLD_PX)),
  );
  let lng = (west + east) / 2;
  if (lng > 180) lng -= 360;
  const lat = latOfMercatorY((mercatorY(north) + mercatorY(south)) / 2);
  return { center: [lng, lat], zoom: Math.max(0, zoom) };
}

/**
 * Where a flight goes. `fit` frames bounds inside the clear part of the map
 * (fitCamera, with the landing insets and a margin). A target
 * whose place cannot be found falls back to its lat/lng/zoom, mapped from
 * the three.js globe's altitudes (flyZoom).
 */
export function frameCamera(
  target: FlyTarget,
  outlines: Outlines,
  fit: FitBounds,
  viewHeight: number,
): Camera {
  const fallback: Camera = {
    center: [target.lng, target.lat],
    zoom: flyZoom(target.zoom, viewHeight, target.lat),
  };
  const frame = target.frame;
  if (!frame) return fallback;
  if (frame.kind === 'city') {
    // The city at its centre, with the region around it.
    return { center: [target.lng, target.lat], zoom: capFrameZoom(frame.zoom) };
  }
  if (frame.kind === 'points') {
    const bounds = pointsBounds(frame.points);
    return (bounds && fit(bounds, POINTS_MAX_ZOOM)) ?? fallback;
  }
  const region = findRegion(frame.place, outlines);
  if (region === null || region === 'loading') return fallback;
  const bounds = regionBounds(region.feature.geometry, region.anchors);
  const maxZoom =
    frame.place.type === 'state' ? STATE_MAX_ZOOM : COUNTRY_MAX_ZOOM;
  return (bounds && fit(bounds, maxZoom)) ?? fallback;
}
