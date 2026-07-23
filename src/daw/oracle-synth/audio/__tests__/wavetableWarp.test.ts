import { describe, it, expect } from 'vitest';
import {
  buildWarpCurve,
  warpFrames,
  isDistortionWarp,
  isPhaseWarp,
} from '../wavetableWarp';

describe('warp classification', () => {
  it('splits distortion vs phase families', () => {
    expect(isDistortionWarp('tube')).toBe(true);
    expect(isDistortionWarp('sync')).toBe(false);
    expect(isPhaseWarp('sync')).toBe(true);
    expect(isPhaseWarp('tube')).toBe(false);
    expect(isPhaseWarp('none')).toBe(false);
    expect(isDistortionWarp('none')).toBe(false);
  });
});

describe('buildWarpCurve (distortion waveshapers)', () => {
  it('returns null for none / phase / zero amount (transparent)', () => {
    expect(buildWarpCurve('none', 0.5)).toBeNull();
    expect(buildWarpCurve('sync', 0.5)).toBeNull(); // phase mode → pre-baked, not a curve
    expect(buildWarpCurve('tube', 0)).toBeNull(); // zero amount → transparent
  });

  it('builds a bounded, monotonic-ish curve for a distortion mode', () => {
    const curve = buildWarpCurve('hardclip', 0.8, 256);
    expect(curve).not.toBeNull();
    expect(curve!.length).toBe(256);
    // stays within [-1, 1]
    for (const v of curve!) expect(Math.abs(v)).toBeLessThanOrEqual(1.0001);
    // hard clip drives the extremes to the rails
    expect(curve![255]).toBeCloseTo(1, 1);
    expect(curve![0]).toBeCloseTo(-1, 1);
  });
});

describe('warpFrames (phase-domain pre-bake)', () => {
  // One 8-sample ramp frame is enough to prove the transform runs + is pure.
  const ramp = () => Float32Array.from([0, 1, 2, 3, 4, 5, 6, 7]);

  it('leaves frames unchanged for none / zero amount (copy, not mutate)', () => {
    const src = [ramp()];
    const out = warpFrames(src, 'none', 0.5);
    expect(Array.from(out[0])).toEqual(Array.from(src[0]));
    expect(out[0]).not.toBe(src[0]); // fresh copy
  });

  it('sync remaps the read position (changes the frame deterministically)', () => {
    const a = warpFrames([ramp()], 'sync', 0.6)[0];
    const b = warpFrames([ramp()], 'sync', 0.6)[0];
    expect(Array.from(a)).toEqual(Array.from(b)); // deterministic
    expect(Array.from(a)).not.toEqual([0, 1, 2, 3, 4, 5, 6, 7]); // actually warped
    expect(a.length).toBe(8);
  });

  it('quantize stair-steps the read into fewer distinct values', () => {
    // Longer ramp so the step count (< length) is unambiguously visible.
    const ramp32 = Float32Array.from({ length: 32 }, (_, i) => i);
    const out = warpFrames([ramp32], 'quantize', 0.95)[0];
    const distinct = new Set(out.map((v) => Math.round(v))).size;
    expect(distinct).toBeLessThan(32);
  });
});
