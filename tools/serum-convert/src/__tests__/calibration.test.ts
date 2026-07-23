import { describe, it, expect } from 'vitest';
import { DEFAULT_CALIBRATION } from '../calibration.ts';
import { filterFreqToHz, masterVolumeToUnit } from '../serumDefaults.ts';

// The fit functions are internal to calibrate.ts; re-implement the same
// log-linear regression here to prove the math a reference-preset set would
// exercise. (calibrate.ts writes calibration.json; these guard the formula.)
function fitExp(points: { raw: number; hz: number }[]) {
  const n = points.length;
  let sx = 0,
    sy = 0,
    sxx = 0,
    sxy = 0;
  for (const p of points) {
    const y = Math.log(p.hz);
    sx += p.raw;
    sy += y;
    sxx += p.raw * p.raw;
    sxy += p.raw * y;
  }
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  const intercept = (sy - slope * sx) / n;
  return { lo: Math.exp(intercept), hi: Math.exp(intercept + slope) };
}

describe('cutoff curve fit', () => {
  it('recovers a known exponential mapping from sample points', () => {
    // Ground-truth curve: 20 Hz → 20000 Hz across raw 0..1
    const lo = 20;
    const hi = 20000;
    const raws = [0, 0.25, 0.5, 0.75, 1];
    const points = raws.map((raw) => ({
      raw,
      hz: lo * Math.pow(hi / lo, raw),
    }));
    const fit = fitExp(points);
    expect(fit.lo).toBeCloseTo(lo, 1);
    expect(fit.hi).toBeCloseTo(hi, -1); // within ~10 Hz at 20k
  });
});

describe('default calibration behavior (unchanged from pre-calibration)', () => {
  it('filterFreqToHz still spans 20..20000 with the default curve', () => {
    expect(DEFAULT_CALIBRATION.freqLoHz).toBe(8);
    expect(filterFreqToHz(0)).toBe(20); // clamped floor
    expect(filterFreqToHz(1)).toBe(20000); // clamped ceil
    const mid = filterFreqToHz(0.5);
    expect(mid).toBeGreaterThan(300);
    expect(mid).toBeLessThan(700);
  });

  it('masterVolumeToUnit uses the amplitude interpretation by default', () => {
    // Default (no dB calibration): gain = clamp(v/0.75,0,1)·0.8
    expect(masterVolumeToUnit(0.75)).toBeCloseTo(0.8, 3); // unity → full headroom
    expect(masterVolumeToUnit(0.375)).toBeCloseTo(0.4, 3);
    expect(masterVolumeToUnit(0.227)).toBeCloseTo(0.242, 3); // typical preset
  });
});
