import { shade } from './color';
import { circle } from './path';
import type { CoverScene, CoverSpec } from './types';

// ── Interference rings ─────────────────────────────────────────────────────
// Two sets of concentric rings whose spacings are the course's interval
// apart, laid over each other: where they fall in and out of step, moiré
// fringes appear, the picture of two tones beating. For Audio's courses on
// sound and hearing.

const OFFSETS: readonly (readonly [number, number])[] = [
  [11, 0],
  [0, 11],
  [8, 8],
  [0, 0],
];

function ringSet(cx: number, cy: number, gap: number): string {
  const parts: string[] = [];
  for (let r = gap; r < 64; r += gap) parts.push(circle(cx, cy, r));
  return parts.join('');
}

export function buildRings(
  spec: Extract<CoverSpec, { family: 'rings' }>,
): CoverScene {
  const [a, b] = spec.colors;
  const [p, q] = spec.ratio;
  // Minimal: wide spacing and fine lines; the fringes do the work.
  const gap = 12;
  // The second set's spacing is the interval away from the first's.
  const other = gap * (Math.min(p, q) / Math.max(p, q));
  const [ox, oy] = OFFSETS[((spec.variant % 4) + 4) % 4];
  const first = ringSet(50 - ox / 2, 50 - oy / 2, gap);
  const second = ringSet(
    50 + ox / 2,
    50 + oy / 2,
    other === gap ? gap * 0.8 : other,
  );
  const shapes = [
    { d: first, stroke: a, strokeWidth: 1.2, opacity: 0.95 },
    {
      d: second,
      stroke: shade(b, 0.04),
      strokeWidth: 1.2,
      opacity: 0.8,
      blend: 'screen' as const,
    },
  ];
  return {
    kind: 'svg',
    background: '@field',
    gradients: [
      {
        id: 'field',
        x1: 0,
        y1: 0,
        x2: 100,
        y2: 100,
        stops: [
          [0, shade(a, -0.5)],
          [1, shade(b, -0.58)],
        ],
      },
    ],
    shapes,
    bytes: first.length + second.length,
  };
}
