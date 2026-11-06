import { echoRandom } from '@/curriculum/engine/echo/random';
import { shade } from './color';
import { circle, n, polygon, type Pt } from './path';
import type { CoverGradient, CoverScene, CoverShape, CoverSpec } from './types';

// ── One bold motif (Suno Discover's "Curated Collections") ─────────────────
// A single shape in a two-tone gradient over a darker field of the same
// colours: a star burst, a sun, rays or a tunnel of rays. The item's interval
// sets the count of points and rays, so an octave and a fourth differ.

const at = (cx: number, cy: number, r: number, angle: number): Pt => [
  cx + Math.cos(angle) * r,
  cy + Math.sin(angle) * r,
];

function star(
  cx: number,
  cy: number,
  points: number,
  outer: number,
  inner: number,
  turn = 0,
) {
  const pts: Pt[] = [];
  for (let k = 0; k < points * 2; k += 1) {
    const angle = turn - Math.PI / 2 + (k * Math.PI) / points;
    pts.push(at(cx, cy, k % 2 ? inner : outer, angle));
  }
  return polygon(pts);
}

/** Wedges from a point out past the box, every other one filled. */
function wedges(
  cx: number,
  cy: number,
  count: number,
  from: number,
  span: number,
) {
  const parts: string[] = [];
  const step = span / (count * 2);
  for (let k = 0; k < count; k += 1) {
    const a0 = from + k * 2 * step;
    parts.push(
      polygon([[cx, cy], at(cx, cy, 160, a0), at(cx, cy, 160, a0 + step)]),
    );
  }
  return parts.join('');
}

export function buildMotif(
  spec: Extract<CoverSpec, { family: 'motif' }>,
): CoverScene {
  const rng = echoRandom(`cover:motif:${spec.seed}`);
  const [a, b] = spec.colors;
  const [p, q] = spec.ratio;
  const gradients: CoverGradient[] = [
    {
      id: 'field',
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 100,
      stops: [
        [0, shade(b, -0.34)],
        [1, shade(a, -0.24)],
      ],
    },
    {
      id: 'shape',
      x1: 20,
      y1: 0,
      x2: 80,
      y2: 100,
      stops: [
        [0, shade(a, 0.06)],
        [1, b],
      ],
    },
  ];
  const shapes: CoverShape[] = [];
  const turn = rng() * 0.4;
  switch (spec.motif) {
    case 'burst': {
      const points = Math.min(10, Math.max(5, p + q));
      shapes.push({ d: star(50, 50, points, 36, 17, turn), fill: '@shape' });
      break;
    }
    case 'sun': {
      const rings: string[] = [];
      for (let k = 1; k <= Math.min(3, q); k += 1)
        rings.push(circle(50, 56, 28 + k * 9));
      shapes.push({
        d: rings.join(''),
        stroke: shade(a, 0.04),
        strokeWidth: 0.6,
        opacity: 0.35,
      });
      shapes.push({ d: circle(50, 56, 26), fill: '@shape' });
      break;
    }
    case 'rays': {
      const count = Math.min(12, Math.max(6, 2 * q));
      shapes.push({
        d: wedges(50, 50, count, turn, Math.PI * 2),
        fill: '@shape',
        opacity: 0.9,
      });
      shapes.push({ d: circle(50, 50, 7 + p), fill: shade(b, -0.3) });
      break;
    }
    case 'tunnel': {
      const count = Math.min(10, Math.max(5, p + q + 2));
      // Rays fanning from a far corner across the box: a tunnel of light.
      shapes.push({
        d: wedges(86, 14, count, Math.PI / 2 - 0.05, Math.PI / 2 + 0.1),
        fill: '@shape',
      });
      shapes.push({ d: circle(86, 14, 5), fill: shade(a, 0.2) });
      break;
    }
  }
  return {
    kind: 'svg',
    background: '@field',
    gradients,
    shapes,
    bytes: shapes.reduce((sum, s) => sum + s.d.length, 0) + n(0).length,
  };
}
