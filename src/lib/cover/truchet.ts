import { echoRandom } from '@/curriculum/engine/echo/random';
import { PAPER, shade } from './color';
import { A, circle, L, M, turn, type Pt } from './path';
import type {
  CoverDetail,
  CoverScene,
  CoverShape,
  CoverSpec,
  TruchetLayout,
  TruchetTiles,
} from './types';

// ── Carlson's winged Truchet tiles ─────────────────────────────────────────
// The owner's references (~/Desktop/References/truchet patterns:
// scaledtiles.png, wingedtileassembly.png), after Christopher Carlson's
// multi-scale Truchet patterns, drawn as Oliver Steele's notebook draws them
// (@osteele/truchet-carlson-tiles). A tile of size s:
//   - its centre motif: bands s/3 wide joining edge midpoints (arcs about a
//     corner at radius s/2, or straight across), in the ink;
//   - a "wing" disc of radius s/3 on every corner, in the paper;
//   - a disc of radius s/6 on every edge midpoint, in the ink.
// The wings reach past the tile, so neighbours always join in round shapes.
// A tile may split into four of half the size with ink and paper swapped,
// drawn on top: the joins stay whole at every scale, and the small tiles'
// corner wings leave the references' dots.
//
// The music drives it: the scale's steps, read cell by cell, choose each
// motif (a whole step one diagonal, a half step the other), and a cell splits
// where its place round the fifths is a note of the scale.

const T = 1 / 3;

/** The card under the assembly, and the tiles' paper, a shade lighter. */
export const CARD = '#0f0f12';
export const TILE_PAPER = shade(PAPER, 0.025);

/** Steele's quiet motifs: two diagonals of arcs, two lines, dots, and solid. */
export type Motif = '\\' | '/' | '-' | '|' | '+.' | 'x.';

type Cmd =
  | { m: Pt }
  | { l: Pt }
  | { a: Pt; r: number; sweep: 0 | 1 }
  | { z: true };

/** A band about the top-left corner: radius 1/3 to 2/3, edge to edge. */
const ARC_TOP_LEFT: Cmd[] = [
  { m: [2 * T, 0] },
  { a: [0, 2 * T], r: 2 * T, sweep: 1 },
  { l: [0, T] },
  { a: [T, 0], r: T, sweep: 0 },
  { z: true },
];

const turned = (cmds: Cmd[], q: number): Cmd[] =>
  cmds.map((c) => {
    if ('m' in c) return { m: turn(c.m, q, 0.5, 0.5) };
    if ('l' in c) return { l: turn(c.l, q, 0.5, 0.5) };
    if ('a' in c) return { ...c, a: turn(c.a, q, 0.5, 0.5) };
    return c;
  });

const LINE_ACROSS: Cmd[] = [
  { m: [0, T] },
  { l: [1, T] },
  { l: [1, 2 * T] },
  { l: [0, 2 * T] },
  { z: true },
];

/** Each motif's bands in a unit tile (Steele's names). */
const BANDS: Readonly<Record<Motif, Cmd[]>> = {
  // Arcs about the top-right and bottom-left corners.
  '\\': [...turned(ARC_TOP_LEFT, 1), ...turned(ARC_TOP_LEFT, 3)],
  // About the top-left and bottom-right.
  '/': [...ARC_TOP_LEFT, ...turned(ARC_TOP_LEFT, 2)],
  '-': LINE_ACROSS,
  '|': turned(LINE_ACROSS, 1),
  '+.': [],
  'x.': [
    { m: [0, 0] },
    { l: [1, 0] },
    { l: [1, 1] },
    { l: [0, 1] },
    { z: true },
  ],
};

/** A motif's bands in a unit tile, for the geometry test. */
export const motifBands = (motif: Motif): readonly Cmd[] => BANDS[motif];

/** Room round the assembly, in tiles: enough for the corner wings. */
export const MARGIN = 0.5;

/** The wings: corner discs of a third, edge discs of a sixth. */
export const WING = { corner: T, edge: 1 / 6 } as const;

export interface TruchetCell {
  x: number;
  y: number;
  s: number;
  level: number;
  motif: Motif;
}

/** The motif a step draws, by the cover's choice of tiles. */
const motifForStep = (
  step: string,
  k: number,
  tiles: TruchetTiles = 'arcs',
): Motif => {
  const line: Motif = k % 2 ? '-' : '|';
  if (step === 'W') return tiles === 'lines' ? '|' : '\\';
  if (step === 'H') {
    if (tiles === 'lines') return '-';
    if (tiles === 'mixed') return line;
    if (tiles === 'dots') return '+.';
    return '/';
  }
  if (step === '1½') return tiles === 'lines' ? '/' : line;
  return '+.';
};

// ── Symmetry (owner, 2026-11-05: "more symmetry") ──────────────────────────
// Every layout is a symmetry group of the square: a cell's motif is chosen
// once for its whole orbit, and each of the group's moves carries it, turned
// or mirrored, to the orbit's other cells. A cell a move leaves where it is
// (on a mirror's axis, at a pinwheel's centre) takes a motif that move
// leaves alone. Splits come in whole orbits, and the half-size tiles inside
// them follow the same group on the finer grid, so the pattern stays
// symmetric at every scale.

/** A move of the square: where it sends a cell of an n-grid, and what it
 *  does to a motif (mirrors and quarter turns swap the diagonals; quarter
 *  turns and diagonal mirrors swap the lines). */
interface Move {
  at: (i: number, j: number, n: number) => [number, number];
  swapDiagonals: boolean;
  swapLines: boolean;
}

const move = (
  at: Move['at'],
  swapDiagonals: boolean,
  swapLines: boolean,
): Move => ({ at, swapDiagonals, swapLines });

const IDENTITY = move((i, j) => [i, j], false, false);
const MIRROR_X = move((i, j, n) => [n - 1 - i, j], true, false);
const MIRROR_Y = move((i, j, n) => [i, n - 1 - j], true, false);
const HALF_TURN = move((i, j, n) => [n - 1 - i, n - 1 - j], false, false);
const QUARTER = move((i, j, n) => [n - 1 - j, i], true, true);
const THREE_QUARTER = move((i, j, n) => [j, n - 1 - i], true, true);
const DIAGONAL = move((i, j) => [j, i], false, true);
const ANTI_DIAGONAL = move((i, j, n) => [n - 1 - j, n - 1 - i], false, true);

/** Each layout's group. */
const GROUP: Readonly<Record<TruchetLayout, readonly Move[]>> = {
  // Mirrored left to right and top to bottom: a mandala.
  mirror: [IDENTITY, MIRROR_X, MIRROR_Y, HALF_TURN],
  'mirror-dots': [IDENTITY, MIRROR_X, MIRROR_Y, HALF_TURN],
  // Every mirror and turn of the square: a kaleidoscope.
  kaleido: [
    IDENTITY,
    MIRROR_X,
    MIRROR_Y,
    HALF_TURN,
    QUARTER,
    THREE_QUARTER,
    DIAGONAL,
    ANTI_DIAGONAL,
  ],
  // Mirrored across both diagonals.
  diagonal: [IDENTITY, DIAGONAL, ANTI_DIAGONAL, HALF_TURN],
  // Turned a quarter at a time: a pinwheel.
  pinwheel: [IDENTITY, QUARTER, HALF_TURN, THREE_QUARTER],
  'pinwheel-lines': [IDENTITY, QUARTER, HALF_TURN, THREE_QUARTER],
};

/** A motif after a move. */
const moved = (motif: Motif, m: Move): Motif => {
  if (m.swapDiagonals && motif === '\\') return '/';
  if (m.swapDiagonals && motif === '/') return '\\';
  if (m.swapLines && motif === '-') return '|';
  if (m.swapLines && motif === '|') return '-';
  return motif;
};

/** What a cell its own moves leave in place may draw, first choice first. */
const STILL: readonly Motif[] = ['|', '-', '\\', '/', '+.'];

/** The moves of a layout's group, exported for the symmetry test. */
export const truchetGroup = (layout: TruchetLayout) => GROUP[layout];
/** A motif after a move, exported for the symmetry test. */
export const truchetMoved = moved;

/**
 * Fills the cells of an n-grid that `inside` admits, an orbit at a time:
 * `pick` chooses each orbit's motif, which the group carries round it.
 */
function fillSymmetric(
  n: number,
  group: readonly Move[],
  inside: (i: number, j: number) => boolean,
  pick: () => Motif,
): Map<string, Motif> {
  const out = new Map<string, Motif>();
  for (let j = 0; j < n; j += 1) {
    for (let i = 0; i < n; i += 1) {
      if (!inside(i, j) || out.has(`${i},${j}`)) continue;
      const stays = group.filter((m) => {
        const [p, q] = m.at(i, j, n);
        return p === i && q === j;
      });
      const keeps = (motif: Motif) =>
        stays.every((m) => moved(motif, m) === motif);
      let motif = pick();
      if (!keeps(motif)) motif = STILL.find(keeps) ?? '+.';
      for (const m of group) {
        const [p, q] = m.at(i, j, n);
        const key = `${p},${q}`;
        if (!out.has(key)) out.set(key, moved(motif, m));
      }
    }
  }
  return out;
}

/** The cells of an orbit, as keys. */
const orbitOf = (
  i: number,
  j: number,
  n: number,
  group: readonly Move[],
): string[] => [
  ...new Set(
    group.map((m) => {
      const [p, q] = m.at(i, j, n);
      return `${p},${q}`;
    }),
  ),
];

/** Which tile goes where, before drawing: exported for the tests. */
export function planTruchet(
  spec: Extract<CoverSpec, { family: 'truchet' }>,
  detail: CoverDetail,
): { cells: TruchetCell[]; grid: number; s: number } {
  const rng = echoRandom(`cover:carlson:${spec.seed}`);
  const steps = spec.steps.length ? spec.steps : ['W'];
  const base = spec.grid ?? (spec.pcs.length >= 7 ? 4 : 3);
  const grid = Math.min(base + (detail === 'hero' ? 1 : 0), 5);
  // Centred with room round it for the wings, as in the reference
  // assembly: the paper's corner wings show as round bulges at its edge.
  const s = 100 / (grid + 2 * MARGIN);
  const margin = s * MARGIN;
  const layout: TruchetLayout = spec.layout;
  const group = GROUP[layout] ?? GROUP.mirror;

  // The steps, read round the scale, an orbit at a time.
  let k = 0;
  const nextMotif = (): Motif => {
    const motif = motifForStep(steps[k % steps.length], k, spec.tiles);
    k += 1;
    return motif;
  };
  const pick = (): Motif => {
    const motif = nextMotif();
    if (layout === 'mirror-dots' && rng() < 0.3) return '+.';
    if (layout === 'pinwheel-lines' && rng() < 0.25) return '|';
    return motif;
  };
  const motifs = fillSymmetric(grid, group, () => true, pick);

  // Interior orbits with a cell whose place round the fifths is in the
  // scale may split, a whole orbit at once: one, never a border cell.
  const notes = new Set(spec.pcs.map((pc) => ((pc % 12) + 12) % 12));
  const interior = (i: number, j: number) =>
    i > 0 && j > 0 && i < grid - 1 && j < grid - 1;
  const orbits: string[][] = [];
  const seen = new Set<string>();
  for (let j = 1; j < grid - 1; j += 1) {
    for (let i = 1; i < grid - 1; i += 1) {
      if (seen.has(`${i},${j}`)) continue;
      const orbit = orbitOf(i, j, grid, group);
      orbit.forEach((key) => seen.add(key));
      const sounds = orbit.some((key) => {
        const [p, q] = key.split(',').map(Number);
        return notes.has(((q * grid + p) * 7) % 12);
      });
      if (sounds && orbit.every((key) => interior(...toCell(key)))) {
        orbits.push(orbit);
      }
    }
  }
  for (let n = orbits.length - 1; n > 0; n -= 1) {
    const r = Math.floor(rng() * (n + 1));
    [orbits[n], orbits[r]] = [orbits[r], orbits[n]];
  }
  // A cover may name its split instead: the orbit nearest the centre, the
  // one farthest from it, or none.
  const fromCentre = (orbit: string[]) => {
    const [i, j] = toCell(orbit[0]);
    const c = (grid - 1) / 2;
    return Math.max(Math.abs(i - c), Math.abs(j - c));
  };
  const named = [...allInterior(grid, group)].sort(
    (a, b) => fromCentre(a) - fromCentre(b),
  );
  const chosen =
    spec.split === 'none'
      ? []
      : spec.split === 'centre'
        ? named.slice(0, 1)
        : spec.split === 'ring'
          ? named.length > 1
            ? named.slice(-1)
            : []
          : orbits.slice(0, 1);
  const splits = new Set(chosen.flat());

  const childPick = (): Motif => {
    const motif = nextMotif();
    return motif === '+.' && rng() < 0.5 ? '\\' : motif;
  };
  // The half-size tiles: the same group on the grid twice as fine.
  const fine = fillSymmetric(
    grid * 2,
    group,
    (i, j) => splits.has(`${i >> 1},${j >> 1}`),
    childPick,
  );
  // The hero splits one orbit of them again, a quarter the size.
  let finest = new Map<string, Motif>();
  const deeper = new Set<string>();
  if (detail === 'hero' && fine.size) {
    const keys = [...fine.keys()];
    const [fi, fj] = toCell(keys[Math.floor(rng() * keys.length)]);
    orbitOf(fi, fj, grid * 2, group).forEach((key) => deeper.add(key));
    finest = fillSymmetric(
      grid * 4,
      group,
      (i, j) => deeper.has(`${i >> 1},${j >> 1}`),
      childPick,
    );
  }

  const cells: TruchetCell[] = [];
  for (let j = 0; j < grid; j += 1) {
    for (let i = 0; i < grid; i += 1) {
      const x = margin + i * s;
      const y = margin + j * s;
      if (!splits.has(`${i},${j}`)) {
        cells.push({ x, y, s, level: 0, motif: motifs.get(`${i},${j}`)! });
        continue;
      }
      const h = s / 2;
      for (const [di, dj] of [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ]) {
        const fi = i * 2 + di;
        const fj = j * 2 + dj;
        if (deeper.has(`${fi},${fj}`)) {
          const g = h / 2;
          for (const [ei, ej] of [
            [0, 0],
            [1, 0],
            [0, 1],
            [1, 1],
          ]) {
            cells.push({
              x: x + di * h + ei * g,
              y: y + dj * h + ej * g,
              s: g,
              level: 2,
              motif: finest.get(`${fi * 2 + ei},${fj * 2 + ej}`)!,
            });
          }
          continue;
        }
        cells.push({
          x: x + di * h,
          y: y + dj * h,
          s: h,
          level: 1,
          motif: fine.get(`${fi},${fj}`)!,
        });
      }
    }
  }
  return { cells, grid, s };
}

const toCell = (key: string) => key.split(',').map(Number) as [number, number];

/** Every orbit of the grid's interior cells. */
function allInterior(grid: number, group: readonly Move[]): string[][] {
  const out: string[][] = [];
  const seen = new Set<string>();
  for (let j = 1; j < grid - 1; j += 1) {
    for (let i = 1; i < grid - 1; i += 1) {
      if (seen.has(`${i},${j}`)) continue;
      const orbit = orbitOf(i, j, grid, group);
      orbit.forEach((key) => seen.add(key));
      if (
        orbit.every((key) => {
          const [p, q] = toCell(key);
          return p > 0 && q > 0 && p < grid - 1 && q < grid - 1;
        })
      ) {
        out.push(orbit);
      }
    }
  }
  return out;
}

function bandsPath(cell: TruchetCell): string {
  const at = ([u, v]: Pt): Pt => [cell.x + u * cell.s, cell.y + v * cell.s];
  return BANDS[cell.motif]
    .map((c) => {
      if ('m' in c) return M(at(c.m));
      if ('l' in c) return L(at(c.l));
      if ('a' in c) return A(c.r * cell.s, at(c.a), c.sweep);
      return 'Z';
    })
    .join('');
}

const square = ({ x, y, s }: TruchetCell) =>
  `${M([x, y])}${L([x + s, y])}${L([x + s, y + s])}${L([x, y + s])}Z`;

export function buildTruchet(
  spec: Extract<CoverSpec, { family: 'truchet' }>,
  detail: CoverDetail,
): CoverScene {
  const { cells } = planTruchet(spec, detail);
  const INK = '@ink';
  // Ink and paper swap at each scale (Carlson): paper first, at level 0. The
  // paper is a shade lighter than the card, so its wings read at the edge.
  // An inverted cover starts the other way round: the gradient's tiles, the
  // motifs cut out in paper.
  const flip = spec.invert ? 1 : 0;
  const paper = (level: number) => ((level + flip) % 2 ? INK : TILE_PAPER);
  const ink = (level: number) => ((level + flip) % 2 ? TILE_PAPER : INK);

  const layers: { fill: string; parts: string[] }[] = [];
  const add = (fill: string, parts: string[]) => {
    // Neighbours share corners and edges: each disc is drawn once.
    const drawn = [...new Set(parts.filter(Boolean))];
    if (!drawn.length) return;
    const last = layers[layers.length - 1];
    // Neighbouring layers of one colour merge into one path.
    if (last && last.fill === fill) last.parts.push(...drawn);
    else layers.push({ fill, parts: drawn });
  };

  const levels = [...new Set(cells.map((c) => c.level))].sort((a, b) => a - b);
  for (const level of levels) {
    const here = cells.filter((c) => c.level === level);
    // Steele's order, layer by layer: the squares in paper, the motifs in
    // ink, the corner wings in paper, the edge wings in ink.
    add(paper(level), here.map(square));
    add(ink(level), here.map(bandsPath));
    add(
      paper(level),
      here.flatMap(({ x, y, s }) => [
        circle(x, y, s * WING.corner),
        circle(x + s, y, s * WING.corner),
        circle(x, y + s, s * WING.corner),
        circle(x + s, y + s, s * WING.corner),
      ]),
    );
    add(
      ink(level),
      here.flatMap(({ x, y, s }) => [
        circle(x + s / 2, y, s * WING.edge),
        circle(x + s, y + s / 2, s * WING.edge),
        circle(x + s / 2, y + s, s * WING.edge),
        circle(x, y + s / 2, s * WING.edge),
      ]),
    );
  }
  const [a, b] = spec.colors;
  const shapes: CoverShape[] = layers.map(({ fill, parts }) => ({
    d: parts.join(''),
    fill,
  }));
  return {
    kind: 'svg',
    background: CARD,
    gradients: [
      {
        id: 'ink',
        x1: 0,
        y1: 0,
        x2: 100,
        y2: 100,
        stops: [
          [0, a],
          [1, b],
        ],
      },
    ],
    shapes,
    bytes: shapes.reduce((sum, shape) => sum + shape.d.length, 0),
  };
}
