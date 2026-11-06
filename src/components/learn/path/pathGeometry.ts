import { angleOf, atAngle } from '../sigil/sigilGeometry';
import type { PathFigure } from './types';

// ── Stops on a sine wave ───────────────────────────────────────────────────
// Pure. Four stops to a cycle, so that a path swings out one way and back the
// other: centre, left, centre, right. Everything's in rem, so the app's scale
// carries it.

/** Stops in one full swing. */
export const STOPS_PER_CYCLE = 4;

/** How far along the wave's swing a stop sits, −1 to 1. */
export const waveAt = (stop: number) =>
  -Math.sin((2 * Math.PI * stop) / STOPS_PER_CYCLE);

/**
 * The wave as an SVG path through a run of stops, for a box `amplitude × 2` wide
 * and `count × rowHeight` tall. Sampled finely enough to read as a curve.
 * `firstStop` carries the phase from one level to the next.
 */
export function wavePath(
  firstStop: number,
  count: number,
  amplitude: number,
  rowHeight: number,
): string {
  const SAMPLES_PER_STOP = 24;
  const points: string[] = [];
  const total = Math.max(0, (count - 1) * SAMPLES_PER_STOP);
  for (let i = 0; i <= total; i++) {
    const stop = i / SAMPLES_PER_STOP;
    const x = amplitude + waveAt(firstStop + stop) * amplitude;
    const y = (stop + 0.5) * rowHeight;
    points.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(3)} ${y.toFixed(3)}`);
  }
  return points.join(' ');
}

/** The figures a run of discs draws, so that neighbours differ. */
const DISC_RATIOS: readonly (readonly [number, number])[] = [
  [2, 3],
  [3, 4],
  [4, 5],
  [3, 5],
  [5, 6],
  [5, 8],
  [7, 8],
  [8, 9],
];

export const discRatio = (stop: number) =>
  DISC_RATIOS[stop % DISC_RATIOS.length];

/**
 * A key's star at a radius, each note at its own place round the circle of fifths:
 * the shape it has inside the key wheel.
 */
export function starPoints(figure: PathFigure, radius: number) {
  const place = (pc: number) =>
    atAngle(angleOf((pc + figure.tonic) % 12, 'fifths', figure.tonic), radius);
  const line = (notes: readonly number[]) =>
    notes
      .map((pc) =>
        place(pc)
          .map((v) => v.toFixed(2))
          .join(','),
      )
      .join(' ');
  return {
    scale: line(figure.pcs),
    stars: figure.stars.map(line),
    nodes: figure.pcs.map((pc) => ({ pc, at: place(pc) })),
  };
}
