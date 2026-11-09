/**
 * The flow diagram's geometry, pure: each side's places stacked down its
 * edge, a band from each into the stop's hub in the middle (or out of it),
 * as wide as its share of the strongest.
 */

export interface FlowSide {
  key: string;
  label: string;
  weight: number;
}

export interface FlowBand {
  key: string;
  side: 'in' | 'out';
  /** A cubic curve, edge to hub (in) or hub to edge (out). */
  d: string;
  width: number;
}

export interface FlowLabel {
  key: string;
  text: string;
  x: number;
  y: number;
  anchor: 'start' | 'end';
}

export interface FlowLayout {
  bands: FlowBand[];
  labels: FlowLabel[];
  /** The stop's bar in the middle. */
  hub: { x: number; y: number; h: number };
}

/** The widest a band gets, and the narrowest, in px. */
export const BAND = { max: 14, min: 2 } as const;
/** A label's room above its band. */
const LABEL_GAP = 4;
/** The longest a label is before it is cut. */
const LABEL_MAX = 16;

const cut = (text: string) =>
  text.length > LABEL_MAX ? `${text.slice(0, LABEL_MAX - 1)}…` : text;

export function flowLayout(
  from: readonly FlowSide[],
  to: readonly FlowSide[],
  width: number,
  height: number,
): FlowLayout {
  const max = Math.max(
    1,
    ...from.map((s) => s.weight),
    ...to.map((s) => s.weight),
  );
  const thickness = (w: number) => BAND.min + (BAND.max - BAND.min) * (w / max);
  const hubX = width / 2;

  const place = (sides: readonly FlowSide[], side: 'in' | 'out') => {
    const slot = height / Math.max(1, sides.length);
    const ws = sides.map((s) => thickness(s.weight));
    const total = ws.reduce((a, b) => a + b, 0);
    // The bands meet the hub stacked about its middle.
    let hubAt = height / 2 - total / 2;
    const bands: FlowBand[] = [];
    const labels: FlowLabel[] = [];
    sides.forEach((s, i) => {
      const w = ws[i];
      const edgeY = slot * i + slot / 2 + LABEL_GAP + 2;
      const hubY = hubAt + w / 2;
      hubAt += w;
      const edgeX = side === 'in' ? 0 : width;
      const mid = (edgeX + hubX) / 2;
      const [x0, y0, x1, y1] =
        side === 'in' ? [edgeX, edgeY, hubX, hubY] : [hubX, hubY, edgeX, edgeY];
      bands.push({
        key: `${side}:${s.key}`,
        side,
        d: `M${x0},${y0} C${mid},${y0} ${mid},${y1} ${x1},${y1}`,
        width: w,
      });
      labels.push({
        key: `${side}:${s.key}`,
        text: cut(s.label),
        x: side === 'in' ? 0 : width,
        y: edgeY - w / 2 - LABEL_GAP,
        anchor: side === 'in' ? 'start' : 'end',
      });
    });
    return { bands, labels, total };
  };

  const into = place(from, 'in');
  const out = place(to, 'out');
  const h = Math.max(into.total, out.total, 12);
  return {
    bands: [...into.bands, ...out.bands],
    labels: [...into.labels, ...out.labels],
    hub: { x: hubX, y: height / 2 - h / 2, h },
  };
}
