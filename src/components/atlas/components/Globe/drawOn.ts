import type { Position } from 'geojson';

/**
 * Links drawing themselves on when a stop lands, as the network reference's
 * do. MapLibre has no line-trim, so each frame the drawing links are cut to
 * how far they have got (sliceLine) and fed to a source of their own; when
 * all are drawn the full links take over.
 */

/** The whole draw, and one link's share of it. */
export const DRAW_MS = { total: 850, perLink: 520 } as const;

const dist = (a: Position, b: Position) => {
  // Degrees, with longitude shrunk by latitude: enough to share time out.
  const k = Math.cos((((a[1] + b[1]) / 2) * Math.PI) / 180);
  return Math.hypot((b[0] - a[0]) * k, b[1] - a[1]);
};

/** A line's length, in the same rough degrees. */
export function lineLength(coords: readonly Position[]): number {
  let total = 0;
  for (let i = 1; i < coords.length; i++)
    total += dist(coords[i - 1], coords[i]);
  return total;
}

/**
 * The first `f` (0–1) of a line, or with `fromEnd` its last `f`: a link
 * that comes into the stop draws from the stop's end, back toward where it
 * came from, so every link grows out of the stop.
 */
export function sliceLine(
  coords: readonly Position[],
  f: number,
  fromEnd = false,
): Position[] {
  if (coords.length < 2 || f >= 1) return coords.map((c) => [...c]);
  const line = fromEnd ? [...coords].reverse() : [...coords];
  const want = Math.max(0, f) * lineLength(line);
  const out: Position[] = [[...line[0]]];
  let run = 0;
  for (let i = 1; i < line.length; i++) {
    const d = dist(line[i - 1], line[i]);
    if (run + d >= want) {
      const t = d === 0 ? 0 : (want - run) / d;
      out.push([
        line[i - 1][0] + (line[i][0] - line[i - 1][0]) * t,
        line[i - 1][1] + (line[i][1] - line[i - 1][1]) * t,
      ]);
      break;
    }
    out.push([...line[i]]);
    run += d;
  }
  // A line needs two points, even at the start of its draw.
  if (out.length < 2) out.push([...out[0]]);
  return fromEnd ? out.reverse() : out;
}

/**
 * When each link starts drawing, in ms: the nearest first, the farthest
 * starting last, so the network spreads outward from the stop.
 */
export function drawOnPlan(
  lengths: readonly number[],
  ms: { total: number; perLink: number } = DRAW_MS,
): number[] {
  const spread = Math.max(0, ms.total - ms.perLink);
  const order = lengths
    .map((len, i) => ({ len, i }))
    .sort((a, b) => a.len - b.len || a.i - b.i);
  const delays = new Array<number>(lengths.length).fill(0);
  order.forEach(({ i }, rank) => {
    delays[i] = order.length > 1 ? (spread * rank) / (order.length - 1) : 0;
  });
  return delays;
}

/** How far along a link is at `t` ms, eased out: 0 before its start. */
export function drawProgress(
  t: number,
  delay: number,
  perLink = DRAW_MS.perLink,
): number {
  const p = Math.min(1, Math.max(0, (t - delay) / perLink));
  return 1 - (1 - p) ** 3;
}
