import { describe, expect, it } from 'vitest';
import { farTake, firstHit, lowpassed } from '../stage/takes';

const RATE = 48000;
const sine = (hz: number, length = RATE / 2) =>
  Float32Array.from({ length }, (_, i) =>
    Math.sin((2 * Math.PI * hz * i) / RATE),
  );
const peakAfterSettling = (samples: Float32Array) => {
  let peak = 0;
  for (let i = samples.length / 2; i < samples.length; i++) {
    peak = Math.max(peak, Math.abs(samples[i]));
  }
  return peak;
};

describe('two takes of one hit', () => {
  it('finds where the first hit starts', () => {
    const samples = new Float32Array(1000);
    samples[300] = 0.01;
    samples[400] = 0.5;
    samples[500] = 1;
    expect(firstHit(samples)).toBe(400);
  });

  it('lands the far take late, by whole samples', () => {
    const samples = new Float32Array(1000);
    samples[100] = 1;
    const far = farTake(samples, RATE, { delayMs: 1, gainDb: 0 });
    expect(far(148)).toBe(1);
    expect(far(100)).toBe(0);
  });

  it('can land it early', () => {
    const samples = new Float32Array(1000);
    samples[100] = 1;
    const far = farTake(samples, RATE, { delayMs: -1, gainDb: 0 });
    expect(far(52)).toBe(1);
  });

  it('applies level and polarity', () => {
    const samples = new Float32Array([0.5]);
    const far = farTake(samples, RATE, {
      delayMs: 0,
      gainDb: 20 * Math.log10(0.5),
      invert: true,
    });
    expect(far(0)).toBeCloseTo(-0.25, 6);
  });

  it('reads nothing outside the recording', () => {
    const far = farTake(new Float32Array(4), RATE, { delayMs: 0, gainDb: 0 });
    expect(far(-5)).toBe(0);
    expect(far(50)).toBe(0);
  });

  it('darkens a take as a browser’s low-pass does', () => {
    expect(peakAfterSettling(lowpassed(sine(100), RATE, 2000))).toBeCloseTo(
      1,
      1,
    );
    expect(peakAfterSettling(lowpassed(sine(16000), RATE, 2000))).toBeLessThan(
      0.05,
    );
  });
});
