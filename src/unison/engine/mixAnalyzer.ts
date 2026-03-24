/**
 * Mix Analyzer — Extract stereo field, dynamic range, spectral balance,
 * and loudness profile from raw audio samples.
 *
 * Operates on the full stereo mix (not separate stems).
 * Pure TypeScript on Float32Array — no Web Audio API dependency.
 */

import type { AudioBufferLike } from '../converters/audioToUnison';
import type {
  MixAnalysis,
  StereoFieldAnalysis,
  DynamicRangeAnalysis,
  SpectralBalanceAnalysis,
  LoudnessProfile,
  LoudnessPoint,
  FrequencyBand,
} from '../types/schema';
import {
  hannWindow,
  fftMagnitude,
  amplitudeToDb,
  FFT_SIZE,
  HOP_SIZE,
  DB_FLOOR,
} from './dsp';

// ── Constants ────────────────────────────────────────────────────────────────

/** Short-term loudness window (400ms) and hop (200ms), per EBU R128 convention. */
const LOUDNESS_WINDOW_S = 0.4;
const LOUDNESS_HOP_S = 0.2;

/** Silence threshold — windows below this are excluded from quiet detection. */
const SILENCE_THRESHOLD_DB = -60;

/** Frequency band boundaries in Hz. */
const BAND_EDGES: Record<FrequencyBand, [number, number]> = {
  sub: [20, 60],
  low: [60, 250],
  mid: [250, 2000],
  highMid: [2000, 6000],
  high: [6000, 12000],
  air: [12000, Infinity],
};

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Analyze mix characteristics of an audio buffer.
 *
 * Returns stereo field analysis, dynamic range, spectral balance,
 * and loudness profile over time.
 */
export function analyzeMix(audioBuffer: AudioBufferLike): MixAnalysis {
  const sampleRate = audioBuffer.sampleRate;
  const left = audioBuffer.getChannelData(0);
  const channels = getChannelCount(audioBuffer);
  const right = channels >= 2 ? audioBuffer.getChannelData(1) : null;

  // For spectral and loudness analysis, use mono sum
  const mono = right ? monoSum(left, right) : left;

  if (mono.length < FFT_SIZE) {
    return fallbackMix();
  }

  const stereoField = analyzeStereoField(left, right);
  const dynamicRange = analyzeDynamicRange(mono);
  const spectralBalance = analyzeSpectralBalance(mono, sampleRate);
  const loudnessProfile = analyzeLoudnessProfile(mono, sampleRate);

  return { stereoField, dynamicRange, spectralBalance, loudnessProfile };
}

// ── Channel Detection ────────────────────────────────────────────────────────

function getChannelCount(buf: AudioBufferLike): number {
  if (buf.numberOfChannels != null) return buf.numberOfChannels;
  try {
    buf.getChannelData(1);
    return 2;
  } catch {
    return 1;
  }
}

function monoSum(left: Float32Array, right: Float32Array): Float32Array {
  const len = Math.min(left.length, right.length);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = (left[i] + right[i]) * 0.5;
  }
  return out;
}

// ── Stereo Field ─────────────────────────────────────────────────────────────

function analyzeStereoField(
  left: Float32Array,
  right: Float32Array | null,
): StereoFieldAnalysis {
  if (!right) {
    return { pan: 0, stereoWidth: 0, correlation: 1, monoCompatibility: 1 };
  }

  const len = Math.min(left.length, right.length);
  let sumL2 = 0,
    sumR2 = 0,
    sumLR = 0;
  let sumMid2 = 0,
    sumSide2 = 0;

  for (let i = 0; i < len; i++) {
    const l = left[i];
    const r = right[i];
    sumL2 += l * l;
    sumR2 += r * r;
    sumLR += l * r;

    const mid = (l + r) * 0.5;
    const side = (l - r) * 0.5;
    sumMid2 += mid * mid;
    sumSide2 += side * side;
  }

  const rmsL = Math.sqrt(sumL2 / len);
  const rmsR = Math.sqrt(sumR2 / len);
  const rmsSum = rmsL + rmsR;

  // Pan: -1 (left) to +1 (right)
  const pan = rmsSum > 0 ? (rmsR - rmsL) / rmsSum : 0;

  // Stereo width: side/mid ratio, clamped 0–1
  const rmsMid = Math.sqrt(sumMid2 / len);
  const rmsSide = Math.sqrt(sumSide2 / len);
  const stereoWidth = rmsMid > 0 ? Math.min(1, rmsSide / rmsMid) : 0;

  // Correlation: Pearson coefficient between L and R
  const denom = Math.sqrt(sumL2 * sumR2);
  const correlation = denom > 0 ? sumLR / denom : 1;

  // Mono compatibility: normalized correlation to 0–1
  const monoCompatibility = Math.max(0, Math.min(1, (1 + correlation) / 2));

  return {
    pan: Math.round(pan * 1000) / 1000,
    stereoWidth: Math.round(stereoWidth * 1000) / 1000,
    correlation: Math.round(correlation * 1000) / 1000,
    monoCompatibility: Math.round(monoCompatibility * 1000) / 1000,
  };
}

// ── Dynamic Range ────────────────────────────────────────────────────────────

function analyzeDynamicRange(samples: Float32Array): DynamicRangeAnalysis {
  let peak = 0;
  let sumSq = 0;

  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > peak) peak = abs;
    sumSq += samples[i] * samples[i];
  }

  const rms = Math.sqrt(sumSq / samples.length);

  const peakDb = amplitudeToDb(peak);
  const rmsDb = amplitudeToDb(rms);
  const crestFactorDb = Math.round((peakDb - rmsDb) * 100) / 100;
  const headroomDb = Math.round((0 - peakDb) * 100) / 100;

  return {
    peakDb: Math.round(peakDb * 100) / 100,
    rmsDb: Math.round(rmsDb * 100) / 100,
    crestFactorDb,
    headroomDb,
  };
}

// ── Spectral Balance ─────────────────────────────────────────────────────────

function analyzeSpectralBalance(
  samples: Float32Array,
  sampleRate: number,
): SpectralBalanceAnalysis {
  const numFrames = Math.floor((samples.length - FFT_SIZE) / HOP_SIZE) + 1;
  if (numFrames <= 0) {
    return {
      bands: { sub: 0, low: 0, mid: 0, highMid: 0, high: 0, air: 0 },
      tilt: 0,
    };
  }

  const binHz = sampleRate / FFT_SIZE;
  const bandEnergy: Record<FrequencyBand, number> = {
    sub: 0,
    low: 0,
    mid: 0,
    highMid: 0,
    high: 0,
    air: 0,
  };

  for (let frame = 0; frame < numFrames; frame++) {
    const offset = frame * HOP_SIZE;
    const windowed = hannWindow(samples, offset, FFT_SIZE);
    const magnitudes = fftMagnitude(windowed);

    for (let i = 1; i < magnitudes.length; i++) {
      const freq = i * binHz;
      const energy = magnitudes[i] * magnitudes[i];

      for (const band of Object.keys(BAND_EDGES) as FrequencyBand[]) {
        const [lo, hi] = BAND_EDGES[band];
        if (freq >= lo && freq < hi) {
          bandEnergy[band] += energy;
          break;
        }
      }
    }
  }

  // Normalize to sum ≈ 1
  let totalEnergy = 0;
  for (const band of Object.keys(bandEnergy) as FrequencyBand[]) {
    totalEnergy += bandEnergy[band];
  }

  const bands = {} as Record<FrequencyBand, number>;
  if (totalEnergy > 0) {
    for (const band of Object.keys(bandEnergy) as FrequencyBand[]) {
      bands[band] =
        Math.round((bandEnergy[band] / totalEnergy) * 10000) / 10000;
    }
  } else {
    for (const band of Object.keys(bandEnergy) as FrequencyBand[]) {
      bands[band] = 0;
    }
  }

  // Tilt: (high energy - low energy) / total
  const lowBands = bands.sub + bands.low + bands.mid;
  const highBands = bands.highMid + bands.high + bands.air;
  const tilt = Math.round((highBands - lowBands) * 1000) / 1000;

  return { bands, tilt };
}

// ── Loudness Profile ─────────────────────────────────────────────────────────

function analyzeLoudnessProfile(
  samples: Float32Array,
  sampleRate: number,
): LoudnessProfile {
  const windowSamples = Math.floor(LOUDNESS_WINDOW_S * sampleRate);
  const hopSamples = Math.floor(LOUDNESS_HOP_S * sampleRate);

  if (samples.length < windowSamples) {
    // Too short for even one window — return single-point contour
    const rms = computeRms(samples, 0, samples.length);
    const db = amplitudeToDb(rms);
    return {
      contour: [{ timeSec: 0, rmsDb: Math.round(db * 100) / 100 }],
      dynamicVariation: 0,
      loudestTimeSec: 0,
      quietestTimeSec: 0,
    };
  }

  const contour: LoudnessPoint[] = [];

  for (
    let offset = 0;
    offset + windowSamples <= samples.length;
    offset += hopSamples
  ) {
    const rms = computeRms(samples, offset, windowSamples);
    const db = amplitudeToDb(rms);
    const timeSec = Math.round((offset / sampleRate) * 1000) / 1000;
    contour.push({ timeSec, rmsDb: Math.round(db * 100) / 100 });
  }

  // Dynamic variation: std dev of dB values (excluding silence)
  const nonSilent = contour.filter((p) => p.rmsDb > SILENCE_THRESHOLD_DB);
  let dynamicVariation = 0;
  let loudestTimeSec = 0;
  let quietestTimeSec = 0;

  if (nonSilent.length > 0) {
    const mean = nonSilent.reduce((s, p) => s + p.rmsDb, 0) / nonSilent.length;
    const variance =
      nonSilent.reduce((s, p) => s + (p.rmsDb - mean) ** 2, 0) /
      nonSilent.length;
    dynamicVariation = Math.round(Math.sqrt(variance) * 100) / 100;

    let loudest = -Infinity;
    let quietest = Infinity;
    for (const p of nonSilent) {
      if (p.rmsDb > loudest) {
        loudest = p.rmsDb;
        loudestTimeSec = p.timeSec;
      }
      if (p.rmsDb < quietest) {
        quietest = p.rmsDb;
        quietestTimeSec = p.timeSec;
      }
    }
  }

  return { contour, dynamicVariation, loudestTimeSec, quietestTimeSec };
}

function computeRms(
  samples: Float32Array,
  offset: number,
  length: number,
): number {
  let sum = 0;
  const end = Math.min(offset + length, samples.length);
  for (let i = offset; i < end; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / (end - offset));
}

// ── Fallback ─────────────────────────────────────────────────────────────────

function fallbackMix(): MixAnalysis {
  return {
    stereoField: {
      pan: 0,
      stereoWidth: 0,
      correlation: 1,
      monoCompatibility: 1,
    },
    dynamicRange: {
      peakDb: DB_FLOOR,
      rmsDb: DB_FLOOR,
      crestFactorDb: 0,
      headroomDb: 120,
    },
    spectralBalance: {
      bands: { sub: 0, low: 0, mid: 0, highMid: 0, high: 0, air: 0 },
      tilt: 0,
    },
    loudnessProfile: {
      contour: [],
      dynamicVariation: 0,
      loudestTimeSec: 0,
      quietestTimeSec: 0,
    },
  };
}
