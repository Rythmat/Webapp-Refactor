/**
 * Path2D shape builders — the silhouette vocabulary of the craft kit.
 *
 * WHY THESE RETURN Path2D VALUES RATHER THAN MARKING A CONTEXT. Upstream says it
 * plainly at the head of the craft kit: "Shapes are Path2D values rather than
 * marks on the context, so one shape can be filled on one plate, knocked out of
 * another and hatched on a third. That is what plate discipline needs, and it
 * removes the usual trap of rebuilding a shape per ink and having the knockout
 * miss." A scene is drawn once PER INK, so the same hill is visited three or
 * four times; if each visit rebuilt the shape it would consume its own rng
 * draws and land on its own coordinates, and the knockout on the blue plate
 * would clear a hill that is a pixel away from the one the red plate printed.
 * Build the geometry once, hold the value, hand it to every plate that needs it.
 *
 * THIS MODULE IS THIN ON PURPOSE. Every float lives in `../core/geometry.ts`,
 * which is DOM-free and therefore testable in Node; all that happens here is
 * the walk from a point list onto a Path2D. `Path2D` is only ever constructed
 * inside a function body, never at module scope, so importing this file in Node
 * is safe even though the constructor is not there.
 *
 * TRAPS IN HERE:
 *   - `nib` walks the LEFT rail forward and the RIGHT rail BACKWARD. Walk both
 *     forward and the two ends cross: you get a bow-tie, not a ribbon. The
 *     descending loop is load-bearing, not a stylistic flourish.
 *   - `ridge` starts and ends 60px outside the frame on each side, and closes
 *     down to `W + 60`. That overhang is what keeps the band's ends and its
 *     bottom corners off-frame, so a horizon reads as a horizon rather than as
 *     a filled rectangle with a wavy lid.
 *
 * Transcribed from upstream `prints/workings/index.html` (cut lines 386-420,
 * nib lines 427-445, ridge lines 508-517).
 */
import { W } from '../core/constants.ts';
import {
  cutPoints,
  ribbonRails,
  ridgeAt,
  type CutOptions,
  type NibOptions,
  type RidgeOptions,
} from '../core/geometry.ts';
import type { Pt } from '../core/pt.ts';
import { type Rng } from '../core/rng.ts';

/**
 * Closed hand-cut contour through control points: the silhouette builder.
 * A shape made of arcs and ellipses reads as clip art however good the screen
 * is, because every edge has the same machine curvature.
 *   o.amp   edge waver in px — 2 is a drawn line, 8 is torn stock
 *   o.tear  0..1 chance per sample of a deeper bite inward
 */
export function cut(pts: Pt[], rng: Rng, o?: CutOptions): Path2D {
  const c = cutPoints(pts, rng, o),
    n = c.length;
  const p = new Path2D();
  for (let i = 0; i < n; i++) {
    if (i) p.lineTo(c[i][0], c[i][1]);
    else p.moveTo(c[i][0], c[i][1]);
  }
  p.closePath();
  return p;
}

/**
 * Variable-width ribbon along a path, as a fillable shape. Canvas has no
 * pressure, so a constant lineWidth is the default and it is what makes stems,
 * branches, whiskers and rigging read as wire. wfn(u) returns half-width.
 */
export function nib(
  pts: Pt[],
  wfn: (u: number) => number,
  o?: NibOptions,
): Path2D {
  const { L, R } = ribbonRails(pts, wfn, o);
  const n = L.length;
  const p = new Path2D();
  p.moveTo(L[0][0], L[0][1]);
  for (let i = 1; i < n; i++) p.lineTo(L[i][0], L[i][1]);
  for (let i = n - 1; i >= 0; i--) p.lineTo(R[i][0], R[i][1]);
  p.closePath();
  return p;
}

/**
 * A horizon band closed to the bottom of the frame: hills, treeline, roofline,
 * wave. Stack several at falling tone and the air between them reads as depth.
 * Takes either a y in px — screened through `ridgeAt` — or any u -> y profile,
 * which is how `peaksAt` and friends plug into the same band.
 */
export function ridge(
  y: number | ((u: number) => number),
  o?: RidgeOptions & { n?: number },
): Path2D {
  /* Upstream's `o = o || {}`; the assertion only re-types that default, and a
     numeric y with no options would have thrown upstream too. */
  const opt = o || ({} as RidgeOptions & { n?: number });
  const f = typeof y === 'function' ? y : ridgeAt(y, opt);
  const n = opt.n || 120,
    p = new Path2D();
  p.moveTo(-60, W + 60);
  for (let i = 0; i <= n; i++) p.lineTo(-60 + (i / n) * (W + 120), f(i / n));
  p.lineTo(W + 60, W + 60);
  p.closePath();
  return p;
}
