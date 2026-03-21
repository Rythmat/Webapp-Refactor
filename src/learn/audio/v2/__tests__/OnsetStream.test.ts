// ── OnsetStream.test.ts ─────────────────────────────────────────────────
// Tests for spectral-flux onset detection.

import { describe, it, expect, beforeEach } from 'vitest';
import { OnsetStream } from '../OnsetStream';
import {
  createMockAnalyser,
  computeSpectrum,
  makeSine,
  makeSilence,
} from './testUtils';

const SR = 48000;
const FFT = 512;

describe('OnsetStream', () => {
  let onset: OnsetStream;

  beforeEach(() => {
    onset = new OnsetStream(FFT);
  });

  it('silence produces no onset', () => {
    const silence = makeSilence(FFT);
    const spectrum = computeSpectrum(silence, FFT);
    const analyser = createMockAnalyser({
      sampleRate: SR,
      fftSize: FFT,
      frequencyData: spectrum,
    });

    // Feed several frames of silence
    for (let i = 0; i < 10; i++) {
      const result = onset.process(analyser as unknown as AnalyserNode);
      expect(result).toBeNull();
    }
  });

  it('needs at least 4 frames to establish baseline', () => {
    const spectrum = computeSpectrum(makeSine(440, SR, FFT), FFT);
    const analyser = createMockAnalyser({
      sampleRate: SR,
      fftSize: FFT,
      frequencyData: spectrum,
    });

    // First 4 frames should never fire onset (even with data)
    for (let i = 0; i < 4; i++) {
      const result = onset.process(analyser as unknown as AnalyserNode);
      expect(result).toBeNull();
    }
  });

  it('sudden spectral change triggers onset', () => {
    const silenceSpectrum = computeSpectrum(makeSilence(FFT), FFT);
    const toneSpectrum = computeSpectrum(makeSine(440, SR, FFT, 0.5), FFT);

    const analyser = createMockAnalyser({
      sampleRate: SR,
      fftSize: FFT,
      frequencyData: silenceSpectrum,
    });

    // Build baseline with silence
    for (let i = 0; i < 6; i++) {
      onset.process(analyser as unknown as AnalyserNode);
    }

    // Sudden switch to tone
    analyser.setFrequencyData(toneSpectrum);
    const result = onset.process(analyser as unknown as AnalyserNode);

    // Should detect onset
    expect(result).not.toBeNull();
    if (result) {
      expect(result.strength).toBeGreaterThan(0);
      expect(result.strength).toBeLessThanOrEqual(1);
      expect(result.spectralCentroid).toBeGreaterThan(0);
    }
  });

  it('onset has spectralCentroid reflecting frequency', () => {
    const silenceSpectrum = computeSpectrum(makeSilence(FFT), FFT);
    const lowToneSpectrum = computeSpectrum(makeSine(200, SR, FFT, 0.5), FFT);
    const highToneSpectrum = computeSpectrum(makeSine(2000, SR, FFT, 0.5), FFT);

    // Low tone onset
    const analyserLow = createMockAnalyser({
      sampleRate: SR,
      fftSize: FFT,
      frequencyData: silenceSpectrum,
    });
    const onsetLow = new OnsetStream(FFT);
    for (let i = 0; i < 6; i++)
      onsetLow.process(analyserLow as unknown as AnalyserNode);
    analyserLow.setFrequencyData(lowToneSpectrum);
    const resultLow = onsetLow.process(analyserLow as unknown as AnalyserNode);

    // High tone onset
    const analyserHigh = createMockAnalyser({
      sampleRate: SR,
      fftSize: FFT,
      frequencyData: silenceSpectrum,
    });
    const onsetHigh = new OnsetStream(FFT);
    for (let i = 0; i < 6; i++)
      onsetHigh.process(analyserHigh as unknown as AnalyserNode);
    analyserHigh.setFrequencyData(highToneSpectrum);
    const resultHigh = onsetHigh.process(
      analyserHigh as unknown as AnalyserNode,
    );

    if (resultLow && resultHigh) {
      expect(resultHigh.spectralCentroid).toBeGreaterThan(
        resultLow.spectralCentroid,
      );
    }
  });

  it('reset clears state', () => {
    const spectrum = computeSpectrum(makeSine(440, SR, FFT), FFT);
    const analyser = createMockAnalyser({
      sampleRate: SR,
      fftSize: FFT,
      frequencyData: spectrum,
    });

    // Build some state
    for (let i = 0; i < 6; i++) {
      onset.process(analyser as unknown as AnalyserNode);
    }

    onset.reset();

    // After reset, should need baseline again — first frame returns null
    const result = onset.process(analyser as unknown as AnalyserNode);
    expect(result).toBeNull();
  });
});
