// ── InstrumentProfiler.test.ts ───────────────────────────────────────────
// Tests for inharmonicity estimation and spectral correction.

import { describe, it, expect, beforeEach } from 'vitest';
import { InstrumentProfiler } from '../InstrumentProfiler';
import { A4_FREQ } from '../types';

let profiler: InstrumentProfiler;

const SR = 48000;
const FFT_SIZE = 8192;
const NUM_BINS = FFT_SIZE / 2; // getFloatFrequencyData returns fftSize/2 bins

beforeEach(() => {
  profiler = new InstrumentProfiler();
});

/** Create a synthetic spectrum with harmonics at the given MIDI note. */
function makeNoteSpectrum(
  midiNote: number,
  sampleRate: number,
  numBins: number,
  noiseDb = -80,
): Float32Array {
  const spectrum = new Float32Array(numBins).fill(noiseDb);
  const f0 = A4_FREQ * Math.pow(2, (midiNote - 69) / 12);
  const fftSize = numBins * 2;
  const binWidth = sampleRate / fftSize;

  for (let k = 1; k <= 10; k++) {
    const freq = k * f0;
    if (freq >= sampleRate / 2) break;
    const bin = Math.round(freq / binWidth);
    if (bin >= 0 && bin < numBins) {
      // Amplitude decays as 1/k^0.7, convert to dB
      const amplitude = 1 / Math.pow(k, 0.7);
      spectrum[bin] = 20 * Math.log10(amplitude);
    }
  }
  return spectrum;
}

describe('Calibration', () => {
  it('starts uncalibrated', () => {
    expect(profiler.isCalibrated).toBe(false);
    expect(profiler.notesProfiled).toBe(0);
  });

  it('calibrates after 5 notes', () => {
    for (let i = 0; i < 4; i++) {
      const midi = 60 + i * 4;
      profiler.observeNote(midi, makeNoteSpectrum(midi, SR, NUM_BINS), SR);
    }
    expect(profiler.isCalibrated).toBe(false);

    profiler.observeNote(76, makeNoteSpectrum(76, SR, NUM_BINS), SR);
    expect(profiler.isCalibrated).toBe(true);
    expect(profiler.notesProfiled).toBe(5);
  });

  it('stops collecting after 20 notes', () => {
    for (let i = 0; i < 25; i++) {
      const midi = 21 + (i % 88);
      profiler.observeNote(midi, makeNoteSpectrum(midi, SR, NUM_BINS), SR);
    }
    expect(profiler.notesProfiled).toBe(20);
  });
});

describe('Inharmonicity estimation', () => {
  it('returns measured value for profiled keys', () => {
    profiler.observeNote(69, makeNoteSpectrum(69, SR, NUM_BINS), SR);
    const B = profiler.getInharmonicity(69);
    // Should return a positive value (or the default if estimation fails)
    expect(B).toBeGreaterThan(0);
    expect(B).toBeLessThan(0.1);
  });

  it('interpolates for non-profiled keys', () => {
    // Profile two notes
    profiler.observeNote(60, makeNoteSpectrum(60, SR, NUM_BINS), SR);
    profiler.observeNote(72, makeNoteSpectrum(72, SR, NUM_BINS), SR);

    const b60 = profiler.getInharmonicity(60);
    const b72 = profiler.getInharmonicity(72);
    const b66 = profiler.getInharmonicity(66); // midpoint

    // Interpolated value should be between the two
    expect(b66).toBeGreaterThanOrEqual(Math.min(b60, b72) - 0.001);
    expect(b66).toBeLessThanOrEqual(Math.max(b60, b72) + 0.001);
  });

  it('returns default for unprofiled range', () => {
    const B = profiler.getInharmonicity(69);
    expect(B).toBeCloseTo(0.0005, 4); // DEFAULT_INHARMONICITY
  });
});

describe('Spectral correction', () => {
  it('returns correct length', () => {
    const numBins = FFT_SIZE / 2 + 1;
    const correction = profiler.getSpectralCorrection(numBins, SR);
    expect(correction.length).toBe(numBins);
  });

  it('correction is all ones when no notes profiled', () => {
    const numBins = FFT_SIZE / 2 + 1;
    const correction = profiler.getSpectralCorrection(numBins, SR);
    for (let i = 0; i < correction.length; i++) {
      expect(correction[i]).toBeCloseTo(1.0, 1);
    }
  });
});

describe('Reset', () => {
  it('clears all profiling state', () => {
    for (let i = 0; i < 5; i++) {
      const midi = 60 + i * 4;
      profiler.observeNote(midi, makeNoteSpectrum(midi, SR, NUM_BINS), SR);
    }
    expect(profiler.isCalibrated).toBe(true);

    profiler.reset();
    expect(profiler.isCalibrated).toBe(false);
    expect(profiler.notesProfiled).toBe(0);
  });
});
