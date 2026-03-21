// ── ObservationModel ──────────────────────────────────────────────────────
// Fuses probability distributions from multiple observation sources into
// a single observation likelihood vector for the HMM.
//
// Sources:
//   - FastPitchStream:   YIN-based distribution (~46ms, primary)
//   - HiResPitchStream:  YIN-based distribution (~186ms, low-note correction)
//   - BasicPitchPeer:    ML-based distribution (~700ms, independent observer)
//   - NMFDetector:       Polyphonic activations (converted to distribution)
//
// Fusion method: Weighted geometric mean (product of experts).
//   p_fused[i] = Π(p_k[i]^w_k) / Z
// This is the Bayesian-correct way to combine independent probability
// estimates: each source contributes evidence proportional to its weight.
//
// Missing sources (null) are excluded from the product.

import {
  NUM_STATES,
  SILENCE_STATE,
  normalizeDistribution,
  type PitchDistribution,
  type NMFActivation,
} from './types';

// ── Constants ─────────────────────────────────────────────────────────────

/** Minimum probability floor (prevents single-stream veto in geometric mean). */
const PROB_FLOOR = 1e-4;

/** Default stream weights. */
const DEFAULT_WEIGHTS = {
  fast: 1.0,
  hiRes: 0.8,
  ml: 0.3, // low weight: ML is ~700ms stale, should not override real-time streams
  nmf: 0.5,
};

// ── Types ─────────────────────────────────────────────────────────────────

export interface StreamWeights {
  fast: number;
  hiRes: number;
  ml: number;
  nmf: number;
}

// ── Class ─────────────────────────────────────────────────────────────────

export class ObservationModel {
  private weights: StreamWeights;
  private fusedBuffer: Float64Array;

  constructor(weights?: Partial<StreamWeights>) {
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
    this.fusedBuffer = new Float64Array(NUM_STATES);
  }

  /**
   * Fuse all available observations into a single likelihood vector.
   *
   * @param fastPitch  — From FastPitchStream (primary, ~46ms)
   * @param hiResPitch — From HiResPitchStream (~186ms, may be null if no new data)
   * @param mlPitch    — From BasicPitchPeer (~700ms, may be null if not ready)
   * @param nmfActivation — From NMFDetector (polyphonic, may be null in mono mode)
   * @returns Float64Array of length 89, observation likelihoods (NOT normalized)
   */
  fuse(
    fastPitch: PitchDistribution | null,
    hiResPitch: PitchDistribution | null,
    mlPitch: PitchDistribution | null,
    nmfActivation: NMFActivation | null,
  ): Float64Array {
    const result = this.fusedBuffer;

    // Start with uniform (log = 0 for all states)
    // We work in log-space for numerical stability:
    // log(p_fused[i]) = Σ w_k * log(p_k[i])
    const logResult = new Float64Array(NUM_STATES);

    let totalWeight = 0;

    // Fast pitch stream (primary)
    if (fastPitch) {
      const w = this.weights.fast;
      for (let i = 0; i < NUM_STATES; i++) {
        logResult[i] += w * Math.log(Math.max(fastPitch.probs[i], PROB_FLOOR));
      }
      totalWeight += w;
    }

    // Hi-res pitch stream (correction)
    if (hiResPitch) {
      const w = this.weights.hiRes;
      for (let i = 0; i < NUM_STATES; i++) {
        logResult[i] += w * Math.log(Math.max(hiResPitch.probs[i], PROB_FLOOR));
      }
      totalWeight += w;
    }

    // ML pitch stream (independent observer)
    if (mlPitch) {
      const w = this.weights.ml;
      for (let i = 0; i < NUM_STATES; i++) {
        logResult[i] += w * Math.log(Math.max(mlPitch.probs[i], PROB_FLOOR));
      }
      totalWeight += w;
    }

    // NMF activation (convert to probability distribution first)
    if (nmfActivation) {
      const w = this.weights.nmf;
      const nmfDist = this.nmfToDistribution(nmfActivation);
      for (let i = 0; i < NUM_STATES; i++) {
        logResult[i] += w * Math.log(Math.max(nmfDist[i], PROB_FLOOR));
      }
      totalWeight += w;
    }

    if (totalWeight === 0) {
      // No sources: uniform distribution
      const uniform = 1 / NUM_STATES;
      for (let i = 0; i < NUM_STATES; i++) result[i] = uniform;
      return result;
    }

    // Normalize by total weight (geometric mean)
    const invWeight = 1 / totalWeight;
    for (let i = 0; i < NUM_STATES; i++) {
      result[i] = Math.exp(logResult[i] * invWeight);
    }

    // Normalize to sum to 1
    normalizeDistribution(result);

    return result;
  }

  /** Set relative weights for each stream. */
  setStreamWeights(weights: Partial<StreamWeights>): void {
    Object.assign(this.weights, weights);
  }

  /** Get current weights. */
  getStreamWeights(): StreamWeights {
    return { ...this.weights };
  }

  // ── Internal ────────────────────────────────────────────────────────────

  /**
   * Convert NMF activations to a PitchDistribution-compatible format.
   * NMF weights are non-negative reals; we normalize them into a
   * probability distribution over 89 states.
   */
  private nmfToDistribution(nmf: NMFActivation): Float64Array {
    const dist = new Float64Array(NUM_STATES);

    let totalActivation = 0;
    for (let k = 0; k < nmf.weights.length; k++) {
      totalActivation += nmf.weights[k];
    }

    if (totalActivation < 1e-10) {
      // No activation: all silence
      dist[SILENCE_STATE] = 1;
      return dist;
    }

    // Map activations to probabilities
    // Reserve some mass for silence (inversely proportional to total activation)
    const silenceProb = Math.max(0.01, 1 / (1 + totalActivation * 10));
    dist[SILENCE_STATE] = silenceProb;

    const noteScale = (1 - silenceProb) / totalActivation;
    for (let k = 0; k < nmf.weights.length; k++) {
      dist[k] = nmf.weights[k] * noteScale;
    }

    return dist;
  }
}
