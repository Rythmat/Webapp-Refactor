import { describe, expect, it } from 'vitest';
import {
  dbToGain,
  formatDb,
  formatGain,
  formatValue,
  gainToDb,
  MINUS,
} from '../format';

// ── formatDb: the editor's one dB formatter (plan: Readout / formatDb, 2.2) ──
// One decimal under 10 dB, whole decibels from there, a plus on boosts, the
// typographic minus on cuts, and −∞ for silence.

describe('formatDb', () => {
  it('shows unity as 0.0 dB, with no sign', () => {
    expect(formatDb(0)).toBe('0.0 dB');
    // Rounds to zero: never '−0.0'.
    expect(formatDb(-0.04)).toBe('0.0 dB');
    expect(formatDb(0.04)).toBe('0.0 dB');
  });

  it('keeps one decimal under 10 dB either way', () => {
    expect(formatDb(-6)).toBe(`${MINUS}6.0 dB`);
    expect(formatDb(-6.02)).toBe(`${MINUS}6.0 dB`);
    expect(formatDb(3.5)).toBe('+3.5 dB');
    expect(formatDb(9.94)).toBe('+9.9 dB');
  });

  it('shows whole decibels from 10 dB on', () => {
    expect(formatDb(-12)).toBe(`${MINUS}12 dB`);
    expect(formatDb(-24.4)).toBe(`${MINUS}24 dB`);
    expect(formatDb(12.4)).toBe('+12 dB');
    expect(formatDb(-72)).toBe(`${MINUS}72 dB`);
  });

  it('decides the 10 dB switch after rounding', () => {
    // −9.96 rounds to −10.0, which is whole-decibel territory.
    expect(formatDb(-9.96)).toBe(`${MINUS}10 dB`);
    expect(formatDb(9.95)).toBe('+10 dB');
  });

  it('reads silence as −∞', () => {
    expect(formatDb(-Infinity)).toBe(`${MINUS}∞ dB`);
    expect(formatDb(Number.NaN)).toBe(`${MINUS}∞ dB`);
    expect(formatDb(-80, { floor: -60 })).toBe(`${MINUS}∞ dB`);
    expect(formatDb(-60, { floor: -60 })).toBe(`${MINUS}∞ dB`);
    expect(formatDb(-59, { floor: -60 })).toBe(`${MINUS}59 dB`);
  });

  it('takes another unit, or none', () => {
    expect(formatDb(-6, { unit: '' })).toBe(`${MINUS}6.0`);
    expect(formatDb(-1, { unit: 'dBFS' })).toBe(`${MINUS}1.0 dBFS`);
  });

  it('uses the typographic minus, which FixedDigits gives a cell', () => {
    expect(formatDb(-3)).not.toContain('-');
    expect(MINUS).toBe('−');
  });
});

describe('formatGain and the gain conversions', () => {
  it('shows linear unity gain as 0.0 dB and no signal as −∞', () => {
    expect(formatGain(1)).toBe('0.0 dB');
    expect(formatGain(0)).toBe(`${MINUS}∞ dB`);
    expect(formatGain(0.5)).toBe(`${MINUS}6.0 dB`);
    expect(formatGain(2)).toBe('+6.0 dB');
  });

  it('converts between gain and decibels both ways', () => {
    expect(gainToDb(1)).toBe(0);
    expect(gainToDb(0)).toBe(-Infinity);
    expect(gainToDb(-1)).toBe(-Infinity);
    expect(dbToGain(-Infinity)).toBe(0);
    for (const db of [-48, -12, -6, 0, 3, 6]) {
      expect(gainToDb(dbToGain(db))).toBeCloseTo(db, 10);
    }
  });
});

describe('formatValue', () => {
  it("shows as many decimals as the control's step", () => {
    expect(formatValue(3, 1)).toBe('3');
    expect(formatValue(0.25, 0.01)).toBe('0.25');
    expect(formatValue(-3, 1)).toBe(`${MINUS}3`);
  });

  it('scales its decimals with the number when there is no step', () => {
    expect(formatValue(0.5)).toBe('0.50');
    expect(formatValue(12.34)).toBe('12.3');
    expect(formatValue(1200)).toBe('1200');
  });

  it('never shows a minus on zero', () => {
    expect(formatValue(-0.001, 0.01)).toBe('0.00');
  });
});
