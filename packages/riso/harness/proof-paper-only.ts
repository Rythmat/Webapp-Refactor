/**
 * Bare paper, nothing else — the direct fidelity counterpart to upstream's `paper` binding.
 *
 * tools/parity.ts renders this and, on the upstream page, draws that page's own baked `paper`
 * canvas into its own canvas, then screenshots both through the identical Playwright pipeline. Two
 * matching sha256s prove bakePaper was transcribed exactly: the same 3 mottling octaves, the same
 * 420 fibres, the same 2200 flecks, drawn in the same order from the same seed.
 */
import { paperOf } from '../src/canvas/paper.ts';
import { ctx2d } from '../src/canvas/surface.ts';
import type { RisoFilm } from '../src/film/contract.ts';

export function paperOnly(): RisoFilm {
  return {
    duration: 1,
    ready: false,
    seek(): void {
      const canvas = document.getElementById('c') as HTMLCanvasElement;
      const g = ctx2d(canvas);
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.drawImage(paperOf(), 0, 0);
    },
    shots: [
      {
        id: 'paper',
        start: 0,
        readAt: 0,
        end: 1,
        action: 'bare stock',
        transition: 'none',
      },
    ],
  };
}
