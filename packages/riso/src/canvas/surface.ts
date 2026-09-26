/**
 * Canvas plumbing. The single place a 2D context is obtained, so `getContext`'s null case is
 * handled once rather than with a `!` at every call site.
 *
 * Note on sizing, because it deliberately contradicts the rest of this app: riso canvases have a
 * FIXED backing store and ignore devicePixelRatio. The halftone pitch is 4.6 DEVICE pixels, so a
 * DPR-dependent backing store would change the dot lattice — on a 2x display the screen would come
 * out twice as fine, which reads as a grey wash rather than a risograph. See src/film/mount.ts.
 */

export type Ctx = CanvasRenderingContext2D;

/** An offscreen drawing surface at an exact pixel size. */
export function cv(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function ctx2d(
  c: HTMLCanvasElement,
  o?: CanvasRenderingContext2DSettings,
): Ctx {
  const g = c.getContext('2d', o);
  if (!g) throw new Error('riso: 2d context unavailable');
  return g;
}

/** A canvas and its context together — the pair almost every bake needs. */
export function surface(
  w: number,
  h: number,
  o?: CanvasRenderingContext2DSettings,
): { canvas: HTMLCanvasElement; g: Ctx } {
  const canvas = cv(w, h);
  return { canvas, g: ctx2d(canvas, o) };
}

/**
 * Plate and mask canvases are read back with getImageData every frame, so they must opt out of
 * GPU backing — upstream found that drawImage between GPU and CPU canvases was not bit-exact
 * across runs in Chromium, which breaks seek purity.
 */
export const readableSurface = (
  w: number,
  h: number,
): { canvas: HTMLCanvasElement; g: Ctx } =>
  surface(w, h, { willReadFrequently: true });
