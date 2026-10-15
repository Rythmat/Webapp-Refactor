import type { TimeWindow } from '@/components/atlas/timeline/timeWindow';

/**
 * Where each lane of the river runs: its centre line and thickness over the
 * years, in "year space" (x in years, y in pixels from the river's top), so
 * the drawing only has to scale x to pan and zoom.
 *
 * Lanes are stacked top to bottom in the order given, and only lanes already
 * flowing take room: before 1900 the river is three lanes thin, by 1973 it is
 * sixteen wide — a delta. A newborn lane grows out of its parent's centre
 * line over `rampYears`, easing into its own place while the lanes around it
 * make room. Lanes that flow into another (Classical into Metal, Rock into
 * Pop) are thin curves of their own: `inflows`.
 */
export interface RiverLaneSpec {
  id: string;
  label: string;
  /** The year it starts to flow. */
  born: number;
  /** The lane it grows out of; null for a source. */
  parent: string | null;
  /** Lanes that flow into it: at its birth or later. */
  inflows: readonly { from: string; year: number }[];
}

export interface RiverLayoutOptions {
  /** The river's height in pixels. */
  height: number;
  /** A grown lane's thickness. */
  laneHeight: number;
  /** The space between grown lanes. */
  gap: number;
  /** How long a newborn lane takes to reach its full thickness. */
  rampYears: number;
  domain: TimeWindow;
}

export interface LaneShape {
  id: string;
  label: string;
  born: number;
  /** Sample years, from the lane's birth to the domain's end. */
  years: number[];
  /** Its centre line at each sample, in px from the top. */
  center: number[];
  /** Half its thickness at each sample. */
  half: number[];
}

export interface InflowShape {
  from: string;
  to: string;
  year: number;
  /** A cubic curve in year space: start, two controls, end. */
  points: [number, number, number, number, number, number, number, number];
}

export interface RiverLayout {
  lanes: LaneShape[];
  inflows: InflowShape[];
  laneHeight: number;
}

/** Samples across each birth's ramp; more is smoother and costs nothing much. */
const RAMP_STEPS = 12;

const smooth = (g: number) => g * g * (3 - 2 * g);

/** How far grown a lane is in a year: 0 unborn or just born, 1 grown. */
function growth(born: number, year: number, ramp: number): number {
  if (year < born) return -1;
  if (ramp <= 0) return 1;
  return smooth(Math.min(1, (year - born) / ramp));
}

export function layoutRiver(
  specs: readonly RiverLaneSpec[],
  options: RiverLayoutOptions,
): RiverLayout {
  const { height, laneHeight: h, gap, rampYears: ramp, domain } = options;
  const lanes = specs.filter((s) => s.born <= domain.to);
  const index = new Map(lanes.map((s, i) => [s.id, i]));

  // The years to sample: the domain's ends, and across every birth's ramp —
  // between ramps nothing moves, so straight runs need no samples.
  const sample = new Set<number>([domain.from, domain.to]);
  for (const s of lanes) {
    for (let k = 0; k <= RAMP_STEPS; k++) {
      const t = s.born + (ramp * k) / RAMP_STEPS;
      if (t >= domain.from && t <= domain.to) sample.add(t);
    }
  }
  const years = [...sample].sort((a, b) => a - b);

  // Parents before children: centres lerp from the parent's.
  const byBirth = [...lanes].sort(
    (a, b) => a.born - b.born || index.get(a.id)! - index.get(b.id)!,
  );

  const shapes: LaneShape[] = lanes.map((s) => ({
    id: s.id,
    label: s.label,
    born: s.born,
    years: [],
    center: [],
    half: [],
  }));

  const slot = new Array<number>(lanes.length);
  const center = new Array<number>(lanes.length);
  const grown = new Array<number>(lanes.length);
  for (const t of years) {
    // Each flowing lane takes its share of the stack; the stack is centred.
    let total = 0;
    let flowing = 0;
    lanes.forEach((s, i) => {
      grown[i] = growth(s.born, t, ramp);
      if (grown[i] >= 0) {
        total += grown[i] * (h + gap);
        flowing += 1;
      }
    });
    if (flowing) total -= gap;
    let y = (height - total) / 2;
    lanes.forEach((_, i) => {
      if (grown[i] < 0) return;
      slot[i] = y + (grown[i] * h) / 2;
      y += grown[i] * (h + gap);
    });
    for (const s of byBirth) {
      const i = index.get(s.id)!;
      if (grown[i] < 0) continue;
      const p = s.parent === null ? undefined : index.get(s.parent);
      center[i] =
        p === undefined || grown[p] < 0
          ? slot[i]
          : center[p] + (slot[i] - center[p]) * grown[i];
      const shape = shapes[i];
      shape.years.push(t);
      shape.center.push(center[i]);
      shape.half.push((grown[i] * h) / 2);
    }
  }

  const layout: RiverLayout = { lanes: shapes, inflows: [], laneHeight: h };
  for (const s of lanes) {
    for (const inflow of s.inflows) {
      if (!index.has(inflow.from)) continue;
      // Leave the source a ramp before; land where the lane has grown.
      const x0 = Math.max(inflow.year - ramp, domain.from);
      const x1 = Math.min(
        inflow.year === s.born ? inflow.year + ramp : inflow.year,
        domain.to,
      );
      const y0 = centerAt(layout, inflow.from, x0);
      const y1 = centerAt(layout, s.id, x1);
      if (y0 === null || y1 === null) continue;
      const mid = (x0 + x1) / 2;
      layout.inflows.push({
        from: inflow.from,
        to: s.id,
        year: inflow.year,
        points: [x0, y0, mid, y0, mid, y1, x1, y1],
      });
    }
  }
  return layout;
}

function at(shape: LaneShape, year: number, values: number[]): number | null {
  const { years } = shape;
  if (!years.length || year < years[0]) return null;
  if (year >= years[years.length - 1]) return values[values.length - 1];
  let lo = 0;
  let hi = years.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (years[mid] <= year) lo = mid;
    else hi = mid;
  }
  const t = (year - years[lo]) / (years[hi] - years[lo] || 1);
  return values[lo] + (values[hi] - values[lo]) * t;
}

/** A lane's centre line in a year; null before it flows. */
export function centerAt(
  layout: RiverLayout,
  id: string,
  year: number,
): number | null {
  const shape = layout.lanes.find((l) => l.id === id);
  return shape ? at(shape, year, shape.center) : null;
}

/** Half a lane's thickness in a year; null before it flows. */
export function halfAt(
  layout: RiverLayout,
  id: string,
  year: number,
): number | null {
  const shape = layout.lanes.find((l) => l.id === id);
  return shape ? at(shape, year, shape.half) : null;
}

/** The SVG path of a lane's band, in year space. */
export function bandPath(shape: LaneShape): string {
  const { years, center, half } = shape;
  if (!years.length) return '';
  const top = years.map((t, i) => `${t},${(center[i] - half[i]).toFixed(2)}`);
  const bottom = years
    .map((t, i) => `${t},${(center[i] + half[i]).toFixed(2)}`)
    .reverse();
  return `M${top.join('L')}L${bottom.join('L')}Z`;
}

/** The SVG path of a lane's centre line (its strand), in year space. */
export function strandPath(shape: LaneShape): string {
  const { years, center } = shape;
  if (!years.length) return '';
  return `M${years.map((t, i) => `${t},${center[i].toFixed(2)}`).join('L')}`;
}

/** The SVG path of an inflow, in year space. */
export function inflowPath(inflow: InflowShape): string {
  const [x0, y0, c1x, c1y, c2x, c2y, x1, y1] = inflow.points;
  return `M${x0},${y0}C${c1x},${c1y} ${c2x},${c2y} ${x1},${y1}`;
}

/**
 * The thickness a grown lane can have: the river's height shared by the most
 * lanes ever flowing at once, between `min` and `max`.
 */
export function fitLaneHeight(
  specs: readonly RiverLaneSpec[],
  height: number,
  gap: number,
  { min = 18, max = 72, padding = 24 } = {},
): number {
  // Lanes never stop flowing, so the most at once is all of them.
  const most = specs.length;
  const h = (height - 2 * padding - gap * Math.max(most - 1, 0)) / (most || 1);
  return Math.max(min, Math.min(max, h));
}
