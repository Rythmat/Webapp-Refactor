/**
 * The scene registry and the plate baker — the keystone of the engine. Every other module in
 * `canvas/` makes one ingredient; this is the only place where coverage, screening, starvation,
 * tinting and registration are composed into a finished picture.
 *
 * THE BAKE, once per ink, in this order and no other:
 *   1. the scene draws that ink's coverage in flat black, in 1080-space (alpha is TONE, see
 *      coverage.ts) — plates never know what colour they are
 *   2. starvation punches soft flecks out of that coverage
 *   3. the coverage is thresholded into hard dots against that ink's own rotated screen
 *   4. the dots are tinted with the ink colour and MULTIPLIED onto the sheet, offset by that
 *      plate's registration error
 *
 * WHY A BAKED SCENE IS NEVER SCALED AFTERWARDS. It is baked at the size it will be displayed at,
 * full stop. Resampling a halftoned bitmap beats the dot grid against the pixel grid and moirés:
 * the interference is between two near-equal lattices, so even a 1.02x resize breaks out plaid
 * that no amount of smoothing hides. Real print screens at final size for exactly this reason. If
 * a bigger print is wanted, bake bigger — `OUT` scales `PITCH` and the starvation flecks with it,
 * so the picture gets larger rather than finer — and never `drawImage` a bake into a box of a
 * different size.
 *
 * TRAPS IN HERE:
 *   - `sr` is re-seeded IDENTICALLY for every ink and must be consumed in the same order on every
 *     pass. That is how a shape built across two plates lands in the same place on both, so a
 *     knockout clears the thing it was built to clear. Upstream calls a mismatch here one of its
 *     worst failure modes: it does not crash and it does not look random — it looks like a slightly
 *     wrong drawing.
 *   - THE INK LOOP ORDER IS THE PICTURE. Each plate multiplies onto the result of the last, so
 *     iterate `sc.inks` in the order the scene declared. Never `INK_NAMES`, never a sorted list,
 *     never `Object.keys`.
 *   - ONE `cover` canvas is reused across all inks and cleared each pass. Allocating a fresh one
 *     per ink is equivalent today, but it stops being equivalent the moment anything reads a
 *     pixel the previous pass left behind, so keep the single canvas.
 *   - The sheet starts WHITE (`#fff`), not transparent, because it is designed to be multiplied
 *     over paper. Multiply lets white through, and that is precisely what makes an unlinked area
 *     show bare stock instead of a hole.
 *   - Contexts here are plain ones, as upstream takes them, even though `screenCoverage` reads
 *     `cover` back with `getImageData`. `willReadFrequently` selects a different rasterisation
 *     backend, which is not proven bit-neutral, and this is the parity path.
 *
 * Transcribed from upstream `prints/workings/index.html` (registry lines 262-265, bakeScene
 * lines 267-314). Upstream's `swap` variants are out of scope: this `bakeScene` is `(id, size)`,
 * cached under `id + '@' + size`, and `plate` is always `ink`.
 */
import { INK, REG, W, type Ink } from '../core/constants.ts';
import { rngFor, type Rng } from '../core/rng.ts';
import { screenCoverage, starve } from './coverage.ts';
import { type Ctx, cv, ctx2d } from './surface.ts';

/**
 * Draws ONE ink's coverage layer, in flat black, in 1080-space.
 *
 * `rng` is seeded per (scene, ink) — anything only this plate can see. `sr` is seeded per scene
 * and is therefore the SAME generator on every plate: shapes that more than one plate touches come
 * off `sr`, before any `ink ===` branch, so that every plate agrees where they are.
 */
export type PlatesFn = (g: Ctx, ink: Ink, rng: Rng, sr: Rng) => void;

/**
 * An optional per-frame overlay, drawn over the bake with `u` running 0→1 across the shot.
 * Every scene in `prints/workings` is fully baked and leaves this null; the field exists in the
 * registry record, and the signature is upstream's own (studies/index.html line 1943).
 */
export type LiveFn = (g: Ctx, u: number) => void;

export interface SceneDef {
  /** Plate order. This is draw order, and draw order is the picture. */
  inks: Ink[];
  plates: PlatesFn;
  live?: LiveFn | null;
}

/** A registered scene: what was declared, plus the id it was declared under. */
export interface Scene extends SceneDef {
  id: string;
  live: LiveFn | null;
}

/* ── scene registry ───────────────────────────────────────────────────────── */

/** Exported so a harness can enumerate what is registered. */
export const SCENES: Record<string, Scene> = {};

export const scene = (id: string, def: SceneDef): void => {
  SCENES[id] = Object.assign({ id, live: null }, def);
};

const baked = new Map<string, HTMLCanvasElement>();

/**
 * Bake a scene to one opaque bitmap: every plate screened, tinted, offset and
 * multiplied onto white, ready to multiply over paper.
 *
 * Baked at its display size, never scaled afterwards. Resampling a halftoned
 * bitmap beats the dot grid against the pixel grid and moirés; real print
 * screens at final size too.
 */
export function bakeScene(id: string, size: number): HTMLCanvasElement {
  const key = id + '@' + size;
  // `get` first rather than `has` + `get`: one lookup, and no non-null assertion.
  const memo = baked.get(key);
  if (memo) return memo;
  const sc = SCENES[id];
  // Error path only — upstream throws a TypeError one line later; this one says what went wrong.
  if (!sc) throw new Error(`riso: no scene registered as "${id}"`);
  const k = size / W;
  const out = cv(size, size),
    o = ctx2d(out);
  // White, not transparent: the sheet is multiplied over paper, and multiply lets white through.
  o.fillStyle = '#fff';
  o.fillRect(0, 0, size, size);

  // One coverage canvas for the whole bake, cleared at the top of each pass.
  const cover = cv(size, size),
    g = ctx2d(cover);
  for (const ink of sc.inks) {
    const plate = ink; // upstream's swap variants let these differ; here they never do
    // Scenes always draw in 1080-space; k carries that to whatever size was asked for.
    g.setTransform(k, 0, 0, k, 0, 0);
    g.clearRect(0, 0, W, W);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = g.strokeStyle = '#000';
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.save();
    // RISO-KEY: `id + ':' + ink` — this plate's own stream, nothing else sees it.
    // RISO-KEY: `id + ':shape'` — `sr`, re-seeded IDENTICALLY on every pass, and every pass has to
    //   consume it in the same order. Shapes more than one plate touches are drawn off `sr` before
    //   any `ink ===` branch, which is how both plates agree where they are. Upstream calls a
    //   mismatch here one of its worst failure modes: it neither crashes nor looks random, it
    //   looks like a slightly wrong drawing, with a knockout clearing something other than the
    //   shape it was built to clear. The separators and the ':shape' suffix are part of the
    //   picture — changing either reseeds the scene.
    sc.plates(g, ink, rngFor(id + ':' + ink), rngFor(id + ':shape'));
    g.restore();
    // RISO-KEY: `id + ':' + ink + ':void'` — the starvation stream. The ':void' suffix is part
    //   of it; drop it and starvation replays the plate's own draws.
    starve(g, rngFor(id + ':' + ink + ':void'));

    const dots = screenCoverage(cover, plate);
    const tin = cv(size, size),
      tx = ctx2d(tin);
    tx.drawImage(dots, 0, 0);
    tx.globalCompositeOperation = 'source-in';
    tx.fillStyle = INK[plate];
    tx.fillRect(0, 0, size, size);

    const [rx, ry] = REG[plate];
    o.save();
    o.globalCompositeOperation = 'multiply';
    o.drawImage(tin, rx, ry);
    o.restore();
  }
  baked.set(key, out);
  return out;
}
