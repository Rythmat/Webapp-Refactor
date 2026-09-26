/**
 * Shared frame constants and control points for the technique studies.
 *
 * Studies 0-5 are A/B within one frame: the left half is the obvious way, the right half is the
 * technique. Same inks, same screen, same frame, so the only difference on show is the drawing.
 *
 * From studies/index.html:1061-1074.
 */
import { W } from '../core/constants.ts';
import type { Pt } from '../core/pt.ts';

export const HALF = W / 2;
/** Centre of the left (before) half. */
export const QL = W * 0.25;
/** Centre of the right (after) half. */
export const QR = W * 0.75;

/* A silhouette assembled from primitives carries their curvature: every edge
   is a machine arc, the joins read as bumps, and no part of the outline says
   what the subject is doing. The same bird drawn as one contour through
   deliberate points — with a doubled point where an edge needs a corner —
   reads at a glance and reads as drawn. */
export const BIRD: Pt[] = [
  [-148, -28],
  [-148, -28], // beak tip: a doubled point makes a corner
  [-112, -46],
  [-88, -72],
  [-42, -92],
  [12, -78],
  [66, -44],
  [96, -14],
  [206, 26],
  [216, 50],
  [216, 50], // tail: a long wedge, not a fan
  [92, 34],
  [46, 62],
  [-18, 74],
  [-78, 52],
  [-116, 6],
  [-146, -12],
];
