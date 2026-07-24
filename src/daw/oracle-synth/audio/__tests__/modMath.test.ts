import { describe, it, expect } from 'vitest';
import { computeGainOffset, getModRange, migrateModRoute } from '../modMath';
import { buildCurve } from '../ModCurves';
import { ModRoute } from '../types';

describe('computeGainOffset', () => {
  const range = 100;

  it('unipolar route + unipolar source: 0..1 → 0..A', () => {
    const { gain, offset } = computeGainOffset('unipolar', false, 0.5, range);
    // source=0 → 0, source=1 → A
    expect(0 * gain + offset).toBe(0);
    expect(1 * gain + offset).toBe(50);
  });

  it('unipolar route + bipolar source: -1..1 → 0..A', () => {
    const { gain, offset } = computeGainOffset('unipolar', true, 0.5, range);
    expect(-1 * gain + offset).toBe(0);
    expect(1 * gain + offset).toBe(50);
  });

  it('bipolar route + unipolar source: 0..1 → -A..A', () => {
    const { gain, offset } = computeGainOffset('bipolar', false, 0.5, range);
    expect(0 * gain + offset).toBe(-50);
    expect(1 * gain + offset).toBe(50);
  });

  it('bipolar route + bipolar source: -1..1 → -A..A', () => {
    const { gain, offset } = computeGainOffset('bipolar', true, 0.5, range);
    expect(-1 * gain + offset).toBe(-50);
    expect(1 * gain + offset).toBe(50);
  });

  it('negative amount inverts the sweep', () => {
    const { gain, offset } = computeGainOffset('bipolar', false, -1, range);
    expect(0 * gain + offset).toBe(100);
    expect(1 * gain + offset).toBe(-100);
  });

  it('legacy cutoff down-sweep: unipolar source 0..1 → -A..0', () => {
    const { gain, offset } = computeGainOffset(
      'unipolar',
      false,
      0.5,
      4800,
      true,
    );
    // LFO=0 → below cutoff by A; LFO=1 → at the base cutoff
    expect(0 * gain + offset).toBe(-2400);
    expect(1 * gain + offset).toBe(0);
  });

  it('legacy cutoff down-sweep with bipolar source: -1..1 → -A..0', () => {
    const { gain, offset } = computeGainOffset(
      'unipolar',
      true,
      0.5,
      4800,
      true,
    );
    expect(-1 * gain + offset).toBe(-2400);
    expect(1 * gain + offset).toBe(0);
  });

  it('bipolar route ignores the legacy cutoff flag', () => {
    const withFlag = computeGainOffset('bipolar', false, 0.5, 4800, true);
    const withoutFlag = computeGainOffset('bipolar', false, 0.5, 4800, false);
    expect(withFlag).toEqual(withoutFlag);
  });
});

describe('getModRange', () => {
  it('returns native units per parameter', () => {
    expect(getModRange('cutoff')).toBe(4800);
    expect(getModRange('resonance')).toBe(15);
    expect(getModRange('pan')).toBe(1);
    expect(getModRange('detune')).toBe(100);
    expect(getModRange('unknown-param')).toBe(1);
  });
});

describe('buildCurve', () => {
  const mid = (arr: Float32Array) => arr[(arr.length - 1) / 2];
  const last = (arr: Float32Array) => arr[arr.length - 1];

  it.each(['linear', 'exp', 'log', 'scurve'] as const)(
    '%s maps 0→0, 1→1, -1→-1',
    (type) => {
      const curve = buildCurve(type);
      expect(mid(curve)).toBeCloseTo(0, 6);
      expect(last(curve)).toBeCloseTo(1, 6);
      expect(curve[0]).toBeCloseTo(-1, 6);
    },
  );

  it.each(['linear', 'exp', 'log', 'scurve'] as const)(
    '%s is monotonically non-decreasing',
    (type) => {
      const curve = buildCurve(type);
      for (let i = 1; i < curve.length; i++) {
        expect(curve[i]).toBeGreaterThanOrEqual(curve[i - 1]);
      }
    },
  );

  it('exp is below linear in the upper half; log is above', () => {
    const exp = buildCurve('exp');
    const log = buildCurve('log');
    const lin = buildCurve('linear');
    const i = Math.floor(lin.length * 0.75); // x = 0.5
    expect(exp[i]).toBeLessThan(lin[i]);
    expect(log[i]).toBeGreaterThan(lin[i]);
  });

  it('returns the same cached array on repeat calls', () => {
    expect(buildCurve('exp')).toBe(buildCurve('exp'));
  });
});

describe('migrateModRoute', () => {
  it('migrates a v1 route to v2 preserving audible behavior', () => {
    const v1 = {
      id: 'route-1',
      lfoIndex: 2,
      target: { source: 'flt1', param: 'cutoff' },
      depthMin: 0,
      depthMax: 0.7,
      enabled: true,
    } as unknown as ModRoute;

    const v2 = migrateModRoute(v1);
    expect(v2).toEqual({
      id: 'route-1',
      source: { type: 'lfo', index: 2 },
      target: { source: 'flt1', param: 'cutoff' },
      amount: 0.7,
      polarity: 'unipolar',
      curve: 'linear',
      enabled: true,
    });
    // Legacy fields stripped
    expect('lfoIndex' in v2).toBe(false);
    expect('depthMax' in v2).toBe(false);
  });

  it('is idempotent on v2 input', () => {
    const v2: ModRoute = {
      id: 'route-2',
      source: { type: 'macro', index: 3 },
      target: { source: 'osc1', param: 'pan' },
      amount: -0.4,
      polarity: 'bipolar',
      curve: 'exp',
      enabled: false,
    };
    expect(migrateModRoute(migrateModRoute(v2))).toEqual(v2);
  });

  it('defaults missing v1 fields sanely', () => {
    const bare = {
      id: 'route-3',
      target: { source: 'osc1', param: 'level' },
      enabled: true,
    } as unknown as ModRoute;
    const v2 = migrateModRoute(bare);
    expect(v2.source).toEqual({ type: 'lfo', index: 0 });
    expect(v2.amount).toBe(0.5);
    expect(v2.polarity).toBe('unipolar');
  });

  it('disables v1 routes on targets that were inert (silent) in v1', () => {
    // The v1 engine never resolved osc pan/detune, sub, or noise targets —
    // those routes were silent no-ops. Activating them at depthMax would
    // change how old presets sound, so they migrate disabled.
    const inertTargets = [
      { source: 'osc1', param: 'pan' },
      { source: 'osc2', param: 'detune' },
      { source: 'sub', param: 'level' },
      { source: 'noise', param: 'level' },
    ];
    for (const target of inertTargets) {
      const v1 = {
        id: 'r',
        lfoIndex: 0,
        target,
        depthMin: 0,
        depthMax: 0.7,
        enabled: true,
      } as unknown as ModRoute;
      expect(migrateModRoute(v1).enabled).toBe(false);
    }
  });

  it('keeps v1 routes on audible targets enabled', () => {
    const audibleTargets = [
      { source: 'flt1', param: 'cutoff' },
      { source: 'flt2', param: 'resonance' },
      { source: 'osc1', param: 'level' },
    ];
    for (const target of audibleTargets) {
      const v1 = {
        id: 'r',
        lfoIndex: 0,
        target,
        depthMin: 0,
        depthMax: 0.7,
        enabled: true,
      } as unknown as ModRoute;
      expect(migrateModRoute(v1).enabled).toBe(true);
    }
  });

  it('does NOT disable v2 routes on formerly-inert targets', () => {
    const v2: ModRoute = {
      id: 'r',
      source: { type: 'lfo', index: 0 },
      target: { source: 'osc1', param: 'pan' },
      amount: 0.5,
      polarity: 'unipolar',
      curve: 'linear',
      enabled: true,
    };
    expect(migrateModRoute(v2).enabled).toBe(true);
  });
});
