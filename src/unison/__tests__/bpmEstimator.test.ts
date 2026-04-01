import { describe, it, expect } from 'vitest';
import { estimateBpm } from '../engine/bpmEstimator';

const SAMPLE_RATE = 44100;

/**
 * Generate a synthetic audio signal with clicks at a given BPM.
 * Each click is a short burst of amplitude.
 */
function generateClicks(bpm: number, durationSeconds: number): Float32Array {
  const totalSamples = Math.floor(SAMPLE_RATE * durationSeconds);
  const samples = new Float32Array(totalSamples);
  const samplesPerBeat = (60 / bpm) * SAMPLE_RATE;
  const clickLength = 200; // ~4.5ms click

  for (let beat = 0; beat * samplesPerBeat < totalSamples; beat++) {
    const start = Math.floor(beat * samplesPerBeat);
    for (let i = 0; i < clickLength && start + i < totalSamples; i++) {
      // Decaying click
      samples[start + i] = 0.8 * Math.exp(-i / 50);
    }
  }

  // Add a tiny noise floor so silence detection doesn't reject everything
  for (let i = 0; i < totalSamples; i++) {
    samples[i] += (Math.random() - 0.5) * 0.001;
  }

  return samples;
}

describe('estimateBpm', () => {
  it('detects 120 BPM', () => {
    const samples = generateClicks(120, 8);
    const result = estimateBpm(samples, SAMPLE_RATE);
    expect(result.bpm).toBeGreaterThanOrEqual(115);
    expect(result.bpm).toBeLessThanOrEqual(125);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('detects 90 BPM', () => {
    const samples = generateClicks(90, 10);
    const result = estimateBpm(samples, SAMPLE_RATE);
    expect(result.bpm).toBeGreaterThanOrEqual(85);
    expect(result.bpm).toBeLessThanOrEqual(95);
  });

  it('detects 140 BPM', () => {
    const samples = generateClicks(140, 8);
    const result = estimateBpm(samples, SAMPLE_RATE);
    expect(result.bpm).toBeGreaterThanOrEqual(135);
    expect(result.bpm).toBeLessThanOrEqual(145);
  });

  it('returns fallback 120 for silence', () => {
    const samples = new Float32Array(SAMPLE_RATE * 4); // 4s silence
    const result = estimateBpm(samples, SAMPLE_RATE);
    expect(result.bpm).toBe(120);
    expect(result.confidence).toBe(0);
  });

  it('returns fallback for very short audio', () => {
    const samples = new Float32Array(SAMPLE_RATE); // 1 second
    // Only 1-2 onsets possible
    samples[0] = 0.8;
    const result = estimateBpm(samples, SAMPLE_RATE);
    expect(result.bpm).toBe(120);
    expect(result.confidence).toBe(0);
  });

  it('confidence is between 0 and 1', () => {
    const samples = generateClicks(100, 10);
    const result = estimateBpm(samples, SAMPLE_RATE);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('bpm is always in valid range', () => {
    const samples = generateClicks(75, 8);
    const result = estimateBpm(samples, SAMPLE_RATE);
    expect(result.bpm).toBeGreaterThanOrEqual(30);
    expect(result.bpm).toBeLessThanOrEqual(300);
  });
});
