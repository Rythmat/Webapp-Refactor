// ── NoteHMM.test.ts ─────────────────────────────────────────────────────
// Tests for the online Viterbi decoder.

import { describe, it, expect, beforeEach } from 'vitest';
import { NoteHMM } from '../NoteHMM';
import { TransitionMatrix } from '../TransitionMatrix';
import { NUM_STATES, SILENCE_STATE, midiToState } from '../types';

let tm: TransitionMatrix;
let hmm: NoteHMM;

beforeEach(() => {
  tm = new TransitionMatrix();
  hmm = new NoteHMM(tm);
});

/** Create an observation vector strongly peaked at a given state. */
function makeObs(state: number, peak = 0.9): Float64Array {
  const obs = new Float64Array(NUM_STATES);
  const remaining = (1 - peak) / (NUM_STATES - 1);
  for (let i = 0; i < NUM_STATES; i++) {
    obs[i] = i === state ? peak : remaining;
  }
  return obs;
}

/** Create a silence observation. */
function makeSilenceObs(): Float64Array {
  const obs = new Float64Array(NUM_STATES);
  obs[SILENCE_STATE] = 1;
  return obs;
}

/** Feed N identical frames and return the last result. */
function feedFrames(hmm: NoteHMM, obs: Float64Array, n: number, rms = 0.1) {
  let result = null;
  for (let i = 0; i < n; i++) {
    result = hmm.update(obs, null, rms);
  }
  return result;
}

describe('Basic detection', () => {
  it('sustained A4 observation → detects MIDI 69', () => {
    const obs = makeObs(midiToState(69));
    // Need at least LATENCY_FRAMES + a few convergence frames
    const result = feedFrames(hmm, obs, 10);
    expect(result).not.toBeNull();
    expect(result!.midiNumber).toBe(69);
  });

  it('sustained C4 observation → detects MIDI 60', () => {
    const obs = makeObs(midiToState(60));
    const result = feedFrames(hmm, obs, 10);
    expect(result).not.toBeNull();
    expect(result!.midiNumber).toBe(60);
  });

  it('silence observation → null', () => {
    const obs = makeSilenceObs();
    const result = feedFrames(hmm, obs, 10);
    expect(result).toBeNull();
  });

  it('returns null for first LATENCY_FRAMES', () => {
    const obs = makeObs(midiToState(69));
    // First 2 frames should return null (LATENCY_FRAMES = 2)
    expect(hmm.update(obs, null, 0.1)).toBeNull();
    expect(hmm.update(obs, null, 0.1)).toBeNull();
  });
});

describe('Confidence', () => {
  it('confidence is in [0, 1]', () => {
    const obs = makeObs(midiToState(69));
    for (let i = 0; i < 20; i++) {
      const result = hmm.update(obs, null, 0.1);
      if (result) {
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      }
    }
  });

  it('strong observation → high confidence', () => {
    const obs = makeObs(midiToState(69), 0.95);
    const result = feedFrames(hmm, obs, 15);
    expect(result).not.toBeNull();
    expect(result!.confidence).toBeGreaterThan(0.5);
  });

  it('weak observation → lower confidence', () => {
    const strongObs = makeObs(midiToState(69), 0.95);
    const weakObs = makeObs(midiToState(69), 0.3);

    const hmmStrong = new NoteHMM(new TransitionMatrix());
    const hmmWeak = new NoteHMM(new TransitionMatrix());

    const strongResult = feedFrames(hmmStrong, strongObs, 15);
    const weakResult = feedFrames(hmmWeak, weakObs, 15);

    if (strongResult && weakResult) {
      expect(strongResult.confidence).toBeGreaterThan(weakResult.confidence);
    }
  });
});

describe('Hysteresis', () => {
  it('note needs confidence > 0.35 to start', () => {
    // Perfectly uniform observations — no single state should dominate
    const uniformObs = new Float64Array(NUM_STATES);
    const base = 1 / NUM_STATES;
    for (let i = 0; i < NUM_STATES; i++) uniformObs[i] = base;
    const result = feedFrames(hmm, uniformObs, 15);
    // With perfectly uniform observations, either null or silence
    if (result !== null) {
      // If HMM picks a state, its confidence should be very low
      expect(result.confidence).toBeLessThan(0.35);
    }
  });

  it('note persists until confidence drops below 0.25', () => {
    // Start with strong signal to activate note
    const strongObs = makeObs(midiToState(69), 0.95);
    feedFrames(hmm, strongObs, 10);

    // Now feed moderate observations — note should persist
    const moderateObs = makeObs(midiToState(69), 0.5);
    const result = feedFrames(hmm, moderateObs, 5);
    expect(result).not.toBeNull();
    expect(result!.midiNumber).toBe(69);
  });

  it('transition from note to silence requires confidence drop', () => {
    // Establish note
    const noteObs = makeObs(midiToState(69), 0.95);
    feedFrames(hmm, noteObs, 10);

    // Transition to silence — should eventually go null
    const silenceObs = makeSilenceObs();
    const result = feedFrames(hmm, silenceObs, 10);
    expect(result).toBeNull();
  });
});

describe('Onset injection', () => {
  it('onset helps faster silence→note transition', () => {
    const noteObs = makeObs(midiToState(69), 0.7);

    // Without onset
    const hmm1 = new NoteHMM(new TransitionMatrix());
    let framesWithout = 0;
    for (let i = 0; i < 30; i++) {
      framesWithout++;
      const r = hmm1.update(noteObs, null, 0.1);
      if (r) break;
    }

    // With onset at frame 0
    const tm2 = new TransitionMatrix();
    const hmm2 = new NoteHMM(tm2);
    let framesWith = 0;
    const onset = { timestamp: 0, strength: 1.0, spectralCentroid: 1000 };
    for (let i = 0; i < 30; i++) {
      framesWith++;
      const r = hmm2.update(noteObs, i === 0 ? onset : null, 0.1);
      if (r) break;
    }

    // With onset should detect faster (or equal)
    expect(framesWith).toBeLessThanOrEqual(framesWithout);
  });
});

describe('Velocity mapping', () => {
  it('low RMS → low velocity (around 30)', () => {
    const obs = makeObs(midiToState(69), 0.95);
    const result = feedFrames(hmm, obs, 10, 0.02);
    expect(result).not.toBeNull();
    expect(result!.velocity).toBeLessThanOrEqual(40);
  });

  it('high RMS → high velocity (around 110)', () => {
    const obs = makeObs(midiToState(69), 0.95);
    const result = feedFrames(hmm, obs, 10, 0.3);
    expect(result).not.toBeNull();
    expect(result!.velocity).toBeGreaterThanOrEqual(100);
  });

  it('velocity is in range [30, 110]', () => {
    const obs = makeObs(midiToState(69), 0.95);
    for (const rms of [0.001, 0.05, 0.15, 0.5]) {
      const result = feedFrames(
        new NoteHMM(new TransitionMatrix()),
        obs,
        10,
        rms,
      );
      if (result) {
        expect(result.velocity).toBeGreaterThanOrEqual(30);
        expect(result.velocity).toBeLessThanOrEqual(110);
      }
    }
  });
});

describe('State probabilities', () => {
  it('getStateProbabilities sums to 1', () => {
    const obs = makeObs(midiToState(69));
    feedFrames(hmm, obs, 5);

    const probs = hmm.getStateProbabilities();
    let sum = 0;
    for (let i = 0; i < NUM_STATES; i++) sum += probs[i];
    expect(sum).toBeCloseTo(1.0, 3);
  });
});

describe('Reset', () => {
  it('reset returns to initial state', () => {
    const obs = makeObs(midiToState(69));
    feedFrames(hmm, obs, 10);

    hmm.reset();

    expect(hmm.getLastState()).toBe(SILENCE_STATE);

    // After reset, should need convergence again
    const result = hmm.update(obs, null, 0.1);
    expect(result).toBeNull(); // first frame after reset
  });
});

describe('pitchCents', () => {
  it('centered observation → pitchCents near 0', () => {
    const obs = makeObs(midiToState(69), 0.95);
    const result = feedFrames(hmm, obs, 10);
    expect(result).not.toBeNull();
    expect(Math.abs(result!.pitchCents)).toBeLessThan(10);
  });

  it('off-center observation → nonzero pitchCents', () => {
    // Create observation with mass shifted toward state+1
    const state = midiToState(69);
    const obs = new Float64Array(NUM_STATES);
    const base = 0.001;
    for (let i = 0; i < NUM_STATES; i++) obs[i] = base;
    obs[state] = 0.4;
    obs[state + 1] = 0.5; // more mass above

    const result = feedFrames(hmm, obs, 15);
    expect(result).not.toBeNull();
    // pitchCents should be nonzero (observation mass is off-center)
    expect(Math.abs(result!.pitchCents)).toBeGreaterThan(5);
  });
});

describe('getRecentPath', () => {
  it('returns recent note detections', () => {
    const obs = makeObs(midiToState(69));
    feedFrames(hmm, obs, 10);

    const path = hmm.getRecentPath(5);
    expect(path.length).toBeGreaterThan(0);
    for (const note of path) {
      expect(note.midiNumber).toBe(69);
    }
  });
});
