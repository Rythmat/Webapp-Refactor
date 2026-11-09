// ── The EQ's graph as its box shrinks (owner, 2026-10-22) ──────────────────
//
// Filling its box (GraphicEQ's `fill`: the dock's EQ card, the expanded
// EQ), the graph is drawn 1:1, so its numbers and band nodes kept their size
// while a lower dock squeezed the plot under them. As the box gets shorter
// the nodes scale down, and below a height the numbers (the dB and Hz scale,
// the band numbers in the nodes) go: at the 12 px text floor they'd only
// crowd the curve. A hovered band still says its frequency, gain and Q.

/** Below this graph height, the EQ shows no numbers. */
export const EQ_NUMBERS_MIN_H = 170;

/** The node scale at full size and at its smallest. */
export const EQ_NODE_SCALE_MAX = 1.5;
export const EQ_NODE_SCALE_MIN = 0.9;

/** The graph heights the node scale runs between. */
const SCALE_FULL_H = 210;
const SCALE_MIN_H = 100;

/** Whether a filling EQ `h` px tall shows its numbers. */
export function eqShowsNumbers(h: number): boolean {
  return h >= EQ_NUMBERS_MIN_H;
}

/** The band nodes' scale for a filling EQ `h` px tall (r = 7 × scale). */
export function eqNodeScale(h: number): number {
  const t = (h - SCALE_MIN_H) / (SCALE_FULL_H - SCALE_MIN_H);
  const clamped = Math.max(0, Math.min(1, t));
  return EQ_NODE_SCALE_MIN + clamped * (EQ_NODE_SCALE_MAX - EQ_NODE_SCALE_MIN);
}
