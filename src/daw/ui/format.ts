/**
 * Number formatting for the editor's readouts. formatDb is the single dB
 * formatter (plan: integration rules, owned by 2.2), so a fader, a meter and
 * an effect parameter never show the same level two ways.
 */

/** The typographic minus. FixedDigits gives it a cell of its own. */
export const MINUS = '−';

/** Silence: what a level of no signal reads as. */
export const MINUS_INFINITY = `${MINUS}∞`;

export interface FormatDbOptions {
  /** The unit after the number. Default 'dB'; '' for a bare number. */
  unit?: string;
  /** Levels at or below this read as −∞. Default −Infinity. */
  floor?: number;
}

/**
 * A level in decibels as text:
 * - one decimal under 10 dB either way ('−6.0 dB', '0.0 dB', '+3.5 dB');
 * - whole decibels from 10 dB on ('−12 dB', '+12 dB');
 * - a plus sign on boosts, the typographic minus on cuts, never '−0.0';
 * - −∞ for silence: −Infinity, NaN, or anything at or below `floor`.
 *
 * The 10 dB switch is decided after rounding, so −9.96 reads '−10 dB' and
 * not '−10.0 dB'.
 */
export function formatDb(db: number, options: FormatDbOptions = {}): string {
  const { unit = 'dB', floor = -Infinity } = options;
  const suffix = unit ? ` ${unit}` : '';
  if (Number.isNaN(db) || db === -Infinity || db <= floor) {
    return `${MINUS_INFINITY}${suffix}`;
  }
  if (db === Infinity) return `+∞${suffix}`;

  const tenths = Math.round(db * 10) / 10;
  const whole = Math.abs(tenths) >= 10;
  const magnitude = whole
    ? String(Math.round(Math.abs(db)))
    : Math.abs(tenths).toFixed(1);
  // Signed by what is shown, so a value that rounds to zero has no sign.
  const shown = Number(magnitude);
  const sign = shown === 0 ? '' : db < 0 ? MINUS : '+';
  return `${sign}${magnitude}${suffix}`;
}

/** Linear amplitude (1 = unity, 0 dBFS) to decibels; 0 and below are −∞. */
export function gainToDb(gain: number): number {
  return gain > 0 ? 20 * Math.log10(gain) : -Infinity;
}

/** Decibels to linear amplitude; −∞ is 0. */
export function dbToGain(db: number): number {
  return db === -Infinity ? 0 : 10 ** (db / 20);
}

/**
 * A linear amplitude shown in decibels: unity gain reads '0.0 dB' and
 * silence '−∞ dB'.
 */
export function formatGain(gain: number, options?: FormatDbOptions): string {
  return formatDb(gainToDb(gain), options);
}

/**
 * A plain parameter value, for a control that has no formatter of its own:
 * as many decimals as its step has (or two, one or none as the number grows
 * when it has no step), with the typographic minus.
 */
export function formatValue(value: number, step?: number): string {
  let decimals: number;
  if (step) {
    const text = String(step);
    const dot = text.indexOf('.');
    decimals = dot === -1 ? 0 : Math.min(4, text.length - dot - 1);
  } else {
    const size = Math.abs(value);
    decimals = size >= 100 ? 0 : size >= 10 ? 1 : 2;
  }
  const text = Math.abs(value).toFixed(decimals);
  return Number(text) !== 0 && value < 0 ? `${MINUS}${text}` : text;
}
