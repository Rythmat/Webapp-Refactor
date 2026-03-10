/**
 * Structured MIDI evaluation rules for Piano Fundamentals activities.
 *
 * Each step's `midiEval` field uses one of these discriminated-union
 * variants so the evaluator can assess user input programmatically.
 */

export type FundamentalsMidiEval =
  /** Play one note in range A, then one note in range B (ordered). */
  | {
      type: 'two_range_sequence';
      first: { min: number; max: number };
      second: { min: number; max: number };
    }
  /** Play a specific pitch class in N distinct octaves. */
  | { type: 'pitch_class'; notes: number[]; minOctaves: number }
  /** Alternate between two pitch classes, ascending. */
  | { type: 'alternating'; pitchClasses: number[]; minPairs: number }
  /** Play pitch classes in order (any octave unless octaveAware). */
  | { type: 'sequence'; notes: number[]; octaveAware: boolean }
  /** Play exact MIDI note number(s). */
  | { type: 'exact_midi'; midi: number[] }
  /** Play N notes all within a MIDI range. */
  | { type: 'range'; min: number; max: number; minNotes: number }
  /** Play notes in multiple zones (each zone has a range and min count). */
  | {
      type: 'multi_zone';
      zones: Array<{ min: number; max: number; minNotes: number }>;
    }
  /** Play specific MIDI notes within a time window (chord). */
  | { type: 'simultaneous'; midi: number[]; windowMs: number }
  /** Play notes in sequential ranges (phase-based, e.g. chord → melody → bass). */
  | {
      type: 'ordered_ranges';
      phases: Array<{
        min: number;
        max: number;
        minNotes: number;
        simultaneous?: boolean;
      }>;
    }
  /** Quiz: app shows random notes, user plays them one at a time. */
  | {
      type: 'quiz';
      notePool: number[];
      count: number;
      passThreshold: number;
      timeLimitMs?: number;
      octaveAware?: boolean;
    }
  /** Play all 12 chromatic notes ascending from any C. */
  | { type: 'chromatic_ascending' };
