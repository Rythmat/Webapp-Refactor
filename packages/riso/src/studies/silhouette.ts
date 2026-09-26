/**
 * Study 0 — silhouette: assembled primitives vs one cut contour.
 *
 * Left half draws the bird the obvious way — an ellipse body, a circle head, a triangle beak, an
 * ellipse tail, ruled legs on a ruled perch. Every edge carries the same machine curvature and the
 * joins read as bumps. Right half draws the same bird as ONE hand-cut contour through deliberate
 * points (BIRD, in frame.ts), with the wing following the body's line, and it reads at a glance.
 *
 * Transcribed from upstream studies/index.html lines 1075-1122.
 */
import { print, carve, tone, hatch } from '../canvas/paint.ts';
import { scene } from '../canvas/scene.ts';
import { cut, nib } from '../canvas/shapes.ts';
import { type Ctx } from '../canvas/surface.ts';
import { type Ink, W } from '../core/constants.ts';
import { wSwell, wTip } from '../core/geometry.ts';
import { TAU } from '../core/num.ts';
import { type Pt } from '../core/pt.ts';
import { type Rng } from '../core/rng.ts';
import { BIRD, QL, QR } from './frame.ts';

scene('silhouette', {
  // 0 — primitives vs one cut contour
  inks: ['blue', 'indigo', 'orange'],
  plates(g: Ctx, ink: Ink, rng: Rng, sr: Rng) {
    const cy = W * 0.44,
      k = 1.16;
    const body = cut(
      BIRD.map(([x, y]): Pt => [QR + x * k, cy + y * k]),
      sr,
      { amp: 3.2 },
    );
    const wing = cut(
      (
        [
          [-40, -44],
          [30, -30],
          [104, 8],
          [120, 30],
          [120, 30],
          [34, 18],
          [-20, -6],
        ] as Pt[]
      ).map(([x, y]): Pt => [QR + x * k, cy + y * k]),
      sr,
      { amp: 2.6 },
    );
    const perch = (x: number): Path2D =>
      nib(
        [
          [x - 240, cy + 152],
          [x, cy + 148],
          [x + 250, cy + 156],
        ],
        wSwell(9, 0.5, 0.9),
      );

    if (ink === 'blue') {
      tone(g, 1); // left: body, head, beak, tail as primitives
      g.beginPath();
      g.ellipse(QL + 6, cy + 4, 118, 86, -0.12, 0, TAU);
      g.fill();
      g.beginPath();
      g.arc(QL - 86, cy - 54, 62, 0, TAU);
      g.fill();
      g.beginPath();
      g.moveTo(QL - 172, cy - 32);
      g.lineTo(QL - 118, cy - 74);
      g.lineTo(QL - 116, cy - 18);
      g.closePath();
      g.fill();
      g.beginPath();
      g.ellipse(QL + 168, cy + 46, 88, 26, 0.42, 0, TAU);
      g.fill();

      print(g, body, 1); // right: one contour, one gesture
      carve(
        g,
        nib(
          [
            [QR - 96, cy + 4],
            [QR - 20, cy + 40],
            [QR + 74, cy + 30],
          ],
          wSwell(4, 0.5, 0.8),
        ),
      );
    }

    if (ink === 'indigo') {
      tone(g, 1); // left: wing and eye as more ellipses
      g.beginPath();
      g.ellipse(QL + 24, cy + 2, 82, 40, 0.3, 0, TAU);
      g.fill();
      g.beginPath();
      g.arc(QL - 104, cy - 66, 11, 0, TAU);
      g.fill();

      print(g, wing, 1); // right: the wing follows the body's line
      hatch(g, wing, sr, { ang: 0.42, gap: 9, w: 2.4, a: 1, cut: true });
      g.beginPath();
      g.arc(QR - 104, cy - 62, 12, 0, TAU);
      tone(g, 1);
      g.fill();
    }

    if (ink === 'orange') {
      tone(g, 0.85);
      g.lineWidth = 7;
      g.lineCap = 'round'; // left: ruled legs and a ruled perch
      g.beginPath();
      g.moveTo(QL - 10, cy + 84);
      g.lineTo(QL - 22, cy + 146);
      g.moveTo(QL + 34, cy + 80);
      g.lineTo(QL + 30, cy + 146);
      g.stroke();
      g.beginPath();
      g.moveTo(QL - 240, cy + 150);
      g.lineTo(QL + 250, cy + 150);
      g.stroke();

      print(
        g,
        nib(
          [
            [QR - 14, cy + 70],
            [QR - 20, cy + 112],
            [QR - 34, cy + 150],
          ],
          wTip(7),
        ),
        0.9,
      );
      print(
        g,
        nib(
          [
            [QR + 34, cy + 64],
            [QR + 32, cy + 110],
            [QR + 40, cy + 150],
          ],
          wTip(7),
        ),
        0.9,
      );
      print(g, perch(QR), 0.9);
    }
  },
});
