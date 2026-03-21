// ── V2 Pitch Detection: Shared Types ──────────────────────────────────────
// All types for the probabilistic streaming architecture. Every module
// in the v2 pipeline communicates through these structures.

// ── Constants ─────────────────────────────────────────────────────────────

/** Number of HMM states: 88 piano keys (MIDI 21–108) + 1 silence state. */
export const NUM_STATES = 89;

/** Index of the silence state in PitchDistribution. */
export const SILENCE_STATE = 88;

/** MIDI offset: state index 0 = MIDI 21 (A0). */
export const MIDI_OFFSET = 21;

/** Piano frequency range. */
export const PIANO_MIN_FREQ = 27.5; // A0
export const PIANO_MAX_FREQ = 4186; // C8

/** A4 reference frequency. */
export const A4_FREQ = 440;

// ── Layer 1: Multi-Resolution Input ───────────────────────────────────────

/**
 * A probability distribution over 89 states (88 piano keys + silence).
 * Every analysis stream emits this — no hard pitch decisions until the HMM.
 */
export interface PitchDistribution {
  /** Probability for each state. Index 0–87 = MIDI 21–108, index 88 = silence. */
  probs: Float64Array; // length 89

  /** Timestamp from performance.now() (ms). */
  timestamp: number;

  /** Monotonically increasing frame counter. */
  frameId: number;
}

/**
 * Onset event with sub-frame precision and characterization.
 * Emitted by OnsetStream — not a boolean, but a rich event.
 */
export interface OnsetEvent {
  /** Timestamp from performance.now() (ms). */
  timestamp: number;

  /** Onset strength: 0–1 normalized spectral flux magnitude. */
  strength: number;

  /** Spectral centroid in Hz at onset moment (characterizes bright vs dark attack). */
  spectralCentroid: number;
}

// ── Layer 2: Bayesian Note Tracker ────────────────────────────────────────

/**
 * Output from the HMM Viterbi decoder. This is the first point where
 * a hard note decision is made — everything before is probabilistic.
 */
export interface TrackedNote {
  /** MIDI note number, 21 (A0) – 108 (C8). */
  midiNumber: number;

  /** Viterbi path probability for this state (0–1). */
  confidence: number;

  /** Estimated MIDI velocity from onset energy (0–127). */
  velocity: number;

  /** Onset time in seconds (AudioContext.currentTime-based). */
  onsetTime: number;

  /** Continuous pitch in cents relative to the detected MIDI note.
   *  0 = perfectly in tune, +20 = 20 cents sharp, etc. */
  pitchCents: number;
}

// ── Layer 3: NMF Polyphonic Detection ─────────────────────────────────────

/**
 * NMF activation vector: how strongly each of 88 piano keys is
 * sounding in the current frame.
 */
export interface NMFActivation {
  /** Activation weight per piano key. Index 0 = MIDI 21, index 87 = MIDI 108. */
  weights: Float64Array; // length 88

  /** Timestamp from performance.now() (ms). */
  timestamp: number;

  /** Monotonically increasing frame counter. */
  frameId: number;
}

// ── Layer 5: Continuous Assessment ────────────────────────────────────────

/**
 * Continuous score for a single note match. Replaces binary matched/unmatched.
 * Every dimension is scored 0–1 independently, then combined.
 */
export interface ContinuousNoteScore {
  /** Pitch distance in cents (0 = exact, always ≥ 0). */
  pitchDistanceCents: number;

  /** Pitch similarity score (0–1). Gaussian decay from 0 cents. */
  pitchScore: number;

  /** Timing deviation as fraction of beat duration (0 = exact). */
  timingDeviationRatio: number;

  /** Timing similarity score (0–1). Gaussian decay from 0 ratio. */
  timingScore: number;

  /** Duration ratio: received / expected (1.0 = perfect). */
  durationRatio: number;

  /** Duration similarity score (0–1). Penalizes both too short and too long. */
  durationScore: number;

  /** Tracker confidence at detection time (0–1). */
  noteConfidence: number;

  /** True if pitch class matches but octave differs. */
  octaveEquivalent: boolean;

  /** Pitch deviation in semitones (signed: negative = flat, positive = sharp). */
  pitchDeviationSemitones: number;

  /** Weighted composite score (0–1). */
  compositeScore: number;
}

/**
 * Continuous score for an entire performance.
 */
export interface ContinuousPerformanceScore {
  /** Overall weighted geometric mean (0–1). */
  overallScore: number;

  /** Aggregate pitch score (0–1). */
  pitchScore: number;

  /** Aggregate timing score (0–1). */
  timingScore: number;

  /** Aggregate duration score (0–1). */
  durationScore: number;

  /** Per-note breakdown. */
  perNoteScores: ContinuousNoteScore[];

  /** Letter grade. */
  grade: 'A' | 'B' | 'C' | 'Retry';

  /** Whether the student passed. */
  passed: boolean;

  /** Which dimension was weakest (for targeted feedback). */
  weakestDimension: 'pitch' | 'timing' | 'duration';
}

/**
 * Real-time feedback for a single note during play-along.
 */
export interface ContinuousNoteFeedback {
  /** Index in the expected note array. */
  noteIdx: number;

  /** Full continuous score. */
  score: ContinuousNoteScore;

  /** Derived quality label for UI display. */
  quality: 'perfect' | 'good' | 'ok' | 'miss';

  /** Timing deviation in ms (signed: negative = early, positive = late). */
  deviationMs: number;

  /** Timestamp of this feedback event (performance.now). */
  timestamp: number;
}

// ── Detection Mode ────────────────────────────────────────────────────────

export type DetectionMode = 'monophonic' | 'polyphonic';

// ── Helpers ───────────────────────────────────────────────────────────────

/** Convert a frequency in Hz to a MIDI note number (continuous, not rounded). */
export function freqToMidiContinuous(freq: number): number {
  return 69 + 12 * Math.log2(freq / A4_FREQ);
}

/** Convert a frequency in Hz to the nearest MIDI note number. */
export function freqToMidi(freq: number): number {
  return Math.round(freqToMidiContinuous(freq));
}

/** Convert a MIDI note number to frequency in Hz. */
export function midiToFreq(midi: number): number {
  return A4_FREQ * Math.pow(2, (midi - 69) / 12);
}

/** Convert HMM state index (0–88) to MIDI note number (21–108), or null for silence. */
export function stateToMidi(state: number): number | null {
  if (state === SILENCE_STATE) return null;
  return state + MIDI_OFFSET;
}

/** Convert MIDI note number (21–108) to HMM state index (0–87). */
export function midiToState(midi: number): number {
  return midi - MIDI_OFFSET;
}

/** Create a uniform PitchDistribution (maximum entropy / no information). */
export function createUniformDistribution(
  timestamp: number,
  frameId: number,
): PitchDistribution {
  const probs = new Float64Array(NUM_STATES);
  const uniform = 1 / NUM_STATES;
  for (let i = 0; i < NUM_STATES; i++) probs[i] = uniform;
  return { probs, timestamp, frameId };
}

/** Create a silence-only PitchDistribution. */
export function createSilenceDistribution(
  timestamp: number,
  frameId: number,
): PitchDistribution {
  const probs = new Float64Array(NUM_STATES);
  probs[SILENCE_STATE] = 1;
  return { probs, timestamp, frameId };
}

/** Normalize a Float64Array to sum to 1 (in place). Returns the array. */
export function normalizeDistribution(probs: Float64Array): Float64Array {
  let sum = 0;
  for (let i = 0; i < probs.length; i++) sum += probs[i];
  if (sum > 0) {
    const invSum = 1 / sum;
    for (let i = 0; i < probs.length; i++) probs[i] *= invSum;
  }
  return probs;
}
