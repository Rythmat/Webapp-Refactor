// ── YinCore ─────────────────────────────────────────────────────────────
// Unified YIN pitch detection module. Combines the best features from five
// previously separate implementations:
//
//   - Pre-allocated buffers (from PianoPitchDetector)
//   - Ring buffer support (from pitch-correction-processor.js)
//   - Multi-candidate extraction (from PianoPitchDetector, PYIN-inspired)
//   - Configurable frequency range (per-instrument tuning)
//   - Parabolic interpolation (all implementations had this)
//
// Usage:
//   Stateful (real-time, pre-allocated):
//     const yin = new YinDetector({ frameLength: 4096, sampleRate: 48000 });
//     const freq = yin.detect(buffer);
//     const candidates = yin.detectCandidates(buffer);
//
//   Stateless (one-shot, convenience):
//     const freq = yinDetectSingle(buffer, sampleRate);
//     const freq = yinDetectOffline(buffer, offset, frameLength, sampleRate, threshold);
//
// NOTE: pitch-correction-processor.js (AudioWorklet) cannot import this module.
// Its YinDetector class is kept in sync manually. See SYNC comment there.

// ── Types ────────────────────────────────────────────────────────────────

export interface YinCandidate {
  tau: number;
  frequency: number;
  score: number; // CMNDF value (lower = better)
}

export interface YinDetectorConfig {
  frameLength: number;
  sampleRate: number;
  threshold?: number; // CMNDF threshold, default 0.15
  minFreq?: number; // Hz, default 27.5 (A0)
  maxFreq?: number; // Hz, default 4186 (C8)
  maxCandidates?: number; // max multi-candidate results, default 8
}

export interface YinDetectOptions {
  threshold?: number;
  minFreq?: number;
  maxFreq?: number;
  rmsThreshold?: number; // silence gate, 0 = disabled
}

// ── Stateful Detector (pre-allocated, real-time use) ─────────────────────

export class YinDetector {
  private readonly halfLen: number;
  private readonly sampleRate: number;
  private readonly threshold: number;
  private readonly minPeriod: number;
  private readonly maxPeriod: number;
  private readonly tauLimit: number;
  private readonly maxCandidates: number;

  // Pre-allocated buffers (zero GC pressure in hot path)
  private readonly diff: Float32Array;
  private readonly cmndf: Float32Array;
  private readonly candidates: YinCandidate[];

  constructor(config: YinDetectorConfig) {
    this.halfLen = Math.floor(config.frameLength / 2);
    this.sampleRate = config.sampleRate;
    this.threshold = config.threshold ?? 0.15;
    this.maxCandidates = config.maxCandidates ?? 8;

    const minFreq = config.minFreq ?? 27.5;
    const maxFreq = config.maxFreq ?? 4186;

    this.minPeriod = Math.floor(config.sampleRate / maxFreq);
    this.maxPeriod = Math.min(
      Math.floor(config.sampleRate / minFreq),
      this.halfLen - 1,
    );
    this.tauLimit = Math.min(this.maxPeriod + 1, this.halfLen);

    this.diff = new Float32Array(this.halfLen);
    this.cmndf = new Float32Array(this.halfLen);
    this.candidates = [];
  }

  /**
   * Detect pitch from a contiguous Float32Array buffer.
   * Returns frequency in Hz, or 0 if no pitch detected.
   */
  detect(buffer: Float32Array, offset = 0): number {
    this.computeCMNDF(buffer, offset);
    return this.findFirstMinimum();
  }

  /**
   * Detect pitch from a ring buffer (for AudioWorklet compatibility).
   * ring[offset..] wraps via & mask.
   * Returns frequency in Hz, or 0 if no pitch detected.
   */
  detectRing(ring: Float32Array, offset: number, mask: number): number {
    this.computeCMNDFRing(ring, offset, mask);
    return this.findFirstMinimum();
  }

  /**
   * Extract all CMNDF local minima below threshold (PYIN-inspired).
   * Returns up to maxCandidates sorted by score (ascending = best first).
   */
  detectCandidates(buffer: Float32Array, offset = 0): YinCandidate[] {
    this.computeCMNDF(buffer, offset);
    return this.collectCandidates();
  }

  // ── Internal: CMNDF computation ─────────────────────────────────────

  private computeCMNDF(buffer: Float32Array, offset: number): void {
    const N = this.halfLen;
    const diff = this.diff;
    const cmndf = this.cmndf;
    const tauLimit = this.tauLimit;

    // Step 1: Difference function
    for (let tau = 0; tau < tauLimit; tau++) {
      let sum = 0;
      for (let i = 0; i < N; i++) {
        const d = buffer[offset + i] - buffer[offset + i + tau];
        sum += d * d;
      }
      diff[tau] = sum;
    }

    // Step 2: Cumulative mean normalized difference
    cmndf[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau < tauLimit; tau++) {
      runningSum += diff[tau];
      cmndf[tau] = diff[tau] / (runningSum / tau);
    }
  }

  private computeCMNDFRing(
    ring: Float32Array,
    offset: number,
    mask: number,
  ): void {
    const N = this.halfLen;
    const diff = this.diff;
    const cmndf = this.cmndf;
    const tauLimit = this.tauLimit;

    // Step 1: Difference function (ring buffer access via & mask)
    for (let tau = 0; tau < tauLimit; tau++) {
      let sum = 0;
      for (let i = 0; i < N; i++) {
        const d = ring[(offset + i) & mask] - ring[(offset + i + tau) & mask];
        sum += d * d;
      }
      diff[tau] = sum;
    }

    // Step 2: Cumulative mean normalized difference
    cmndf[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau < tauLimit; tau++) {
      runningSum += diff[tau];
      cmndf[tau] = diff[tau] / (runningSum / tau);
    }
  }

  // ── Internal: minimum extraction ────────────────────────────────────

  /** Find the first CMNDF minimum below threshold (standard YIN). */
  private findFirstMinimum(): number {
    const cmndf = this.cmndf;
    const tauLimit = this.tauLimit;

    let tauEstimate = -1;
    for (let tau = this.minPeriod; tau < tauLimit; tau++) {
      if (cmndf[tau] < this.threshold) {
        // Walk to local minimum (bounded by tauLimit, not halfLen)
        while (tau + 1 < tauLimit && cmndf[tau + 1] < cmndf[tau]) tau++;
        tauEstimate = tau;
        break;
      }
    }

    if (tauEstimate === -1) return 0;
    return this.parabolicInterpolation(tauEstimate);
  }

  /** Collect all local CMNDF minima below threshold (PYIN multi-candidate). */
  private collectCandidates(): YinCandidate[] {
    const cmndf = this.cmndf;
    this.candidates.length = 0;

    // Use manual tau control to avoid double-increment bug with for loop
    let tau = this.minPeriod;
    while (tau < this.maxPeriod) {
      if (cmndf[tau] < this.threshold) {
        // Walk to local minimum (bounded by tauLimit, not halfLen)
        while (tau + 1 < this.tauLimit && cmndf[tau + 1] < cmndf[tau]) tau++;

        const frequency = this.parabolicInterpolation(tau);
        if (frequency > 0) {
          this.candidates.push({
            tau,
            frequency,
            score: cmndf[tau],
          });
          if (this.candidates.length >= this.maxCandidates) break;
        }

        // Skip past this dip to find next candidate
        while (tau + 1 < this.tauLimit && cmndf[tau + 1] > cmndf[tau]) tau++;
      }
      tau++;
    }

    return this.candidates;
  }

  /** Parabolic interpolation for sub-sample accuracy. */
  private parabolicInterpolation(t: number): number {
    const cmndf = this.cmndf;

    if (t > 0 && t < this.halfLen - 1) {
      const s0 = cmndf[t - 1];
      const s1 = cmndf[t];
      const s2 = cmndf[t + 1];
      const denom = s0 - 2 * s1 + s2;
      if (denom !== 0) {
        const shift = (s0 - s2) / (2 * denom);
        if (Math.abs(shift) < 1) {
          return this.sampleRate / (t + shift);
        }
      }
    }

    return this.sampleRate / t;
  }
}

// ── Stateless Convenience Functions ──────────────────────────────────────

/**
 * One-shot pitch detection from a contiguous buffer.
 * Allocates internally — use YinDetector class for hot paths.
 */
export function yinDetectSingle(
  buffer: Float32Array,
  sampleRate: number,
  options?: YinDetectOptions,
): number {
  const threshold = options?.threshold ?? 0.15;
  const minFreq = options?.minFreq ?? 27.5;
  const maxFreq = options?.maxFreq ?? 4186;
  const rmsThreshold = options?.rmsThreshold ?? 0;

  // RMS silence gate
  if (rmsThreshold > 0) {
    let rmsSum = 0;
    for (let i = 0; i < buffer.length; i++) rmsSum += buffer[i] * buffer[i];
    if (Math.sqrt(rmsSum / buffer.length) < rmsThreshold) return 0;
  }

  const halfLen = Math.floor(buffer.length / 2);
  const diff = new Float32Array(halfLen);
  const cmndf = new Float32Array(halfLen);

  const minPeriod = Math.floor(sampleRate / maxFreq);
  const maxPeriod = Math.min(Math.floor(sampleRate / minFreq), halfLen - 1);
  const tauLimit = Math.min(maxPeriod + 1, halfLen);

  // Step 1: Difference function
  for (let tau = 0; tau < tauLimit; tau++) {
    let sum = 0;
    for (let i = 0; i < halfLen; i++) {
      const d = buffer[i] - buffer[i + tau];
      sum += d * d;
    }
    diff[tau] = sum;
  }

  // Step 2: CMNDF
  cmndf[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < tauLimit; tau++) {
    runningSum += diff[tau];
    cmndf[tau] = diff[tau] / (runningSum / tau);
  }

  // Step 3: Threshold search
  let tauEstimate = -1;
  for (let tau = minPeriod; tau < tauLimit; tau++) {
    if (cmndf[tau] < threshold) {
      while (tau + 1 < halfLen && cmndf[tau + 1] < cmndf[tau]) tau++;
      tauEstimate = tau;
      break;
    }
  }

  if (tauEstimate === -1) return 0;

  // Step 4: Parabolic interpolation
  const t = tauEstimate;
  if (t > 0 && t < halfLen - 1) {
    const s0 = cmndf[t - 1];
    const s1 = cmndf[t];
    const s2 = cmndf[t + 1];
    const denom = s0 - 2 * s1 + s2;
    if (denom !== 0) {
      const shift = (s0 - s2) / (2 * denom);
      if (Math.abs(shift) < 1) {
        return sampleRate / (t + shift);
      }
    }
  }

  return sampleRate / t;
}

/**
 * Offline pitch detection from a buffer with offset (PitchAnalyzer compatible).
 * Signature matches the old PitchAnalyzer.yinDetect() exactly.
 */
export function yinDetectOffline(
  buffer: Float32Array,
  offset: number,
  frameLength: number,
  sampleRate: number,
  threshold: number,
): number {
  const halfLen = Math.floor(frameLength / 2);
  const diff = new Float32Array(halfLen);
  const cmndf = new Float32Array(halfLen);

  const minPeriod = Math.floor(sampleRate / 2000);
  const maxPeriod = Math.floor(sampleRate / 50);

  // Step 1: Difference function
  for (let tau = 0; tau < halfLen; tau++) {
    let sum = 0;
    for (let i = 0; i < halfLen; i++) {
      const d = buffer[offset + i] - buffer[offset + i + tau];
      sum += d * d;
    }
    diff[tau] = sum;
  }

  // Step 2: CMNDF
  cmndf[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < halfLen; tau++) {
    runningSum += diff[tau];
    cmndf[tau] = diff[tau] / (runningSum / tau);
  }

  // Step 3: Threshold search
  let tauEstimate = -1;
  for (let tau = minPeriod; tau < Math.min(maxPeriod, halfLen); tau++) {
    if (cmndf[tau] < threshold) {
      while (tau + 1 < halfLen && cmndf[tau + 1] < cmndf[tau]) tau++;
      tauEstimate = tau;
      break;
    }
  }

  if (tauEstimate === -1) return 0;

  // Step 4: Parabolic interpolation
  const t = tauEstimate;
  if (t > 0 && t < halfLen - 1) {
    const s0 = cmndf[t - 1];
    const s1 = cmndf[t];
    const s2 = cmndf[t + 1];
    const denom = s0 - 2 * s1 + s2;
    if (denom === 0) return sampleRate / t;
    const shift = (s0 - s2) / (2 * denom);
    if (Math.abs(shift) < 1) {
      return sampleRate / (t + shift);
    }
  }

  return sampleRate / t;
}
