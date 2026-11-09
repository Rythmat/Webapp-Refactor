// ── Intervals as ratios ────────────────────────────────────────────────────
// Two notes whose frequencies make a simple ratio line up again after only a few
// cycles. Pianos are tuned a little away from these, so that every key works.

export interface Interval {
  id: string;
  name: string;
  /** Higher : lower, in lowest terms: cycles of each before they line up. */
  high: number;
  low: number;
}

/**
 * No unison: two oscillators at one pitch would stay at whatever phase they met,
 * and could nearly cancel, right where the unit has just taught why.
 */
export const INTERVALS: readonly Interval[] = [
  { id: 'octave', name: 'Octave', high: 2, low: 1 },
  { id: 'fifth', name: 'Fifth', high: 3, low: 2 },
  { id: 'fourth', name: 'Fourth', high: 4, low: 3 },
  { id: 'third', name: 'Major third', high: 5, low: 4 },
  { id: 'second', name: 'Minor second', high: 16, low: 15 },
  { id: 'tritone', name: 'Tritone', high: 45, low: 32 },
];

export const intervalNamed = (id: string) =>
  INTERVALS.find((interval) => interval.id === id) ?? INTERVALS[0];

export const intervalHz = (root: number, interval: Interval) =>
  (root * interval.high) / interval.low;

/** A note this many semitones up, as a piano is tuned. */
export const equalTemperedHz = (root: number, semitones: number) =>
  root * 2 ** (semitones / 12);

/** The dots of a Lissajous figure, −1..1: simple ratios draw simple figures. */
export const lissajousAt = (
  u: number,
  interval: Interval,
  drift: number,
): [number, number] => [
  Math.sin(2 * Math.PI * interval.low * u + drift),
  Math.sin(2 * Math.PI * interval.high * u),
];
