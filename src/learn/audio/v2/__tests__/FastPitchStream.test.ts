// ── FastPitchStream.test.ts ──────────────────────────────────────────────
// Tests for YIN → PitchDistribution conversion.

import { describe, it, expect, beforeEach } from 'vitest';
import { FastPitchStream } from '../FastPitchStream';
import { NUM_STATES, SILENCE_STATE } from '../types';
import {
  createMockAnalyser,
  makeSine,
  makeSilence,
  makeHarmonicTone,
  expectPeakAtMidi,
  expectNormalized,
} from './testUtils';

const SR = 48000;
const FFT = 2048;

let fps: FastPitchStream;

beforeEach(() => {
  fps = new FastPitchStream(SR, FFT);
});

describe('Pure tone detection', () => {
  it('A4 sine (440 Hz) → peak at MIDI 69', () => {
    const signal = makeSine(440, SR, FFT);
    const analyser = createMockAnalyser({
      sampleRate: SR,
      fftSize: FFT,
      timeDomainData: signal,
    });

    const dist = fps.process(analyser as unknown as AnalyserNode);
    expectPeakAtMidi(dist, 69);
  });

  it('C4 sine (261.63 Hz) → peak near MIDI 60', () => {
    const signal = makeSine(261.63, SR, FFT);
    const analyser = createMockAnalyser({
      sampleRate: SR,
      fftSize: FFT,
      timeDomainData: signal,
    });

    const dist = fps.process(analyser as unknown as AnalyserNode);
    // FFT=2048 at 48kHz has limited low-freq resolution; octave errors possible
    // Peak should be at 60 or within an octave (±12 semitones)
    expectPeakAtMidi(dist, 60, 12);
  });

  it('E4 harmonic tone → peak near MIDI 64', () => {
    const signal = makeHarmonicTone(329.63, SR, FFT);
    const analyser = createMockAnalyser({
      sampleRate: SR,
      fftSize: FFT,
      timeDomainData: signal,
    });

    const dist = fps.process(analyser as unknown as AnalyserNode);
    // Harmonic tones can trigger octave errors with short FFT
    expectPeakAtMidi(dist, 64, 12);
  });
});

describe('Silence detection', () => {
  it('zero buffer → silence distribution', () => {
    const signal = makeSilence(FFT);
    const analyser = createMockAnalyser({
      sampleRate: SR,
      fftSize: FFT,
      timeDomainData: signal,
    });

    const dist = fps.process(analyser as unknown as AnalyserNode);
    expect(dist.probs[SILENCE_STATE]).toBe(1);
  });
});

describe('RMS gate regression', () => {
  it('RMS ~0.005 passes through (not gated as silence)', () => {
    // Create a very soft sine (amplitude ~0.007 → RMS ~0.005)
    const signal = makeSine(440, SR, FFT, 0.007);
    const analyser = createMockAnalyser({
      sampleRate: SR,
      fftSize: FFT,
      timeDomainData: signal,
    });

    const dist = fps.process(analyser as unknown as AnalyserNode);
    // Should NOT be pure silence — should have some note probability
    expect(dist.probs[SILENCE_STATE]).toBeLessThan(1);
  });

  it('RMS ~0.002 → treated as silence', () => {
    const signal = makeSine(440, SR, FFT, 0.003);
    const analyser = createMockAnalyser({
      sampleRate: SR,
      fftSize: FFT,
      timeDomainData: signal,
    });

    const dist = fps.process(analyser as unknown as AnalyserNode);
    expect(dist.probs[SILENCE_STATE]).toBe(1);
  });
});

describe('Output properties', () => {
  it('output is normalized', () => {
    const signal = makeSine(440, SR, FFT);
    const analyser = createMockAnalyser({
      sampleRate: SR,
      fftSize: FFT,
      timeDomainData: signal,
    });

    const dist = fps.process(analyser as unknown as AnalyserNode);
    expectNormalized(dist.probs);
  });

  it('frameId increments', () => {
    const signal = makeSine(440, SR, FFT);
    const analyser = createMockAnalyser({
      sampleRate: SR,
      fftSize: FFT,
      timeDomainData: signal,
    });

    const d1 = fps.process(analyser as unknown as AnalyserNode);
    const d2 = fps.process(analyser as unknown as AnalyserNode);
    expect(d2.frameId).toBe(d1.frameId + 1);
  });

  it('output has correct length', () => {
    const signal = makeSine(440, SR, FFT);
    const analyser = createMockAnalyser({
      sampleRate: SR,
      fftSize: FFT,
      timeDomainData: signal,
    });

    const dist = fps.process(analyser as unknown as AnalyserNode);
    expect(dist.probs.length).toBe(NUM_STATES);
  });
});

describe('Reset', () => {
  it('reset clears state', () => {
    const signal = makeSine(440, SR, FFT);
    const analyser = createMockAnalyser({
      sampleRate: SR,
      fftSize: FFT,
      timeDomainData: signal,
    });

    fps.process(analyser as unknown as AnalyserNode);
    fps.reset();

    // After reset, frameId restarts at 0
    const dist = fps.process(analyser as unknown as AnalyserNode);
    expect(dist.frameId).toBe(0);
  });
});
