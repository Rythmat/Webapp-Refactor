import { describe, it, expect } from 'vitest';
import type { AudioBufferLike } from '../converters/audioToUnison';
import { analyzeTimbre } from '../engine/timbreAnalyzer';

// ── Helpers ──────────────────────────────────────────────────────────────────

const SAMPLE_RATE = 44100;
const DURATION_S = 1;
const NUM_SAMPLES = SAMPLE_RATE * DURATION_S;

/** Generate a sine wave at a given frequency. */
function makeSine(
  freq: number,
  duration = DURATION_S,
  sr = SAMPLE_RATE,
): Float32Array {
  const n = sr * duration;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = Math.sin((2 * Math.PI * freq * i) / sr);
  }
  return out;
}

/** Generate a rich harmonic tone (fundamental + overtones). */
function makeHarmonicTone(freq: number, harmonics = 6): Float32Array {
  const out = new Float32Array(NUM_SAMPLES);
  for (let h = 1; h <= harmonics; h++) {
    const amp = 1 / h;
    for (let i = 0; i < NUM_SAMPLES; i++) {
      out[i] += amp * Math.sin((2 * Math.PI * freq * h * i) / SAMPLE_RATE);
    }
  }
  return out;
}

/** Generate white noise. */
function makeNoise(): Float32Array {
  const out = new Float32Array(NUM_SAMPLES);
  for (let i = 0; i < NUM_SAMPLES; i++) {
    out[i] = Math.random() * 2 - 1;
  }
  return out;
}

/** Generate a tone with a sharp attack envelope. */
function makePercussive(freq: number): Float32Array {
  const out = new Float32Array(NUM_SAMPLES);
  for (let i = 0; i < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const envelope = Math.exp(-t * 8); // fast decay
    out[i] = envelope * Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE);
  }
  return out;
}

/** Generate a tone with a slow attack (pad-like). */
function makePadLike(freq: number): Float32Array {
  const out = new Float32Array(NUM_SAMPLES * 2); // 2 seconds
  for (let i = 0; i < out.length; i++) {
    const t = i / SAMPLE_RATE;
    const attack = Math.min(1, t / 0.5); // 500ms attack
    const release = Math.max(0, 1 - Math.max(0, t - 1.5) / 0.5);
    out[i] =
      attack * release * Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE);
  }
  return out;
}

/** Generate a low bass tone. */
function makeBass(): Float32Array {
  return makeHarmonicTone(80, 4);
}

/** Wrap samples into an AudioBufferLike. */
function buffer(samples: Float32Array, sr = SAMPLE_RATE): AudioBufferLike {
  return { sampleRate: sr, getChannelData: () => samples };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('analyzeTimbre', () => {
  it('returns a valid TimbreAnalysis for a sine wave', () => {
    const result = analyzeTimbre(buffer(makeSine(440)));

    expect(result.instrumentGuesses).toHaveLength(1);
    expect(result.instrumentGuesses[0].trackId).toBe('audio');
    expect(result.instrumentGuesses[0].confidence).toBeGreaterThan(0);
    expect(result.spectralFingerprint).toBeDefined();
    expect(result.amplitudeEnvelope).toBeDefined();
  });

  it('uses custom trackId', () => {
    const result = analyzeTimbre(buffer(makeSine(440)), 'track-1');
    expect(result.instrumentGuesses[0].trackId).toBe('track-1');
  });

  it('returns fallback for very short audio', () => {
    const short = new Float32Array(100);
    const result = analyzeTimbre(buffer(short));

    expect(result.instrumentGuesses[0].instrument).toBe('unknown');
    expect(result.instrumentGuesses[0].confidence).toBe(0);
    expect(result.spectralFingerprint).toBeUndefined();
  });

  describe('spectral fingerprint', () => {
    it('detects higher centroid for bright sounds', () => {
      const bright = analyzeTimbre(buffer(makeSine(4000)));
      const dark = analyzeTimbre(buffer(makeSine(200)));

      expect(bright.spectralFingerprint!.spectralCentroidHz).toBeGreaterThan(
        dark.spectralFingerprint!.spectralCentroidHz,
      );
    });

    it('brightness is higher for high-frequency content', () => {
      const bright = analyzeTimbre(buffer(makeSine(6000)));
      const dark = analyzeTimbre(buffer(makeSine(300)));

      expect(bright.spectralFingerprint!.brightness).toBeGreaterThan(
        dark.spectralFingerprint!.brightness,
      );
    });

    it('warmth is higher for low-mid content', () => {
      const warm = analyzeTimbre(buffer(makeSine(400)));
      const cold = analyzeTimbre(buffer(makeSine(8000)));

      expect(warm.spectralFingerprint!.warmth).toBeGreaterThan(
        cold.spectralFingerprint!.warmth,
      );
    });

    it('spectral centroid and rolloff are non-negative', () => {
      const result = analyzeTimbre(buffer(makeHarmonicTone(440)));
      expect(
        result.spectralFingerprint!.spectralCentroidHz,
      ).toBeGreaterThanOrEqual(0);
      expect(
        result.spectralFingerprint!.spectralRolloffHz,
      ).toBeGreaterThanOrEqual(0);
    });

    it('brightness and warmth are between 0 and 1', () => {
      const result = analyzeTimbre(buffer(makeHarmonicTone(440)));
      expect(result.spectralFingerprint!.brightness).toBeGreaterThanOrEqual(0);
      expect(result.spectralFingerprint!.brightness).toBeLessThanOrEqual(1);
      expect(result.spectralFingerprint!.warmth).toBeGreaterThanOrEqual(0);
      expect(result.spectralFingerprint!.warmth).toBeLessThanOrEqual(1);
    });

    it('attack transient is one of expected values', () => {
      const result = analyzeTimbre(buffer(makePercussive(440)));
      expect(['sharp', 'soft', 'moderate']).toContain(
        result.spectralFingerprint!.attackTransient,
      );
    });

    it('harmonic decay is one of expected values', () => {
      const result = analyzeTimbre(buffer(makeHarmonicTone(440)));
      expect(['fast', 'gradual', 'sustained']).toContain(
        result.spectralFingerprint!.harmonicDecay,
      );
    });
  });

  describe('envelope estimation', () => {
    it('percussive tone has short attack', () => {
      const result = analyzeTimbre(buffer(makePercussive(440)));
      expect(result.amplitudeEnvelope!.attackMs).toBeLessThan(100);
    });

    it('pad-like tone has longer attack', () => {
      const result = analyzeTimbre(buffer(makePadLike(440)));
      expect(result.amplitudeEnvelope!.attackMs).toBeGreaterThan(50);
    });

    it('envelope values are positive', () => {
      const result = analyzeTimbre(buffer(makeHarmonicTone(440)));
      const env = result.amplitudeEnvelope!;
      expect(env.attackMs).toBeGreaterThan(0);
      expect(env.decayMs).toBeGreaterThan(0);
      expect(env.sustainLevel).toBeGreaterThanOrEqual(0);
      expect(env.sustainLevel).toBeLessThanOrEqual(1);
      expect(env.releaseMs).toBeGreaterThan(0);
    });
  });

  describe('instrument classification', () => {
    it('classifies low-frequency content with low brightness', () => {
      const result = analyzeTimbre(buffer(makeBass()));
      // A pure 80Hz harmonic tone should register as low centroid / low brightness
      expect(result.spectralFingerprint!.spectralCentroidHz).toBeLessThan(2000);
      expect(result.spectralFingerprint!.brightness).toBeLessThan(0.3);
    });

    it('returns a valid instrument name', () => {
      const result = analyzeTimbre(buffer(makeHarmonicTone(440)));
      expect(result.instrumentGuesses[0].instrument).toBeTruthy();
      expect(result.instrumentGuesses[0].family).toBeTruthy();
    });

    it('confidence is between 0 and 1', () => {
      const result = analyzeTimbre(buffer(makeHarmonicTone(440)));
      expect(result.instrumentGuesses[0].confidence).toBeGreaterThanOrEqual(0);
      expect(result.instrumentGuesses[0].confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('noise input', () => {
    it('handles noise without crashing', () => {
      const result = analyzeTimbre(buffer(makeNoise()));
      expect(result.instrumentGuesses).toHaveLength(1);
      expect(result.spectralFingerprint).toBeDefined();
    });

    it('noise has higher brightness than a pure low tone', () => {
      const noise = analyzeTimbre(buffer(makeNoise()));
      const low = analyzeTimbre(buffer(makeSine(200)));
      expect(noise.spectralFingerprint!.brightness).toBeGreaterThan(
        low.spectralFingerprint!.brightness,
      );
    });
  });
});
