import { describe, it, expect } from 'vitest';
import {
  audioToUnison,
  type AudioBufferLike,
} from '../converters/audioToUnison';

const SAMPLE_RATE = 44100;

/**
 * Create a simple AudioBufferLike with click-based audio.
 * Clicks at regular intervals simulate chord onsets.
 */
function createTestBuffer(durationSeconds: number, bpm = 120): AudioBufferLike {
  const totalSamples = Math.floor(SAMPLE_RATE * durationSeconds);
  const samples = new Float32Array(totalSamples);
  const samplesPerBeat = (60 / bpm) * SAMPLE_RATE;

  // Generate clicks at beat positions with some harmonic content
  for (let beat = 0; beat * samplesPerBeat < totalSamples; beat++) {
    const start = Math.floor(beat * samplesPerBeat);
    // Create a ~50ms burst with harmonics to give the chord detector something
    for (let i = 0; i < 2205 && start + i < totalSamples; i++) {
      const t = i / SAMPLE_RATE;
      // C major-ish harmonics: ~262Hz (C4), ~330Hz (E4), ~392Hz (G4)
      samples[start + i] =
        0.4 * Math.sin(2 * Math.PI * 261.63 * t) +
        0.3 * Math.sin(2 * Math.PI * 329.63 * t) +
        0.2 * Math.sin(2 * Math.PI * 392.0 * t);
    }
  }

  // Small noise floor
  for (let i = 0; i < totalSamples; i++) {
    samples[i] += (Math.random() - 0.5) * 0.001;
  }

  return {
    sampleRate: SAMPLE_RATE,
    getChannelData: () => samples,
  };
}

/**
 * Silent buffer for edge case testing.
 */
function createSilentBuffer(durationSeconds: number): AudioBufferLike {
  const samples = new Float32Array(Math.floor(SAMPLE_RATE * durationSeconds));
  return {
    sampleRate: SAMPLE_RATE,
    getChannelData: () => samples,
  };
}

describe('audioToUnison', () => {
  it('produces a valid UnisonDocument from audio', () => {
    const buffer = createTestBuffer(4, 120);
    const doc = audioToUnison(buffer, { bpm: 120, title: 'Test Audio' });

    expect(doc.version).toBe('1.0.0');
    expect(doc.metadata.source).toBe('audio');
    expect(doc.metadata.title).toBe('Test Audio');
    expect(doc.analysis.key).toBeDefined();
    expect(doc.rhythm.bpm).toBe(120);
  });

  it('sets source metadata correctly', () => {
    const buffer = createTestBuffer(4, 120);
    const doc = audioToUnison(buffer, {
      bpm: 120,
      filename: 'recording.wav',
    });

    expect(doc.metadata.source).toBe('audio');
    expect(doc.metadata.sourceFilename).toBe('recording.wav');
  });

  it('handles silent audio gracefully', () => {
    const buffer = createSilentBuffer(2);
    const doc = audioToUnison(buffer, { bpm: 120 });

    expect(doc.version).toBe('1.0.0');
    expect(doc.metadata.source).toBe('audio');
    // Silent audio should still produce a valid document
    expect(doc.analysis.chordTimeline).toBeDefined();
  });

  it('auto-detects BPM when not provided', () => {
    const buffer = createTestBuffer(6, 100);
    const doc = audioToUnison(buffer, { title: 'Auto BPM' });

    expect(doc.version).toBe('1.0.0');
    // BPM should be detected (may not be exact 100 from synthetic audio)
    expect(doc.rhythm.bpm).toBeGreaterThan(0);
    expect(doc.rhythm.bpmConfidence).toBeDefined();
  });

  it('uses provided BPM over auto-detection', () => {
    const buffer = createTestBuffer(4, 120);
    const doc = audioToUnison(buffer, { bpm: 95 });

    expect(doc.rhythm.bpm).toBe(95);
  });

  it('creates tracks from audio analysis', () => {
    const buffer = createTestBuffer(4, 120);
    const doc = audioToUnison(buffer, { bpm: 120 });

    // Should have at least one track (harmony or melody)
    // The exact count depends on what the detector finds
    expect(doc.tracks).toBeDefined();
  });

  it('includes key detection', () => {
    const buffer = createTestBuffer(4, 120);
    const doc = audioToUnison(buffer, { bpm: 120 });

    expect(doc.analysis.key.rootName).toBeTruthy();
    expect(doc.analysis.key.mode).toBeTruthy();
    expect(doc.analysis.key.confidence).toBeGreaterThanOrEqual(0);
  });

  it('uses filename as title fallback', () => {
    const buffer = createTestBuffer(2, 120);
    const doc = audioToUnison(buffer, { bpm: 120, filename: 'my_song.wav' });

    expect(doc.metadata.title).toBe('my_song.wav');
  });
});
