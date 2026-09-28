/**
 * Paint operations — the nine calls that put coverage on a plate.
 *
 * THE MODEL. A scene draws coverage, and ALPHA IS TONE. By the time a plate function runs,
 * bakeScene has already set `fillStyle = strokeStyle = '#000'`, so nothing in here ever chooses a
 * colour: `tone(g, 0.4)` means a 40% dot screen, which `screenCoverage` later resolves into hard
 * dots of whichever ink the plate belongs to. There is no black ink in the palette and no black in
 * a scene — darks come from STACKING PLATES, one overprinting the next (orange over indigo bottoms
 * at luminance 7; either plate alone cannot get near it).
 *
 * Shapes arrive as Path2D values, built elsewhere, so one shape can be filled on one plate, knocked
 * out of another and hatched on a third, and a knockout cannot miss its target.
 *
 * TRAPS, all of them craft rules rather than coding style:
 *  - `carve` knocks out at FULL coverage (globalAlpha = 1). A knockout drawn at a tone leaves the
 *    screen's own gaps behind and the plate below shows through the holes. Upstream calls this its
 *    single most common fault.
 *  - Tones ADD where two shapes overlap on one plate, so a shape that must own its value clears
 *    first and prints second. That is all `plane` is, and every plane in a depth stack goes through
 *    it — a stack of ridges drawn back to front without it ends up solid at the bottom of the
 *    frame, which reads as a colour band rather than as land.
 *  - `shade` fills `(-W, -W, W*3, W*3)`, far outside the frame, so the ramp covers the plate
 *    whatever the clip is. With `o.cut` it becomes a RAMPED KNOCKOUT, which is how a form is
 *    modelled: take ink away toward the light on the subject's OWN plate. Laying a second ink
 *    across the shade side instead is the obvious move and it is wrong (it printed an orange ball
 *    olive-brown); spend a foreign ink only on the smallest, darkest accent.
 *  - Every operation that touches globalAlpha, globalCompositeOperation or the transform
 *    save/restores exactly as upstream does. A leaked 'destination-out' corrupts every later draw
 *    on that plate, and it will not look like a bug in this file.
 *
 * Transcribed from upstream prints/workings/index.html: `tone` 257, `print` 522, `carve` 527-533,
 * `plane` 542, `keyline` 545-549, `shade` 559-571, `hatch` 581-605, `spray` 612-629, `bed` 638-642.
 */
import { CX, CY, W } from '../core/constants.ts';
import { ringPts } from '../core/geometry.ts';
import { TAU, clamp } from '../core/num.ts';
import { type Rng } from '../core/rng.ts';
import { cut } from './shapes.ts';
import { type Ctx } from './surface.ts';

/** Set the coverage the next mark prints at. Alpha is tone: 0.4 is a 40% dot screen. */
export const tone = (g: Ctx, a: number): void => {
  g.globalAlpha = clamp(a, 0, 1);
};

/** Fill a shape at a tone. */
export function print(g: Ctx, path: Path2D, a?: number): void {
  tone(g, a === undefined ? 1 : a);
  g.fill(path);
}

/** Knock a shape out of the plate underneath it, at full coverage.
    A knockout drawn at a tone leaves the screen's gaps behind, so the plate
    below shows through the holes — always clear solid. */
export function carve(g: Ctx, path: Path2D): void {
  g.save();
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'destination-out';
  g.fill(path);
  g.restore();
}

/**
 * Print a shape at an exact tone, clearing whatever the plate already holds
 * beneath it. Tones on one plate add where they overlap, so a stack of ridges
 * drawn back to front ends up solid at the bottom of the frame — which looks
 * like a colour band rather than land. Every plane in a depth stack goes
 * through here.
 */
export function plane(g: Ctx, path: Path2D, a?: number): void {
  carve(g, path);
  print(g, path, a);
}

/** Outline a shape. Line work fades on width and alpha, never on coverage. */
export function keyline(g: Ctx, path: Path2D, w?: number, a?: number): void {
  tone(g, a === undefined ? 1 : a);
  g.lineWidth = w === undefined ? 3 : w;
  g.stroke(path);
}

/** One `[at, tone]` gradient stop, both in 0..1. */
export type ToneStop = readonly [number, number];

interface ShadeCommon {
  stops: readonly ToneStop[];
  /** Ramp the knockout instead of the ink: the form-modelling gesture. */
  cut?: boolean;
}

/** Radial ramp: `o.r` is what selects this form, so it is required here. */
export interface ShadeRadialOptions extends ShadeCommon {
  x: number;
  y: number;
  r: number;
  r0?: number;
  x0?: undefined;
  y0?: undefined;
  x1?: undefined;
  y1?: undefined;
}

/** Linear ramp: `r` is declared absent so `o.r !== undefined` discriminates the two. */
export interface ShadeLinearOptions extends ShadeCommon {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  r?: undefined;
  r0?: undefined;
  x?: undefined;
  y?: undefined;
}

export type ShadeOptions = ShadeRadialOptions | ShadeLinearOptions;

/**
 * Tone ramp inside a shape — a coverage gradient, which the screen turns into
 * a dot-size ramp. This is the signature riso gesture and neither film uses it.
 * Baked plates only: a live inkPass screens at one flat coverage, so a gradient
 * there prints smooth, which is the thing the brief forbids.
 *   o.stops  [[at, tone], ...]      o.x0,y0,x1,y1  linear
 *   o.x,y,r0,r  radial
 */
export function shade(g: Ctx, path: Path2D | null, o: ShadeOptions): void {
  g.save();
  if (path) g.clip(path);
  const grd =
    o.r !== undefined
      ? g.createRadialGradient(o.x, o.y, o.r0 || 0, o.x, o.y, o.r)
      : g.createLinearGradient(o.x0, o.y0, o.x1, o.y1);
  for (const [at, a] of o.stops)
    grd.addColorStop(clamp(at, 0, 1), 'rgba(0,0,0,' + clamp(a, 0, 1) + ')');
  if (o.cut) g.globalCompositeOperation = 'destination-out';
  g.globalAlpha = 1;
  g.fillStyle = grd;
  g.fillRect(-W, -W, W * 3, W * 3);
  g.restore();
}

/**
 *   o.gap px between lines   o.w width   o.ang radians   o.a tone
 *   o.fade(u) 0..1 thins across the run, for a shaded edge
 *   o.cut hatches into the knockout instead, which is dry-brush at gap 3-5
 */
export interface HatchOptions {
  gap?: number;
  w?: number;
  ang?: number;
  a?: number;
  fade?: (u: number) => number;
  cut?: boolean;
}

/**
 * Parallel hatching clipped to a shape: tone made of line rather than dot.
 * Next to the screen it reads as engraving, and it is how a mid-value stops
 * being flat without adding another ink.
 */
export function hatch(
  g: Ctx,
  path: Path2D | null,
  rng: Rng,
  o?: HatchOptions,
): void {
  o = o || {};
  const gap = o.gap || 10,
    span = W * 1.6;
  const w = o.w || 2.2,
    a = o.a === undefined ? 1 : o.a;
  g.save();
  if (path) g.clip(path);
  if (o.cut) g.globalCompositeOperation = 'destination-out';
  g.translate(CX, CY);
  g.rotate(o.ang === undefined ? -0.5 : o.ang);
  g.translate(-CX, -CY);
  g.lineCap = 'round';
  const n = Math.ceil((span * 2) / gap);
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1),
      f = o.fade ? clamp(o.fade(u), 0, 1) : 1;
    if (f <= 0.02) continue;
    g.globalAlpha = a * f;
    g.lineWidth = w * (0.72 + rng() * 0.5) * clamp(f, 0.3, 1);
    const y = CY - span + i * gap + (rng() - 0.5) * gap * 0.3;
    g.beginPath();
    for (let k = 0; k <= 7; k++) {
      const x = CX - span + (span * 2 * k) / 7,
        yy = y + (rng() - 0.5) * 2.4;
      k ? g.lineTo(x, yy) : g.moveTo(x, yy);
    }
    g.stroke();
  }
  g.restore();
}

/**
 * o.density(x, y) returns 0..1 and is the whole point: without it this is noise.
 * o.box is [x, y, w, h]; o.n grains tried, o.r0/o.r1 the grain radius range.
 */
export interface SprayOptions {
  n?: number;
  r0?: number;
  r1?: number;
  box?: readonly [number, number, number, number];
  a?: number;
  density?: (x: number, y: number) => number;
  cut?: boolean;
}

/**
 * Stipple inside a shape — a gradient made of grain instead of dots, for
 * spray, mist, sand, snow, and the bloom where ink feathers at an edge.
 */
export function spray(
  g: Ctx,
  path: Path2D | null,
  rng: Rng,
  o?: SprayOptions,
): void {
  o = o || {};
  const n = o.n || 900,
    r0 = o.r0 || 0.8,
    r1 = o.r1 || 3.0;
  const b = o.box || [0, 0, W, W],
    a = o.a === undefined ? 1 : o.a;
  g.save();
  if (o.cut) g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < n; i++) {
    const x = b[0] + rng() * b[2],
      y = b[1] + rng() * b[3];
    const d = o.density ? o.density(x, y) : 1;
    /* All three draws happen before the cull, so a rejected grain still costs the
       same rng draws — the generator's position is part of the picture. */
    const keep = rng() < d,
      rr = r0 + rng() * (r1 - r0),
      av = 0.45 + rng() * 0.55;
    if (!keep || (path && !g.isPointInPath(path, x, y))) continue;
    g.globalAlpha = a * av;
    g.beginPath();
    g.arc(x, y, rr, 0, TAU);
    g.fill();
  }
  g.restore();
}

/* There is no model() helper here on purpose. Shading a form by laying a second
   ink across its shade side is the obvious move and it is wrong: study 3 in that
   form printed an orange ball olive-brown. Model with shade(…, {cut: true}) on
   the subject's own plate instead, and spend a second ink only on the smallest
   darkest accent. */

/** Contact shadow. A subject that does not touch its ground reads as a decal. */
export function bed(
  g: Ctx,
  x: number,
  y: number,
  rx: number,
  ry: number,
  rng: Rng,
  a?: number,
): void {
  const t = a === undefined ? 0.55 : a;
  shade(g, cut(ringPts(x, y, rx, ry, 10), rng, { amp: rx * 0.06 }), {
    x: x,
    y: y,
    r0: 0,
    r: rx,
    stops: [
      [0, t],
      [0.5, t * 0.5],
      [1, 0],
    ],
  });
}
