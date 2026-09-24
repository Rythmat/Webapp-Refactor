/** Bars per system on a lead sheet. */
export const MEASURES_PER_SYSTEM = 4;

/**
 * How a run of bars breaks into systems: rows of four, with a leftover one or
 * two bars (a second ending, a turnaround) folded into the row before as a
 * five- or six-bar system rather than left on a line of its own. A leftover
 * three stays a short row. The bars of a wider system are narrower; staff
 * height never changes.
 */
export function systemRowSizes(
  barCount: number,
  perRow: number = MEASURES_PER_SYSTEM,
): number[] {
  const sizes: number[] = [];
  for (let i = 0; i < barCount; i += perRow)
    sizes.push(Math.min(perRow, barCount - i));
  const last = sizes[sizes.length - 1];
  if (sizes.length > 1 && last <= 2 && last < perRow) {
    sizes.pop();
    sizes[sizes.length - 1] += last;
  }
  return sizes;
}
