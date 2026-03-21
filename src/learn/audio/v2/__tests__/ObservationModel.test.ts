// ── ObservationModel.test.ts ─────────────────────────────────────────────
// Tests for weighted geometric mean fusion.

import { describe, it, expect, beforeEach } from 'vitest';
import { ObservationModel } from '../ObservationModel';
import {
  NUM_STATES,
  SILENCE_STATE,
  midiToState,
  type NMFActivation,
} from '../types';
import { makeDistributionAtMidi, makeSilenceDistribution } from './testUtils';

let model: ObservationModel;

beforeEach(() => {
  model = new ObservationModel();
});

/** Helper: check that a Float64Array sums to ~1. */
function expectSumsToOne(arr: Float64Array, epsilon = 0.01) {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) sum += arr[i];
  expect(Math.abs(sum - 1)).toBeLessThan(epsilon);
}

describe('Single stream fusion', () => {
  it('single fast stream: output peaks at same note', () => {
    const dist = makeDistributionAtMidi(69); // A4
    const fused = model.fuse(dist, null, null, null);
    expect(fused.length).toBe(NUM_STATES);

    // Peak should be at A4's state
    let peakState = 0;
    let peakVal = -Infinity;
    for (let i = 0; i < NUM_STATES; i++) {
      if (fused[i] > peakVal) {
        peakVal = fused[i];
        peakState = i;
      }
    }
    expect(peakState).toBe(midiToState(69));
  });

  it('output is normalized', () => {
    const dist = makeDistributionAtMidi(60);
    const fused = model.fuse(dist, null, null, null);
    expectSumsToOne(fused);
  });
});

describe('Two agreeing streams', () => {
  it('peak sharpens when two streams agree', () => {
    const fast = makeDistributionAtMidi(69, 0.6);
    const hiRes = makeDistributionAtMidi(69, 0.6);

    const fusedSingle = new Float64Array(model.fuse(fast, null, null, null));
    const fusedDouble = new Float64Array(model.fuse(fast, hiRes, null, null));

    const state = midiToState(69);
    expect(fusedDouble[state]).toBeGreaterThanOrEqual(
      fusedSingle[state] - 0.01,
    );
  });
});

describe('Two disagreeing streams', () => {
  it('compromise between different notes', () => {
    const fast = makeDistributionAtMidi(60, 0.9); // C4
    const hiRes = makeDistributionAtMidi(64, 0.9); // E4

    const fused = model.fuse(fast, hiRes, null, null);

    // Neither should dominate completely
    const c4 = fused[midiToState(60)];
    const e4 = fused[midiToState(64)];
    // Both should have significant probability
    expect(c4).toBeGreaterThan(0.01);
    expect(e4).toBeGreaterThan(0.01);
  });
});

describe('Null stream handling', () => {
  it('all null → uniform distribution', () => {
    const fused = model.fuse(null, null, null, null);
    const expected = 1 / NUM_STATES;
    for (let i = 0; i < NUM_STATES; i++) {
      expect(fused[i]).toBeCloseTo(expected, 5);
    }
  });

  it('null streams are excluded from product', () => {
    const fast = makeDistributionAtMidi(69, 0.8);

    // Create a distribution that disagrees (peaks at different note)
    const hiResDisagree = makeDistributionAtMidi(60, 0.8); // C4

    const fusedWithNull = new Float64Array(model.fuse(fast, null, null, null));
    const fusedWithDisagree = new Float64Array(
      model.fuse(fast, hiResDisagree, null, null),
    );

    // With null hiRes, A4 should be stronger than when hiRes disagrees
    const stateA4 = midiToState(69);
    expect(fusedWithNull[stateA4]).toBeGreaterThan(fusedWithDisagree[stateA4]);
  });
});

describe('PROB_FLOOR prevents single-stream veto', () => {
  it('zero probability in one stream does not kill the note', () => {
    // Fast stream strongly says A4
    const fast = makeDistributionAtMidi(69, 0.95);

    // HiRes stream says zero for A4 (via silence distribution)
    const hiRes = makeSilenceDistribution();

    const fused = model.fuse(fast, hiRes, null, null);

    // A4 should still have some probability due to PROB_FLOOR
    const stateA4 = midiToState(69);
    expect(fused[stateA4]).toBeGreaterThan(0);
  });
});

describe('NMF activation → distribution conversion', () => {
  it('NMF with single strong activation peaks at correct note', () => {
    const fast = makeDistributionAtMidi(60, 0.5);
    const nmf: NMFActivation = {
      weights: new Float64Array(88),
      timestamp: 0,
      frameId: 0,
    };
    nmf.weights[midiToState(60)] = 1.0; // C4 activation

    // Use polyphonic weights where NMF matters
    const polyModel = new ObservationModel({
      fast: 0.3,
      hiRes: 0,
      ml: 0,
      nmf: 1.0,
    });
    const fused = polyModel.fuse(fast, null, null, nmf);

    let peakState = 0;
    let peakVal = -Infinity;
    for (let i = 0; i < NUM_STATES; i++) {
      if (fused[i] > peakVal) {
        peakVal = fused[i];
        peakState = i;
      }
    }
    expect(peakState).toBe(midiToState(60));
  });

  it('zero NMF activation → silence-heavy distribution', () => {
    const nmf: NMFActivation = {
      weights: new Float64Array(88), // all zeros
      timestamp: 0,
      frameId: 0,
    };

    const nmfModel = new ObservationModel({
      fast: 0,
      hiRes: 0,
      ml: 0,
      nmf: 1.0,
    });
    const fused = nmfModel.fuse(null, null, null, nmf);

    // Silence should dominate
    expect(fused[SILENCE_STATE]).toBeGreaterThan(0.5);
  });
});

describe('Weight configuration', () => {
  it('setStreamWeights changes fusion behavior', () => {
    const fast = makeDistributionAtMidi(60, 0.8);
    const hiRes = makeDistributionAtMidi(64, 0.8);

    // Default weights: fast=1.0, hiRes=0.8
    const fused1 = new Float64Array(model.fuse(fast, hiRes, null, null));

    // Change to hiRes-dominant
    model.setStreamWeights({ fast: 0.2, hiRes: 2.0 });
    const fused2 = new Float64Array(model.fuse(fast, hiRes, null, null));

    // E4 should gain relative to C4
    const c4state = midiToState(60);
    const e4state = midiToState(64);
    const ratio1 = fused1[e4state] / fused1[c4state];
    const ratio2 = fused2[e4state] / fused2[c4state];
    expect(ratio2).toBeGreaterThan(ratio1);
  });

  it('getStreamWeights returns current weights', () => {
    model.setStreamWeights({ fast: 0.5 });
    const w = model.getStreamWeights();
    expect(w.fast).toBe(0.5);
    expect(w.hiRes).toBe(0.8); // default unchanged
  });
});

describe('Output properties', () => {
  it('output is always normalized', () => {
    const fast = makeDistributionAtMidi(69);
    const hiRes = makeDistributionAtMidi(60);
    const ml = makeDistributionAtMidi(72);
    const fused = model.fuse(fast, hiRes, ml, null);
    expectSumsToOne(fused);
  });

  it('output length is NUM_STATES', () => {
    const fused = model.fuse(null, null, null, null);
    expect(fused.length).toBe(NUM_STATES);
  });
});
