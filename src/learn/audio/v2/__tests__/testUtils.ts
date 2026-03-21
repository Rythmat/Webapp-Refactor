// ── V2 Test Utilities ─────────────────────────────────────────────────────
// Shared mock infrastructure, synthetic audio generators, and assertion
// helpers for the v2 pitch detection test suite.

import { expect } from 'vitest';
import {
  NUM_STATES,
  SILENCE_STATE,
  MIDI_OFFSET,
  A4_FREQ,
  type PitchDistribution,
} from '../types';

// ── AnalyserNode Mock ────────────────────────────────────────────────────

export interface MockAnalyserNode {
  fftSize: number;
  frequencyBinCount: number;
  smoothingTimeConstant: number;
  context: { sampleRate: number };
  getFloatTimeDomainData: (buffer: Float32Array) => void;
  getFloatFrequencyData: (buffer: Float32Array) => void;
  setTimeDomainData: (data: Float32Array) => void;
  setFrequencyData: (data: Float32Array) => void;
}

export function createMockAnalyser(
  opts: {
    sampleRate?: number;
    fftSize?: number;
    timeDomainData?: Float32Array;
    frequencyData?: Float32Array;
  } = {},
): MockAnalyserNode {
  const sampleRate = opts.sampleRate ?? 48000;
  const fftSize = opts.fftSize ?? 2048;
  const frequencyBinCount = fftSize / 2;

  let timeDomainData = opts.timeDomainData ?? new Float32Array(fftSize);
  let frequencyData =
    opts.frequencyData ?? new Float32Array(frequencyBinCount).fill(-100);

  return {
    fftSize,
    frequencyBinCount,
    smoothingTimeConstant: 0,
    context: { sampleRate },
    getFloatTimeDomainData(buffer: Float32Array) {
      const len = Math.min(buffer.length, timeDomainData.length);
      for (let i = 0; i < len; i++) buffer[i] = timeDomainData[i];
    },
    getFloatFrequencyData(buffer: Float32Array) {
      const len = Math.min(buffer.length, frequencyData.length);
      for (let i = 0; i < len; i++) buffer[i] = frequencyData[i];
    },
    setTimeDomainData(data: Float32Array) {
      timeDomainData = data;
    },
    setFrequencyData(data: Float32Array) {
      frequencyData = data;
    },
  };
}

// ── Synthetic Audio Generators ───────────────────────────────────────────

/** Pure sine wave at the given frequency. */
export function makeSine(
  freq: number,
  sr: number,
  numSamples: number,
  amplitude: number = 0.5,
): Float32Array {
  const out = new Float32Array(numSamples);
  const w = (2 * Math.PI * freq) / sr;
  for (let i = 0; i < numSamples; i++) {
    out[i] = amplitude * Math.sin(w * i);
  }
  return out;
}

/** Harmonic tone: fundamental + N overtones with 1/k decay. */
export function makeHarmonicTone(
  freq: number,
  sr: number,
  numSamples: number,
  harmonics: number = 6,
  amplitude: number = 0.3,
): Float32Array {
  const out = new Float32Array(numSamples);
  const nyquist = sr / 2;
  for (let k = 1; k <= harmonics; k++) {
    const hFreq = freq * k;
    if (hFreq >= nyquist) break;
    const amp = amplitude / Math.pow(k, 0.7);
    const w = (2 * Math.PI * hFreq) / sr;
    for (let i = 0; i < numSamples; i++) {
      out[i] += amp * Math.sin(w * i);
    }
  }
  return out;
}

/** Piano-like tone with Fletcher inharmonicity + attack envelope. */
export function makePianoTone(
  midiNote: number,
  sr: number,
  numSamples: number,
  amplitude: number = 0.3,
): Float32Array {
  const f0 = A4_FREQ * Math.pow(2, (midiNote - 69) / 12);
  const nyquist = sr / 2;

  // Inharmonicity by register (matches PianoTemplates)
  let B: number;
  if (midiNote < 40) B = 0.0003;
  else if (midiNote < 65) B = 0.0005;
  else if (midiNote < 85) B = 0.002;
  else B = 0.005;

  const out = new Float32Array(numSamples);
  const numHarmonics = 15;

  for (let k = 1; k <= numHarmonics; k++) {
    // Fletcher model: f_k = k * f0 * sqrt(1 + B * k^2)
    const hFreq = k * f0 * Math.sqrt(1 + B * k * k);
    if (hFreq >= nyquist * 0.95) break;

    const amp = amplitude / Math.pow(k, 0.7);
    const w = (2 * Math.PI * hFreq) / sr;

    for (let i = 0; i < numSamples; i++) {
      // Percussive envelope: 5ms attack + exponential decay
      const t = i / sr;
      const attack = Math.min(1, t / 0.005);
      const decay = Math.exp(-t * 3);
      out[i] += amp * attack * decay * Math.sin(w * i);
    }
  }

  return out;
}

/** White noise (deterministic seed via simple LCG). */
export function makeNoise(
  sr: number,
  numSamples: number,
  amplitude: number = 0.1,
): Float32Array {
  const out = new Float32Array(numSamples);
  let seed = 42;
  for (let i = 0; i < numSamples; i++) {
    seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
    out[i] = amplitude * ((seed / 0x7fffffff) * 2 - 1);
  }
  return out;
}

/** Silence (zero buffer). */
export function makeSilence(numSamples: number): Float32Array {
  return new Float32Array(numSamples);
}

/** Scale signal amplitude. */
export function scaleAmplitude(
  signal: Float32Array,
  factor: number,
): Float32Array {
  const out = new Float32Array(signal.length);
  for (let i = 0; i < signal.length; i++) {
    out[i] = signal[i] * factor;
  }
  return out;
}

/** Compute RMS of a signal. */
export function computeRMS(signal: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < signal.length; i++) {
    sum += signal[i] * signal[i];
  }
  return Math.sqrt(sum / signal.length);
}

/**
 * Simple DFT: time-domain → dB magnitude spectrum.
 * O(N*M) where N=fftSize, M=numBins. Fine for test-sized buffers.
 * Returns Float32Array of dB values (matching getFloatFrequencyData format).
 */
export function computeSpectrum(
  samples: Float32Array,
  fftSize: number,
): Float32Array {
  const numBins = fftSize / 2;
  const spectrum = new Float32Array(numBins);

  for (let k = 0; k < numBins; k++) {
    let re = 0;
    let im = 0;
    const w = (2 * Math.PI * k) / fftSize;
    for (let n = 0; n < fftSize; n++) {
      const s = n < samples.length ? samples[n] : 0;
      re += s * Math.cos(w * n);
      im -= s * Math.sin(w * n);
    }
    const mag = Math.sqrt(re * re + im * im) / fftSize;
    spectrum[k] = 20 * Math.log10(Math.max(mag, 1e-10));
  }

  return spectrum;
}

// ── Assertion Helpers ────────────────────────────────────────────────────

/** Assert that a PitchDistribution peaks at the expected MIDI note. */
export function expectPeakAtMidi(
  dist: PitchDistribution,
  expectedMidi: number,
  tolerance: number = 1,
): void {
  const peak = peakMidi(dist);
  expect(peak).not.toBeNull();
  expect(Math.abs(peak! - expectedMidi)).toBeLessThanOrEqual(tolerance);
}

/** Assert distribution sums to approximately 1. */
export function expectNormalized(
  probs: Float64Array,
  epsilon: number = 0.01,
): void {
  let sum = 0;
  for (let i = 0; i < probs.length; i++) sum += probs[i];
  expect(Math.abs(sum - 1)).toBeLessThan(epsilon);
}

/** Get the MIDI note with highest probability (null if silence dominates). */
export function peakMidi(dist: PitchDistribution): number | null {
  let bestState = 0;
  let bestProb = -Infinity;
  for (let i = 0; i < NUM_STATES; i++) {
    if (dist.probs[i] > bestProb) {
      bestProb = dist.probs[i];
      bestState = i;
    }
  }
  if (bestState === SILENCE_STATE) return null;
  return bestState + MIDI_OFFSET;
}

/** Create a PitchDistribution peaked at a specific MIDI note. */
export function makeDistributionAtMidi(
  midi: number,
  peakProb: number = 0.8,
): PitchDistribution {
  const probs = new Float64Array(NUM_STATES);
  const state = midi - MIDI_OFFSET;
  const remaining = (1 - peakProb) / (NUM_STATES - 1);
  for (let i = 0; i < NUM_STATES; i++) {
    probs[i] = i === state ? peakProb : remaining;
  }
  return { probs, timestamp: performance.now(), frameId: 0 };
}

/** Create a silence distribution. */
export function makeSilenceDistribution(): PitchDistribution {
  const probs = new Float64Array(NUM_STATES);
  probs[SILENCE_STATE] = 1;
  return { probs, timestamp: performance.now(), frameId: 0 };
}
