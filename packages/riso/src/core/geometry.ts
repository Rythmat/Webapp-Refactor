/**
 * Shape math: the craft kit's geometry with the canvas taken out.
 *
 * WHY THIS MODULE EXISTS. Upstream's `cut` and `nib` each compute a contour and then, in the same
 * loop, pour it into a `Path2D`. That single line of canvas is what would otherwise keep the
 * hardest geometry in the engine — a signed-area winding test, two wobble octaves, two smoothing
 * passes over a Float32Array, and a per-sample normal — untestable outside a browser. So the math
 * is lifted out whole: `cutPoints` and `ribbonRails` stop at the points, and the Path2D wrappers
 * (`cut`, `nib`) live in the canvas layer and do nothing but walk what these return. Everything
 * here is pure, import-safe in Node, and unit-testable against goldens before a pixel exists.
 *
 * `Pt` comes from ./pt.ts — one point type for the package, owned by neither consumer.
 *
 * TRAPS IN HERE, all of them about rng draw order, which IS the output:
 *  - `cutPoints` draws in a fixed sequence: `makeWob(rng, 4)` (8 draws) then `makeWob(rng, 9)`
 *    (18 draws) from the SAME generator, and only then the per-sample `rng() < tear` tests — each
 *    of which, when it fires, takes a second draw for the bite depth. Reordering, or hoisting a
 *    wobble, silently re-shuffles every subsequent shape in the scene.
 *  - `ridgeAt` builds its teeth wobble ONLY when `o.teeth` is set, so the 14 draws it consumes are
 *    conditional. That conditionality is part of the sequence; do not make it unconditional.
 *  - `peaksAt` draws FOUR values per peak in the order c, h, w, lean, and builds `jag` AFTER the
 *    whole loop — not interleaved with it.
 *  - The displacement array in `cutPoints` is a `Float32Array`, and each smoothing pass copies it
 *    with `Float32Array.from(d)`. The f32 rounding at every step is part of the picture; a
 *    `number[]` here renders a visibly different edge.
 *  - `curve`'s closed index is `(i + n * 2) % n`. The `n * 2` is what keeps `i - 1` positive at
 *    i = 0; it is not redundant.
 *  - `||` defaults (`o.per || 10`, `o.tear || 0`, `o.freq || 5`) and `=== undefined` defaults
 *    (`o.amp`, `floor`) are used at different sites on purpose: passing 0 means "the default" at
 *    the first and "zero" at the second. Each site keeps upstream's own idiom.
 *
 * Transcribed from upstream `prints/workings/index.html`: curve 348-367, ringPts 370-377,
 * cut 386-420, nib 427-445, wTip/wSwell/wLeaf 448-450, wNib 458-466, ridgeAt 474-479,
 * peaksAt 486-503, ridgeU 506.
 */
import { W } from './constants.ts';
import { TAU, clamp } from './num.ts';
import type { Pt } from './pt.ts';
import { type Rng } from './rng.ts';
import { makeWob, type Wob } from './wobble.ts';

/** u along a path -> a scalar: half-width for ribbonRails, height for a ridge. */
export type Profile = (u: number) => number;

/* — shape builders ——————————————————————————————————————————————— */

/** Catmull-Rom through pts, as a dense polyline. */
export function curve(pts: Pt[], closed: boolean, per?: number): Pt[] {
  per = per || 12;
  const n = pts.length,
    out: Pt[] = [];
  const at = (i: number): Pt =>
    pts[closed ? (i + n * 2) % n : clamp(i, 0, n - 1)];
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1),
      p1 = at(i),
      p2 = at(i + 1),
      p3 = at(i + 2);
    for (let k = 0; k < per; k++) {
      const u = k / per,
        u2 = u * u,
        u3 = u2 * u;
      out.push([
        0.5 *
          (2 * p1[0] +
            (p2[0] - p0[0]) * u +
            (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 +
            (3 * p1[0] - p0[0] - 3 * p2[0] + p3[0]) * u3),
        0.5 *
          (2 * p1[1] +
            (p2[1] - p0[1]) * u +
            (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 +
            (3 * p1[1] - p0[1] - 3 * p2[1] + p3[1]) * u3),
      ]);
    }
  }
  // upstream is `pts[n - 1].slice()`; a copy, not a shared reference. Same values, no math.
  if (!closed) out.push([pts[n - 1][0], pts[n - 1][1]]);
  return out;
}

/** Points around an ellipse, for feeding cut(). */
export function ringPts(
  x: number,
  y: number,
  rx: number,
  ry: number,
  n: number,
  rot?: number,
): Pt[] {
  const out: Pt[] = [],
    c = Math.cos(rot || 0),
    s = Math.sin(rot || 0);
  for (let i = 0; i < n; i++) {
    const th = (i / n) * TAU,
      px = Math.cos(th) * rx,
      py = Math.sin(th) * ry;
    out.push([x + px * c - py * s, y + px * s + py * c]);
  }
  return out;
}

export interface CutOptions {
  /** edge waver in px — 2 is a drawn line, 8 is torn stock */
  amp?: number;
  /** 0..1 chance per sample of a deeper bite inward */
  tear?: number;
  /** samples per control-point span, handed to curve() */
  per?: number;
}

/**
 * Closed hand-cut contour through control points: the silhouette builder.
 * A shape made of arcs and ellipses reads as clip art however good the screen
 * is, because every edge has the same machine curvature.
 *   o.amp   edge waver in px — 2 is a drawn line, 8 is torn stock
 *   o.tear  0..1 chance per sample of a deeper bite inward
 *
 * Returns the displaced contour. `canvas/`'s `cut` walks these into a Path2D and closes it.
 */
export function cutPoints(pts: Pt[], rng: Rng, o?: CutOptions): Pt[] {
  o = o || {};
  const amp = o.amp === undefined ? 3 : o.amp,
    tear = o.tear || 0;
  const c = curve(pts, true, o.per || 10),
    n = c.length;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const a = c[i],
      b = c[(i + 1) % n];
    area += a[0] * b[1] - b[0] * a[1];
  }
  const sgn = area > 0 ? 1 : -1; // keep the normal pointing outward

  /* Displace along the normal, then smooth: an unsmoothed tear lands on one
     sample and reads as damage rather than as a bay in the edge. */
  const w1 = makeWob(rng, 4),
    w2 = makeWob(rng, 9),
    d = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const th = (i / n) * TAU;
    d[i] = (w1(th) + w2(th * 3) * 0.3) * amp;
    if (tear && rng() < tear) d[i] -= amp * (1.4 + rng() * 1.6);
  }
  for (let pass = 0; pass < 2; pass++) {
    const s = Float32Array.from(d);
    for (let i = 0; i < n; i++)
      d[i] = (s[(i - 1 + n) % n] + s[i] * 2 + s[(i + 1) % n]) * 0.25;
  }

  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = c[(i - 1 + n) % n],
      b = c[(i + 1) % n];
    let tx = b[0] - a[0],
      ty = b[1] - a[1];
    const m = Math.hypot(tx, ty) || 1;
    tx /= m;
    ty /= m;
    const x = c[i][0] + sgn * ty * d[i],
      y = c[i][1] - sgn * tx * d[i];
    out.push([x, y]);
  }
  return out;
}

export interface NibOptions {
  /** take pts as the polyline itself, instead of resampling it through curve() */
  raw?: boolean;
  /** samples per control-point span, handed to curve() */
  per?: number;
}

/**
 * Variable-width ribbon along a path, as a fillable shape. Canvas has no
 * pressure, so a constant lineWidth is the default and it is what makes stems,
 * branches, whiskers and rigging read as wire. wfn(u) returns half-width.
 *
 * Returns the two rails. `canvas/`'s `nib` walks L forward then R backward into one closed path.
 */
export function ribbonRails(
  pts: Pt[],
  wfn: Profile,
  o?: NibOptions,
): { L: Pt[]; R: Pt[] } {
  o = o || {};
  const c = o.raw ? pts : curve(pts, false, o.per || 10);
  const n = c.length,
    L: Pt[] = [],
    R: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = c[Math.max(0, i - 1)],
      b = c[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0],
      ty = b[1] - a[1];
    const m = Math.hypot(tx, ty) || 1;
    tx /= m;
    ty /= m;
    const w = Math.max(0.01, wfn(i / (n - 1)));
    L.push([c[i][0] - ty * w, c[i][1] + tx * w]);
    R.push([c[i][0] + ty * w, c[i][1] - tx * w]);
  }
  return { L, R };
}

/** Width profiles for nib(). */
export const wTip =
  (w: number): Profile =>
  (u) =>
    w * (1 - u * u); // full, lifting to a point
export const wSwell =
  (w: number, at: number, k?: number): Profile =>
  (u) =>
    w * Math.exp(-Math.pow((u - at) / (k || 0.35), 2));
export const wLeaf =
  (w: number, skew?: number): Profile =>
  (u) =>
    w * Math.pow(Math.sin(Math.PI * Math.pow(u, skew || 0.55)), 1.15);

/**
 * Calligraphic width from a held nib: widest where the path runs across the
 * nib's axis, thinnest where it runs along it. This is where hand-drawn line
 * weight comes from, and it is what makes a contour read as drawn rather than
 * traced. Pass the same polyline you give nib(), with raw: true.
 */
export function wNib(
  c: Pt[],
  w0: number,
  ang: number,
  floor?: number,
): Profile {
  const n = c.length,
    f = floor === undefined ? 0.22 : floor;
  return (u) => {
    const i = clamp(Math.round(u * (n - 1)), 0, n - 1);
    const a = c[Math.max(0, i - 1)],
      b = c[Math.min(n - 1, i + 1)];
    const th = Math.atan2(b[1] - a[1], b[0] - a[0]);
    return w0 * (f + (1 - f) * Math.abs(Math.sin(th - ang)));
  };
}

export interface RidgeOptions {
  rng: Rng;
  /** height of the undulation */
  amp?: number;
  /** how many bumps across the frame */
  freq?: number;
  /** harmonics in the undulation */
  harm?: number;
  /** fraction of W the far end drops */
  tilt?: number;
  /** adds a jagged octave — costs 14 rng draws ONLY when set */
  teeth?: boolean;
}

/**
 * A horizon band closed to the bottom of the frame: hills, treeline, roofline,
 * wave. Stack several at falling tone and the air between them reads as depth.
 *   o.amp  height of the undulation   o.freq  how many bumps across the frame
 *   o.tilt fraction of W the far end drops   o.teeth adds a jagged octave
 */
export function ridgeAt(y: number, o: RidgeOptions): Profile {
  const amp = o.amp === undefined ? 60 : o.amp;
  const w: Wob = makeWob(o.rng, o.harm || 5),
    t: Wob | null = o.teeth ? makeWob(o.rng, 7) : null;
  return (u) =>
    y +
    w(u * (o.freq || 5)) * amp +
    (o.tilt || 0) * (u - 0.5) * W +
    (t ? t(u * 37) * amp * 0.22 : 0);
}

export interface PeaksOptions {
  rng: Rng;
  /** peak height */
  amp?: number;
  /** how many peaks */
  n?: number;
}

interface Peak {
  c: number;
  h: number;
  w: number;
  lean: number;
}

/**
 * Mountain profile: overlapping triangular peaks with a jagged octave on top,
 * because a skyline built from smooth harmonics always reads as hills however
 * tall it is. Same u -> y contract as ridgeAt, so ridge() takes either.
 */
export function peaksAt(y: number, o: PeaksOptions): Profile {
  const amp = o.amp === undefined ? 90 : o.amp,
    n = o.n || 5,
    ps: Peak[] = [];
  for (let i = 0; i < n; i++) {
    ps.push({
      c: (i + 0.5) / n + ((o.rng() - 0.5) * 0.7) / n,
      h: amp * (0.4 + o.rng() * 0.6),
      w: (0.55 + o.rng() * 0.9) / n,
      lean: (o.rng() - 0.5) * 0.7,
    });
  }
  const jag = makeWob(o.rng, 8);
  return (u) => {
    let top = y;
    for (const p of ps) {
      const d = (u - p.c) / p.w;
      const yy =
        y -
        p.h * Math.max(0, 1 - Math.abs(d)) * (1 + p.lean * (d > 0 ? 1 : -1));
      if (yy < top) top = yy;
    }
    return top + jag(u * 26) * amp * 0.06;
  };
}

/** x across the frame -> the u that ridgeAt takes, for planting on a skyline. */
export const ridgeU = (x: number): number => (x + 60) / (W + 120);
