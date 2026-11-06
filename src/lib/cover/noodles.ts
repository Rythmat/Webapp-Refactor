import { echoRandom } from '@/curriculum/engine/echo/random';
import { PAPER, shade } from './color';
import { n, type Pt } from './path';
import type { CoverGradient, CoverScene, CoverShape, CoverSpec } from './types';

// ── Hex noodles (mwburke's "Making spaghetti code") ────────────────────────
// A hex grid whose cells each join pairs of their sides; the joins are
// traced across cells into long paths and drawn as gradient tubes with round
// caps, each over a dark outline so crossings read as over and under. For
// Audio's lessons on gear and anatomy: cables, signal, things connected.
// The lesson's interval sets the rhythm of one join and two joins per cell.

const SIDE = 12;
const R3 = Math.sqrt(3);

interface Join {
  from: Pt;
  to: Pt;
  c1: Pt;
  c2: Pt;
}

const key = ([x, y]: Pt) => `${Math.round(x * 4)},${Math.round(y * 4)}`;
const toward = (p: Pt, c: Pt, t: number): Pt => [
  p[0] + (c[0] - p[0]) * t,
  p[1] + (c[1] - p[1]) * t,
];

export function buildNoodles(
  spec: Extract<CoverSpec, { family: 'noodles' }>,
): CoverScene {
  const rng = echoRandom(`cover:noodles:${spec.seed}`);
  const [p, q] = spec.ratio;
  const joins: Join[] = [];
  let cell = 0;
  // Flat-topped hexes in columns, overhanging the box so paths run off it.
  for (let col = -1; col * 1.5 * SIDE < 112; col += 1) {
    for (let row = -1; row * R3 * SIDE < 112; row += 1) {
      const centre: Pt = [
        col * 1.5 * SIDE,
        row * R3 * SIDE + (col % 2 ? (R3 * SIDE) / 2 : 0),
      ];
      const mid = (i: number): Pt => {
        const angle = ((30 + 60 * i) * Math.PI) / 180;
        return [
          centre[0] + Math.cos(angle) * (R3 / 2) * SIDE,
          centre[1] + Math.sin(angle) * (R3 / 2) * SIDE,
        ];
      };
      // Six sides shuffled into three pairs; keep one or two of them.
      const sides = [0, 1, 2, 3, 4, 5];
      for (let k = sides.length - 1; k > 0; k -= 1) {
        const r = Math.floor(rng() * (k + 1));
        [sides[k], sides[r]] = [sides[r], sides[k]];
      }
      // Every side joined, so noodles run long across the card; the interval
      // sets which cells cross over themselves.
      const count = cell % (p + q) < p ? 3 : 2;
      cell += 1;
      for (let k = 0; k < count; k += 1) {
        const from = mid(sides[2 * k]);
        const to = mid(sides[2 * k + 1]);
        joins.push({
          from,
          to,
          c1: toward(from, centre, 0.55),
          c2: toward(to, centre, 0.55),
        });
      }
    }
  }

  // Trace joins that share a side's midpoint into long paths.
  const byEnd = new Map<string, number[]>();
  joins.forEach((j, i) => {
    for (const end of [j.from, j.to]) {
      const list = byEnd.get(key(end)) ?? [];
      list.push(i);
      byEnd.set(key(end), list);
    }
  });
  const used = new Set<number>();
  const paths: string[][] = [];
  const walk = (start: number, end: Pt, out: string[]) => {
    let at = end;
    let current = start;
    for (;;) {
      const next = (byEnd.get(key(at)) ?? []).find(
        (i) => i !== current && !used.has(i),
      );
      if (next === undefined) return;
      used.add(next);
      const j = joins[next];
      const forward = key(j.from) === key(at);
      const [c1, c2, to] = forward ? [j.c1, j.c2, j.to] : [j.c2, j.c1, j.from];
      out.push(
        `C${n(c1[0])} ${n(c1[1])} ${n(c2[0])} ${n(c2[1])} ${n(to[0])} ${n(to[1])}`,
      );
      at = to;
      current = next;
    }
  };
  joins.forEach((j, i) => {
    if (used.has(i)) return;
    used.add(i);
    // Back from its start, reversed, then on from its end.
    const back: string[] = [];
    const backEnds: Pt[] = [];
    let at = j.from;
    let current = i;
    for (;;) {
      const prev = (byEnd.get(key(at)) ?? []).find(
        (k) => k !== current && !used.has(k),
      );
      if (prev === undefined) break;
      used.add(prev);
      const pj = joins[prev];
      const forward = key(pj.to) === key(at);
      const [start, c1, c2] = forward
        ? [pj.from, pj.c1, pj.c2]
        : [pj.to, pj.c2, pj.c1];
      back.unshift(
        `C${n(c1[0])} ${n(c1[1])} ${n(c2[0])} ${n(c2[1])} ${n(at[0])} ${n(at[1])}`,
      );
      backEnds.unshift(start);
      at = start;
      current = prev;
    }
    const begin = backEnds[0] ?? j.from;
    const out = [
      `M${n(begin[0])} ${n(begin[1])}`,
      ...back,
      `C${n(j.c1[0])} ${n(j.c1[1])} ${n(j.c2[0])} ${n(j.c2[1])} ${n(j.to[0])} ${n(j.to[1])}`,
    ];
    walk(i, j.to, out);
    paths.push(out);
  });

  // The longest few: minimal, three or four noodles across the card.
  const chosen = paths
    .sort((x, y) => y.length - x.length)
    .slice(0, 3 + (p % 2));
  const [a, b] = spec.colors;
  const gradients: CoverGradient[] = [
    {
      id: 'n0',
      x1: 0,
      y1: 0,
      x2: 100,
      y2: 100,
      stops: [
        [0, a],
        [1, b],
      ],
    },
    {
      id: 'n1',
      x1: 100,
      y1: 0,
      x2: 0,
      y2: 100,
      stops: [
        [0, shade(b, 0.06)],
        [1, shade(a, -0.1)],
      ],
    },
  ];
  const shapes: CoverShape[] = [];
  chosen.reverse().forEach((parts, i) => {
    const d = parts.join('');
    shapes.push({ d, stroke: PAPER, strokeWidth: 7.5 });
    shapes.push({ d, stroke: `@n${i % 2}`, strokeWidth: 4.5 });
  });
  return {
    kind: 'svg',
    background: PAPER,
    gradients,
    shapes,
    bytes: shapes.reduce((sum, s) => sum + s.d.length, 0),
  };
}
