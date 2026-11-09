// ── Lines into SVG paths ───────────────────────────────────────────────────
// A cover is hundreds of smooth lines, so the path data is kept small:
// Catmull-Rom curves written as relative cubics, one decimal, no needless
// zeros or spaces ("c1.2-.5 3 .4" rather than "C 1.20 -0.50 ...").

export interface Point {
  x: number;
  y: number;
}

/** One line of a cover: a smooth curve through points, or a circle. */
export type ArtLine =
  | { points: Point[]; closed: boolean; band: number }
  | { circle: { cx: number; cy: number; r: number }; band: number };

/** A number at one decimal, as short as it writes: 0.5 → ".5", 2.0 → "2". */
export function fmt(n: number): string {
  const r = Math.round(n * 10) / 10;
  if (Object.is(r, -0) || r === 0) return '0';
  const s = String(r);
  if (s.startsWith('0.')) return s.slice(1);
  if (s.startsWith('-0.')) return `-${s.slice(2)}`;
  return s;
}

/** Numbers joined as SVG allows: no space before a minus sign. */
export function joinNumbers(values: readonly number[]): string {
  let out = '';
  for (const v of values) {
    const s = fmt(v);
    if (out === '' || s.startsWith('-')) out += s;
    else if (s.startsWith('.') && /\.\d*$/.test(out)) out += s;
    else out += ` ${s}`;
  }
  return out;
}

/**
 * A Catmull-Rom curve through `points` as relative cubic segments. Closed,
 * it wraps round and ends where it began.
 */
export function curvePath(points: readonly Point[], closed: boolean): string {
  const n = points.length;
  if (n < 2) return '';
  const at = (i: number): Point =>
    closed
      ? points[((i % n) + n) % n]
      : points[Math.min(n - 1, Math.max(0, i))];
  // Round as we go, and measure each step from the rounded point, so the
  // rounding never accumulates along a line.
  const round = (v: number) => Math.round(v * 10) / 10;
  let px = round(at(0).x);
  let py = round(at(0).y);
  let d = `M${joinNumbers([px, py])}`;
  const segments = closed ? n : n - 1;
  for (let i = 0; i < segments; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    const ex = round(p2.x);
    const ey = round(p2.y);
    d += `c${joinNumbers([c1x - px, c1y - py, c2x - px, c2y - py, ex - px, ey - py])}`;
    px = ex;
    py = ey;
  }
  return closed ? `${d}z` : d;
}

/** A circle as two arcs: a few bytes instead of a curve's many. */
export function circlePath(cx: number, cy: number, r: number): string {
  return `M${joinNumbers([cx - r, cy])}a${joinNumbers([r, r, 0, 1, 0, 2 * r, 0])}a${joinNumbers([r, r, 0, 1, 0, -2 * r, 0])}`;
}

export function linePath(line: ArtLine): string {
  return 'circle' in line
    ? circlePath(line.circle.cx, line.circle.cy, line.circle.r)
    : curvePath(line.points, line.closed);
}
