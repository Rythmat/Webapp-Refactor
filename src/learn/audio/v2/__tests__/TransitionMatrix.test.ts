// ── TransitionMatrix.test.ts ─────────────────────────────────────────────
// Tests for the 89×89 HMM transition probability matrix.

import { describe, it, expect, beforeEach } from 'vitest';
import { TransitionMatrix } from '../TransitionMatrix';
import { NUM_STATES, SILENCE_STATE, midiToState } from '../types';

let tm: TransitionMatrix;

beforeEach(() => {
  tm = new TransitionMatrix();
});

describe('Row normalization', () => {
  it('every row sums to 1.0', () => {
    for (let from = 0; from < NUM_STATES; from++) {
      const row = tm.getRow(from);
      let sum = 0;
      for (let j = 0; j < NUM_STATES; j++) sum += row[j];
      expect(sum).toBeCloseTo(1.0, 6);
    }
  });
});

describe('Self-transition dominance', () => {
  it('note self-transition is the largest in its row', () => {
    const state = midiToState(60); // C4
    const selfProb = tm.getTransition(state, state);
    for (let to = 0; to < NUM_STATES; to++) {
      if (to === state) continue;
      expect(selfProb).toBeGreaterThan(tm.getTransition(state, to));
    }
  });

  it('note self-transition > 0.8', () => {
    const state = midiToState(69); // A4
    expect(tm.getTransition(state, state)).toBeGreaterThan(0.8);
  });

  it('silence self-transition > 0.5', () => {
    expect(tm.getTransition(SILENCE_STATE, SILENCE_STATE)).toBeGreaterThan(0.5);
  });

  it('silence is less sticky than notes', () => {
    const silenceSelf = tm.getTransition(SILENCE_STATE, SILENCE_STATE);
    const noteSelf = tm.getTransition(midiToState(60), midiToState(60));
    expect(silenceSelf).toBeLessThan(noteSelf);
  });
});

describe('Musical interval bonuses', () => {
  it('octave transition > generic distant transition (same distance)', () => {
    const from = midiToState(60); // C4
    const toOctave = midiToState(72); // C5 (12 semitones, octave bonus)
    const toDistant = midiToState(71); // B4 (11 semitones, no interval bonus)
    expect(tm.getTransition(from, toOctave)).toBeGreaterThan(
      tm.getTransition(from, toDistant),
    );
  });

  it('minor third transition > non-interval transition at same distance', () => {
    const from = midiToState(60); // C4
    const toMinor3rd = midiToState(63); // Eb4 (3 semitones, minor 3rd)
    const toTritone = midiToState(66); // F#4 (6 semitones, tritone — no bonus)
    // Minor 3rd has 1.3× bonus, tritone has none, and is farther so decay is less
    // But distance decay for 6 semitones is 0.6^6 = 0.047 vs 0.6^3 = 0.216 × 1.3 = 0.281
    expect(tm.getTransition(from, toMinor3rd)).toBeGreaterThan(
      tm.getTransition(from, toTritone),
    );
  });

  it('fifth transition > generic transition at similar distance', () => {
    const from = midiToState(60); // C4
    const toFifth = midiToState(67); // G4 (7 semitones)
    const toNear = midiToState(66); // F#4 (6 semitones)
    expect(tm.getTransition(from, toFifth)).toBeGreaterThan(
      tm.getTransition(from, toNear),
    );
  });
});

describe('Onset injection', () => {
  it('boosts silence→note transition during onset', () => {
    const noteState = midiToState(69);
    const baseTrans = tm.getEffectiveTransition(SILENCE_STATE, noteState);

    tm.injectOnset({ timestamp: 0, strength: 0.8, spectralCentroid: 1000 });

    const boostedTrans = tm.getEffectiveTransition(SILENCE_STATE, noteState);
    expect(boostedTrans).toBeGreaterThan(baseTrans * 10);
  });

  it('boosts note→different-note transition during onset', () => {
    const fromState = midiToState(60);
    const toState = midiToState(64);
    const baseTrans = tm.getEffectiveTransition(fromState, toState);

    tm.injectOnset({ timestamp: 0, strength: 0.8, spectralCentroid: 1000 });

    const boostedTrans = tm.getEffectiveTransition(fromState, toState);
    expect(boostedTrans).toBeGreaterThan(baseTrans);
  });

  it('onset boost decays each frame', () => {
    tm.injectOnset({ timestamp: 0, strength: 1.0, spectralCentroid: 1000 });
    const noteState = midiToState(69);

    const boost0 = tm.getEffectiveTransition(SILENCE_STATE, noteState);
    tm.advanceFrame();
    const boost1 = tm.getEffectiveTransition(SILENCE_STATE, noteState);
    tm.advanceFrame();
    const boost2 = tm.getEffectiveTransition(SILENCE_STATE, noteState);

    // Each frame reduces the boost portion by 0.7
    expect(boost1).toBeLessThan(boost0);
    expect(boost2).toBeLessThan(boost1);
  });

  it('onset boost at frame 8 is still > 0.01 (persists through piano attack)', () => {
    tm.injectOnset({ timestamp: 0, strength: 1.0, spectralCentroid: 1000 });
    for (let i = 0; i < 8; i++) tm.advanceFrame();
    // 0.7^8 ≈ 0.058, still above 0.01 threshold
    const noteState = midiToState(69);
    const baseTrans = tm.getTransition(SILENCE_STATE, noteState);
    const effective = tm.getEffectiveTransition(SILENCE_STATE, noteState);
    expect(effective).toBeGreaterThan(baseTrans);
  });
});

describe('setExpectedNotes', () => {
  it('boosts transitions to expected notes', () => {
    const target = midiToState(69);
    const nonTarget = midiToState(70);

    const baseTrans = tm.getTransition(SILENCE_STATE, target);
    const baseNon = tm.getTransition(SILENCE_STATE, nonTarget);
    const baseRatio = baseTrans / baseNon;

    tm.setExpectedNotes([69]); // MIDI 69

    const boostedTrans = tm.getTransition(SILENCE_STATE, target);
    const boostedNon = tm.getTransition(SILENCE_STATE, nonTarget);
    const boostedRatio = boostedTrans / boostedNon;

    expect(boostedRatio).toBeGreaterThan(baseRatio * 5);
  });

  it('rows still sum to 1 after setting expected notes', () => {
    tm.setExpectedNotes([60, 64, 67]); // C major triad
    for (let from = 0; from < NUM_STATES; from++) {
      const row = tm.getRow(from);
      let sum = 0;
      for (let j = 0; j < NUM_STATES; j++) sum += row[j];
      expect(sum).toBeCloseTo(1.0, 6);
    }
  });

  it('null clears expected notes', () => {
    tm.setExpectedNotes([69]);
    const boosted = tm.getTransition(SILENCE_STATE, midiToState(69));

    tm.setExpectedNotes(null);
    const cleared = tm.getTransition(SILENCE_STATE, midiToState(69));

    expect(cleared).toBeLessThan(boosted);
  });
});

describe('setKeyContext', () => {
  it('boosts diatonic notes (C major)', () => {
    const cMajorIntervals = [0, 2, 4, 5, 7, 9, 11];
    const diatonicState = midiToState(60); // C4 (pc=0, diatonic)
    const chromaticState = midiToState(61); // C#4 (pc=1, chromatic)

    tm.setKeyContext(0, cMajorIntervals);

    const diatonicProb = tm.getTransition(SILENCE_STATE, diatonicState);
    const chromaticProb = tm.getTransition(SILENCE_STATE, chromaticState);

    expect(diatonicProb).toBeGreaterThan(chromaticProb);
  });

  it('rows sum to 1 after setting key context', () => {
    tm.setKeyContext(0, [0, 2, 4, 5, 7, 9, 11]);
    for (let from = 0; from < NUM_STATES; from++) {
      const row = tm.getRow(from);
      let sum = 0;
      for (let j = 0; j < NUM_STATES; j++) sum += row[j];
      expect(sum).toBeCloseTo(1.0, 6);
    }
  });

  it('clearKeyContext removes diatonic boost', () => {
    tm.setKeyContext(0, [0, 2, 4, 5, 7, 9, 11]);
    const boosted = tm.getTransition(SILENCE_STATE, midiToState(60));

    tm.clearKeyContext();
    const cleared = tm.getTransition(SILENCE_STATE, midiToState(60));

    expect(cleared).toBeLessThan(boosted);
  });
});

describe('reset', () => {
  it('clears all context', () => {
    tm.setExpectedNotes([60]);
    tm.setKeyContext(0, [0, 2, 4]);
    tm.injectOnset({ timestamp: 0, strength: 1, spectralCentroid: 1000 });

    tm.reset();

    // After reset, rows should still sum to 1
    for (let from = 0; from < NUM_STATES; from++) {
      const row = tm.getRow(from);
      let sum = 0;
      for (let j = 0; j < NUM_STATES; j++) sum += row[j];
      expect(sum).toBeCloseTo(1.0, 6);
    }

    // And onset boost should be gone
    const noteState = midiToState(69);
    const base = tm.getTransition(SILENCE_STATE, noteState);
    const effective = tm.getEffectiveTransition(SILENCE_STATE, noteState);
    expect(effective).toBeCloseTo(base, 10);
  });
});
