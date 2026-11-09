// ── Isometric drawing ──────────────────────────────────────────────────────
// A guitar lying flat, in inches: u runs along it from the butt of the body to
// the tip of the headstock, v across it (negative on the bass side), z up. The
// projection sends u to the upper right, v to the lower right and z straight
// up. It is linear, so moving a part in 3D is one 2D translate of its drawing:
// the geometry is compiled once and only transforms animate.
//
// A solid is an outline (and holes) extruded from z0 to z1. What the viewer
// sees of it is its top face and the walls that face them, the walls hatched
// on the diagonal.

export type V2 = readonly [number, number];
export type V3 = readonly [number, number, number];

const COS_30 = Math.cos(Math.PI / 6);
const SIN_30 = 0.5;

/** Where a point of the guitar lands on the page. */
export const project = (u: number, v: number, z: number): V2 => [
  (u + v) * COS_30,
  (v - u) * SIN_30 - z,
];

/** A move in the guitar's space, as a move on the page. */
export const projectOffset = (offset: V3): V2 =>
  project(offset[0], offset[1], offset[2]);

// ── Outlines ───────────────────────────────────────────────────────────────

const STEPS_PER_CURVE = 14;

/** Samples a path of absolute M, L, C and Z commands to a polyline (u v
 *  pairs); the closing point is not repeated. */
export function sampleOutline(d: string, steps = STEPS_PER_CURVE): V2[] {
  const tokens = d.trim().split(/[\s,]+/);
  const out: V2[] = [];
  let at = 0;
  const num = () => Number(tokens[at++]);
  let command = '';
  while (at < tokens.length) {
    if (/^[MLCZ]$/i.test(tokens[at])) command = tokens[at++].toUpperCase();
    if (command === 'Z') continue;
    if (command === 'M' || command === 'L') {
      const u = num();
      out.push([u, num()]);
    } else if (command === 'C') {
      const [u0, v0] = out[out.length - 1];
      const c1u = num();
      const c1v = num();
      const c2u = num();
      const c2v = num();
      const u1 = num();
      const v1 = num();
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const m = 1 - t;
        const a = m * m * m;
        const b = 3 * m * m * t;
        const c = 3 * m * t * t;
        const e = t * t * t;
        out.push([
          a * u0 + b * c1u + c * c2u + e * u1,
          a * v0 + b * c1v + c * c2v + e * v1,
        ]);
      }
    }
  }
  const first = out[0];
  const last = out[out.length - 1];
  if (first && last && first[0] === last[0] && first[1] === last[1]) out.pop();
  return out;
}

/** One side of a symmetric shape (from v = 0 to v = 0), with its other side. */
export const mirrorHalf = (half: readonly V2[]): V2[] => [
  ...half,
  ...half
    .slice(1, -1)
    .reverse()
    .map(([u, v]): V2 => [u, -v]),
];

export function circle(cu: number, cv: number, r: number, points = 20): V2[] {
  return Array.from({ length: points }, (_, i): V2 => {
    const a = (i / points) * Math.PI * 2;
    return [cu + Math.cos(a) * r, cv + Math.sin(a) * r];
  });
}

/** A three-lobed clover key, one lobe pointing away from the headstock on the
 *  bass side (−v). */
export function clover(cu: number, cv: number, r: number, points = 36): V2[] {
  return Array.from({ length: points }, (_, i): V2 => {
    const a = (i / points) * Math.PI * 2;
    const reach = r * (0.74 + 0.26 * Math.cos(3 * (a + Math.PI / 2)));
    return [cu + Math.cos(a) * reach, cv + Math.sin(a) * reach];
  });
}

/** A circle drawn on a surface (a closed line, for a part's marks). */
export function ringMarks(
  cu: number,
  cv: number,
  r: number,
  z: number,
  points = 20,
): V3[] {
  const ring = circle(cu, cv, r, points);
  return [...ring, ring[0]].map(([u, v]): V3 => [u, v, z]);
}

/** A rectangle with round corners, centred on (cu, cv); `turn` in radians. */
export function roundedRect(
  cu: number,
  cv: number,
  halfU: number,
  halfV: number,
  radius = 0,
  turn = 0,
): V2[] {
  const r = Math.min(radius, halfU, halfV);
  const corners: [number, number, number][] = [
    [halfU - r, halfV - r, 0],
    [-halfU + r, halfV - r, Math.PI / 2],
    [-halfU + r, -halfV + r, Math.PI],
    [halfU - r, -halfV + r, (3 * Math.PI) / 2],
  ];
  const points: V2[] = [];
  for (const [u, v, start] of corners) {
    const arc = r > 0 ? 5 : 0;
    for (let i = 0; i <= arc; i++) {
      const a = start + (arc ? (i / arc) * (Math.PI / 2) : 0);
      points.push([u + Math.cos(a) * r, v + Math.sin(a) * r]);
    }
  }
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  return points.map(
    ([u, v]): V2 => [cu + u * cos - v * sin, cv + u * sin + v * cos],
  );
}

/** A straight bar of width `width` from a to b. */
export function strip(a: V2, b: V2, width: number): V2[] {
  const du = b[0] - a[0];
  const dv = b[1] - a[1];
  const length = Math.hypot(du, dv) || 1;
  const nu = (-dv / length) * (width / 2);
  const nv = (du / length) * (width / 2);
  return [
    [a[0] + nu, a[1] + nv],
    [b[0] + nu, b[1] + nv],
    [b[0] - nu, b[1] - nv],
    [a[0] - nu, a[1] - nv],
  ];
}

/** A curved bar, as a closed outline around a path. */
export function curvedBar(path: readonly V2[], width: number): V2[] {
  const left: V2[] = [];
  const right: V2[] = [];
  path.forEach((p, i) => {
    const a = path[Math.max(i - 1, 0)];
    const b = path[Math.min(i + 1, path.length - 1)];
    const du = b[0] - a[0];
    const dv = b[1] - a[1];
    const length = Math.hypot(du, dv) || 1;
    const nu = (-dv / length) * (width / 2);
    const nv = (du / length) * (width / 2);
    left.push([p[0] + nu, p[1] + nv]);
    right.push([p[0] - nu, p[1] - nv]);
  });
  return [...left, ...right.reverse()];
}

/** Scales an outline about a point (an inset for a roughly round shape). */
export const scaleAbout = (
  points: readonly V2[],
  cu: number,
  cv: number,
  ku: number,
  kv = ku,
): V2[] => points.map(([u, v]): V2 => [cu + (u - cu) * ku, cv + (v - cv) * kv]);

/** Parallel lines clipped to an outline (minus its holes), for a surface's
 *  texture: a pickguard's stripes, a plate's grain. */
export function hatchInside(
  outer: readonly V2[],
  holes: readonly (readonly V2[])[],
  z: number,
  spacing: number,
  angle: number,
): V3[][] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const toLocal = ([u, v]: V2): V2 => [u * cos + v * sin, -u * sin + v * cos];
  const rings = [outer, ...holes].map((ring) => ring.map(toLocal));
  const ys = rings.flat().map(([, y]) => y);
  const lines: V3[][] = [];
  const top = Math.max(...ys);
  for (let y = Math.min(...ys) + spacing / 2; y < top; y += spacing) {
    const xs: number[] = [];
    for (const ring of rings) {
      ring.forEach((a, i) => {
        const b = ring[(i + 1) % ring.length];
        if (a[1] <= y === b[1] <= y) return;
        xs.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      });
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const line = [xs[i], xs[i + 1]].map(
        (x): V3 => [x * cos - y * sin, x * sin + y * cos, z],
      );
      lines.push(line);
    }
  }
  return lines;
}

// ── Solids ─────────────────────────────────────────────────────────────────

/** A plate turned about a line running along the instrument: positive lifts
 *  the +v side, as a grand's lid opens toward the audience. */
export interface Tilt {
  axisV: number;
  axisZ: number;
  /** Radians. */
  angle: number;
}

/** A round part: a profile spun about a line, in any direction. Sections run
 *  along the line from the end away from the viewer to the end facing them. */
export interface Lathe {
  origin: V3;
  axis: V3;
  /** [distance along the line, radius], in order; 'seam' draws its ring. */
  profile: readonly (readonly [number, number, 'seam'?])[];
  /** An open middle, such as an ear pad's. */
  bore?: number;
  /** Lines around the surface: one way (a knurled grip) or both (wire mesh). */
  texture?: 'helix' | 'mesh';
  strands?: number;
  /** The stretch of the line the texture covers; else all of it. */
  from?: number;
  to?: number;
}

export interface Solid {
  /** Instead of an extruded outline: a round part. */
  lathe?: Lathe;
  /** Instead of an extruded outline: one flat face, anywhere in space. */
  face?: readonly V3[];
  outer: readonly V2[];
  holes?: readonly (readonly V2[])[];
  /** Its extent along what it is extruded along: up in z, or for a 'front'
   *  plate along u, with z0 the face toward the viewer. */
  z0: number;
  z1: number;
  /** 'front' draws the outline upright, as (v, z), and extrudes it along u: a
   *  panel with its windows, rather than a footprint standing on the floor.
   *  'side' draws it as (u, z) and extrudes it along v, with z1 the face toward
   *  the viewer: a wheel or an end cheek. */
  plane?: 'top' | 'front' | 'side';
  tilt?: Tilt;
  /** Hatch its walls (the default); a thin plate's walls stay plain. */
  hatch?: boolean;
  /** Space between its hatch lines, for a wall too large for the usual. */
  hatchGap?: number;
}

export interface CompiledDrawing {
  /** The outer edge of a round part, stroked under its fill so only the outside
   *  of the line shows: a curved solid's silhouette, without working it out. */
  outline: string;
  /** Top faces and walls, opaque: what hides the parts behind. */
  fill: string;
  /** Every edge. */
  ink: string;
  /** The walls' diagonal lines. */
  hatch: string;
  /** Lines on the surfaces. */
  marks: string;
  /** Every corner, on the page: for bounds and the camera. */
  points: V2[];
}

const HATCH_SPACING = 0.3;
const HATCH_SKEW = 0.34;
/** Walls thinner than this read as an edge, not a surface. */
const MIN_HATCH_WALL = 0.3;

const fmt = (n: number) => {
  const rounded = Math.round(n * 100) / 100;
  return Object.is(rounded, -0) ? '0' : String(rounded);
};

const polyline = (points: readonly V2[], close = false) =>
  points.length < 2
    ? ''
    : `M${points.map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join('L')}${close ? 'Z' : ''}`;

const signedArea = (points: readonly V2[]) => {
  let area = 0;
  points.forEach(([x0, y0], i) => {
    const [x1, y1] = points[(i + 1) % points.length];
    area += x0 * y1 - x1 * y0;
  });
  return area / 2;
};

/** Makes a ring wind the given way (+1 / −1), so a nonzero fill unions faces
 *  and cuts holes. */
const wound = (points: readonly V2[], sign: 1 | -1): V2[] =>
  signedArea(points) * sign >= 0 ? [...points] : [...points].reverse();

/** Does a wall along a→b (material on its left, a ring wound positively in
 *  u, v) face the viewer, who looks from −u, +v, +z? */
export const faceViewer = (a: V2, b: V2): boolean =>
  b[0] - a[0] + (b[1] - a[1]) < 0;

/** The same for a 'front' plate's ring, wound positively in v, z. */
const faceViewerFront = (a: V2, b: V2): boolean =>
  b[1] - a[1] - (b[0] - a[0]) > 0;

/** A strip along a ring: the outer path, then the inner one back. The two are
 *  sampled from paths with the same commands, so their points pair up. */
export function ringBand(
  outer: readonly V2[],
  inner: readonly V2[],
  from: number,
  to: number,
): V2[] {
  return [...outer.slice(from, to), ...inner.slice(from, to).reverse()];
}

/** The runs of consecutive edges of a ring whose walls face the viewer. */
function visibleRuns(
  ring: readonly V2[],
  faces_: (a: V2, b: V2) => boolean = faceViewer,
): V2[][] {
  const n = ring.length;
  const faces = ring.map((a, i) => faces_(a, ring[(i + 1) % n]));
  if (faces.every(Boolean)) return [[...ring, ring[0]]];
  if (!faces.some(Boolean)) return [];
  const start = faces.findIndex((f, i) => !f && faces[(i + 1) % n]);
  const runs: V2[][] = [];
  let run: V2[] | null = null;
  for (let i = 1; i <= n; i++) {
    const edge = (start + i) % n;
    if (faces[edge]) {
      run ??= [ring[edge]];
      run.push(ring[(edge + 1) % n]);
    } else if (run) {
      runs.push(run);
      run = null;
    }
  }
  if (run) runs.push(run);
  return runs;
}

/** Point at a distance along a polyline. */
function along(run: readonly V2[], lengths: readonly number[], s: number): V2 {
  const clamped = Math.min(s, lengths[lengths.length - 1]);
  let i = 1;
  while (i < lengths.length - 1 && lengths[i] < clamped) i++;
  const span = lengths[i] - lengths[i - 1] || 1;
  const t = (clamped - lengths[i - 1]) / span;
  const [u0, v0] = run[i - 1];
  const [u1, v1] = run[i];
  return [u0 + (u1 - u0) * t, v0 + (v1 - v0) * t];
}

/** A round part, from a profile and a line. */
export const lathe = (spec: Lathe): Solid => ({
  lathe: spec,
  outer: [],
  z0: 0,
  z1: 0,
});

/** One flat face, anywhere in space. */
export const polyFace = (face: readonly V3[]): Solid => ({
  face,
  outer: [],
  z0: 0,
  z1: 0,
});

const VIEW_DIRECTION: V3 = [-1, 1, 1];
const RING_POINTS = 36;

const unit = (a: V3): V3 => {
  const length = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / length, a[1] / length, a[2] / length];
};

/** The outside of a set of points on the page. */
function convexHull(points: readonly V2[]): V2[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const turn = (o: V2, a: V2, b: V2) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list: readonly V2[]) => {
    const out: V2[] = [];
    for (const p of list) {
      while (
        out.length >= 2 &&
        turn(out[out.length - 2], out[out.length - 1], p) <= 0
      ) {
        out.pop();
      }
      out.push(p);
    }
    out.pop();
    return out;
  };
  return [...half(sorted), ...half([...sorted].reverse())];
}

function compileLathe(spec: Lathe) {
  const axis = unit(spec.axis);
  const view = unit(VIEW_DIRECTION);
  const dot = axis[0] * view[0] + axis[1] * view[1] + axis[2] * view[2];
  // Around the line: `side` runs across the view, so angles 0 and π are the
  // part's silhouette; `toward` faces the viewer, so 0 to π is its near half.
  const side = unit([
    axis[1] * view[2] - axis[2] * view[1],
    axis[2] * view[0] - axis[0] * view[2],
    axis[0] * view[1] - axis[1] * view[0],
  ]);
  const toward = unit([
    view[0] - axis[0] * dot,
    view[1] - axis[1] * dot,
    view[2] - axis[2] * dot,
  ]);
  const at = (t: number, r: number, angle: number): V2 => {
    const c = Math.cos(angle) * r;
    const s = Math.sin(angle) * r;
    return project(
      spec.origin[0] + axis[0] * t + side[0] * c + toward[0] * s,
      spec.origin[1] + axis[1] * t + side[1] * c + toward[1] * s,
      spec.origin[2] + axis[2] * t + side[2] * c + toward[2] * s,
    );
  };
  const ring = (t: number, r: number) =>
    Array.from({ length: RING_POINTS }, (_, i) =>
      at(t, r, (i / RING_POINTS) * Math.PI * 2),
    );
  const nearArc = (t: number, r: number) =>
    Array.from({ length: RING_POINTS / 2 + 1 }, (_, i) =>
      at(t, r, (i / (RING_POINTS / 2)) * Math.PI),
    );

  const { profile, bore } = spec;
  // The end toward the viewer is the last one if the line points at them.
  const nearEnd = dot >= 0 ? profile[profile.length - 1] : profile[0];
  const farEnd = dot >= 0 ? profile[0] : profile[profile.length - 1];

  let fill = '';
  let outline = '';
  let ink = '';
  let hatch = '';
  let marks = '';
  const points: V2[] = [];

  for (let i = 0; i + 1 < profile.length; i++) {
    const [t0, r0] = profile[i];
    const [t1, r1] = profile[i + 1];
    if (bore) {
      const wall = [...nearArc(t0, r0), ...nearArc(t1, r1).reverse()];
      const shape = polyline(wound(wall, 1), true);
      fill += shape;
      outline += shape;
    } else {
      const shape = polyline(
        wound(convexHull([...ring(t0, r0), ...ring(t1, r1)]), 1),
        true,
      );
      fill += shape;
      outline += shape;
    }
    points.push(...ring(t0, r0), ...ring(t1, r1));
  }

  const cap = ring(nearEnd[0], nearEnd[1]);
  if (bore) {
    const hole = ring(nearEnd[0], bore);
    const capShape = polyline(wound(cap, 1), true);
    fill += capShape + polyline(wound(hole, -1), true);
    outline += capShape;
    ink += polyline(hole, true);
    // Through the hole, the inside of its far wall.
    const inside = Array.from({ length: RING_POINTS / 2 + 1 }, (_, i) => {
      const a = Math.PI + (i / (RING_POINTS / 2)) * Math.PI;
      return [at(nearEnd[0], bore, a), at(farEnd[0], bore, a)] as const;
    });
    fill += polyline(
      wound(
        [...inside.map(([a]) => a), ...[...inside].reverse().map(([, b]) => b)],
        1,
      ),
      true,
    );
  }
  if (nearEnd[1] > 0.01) ink += polyline(cap, true);
  for (const [t, r, seam] of profile) {
    if (seam) ink += polyline(nearArc(t, r));
  }

  if (spec.texture) {
    const ts = profile.map(([t]) => t);
    const from = spec.from ?? Math.min(...ts);
    const to = spec.to ?? Math.max(...ts);
    const radiusAt = (t: number) => {
      for (let i = 0; i + 1 < profile.length; i++) {
        const [a, ra] = profile[i];
        const [b, rb] = profile[i + 1];
        if (t >= Math.min(a, b) && t <= Math.max(a, b)) {
          return ra + ((t - a) / (b - a || 1)) * (rb - ra);
        }
      }
      return 0;
    };
    const widest = Math.max(...profile.map(([, r]) => r));
    const twist = ((to - from) / widest) * 0.9;
    const strands = spec.strands ?? 24;
    const STEPS = 18;
    const line = (start: number, direction: 1 | -1) => {
      let path = '';
      let run: V2[] = [];
      for (let i = 0; i <= STEPS; i++) {
        const k = i / STEPS;
        const angle = start + direction * twist * k;
        // Only where it faces the viewer.
        if (Math.sin(angle) > 0.02) {
          run.push(
            at(from + (to - from) * k, radiusAt(from + (to - from) * k), angle),
          );
        } else {
          path += polyline(run);
          run = [];
        }
      }
      return path + polyline(run);
    };
    for (let i = 0; i < strands; i++) {
      const start = (i / strands) * Math.PI * 2;
      if (spec.texture === 'mesh') {
        marks += line(start, 1) + line(start, -1);
      } else {
        hatch += line(start, 1);
      }
    }
  }

  return { outline, fill, ink, hatch, marks, points };
}

export function compileDrawing(
  solids: readonly Solid[],
  marks: readonly (readonly V3[])[] = [],
): CompiledDrawing {
  let outline = '';
  let fill = '';
  let ink = '';
  let hatch = '';
  let lineMarks = '';
  const points: V2[] = [];

  for (const solid of solids) {
    if (solid.lathe) {
      const round = compileLathe(solid.lathe);
      outline += round.outline;
      fill += round.fill;
      ink += round.ink;
      hatch += round.hatch;
      lineMarks += round.marks;
      points.push(...round.points);
      continue;
    }
    if (solid.face) {
      const page = solid.face.map(([u, v, z]) => project(u, v, z));
      fill += polyline(wound(page, 1), true);
      ink += polyline(page, true);
      points.push(...page);
      continue;
    }
    const { z0, z1, tilt } = solid;
    const front = solid.plane === 'front';
    const side = solid.plane === 'side';
    const place = (u: number, v: number, z: number): V2 => {
      if (!tilt) return project(u, v, z);
      const dv = v - tilt.axisV;
      const dz = z - tilt.axisZ;
      const cos = Math.cos(tilt.angle);
      const sin = Math.sin(tilt.angle);
      return project(
        u,
        tilt.axisV + dv * cos - dz * sin,
        tilt.axisZ + dv * sin + dz * cos,
      );
    };
    const top = (p: V2) => {
      if (front) return place(z0, p[0], p[1]);
      return side ? place(p[0], z1, p[1]) : place(p[0], p[1], z1);
    };
    const bottom = (p: V2) => {
      if (front) return place(z1, p[0], p[1]);
      return side ? place(p[0], z0, p[1]) : place(p[0], p[1], z0);
    };
    const gap = solid.hatchGap ?? HATCH_SPACING;

    // Material on the left of every edge: outer ring counter-clockwise in
    // u, v, holes clockwise. So a hole's far wall faces the viewer too.
    const rings = [
      wound(solid.outer, 1),
      ...(solid.holes ?? []).map((hole) => wound(hole, -1)),
    ];

    for (const ring of rings) {
      for (const run of visibleRuns(
        ring,
        front ? faceViewerFront : faceViewer,
      )) {
        const wall = [...run.map(top), ...[...run].reverse().map(bottom)];
        fill += polyline(wound(wall, 1), true);
        ink += polyline(run.map(bottom));
        ink += polyline([top(run[0]), bottom(run[0])]);
        const last = run[run.length - 1];
        ink += polyline([top(last), bottom(last)]);
        points.push(...run.map(bottom));

        if (solid.hatch === false || Math.abs(z1 - z0) < MIN_HATCH_WALL)
          continue;
        const lengths = [0];
        run.forEach((p, i) => {
          if (i === 0) return;
          const q = run[i - 1];
          lengths.push(lengths[i - 1] + Math.hypot(p[0] - q[0], p[1] - q[1]));
        });
        const total = lengths[lengths.length - 1];
        for (let s = gap; s < total; s += gap) {
          hatch += polyline([
            top(along(run, lengths, s)),
            bottom(along(run, lengths, Math.max(0, s - HATCH_SKEW))),
          ]);
        }
      }
    }

    rings.forEach((ring, i) => {
      const face = ring.map(top);
      fill += polyline(wound(face, i === 0 ? 1 : -1), true);
      ink += polyline(face, true);
      points.push(...face);
    });
  }

  let marksPath = lineMarks;
  for (const line of marks) {
    const page = line.map(([u, v, z]) => project(u, v, z));
    marksPath += polyline(page);
    points.push(...page);
  }

  return { outline, fill, ink, hatch, marks: marksPath, points };
}
