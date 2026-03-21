// ── FastPitchStream ───────────────────────────────────────────────────────
// Converts YIN multi-candidate output into a probability distribution
// over 89 HMM states (88 piano keys + silence).
//
// This is the fast path (~46ms latency at FFT=2048, 48kHz). It runs
// every RAF frame and produces the primary observation signal for the
// Bayesian note tracker.
//
// Pipeline:
//   1. Run YinDetector.detectCandidates() from YinCore
//   2. Convert CMNDF scores to probabilities via beta-like mapping
//   3. Spread each candidate across a 3-semitone Gaussian window
//   4. Fill remaining probability mass into the silence state
//   5. Return PitchDistribution (89-element probability vector)

import { YinDetector, type YinCandidate } from '@/audio/pitch/YinCore';
import {
  NUM_STATES,
  SILENCE_STATE,
  PIANO_MIN_FREQ,
  PIANO_MAX_FREQ,
  freqToMidiContinuous,
  midiToState,
  normalizeDistribution,
  type PitchDistribution,
} from './types';

// ── Constants ─────────────────────────────────────────────────────────────

/** YIN CMNDF threshold. */
const YIN_THRESHOLD = 0.15;

/** Maximum candidates to extract from YIN. */
const MAX_CANDIDATES = 8;

/** Gaussian sigma in semitones for probability spreading. */
const SPREAD_SIGMA_SEMITONES = 0.5; // kept at 0.5 — wider causes octave errors without HPS correction

/** Maximum RMS below which we output silence distribution (~-50 dBFS). */
const SILENCE_RMS = 0.003;

/** Minimum probability mass assigned to any single candidate. */
const MIN_CANDIDATE_PROB = 0.01;

/** How much probability mass to reserve for silence even when candidates exist. */
const SILENCE_FLOOR = 0.05;

// ── Class ─────────────────────────────────────────────────────────────────

export class FastPitchStream {
  private yinDetector: YinDetector | null = null;
  private sampleRate: number;
  private fftSize: number;
  private timeDomainBuffer: Float32Array;
  private frameId = 0;
  private adaptiveSilenceRms: number | null = null;

  constructor(sampleRate: number, fftSize: number = 2048) {
    this.sampleRate = sampleRate;
    this.fftSize = fftSize;
    this.timeDomainBuffer = new Float32Array(fftSize);
  }

  /**
   * Process one frame from the fast pitch analyser.
   * Returns a PitchDistribution over 89 states.
   */
  process(analyser: AnalyserNode): PitchDistribution {
    const sampleRate = analyser.context.sampleRate;
    const now = performance.now();
    const id = this.frameId++;

    // Ensure YIN detector matches current sample rate
    if (!this.yinDetector || this.sampleRate !== sampleRate) {
      this.sampleRate = sampleRate;
      this.yinDetector = new YinDetector({
        frameLength: this.fftSize,
        sampleRate,
        threshold: YIN_THRESHOLD,
        minFreq: PIANO_MIN_FREQ,
        maxFreq: PIANO_MAX_FREQ,
        maxCandidates: MAX_CANDIDATES,
      });
    }

    // Get time-domain data
    analyser.getFloatTimeDomainData(
      this.timeDomainBuffer as Float32Array<ArrayBuffer>,
    );

    // RMS silence gate
    let rmsSum = 0;
    for (let i = 0; i < this.timeDomainBuffer.length; i++) {
      rmsSum += this.timeDomainBuffer[i] * this.timeDomainBuffer[i];
    }
    const rms = Math.sqrt(rmsSum / this.timeDomainBuffer.length);

    const silenceThreshold = this.adaptiveSilenceRms ?? SILENCE_RMS;
    if (rms < silenceThreshold) {
      // Silence: all probability to silence state
      const probs = new Float64Array(NUM_STATES);
      probs[SILENCE_STATE] = 1;
      return { probs, timestamp: now, frameId: id };
    }

    // Run YIN multi-candidate detection
    const candidates = this.yinDetector.detectCandidates(this.timeDomainBuffer);

    if (candidates.length === 0) {
      // No candidates: mostly silence, small uniform spread
      const probs = new Float64Array(NUM_STATES);
      probs[SILENCE_STATE] = 0.9;
      const uniform = 0.1 / 88;
      for (let i = 0; i < 88; i++) probs[i] = uniform;
      return { probs, timestamp: now, frameId: id };
    }

    // Convert candidates to probability distribution
    const probs = new Float64Array(NUM_STATES);

    // Reserve silence floor
    probs[SILENCE_STATE] = SILENCE_FLOOR;

    // Convert CMNDF scores to probabilities
    // Lower CMNDF = better match → higher probability
    // Use: prob = (1 - score)^2, clamped
    const candidateProbs: Array<{
      candidate: YinCandidate;
      prob: number;
    }> = [];
    let totalCandidateProb = 0;

    for (const c of candidates) {
      const rawProb = Math.max(
        MIN_CANDIDATE_PROB,
        Math.pow(1 - Math.min(c.score, 0.99), 1.5),
      );
      candidateProbs.push({ candidate: c, prob: rawProb });
      totalCandidateProb += rawProb;
    }

    // HPS-style octave correction: if a candidate at freq f also has
    // a candidate at f/2, and the upper candidate dominates, boost the
    // sub-octave to correct likely octave-up errors from short FFT.
    for (const cp of candidateProbs) {
      const halfFreq = cp.candidate.frequency / 2;
      if (halfFreq < PIANO_MIN_FREQ) continue;
      const subOctave = candidateProbs.find((other) => {
        const ratio = other.candidate.frequency / halfFreq;
        return ratio > 0.95 && ratio < 1.05;
      });
      // Only boost if the octave candidate is dominant (upper > sub × 1.5)
      if (subOctave && cp.prob > subOctave.prob * 1.5) {
        subOctave.prob *= 2.0;
      }
    }
    totalCandidateProb = candidateProbs.reduce((s, cp) => s + cp.prob, 0);

    // Spread each candidate's probability across nearby states
    for (const { candidate, prob } of candidateProbs) {
      const midi = freqToMidiContinuous(candidate.frequency);
      const normalizedProb = (prob / totalCandidateProb) * (1 - SILENCE_FLOOR);

      // Spread across states within ±3 semitones
      for (let offset = -3; offset <= 3; offset++) {
        const targetMidi = Math.round(midi) + offset;
        if (targetMidi < 21 || targetMidi > 108) continue;

        const state = midiToState(targetMidi);
        const dist = targetMidi - midi; // signed distance in semitones
        const gauss = Math.exp(
          -0.5 *
            (dist / SPREAD_SIGMA_SEMITONES) *
            (dist / SPREAD_SIGMA_SEMITONES),
        );

        probs[state] += normalizedProb * gauss;
      }
    }

    // Normalize to sum to 1
    normalizeDistribution(probs);

    return { probs, timestamp: now, frameId: id };
  }

  /** Set adaptive silence threshold from calibrated noise floor. */
  setAdaptiveSilenceThreshold(rms: number): void {
    this.adaptiveSilenceRms = rms;
  }

  /** Reset all state. */
  reset(): void {
    this.yinDetector = null;
    this.frameId = 0;
    this.adaptiveSilenceRms = null;
  }
}
