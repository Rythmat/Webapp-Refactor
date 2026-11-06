import { echoRandom } from '@/curriculum/engine/echo/random';
import { mix, PAPER, shade } from './color';
import { rect } from './path';
import type { CoverDetail, CoverScene, CoverSpec } from './types';

// ── A square split at musical ratios ───────────────────────────────────────
// Mondrian-like: the box is cut along its longer side at the course's
// intervals (2:1, 3:2, 4:3, 5:4), again and again, and each piece takes one
// of the key's tones or the dark, with thin gaps of paper between. Relative
// and Parallel, which compare a key's modes, and anything else unmatched.

const GAP = 0.9;

export function buildSubdivide(
  spec: Extract<CoverSpec, { family: 'subdivide' }>,
  detail: CoverDetail,
): CoverScene {
  const rng = echoRandom(`cover:subdivide:${spec.seed}`);
  const [a, b] = spec.colors;
  // Minimal: most pieces are quiet darks; one or two carry the colour.
  const quiet = [PAPER];
  const loud = ['@tone', mix(a, b, 0.5)];
  let louds = 0;
  const groups = new Map<string, string[]>();
  const ratios = spec.ratios.length ? spec.ratios : [[3, 2] as const];
  const maxDepth = Math.min(3, spec.depth) + (detail === 'hero' ? 1 : 0);
  let turn = 0;

  const split = (x: number, y: number, w: number, h: number, depth: number) => {
    const small = Math.min(w, h) < 14;
    if (depth >= maxDepth || small || (depth > 1 && rng() < 0.22)) {
      const fill =
        louds < 2 && rng() < 0.38
          ? loud[louds++ % loud.length]
          : quiet[Math.floor(rng() * quiet.length)];
      const list = groups.get(fill) ?? [];
      list.push(
        rect(
          x + GAP / 2,
          y + GAP / 2,
          Math.max(0, w - GAP),
          Math.max(0, h - GAP),
        ),
      );
      groups.set(fill, list);
      return;
    }
    const [p, q] = ratios[turn % ratios.length];
    turn += 1;
    const share = Math.max(p, q) / (p + q);
    const cut = rng() < 0.5 ? share : 1 - share;
    if (w >= h) {
      split(x, y, w * cut, h, depth + 1);
      split(x + w * cut, y, w * (1 - cut), h, depth + 1);
    } else {
      split(x, y, w, h * cut, depth + 1);
      split(x, y + h * cut, w, h * (1 - cut), depth + 1);
    }
  };
  split(0, 0, 100, 100, 0);

  const shapes = [...groups.entries()].map(([fill, parts]) => ({
    d: parts.join(''),
    fill,
  }));
  return {
    kind: 'svg',
    // The gaps between the panels show the ground: fine lines of the key.
    background: shade(mix(a, b, 0.5), -0.28),
    gradients: [
      {
        id: 'tone',
        x1: 0,
        y1: 100,
        x2: 100,
        y2: 0,
        stops: [
          [0, a],
          [1, b],
        ],
      },
    ],
    shapes,
    bytes: shapes.reduce((sum, s) => sum + s.d.length, 0),
  };
}
