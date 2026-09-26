/**
 * The paper sheet. Baked ONCE and drawn as the base layer of every frame.
 *
 * The trap this module exists to prevent: regenerating the sheet per frame. Every mark here is an
 * rng draw, so a second bake is a different sheet — and a different sheet every frame is grain
 * that crawls. `paperOf()` memoises for exactly that reason.
 *
 * Upstream holds this as a module-level `let paper = null` filled during init. Here the memo is
 * LAZY: a module-level bake would call `document.createElement` at import time, which breaks Node
 * tests and any SSR pass. Written with a plain `if` rather than `??=` so the intent is visible.
 *
 * Transcribed from upstream `prints/workings/index.html`. Draw order, iteration counts and the
 * number of r() calls per iteration are all output — they fix which draw lands on which mark.
 */
import { K, OUT, PAPER, W } from '../core/constants.ts';
import { rngFor } from '../core/rng.ts';
import { cv, ctx2d } from './surface.ts';

/* ── paper ────────────────────────────────────────────────────────────────────
   Cloudy mottling rather than fine grain: the reference shows blotches a few
   hundred px across at low contrast. Baked once, never recomputed, because any
   per-frame regeneration flickers.                                           */

let paper: HTMLCanvasElement | null = null;

export function bakePaper(): HTMLCanvasElement {
  const c = cv(OUT, OUT),
    x = ctx2d(c);
  x.setTransform(K, 0, 0, K, 0, 0);
  x.fillStyle = PAPER;
  x.fillRect(0, 0, W, W);

  const r = rngFor('paper'); // RISO-KEY

  // Mottling is a warm wash with noisy alpha, not a neutral multiply: greyscale
  // noise multiplied over cream desaturates it and reads as smoke rather than
  // paper. Keep it subtle at full size and only obvious when zoomed.
  for (const [res, maxA] of [
    [30, 0.1],
    [72, 0.075],
    [165, 0.05],
  ]) {
    const n = cv(res, res),
      nx = ctx2d(n);
    const img = nx.createImageData(res, res);
    for (let i = 0; i < res * res; i++) {
      img.data[i * 4] = 0xb4;
      img.data[i * 4 + 1] = 0xa6;
      img.data[i * 4 + 2] = 0x8c;
      img.data[i * 4 + 3] = Math.pow(r(), 1.8) * 255 * maxA;
    }
    nx.putImageData(img, 0, 0);
    x.save();
    x.imageSmoothingEnabled = true;
    x.imageSmoothingQuality = 'high';
    x.drawImage(n, 0, 0, W, W);
    x.restore();
  }

  x.save(); // fibres
  x.strokeStyle = '#8a7f6a';
  for (let i = 0; i < 420; i++) {
    const px = r() * W,
      py = r() * W,
      len = 5 + r() * 22,
      ang = r() * Math.PI;
    x.globalAlpha = 0.008 + r() * 0.016;
    x.lineWidth = 0.5 + r() * 0.7;
    x.beginPath();
    x.moveTo(px, py);
    x.quadraticCurveTo(
      px + Math.cos(ang) * len * 0.5 + (r() - 0.5) * 5,
      py + Math.sin(ang) * len * 0.5 + (r() - 0.5) * 5,
      px + Math.cos(ang) * len,
      py + Math.sin(ang) * len,
    );
    x.stroke();
  }
  x.restore();

  x.save(); // flecks
  for (let i = 0; i < 2200; i++) {
    x.globalAlpha = 0.012 + r() * 0.03;
    x.fillStyle = r() < 0.55 ? '#7d7362' : '#ffffff';
    x.beginPath();
    x.arc(r() * W, r() * W, 0.4 + r() * 1.0, 0, Math.PI * 2);
    x.fill();
  }
  x.restore();
  return c;
}

/** The one baked sheet. Lazy, so nothing touches the DOM at import time. */
export function paperOf(): HTMLCanvasElement {
  if (paper === null) paper = bakePaper();
  return paper;
}
