// ── NoteHMM ───────────────────────────────────────────────────────────────
// The central inference engine: online Viterbi decoder over 89 states
// (88 piano keys + silence).
//
// Replaces ALL temporal reasoning from the v1 system:
//   - 3-state machine (searching → confirming → tracking)
//   - EMA smoothing with intelligent reset
//   - Hold counters for jitter suppression
//   - Vote buffer for chord detection
//
// The HMM handles all of these naturally through its transition
// probabilities and Viterbi path optimization.
//
// Online Viterbi with sliding window:
//   - Maintains a window of ~10 recent frames
//   - Each frame: forward pass + backpointer storage
//   - Reports the best state at t-LATENCY_FRAMES (configurable)
//   - Confidence = best state probability / total mass

import { TransitionMatrix } from './TransitionMatrix';
import {
  NUM_STATES,
  SILENCE_STATE,
  stateToMidi,
  type OnsetEvent,
  type TrackedNote,
} from './types';

// ── Constants ─────────────────────────────────────────────────────────────

/** Viterbi window size (frames of history for backtracking). */
const WINDOW_SIZE = 10;

/** Latency frames: report state at t - this many frames.
 *  2 frames ≈ 50-90ms depending on analysis rate. */
const LATENCY_FRAMES = 2;

/** Minimum probability floor (prevent underflow). */
const PROB_FLOOR = 1e-100;

/** Log of probability floor. */
const LOG_PROB_FLOOR = Math.log(PROB_FLOOR);

/** Confidence threshold to START emitting a note (must exceed this). */
const CONFIDENCE_ON_THRESHOLD = 0.35;

/** Confidence threshold to STOP emitting a note (must drop below this). */
const CONFIDENCE_OFF_THRESHOLD = 0.25;

/** Velocity mapping: RMS → MIDI velocity. */
const VELOCITY_MIN_RMS = 0.02;
const VELOCITY_MAX_RMS = 0.3;
const VELOCITY_MIN = 30;
const VELOCITY_MAX = 110;

// ── Class ─────────────────────────────────────────────────────────────────

export class NoteHMM {
  private transitionMatrix: TransitionMatrix;

  /** Log-probabilities of the forward variable α[t][j] for current frame. */
  private logAlpha: Float64Array;

  /** Backpointers: for each frame in window, which state led to each current state. */
  private backpointers: Int32Array[];

  /** Best states at each frame in the window (for quick path readback). */
  private bestStates: Int32Array;

  /** Current frame index (monotonically increasing). */
  private frameIdx = 0;

  /** Window write position (circular). */
  private windowPos = 0;

  /** Whether the HMM has been initialized. */
  private initialized = false;

  /** Last reported state (for change detection). */
  private lastReportedState = SILENCE_STATE;

  /** Onset time of the current note. */
  private currentOnsetTime = 0;

  /** RMS at onset (for velocity estimation). */
  private onsetRms = 0;

  /** Whether a note is currently active (for hysteresis). */
  private noteActive = false;

  /** Last observation vector (for pitchCents computation). */
  private lastObservations: Float64Array | null = null;

  constructor(transitionMatrix: TransitionMatrix) {
    this.transitionMatrix = transitionMatrix;

    // Initialize log-alpha to uniform
    this.logAlpha = new Float64Array(NUM_STATES);
    const logUniform = Math.log(1 / NUM_STATES);
    for (let i = 0; i < NUM_STATES; i++) {
      this.logAlpha[i] = logUniform;
    }

    // Initialize backpointer storage
    this.backpointers = [];
    for (let t = 0; t < WINDOW_SIZE; t++) {
      this.backpointers.push(new Int32Array(NUM_STATES));
    }

    this.bestStates = new Int32Array(WINDOW_SIZE);
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Feed one frame of fused observations and get the current best note.
   *
   * @param observations — Fused observation likelihoods (89-element Float64Array)
   * @param onset — Onset event from OnsetStream, or null
   * @param rms — Current RMS level (for velocity estimation)
   * @returns TrackedNote if a note is active with sufficient confidence, null otherwise
   */
  update(
    observations: Float64Array,
    onset: OnsetEvent | null,
    rms: number = 0,
  ): TrackedNote | null {
    // Store observations for pitchCents computation
    this.lastObservations = observations;

    // Inject onset into transition matrix
    if (onset) {
      this.transitionMatrix.injectOnset(onset);
    }

    // Forward pass: compute new log-alpha
    const newLogAlpha = new Float64Array(NUM_STATES);
    const bp = this.backpointers[this.windowPos];

    if (!this.initialized) {
      // First frame: log-alpha = log(observation) + log(1/N)
      const logPrior = Math.log(1 / NUM_STATES);
      for (let j = 0; j < NUM_STATES; j++) {
        newLogAlpha[j] =
          logPrior + Math.log(Math.max(observations[j], PROB_FLOOR));
        bp[j] = j; // self-backpointer for first frame
      }
      this.initialized = true;
    } else {
      // Viterbi forward: α[t][j] = max_i(α[t-1][i] × A[i][j]) × B[j]
      for (let j = 0; j < NUM_STATES; j++) {
        let bestLogProb = -Infinity;
        let bestPrev = 0;

        for (let i = 0; i < NUM_STATES; i++) {
          const trans = this.transitionMatrix.getEffectiveTransition(i, j);
          if (trans <= 0) continue;

          const logProb = this.logAlpha[i] + Math.log(trans);
          if (logProb > bestLogProb) {
            bestLogProb = logProb;
            bestPrev = i;
          }
        }

        // Add observation log-likelihood
        newLogAlpha[j] =
          bestLogProb + Math.log(Math.max(observations[j], PROB_FLOOR));
        bp[j] = bestPrev;
      }
    }

    // Log-sum-exp normalization (prevent underflow)
    let maxLogAlpha = -Infinity;
    for (let j = 0; j < NUM_STATES; j++) {
      if (newLogAlpha[j] > maxLogAlpha) maxLogAlpha = newLogAlpha[j];
    }
    if (maxLogAlpha > LOG_PROB_FLOOR) {
      for (let j = 0; j < NUM_STATES; j++) {
        newLogAlpha[j] -= maxLogAlpha;
      }
    }

    // Store
    this.logAlpha.set(newLogAlpha);

    // Find best state at current frame
    let bestState = 0;
    let bestLogProb = -Infinity;
    for (let j = 0; j < NUM_STATES; j++) {
      if (this.logAlpha[j] > bestLogProb) {
        bestLogProb = this.logAlpha[j];
        bestState = j;
      }
    }
    this.bestStates[this.windowPos] = bestState;

    // Advance window
    this.windowPos = (this.windowPos + 1) % WINDOW_SIZE;
    this.frameIdx++;

    // Decay onset boost
    this.transitionMatrix.advanceFrame();

    // Report state with latency (look back LATENCY_FRAMES)
    if (this.frameIdx < LATENCY_FRAMES + 1) {
      return null; // Not enough frames yet
    }

    // Trace back from current best state through backpointers
    const reportedState = this.traceBack(LATENCY_FRAMES);

    // Compute confidence: P(best state) / Σ P(all states)
    // Standard two-pass log-sum-exp with max trick for numerical stability
    let maxLA = -Infinity;
    for (let j = 0; j < NUM_STATES; j++) {
      if (this.logAlpha[j] > maxLA) maxLA = this.logAlpha[j];
    }
    let sumExp = 0;
    for (let j = 0; j < NUM_STATES; j++) {
      sumExp += Math.exp(this.logAlpha[j] - maxLA);
    }
    const logSumExp = maxLA + Math.log(sumExp);

    // Use the reported state's forward variable, not the current best
    const reportedLogProb = this.logAlpha[reportedState];
    const confidence =
      logSumExp > -Infinity ? Math.exp(reportedLogProb - logSumExp) : 0;

    // Track note state changes
    if (reportedState !== this.lastReportedState) {
      if (reportedState !== SILENCE_STATE) {
        // New note onset
        this.currentOnsetTime = performance.now() / 1000;
        this.onsetRms = rms;
      }
      this.lastReportedState = reportedState;
    }

    // Return TrackedNote or null (with hysteresis to prevent flicker)
    if (reportedState === SILENCE_STATE) {
      this.noteActive = false;
      return null;
    }
    if (!this.noteActive) {
      if (confidence < CONFIDENCE_ON_THRESHOLD) return null;
      this.noteActive = true;
    } else {
      if (confidence < CONFIDENCE_OFF_THRESHOLD) {
        this.noteActive = false;
        return null;
      }
    }

    const midiNumber = stateToMidi(reportedState);
    if (midiNumber === null) return null;

    return {
      midiNumber,
      confidence,
      velocity: this.rmsToVelocity(this.onsetRms),
      onsetTime: this.currentOnsetTime,
      pitchCents: this.computePitchCents(reportedState),
    };
  }

  /**
   * Get the recent Viterbi path (for visualization or look-back correction).
   * Returns up to numFrames recent TrackedNotes.
   */
  getRecentPath(numFrames: number): TrackedNote[] {
    const path: TrackedNote[] = [];
    const frames = Math.min(numFrames, this.frameIdx, WINDOW_SIZE);

    for (let i = 0; i < frames; i++) {
      const pos = (this.windowPos - 1 - i + WINDOW_SIZE) % WINDOW_SIZE;
      const state = this.bestStates[pos];
      const midi = stateToMidi(state);
      if (midi !== null) {
        path.unshift({
          midiNumber: midi,
          confidence: 0.5, // approximate
          velocity: 64,
          onsetTime: 0,
          pitchCents: 0,
        });
      }
    }

    return path;
  }

  /**
   * Get current state probabilities (for visualization).
   * Returns Float64Array of 89 probabilities summing to 1.
   */
  getStateProbabilities(): Float64Array {
    const probs = new Float64Array(NUM_STATES);

    // Convert log-alpha to probabilities
    let maxLog = -Infinity;
    for (let i = 0; i < NUM_STATES; i++) {
      if (this.logAlpha[i] > maxLog) maxLog = this.logAlpha[i];
    }

    let sum = 0;
    for (let i = 0; i < NUM_STATES; i++) {
      probs[i] = Math.exp(this.logAlpha[i] - maxLog);
      sum += probs[i];
    }

    if (sum > 0) {
      const invSum = 1 / sum;
      for (let i = 0; i < NUM_STATES; i++) probs[i] *= invSum;
    }

    return probs;
  }

  /** Get the last reported state index. */
  getLastState(): number {
    return this.lastReportedState;
  }

  /** Reset all state. */
  reset(): void {
    const logUniform = Math.log(1 / NUM_STATES);
    for (let i = 0; i < NUM_STATES; i++) {
      this.logAlpha[i] = logUniform;
    }
    for (const bp of this.backpointers) bp.fill(0);
    this.bestStates.fill(SILENCE_STATE);
    this.frameIdx = 0;
    this.windowPos = 0;
    this.initialized = false;
    this.lastReportedState = SILENCE_STATE;
    this.currentOnsetTime = 0;
    this.onsetRms = 0;
    this.noteActive = false;
    this.lastObservations = null;
  }

  // ── Internal ────────────────────────────────────────────────────────────

  /**
   * Trace back through backpointers from the current best state.
   * Returns the state at (current - steps) frames ago.
   */
  private traceBack(steps: number): number {
    // Start from current best state
    let state =
      this.bestStates[(this.windowPos - 1 + WINDOW_SIZE) % WINDOW_SIZE];

    // Walk back through backpointers
    for (let s = 0; s < steps; s++) {
      const pos = (this.windowPos - 1 - s + WINDOW_SIZE) % WINDOW_SIZE;
      state = this.backpointers[pos][state];
    }

    return state;
  }

  /**
   * Compute pitch deviation in cents from the reported state's center,
   * using weighted centroid over ±1 semitone neighbors.
   */
  private computePitchCents(state: number): number {
    if (!this.lastObservations || state === SILENCE_STATE) return 0;
    const lo = Math.max(0, state - 1);
    const hi = Math.min(87, state + 1);
    let num = 0;
    let den = 0;
    for (let s = lo; s <= hi; s++) {
      num += (s - state) * this.lastObservations[s];
      den += this.lastObservations[s];
    }
    if (den < 1e-10) return 0;
    return (num / den) * 100; // semitones → cents
  }

  /** Convert RMS to MIDI velocity (log-scale). */
  private rmsToVelocity(rms: number): number {
    if (rms <= VELOCITY_MIN_RMS) return VELOCITY_MIN;
    if (rms >= VELOCITY_MAX_RMS) return VELOCITY_MAX;
    const logMin = Math.log(VELOCITY_MIN_RMS);
    const logMax = Math.log(VELOCITY_MAX_RMS);
    const t = (Math.log(rms) - logMin) / (logMax - logMin);
    return Math.round(VELOCITY_MIN + t * (VELOCITY_MAX - VELOCITY_MIN));
  }
}
