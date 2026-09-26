/**
 * The halftone screen cache, and the live dot pattern drawn from it.
 *
 * Two levels of memo, for two different costs. `screenOf` caches the screen GEOMETRY per ink —
 * `buildScreenTile` is an O(n²·S²) nearest-lattice-point search, far too slow to redo per frame,
 * but it is pure data (numbers and a Float32Array), so the module-level memo below allocates no
 * canvas at import time and stays Node-safe. `dotPattern` caches the rendered TILE CANVASES inside
 * each screen, created lazily on first use at that coverage.
 *
 * Upstream, on why a screen is pinned to the page rather than to the mark it fills:
 *
 *   Screens are anchored to canvas space, never to the object being drawn. A screen that rides
 *   along with its subject makes the texture crawl, which is the single most recognisable way
 *   this look goes wrong.
 *
 * That anchoring is one line — `pat.setTransform(new DOMMatrix())` — and it is the most important
 * line in this file. See the comment on it.
 *
 * Traps:
 *  - Coverage is quantised to sixteenths, so two coverages less than 0.06 apart share a tile. That
 *    is deliberate: a real screen has a finite set of dot sizes, and the cache depends on it.
 *  - The map lookup is folded into one `get` rather than upstream's `has` + `get`, purely so the
 *    tile types as `HTMLCanvasElement` without an assertion. Only this function ever writes the
 *    map and it only ever writes a canvas, so `!tile` and `!has(q)` are the same test.
 *
 * Transcribed from upstream: the cache from prints/workings/index.html (lines 125, 164-166),
 * `dotPattern` from studies/index.html (lines 199-217), which is the variant carrying the live pass.
 */
import { type Ink } from '../core/constants.ts';
import { clamp } from '../core/num.ts';
import { buildScreenTile, type ScreenTile } from '../core/screen-math.ts';
import { type Ctx, ctx2d, cv } from './surface.ts';

/** A screen tile plus the dot-tile canvases rendered from it, keyed by coverage in sixteenths. */
export interface Screen extends ScreenTile {
  patterns: Map<number, HTMLCanvasElement>;
}

const screens: Partial<Record<Ink, Screen>> = {};

function buildScreen(name: Ink): Screen {
  return { ...buildScreenTile(name), patterns: new Map() };
}

export function screenOf(name: Ink): Screen {
  return screens[name] || (screens[name] = buildScreen(name));
}

/** Tiled dot pattern at a quantised coverage, for live elements. */
export function dotPattern(
  ctx: Ctx,
  name: Ink,
  coverage: number,
): CanvasPattern {
  const sc = screenOf(name);
  const q = clamp(Math.round(coverage * 16), 0, 16);
  let tile = sc.patterns.get(q);
  if (!tile) {
    const t = cv(sc.S, sc.S),
      tx = ctx2d(t);
    const c = q / 16;
    if (c >= 1) {
      tx.fillStyle = '#000';
      tx.fillRect(0, 0, sc.S, sc.S);
    } else if (c > 0) {
      const r = sc.P * Math.sqrt(c / Math.PI);
      tx.fillStyle = '#000';
      for (const [x, y] of sc.wrapped) {
        tx.beginPath();
        tx.arc(x, y, r, 0, Math.PI * 2);
        tx.fill();
      }
    }
    tile = t;
    sc.patterns.set(q, t);
  }
  const pat = ctx.createPattern(tile, 'repeat');
  /* createPattern only returns null for a zero-area source, which `S = Math.max(2, ...)` in
     buildScreenTile rules out — so this is unreachable, and says so rather than hiding behind a
     non-null assertion. */
  if (!pat)
    throw new Error(
      `riso: createPattern returned null for the ${name} screen (${sc.S}x${sc.S} tile)`,
    );
  pat.setTransform(new DOMMatrix()); // pin to canvas space so it cannot swim
  return pat;
}
