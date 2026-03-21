// ── NMFDetector.test.ts ─────────────────────────────────────────────────
// Tests for NMF polyphonic detection.

import { describe, it, expect, beforeEach } from 'vitest';
import { NMFDetector } from '../NMFDetector';
import { PianoTemplates } from '../PianoTemplates';
import { A4_FREQ, midiToState } from '../types';
import { createMockAnalyser } from './testUtils';

const SR = 48000;
const FFT = 8192;

let templates: PianoTemplates;
let nmf: NMFDetector;

beforeEach(() => {
  templates = new PianoTemplates(SR, FFT);
  nmf = new NMFDetector(templates);
});

/** Create a dB spectrum for a single MIDI note (for the mock analyser). */
function makeNoteFreqData(midi: number): Float32Array {
  const f0 = A4_FREQ * Math.pow(2, (midi - 69) / 12);
  const numBins = FFT / 2 + 1;
  const data = new Float32Array(numBins).fill(-100);
  const binWidth = SR / FFT;

  for (let k = 1; k <= 15; k++) {
    const freq = k * f0;
    if (freq >= SR / 2) break;
    const bin = Math.round(freq / binWidth);
    if (bin >= 0 && bin < numBins) {
      const amp = 1 / Math.pow(k, 0.7);
      data[bin] = 20 * Math.log10(amp);
    }
  }
  return data;
}

/** Create a dB spectrum for a chord (multiple MIDI notes). */
function makeChordFreqData(midis: number[]): Float32Array {
  const numBins = FFT / 2 + 1;
  const linear = new Float64Array(numBins);
  const binWidth = SR / FFT;

  for (const midi of midis) {
    const f0 = A4_FREQ * Math.pow(2, (midi - 69) / 12);
    for (let k = 1; k <= 15; k++) {
      const freq = k * f0;
      if (freq >= SR / 2) break;
      const bin = Math.round(freq / binWidth);
      if (bin >= 0 && bin < numBins) {
        linear[bin] += (1 / Math.pow(k, 0.7)) * 0.3;
      }
    }
  }

  // Convert to dB
  const data = new Float32Array(numBins);
  for (let b = 0; b < numBins; b++) {
    data[b] = linear[b] > 0 ? 20 * Math.log10(linear[b]) : -100;
  }
  return data;
}

describe('Single note detection', () => {
  it('A4 spectrum → highest activation at key index 48 (MIDI 69)', () => {
    const freqData = makeNoteFreqData(69);
    const analyser = createMockAnalyser({
      sampleRate: SR,
      fftSize: FFT,
      frequencyData: freqData,
    });

    const result = nmf.process(analyser as unknown as AnalyserNode);

    // Find highest activation
    let peakIdx = 0;
    let peakVal = -Infinity;
    for (let k = 0; k < 88; k++) {
      if (result.weights[k] > peakVal) {
        peakVal = result.weights[k];
        peakIdx = k;
      }
    }

    // Should be at or near A4's index (48 = 69 - 21)
    expect(Math.abs(peakIdx - midiToState(69))).toBeLessThanOrEqual(2);
  });
});

describe('Chord detection', () => {
  it('C major triad → activations for C4, E4, G4', () => {
    const freqData = makeChordFreqData([60, 64, 67]);
    const analyser = createMockAnalyser({
      sampleRate: SR,
      fftSize: FFT,
      frequencyData: freqData,
    });

    // Run multiple frames for convergence
    let result;
    for (let i = 0; i < 5; i++) {
      result = nmf.process(analyser as unknown as AnalyserNode);
    }

    // All three notes should have non-zero activation
    const c4 = result!.weights[midiToState(60)];
    const e4 = result!.weights[midiToState(64)];
    const g4 = result!.weights[midiToState(67)];

    expect(c4).toBeGreaterThan(0);
    expect(e4).toBeGreaterThan(0);
    expect(g4).toBeGreaterThan(0);
  });
});

describe('Silence handling', () => {
  it('silence → activations decay', () => {
    // First feed a note
    const noteData = makeNoteFreqData(69);
    const analyser = createMockAnalyser({
      sampleRate: SR,
      fftSize: FFT,
      frequencyData: noteData,
    });
    nmf.process(analyser as unknown as AnalyserNode);

    // Then feed silence (very low dB)
    const silenceData = new Float32Array(FFT / 2 + 1).fill(-100);
    analyser.setFrequencyData(silenceData);

    const result = nmf.process(analyser as unknown as AnalyserNode);

    // Activations should be decayed
    let maxActivation = 0;
    for (let k = 0; k < 88; k++) {
      if (result.weights[k] > maxActivation) maxActivation = result.weights[k];
    }
    // Should be small after one silence frame
    expect(maxActivation).toBeLessThan(0.5);
  });
});

describe('setActiveKeys', () => {
  it('masked keys have zero activation', () => {
    nmf.setActiveKeys([60, 64, 67]); // Only C major triad

    const freqData = makeNoteFreqData(69); // A4 is NOT in active set
    const analyser = createMockAnalyser({
      sampleRate: SR,
      fftSize: FFT,
      frequencyData: freqData,
    });

    const result = nmf.process(analyser as unknown as AnalyserNode);

    // A4's key should be zero (masked out)
    expect(result.weights[midiToState(69)]).toBe(0);
  });

  it('null re-enables all keys', () => {
    nmf.setActiveKeys([60]);
    nmf.setActiveKeys(null);

    const freqData = makeNoteFreqData(69);
    const analyser = createMockAnalyser({
      sampleRate: SR,
      fftSize: FFT,
      frequencyData: freqData,
    });

    const result = nmf.process(analyser as unknown as AnalyserNode);
    expect(result.weights[midiToState(69)]).toBeGreaterThan(0);
  });
});

describe('Warm start', () => {
  it('consecutive frames converge (warm start from previous H)', () => {
    const freqData = makeNoteFreqData(60);
    const analyser = createMockAnalyser({
      sampleRate: SR,
      fftSize: FFT,
      frequencyData: freqData,
    });

    const results: number[] = [];
    for (let i = 0; i < 5; i++) {
      const r = nmf.process(analyser as unknown as AnalyserNode);
      results.push(r.weights[midiToState(60)]);
    }

    // Activation should stabilize (last two frames similar)
    const diff = Math.abs(results[4] - results[3]);
    const scale = Math.max(results[4], 0.001);
    expect(diff / scale).toBeLessThan(0.5);
  });
});

describe('Reset', () => {
  it('reset clears activations (cold start)', () => {
    const freqData = makeNoteFreqData(69);
    const analyser = createMockAnalyser({
      sampleRate: SR,
      fftSize: FFT,
      frequencyData: freqData,
    });

    nmf.process(analyser as unknown as AnalyserNode);
    nmf.reset();

    // After reset, frameId should restart
    const result = nmf.process(analyser as unknown as AnalyserNode);
    expect(result.frameId).toBe(0);
  });
});

describe('Output properties', () => {
  it('weights are non-negative', () => {
    const freqData = makeNoteFreqData(60);
    const analyser = createMockAnalyser({
      sampleRate: SR,
      fftSize: FFT,
      frequencyData: freqData,
    });

    const result = nmf.process(analyser as unknown as AnalyserNode);
    for (let k = 0; k < 88; k++) {
      expect(result.weights[k]).toBeGreaterThanOrEqual(0);
    }
  });

  it('frameId increments', () => {
    const freqData = makeNoteFreqData(60);
    const analyser = createMockAnalyser({
      sampleRate: SR,
      fftSize: FFT,
      frequencyData: freqData,
    });

    const r1 = nmf.process(analyser as unknown as AnalyserNode);
    const r2 = nmf.process(analyser as unknown as AnalyserNode);
    expect(r2.frameId).toBe(r1.frameId + 1);
  });
});
