// ── types.test.ts ───────────────────────────────────────────────────────
// Tests for pure math helpers in v2/types.ts.

import { describe, it, expect } from 'vitest';
import {
  NUM_STATES,
  SILENCE_STATE,
  MIDI_OFFSET,
  freqToMidiContinuous,
  freqToMidi,
  midiToFreq,
  stateToMidi,
  midiToState,
  createUniformDistribution,
  createSilenceDistribution,
  normalizeDistribution,
} from '../types';

describe('Constants', () => {
  it('NUM_STATES is 89 (88 keys + silence)', () => {
    expect(NUM_STATES).toBe(89);
  });

  it('SILENCE_STATE is 88', () => {
    expect(SILENCE_STATE).toBe(88);
  });

  it('MIDI_OFFSET is 21 (A0)', () => {
    expect(MIDI_OFFSET).toBe(21);
  });
});

describe('freqToMidiContinuous', () => {
  it('A4 (440 Hz) → 69', () => {
    expect(freqToMidiContinuous(440)).toBeCloseTo(69, 5);
  });

  it('C4 (261.63 Hz) → 60', () => {
    expect(freqToMidiContinuous(261.6256)).toBeCloseTo(60, 1);
  });

  it('A0 (27.5 Hz) → 21', () => {
    expect(freqToMidiContinuous(27.5)).toBeCloseTo(21, 5);
  });

  it('C8 (4186 Hz) → 108', () => {
    expect(freqToMidiContinuous(4186.01)).toBeCloseTo(108, 0);
  });
});

describe('freqToMidi', () => {
  it('rounds to nearest MIDI note', () => {
    expect(freqToMidi(440)).toBe(69);
    expect(freqToMidi(261.63)).toBe(60);
    expect(freqToMidi(27.5)).toBe(21);
  });
});

describe('midiToFreq', () => {
  it('A4 = 440 Hz', () => {
    expect(midiToFreq(69)).toBeCloseTo(440, 5);
  });

  it('roundtrips for all 88 keys', () => {
    for (let midi = 21; midi <= 108; midi++) {
      const freq = midiToFreq(midi);
      const back = freqToMidi(freq);
      expect(back).toBe(midi);
    }
  });
});

describe('stateToMidi / midiToState', () => {
  it('state 0 → MIDI 21', () => {
    expect(stateToMidi(0)).toBe(21);
  });

  it('state 87 → MIDI 108', () => {
    expect(stateToMidi(87)).toBe(108);
  });

  it('state 88 (silence) → null', () => {
    expect(stateToMidi(SILENCE_STATE)).toBeNull();
  });

  it('midiToState is inverse of stateToMidi for notes', () => {
    for (let state = 0; state < 88; state++) {
      const midi = stateToMidi(state)!;
      expect(midiToState(midi)).toBe(state);
    }
  });
});

describe('createUniformDistribution', () => {
  it('all probabilities equal 1/89', () => {
    const dist = createUniformDistribution(0, 0);
    const expected = 1 / NUM_STATES;
    for (let i = 0; i < NUM_STATES; i++) {
      expect(dist.probs[i]).toBeCloseTo(expected, 10);
    }
  });

  it('preserves timestamp and frameId', () => {
    const dist = createUniformDistribution(123.456, 42);
    expect(dist.timestamp).toBe(123.456);
    expect(dist.frameId).toBe(42);
  });
});

describe('createSilenceDistribution', () => {
  it('silence state = 1, all others = 0', () => {
    const dist = createSilenceDistribution(0, 0);
    expect(dist.probs[SILENCE_STATE]).toBe(1);
    for (let i = 0; i < 88; i++) {
      expect(dist.probs[i]).toBe(0);
    }
  });
});

describe('normalizeDistribution', () => {
  it('normalizes to sum to 1', () => {
    const probs = new Float64Array([2, 3, 5]);
    normalizeDistribution(probs);
    expect(probs[0]).toBeCloseTo(0.2, 10);
    expect(probs[1]).toBeCloseTo(0.3, 10);
    expect(probs[2]).toBeCloseTo(0.5, 10);
  });

  it('handles all-zero input (no division by zero)', () => {
    const probs = new Float64Array(89);
    normalizeDistribution(probs);
    // Should remain zero (no NaN)
    for (let i = 0; i < 89; i++) {
      expect(Number.isNaN(probs[i])).toBe(false);
    }
  });

  it('returns the same array (in-place)', () => {
    const probs = new Float64Array([1, 1, 1]);
    const result = normalizeDistribution(probs);
    expect(result).toBe(probs);
  });
});
