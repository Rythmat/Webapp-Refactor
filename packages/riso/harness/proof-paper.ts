/**
 * Phase 2 proof: the paper bake and the halftone screens, and nothing else.
 *
 * It exists to be compared. The picture is deliberately dull — bare stock on the left, then every
 * ink stepped through coverage — because its job is to make a hash mismatch legible rather than to
 * look like anything. If tools/parity.ts says this frame differs from upstream, the fault is in
 * bakePaper, buildScreenTile, dotPattern or screenCoverage, and the strip that changed says which
 * ink.
 *
 * Static in t: every frame is identical, which makes it the strictest possible purity test — any
 * drift at all shows up immediately.
 */
import { screenCoverage } from '../src/canvas/coverage.ts';
import { paperOf } from '../src/canvas/paper.ts';
import { ctx2d, cv } from '../src/canvas/surface.ts';
import { INK, INK_NAMES, W } from '../src/core/constants.ts';
import type { RisoFilm } from '../src/film/contract.ts';

const STEPS = [0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1];

export function paperProof(): RisoFilm {
  let baked: HTMLCanvasElement | null = null;

  const bake = (): HTMLCanvasElement => {
    const out = cv(W, W);
    const o = ctx2d(out);
    o.drawImage(paperOf(), 0, 0);

    const lane = W / INK_NAMES.length;
    const cell = W / STEPS.length;

    INK_NAMES.forEach((ink, col) => {
      /* One coverage canvas per ink, drawn in black with alpha as tone, screened to hard dots,
         tinted, then multiplied down — the same four steps every real plate takes. */
      const cover = cv(W, W);
      const g = ctx2d(cover);
      g.fillStyle = '#000';
      STEPS.forEach((step, row) => {
        g.globalAlpha = step;
        g.fillRect(col * lane + 2, row * cell + 2, lane - 4, cell - 4);
      });
      g.globalAlpha = 1;

      const dots = screenCoverage(cover, ink);
      const tin = cv(W, W);
      const tx = ctx2d(tin);
      tx.drawImage(dots, 0, 0);
      tx.globalCompositeOperation = 'source-in';
      tx.fillStyle = INK[ink];
      tx.fillRect(0, 0, W, W);

      o.save();
      o.globalCompositeOperation = 'multiply';
      o.drawImage(tin, 0, 0);
      o.restore();
    });
    return out;
  };

  const film: RisoFilm = {
    duration: 1,
    ready: false,
    seek(): void {
      if (!baked) baked = bake();
      const canvas = document.getElementById('c') as HTMLCanvasElement;
      const g = ctx2d(canvas);
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      g.drawImage(baked, 0, 0);
    },
    shots: [
      {
        id: 'ramp',
        start: 0,
        readAt: 0,
        end: 1,
        action: 'paper, then every ink stepped 0.1 to 1.0 coverage',
        transition: 'none',
      },
    ],
  };
  return film;
}
