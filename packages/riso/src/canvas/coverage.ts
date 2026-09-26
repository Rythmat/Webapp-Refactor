/**
 * Coverage screening and ink starvation — the two steps that turn a drawing into a print.
 *
 * THE MODEL. A scene is drawn once per ink into a COVERAGE layer, in flat black, where ALPHA IS
 * TONE: `globalAlpha = 0.4` does not mean "40% transparent ink", it means "a 40% dot screen". A
 * real riso lays one colour of ink at one density; the only way it makes a midtone is by covering
 * less of the paper. So a plate is authored as a greyscale coverage map, and `screenCoverage`
 * resolves that continuous tone into HARD DOTS against the ink's own rotated threshold screen —
 * every pixel ends up alpha 255 or alpha 0, nothing between. The dot mask is then tinted with the
 * ink colour (`source-in`), offset by that plate's registration error, and MULTIPLIED onto the
 * paper. Multiply is what makes two plates overlapping read as a third colour rather than as the
 * upper plate winning, which is exactly how the physical process behaves.
 *
 * `starve` is the other half of the illusion. A solid filled with an even screen reads as laser
 * print — a riso drum never delivers ink that evenly. So before screening, starvation punches a
 * scatter of soft flecks out of the coverage layer (`destination-out`), which after thresholding
 * become dropped dots: the speckle of a drum that is slightly short of ink.
 *
 * TRAPS IN HERE:
 *   - The screen is indexed in CANVAS space (`y % S`, `x % S`), never in object space. That is what
 *     stops the halftone from crawling when a shape moves: the dot lattice belongs to the paper,
 *     not to the thing being drawn.
 *   - `screenCoverage` mutates the ImageData it just read, IN PLACE, and puts that same buffer into
 *     a fresh canvas. `src.data` is a Uint8ClampedArray and must stay one.
 *   - The threshold test is strictly `>`. At `>=`, coverage 0 would light up every zero-threshold
 *     cell and the empty parts of a plate would print.
 *
 * Transcribed from upstream `prints/workings/index.html` (screenCoverage lines 169-186,
 * starve lines 317-330).
 */
import { K, type Ink } from '../core/constants.ts';
import { type Rng } from '../core/rng.ts';
import { screenOf } from './screens.ts';
import { type Ctx, cv, ctx2d } from './surface.ts';

/** Screen a greyscale coverage canvas into hard dots. Bake-time only. */
export function screenCoverage(
  covCanvas: HTMLCanvasElement,
  name: Ink,
): HTMLCanvasElement {
  const sc = screenOf(name);
  const w = covCanvas.width,
    h = covCanvas.height;
  const src = ctx2d(covCanvas).getImageData(0, 0, w, h);
  const s = src.data;
  for (let y = 0; y < h; y++) {
    const row = (y % sc.S) * sc.S;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const cover = s[i + 3] / 255;
      s[i + 3] = cover > sc.th[row + (x % sc.S)] ? 255 : 0;
    }
  }
  const out = cv(w, h);
  ctx2d(out).putImageData(src, 0, 0);
  return out;
}

/** Ink starvation: evenly filled solids read as laser print, so drop flecks. */
export function starve(g: Ctx, rng: Rng): void {
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'destination-out';
  const w = g.canvas.width,
    n = Math.round(w * 1.1);
  for (let i = 0; i < n; i++) {
    g.globalAlpha = 0.2 + rng() * 0.55;
    g.beginPath();
    g.arc(rng() * w, rng() * w, (0.5 + rng() * 2.0) * K, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}
