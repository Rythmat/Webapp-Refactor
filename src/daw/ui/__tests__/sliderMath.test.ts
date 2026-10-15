import { describe, expect, it } from 'vitest';
import {
  dragNorm,
  FINE_FACTOR,
  fromNorm,
  KNOB_TRAVEL_PX,
  quantize,
  stepValue,
  toNorm,
  type SliderRange,
} from '../sliderMath';

// ── The Knob and Fader value model ──────────────────────────────────────────
// Movement happens in normalised travel, so a log knob feels like a linear
// one; Shift is a tenth of the movement for keys and drags alike.

const unit: SliderRange = { min: 0, max: 1 };
const freq: SliderRange = { min: 20, max: 20000, scale: 'log' };
const semitones: SliderRange = { min: -24, max: 24, step: 1 };

describe('travel mapping', () => {
  it('maps a linear range to 0–1 and back', () => {
    const range = { min: -60, max: 6 };
    expect(toNorm(-60, range)).toBe(0);
    expect(toNorm(6, range)).toBe(1);
    expect(toNorm(-27, range)).toBeCloseTo(0.5);
    expect(fromNorm(0.5, range)).toBeCloseTo(-27);
  });

  it('maps a log range geometrically: the middle of 20 Hz–20 kHz is ~632 Hz', () => {
    expect(fromNorm(0.5, freq)).toBeCloseTo(Math.sqrt(20 * 20000), 6);
    expect(toNorm(632.4555, freq)).toBeCloseTo(0.5, 4);
    for (const hz of [20, 100, 1000, 12000, 20000]) {
      expect(fromNorm(toNorm(hz, freq), freq)).toBeCloseTo(hz, 6);
    }
  });

  it('treats log as linear when the range reaches zero', () => {
    expect(toNorm(0.5, { min: 0, max: 1, scale: 'log' })).toBe(0.5);
  });

  it('takes a custom taper', () => {
    const squared: SliderRange = {
      min: 0,
      max: 1,
      scale: { toNorm: (v) => Math.sqrt(v), fromNorm: (t) => t * t },
    };
    expect(toNorm(0.25, squared)).toBeCloseTo(0.5);
    expect(fromNorm(0.5, squared)).toBeCloseTo(0.25);
  });

  it('clamps out-of-range values to the ends', () => {
    expect(toNorm(5, unit)).toBe(1);
    expect(toNorm(-5, unit)).toBe(0);
    expect(fromNorm(2, unit)).toBe(1);
  });
});

describe('quantize', () => {
  it('snaps to the step, counted from min', () => {
    expect(quantize(0.234, { min: 0, max: 1, step: 0.05 })).toBe(0.25);
    expect(quantize(3.4, { min: 1, max: 10, step: 2 })).toBe(3);
  });

  it('leaves no floating-point dust', () => {
    expect(quantize(0.1 + 0.2, { min: 0, max: 1, step: 0.1 })).toBe(0.3);
  });

  it('clamps, even when max is off the grid', () => {
    expect(quantize(9.9, { min: 0, max: 9.9, step: 2 })).toBe(9.9);
    expect(quantize(-3, semitones)).toBe(-3);
    expect(quantize(100, semitones)).toBe(24);
  });
});

describe('stepValue (keys)', () => {
  it('moves 1% of the travel per arrow, 0.1% with Shift, 10% per page', () => {
    expect(stepValue(0.5, unit, 1, 'step')).toBeCloseTo(0.51);
    expect(stepValue(0.5, unit, 1, 'fine')).toBeCloseTo(0.501);
    expect(stepValue(0.5, unit, -1, 'page')).toBeCloseTo(0.4);
  });

  it('steps a log range in travel, not in hertz', () => {
    const up = stepValue(1000, freq, 1, 'step');
    const down = stepValue(1000, freq, -1, 'step');
    // The same ratio either way: about 7% per arrow over three decades.
    expect(up / 1000).toBeCloseTo(1000 / down, 6);
    expect(up / 1000).toBeCloseTo(1000 ** (0.01 * 1), 1);
  });

  it('always moves at least one step on a stepped range', () => {
    // 1% of 48 semitones is 0.48: it still moves one.
    expect(stepValue(0, semitones, 1, 'step')).toBe(1);
    expect(stepValue(0, semitones, 1, 'fine')).toBe(1);
    expect(stepValue(0, semitones, -1, 'step')).toBe(-1);
    expect(stepValue(0, semitones, 1, 'page')).toBe(5);
  });

  it('stops at the ends', () => {
    expect(stepValue(1, unit, 1, 'step')).toBe(1);
    expect(stepValue(24, semitones, 1, 'step')).toBe(24);
    expect(stepValue(0, unit, -1, 'page')).toBe(0);
  });
});

describe('dragNorm (pointer)', () => {
  it("covers the whole range in the knob's 150 px", () => {
    expect(KNOB_TRAVEL_PX).toBe(150);
    expect(dragNorm(0, 150, KNOB_TRAVEL_PX, false)).toBe(1);
    expect(dragNorm(0.5, 15, KNOB_TRAVEL_PX, false)).toBeCloseTo(0.6);
  });

  it('moves a tenth as far with Shift held', () => {
    expect(FINE_FACTOR).toBe(0.1);
    expect(dragNorm(0.5, 15, KNOB_TRAVEL_PX, true)).toBeCloseTo(0.51);
    expect(dragNorm(0.5, -15, KNOB_TRAVEL_PX, true)).toBeCloseTo(0.49);
  });

  it('clamps at the ends and ignores an empty travel', () => {
    expect(dragNorm(0.95, 30, KNOB_TRAVEL_PX, false)).toBe(1);
    expect(dragNorm(0.05, -30, KNOB_TRAVEL_PX, false)).toBe(0);
    expect(dragNorm(0.5, 30, 0, false)).toBe(0.5);
  });
});
