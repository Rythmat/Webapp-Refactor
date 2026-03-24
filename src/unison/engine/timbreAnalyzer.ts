/**
 * Timbre Analyzer — Extract spectral fingerprint and classify instruments
 * from raw audio samples.
 *
 * Computes: spectral centroid, spectral rolloff, brightness, warmth,
 * attack transient character, harmonic decay, amplitude envelope (ADSR),
 * and instrument family classification.
 *
 * Operates on raw Float32Array samples — no Web Audio API dependency.
 */

import type { AudioBufferLike } from '../converters/audioToUnison';
import type {
  TimbreAnalysis,
  SpectralFingerprint,
  EnvelopeEstimate,
} from '../types/schema';
import { hannWindow, fftMagnitude, FFT_SIZE, HOP_SIZE } from './dsp';

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Analyze timbre characteristics of an audio buffer.
 *
 * Returns spectral fingerprint, ADSR envelope estimate, and instrument guesses.
 */
export function analyzeTimbre(
  audioBuffer: AudioBufferLike,
  trackId = 'audio',
): TimbreAnalysis {
  const sampleRate = audioBuffer.sampleRate;
  const samples = audioBuffer.getChannelData(0);

  if (samples.length < FFT_SIZE) {
    return {
      instrumentGuesses: [
        { trackId, instrument: 'unknown', family: 'unknown', confidence: 0 },
      ],
    };
  }

  // Step 1: Compute spectral features across frames
  const features = computeSpectralFeatures(samples, sampleRate);

  // Step 2: Estimate amplitude envelope
  const envelope = estimateEnvelope(samples, sampleRate);

  // Step 3: Build spectral fingerprint
  const fingerprint: SpectralFingerprint = {
    brightness: features.brightness,
    warmth: features.warmth,
    spectralCentroidHz: features.centroidHz,
    spectralRolloffHz: features.rolloffHz,
    attackTransient: classifyAttack(features.attackSlope),
    harmonicDecay: classifyDecay(envelope),
  };

  // Step 4: Classify instrument
  const instrument = classifyInstrument(features, envelope);

  return {
    instrumentGuesses: [
      {
        trackId,
        instrument: instrument.name,
        family: instrument.family,
        confidence: instrument.confidence,
      },
    ],
    spectralFingerprint: fingerprint,
    amplitudeEnvelope: envelope,
  };
}

// ── Spectral Feature Extraction ──────────────────────────────────────────────

interface SpectralFeatures {
  centroidHz: number;
  rolloffHz: number;
  brightness: number;
  warmth: number;
  attackSlope: number;
  harmonicRatio: number;
  spectralFlux: number;
}

function computeSpectralFeatures(
  samples: Float32Array,
  sampleRate: number,
): SpectralFeatures {
  const numFrames = Math.floor((samples.length - FFT_SIZE) / HOP_SIZE) + 1;
  if (numFrames <= 0) {
    return {
      centroidHz: 0,
      rolloffHz: 0,
      brightness: 0,
      warmth: 0,
      attackSlope: 0,
      harmonicRatio: 0,
      spectralFlux: 0,
    };
  }

  let totalCentroid = 0;
  let totalRolloff = 0;
  let totalBrightness = 0;
  let totalWarmth = 0;
  let totalFlux = 0;
  let totalHarmonicRatio = 0;
  let prevMagnitudes: Float64Array | null = null;
  let attackSlope = 0;

  // Compute RMS for first few frames to estimate attack
  const rmsValues: number[] = [];

  for (let frame = 0; frame < numFrames; frame++) {
    const offset = frame * HOP_SIZE;
    const windowed = hannWindow(samples, offset, FFT_SIZE);
    const magnitudes = fftMagnitude(windowed);
    const binHz = sampleRate / FFT_SIZE;

    // RMS for this frame
    let rmsSum = 0;
    for (let i = offset; i < offset + FFT_SIZE && i < samples.length; i++) {
      rmsSum += samples[i] * samples[i];
    }
    rmsValues.push(Math.sqrt(rmsSum / FFT_SIZE));

    // Spectral centroid: weighted average frequency
    let weightedSum = 0;
    let magnitudeSum = 0;
    for (let i = 1; i < magnitudes.length; i++) {
      const freq = i * binHz;
      weightedSum += freq * magnitudes[i];
      magnitudeSum += magnitudes[i];
    }
    const centroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
    totalCentroid += centroid;

    // Spectral rolloff: frequency below which 85% of energy lies
    const threshold = magnitudeSum * 0.85;
    let cumulative = 0;
    let rolloffBin = 0;
    for (let i = 1; i < magnitudes.length; i++) {
      cumulative += magnitudes[i];
      if (cumulative >= threshold) {
        rolloffBin = i;
        break;
      }
    }
    totalRolloff += rolloffBin * binHz;

    // Brightness: energy above 4kHz / total energy
    const cutoffBin = Math.round(4000 / binHz);
    let highEnergy = 0;
    let totalEnergy = 0;
    for (let i = 1; i < magnitudes.length; i++) {
      const e = magnitudes[i] * magnitudes[i];
      totalEnergy += e;
      if (i >= cutoffBin) highEnergy += e;
    }
    totalBrightness += totalEnergy > 0 ? highEnergy / totalEnergy : 0;

    // Warmth: energy in 200-800Hz / total energy
    const warmLow = Math.round(200 / binHz);
    const warmHigh = Math.round(800 / binHz);
    let warmEnergy = 0;
    for (let i = warmLow; i <= warmHigh && i < magnitudes.length; i++) {
      warmEnergy += magnitudes[i] * magnitudes[i];
    }
    totalWarmth += totalEnergy > 0 ? warmEnergy / totalEnergy : 0;

    // Harmonic ratio: energy in harmonic bins vs total
    // Use fundamental from spectral peak
    let peakBin = 1;
    let peakMag = 0;
    for (let i = 1; i < magnitudes.length; i++) {
      if (magnitudes[i] > peakMag) {
        peakMag = magnitudes[i];
        peakBin = i;
      }
    }
    let harmonicEnergy = 0;
    const visitedBins = new Set<number>();
    for (let h = 1; h <= 8; h++) {
      const hBin = peakBin * h;
      if (hBin >= magnitudes.length) break;
      // Sum around the harmonic bin (±2 bins), skipping already-counted bins
      for (
        let j = Math.max(0, hBin - 2);
        j <= Math.min(magnitudes.length - 1, hBin + 2);
        j++
      ) {
        if (!visitedBins.has(j)) {
          visitedBins.add(j);
          harmonicEnergy += magnitudes[j] * magnitudes[j];
        }
      }
    }
    totalHarmonicRatio += totalEnergy > 0 ? harmonicEnergy / totalEnergy : 0;

    // Spectral flux: frame-to-frame spectral change
    if (prevMagnitudes) {
      let flux = 0;
      for (let i = 0; i < magnitudes.length; i++) {
        const diff = magnitudes[i] - prevMagnitudes[i];
        if (diff > 0) flux += diff;
      }
      totalFlux += flux;
    }
    prevMagnitudes = magnitudes;
  }

  // Attack slope: max RMS rise rate in first 100ms
  const attackFrames = Math.min(
    Math.ceil((0.1 * sampleRate) / HOP_SIZE),
    rmsValues.length - 1,
  );
  for (let i = 0; i < attackFrames; i++) {
    const slope = rmsValues[i + 1] - rmsValues[i];
    if (slope > attackSlope) attackSlope = slope;
  }

  const n = numFrames;
  return {
    centroidHz: totalCentroid / n,
    rolloffHz: totalRolloff / n,
    brightness: Math.min(1, totalBrightness / n),
    warmth: Math.min(1, totalWarmth / n),
    attackSlope,
    harmonicRatio: Math.min(1, totalHarmonicRatio / n),
    spectralFlux: totalFlux / Math.max(1, n - 1),
  };
}

// ── Envelope Estimation ──────────────────────────────────────────────────────

function estimateEnvelope(
  samples: Float32Array,
  sampleRate: number,
): EnvelopeEstimate {
  // Compute RMS envelope at ~100Hz
  const hop = Math.max(1, Math.floor(sampleRate / 100));
  const numFrames = Math.floor(samples.length / hop);
  if (numFrames < 4) {
    return { attackMs: 10, decayMs: 100, sustainLevel: 0.5, releaseMs: 200 };
  }

  const rms = new Float32Array(numFrames);
  for (let i = 0; i < numFrames; i++) {
    const start = i * hop;
    const end = Math.min(start + hop, samples.length);
    let sum = 0;
    for (let j = start; j < end; j++) {
      sum += samples[j] * samples[j];
    }
    rms[i] = Math.sqrt(sum / (end - start));
  }

  // Find peak
  let peakIdx = 0;
  let peakVal = 0;
  for (let i = 0; i < numFrames; i++) {
    if (rms[i] > peakVal) {
      peakVal = rms[i];
      peakIdx = i;
    }
  }

  if (peakVal === 0) {
    return { attackMs: 10, decayMs: 100, sustainLevel: 0, releaseMs: 200 };
  }

  // Attack: time from first significant energy (>10% of peak) to peak
  const threshold10 = peakVal * 0.1;
  let attackStart = 0;
  for (let i = 0; i < peakIdx; i++) {
    if (rms[i] >= threshold10) {
      attackStart = i;
      break;
    }
  }
  const attackMs = ((peakIdx - attackStart) * hop * 1000) / sampleRate;

  // Sustain: average level in middle 50% of the sound
  const midStart = Math.floor(numFrames * 0.25);
  const midEnd = Math.floor(numFrames * 0.75);
  let sustainSum = 0;
  let sustainCount = 0;
  for (let i = midStart; i < midEnd; i++) {
    sustainSum += rms[i];
    sustainCount++;
  }
  const sustainLevel =
    sustainCount > 0 ? sustainSum / sustainCount / peakVal : 0.5;

  // Decay: time from peak to sustain level
  const sustainThreshold = peakVal * sustainLevel;
  let decayEnd = peakIdx;
  for (let i = peakIdx; i < numFrames; i++) {
    if (rms[i] <= sustainThreshold) {
      decayEnd = i;
      break;
    }
  }
  const decayMs = ((decayEnd - peakIdx) * hop * 1000) / sampleRate;

  // Release: time from last significant energy (>10% of peak) to end
  let releaseStart = numFrames - 1;
  for (let i = numFrames - 1; i >= 0; i--) {
    if (rms[i] >= threshold10) {
      releaseStart = i;
      break;
    }
  }
  const releaseMs = ((numFrames - 1 - releaseStart) * hop * 1000) / sampleRate;

  return {
    attackMs: Math.max(1, Math.round(attackMs)),
    decayMs: Math.max(1, Math.round(decayMs)),
    sustainLevel: Math.round(sustainLevel * 100) / 100,
    releaseMs: Math.max(1, Math.round(releaseMs)),
  };
}

// ── Classification Helpers ───────────────────────────────────────────────────

function classifyAttack(slope: number): 'sharp' | 'soft' | 'moderate' {
  if (slope > 0.3) return 'sharp';
  if (slope > 0.1) return 'moderate';
  return 'soft';
}

function classifyDecay(
  env: EnvelopeEstimate,
): 'fast' | 'gradual' | 'sustained' {
  if (env.sustainLevel > 0.7) return 'sustained';
  if (env.decayMs < 200) return 'fast';
  return 'gradual';
}

interface InstrumentMatch {
  name: string;
  family: string;
  confidence: number;
}

/**
 * Heuristic instrument classifier based on spectral features and envelope.
 *
 * Scores each instrument family against feature expectations and picks the best match.
 */
function classifyInstrument(
  features: SpectralFeatures,
  envelope: EnvelopeEstimate,
): InstrumentMatch {
  const candidates: InstrumentMatch[] = [
    scoreCandidate('piano', 'keyboard', features, envelope, {
      centroidRange: [500, 3000],
      brightnessRange: [0.05, 0.4],
      warmthRange: [0.1, 0.5],
      attackMsRange: [1, 30],
      sustainRange: [0.1, 0.5],
      harmonicRatioRange: [0.3, 0.8],
    }),
    scoreCandidate('electric_guitar', 'guitar', features, envelope, {
      centroidRange: [800, 4000],
      brightnessRange: [0.1, 0.6],
      warmthRange: [0.05, 0.4],
      attackMsRange: [1, 50],
      sustainRange: [0.3, 0.8],
      harmonicRatioRange: [0.2, 0.7],
    }),
    scoreCandidate('acoustic_guitar', 'guitar', features, envelope, {
      centroidRange: [600, 3000],
      brightnessRange: [0.05, 0.35],
      warmthRange: [0.15, 0.5],
      attackMsRange: [1, 40],
      sustainRange: [0.1, 0.4],
      harmonicRatioRange: [0.3, 0.8],
    }),
    scoreCandidate('bass', 'bass', features, envelope, {
      centroidRange: [100, 1000],
      brightnessRange: [0, 0.15],
      warmthRange: [0.3, 0.8],
      attackMsRange: [5, 60],
      sustainRange: [0.3, 0.7],
      harmonicRatioRange: [0.4, 0.9],
    }),
    scoreCandidate('strings', 'strings', features, envelope, {
      centroidRange: [500, 3000],
      brightnessRange: [0.02, 0.3],
      warmthRange: [0.15, 0.5],
      attackMsRange: [50, 500],
      sustainRange: [0.6, 0.95],
      harmonicRatioRange: [0.3, 0.7],
    }),
    scoreCandidate('synth_lead', 'synth', features, envelope, {
      centroidRange: [1000, 6000],
      brightnessRange: [0.2, 0.8],
      warmthRange: [0.02, 0.3],
      attackMsRange: [1, 100],
      sustainRange: [0.4, 0.9],
      harmonicRatioRange: [0.5, 0.95],
    }),
    scoreCandidate('synth_pad', 'synth', features, envelope, {
      centroidRange: [300, 2000],
      brightnessRange: [0.02, 0.25],
      warmthRange: [0.2, 0.6],
      attackMsRange: [100, 2000],
      sustainRange: [0.7, 0.95],
      harmonicRatioRange: [0.3, 0.8],
    }),
    scoreCandidate('voice', 'vocal', features, envelope, {
      centroidRange: [500, 4000],
      brightnessRange: [0.05, 0.4],
      warmthRange: [0.1, 0.5],
      attackMsRange: [20, 200],
      sustainRange: [0.4, 0.8],
      harmonicRatioRange: [0.5, 0.9],
    }),
    scoreCandidate('brass', 'brass', features, envelope, {
      centroidRange: [800, 5000],
      brightnessRange: [0.15, 0.6],
      warmthRange: [0.05, 0.3],
      attackMsRange: [20, 100],
      sustainRange: [0.5, 0.9],
      harmonicRatioRange: [0.4, 0.85],
    }),
    scoreCandidate('organ', 'keyboard', features, envelope, {
      centroidRange: [400, 3000],
      brightnessRange: [0.05, 0.4],
      warmthRange: [0.15, 0.5],
      attackMsRange: [1, 20],
      sustainRange: [0.8, 1.0],
      harmonicRatioRange: [0.6, 0.95],
    }),
  ];

  candidates.sort((a, b) => b.confidence - a.confidence);
  return candidates[0] ?? { name: 'unknown', family: 'unknown', confidence: 0 };
}

interface FeatureRanges {
  centroidRange: [number, number];
  brightnessRange: [number, number];
  warmthRange: [number, number];
  attackMsRange: [number, number];
  sustainRange: [number, number];
  harmonicRatioRange: [number, number];
}

function scoreCandidate(
  name: string,
  family: string,
  features: SpectralFeatures,
  envelope: EnvelopeEstimate,
  ranges: FeatureRanges,
): InstrumentMatch {
  let score = 0;
  let total = 0;

  score += rangeScore(features.centroidHz, ranges.centroidRange);
  total++;
  score += rangeScore(features.brightness, ranges.brightnessRange);
  total++;
  score += rangeScore(features.warmth, ranges.warmthRange);
  total++;
  score += rangeScore(envelope.attackMs, ranges.attackMsRange);
  total++;
  score += rangeScore(envelope.sustainLevel, ranges.sustainRange);
  total++;
  score += rangeScore(features.harmonicRatio, ranges.harmonicRatioRange);
  total++;

  const confidence = Math.round((score / total) * 100) / 100;
  return { name, family, confidence };
}

/**
 * Score how well a value fits within an expected range.
 * Returns 1.0 if inside range, decays toward 0 outside.
 */
function rangeScore(value: number, [lo, hi]: [number, number]): number {
  if (value >= lo && value <= hi) return 1;
  const range = hi - lo;
  if (range === 0) return value === lo ? 1 : 0;
  if (value < lo) {
    return Math.max(0, 1 - (lo - value) / range);
  }
  return Math.max(0, 1 - (value - hi) / range);
}
