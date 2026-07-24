import { describe, it, expect } from 'vitest';
import {
  mapModRoutes,
  type ModSlotInfo,
  type Selections,
} from '../mapping/modMatrix.ts';
import { createCollector } from '../fidelity.ts';

function slot(over: Partial<ModSlotInfo>): ModSlotInfo {
  return {
    slot: 0,
    sourceMain: 6, // LFO1
    sourceAux: 0,
    destType: 'VoiceFilter',
    destID: 0,
    destParam: 'kParamFreq',
    amount: 50,
    bipolar: false,
    bypass: false,
    ...over,
  };
}

const sel: Selections = {
  oscMap: new Map([[0, 0]]),
  lfoMap: new Map([[0, 0]]),
  modEnvIndex: 1,
};

describe('mapModRoutes', () => {
  it('maps LFO→filter cutoff to an Oracle route', () => {
    const fid = createCollector();
    const { routes } = mapModRoutes([slot({})], sel, [], fid);
    expect(routes).toHaveLength(1);
    expect(routes[0]).toMatchObject({
      source: { type: 'lfo', index: 0 },
      target: { source: 'flt1', param: 'cutoff' },
      polarity: 'unipolar',
    });
    expect(routes[0].amount).toBeCloseTo(0.5);
  });

  it('maps a macro→WT-position to a real control-rate wtPos route', () => {
    const fid = createCollector();
    const macroValues = [0, 0, 0, 0, 0.4]; // Macro5 at 40%
    const s = slot({
      sourceMain: 29, // Macro5
      destType: 'WTOsc',
      destParam: 'kParamTablePos',
      destID: 0,
      amount: 100,
    });
    const { routes } = mapModRoutes([s], sel, macroValues, fid);
    expect(routes).toHaveLength(1);
    expect(routes[0]).toMatchObject({
      source: { type: 'macro', index: 4 },
      target: { source: 'osc1', param: 'wtPos' },
    });
    expect(routes[0].amount).toBeCloseTo(1); // amount 100 → 1.0
  });

  it('maps an LFO→WT-position to a wtPos route (control-rate)', () => {
    const fid = createCollector();
    const s = slot({
      sourceMain: 6, // LFO1
      destType: 'WTOsc',
      destParam: 'kParamTablePos',
      destID: 0,
      amount: 50,
    });
    const { routes } = mapModRoutes([s], sel, [], fid);
    expect(routes).toHaveLength(1);
    expect(routes[0]).toMatchObject({
      source: { type: 'lfo', index: 0 },
      target: { source: 'osc1', param: 'wtPos' },
    });
  });

  it('drops a WT-position route when its oscillator was dropped', () => {
    const fid = createCollector();
    const s = slot({
      sourceMain: 6,
      destType: 'WTOsc',
      destParam: 'kParamTablePos',
      destID: 2, // osc C — not in oscMap
      amount: 50,
    });
    const { routes } = mapModRoutes([s], sel, [], fid);
    expect(routes).toHaveLength(0);
  });

  it('routes to a dropped FX barely dent the score (no double-count)', () => {
    const fid = createCollector();
    const s = slot({
      sourceMain: 25,
      destType: 'FXReverb',
      destParam: 'kParamWet',
    });
    mapModRoutes([s], sel, [0.5], fid);
    const report = fid.finish('t', 'x');
    // static macro contribution to an unmappable target → small penalty only
    expect(report.score).toBeGreaterThan(92);
  });
});
