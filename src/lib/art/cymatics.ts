// ── Cymatics ───────────────────────────────────────────────────────────────
// A Chladni plate's field, its slope, and the sequence of modes a moving
// figure morphs through (owner, 2026-10-28: "clean cymatic images … morph
// between different cymatic oscillations"). Pure: the GPU draws the same
// field per pixel (components/art/cymatics), its lines at their exact
// distance from the curve, so they come out perfectly even; these are its
// reference, its tests' and the SVG fallback's.
//
// A mode (n, m, ±) of a free square plate: f = cos(n·u)·cos(m·v) ±
// cos(m·u)·cos(n·v), with u, v = π × the offset from the plate's centre in
// half-plates, so the plate's edges sit at u, v = ±π. A morph from one mode
// to the next is the blend (1 − a)·f₁ + a·f₂: the plate passing from one
// resonance to another, its sand lines parting and rejoining as they go.

import type { ChladniMode } from './seed';

/** The field at (u, v). */
export const chladniValue = (
  { n, m, sign }: ChladniMode,
  u: number,
  v: number,
): number =>
  Math.cos(n * u) * Math.cos(m * v) + sign * Math.cos(m * u) * Math.cos(n * v);

/** The field's slope at (u, v): [∂f/∂u, ∂f/∂v]. */
export const chladniGradient = (
  { n, m, sign }: ChladniMode,
  u: number,
  v: number,
): [number, number] => [
  -n * Math.sin(n * u) * Math.cos(m * v) -
    sign * m * Math.sin(m * u) * Math.cos(n * v),
  -m * Math.cos(n * u) * Math.sin(m * v) -
    sign * n * Math.cos(m * u) * Math.sin(n * v),
];

const valid = ({ n, m }: ChladniMode) =>
  n >= 1 && n <= 9 && m >= 0 && m < n && (m > 0 || n <= 4);
const same = (a: ChladniMode, b: ChladniMode) =>
  a.n === b.n && a.m === b.m && a.sign === b.sign;

/**
 * The modes a figure moves through, starting from its own: the same plate
 * with the other sign, a neighbouring m, a neighbouring n, so each step is
 * a small change of resonance (lines part and rejoin, never a jump to an
 * unrelated figure). Always its own first; three or four in all.
 */
export function cymaticSequence(home: ChladniMode): ChladniMode[] {
  const flip = (sign: number) => -sign || 1;
  const candidates: ChladniMode[] = [
    { n: home.n, m: home.m + 1, sign: home.sign },
    { n: home.n, m: home.m - 1, sign: home.sign },
    { n: home.n, m: home.m, sign: flip(home.sign) },
    { n: home.n + 1, m: home.m, sign: flip(home.sign) },
    { n: home.n - 1, m: home.m, sign: flip(home.sign) },
  ];
  const out: ChladniMode[] = [home];
  for (const mode of candidates) {
    if (out.length === 4) break;
    if (valid(mode) && !out.some((o) => same(o, mode))) out.push(mode);
  }
  return out;
}

/** How long a figure holds, then how long it takes to become the next (s). */
export const CYMATIC_TIMING = { hold: 3.2, morph: 2.6 } as const;

/** Smoother-step: no jolt at either end of a morph. */
const ease = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);

/**
 * Where a figure is at `t` seconds along a sequence of `count` modes,
 * looping: the mode it is leaving, the one it is becoming, and how far
 * (0 while it holds).
 */
export function morphAt(
  t: number,
  count: number,
  timing: { hold: number; morph: number } = CYMATIC_TIMING,
): { from: number; to: number; mix: number } {
  if (count < 2) return { from: 0, to: 0, mix: 0 };
  const step = timing.hold + timing.morph;
  const at = ((t % (step * count)) + step * count) % (step * count);
  const from = Math.floor(at / step);
  const into = at - from * step;
  const mix =
    into <= timing.hold ? 0 : ease((into - timing.hold) / timing.morph);
  return { from, to: (from + 1) % count, mix };
}

/** A figure's complexity: its lines across, roughly. */
export const complexity = ({ n, m }: ChladniMode): number => n + m / 2;

/**
 * Every figure the Arcade draws (owner, 2026-10-28: "include simple ratios
 * as well"), simplest first: the fundamentals (n = 1: a diamond, an X),
 * the low lattices (n ≤ 4 with m = 0: crosses and grids, not the dense
 * ones that read as one grid scaled), and every n : m up to 9. Up to n = 5
 * each comes in five balances (symmetric, antisymmetric, the plain ratio,
 * and the two between); above, in the two pure ones.
 */
export const CHLADNI_POOL: readonly ChladniMode[] = (() => {
  const out: ChladniMode[] = [];
  for (let n = 1; n <= 9; n++)
    for (let m = 0; m < n; m++) {
      if (m === 0 && n > 4) continue;
      const signs = n <= 5 ? [1, -1, 0.5, -0.5, 0] : [1, -1];
      for (const sign of signs) {
        // (n, 0) with no second term is only parallel lines.
        if (m === 0 && sign === 0) continue;
        out.push({ n, m, sign });
      }
    }
  return out.sort((a, b) => complexity(a) - complexity(b));
})();

const keyOf = ({ n, m, sign }: ChladniMode) => `${n},${m},${sign}`;

/**
 * How far one figure is from a card's own, for choosing its morphs: near
 * resonances morph gently, and simpler ones are preferred, so the page
 * keeps a mix of plain and intricate figures rather than spending the
 * simple ones first.
 */
const distance = (a: ChladniMode, home: ChladniMode) =>
  2 * Math.abs(a.n - home.n) +
  Math.abs(a.m - home.m) +
  0.6 * Math.abs(a.sign - home.sign) +
  0.5 * complexity(a);

export interface FigureSlot {
  /** The card's own key on the page. */
  key: string;
  /** Its game's figure: the card wears it, if no card above has. */
  home: ChladniMode;
  /** How many figures it morphs through. */
  count: number;
}

/**
 * The figures for every card on a page (owner, 2026-10-28: "ensure that
 * no two patterns repeat"): no figure goes to two cards, even when one
 * game shows in two rows. Cards are served in order: each takes its game's
 * own figure if it is still free, then the free figures nearest it (so its
 * morphs stay gentle). If the pool runs dry a card keeps what it got (one
 * figure at the least, repeating only then).
 */
export function allocateFigures(
  slots: readonly FigureSlot[],
): Map<string, ChladniMode[]> {
  const used = new Set<string>();
  // Every game's own figure is kept for its first card: no other card's
  // morphs may borrow it.
  const homes = new Set(slots.map((slot) => keyOf(slot.home)));
  const out = new Map<string, ChladniMode[]>();
  for (const slot of slots) {
    const figures: ChladniMode[] = [];
    const take = (mode: ChladniMode) => {
      used.add(keyOf(mode));
      figures.push(mode);
    };
    if (!used.has(keyOf(slot.home))) take(slot.home);
    const free = CHLADNI_POOL.filter(
      (mode) => !used.has(keyOf(mode)) && !homes.has(keyOf(mode)),
    ).sort((a, b) => distance(a, slot.home) - distance(b, slot.home));
    for (const mode of free) {
      if (figures.length >= slot.count) break;
      take(mode);
    }
    out.set(slot.key, figures.length ? figures : [slot.home]);
  }
  return out;
}
