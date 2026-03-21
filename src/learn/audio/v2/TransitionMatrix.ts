// ── TransitionMatrix ──────────────────────────────────────────────────────
// 89×89 HMM transition probability matrix for the Bayesian note tracker.
//
// States: 0–87 = MIDI 21–108 (piano keys), 88 = silence.
//
// Musical priors encode that:
//   - Notes tend to sustain (high self-transition ~0.9)
//   - Silence is less sticky (~0.7)
//   - Adjacent semitones are more likely than large jumps
//   - Silence→note transitions require onset evidence
//   - Expected notes get a 10x transition boost
//   - Diatonic notes get a 2x transition boost
//   - Onset injection temporarily boosts silence→note transitions

import { NUM_STATES, SILENCE_STATE, type OnsetEvent } from './types';

// ── Constants ─────────────────────────────────────────────────────────────

// Self-transition probabilities
const NOTE_SELF_TRANSITION = 0.9; // notes sustain
const SILENCE_SELF_TRANSITION = 0.88; // sticky enough to suppress ghost notes, 12%/frame escape rate

// Note-to-note transition base probabilities (before normalization)
// Probability decays with semitone distance
const NOTE_TO_NOTE_BASE = 0.002; // base probability for any note→note transition
const SEMITONE_DECAY = 0.6; // multiply by this per semitone of distance

// Silence ↔ note transitions
const SILENCE_TO_NOTE_BASE = 0.002; // low base — needs onset evidence to boost
const NOTE_TO_SILENCE = 0.05; // notes end

// Special interval bonuses (relative to base)
const OCTAVE_BONUS = 3.0; // ±12 semitones
const FIFTH_BONUS = 2.0; // ±7 semitones
// Prior boosts
const EXPECTED_NOTE_BOOST = 10.0; // transitions into expected notes
const DIATONIC_BOOST = 2.0; // transitions into diatonic notes
const ONSET_SILENCE_TO_NOTE_BOOST = 18.0; // during onset: silence→note (18× overcomes 0.88 silence stickiness)
const ONSET_NOTE_TO_NOTE_BOOST = 5.0; // during onset: note→different note

// Onset injection decay (per frame)
const ONSET_DECAY_RATE = 0.85; // ~15% decay per frame, persists through full piano attack

// ── Class ─────────────────────────────────────────────────────────────────

export class TransitionMatrix {
  /** Row-major 89×89 transition matrix. matrix[from * NUM_STATES + to]. */
  private baseMatrix: Float64Array;

  /** Working copy with priors applied (rebuilt when priors change). */
  private matrix: Float64Array;

  /** Expected MIDI notes (null = no constraint). */
  private expectedNotes: Set<number> | null = null;

  /** Diatonic pitch classes (null = no key context). */
  private diatonicPCs: Set<number> | null = null;

  /** Current onset boost multiplier (decays each frame). */
  private onsetBoost = 0;

  constructor() {
    this.baseMatrix = new Float64Array(NUM_STATES * NUM_STATES);
    this.matrix = new Float64Array(NUM_STATES * NUM_STATES);
    this.buildBaseMatrix();
    this.rebuildWorkingMatrix();
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /** Get transition probability from state `from` to state `to`. */
  getTransition(from: number, to: number): number {
    return this.matrix[from * NUM_STATES + to];
  }

  /** Get the full row of transition probabilities from state `from`. */
  getRow(from: number): Float64Array {
    return this.matrix.subarray(from * NUM_STATES, (from + 1) * NUM_STATES);
  }

  /** Boost transition priors toward expected notes. */
  setExpectedNotes(notes: number[] | null): void {
    this.expectedNotes = notes && notes.length > 0 ? new Set(notes) : null;
    this.rebuildWorkingMatrix();
  }

  /** Set key context for diatonic priors. */
  setKeyContext(rootPc: number, modeIntervals: number[]): void {
    this.diatonicPCs = new Set(modeIntervals.map((iv) => (rootPc + iv) % 12));
    this.rebuildWorkingMatrix();
  }

  /** Clear key context. */
  clearKeyContext(): void {
    this.diatonicPCs = null;
    this.rebuildWorkingMatrix();
  }

  /**
   * Inject an onset event. This temporarily boosts silence→note
   * transitions for the next few frames.
   */
  injectOnset(_onset: OnsetEvent): void {
    this.onsetBoost = 1.0; // full boost, will decay
  }

  /**
   * Called each frame to decay the onset boost and return the current
   * effective transition probabilities accounting for onset injection.
   *
   * This is the method the HMM should call each frame instead of
   * getTransition() when onset injection is active.
   */
  getEffectiveTransition(from: number, to: number): number {
    let prob = this.matrix[from * NUM_STATES + to];

    if (this.onsetBoost > 0.01) {
      // Onset active: boost silence→note and note→different-note
      if (from === SILENCE_STATE && to !== SILENCE_STATE) {
        prob *= 1 + this.onsetBoost * (ONSET_SILENCE_TO_NOTE_BOOST - 1);
      } else if (
        from !== SILENCE_STATE &&
        to !== SILENCE_STATE &&
        from !== to
      ) {
        prob *= 1 + this.onsetBoost * (ONSET_NOTE_TO_NOTE_BOOST - 1);
      }
    }

    return prob;
  }

  /** Advance one frame: decay onset boost. */
  advanceFrame(): void {
    this.onsetBoost *= ONSET_DECAY_RATE;
  }

  /** Reset all state (onset boost, priors). */
  reset(): void {
    this.expectedNotes = null;
    this.diatonicPCs = null;
    this.onsetBoost = 0;
    this.rebuildWorkingMatrix();
  }

  // ── Internal ────────────────────────────────────────────────────────────

  /** Build the base transition matrix from musical priors. */
  private buildBaseMatrix(): void {
    const m = this.baseMatrix;

    for (let from = 0; from < NUM_STATES; from++) {
      let rowSum = 0;

      for (let to = 0; to < NUM_STATES; to++) {
        let prob: number;

        if (from === SILENCE_STATE) {
          // Silence row
          if (to === SILENCE_STATE) {
            prob = SILENCE_SELF_TRANSITION;
          } else {
            prob = SILENCE_TO_NOTE_BASE;
          }
        } else if (to === SILENCE_STATE) {
          // Any note → silence
          prob = NOTE_TO_SILENCE;
        } else if (from === to) {
          // Self-transition
          prob = NOTE_SELF_TRANSITION;
        } else {
          // Note → different note: decay with semitone distance
          const dist = Math.abs(from - to);
          prob = NOTE_TO_NOTE_BASE * Math.pow(SEMITONE_DECAY, dist);

          // Pitch-class interval bonuses (modular, covers all octaves)
          const pc = dist % 12;
          if (pc === 0)
            prob *= OCTAVE_BONUS; // unison/octave
          else if (pc === 7 || pc === 5)
            prob *= FIFTH_BONUS; // P5/P4
          else if (pc === 3 || pc === 4)
            prob *= 1.3; // minor/major 3rd
          else if (pc === 2 || pc === 10) prob *= 1.2; // major 2nd / minor 7th
        }

        m[from * NUM_STATES + to] = prob;
        rowSum += prob;
      }

      // Normalize row to sum to 1
      if (rowSum > 0) {
        const invSum = 1 / rowSum;
        for (let to = 0; to < NUM_STATES; to++) {
          m[from * NUM_STATES + to] *= invSum;
        }
      }
    }
  }

  /** Rebuild working matrix with expected-note and diatonic priors. */
  private rebuildWorkingMatrix(): void {
    const base = this.baseMatrix;
    const work = this.matrix;

    // Start from base
    work.set(base);

    const hasExpected = this.expectedNotes && this.expectedNotes.size > 0;
    const hasDiatonic = this.diatonicPCs && this.diatonicPCs.size > 0;

    if (!hasExpected && !hasDiatonic) return;

    // Apply boosts to transitions INTO expected/diatonic states
    for (let from = 0; from < NUM_STATES; from++) {
      let rowSum = 0;

      for (let to = 0; to < NUM_STATES; to++) {
        let prob = work[from * NUM_STATES + to];

        if (to !== SILENCE_STATE) {
          const midi = to + 21; // state → MIDI
          const pc = midi % 12;

          // Expected note boost (strongest)
          if (hasExpected && this.expectedNotes!.has(midi)) {
            prob *= EXPECTED_NOTE_BOOST;
          }

          // Diatonic boost (weaker)
          if (hasDiatonic && this.diatonicPCs!.has(pc)) {
            prob *= DIATONIC_BOOST;
          }
        }

        work[from * NUM_STATES + to] = prob;
        rowSum += prob;
      }

      // Re-normalize row
      if (rowSum > 0) {
        const invSum = 1 / rowSum;
        for (let to = 0; to < NUM_STATES; to++) {
          work[from * NUM_STATES + to] *= invSum;
        }
      }
    }
  }
}
