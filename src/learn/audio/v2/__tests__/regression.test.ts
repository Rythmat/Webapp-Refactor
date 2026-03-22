// ── regression.test.ts ──────────────────────────────────────────────────
// Targeted tests verifying specific bug fixes from the v2 pipeline.

import { describe, it, expect } from 'vitest';
import { FastPitchStream } from '../FastPitchStream';
import { HiResPitchStream } from '../HiResPitchStream';
import { NoteHMM } from '../NoteHMM';
import { ObservationModel } from '../ObservationModel';
import { OnsetStream } from '../OnsetStream';
import { TransitionMatrix } from '../TransitionMatrix';
import { NUM_STATES, SILENCE_STATE, midiToState } from '../types';
import {
  createMockAnalyser,
  makeSine,
  makeSilence,
  computeSpectrum,
  makeDistributionAtMidi,
  makeSilenceDistribution,
} from './testUtils';

// ── Fix 1.1: Log-sum-exp correctness ─────────────────────────────────────

describe('[REGRESSION] Log-sum-exp (Fix 1.1)', () => {
  it('confidence is always in [0, 1] for sustained observations', () => {
    const tm = new TransitionMatrix();
    const hmm = new NoteHMM(tm);
    const obs = new Float64Array(NUM_STATES);
    const state = midiToState(69);
    obs[state] = 0.9;
    const rest = 0.1 / (NUM_STATES - 1);
    for (let i = 0; i < NUM_STATES; i++) {
      if (i !== state) obs[i] = rest;
    }

    for (let frame = 0; frame < 50; frame++) {
      const result = hmm.update(obs, null, 0.1);
      if (result) {
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1.001); // tiny float tolerance
      }
    }
  });

  it('confidence matches expected posterior for strong signal', () => {
    const tm = new TransitionMatrix();
    const hmm = new NoteHMM(tm);
    const obs = new Float64Array(NUM_STATES);
    obs[midiToState(69)] = 0.95;
    const rest = 0.05 / (NUM_STATES - 1);
    for (let i = 0; i < NUM_STATES; i++) {
      if (i !== midiToState(69)) obs[i] = rest;
    }

    // After many frames, confidence should be very high
    let lastConfidence = 0;
    for (let i = 0; i < 30; i++) {
      const result = hmm.update(obs, null, 0.1);
      if (result) lastConfidence = result.confidence;
    }
    expect(lastConfidence).toBeGreaterThan(0.8);
  });
});

// ── Fix 1.2: Hysteresis on/off thresholds ─────────────────────────────────

describe('[REGRESSION] Hysteresis (Fix 1.2)', () => {
  it('rising confidence: note activates after crossing ON threshold', () => {
    const tm = new TransitionMatrix();
    const hmm = new NoteHMM(tm);

    // Start from silence, gradually increase observation strength
    let activated = false;
    for (let frame = 0; frame < 20; frame++) {
      const strength = 0.3 + frame * 0.04; // 0.30 → 1.06
      const obs = new Float64Array(NUM_STATES);
      obs[midiToState(69)] = Math.min(strength, 0.99);
      const rest = (1 - obs[midiToState(69)]) / (NUM_STATES - 1);
      for (let i = 0; i < NUM_STATES; i++) {
        if (i !== midiToState(69)) obs[i] = rest;
      }

      const result = hmm.update(obs, null, 0.1);
      if (result) activated = true;
    }
    expect(activated).toBe(true);
  });

  it('active note persists through moderate confidence dip', () => {
    const tm = new TransitionMatrix();
    const hmm = new NoteHMM(tm);

    // Establish note with strong signal
    const strongObs = new Float64Array(NUM_STATES);
    strongObs[midiToState(69)] = 0.95;
    const rest = 0.05 / (NUM_STATES - 1);
    for (let i = 0; i < NUM_STATES; i++) {
      if (i !== midiToState(69)) strongObs[i] = rest;
    }
    for (let i = 0; i < 15; i++) hmm.update(strongObs, null, 0.1);

    // Now send moderate observations — note should persist
    const modObs = new Float64Array(NUM_STATES);
    modObs[midiToState(69)] = 0.5;
    const modRest = 0.5 / (NUM_STATES - 1);
    for (let i = 0; i < NUM_STATES; i++) {
      if (i !== midiToState(69)) modObs[i] = modRest;
    }
    const result = hmm.update(modObs, null, 0.1);
    expect(result).not.toBeNull();
    expect(result!.midiNumber).toBe(69);
  });
});

// ── Fix 1.3: RMS gate threshold ────────────────────────────────────────

describe('[REGRESSION] RMS gate (Fix 1.3)', () => {
  const SR = 48000;

  it('FastPitchStream: RMS ~0.005 → not silence', () => {
    const fps = new FastPitchStream(SR, 2048);
    const signal = makeSine(440, SR, 2048, 0.007);
    const analyser = createMockAnalyser({
      sampleRate: SR,
      fftSize: 2048,
      timeDomainData: signal,
    });

    const dist = fps.process(analyser as unknown as AnalyserNode);
    expect(dist.probs[SILENCE_STATE]).toBeLessThan(1);
  });

  it('FastPitchStream: RMS ~0.002 → silence', () => {
    const fps = new FastPitchStream(SR, 2048);
    const signal = makeSine(440, SR, 2048, 0.003);
    const analyser = createMockAnalyser({
      sampleRate: SR,
      fftSize: 2048,
      timeDomainData: signal,
    });

    const dist = fps.process(analyser as unknown as AnalyserNode);
    expect(dist.probs[SILENCE_STATE]).toBe(1);
  });

  it('HiResPitchStream: soft note passes through', () => {
    const hps = new HiResPitchStream(SR, 8192);
    const signal = makeSine(440, SR, 8192, 0.007);
    const analyser = createMockAnalyser({
      sampleRate: SR,
      fftSize: 8192,
      timeDomainData: signal,
    });

    const dist = hps.process(analyser as unknown as AnalyserNode);
    expect(dist).not.toBeNull();
    expect(dist!.probs[SILENCE_STATE]).toBeLessThan(1);
  });
});

// ── Fix 1.5: Onset decay rate ──────────────────────────────────────────

describe('[REGRESSION] Onset decay (Fix 1.5)', () => {
  it('boost at frame 8 ≈ 0.058 (0.7^8), still above 0.01 threshold', () => {
    const tm = new TransitionMatrix();
    tm.injectOnset({ timestamp: 0, strength: 1.0, spectralCentroid: 1000 });

    for (let i = 0; i < 8; i++) tm.advanceFrame();

    // 0.7^8 ≈ 0.0576 — still above 0.01 cutoff
    const noteState = midiToState(69);
    const baseTrans = tm.getTransition(SILENCE_STATE, noteState);
    const effective = tm.getEffectiveTransition(SILENCE_STATE, noteState);

    // Effective should still be boosted above base
    expect(effective).toBeGreaterThan(baseTrans);
  });

  it('boost at frame 30 → negligible (below threshold)', () => {
    const tm = new TransitionMatrix();
    tm.injectOnset({ timestamp: 0, strength: 1.0, spectralCentroid: 1000 });

    for (let i = 0; i < 30; i++) tm.advanceFrame();

    // 0.85^30 ≈ 0.0076 — below 0.01 cutoff
    const noteState = midiToState(69);
    const baseTrans = tm.getTransition(SILENCE_STATE, noteState);
    const effective = tm.getEffectiveTransition(SILENCE_STATE, noteState);

    // Should be essentially the same as base (no boost)
    expect(Math.abs(effective - baseTrans)).toBeLessThan(baseTrans * 0.1);
  });
});

// ── Fix 2.2: PROB_FLOOR prevents veto ──────────────────────────────────

describe('[REGRESSION] PROB_FLOOR (Fix 2.2)', () => {
  it('zero in one stream does not veto the note', () => {
    const model = new ObservationModel();

    // Fast says A4, hiRes says silence (zero for A4)
    const fast = makeDistributionAtMidi(69, 0.95);
    const hiRes = makeSilenceDistribution();

    const fused = model.fuse(fast, hiRes, null, null);
    const stateA4 = midiToState(69);

    // A4 should still have non-zero probability thanks to PROB_FLOOR
    expect(fused[stateA4]).toBeGreaterThan(0);
  });
});

// ── Fix 2.5: EMA drift cap ─────────────────────────────────────────────

describe('[REGRESSION] EMA drift cap (Fix 2.5)', () => {
  it('sustained loud input does not prevent future onset detection', () => {
    const SR = 48000;
    const FFT = 512;

    const onset = new OnsetStream(FFT);
    const loudSpectrum = computeSpectrum(makeSine(440, SR, FFT, 0.5), FFT);
    const silenceSpectrum = computeSpectrum(makeSilence(FFT), FFT);

    const analyser = createMockAnalyser({
      sampleRate: SR,
      fftSize: FFT,
      frequencyData: loudSpectrum,
    });

    // Feed many frames of loud signal (would cause EMA drift without cap)
    for (let i = 0; i < 50; i++) {
      onset.process(analyser as unknown as AnalyserNode);
    }

    // Switch to silence briefly
    analyser.setFrequencyData(silenceSpectrum);
    for (let i = 0; i < 5; i++) {
      onset.process(analyser as unknown as AnalyserNode);
    }

    // Switch back to loud — should still detect onset
    analyser.setFrequencyData(loudSpectrum);
    const result = onset.process(analyser as unknown as AnalyserNode);

    // The onset should fire because EMA was capped at 0.1,
    // not drifted to match the loud signal
    expect(result).not.toBeNull();
  });
});
