// ── HiResPitchStream ─────────────────────────────────────────────────────
// High-resolution pitch stream for correction of the fast path.
// Same architecture as FastPitchStream but with FFT=8192 (~186ms at 48kHz),
// giving 4× better frequency resolution for low piano notes (A0–C2).
//
// Runs at ~5Hz. The HMM weights this stream more heavily for low-frequency
// content where the fast stream has insufficient resolution.

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

const YIN_THRESHOLD = 0.12; // Slightly tighter than fast path (more data to work with)
const MAX_CANDIDATES = 8;
const SPREAD_SIGMA_SEMITONES = 0.5; // Wider than 0.3 to reduce multimodal artifacts
const SILENCE_RMS = 0.003;
const MIN_CANDIDATE_PROB = 0.01;
const SILENCE_FLOOR = 0.03; // Lower silence floor (more confident)

// ── Class ─────────────────────────────────────────────────────────────────

export class HiResPitchStream {
  private yinDetector: YinDetector | null = null;
  private sampleRate: number;
  private fftSize: number;
  private minFreq: number;
  private maxFreq: number;
  private timeDomainBuffer: Float32Array;
  private frameId = 0;
  private lastBufferHash = 0;
  private adaptiveSilenceRms: number | null = null;
  // Decimation: run the (expensive) hi-res CMNDF only every `skipFactor` ticks
  // and reuse the last result otherwise. Default 1 = compute every tick (Learn
  // behavior unchanged). The 171ms hi-res window can't update meaningfully
  // faster than a few Hz anyway, so decimation is free accuracy-wise but a large
  // CPU win. Studio-gated via ProbabilisticOrchestrator.
  private skipFactor = 1;
  private tickCount = 0;
  private lastResult: PitchDistribution | null = null;

  constructor(
    sampleRate: number,
    fftSize: number = 8192,
    minFreq: number = PIANO_MIN_FREQ,
    maxFreq: number = PIANO_MAX_FREQ,
  ) {
    this.sampleRate = sampleRate;
    this.fftSize = fftSize;
    this.minFreq = minFreq;
    this.maxFreq = maxFreq;
    this.timeDomainBuffer = new Float32Array(fftSize);
  }

  /**
   * Process one frame from the hi-res analyser.
   * Returns a PitchDistribution, or null if no new data since last call.
   *
   * The hi-res analyser updates slower than the RAF rate, so we check
   * whether the buffer has changed by comparing time-domain data.
   */
  /** Set the CMNDF decimation factor (1 = every tick). Studio-only tuning. */
  setSkipFactor(n: number): void {
    this.skipFactor = Math.max(1, Math.floor(n));
  }

  process(analyser: AnalyserNode): PitchDistribution | null {
    const sampleRate = analyser.context.sampleRate;
    const now = performance.now();

    // Decimation gate: on skipped ticks, reuse the last distribution and skip
    // the expensive CMNDF entirely. Computes on the first tick then every
    // skipFactor-th tick (so there's no startup delay). skipFactor=1 never
    // skips (Learn unchanged).
    this.tickCount++;
    if (this.skipFactor > 1 && (this.tickCount - 1) % this.skipFactor !== 0) {
      return this.lastResult;
    }

    // Ensure YIN detector matches current sample rate
    if (!this.yinDetector || this.sampleRate !== sampleRate) {
      this.sampleRate = sampleRate;
      this.yinDetector = new YinDetector({
        frameLength: this.fftSize,
        sampleRate,
        threshold: YIN_THRESHOLD,
        minFreq: this.minFreq,
        maxFreq: this.maxFreq,
        maxCandidates: MAX_CANDIDATES,
      });
    }

    // Get time-domain data
    analyser.getFloatTimeDomainData(
      this.timeDomainBuffer as Float32Array<ArrayBuffer>,
    );

    // Quick staleness check: hash first 8 samples to detect if buffer changed
    let hash = 0;
    for (let i = 0; i < 8; i++) {
      hash += this.timeDomainBuffer[i];
    }
    if (Math.abs(hash - this.lastBufferHash) < 1e-10) {
      return null; // Same buffer as last time — no new data
    }
    this.lastBufferHash = hash;

    // RMS check
    let rmsSum = 0;
    for (let i = 0; i < this.timeDomainBuffer.length; i++) {
      rmsSum += this.timeDomainBuffer[i] * this.timeDomainBuffer[i];
    }
    const rms = Math.sqrt(rmsSum / this.timeDomainBuffer.length);

    const id = this.frameId++;

    const silenceThreshold = this.adaptiveSilenceRms ?? SILENCE_RMS;
    if (rms < silenceThreshold) {
      const probs = new Float64Array(NUM_STATES);
      probs[SILENCE_STATE] = 1;
      this.lastResult = { probs, timestamp: now, frameId: id };
      return this.lastResult;
    }

    // Run YIN multi-candidate
    const candidates = this.yinDetector.detectCandidates(this.timeDomainBuffer);

    if (candidates.length === 0) {
      const probs = new Float64Array(NUM_STATES);
      probs[SILENCE_STATE] = 0.85;
      const uniform = 0.15 / 88;
      for (let i = 0; i < 88; i++) probs[i] = uniform;
      this.lastResult = { probs, timestamp: now, frameId: id };
      return this.lastResult;
    }

    // Convert candidates to probability distribution (same as FastPitchStream
    // but with tighter Gaussian spread due to higher resolution)
    const probs = new Float64Array(NUM_STATES);
    probs[SILENCE_STATE] = SILENCE_FLOOR;

    const candidateProbs: Array<{
      candidate: YinCandidate;
      prob: number;
    }> = [];
    let totalCandidateProb = 0;

    for (const c of candidates) {
      // Higher-resolution → sharper probability peaks
      const rawProb = Math.max(
        MIN_CANDIDATE_PROB,
        Math.pow(1 - Math.min(c.score, 0.99), 3), // cubic for sharper peaks
      );
      candidateProbs.push({ candidate: c, prob: rawProb });
      totalCandidateProb += rawProb;
    }

    // HPS-style octave correction: boost sub-octave when upper dominates
    for (const cp of candidateProbs) {
      const halfFreq = cp.candidate.frequency / 2;
      if (halfFreq < this.minFreq) continue;
      const subOctave = candidateProbs.find((other) => {
        const ratio = other.candidate.frequency / halfFreq;
        return ratio > 0.95 && ratio < 1.05;
      });
      if (subOctave && cp.prob > subOctave.prob * 1.5) {
        subOctave.prob *= 2.0;
      }
    }
    totalCandidateProb = candidateProbs.reduce((s, cp) => s + cp.prob, 0);

    for (const { candidate, prob } of candidateProbs) {
      const midi = freqToMidiContinuous(candidate.frequency);
      const normalizedProb = (prob / totalCandidateProb) * (1 - SILENCE_FLOOR);

      for (let offset = -2; offset <= 2; offset++) {
        const targetMidi = Math.round(midi) + offset;
        if (targetMidi < 21 || targetMidi > 108) continue;

        const state = midiToState(targetMidi);
        const dist = targetMidi - midi;
        const gauss = Math.exp(
          -0.5 *
            (dist / SPREAD_SIGMA_SEMITONES) *
            (dist / SPREAD_SIGMA_SEMITONES),
        );

        probs[state] += normalizedProb * gauss;
      }
    }

    normalizeDistribution(probs);

    this.lastResult = { probs, timestamp: now, frameId: id };
    return this.lastResult;
  }

  /** Set adaptive silence threshold from calibrated noise floor. */
  setAdaptiveSilenceThreshold(rms: number): void {
    this.adaptiveSilenceRms = rms;
  }

  /** Reset all state. */
  reset(): void {
    this.yinDetector = null;
    this.frameId = 0;
    this.lastBufferHash = 0;
    this.adaptiveSilenceRms = null;
    this.tickCount = 0;
    this.lastResult = null;
  }
}
