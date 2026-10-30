/** A linear scale from a domain to a range, and back. */
export interface Linear {
  (value: number): number;
  invert(px: number): number;
}

export function linear(d0: number, d1: number, r0: number, r1: number): Linear {
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  const scale = ((v: number) => r0 + (v - d0) * k) as Linear;
  scale.invert = (px: number) => (k === 0 ? d0 : d0 + (px - r0) / k);
  return scale;
}

/** A round top for a count axis: 1, 2, 5, 10, 20, 50… at or above `max`. */
export function niceMax(max: number): number {
  if (max <= 0) return 1;
  const step = 10 ** Math.floor(Math.log10(max));
  for (const m of [1, 2, 5, 10]) if (m * step >= max) return m * step;
  return 10 * step;
}
