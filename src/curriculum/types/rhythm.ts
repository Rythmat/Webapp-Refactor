/**
 * Phase 2 — Rhythm types.
 *
 * Models the Master Rhythm Library (166 beat-level cells),
 * Melody Phrase Rhythm Library (146 genre-specific phrases),
 * and Comping Pattern Libraries (1-bar and 2-bar).
 *
 * All tick values use PPQ = 480 (480 ticks per quarter note).
 * One bar = 1920 ticks, two bars = 3840 ticks.
 */

import type { RhythmHit, RhythmPattern } from '@prism/engine';

/**
 * A single beat-level rhythm cell from the Master Rhythm Library.
 * 480 ticks per beat. 166 patterns total.
 */
export interface MasterRhythmEntry {
  /** Pattern ID (e.g. 's1_01', 's2_03') */
  id: string;
  /** Human-readable description (e.g. "Quarter Note", "2 Eighths") */
  description: string;
  /** Grid notation: x = onset, . = rest (each char = 1 sixteenth = 120 ticks) */
  gridNotation: string;
  /** Tick array: [onset, duration] tuples */
  pattern: RhythmPattern;
  /** Section/category: '1 Beat Rhythms', '2 Beat Rhythms', etc. */
  section: string;
}

/**
 * A melody phrase rhythm from the Melody Phrase Rhythm Library.
 * Genre-specific rhythmic templates defining WHEN notes fall within a bar/phrase.
 * 146 patterns total.
 *
 * ZIP with a contour of matching noteCount to produce a melody:
 *   contour[i] → phraseRhythm.pattern[i]
 */
export interface PhraseRhythm {
  /** Pattern ID (e.g. 'pr_pop_3_01') */
  id: string;
  /** Genre this rhythm is associated with */
  genre: string;
  /** Number of note onsets (must match contour noteCount) */
  noteCount: number;
  /** Number of bars (1 or 2) */
  bars: number;
  /** Grid notation */
  gridNotation: string;
  /** Tick array: [onset, duration] tuples */
  pattern: RhythmPattern;
  /** Description */
  description: string;
}

/**
 * A comping pattern for chord accompaniment.
 * Defines WHEN chords are struck/released within a bar or two bars.
 */
export interface CompingPattern {
  /** Pattern ID (e.g. 'comp_pop_01', 'comp_jazz_02') */
  id: string;
  /** Human-readable description */
  description: string;
  /** Grid notation (each char = 1 sixteenth note) */
  gridNotation: string;
  /** Tick array: [onset, duration] tuples */
  pattern: RhythmPattern;
  /** Genres this pattern is used in */
  genreUse: string[];
  /** Number of bars (1 or 2) */
  bars: 1 | 2;
  /** Optional engine-equivalent comping pattern name */
  engineEquivalent?: string;
}

/**
 * A bass contour pattern defining WHICH notes the bass plays
 * relative to the chord root.
 * 113 patterns total.
 */
export interface BassContourPattern {
  /** Pattern ID (e.g. 'bass_c_ped_01', 'bass_c_arp_01') */
  id: string;
  /**
   * Note array using relative notation:
   * R = Root, P5 = Perfect 5th, 8 = Octave,
   * 3 = Major 3rd, b3 = Minor 3rd, P5- = P5 one octave lower
   */
  notes: string[];
  /** Category: 'pedal', 'root_fifth', 'arpeggio', 'walking', etc. */
  category: string;
}

/**
 * A bass rhythm pattern defining WHEN bass notes are played.
 * 113 patterns total. Paired with bass contour for full bass line.
 */
export interface BassRhythmPattern {
  /** Pattern ID (e.g. 'bass_r_pop_01', 'bass_r_jazz_03') */
  id: string;
  /** Tick array: [onset, duration] tuples */
  pattern: RhythmPattern;
  /** Genre association */
  genre: string;
}

// Re-export engine rhythm types for convenience
export type { RhythmHit, RhythmPattern };
