/**
 * Ring marks that are never true circles.
 *
 * Transcribed from studies/index.html:441-476 (the "scene drawing helpers" block). These append to
 * the CURRENT path rather than filling, so a caller can combine them, clip with them, or knock
 * them out — the same reason the craft kit deals in Path2D.
 *
 * The wobble is the whole point. A geometrically exact circle reads as clip art however good the
 * halftone is, because every edge carries the same machine curvature.
 */
import { clamp } from '../core/num.ts';
import type { Rng } from '../core/rng.ts';
import { makeWob, type Wob } from '../core/wobble.ts';
import type { Ctx } from './surface.ts';

/** Append a wobbly ring to the current path. */
export function ringAt(
  g: Ctx,
  cx: number,
  cy: number,
  r: number,
  wob: Wob,
  amp = 0.02,
  steps = 0,
): void {
  /* Step count scales with radius so a big ring does not go faceted, but is bounded at both ends:
     40 keeps a small ring from becoming a polygon, 300 keeps a huge one affordable. */
  const n = steps || clamp(Math.round(r * 0.8), 40, 300);
  for (let i = 0; i <= n; i++) {
    const th = (i / n) * Math.PI * 2;
    const rr = r * (1 + wob(th) * amp);
    const x = cx + Math.cos(th) * rr;
    const y = cy + Math.sin(th) * rr;
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.closePath();
}

/** A closed wobbly blob, seeded from an rng. Begins its own path. */
export function blob(
  g: Ctx,
  cx: number,
  cy: number,
  r: number,
  rng: Rng,
  amp = 0.06,
): void {
  g.beginPath();
  ringAt(g, cx, cy, r, makeWob(rng, 3), amp);
}
