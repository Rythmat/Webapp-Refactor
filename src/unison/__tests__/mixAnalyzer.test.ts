import { describe, it, expect } from 'vitest';
import type { AudioBufferLike } from '../converters/audioToUnison';
import { analyzeMix } from '../engine/mixAnalyzer';

// ── Helpers ──────────────────────────────────────────────────────────────────

const SAMPLE_RATE = 44100;
const DURATION_S = 1;

function makeSine(
  freq: number,
  amplitude = 1,
  duration = DURATION_S,
): Float32Array {
  const n = SAMPLE_RATE * duration;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = amplitude * Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE);
  }
  return out;
}

function makeSilence(duration = DURATION_S): Float32Array {
  return new Float32Array(SAMPLE_RATE * duration);
}

function makeDecaying(freq: number, duration = DURATION_S): Float32Array {
  const n = SAMPLE_RATE * duration;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    out[i] =
      Math.exp(-t * 4) * Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE);
  }
  return out;
}

function monoBuffer(samples: Float32Array, sr = SAMPLE_RATE): AudioBufferLike {
  return {
    sampleRate: sr,
    numberOfChannels: 1,
    getChannelData: () => samples,
  };
}

function stereoBuffer(
  left: Float32Array,
  right: Float32Array,
  sr = SAMPLE_RATE,
): AudioBufferLike {
  return {
    sampleRate: sr,
    numberOfChannels: 2,
    getChannelData: (ch: number) => (ch === 0 ? left : right),
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('analyzeMix', () => {
  it('returns all four sub-objects', () => {
    const result = analyzeMix(monoBuffer(makeSine(440)));
    expect(result.stereoField).toBeDefined();
    expect(result.dynamicRange).toBeDefined();
    expect(result.spectralBalance).toBeDefined();
    expect(result.loudnessProfile).toBeDefined();
  });

  it('returns fallback for very short audio', () => {
    const short = new Float32Array(100);
    const result = analyzeMix(monoBuffer(short));
    expect(result.dynamicRange.peakDb).toBe(-120);
    expect(result.stereoField.pan).toBe(0);
  });

  // ── Dynamic Range ──────────────────────────────────────────────────────

  describe('dynamic range', () => {
    it('full-scale sine has peak near 0 dBFS', () => {
      const result = analyzeMix(monoBuffer(makeSine(440, 1)));
      expect(result.dynamicRange.peakDb).toBeGreaterThan(-1);
      expect(result.dynamicRange.peakDb).toBeLessThanOrEqual(0);
    });

    it('half-amplitude sine has peak near -6 dBFS', () => {
      const result = analyzeMix(monoBuffer(makeSine(440, 0.5)));
      expect(result.dynamicRange.peakDb).toBeCloseTo(-6, 0);
    });

    it('RMS is always less than or equal to peak', () => {
      const result = analyzeMix(monoBuffer(makeSine(440)));
      expect(result.dynamicRange.rmsDb).toBeLessThanOrEqual(
        result.dynamicRange.peakDb,
      );
    });

    it('crest factor equals peak minus RMS', () => {
      const result = analyzeMix(monoBuffer(makeSine(440)));
      expect(result.dynamicRange.crestFactorDb).toBeCloseTo(
        result.dynamicRange.peakDb - result.dynamicRange.rmsDb,
        1,
      );
    });

    it('headroom equals negative peak', () => {
      const result = analyzeMix(monoBuffer(makeSine(440, 0.5)));
      expect(result.dynamicRange.headroomDb).toBeCloseTo(
        0 - result.dynamicRange.peakDb,
        1,
      );
    });

    it('silent buffer returns very low dB values', () => {
      const result = analyzeMix(monoBuffer(makeSilence()));
      expect(result.dynamicRange.peakDb).toBe(-120);
      expect(result.dynamicRange.rmsDb).toBe(-120);
    });
  });

  // ── Stereo Field ───────────────────────────────────────────────────────

  describe('stereo field', () => {
    it('mono buffer returns center pan and no width', () => {
      const result = analyzeMix(monoBuffer(makeSine(440)));
      expect(result.stereoField.pan).toBe(0);
      expect(result.stereoField.stereoWidth).toBe(0);
      expect(result.stereoField.correlation).toBe(1);
      expect(result.stereoField.monoCompatibility).toBe(1);
    });

    it('identical L and R gives correlation near 1', () => {
      const sine = makeSine(440);
      const result = analyzeMix(stereoBuffer(sine, sine));
      expect(result.stereoField.correlation).toBeCloseTo(1, 1);
      expect(result.stereoField.stereoWidth).toBeCloseTo(0, 1);
    });

    it('left-only signal has pan near -1', () => {
      const sine = makeSine(440);
      const silence = makeSilence();
      const result = analyzeMix(stereoBuffer(sine, silence));
      expect(result.stereoField.pan).toBeLessThan(-0.8);
    });

    it('right-only signal has pan near +1', () => {
      const sine = makeSine(440);
      const silence = makeSilence();
      const result = analyzeMix(stereoBuffer(silence, sine));
      expect(result.stereoField.pan).toBeGreaterThan(0.8);
    });

    it('inverted right channel gives negative correlation', () => {
      const sine = makeSine(440);
      const inverted = new Float32Array(sine.length);
      for (let i = 0; i < sine.length; i++) inverted[i] = -sine[i];

      const result = analyzeMix(stereoBuffer(sine, inverted));
      expect(result.stereoField.correlation).toBeCloseTo(-1, 1);
      expect(result.stereoField.monoCompatibility).toBeCloseTo(0, 1);
    });

    it('uncorrelated channels have high stereo width', () => {
      const sineA = makeSine(440);
      const sineB = makeSine(1000);
      const result = analyzeMix(stereoBuffer(sineA, sineB));
      expect(result.stereoField.stereoWidth).toBeGreaterThan(0.3);
    });

    it('center-panned stereo has pan near 0', () => {
      const sine = makeSine(440);
      const result = analyzeMix(stereoBuffer(sine, sine));
      expect(Math.abs(result.stereoField.pan)).toBeLessThan(0.05);
    });
  });

  // ── Spectral Balance ───────────────────────────────────────────────────

  describe('spectral balance', () => {
    it('low sine concentrates energy in sub/low bands', () => {
      const result = analyzeMix(monoBuffer(makeSine(80)));
      const { bands } = result.spectralBalance;
      const lowEnergy = bands.sub + bands.low;
      expect(lowEnergy).toBeGreaterThan(0.5);
    });

    it('high sine concentrates energy in upper bands', () => {
      const result = analyzeMix(monoBuffer(makeSine(8000)));
      const { bands } = result.spectralBalance;
      const highEnergy = bands.highMid + bands.high + bands.air;
      expect(highEnergy).toBeGreaterThan(0.5);
    });

    it('band values sum to approximately 1', () => {
      const result = analyzeMix(monoBuffer(makeSine(440)));
      const { bands } = result.spectralBalance;
      const sum =
        bands.sub +
        bands.low +
        bands.mid +
        bands.highMid +
        bands.high +
        bands.air;
      expect(sum).toBeCloseTo(1, 1);
    });

    it('low content has negative tilt', () => {
      const result = analyzeMix(monoBuffer(makeSine(100)));
      expect(result.spectralBalance.tilt).toBeLessThan(0);
    });

    it('high content has positive tilt', () => {
      const result = analyzeMix(monoBuffer(makeSine(8000)));
      expect(result.spectralBalance.tilt).toBeGreaterThan(0);
    });
  });

  // ── Loudness Profile ───────────────────────────────────────────────────

  describe('loudness profile', () => {
    it('constant tone has low dynamic variation', () => {
      const result = analyzeMix(monoBuffer(makeSine(440)));
      expect(result.loudnessProfile.dynamicVariation).toBeLessThan(1);
    });

    it('decaying tone has higher dynamic variation', () => {
      const constant = analyzeMix(monoBuffer(makeSine(440)));
      const decaying = analyzeMix(
        monoBuffer(makeDecaying(440, 2), SAMPLE_RATE),
      );
      expect(decaying.loudnessProfile.dynamicVariation).toBeGreaterThan(
        constant.loudnessProfile.dynamicVariation,
      );
    });

    it('decaying tone loudest point is near the start', () => {
      const result = analyzeMix(monoBuffer(makeDecaying(440, 2), SAMPLE_RATE));
      expect(result.loudnessProfile.loudestTimeSec).toBeLessThan(0.5);
    });

    it('contour spans buffer duration', () => {
      const duration = 2;
      const result = analyzeMix(monoBuffer(makeSine(440, 1, duration)));
      const lastPoint =
        result.loudnessProfile.contour[
          result.loudnessProfile.contour.length - 1
        ];
      expect(lastPoint.timeSec).toBeGreaterThan(duration * 0.5);
    });

    it('silent buffer has minimal contour', () => {
      const result = analyzeMix(monoBuffer(makeSilence()));
      // All points should be at or below silence threshold
      for (const point of result.loudnessProfile.contour) {
        expect(point.rmsDb).toBeLessThanOrEqual(-60);
      }
    });
  });

  // ── Integration ────────────────────────────────────────────────────────

  describe('integration', () => {
    it('all band values are non-negative', () => {
      const result = analyzeMix(monoBuffer(makeSine(440)));
      for (const val of Object.values(result.spectralBalance.bands)) {
        expect(val).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
