import { describe, expect, it } from 'vitest';
import {
  sampleAutomation,
  insertPoint,
  removePoint,
  type AutomationPoint,
} from '../automation';
import { clampParamValue, isAutomatableParam } from '../automationParams';

const pts = (...xs: [number, number][]): AutomationPoint[] =>
  xs.map(([tick, value]) => ({ tick, value }));

describe('sampleAutomation', () => {
  it('returns null for an empty or missing lane', () => {
    expect(sampleAutomation(undefined, 100)).toBeNull();
    expect(sampleAutomation([], 100)).toBeNull();
  });

  it('holds the first value before/at the first point', () => {
    const p = pts([100, 0.2], [200, 0.8]);
    expect(sampleAutomation(p, 0)).toBe(0.2);
    expect(sampleAutomation(p, 100)).toBe(0.2);
  });

  it('holds the last value at/after the last point', () => {
    const p = pts([100, 0.2], [200, 0.8]);
    expect(sampleAutomation(p, 200)).toBe(0.8);
    expect(sampleAutomation(p, 9999)).toBe(0.8);
  });

  it('linearly interpolates between two points', () => {
    const p = pts([0, 0], [100, 1]);
    expect(sampleAutomation(p, 25)).toBeCloseTo(0.25, 10);
    expect(sampleAutomation(p, 50)).toBeCloseTo(0.5, 10);
    expect(sampleAutomation(p, 75)).toBeCloseTo(0.75, 10);
  });

  it('interpolates across a multi-segment lane and hits exact points', () => {
    const p = pts([0, 0], [100, 1], [300, 0]);
    expect(sampleAutomation(p, 100)).toBe(1); // exact hit
    expect(sampleAutomation(p, 200)).toBeCloseTo(0.5, 10); // midpoint of 2nd seg
    expect(sampleAutomation(p, 150)).toBeCloseTo(0.75, 10);
  });

  it('handles a single-point lane as a constant', () => {
    const p = pts([500, 0.42]);
    expect(sampleAutomation(p, 0)).toBe(0.42);
    expect(sampleAutomation(p, 500)).toBe(0.42);
    expect(sampleAutomation(p, 1000)).toBe(0.42);
  });

  it('handles negative values (pan) and descending ramps', () => {
    const p = pts([0, 1], [100, -1]);
    expect(sampleAutomation(p, 50)).toBeCloseTo(0, 10);
    expect(sampleAutomation(p, 25)).toBeCloseTo(0.5, 10);
  });
});

describe('insertPoint', () => {
  it('inserts keeping tick order', () => {
    let p: AutomationPoint[] = [];
    p = insertPoint(p, { tick: 200, value: 0.5 });
    p = insertPoint(p, { tick: 100, value: 0.2 });
    p = insertPoint(p, { tick: 150, value: 0.9 });
    expect(p.map((x) => x.tick)).toEqual([100, 150, 200]);
  });

  it('replaces the value at an existing tick', () => {
    let p = pts([100, 0.2], [200, 0.8]);
    p = insertPoint(p, { tick: 100, value: 0.5 });
    expect(p).toEqual(pts([100, 0.5], [200, 0.8]));
  });

  it('is immutable (does not mutate the input array)', () => {
    const orig = pts([100, 0.2]);
    const next = insertPoint(orig, { tick: 50, value: 0.1 });
    expect(orig).toEqual(pts([100, 0.2]));
    expect(next).not.toBe(orig);
  });
});

describe('removePoint', () => {
  it('removes the point at the exact tick', () => {
    const p = pts([100, 0.2], [200, 0.8], [300, 0.4]);
    expect(removePoint(p, 200)).toEqual(pts([100, 0.2], [300, 0.4]));
  });
  it('no-ops when the tick is absent', () => {
    const p = pts([100, 0.2]);
    expect(removePoint(p, 999)).toEqual(p);
  });
});

describe('clampParamValue', () => {
  it('clamps into the param range', () => {
    expect(clampParamValue('volume', 2)).toBe(1);
    expect(clampParamValue('volume', -0.5)).toBe(0);
    expect(clampParamValue('pan', -3)).toBe(-1);
    expect(clampParamValue('effect.delay.feedback', 5)).toBe(0.95);
    expect(clampParamValue('effect.presence.amount', 50)).toBe(50);
  });

  it('coerces non-finite values to the param min (never NaN/Infinity to a param)', () => {
    expect(clampParamValue('volume', NaN)).toBe(0);
    expect(clampParamValue('volume', Infinity)).toBe(0);
    expect(clampParamValue('pan', -Infinity)).toBe(-1); // pan min is -1
  });

  it('passes through an unknown paramId unchanged', () => {
    expect(clampParamValue('effect.bogus.x', 42)).toBe(42);
  });

  it('isAutomatableParam gates the allow-list', () => {
    expect(isAutomatableParam('volume')).toBe(true);
    expect(isAutomatableParam('effect.multiband.depth')).toBe(true);
    expect(isAutomatableParam('effect.gate.threshold')).toBe(false);
    expect(isAutomatableParam('effect.ducker.amount')).toBe(false);
  });
});
