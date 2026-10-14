/**
 * Where the place river's lanes run, in screen space: Dorot's fan. Every lane
 * leaves one source at the left edge; a continent's lane reaches its own
 * height at the first split, a region's at the second, a city's at the third,
 * and from there each runs straight to the right edge, with the years laid
 * along it. Siblings travel together until their split — one band, brighter
 * where they overlap — then part, each into its own colour.
 */
export interface FanLane {
  id: string;
  /** 1 a continent, 2 a region, 3 a city. */
  depth: number;
  /** The lanes it split from, continent first (its own id excluded). */
  ancestors: readonly string[];
  /** Its own colour, and its parent's (the fan shades from one to the other). */
  color: string;
  parentColor: string;
}

export interface FanOptions {
  width: number;
  height: number;
  gap: number;
  /** A lane's thickness at most and at least. */
  maxLane: number;
  minLane: number;
  /** Where each split ends, from the source: [first, second, third]. */
  stages: readonly [number, number, number];
  /** The lanes' thickness at the source, as a share of their own. */
  sourceShare: number;
}

export interface LaneGeometry {
  id: string;
  depth: number;
  /** Its centre line's height at the source and at the end of each split. */
  stops: number[];
  /** Its height after its last split. */
  y: number;
  thickness: number;
  color: string;
  parentColor: string;
}

export interface FanLayout {
  lanes: LaneGeometry[];
  /** Where the straight runs (and the years) begin: after the deepest split. */
  plotLeft: number;
  thickness: number;
  sourceY: number;
  stages: readonly number[];
}

export function layoutFan(lanes: readonly FanLane[], o: FanOptions): FanLayout {
  const n = Math.max(lanes.length, 1);
  const thickness = Math.max(
    o.minLane,
    Math.min(o.maxLane, (o.height - o.gap * (n - 1)) / n),
  );
  const total = n * thickness + (n - 1) * o.gap;
  const top = (o.height - total) / 2;
  const sourceY = o.height / 2;
  const y = new Map<string, number>();
  lanes.forEach((lane, i) =>
    y.set(lane.id, top + i * (thickness + o.gap) + thickness / 2),
  );
  // A split place's height is the middle of its lanes'.
  const span = new Map<string, [number, number]>();
  for (const lane of lanes) {
    const own = y.get(lane.id)!;
    for (const a of lane.ancestors) {
      const [lo, hi] = span.get(a) ?? [own, own];
      span.set(a, [Math.min(lo, own), Math.max(hi, own)]);
    }
  }
  const middle = (id: string) => {
    const [lo, hi] = span.get(id)!;
    return (lo + hi) / 2;
  };
  const deepest = Math.max(1, ...lanes.map((l) => l.depth));
  return {
    lanes: lanes.map((lane) => {
      const own = y.get(lane.id)!;
      const stops = [sourceY];
      for (let d = 1; d <= 3; d++) {
        stops.push(d < lane.depth ? middle(lane.ancestors[d - 1]) : own);
      }
      return {
        id: lane.id,
        depth: lane.depth,
        stops,
        y: own,
        thickness,
        color: lane.color,
        parentColor: lane.parentColor,
      };
    }),
    plotLeft: o.stages[deepest - 1] + 12,
    thickness,
    sourceY,
    stages: [0, ...o.stages],
  };
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * A lane's centre line and thickness at screen x: S-curves between its
 * stops, straight after its last split. Pure, so the split animation can
 * tween stops and draw any frame.
 */
export function laneAt(
  stops: readonly number[],
  stages: readonly number[],
  depth: number,
  thickness: number,
  sourceShare: number,
  x: number,
): { y: number; t: number } {
  const end = stages[depth];
  if (x >= end) return { y: stops[stops.length - 1], t: thickness };
  let i = 0;
  while (i < stages.length - 2 && x > stages[i + 1]) i++;
  const k = smooth((x - stages[i]) / (stages[i + 1] - stages[i] || 1));
  const y = stops[i] + (stops[i + 1] - stops[i]) * k;
  const grow = Math.min(1, x / (end || 1));
  return { y, t: thickness * (sourceShare + (1 - sourceShare) * smooth(grow)) };
}

/** Samples along each split, for the band outlines. */
const SAMPLES = 18;

/**
 * A lane's band, as two paths: the fan (source to its last split, shaded
 * from its parent's colour to its own) and the run (straight to `right`).
 */
export function lanePaths(
  g: Pick<LaneGeometry, 'stops' | 'depth' | 'thickness'>,
  stages: readonly number[],
  sourceShare: number,
  right: number,
): { fan: string; run: string; strand: string } {
  const end = stages[g.depth];
  const xs: number[] = [];
  for (let s = 0; s < g.depth; s++) {
    for (let k = 0; k < SAMPLES; k++) {
      xs.push(stages[s] + ((stages[s + 1] - stages[s]) * k) / SAMPLES);
    }
  }
  xs.push(end);
  const pts = xs.map((x) => ({
    x,
    ...laneAt(g.stops, stages, g.depth, g.thickness, sourceShare, x),
  }));
  const f = (v: number) => v.toFixed(1);
  const topEdge = pts.map((p) => `${f(p.x)},${f(p.y - p.t / 2)}`);
  const bottomEdge = pts.map((p) => `${f(p.x)},${f(p.y + p.t / 2)}`).reverse();
  const y = g.stops[g.stops.length - 1];
  const h = g.thickness / 2;
  // The run starts a pixel inside the fan so no seam shows between them.
  return {
    fan: `M${topEdge.join('L')}L${bottomEdge.join('L')}Z`,
    run: `M${f(end - 1)},${f(y - h)}L${f(right)},${f(y - h)}L${f(right)},${f(y + h)}L${f(end - 1)},${f(y + h)}Z`,
    strand: `M${pts.map((p) => `${f(p.x)},${f(p.y)}`).join('L')}L${f(right)},${f(y)}`,
  };
}

/** Linear blend of two equal-length vectors, for the split animation. */
export const mix = (a: readonly number[], b: readonly number[], k: number) =>
  a.map((v, i) => v + ((b[i] ?? v) - v) * k);
