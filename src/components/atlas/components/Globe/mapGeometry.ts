import type { Feature, FeatureCollection, LineString, Point } from 'geojson';
import type { ArcDatum } from '@/components/atlas/data';
import { getCentroid } from './globeLabels';
import {
  arcColors,
  cityColumnColors,
  isCityHighlighted,
  regionColor,
  type ArtistPoint,
  type CityPoint,
} from './globeLayers';

/**
 * The MapLibre engine's geometry, as pure functions: how the page's camera
 * altitudes map onto MapLibre zoom levels, the influence arcs as great
 * circles, and the GeoJSON each source is fed.
 * Nothing here touches MapLibre itself, so all of it is unit-tested.
 */

/* ── Camera ──────────────────────────────────────────────────────────────── */

/**
 * The page's fly targets carry a zoom (resolvePlaceFly: 6 a country, 8 a
 * state or an event's city, 10 a city; regions.ts 3–5) that the three.js
 * globe turned into a camera altitude, in globe radii above the surface.
 */
export function zoomToAltitude(zoom: number): number {
  return Math.max(0.3, 3.5 - zoom * 0.3);
}

/** A camera flight's length; with reduced motion the camera cuts instead. */
export const flightDuration = (reducedMotion: boolean): number =>
  reducedMotion ? 0 : 1500;

/**
 * How fast Spin turns the globe: a little under 14°/s, roughly 26 seconds
 * for a full turn, the same pace the globe used to drift at.
 */
export const SPIN_DEGREES_PER_SECOND = 13.8;

const EARTH_CIRCUMFERENCE_M = 40_075_016.686;
const EARTH_RADIUS_M = 6_371_008.8;
/** MapLibre's world is 512 px across at zoom 0. */
const TILE_SIZE = 512;
/** three.js's default camera, which globe.gl keeps: 50° vertically. */
const THREE_FOV_RAD = (50 * Math.PI) / 180;
/** MapLibre's zoom range on this page: the whole planet to street level. */
export const MAP_MIN_ZOOM = 0;
export const MAP_MAX_ZOOM = 18;

const clampZoom = (z: number) =>
  Math.min(MAP_MAX_ZOOM, Math.max(MAP_MIN_ZOOM, z));

/** Metres of ground the three.js camera's view spans vertically, near its centre. */
const groundSpan = (altitude: number) =>
  2 * altitude * EARTH_RADIUS_M * Math.tan(THREE_FOV_RAD / 2);

/**
 * The MapLibre zoom that frames the same ground the three.js camera did from
 * `altitude`, in a map `viewportHeight` px tall, centred at `lat`.
 *
 * MapLibre's globe keeps the scale at the map's centre equal to Web
 * Mercator's, which grows by 1/cos(lat) away from the equator, so the same
 * zoom shows less ground further north or south; the zoom rises with it.
 */
export function altitudeToMapZoom(
  altitude: number,
  viewportHeight: number,
  lat = 0,
): number {
  const metresPerPixel = groundSpan(altitude) / Math.max(1, viewportHeight);
  const atEquator = Math.log2(
    EARTH_CIRCUMFERENCE_M / (TILE_SIZE * metresPerPixel),
  );
  const latitude = Math.min(85, Math.abs(lat));
  return clampZoom(atEquator - Math.log2(Math.cos((latitude * Math.PI) / 180)));
}

/** The altitude a MapLibre zoom stands for: altitudeToMapZoom, inverted. */
export function mapZoomToAltitude(
  zoom: number,
  viewportHeight: number,
  lat = 0,
): number {
  const latitude = Math.min(85, Math.abs(lat));
  const atEquator = zoom + Math.log2(Math.cos((latitude * Math.PI) / 180));
  const metresPerPixel =
    EARTH_CIRCUMFERENCE_M / (TILE_SIZE * Math.pow(2, atEquator));
  return (
    (metresPerPixel * Math.max(1, viewportHeight)) /
    (2 * EARTH_RADIUS_M * Math.tan(THREE_FOV_RAD / 2))
  );
}

/** A fly target's zoom (resolvePlaceFly's scale) as a MapLibre zoom. */
export const flyZoom = (
  zoom: number,
  viewportHeight: number,
  lat: number,
): number => altitudeToMapZoom(zoomToAltitude(zoom), viewportHeight, lat);

/**
 * US/Canada state outlines show from this zoom (about the three.js globe's
 * altitude 2.1 on a laptop screen). Hysteresis: the camera has to travel back
 * past STATES_LEAVE_ZOOM to hide them, so a fly that settles near the
 * threshold cannot flicker.
 */
export const STATES_MIN_ZOOM = 3;
export const STATES_LEAVE_ZOOM = 2.8;

export function statesInViewAt(zoom: number, wasInView: boolean): boolean {
  return wasInView ? zoom >= STATES_LEAVE_ZOOM : zoom >= STATES_MIN_ZOOM;
}

/**
 * How strongly the country colours tint the street basemap's land, by zoom:
 * as the three.js globe painted them from orbit, lighter among the streets
 * so parks, roads and buildings read through.
 */
export const COUNTRY_TINT: readonly (readonly [number, number])[] = [
  [0, 0.86],
  [5, 0.86],
  [9, 0.62],
  [14, 0.45],
];

/**
 * Countries and states answer clicks below this zoom. Further in, a click
 * among the streets should not open the country it lands in.
 */
export const REGION_CLICK_MAX_ZOOM = 6;

/* ── Geometry ────────────────────────────────────────────────────────────── */

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Great-circle distance in km. */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return (2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))) / 1000;
}

/**
 * The great circle from `from` to `to`, as `segments + 1` points of
 * [lng, lat]. Longitudes run on continuously past ±180 (179, 181, …) instead
 * of jumping, so a line over the Pacific is drawn the short way.
 */
export function greatCircle(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  segments = 64,
): [number, number][] {
  const φ1 = toRad(from.lat);
  const λ1 = toRad(from.lng);
  const φ2 = toRad(to.lat);
  const λ2 = toRad(to.lng);
  const d =
    2 *
    Math.asin(
      Math.min(
        1,
        Math.sqrt(
          Math.sin((φ2 - φ1) / 2) ** 2 +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2,
        ),
      ),
    );
  if (d < 1e-9) {
    return [
      [from.lng, from.lat],
      [to.lng, to.lat],
    ];
  }
  const points: [number, number][] = [];
  let prevLng: number | null = null;
  for (let i = 0; i <= segments; i++) {
    const f = i / segments;
    const a = Math.sin((1 - f) * d) / Math.sin(d);
    const b = Math.sin(f * d) / Math.sin(d);
    const x = a * Math.cos(φ1) * Math.cos(λ1) + b * Math.cos(φ2) * Math.cos(λ2);
    const y = a * Math.cos(φ1) * Math.sin(λ1) + b * Math.cos(φ2) * Math.sin(λ2);
    const z = a * Math.sin(φ1) + b * Math.sin(φ2);
    const lat = toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)));
    let lng = toDeg(Math.atan2(y, x));
    if (prevLng !== null) {
      while (lng - prevLng > 180) lng -= 360;
      while (lng - prevLng < -180) lng += 360;
    }
    prevLng = lng;
    points.push([lng, lat]);
  }
  return points;
}

/* ── Colours ─────────────────────────────────────────────────────────────── */

/** `#rrggbbaa` (the arcs' translucent ends) as `rgba()`; anything else as is. */
export function cssColor(color: string): string {
  const hex = /^#([0-9a-f]{6})([0-9a-f]{2})$/i.exec(color);
  if (!hex) return color;
  const n = parseInt(hex[1], 16);
  const alpha = +(parseInt(hex[2], 16) / 255).toFixed(3);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/* ── Sources ─────────────────────────────────────────────────────────────── */

/** Properties of a country or state outline, as the map's sources hold them. */
export interface RegionProps {
  /** 'country' or 'state' (the US/Canada admin-1 outlines). */
  _layer: 'country' | 'state';
  NAME?: string;
  name?: string;
  ISO_A3?: string;
  iso_a3?: string;
  iso_a2?: string;
  /** The fill colour (regionColor). */
  color: string;
  /** The whole outline's centroid; a clicked feature is clipped to a tile. */
  clat: number | null;
  clng: number | null;
}

/**
 * Countries or states as a source: numbered features (feature-state needs an
 * id) carrying their fill colour and their centroid, worked out here from the
 * whole outline because a clicked feature is only the part in one tile.
 */
export function regionCollection(
  features: readonly Feature[],
  layer: RegionProps['_layer'],
  countryColors: boolean,
): FeatureCollection<Feature['geometry'], RegionProps> {
  return {
    type: 'FeatureCollection',
    features: features.map((feat, id) => {
      const p = feat.properties ?? {};
      const tagged = { properties: { ...p, _layer: layer } };
      const centroid = getCentroid(feat);
      return {
        type: 'Feature',
        id,
        geometry: feat.geometry,
        properties: {
          _layer: layer,
          NAME: p.NAME,
          name: p.name,
          ISO_A3: p.ISO_A3,
          iso_a3: p.iso_a3,
          iso_a2: p.iso_a2,
          color: regionColor(tagged, countryColors),
          clat: centroid?.lat ?? null,
          clng: centroid?.lng ?? null,
        },
      };
    }),
  };
}

export interface CityProps {
  /** The city a click opens. */
  cityId: string;
  /** The city's name: its label from zoom 6, and its hover label. */
  name: string;
  /** Its dot: a shade of its country's colour, or white when highlighted. */
  color: string;
  highlight: boolean;
}

/**
 * Each city as a point: a dot at every zoom, white and on top when it is
 * selected or holds the pinned event.
 */
export function cityPointCollection(
  points: readonly CityPoint[],
  selectedCityId: string | null,
  pinnedCityName: string | null,
): FeatureCollection<Point, CityProps> {
  return {
    type: 'FeatureCollection',
    features: points.map((point) => {
      const highlight = isCityHighlighted(
        [point],
        selectedCityId,
        pinnedCityName,
      );
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [point.lng, point.lat] },
        properties: {
          cityId: point.id,
          name: point.name,
          color: cityColumnColors(point.color, highlight).top,
          highlight,
        },
      };
    }),
  };
}

export interface ArtistPointProps {
  eventId: string;
  name: string;
  color: string;
}

export function artistPointCollection(
  points: readonly ArtistPoint[],
): FeatureCollection<Point, ArtistPointProps> {
  return {
    type: 'FeatureCollection',
    features: points.map((p) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: { eventId: p.eventId, name: p.name, color: p.color },
    })),
  };
}

export interface ArcProps {
  eventId: string;
  label: string;
  direction: ArcDatum['direction'];
  /** The arc's colour at its head (the dashes) and its tail (the trace). */
  head: string;
  tail: string;
}

/** Influence arcs as great circles on the surface, head to tail. */
export function arcCollection(
  arcs: readonly ArcDatum[],
): FeatureCollection<LineString, ArcProps> {
  return {
    type: 'FeatureCollection',
    features: arcs.map((arc) => {
      const [head, tail] = arcColors(arc);
      return {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: greatCircle(
            { lat: arc.startLat, lng: arc.startLng },
            { lat: arc.endLat, lng: arc.endLng },
          ),
        },
        properties: {
          eventId: arc.eventId,
          label: arc.label,
          direction: arc.direction,
          head: cssColor(head),
          tail: cssColor(tail),
        },
      };
    }),
  };
}

/**
 * The steps of the arcs' dash animation: line-dasharray patterns that walk a
 * dash along the line, one per tick (MapLibre's "animate a line" example).
 */
export const ARC_DASH_STEPS: readonly (readonly number[])[] = [
  [0, 4, 3],
  [0.5, 4, 2.5],
  [1, 4, 2],
  [1.5, 4, 1.5],
  [2, 4, 1],
  [2.5, 4, 0.5],
  [3, 4, 0],
  [0, 0.5, 3, 3.5],
  [0, 1, 3, 3],
  [0, 1.5, 3, 2.5],
  [0, 2, 3, 2],
  [0, 2.5, 3, 1.5],
  [0, 3, 3, 1],
  [0, 3.5, 3, 0.5],
];
