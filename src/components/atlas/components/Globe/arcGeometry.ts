import type { Feature, LineString } from 'geojson';
import type { LinkProps, LinkSide } from './networkFeatures';

/**
 * The links as flight paths (owner, 2026-11-16, after a route globe): each
 * leaves the ground at one end, climbs to its height at the middle and comes
 * down at the other, as pure geometry for the WebGL arc layer (arcLayer.ts)
 * and its picking. Positions are web mercator (0–1) with an elevation in
 * metres, which MapLibre's `projectTileWithElevation` takes on the globe.
 */

/** A link's height at its middle: a share of its length, within bounds. */
export const ARC_RISE = { share: 0.22, minM: 25_000, maxM: 2_200_000 } as const;

const EARTH_R_M = 6_371_008.8;

/** Web mercator x, y (0–1) of a [lng, lat]. Longitudes may run past ±180. */
export function toMercator([lng, lat]: readonly number[]): [number, number] {
  const φ = (Math.max(-85.05, Math.min(85.05, lat)) * Math.PI) / 180;
  return [
    (lng + 180) / 360,
    (1 - Math.log(Math.tan(Math.PI / 4 + φ / 2)) / Math.PI) / 2,
  ];
}

/** Great-circle length of a path of [lng, lat], in metres. */
export function pathLengthM(coords: readonly (readonly number[])[]): number {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const [λ1, φ1] = coords[i - 1].map((v) => (v * Math.PI) / 180);
    const [λ2, φ2] = coords[i].map((v) => (v * Math.PI) / 180);
    const h =
      Math.sin((φ2 - φ1) / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2;
    total += 2 * EARTH_R_M * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  return total;
}

/** How high a link of `lengthM` climbs at its middle, in metres. */
export function arcHeight(lengthM: number): number {
  return Math.min(
    ARC_RISE.maxM,
    Math.max(ARC_RISE.minM, lengthM * ARC_RISE.share),
  );
}

/** Its height `t` (0–1) of the way along: up and back down, a half sine. */
export const elevationAt = (t: number, height: number) =>
  height * Math.sin(Math.PI * t);

/** One link as the arc layer draws it. */
export interface ArcLine {
  id: string;
  props: LinkProps;
  side: LinkSide;
  /** A weak tie: thinner, fainter, its dots flowing. */
  dotted: boolean;
  /** Each point: mercator x, y and elevation in metres. */
  points: [number, number, number][];
  /** When it starts drawing on, ms (drawOn.ts drawOnPlan). */
  delay: number;
  /** Where its comet starts (0–1), so they don't fly as one. */
  phase: number;
}

/** The lines of a stop's links as arcs, solid first, then the weak ties. */
export function arcLines(
  solid: readonly Feature<LineString, LinkProps>[],
  dotted: readonly Feature<LineString, LinkProps>[],
  delays: (lengths: readonly number[]) => number[],
): ArcLine[] {
  const all = [
    ...solid.map((f) => ({ f, dotted: false })),
    ...dotted.map((f) => ({ f, dotted: true })),
  ];
  const lengths = all.map(({ f }) => pathLengthM(f.geometry.coordinates));
  const plan = delays(lengths);
  return all.map(({ f, dotted: weak }, i) => {
    const coords = f.geometry.coordinates;
    const height = arcHeight(lengths[i]);
    return {
      id: f.properties.id,
      props: f.properties,
      side: f.properties.side,
      dotted: weak,
      points: coords.map((c, k) => {
        const [x, y] = toMercator(c);
        return [x, y, elevationAt(k / (coords.length - 1), height)];
      }),
      delay: plan[i] ?? 0,
      phase: (i * 0.618) % 1,
    };
  });
}

/* ── Vertex buffers ──────────────────────────────────────────────────────── */

/**
 * Floats per vertex: pos(3) prev(3) next(3) side(1) t(1) color(4) width(1)
 * meta(4: dotted, phase, delay, line index) fromEnd(1).
 */
export const ARC_STRIDE = 21;

/** An `rgb()`/`rgba()`/`#rrggbb` colour as 0–1 RGBA. */
export function parseColor(color: string): [number, number, number, number] {
  const hex = /^#([0-9a-f]{6})$/i.exec(color);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [
      ((n >> 16) & 255) / 255,
      ((n >> 8) & 255) / 255,
      (n & 255) / 255,
      1,
    ];
  }
  const rgb =
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(
      color,
    );
  if (rgb) {
    return [
      Number(rgb[1]) / 255,
      Number(rgb[2]) / 255,
      Number(rgb[3]) / 255,
      rgb[4] === undefined ? 1 : Number(rgb[4]),
    ];
  }
  return [1, 1, 1, 1];
}

/** A ramp's colour `t` (0–1) of the way along it. */
export function rampAt(
  ramp: readonly [number, number, number, number][],
  t: number,
): [number, number, number, number] {
  if (ramp.length === 1) return ramp[0];
  const x = Math.max(0, Math.min(1, t)) * (ramp.length - 1);
  const i = Math.min(ramp.length - 2, Math.floor(x));
  const f = x - i;
  const a = ramp[i];
  const b = ramp[i + 1];
  return [0, 1, 2, 3].map((k) => a[k] + (b[k] - a[k]) * f) as [
    number,
    number,
    number,
    number,
  ];
}

/**
 * The arcs as one strip of triangles each: two vertices per point, pushed
 * apart across the line on screen by the shader. A solid line takes its
 * side's ramp along its length; a weak tie, its own colour.
 */
export function arcBuffers(
  lines: readonly ArcLine[],
  ramps: Record<LinkSide, readonly [number, number, number, number][]>,
): { vertices: Float32Array; indices: Uint32Array } {
  const pointCount = lines.reduce((n, l) => n + l.points.length, 0);
  const vertices = new Float32Array(pointCount * 2 * ARC_STRIDE);
  const segs = lines.reduce((n, l) => n + Math.max(0, l.points.length - 1), 0);
  const indices = new Uint32Array(segs * 6);
  let v = 0;
  let ix = 0;
  let base = 0;
  lines.forEach((line, li) => {
    const pts = line.points;
    const n = pts.length;
    const flat = parseColor(line.props.color);
    for (let k = 0; k < n; k++) {
      const t = n > 1 ? k / (n - 1) : 0;
      const prev = pts[Math.max(0, k - 1)];
      const next = pts[Math.min(n - 1, k + 1)];
      const color = line.dotted ? flat : rampAt(ramps[line.side], t);
      for (const side of [-1, 1]) {
        vertices.set(
          [
            ...pts[k],
            ...prev,
            ...next,
            side,
            t,
            ...color,
            line.props.w,
            line.dotted ? 1 : 0,
            line.phase,
            line.delay,
            li,
            line.side === 'in' ? 1 : 0,
          ],
          v,
        );
        v += ARC_STRIDE;
      }
      if (k < n - 1) {
        const a = base + k * 2;
        indices.set([a, a + 1, a + 2, a + 1, a + 3, a + 2], ix);
        ix += 6;
      }
    }
    base += n * 2;
  });
  return { vertices, indices };
}

/* ── Picking ─────────────────────────────────────────────────────────────── */

/** What the shader projects with: MapLibre's custom-layer projection data. */
export interface ArcProjection {
  globe: boolean;
  mainMatrix: ArrayLike<number>;
  fallbackMatrix: ArrayLike<number>;
  clippingPlane: readonly number[];
  transition: number;
  /** The canvas, in CSS px. */
  width: number;
  height: number;
  /** The lifted region's lift, px: arcs rise with it. */
  lift: number;
}

const mul = (m: ArrayLike<number>, x: number, y: number, z: number) => [
  m[0] * x + m[4] * y + m[8] * z + m[12],
  m[1] * x + m[5] * y + m[9] * z + m[13],
  m[2] * x + m[6] * y + m[10] * z + m[14],
  m[3] * x + m[7] * y + m[11] * z + m[15],
];

/** A mercator point's place on the sphere MapLibre draws (unit radius). */
function toSphere(x: number, y: number): [number, number, number] {
  const sx = x * Math.PI * 2 + Math.PI;
  const t = Math.exp(Math.PI - y * Math.PI * 2);
  const t2 = t * t;
  const sinSy = (t2 - 1) / (t2 + 1);
  const cosSy = (2 * t) / (t2 + 1);
  return [Math.sin(sx) * cosSy, sinSy, Math.cos(sx) * cosSy];
}

/**
 * Where a point of an arc is on screen, in CSS px, as the shader puts it;
 * null when it is behind the globe.
 */
export function projectArcPoint(
  [x, y, elevation]: readonly number[],
  p: ArcProjection,
): { x: number; y: number } | null {
  let clip: number[];
  if (p.globe) {
    const s = toSphere(x, y);
    const k = 1 + elevation / EARTH_R_M;
    const e = [s[0] * k, s[1] * k, s[2] * k];
    const facing =
      e[0] * p.clippingPlane[0] +
      e[1] * p.clippingPlane[1] +
      e[2] * p.clippingPlane[2] +
      p.clippingPlane[3];
    if (p.transition > 0.999 && facing < 0) return null;
    clip = mul(p.mainMatrix, e[0], e[1], e[2]);
    if (p.transition <= 0.999) {
      const flat = mul(p.fallbackMatrix, x, y, elevation);
      clip = clip.map((c, i) => flat[i] + (c - flat[i]) * p.transition);
    }
  } else {
    clip = mul(p.mainMatrix, x, y, mercatorElevation(y, elevation));
  }
  if (clip[3] <= 0) return null;
  return {
    x: ((clip[0] / clip[3] + 1) / 2) * p.width,
    y: ((1 - clip[1] / clip[3]) / 2) * p.height - p.lift,
  };
}

/** Metres up as mercator units at mercator `y` (the flat projection's z). */
export function mercatorElevation(y: number, metres: number): number {
  const lat = 2 * Math.atan(Math.exp(Math.PI * (1 - 2 * y))) - Math.PI / 2;
  return metres / (2 * Math.PI * EARTH_R_M * Math.max(0.01, Math.cos(lat)));
}

function segmentDistance(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = dx * dx + dy * dy;
  const t =
    len === 0
      ? 0
      : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len));
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}

/** The arc under `point` (CSS px), nearest first; null when none is. */
export function pickArc(
  lines: readonly ArcLine[],
  point: { x: number; y: number },
  p: ArcProjection,
  slop = 6,
): ArcLine | null {
  let best: ArcLine | null = null;
  let bestDistance = Infinity;
  for (const line of lines) {
    let prev: { x: number; y: number } | null = null;
    const reach = slop + line.props.w / 2;
    for (const pt of line.points) {
      const s = projectArcPoint(pt, p);
      if (s && prev) {
        const d = segmentDistance(point, prev, s);
        if (d <= reach && d < bestDistance) {
          best = line;
          bestDistance = d;
        }
      }
      prev = s;
    }
  }
  return best;
}
