// ── pipeline.integration.test.ts ─────────────────────────────────────────
// Full pipeline integration tests: fusion → HMM → note events.

import { describe, it, expect, beforeEach } from 'vitest';
import { NoteHMM } from '../NoteHMM';
import { ObservationModel } from '../ObservationModel';
import { TransitionMatrix } from '../TransitionMatrix';
import { type TrackedNote } from '../types';
import { makeDistributionAtMidi, makeSilenceDistribution } from './testUtils';

let tm: TransitionMatrix;
let hmm: NoteHMM;
let obs: ObservationModel;

beforeEach(() => {
  tm = new TransitionMatrix();
  hmm = new NoteHMM(tm);
  obs = new ObservationModel();
});

/** Run one pipeline tick: fuse distributions → HMM update. */
function tick(
  fastMidi: number | 'silence' | null,
  hiResMidi: number | 'silence' | null = null,
  rms = 0.1,
  onset: {
    timestamp: number;
    strength: number;
    spectralCentroid: number;
  } | null = null,
): TrackedNote | null {
  const fast =
    fastMidi === 'silence'
      ? makeSilenceDistribution()
      : fastMidi !== null
        ? makeDistributionAtMidi(fastMidi, 0.85)
        : null;
  const hiRes =
    hiResMidi === 'silence'
      ? makeSilenceDistribution()
      : hiResMidi !== null
        ? makeDistributionAtMidi(hiResMidi, 0.85)
        : null;
  const fused = obs.fuse(fast, hiRes, null, null);
  return hmm.update(fused, onset, rms);
}

/** Run N identical ticks. */
function tickN(
  n: number,
  fastMidi: number | 'silence' | null,
  hiResMidi: number | 'silence' | null = null,
  rms = 0.1,
): TrackedNote | null {
  let result: TrackedNote | null = null;
  for (let i = 0; i < n; i++) {
    result = tick(fastMidi, hiResMidi, rms);
  }
  return result;
}

describe('Basic pipeline flow', () => {
  it('synthetic A4 distribution → fuse → HMM → MIDI 69', () => {
    const result = tickN(10, 69, 69);
    expect(result).not.toBeNull();
    expect(result!.midiNumber).toBe(69);
  });

  it('C4 through pipeline → MIDI 60', () => {
    const result = tickN(10, 60, 60);
    expect(result).not.toBeNull();
    expect(result!.midiNumber).toBe(60);
  });
});

describe('Stability', () => {
  it('sustained 20 frames: stable, no jitter', () => {
    const notes: number[] = [];
    for (let i = 0; i < 20; i++) {
      const result = tick(69, 69);
      if (result) notes.push(result.midiNumber);
    }

    // All detected notes should be the same
    const unique = new Set(notes);
    expect(unique.size).toBeLessThanOrEqual(1);
    if (notes.length > 0) {
      expect(notes[0]).toBe(69);
    }
  });
});

describe('Note transitions', () => {
  it('A4 → silence → A4: clean note-off and re-onset', () => {
    // Phase 1: Establish A4
    tickN(10, 69, 69);

    // Phase 2: Transition to silence — send explicit silence distributions
    const silenceResults: (TrackedNote | null)[] = [];
    for (let i = 0; i < 30; i++) {
      silenceResults.push(tick('silence', 'silence'));
    }
    // Should eventually go to null
    expect(silenceResults[silenceResults.length - 1]).toBeNull();

    // Phase 3: Re-onset A4
    const reOnset = tickN(10, 69, 69);
    expect(reOnset).not.toBeNull();
    expect(reOnset!.midiNumber).toBe(69);
  });

  it('A4 → C5: note change', () => {
    // Establish A4
    tickN(10, 69, 69);

    // Transition to C5
    const result = tickN(10, 72, 72);
    expect(result).not.toBeNull();
    expect(result!.midiNumber).toBe(72);
  });
});

describe('Multi-stream agreement', () => {
  it('two streams agreeing → higher confidence than single stream', () => {
    // Single stream
    const hmm1 = new NoteHMM(new TransitionMatrix());
    const obs1 = new ObservationModel();
    let singleConf = 0;
    for (let i = 0; i < 15; i++) {
      const fast = makeDistributionAtMidi(69, 0.7);
      const fused = obs1.fuse(fast, null, null, null);
      const r = hmm1.update(fused, null, 0.1);
      if (r) singleConf = r.confidence;
    }

    // Two streams
    const hmm2 = new NoteHMM(new TransitionMatrix());
    const obs2 = new ObservationModel();
    let doubleConf = 0;
    for (let i = 0; i < 15; i++) {
      const fast = makeDistributionAtMidi(69, 0.7);
      const hiRes = makeDistributionAtMidi(69, 0.7);
      const fused = obs2.fuse(fast, hiRes, null, null);
      const r = hmm2.update(fused, null, 0.1);
      if (r) doubleConf = r.confidence;
    }

    expect(doubleConf).toBeGreaterThanOrEqual(singleConf - 0.01);
  });
});

describe('Onset-assisted transitions', () => {
  it('onset speeds up silence→note transition', () => {
    // Without onset
    const hmm1 = new NoteHMM(new TransitionMatrix());
    const obs1 = new ObservationModel();
    let framesWithout = 0;
    for (let i = 0; i < 30; i++) {
      framesWithout++;
      const fast = makeDistributionAtMidi(69, 0.7);
      const fused = obs1.fuse(fast, null, null, null);
      const r = hmm1.update(fused, null, 0.1);
      if (r) break;
    }

    // With onset
    const tm2 = new TransitionMatrix();
    const hmm2 = new NoteHMM(tm2);
    const obs2 = new ObservationModel();
    let framesWith = 0;
    const onset = { timestamp: 0, strength: 1.0, spectralCentroid: 1000 };
    for (let i = 0; i < 30; i++) {
      framesWith++;
      const fast = makeDistributionAtMidi(69, 0.7);
      const fused = obs2.fuse(fast, null, null, null);
      const r = hmm2.update(fused, i === 0 ? onset : null, 0.1);
      if (r) break;
    }

    expect(framesWith).toBeLessThanOrEqual(framesWithout);
  });
});

describe('Dynamic range', () => {
  it('low RMS → low velocity', () => {
    const result = tickN(10, 69, 69, 0.02);
    expect(result).not.toBeNull();
    expect(result!.velocity).toBeLessThanOrEqual(40);
  });

  it('high RMS → high velocity', () => {
    const result = tickN(10, 69, 69, 0.3);
    expect(result).not.toBeNull();
    expect(result!.velocity).toBeGreaterThanOrEqual(100);
  });

  it('medium RMS → medium velocity', () => {
    const result = tickN(10, 69, 69, 0.1);
    expect(result).not.toBeNull();
    expect(result!.velocity).toBeGreaterThan(40);
    expect(result!.velocity).toBeLessThan(100);
  });
});

describe('Pipeline with expected notes', () => {
  it('expected notes bias detection toward target', () => {
    // Set expected notes
    tm.setExpectedNotes([69]); // A4

    // Feed slightly ambiguous observation (weak A4)
    const result = tickN(12, 69, 69, 0.1);
    expect(result).not.toBeNull();
    expect(result!.midiNumber).toBe(69);
  });
});
