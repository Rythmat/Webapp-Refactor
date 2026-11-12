// ── Writing shapes as compact SVG path data ────────────────────────────────
// One decimal is a tenth of a percent of the card: finer than a pixel on any
// card the app draws. Arcs are SVG `A` commands, so a circle costs two.

/** A number to one decimal, without a trailing ".0" or a leading "0". */
export const n = (v: number): string => {
  const r = Math.round(v * 10) / 10;
  const s = (Object.is(r, -0) ? 0 : r).toString();
  return s.startsWith('0.')
    ? s.slice(1)
    : s.startsWith('-0.')
      ? `-${s.slice(2)}`
      : s;
};

export type Pt = readonly [number, number];

export const M = ([x, y]: Pt) => `M${n(x)} ${n(y)}`;
export const L = ([x, y]: Pt) => `L${n(x)} ${n(y)}`;
/** An arc of radius r to a point; sweep 1 is clockwise on screen. */
export const A = (r: number, [x, y]: Pt, sweep: 0 | 1, large: 0 | 1 = 0) =>
  `A${n(r)} ${n(r)} 0 ${large} ${sweep} ${n(x)} ${n(y)}`;

/**
 * A full circle, as two half-circle arcs. Its centre and radius are rounded
 * first and its ends found from them, so the ends sit exactly a diameter
 * apart (owner, 2026-11-05: sharp tips). Rounded apart, a 2.78 radius
 * became 2.8 while its ends came 5.5 apart: each arc fell short of a half,
 * and the dots drew as lemons with points at their sides.
 */
export const circle = (cx: number, cy: number, r: number) => {
  const tenths = (v: number) => Math.round(v * 10);
  const x = tenths(cx);
  const y = tenths(cy);
  const rr = Math.max(1, tenths(r));
  const at = (v: number) => n(v / 10);
  const arc = (to: number) => `A${at(rr)} ${at(rr)} 0 0 1 ${at(to)} ${at(y)}`;
  return `M${at(x - rr)} ${at(y)}${arc(x + rr)}${arc(x - rr)}Z`;
};

/** A polygon through its points. */
export const polygon = (points: readonly Pt[]) =>
  points.length
    ? `${M(points[0])}${points
        .slice(1)
        .map((p) => L(p))
        .join('')}Z`
    : '';

/** A rectangle. */
export const rect = (x: number, y: number, w: number, h: number) =>
  polygon([
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ]);

/** Rotates a point a number of quarter turns about a centre. */
export function turn([x, y]: Pt, quarters: number, cx: number, cy: number): Pt {
  const q = ((quarters % 4) + 4) % 4;
  const dx = x - cx;
  const dy = y - cy;
  if (q === 1) return [cx - dy, cy + dx];
  if (q === 2) return [cx - dx, cy - dy];
  if (q === 3) return [cx + dy, cy - dx];
  return [x, y];
}
