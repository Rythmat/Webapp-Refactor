/**
 * The value model Knob and Fader share, kept apart from React so the maths
 * is tested on its own.
 *
 * Everything moves in normalised travel (0 at min, 1 at max), so a log or
 * custom taper feels the same under the hand and the arrow keys as a linear
 * one, and only then maps back to the value:
 * - an arrow key moves 1% of the travel, Shift+arrow 0.1% (fine), PageUp and
 *   PageDown 10%; Home and End go to the ends;
 * - a drag moves the whole travel over `travelPx` pixels, and a tenth as far
 *   while Shift is held, decided move by move so pressing Shift mid-drag
 *   never jumps;
 * - with a `step`, values snap to it, and a key press always moves at least
 *   one step (so ±1 semitone works whatever the range).
 */

/** A custom taper: value to travel (0–1) and back. */
export interface ValueMapping {
  toNorm(value: number): number;
  fromNorm(t: number): number;
}

export type SliderScale = 'linear' | 'log' | ValueMapping;

export interface SliderRange {
  min: number;
  max: number;
  /** Snap values to multiples of this, counted from min. */
  step?: number;
  /** 'log' needs min > 0 (a frequency, a time); otherwise it is linear. */
  scale?: SliderScale;
}

/** Shift: a tenth of the normal movement, for keys and drags alike. */
export const FINE_FACTOR = 0.1;
/** An arrow key's share of the travel. */
export const KEY_FRACTION = 0.01;
/** PageUp and PageDown's share of the travel. */
export const PAGE_FRACTION = 0.1;
/** A knob's full travel in vertical drag, as RotaryKnob had it. */
export const KNOB_TRAVEL_PX = 150;

export type KeyStepSize = 'step' | 'fine' | 'page';

const clamp = (value: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, value));

export const clamp01 = (t: number) => clamp(t, 0, 1);

const isLog = (range: SliderRange) => range.scale === 'log' && range.min > 0;

/** Where `value` sits in the travel, 0 to 1. */
export function toNorm(value: number, range: SliderRange): number {
  const { min, max, scale } = range;
  if (max === min) return 0;
  if (scale && typeof scale === 'object') return clamp01(scale.toNorm(value));
  const v = clamp(value, min, max);
  if (isLog(range)) return Math.log(v / min) / Math.log(max / min);
  return (v - min) / (max - min);
}

/** The value at travel `t` (0 to 1), before any snapping. */
export function fromNorm(t: number, range: SliderRange): number {
  const { min, max, scale } = range;
  const n = clamp01(t);
  if (scale && typeof scale === 'object') {
    return clamp(scale.fromNorm(n), min, max);
  }
  if (isLog(range)) return min * (max / min) ** n;
  return min + n * (max - min);
}

/** Decimal places in a step, so 0.1 + 0.2 snaps to 0.3 and not 0.30000000000000004. */
const decimalsOf = (step: number) => {
  const text = String(step);
  const exp = /e-(\d+)$/.exec(text);
  if (exp) return Number(exp[1]);
  const dot = text.indexOf('.');
  return dot === -1 ? 0 : text.length - dot - 1;
};

/** `value` clamped to the range and snapped to its step, if it has one. */
export function quantize(value: number, range: SliderRange): number {
  const { min, max, step } = range;
  const v = clamp(value, min, max);
  if (!step || step <= 0) return v;
  const snapped = min + Math.round((v - min) / step) * step;
  const decimals = Math.max(decimalsOf(step), decimalsOf(min));
  // Snapping can land a hair past max when max is not on the grid.
  return clamp(Number(snapped.toFixed(decimals)), min, max);
}

const FRACTION: Record<KeyStepSize, number> = {
  step: KEY_FRACTION,
  fine: KEY_FRACTION * FINE_FACTOR,
  page: PAGE_FRACTION,
};

/** The value one key press away from `value`, up (+1) or down (−1). */
export function stepValue(
  value: number,
  range: SliderRange,
  direction: 1 | -1,
  size: KeyStepSize,
): number {
  const current = quantize(value, range);
  const t = toNorm(current, range) + direction * FRACTION[size];
  const next = quantize(fromNorm(t, range), range);
  if (next !== current || !range.step) return next;
  // The fraction was smaller than one step: move by exactly one.
  return quantize(current + direction * range.step, range);
}

/**
 * The travel after a pointer moved `deltaPx` (positive toward max) from
 * travel `t`, over a full travel of `travelPx`, a tenth as far when `fine`.
 */
export function dragNorm(
  t: number,
  deltaPx: number,
  travelPx: number,
  fine: boolean,
): number {
  if (travelPx <= 0) return clamp01(t);
  return clamp01(t + (deltaPx / travelPx) * (fine ? FINE_FACTOR : 1));
}
