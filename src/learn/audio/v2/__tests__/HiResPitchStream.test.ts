// ── HiResPitchStream.test.ts ─────────────────────────────────────────────
// Tests for high-resolution pitch detection.

import { describe, it, expect, beforeEach } from 'vitest';
import { HiResPitchStream } from '../HiResPitchStream';
import { SILENCE_STATE } from '../types';
import {
  createMockAnalyser,
  makeSine,
  makeSilence,
  expectPeakAtMidi,
  expectNormalized,
} from './testUtils';

const SR = 48000;
const FFT = 8192;

let hps: HiResPitchStream;

beforeEach(() => {
  hps = new HiResPitchStream(SR, FFT);
});

describe('Pitch detection', () => {
  it('A4 sine (440 Hz) → MIDI 69', () => {
    const signal = makeSine(440, SR, FFT);
    const analyser = createMockAnalyser({
      sampleRate: SR,
      fftSize: FFT,
      timeDomainData: signal,
    });

    const dist = hps.process(analyser as unknown as AnalyserNode);
    expect(dist).not.toBeNull();
    expectPeakAtMidi(dist!, 69);
  });

  it('A1 sine (55 Hz) → MIDI 33 (low note advantage)', () => {
    const signal = makeSine(55, SR, FFT, 0.5);
    const analyser = createMockAnalyser({
      sampleRate: SR,
      fftSize: FFT,
      timeDomainData: signal,
    });

    const dist = hps.process(analyser as unknown as AnalyserNode);
    expect(dist).not.toBeNull();
    expectPeakAtMidi(dist!, 33);
  });
});

describe('Staleness detection', () => {
  it('same buffer twice → second returns null', () => {
    const signal = makeSine(440, SR, FFT);
    const analyser = createMockAnalyser({
      sampleRate: SR,
      fftSize: FFT,
      timeDomainData: signal,
    });

    const first = hps.process(analyser as unknown as AnalyserNode);
    expect(first).not.toBeNull();

    // Same buffer → stale
    const second = hps.process(analyser as unknown as AnalyserNode);
    expect(second).toBeNull();
  });

  it('different buffer → new distribution', () => {
    const signal1 = makeSine(440, SR, FFT);
    const signal2 = makeSine(880, SR, FFT);

    const analyser = createMockAnalyser({
      sampleRate: SR,
      fftSize: FFT,
      timeDomainData: signal1,
    });

    hps.process(analyser as unknown as AnalyserNode);

    // Change buffer
    analyser.setTimeDomainData(signal2);
    const second = hps.process(analyser as unknown as AnalyserNode);
    expect(second).not.toBeNull();
  });
});

describe('Silence handling', () => {
  it('zero buffer → silence distribution (after a non-zero buffer)', () => {
    // First process a real signal so lastBufferHash is non-zero
    const toneSignal = makeSine(440, SR, FFT);
    const analyser = createMockAnalyser({
      sampleRate: SR,
      fftSize: FFT,
      timeDomainData: toneSignal,
    });
    hps.process(analyser as unknown as AnalyserNode);

    // Now switch to silence
    const silence = makeSilence(FFT);
    analyser.setTimeDomainData(silence);
    const dist = hps.process(analyser as unknown as AnalyserNode);
    expect(dist).not.toBeNull();
    expect(dist!.probs[SILENCE_STATE]).toBe(1);
  });
});

describe('RMS gate regression', () => {
  it('soft note (RMS ~0.005) passes through', () => {
    const signal = makeSine(440, SR, FFT, 0.007);
    const analyser = createMockAnalyser({
      sampleRate: SR,
      fftSize: FFT,
      timeDomainData: signal,
    });

    const dist = hps.process(analyser as unknown as AnalyserNode);
    expect(dist).not.toBeNull();
    expect(dist!.probs[SILENCE_STATE]).toBeLessThan(1);
  });
});

describe('Output properties', () => {
  it('output is normalized when not null', () => {
    const signal = makeSine(440, SR, FFT);
    const analyser = createMockAnalyser({
      sampleRate: SR,
      fftSize: FFT,
      timeDomainData: signal,
    });

    const dist = hps.process(analyser as unknown as AnalyserNode);
    expect(dist).not.toBeNull();
    expectNormalized(dist!.probs);
  });
});

describe('Reset', () => {
  it('reset clears staleness tracking', () => {
    const signal = makeSine(440, SR, FFT);
    const analyser = createMockAnalyser({
      sampleRate: SR,
      fftSize: FFT,
      timeDomainData: signal,
    });

    hps.process(analyser as unknown as AnalyserNode);
    // Same buffer would return null...
    hps.reset();
    // ...but after reset, staleness is cleared
    const dist = hps.process(analyser as unknown as AnalyserNode);
    expect(dist).not.toBeNull();
  });
});
