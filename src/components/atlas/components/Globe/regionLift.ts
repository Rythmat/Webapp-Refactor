import type {
  Feature,
  FeatureCollection,
  Geometry,
  LineString,
  MultiPolygon,
  Position,
} from 'geojson';
import { CITY_COUNTRY_TO_ISO } from '@/components/atlas/data';
import { getCityById } from '@/components/atlas/data/lookups';
import { ERA_HEX, type EraId } from '@/components/atlas/data/musicalEras';
import type { SelectedLocation } from '@/components/atlas/types';

/**
 * The selected region lifted off the map, after the DHCS map reference (owner,
 * 2026-10-30), as pure functions: the place that lifts, the region cut into
 * strips (a MapLibre fill has one colour per feature, so strips make the
 * gradient), and the gradient of its events' eras. liftLayers.ts draws them;
 * useRegionLift.ts feeds them.
 */

type Bounds = [[number, number], [number, number]];

/** Enough strips that no step shows across a country (48, tried on Brazil). */
export const STRIPS = 48;
/**
 * Neighbouring strips overlap by this share of a strip, so no seam shows where
 * tiles round their edges. A later strip simply covers it.
 */
const OVERLAP = 0.25;

/* ── Which place ─────────────────────────────────────────────────────────── */

/**
 * The region a selection lifts: a country or a state itself; a city's state in
 * the US and Canada, else its country.
 */
export function liftPlaceOf(
  selected: SelectedLocation | null,
): Exclude<SelectedLocation, { type: 'city' }> | null {
  if (!selected) return null;
  if (selected.type !== 'city') return selected;
  const city = getCityById(selected.id);
  if (!city) return null;
  if (city.subdivision && (city.country === 'US' || city.country === 'CA')) {
    return {
      type: 'state',
      name: city.subdivision,
      country: city.country === 'CA' ? 'Canada' : 'United States',
    };
  }
  return {
    type: 'country',
    name: city.country,
    iso: CITY_COUNTRY_TO_ISO[city.country] ?? '',
  };
}

/* ── The strips ──────────────────────────────────────────────────────────── */

export interface StripProps {
  /** Which strip, from 0: its feature id. */
  i: number;
  /** Its place along the gradient, 0–1: left to right, or top to bottom. */
  t: number;
}

export interface LiftShape {
  /** One MultiPolygon per strip, id = `i`. */
  strips: FeatureCollection<MultiPolygon, StripProps>;
  /** Each ring as a line, for the edge's gradient. */
  outline: FeatureCollection<LineString>;
}

/** Each polygon's rings; those over the antimeridian moved east of 180°. */
function polygonsOf(geometry: Geometry): Position[][][] {
  const polygons =
    geometry.type === 'Polygon'
      ? [geometry.coordinates]
      : geometry.type === 'MultiPolygon'
        ? geometry.coordinates
        : [];
  const lngs = polygons.flat(2).map((p) => p[0]);
  if (Math.max(...lngs) - Math.min(...lngs) < 300) return polygons;
  return polygons.map((rings) =>
    rings[0].every((p) => p[0] < 0)
      ? rings.map((ring) => ring.map((p) => [p[0] + 360, p[1]]))
      : rings,
  );
}

/**
 * A ring cut to `lo`–`hi` along an axis (Sutherland-Hodgman). A concave ring
 * can leave edges running along the cut, which enclose nothing and don't show.
 * Null when too little is left.
 */
export function clipRing(
  ring: readonly Position[],
  axis: 0 | 1,
  lo: number,
  hi: number,
): Position[] | null {
  const open = ring.slice(0, -1);
  const cut = (
    points: readonly Position[],
    inside: (p: Position) => boolean,
    edge: number,
  ) => {
    const out: Position[] = [];
    points.forEach((a, k) => {
      const b = points[(k + 1) % points.length];
      if (inside(a)) out.push(a);
      if (inside(a) !== inside(b)) {
        const f = (edge - a[axis]) / (b[axis] - a[axis]);
        const at: Position = [
          a[0] + (b[0] - a[0]) * f,
          a[1] + (b[1] - a[1]) * f,
        ];
        at[axis] = edge;
        out.push(at);
      }
    });
    return out;
  };
  const low = cut(open, (p) => p[axis] >= lo, lo);
  const both = cut(low, (p) => p[axis] <= hi, hi);
  return both.length >= 3 ? [...both, both[0]] : null;
}

/**
 * The region as strips across its longer side, within `bounds` (the part the
 * camera frames, so Alaska doesn't squash the United States); what lies beyond
 * joins the end strips. Holes stay holes (Lesotho in South Africa).
 */
export function sliceRegion(
  geometry: Geometry,
  bounds: Bounds,
  count = STRIPS,
): LiftShape {
  const polygons = polygonsOf(geometry);
  const [[west, south], [east, north]] = bounds;
  const wide =
    (east - west) * Math.cos((((south + north) / 2) * Math.PI) / 180);
  const axis: 0 | 1 = wide >= north - south ? 0 : 1;
  const from = bounds[0][axis];
  const span = bounds[1][axis] - from;

  const strips: Feature<MultiPolygon, StripProps>[] = [];
  for (let i = 0; i < count; i++) {
    const lo = i === 0 ? -Infinity : from + (span * i) / count;
    const hi =
      i === count - 1 ? Infinity : from + (span * (i + 1 + OVERLAP)) / count;
    const coordinates: Position[][][] = [];
    for (const [outer, ...holes] of polygons) {
      const shell = clipRing(outer, axis, lo, hi);
      if (!shell) continue;
      const kept = holes
        .map((hole) => clipRing(hole, axis, lo, hi))
        .filter((hole): hole is Position[] => !!hole);
      coordinates.push([shell, ...kept]);
    }
    if (coordinates.length === 0) continue;
    strips.push({
      type: 'Feature',
      id: i,
      // Read as a page is: oldest at the left, or at the top.
      properties: {
        i,
        t: axis === 0 ? (i + 0.5) / count : 1 - (i + 0.5) / count,
      },
      geometry: { type: 'MultiPolygon', coordinates },
    });
  }
  return {
    strips: { type: 'FeatureCollection', features: strips },
    outline: {
      type: 'FeatureCollection',
      features: polygons.flat().map((ring) => ({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: ring },
      })),
    },
  };
}

/* ── The gradient ────────────────────────────────────────────────────────── */

type Rgb = readonly [number, number, number];

export interface RampStop {
  t: number;
  rgb: Rgb;
}

const rgbOf = (hex: string): Rgb => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (a: Rgb, b: Rgb, f: number): Rgb => [
  a[0] + (b[0] - a[0]) * f,
  a[1] + (b[1] - a[1]) * f,
  a[2] + (b[2] - a[2]) * f,
];
const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];
export const cssRgb = ([r, g, b]: Rgb): string =>
  `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;

/**
 * The region's colours along its strips: its eras oldest to newest, each as
 * wide as its share of the events, blending at their middles. One era runs
 * dark to light, so the lid is never flat. No events: null.
 */
export function eraRamp(
  eras: readonly { id: EraId; count: number }[],
): RampStop[] | null {
  const total = eras.reduce((n, e) => n + e.count, 0);
  if (total === 0) return null;
  if (eras.length === 1) {
    const rgb = rgbOf(ERA_HEX[eras[0].id]);
    return [
      { t: 0, rgb: mix(rgb, BLACK, 0.35) },
      { t: 0.5, rgb },
      { t: 1, rgb: mix(rgb, WHITE, 0.25) },
    ];
  }
  let run = 0;
  const stops = eras.map((e) => {
    const t = (run + e.count / 2) / total;
    run += e.count;
    return { t, rgb: rgbOf(ERA_HEX[e.id]) };
  });
  return [
    { t: 0, rgb: stops[0].rgb },
    ...stops,
    { t: 1, rgb: stops[stops.length - 1].rgb },
  ];
}

/** The ramp's colour at `t` (0–1). */
export function rampAt(ramp: readonly RampStop[], t: number): Rgb {
  for (let k = 1; k < ramp.length; k++) {
    if (t <= ramp[k].t) {
      const a = ramp[k - 1];
      const b = ramp[k];
      return b.t === a.t ? b.rgb : mix(a.rgb, b.rgb, (t - a.t) / (b.t - a.t));
    }
  }
  return ramp[ramp.length - 1].rgb;
}

/** The busiest era's colour: the edge's glow. */
export function busiestColor(
  eras: readonly { id: EraId; count: number }[],
): string | null {
  if (eras.length === 0) return null;
  const top = eras.reduce((a, b) => (b.count > a.count ? b : a));
  return ERA_HEX[top.id];
}

const SAMPLES = 40;
/** The comet's half-length, as a share of the outline. */
const COMET = 0.07;

/**
 * The edge as a `line-gradient`: the region's eras brightened, with a white
 * comet at `head` (0–1) that wraps round the ring. No head: the still edge.
 * Rewriting this each step costs about 0.2 ms and lays nothing out again.
 */
export function edgeGradient(
  ramp: readonly RampStop[] | null,
  head: number | null,
): unknown[] {
  const stops: unknown[] = ['interpolate', ['linear'], ['line-progress']];
  for (let k = 0; k <= SAMPLES; k++) {
    const t = k / SAMPLES;
    const base = ramp ? mix(rampAt(ramp, t), WHITE, 0.45) : WHITE;
    let glow = 0;
    if (head !== null) {
      const d = Math.abs(t - head);
      glow = Math.max(0, 1 - Math.min(d, 1 - d) / COMET);
    }
    stops.push(t, cssRgb(mix(base, WHITE, glow)));
  }
  return stops;
}
