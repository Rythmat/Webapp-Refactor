/**
 * Phase 9 — Practical Voicing Rules.
 *
 * Implements voicing modification rules from Chord_Voicing_System.md:
 *   Rule 1: dom13/maj13 — omit 11th (clashes with major 3rd)
 *   Rule 2: dom11 — omit major 3rd (sus4 implied)
 *   Rule 3: #11 chords keep the 3rd (Lydian, no clash)
 *   Rule 4: min13/min11 — keep everything (b3 doesn't clash with 11th)
 *   Special: Funk dom9 (omit 3rd), Hendrix #9 layout, Jazz shells, Quartal stacking
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VoicingRuleResult {
  /** Modified interval array */
  intervals: number[];
  /** Which rule was applied, if any */
  ruleApplied?: string;
}

// ---------------------------------------------------------------------------
// Interval constants (semitones)
// ---------------------------------------------------------------------------
const MAJOR_3RD = 4;
const PERFECT_11TH = 17;

// ---------------------------------------------------------------------------
// Core rules
// ---------------------------------------------------------------------------

/**
 * Apply practical voicing rules that modify intervals based on chord quality.
 * These handle cases where theoretical stacking produces dissonant clashes.
 *
 * @param qualityId - Curriculum chord quality ID (e.g., 'dom13', 'dom11')
 * @param intervals - Root-position interval array from Chord Quality Library
 * @param genre - Genre slug for genre-specific rules
 * @returns Modified intervals with rule annotation
 */
export function applyVoicingRules(
  qualityId: string,
  intervals: number[],
  genre?: string,
): VoicingRuleResult {
  const id = qualityId.toLowerCase();

  // Rule 1: dom13/maj13 — omit 11th (clashes with major 3rd)
  if (id === 'dom13' || id === 'maj13') {
    const filtered = intervals.filter((n) => n !== PERFECT_11TH);
    if (filtered.length < intervals.length) {
      return { intervals: filtered, ruleApplied: 'omit_11th_from_13th' };
    }
  }

  // Rule 2: dom11 — omit major 3rd (sus4 implied)
  if (id === 'dom11') {
    const filtered = intervals.filter((n) => n !== MAJOR_3RD);
    if (filtered.length < intervals.length) {
      return { intervals: filtered, ruleApplied: 'omit_3rd_from_dom11' };
    }
  }

  // Rule 3: #11 chords keep the 3rd — no modification needed (Lydian)
  // dom7s11, maj7s11 — intervals already include both 3rd and #11
  // This rule is explicitly a "do nothing" — listed for documentation

  // Rule 4: min13/min11 — keep everything (b3 doesn't clash with 11th)
  // No modification needed — b3 (3 semitones) doesn't clash with P11 (17)

  // Special: Funk dom9 — omit 3rd, result = [0, 7, 10, 14] (root, 5th, b7, 9th)
  if (genre === 'funk' && id === 'dom9') {
    const filtered = intervals.filter((n) => n !== MAJOR_3RD);
    if (filtered.length < intervals.length) {
      return { intervals: filtered, ruleApplied: 'funk_dom9_omit_3rd' };
    }
  }

  return { intervals };
}

// ---------------------------------------------------------------------------
// Special voicing generators
// ---------------------------------------------------------------------------

/**
 * Generate Hendrix #9 voicing layout: [3, b7, #9] relative to chord root.
 * Used for funk/rock dominant7#9 chords.
 *
 * @param chordRoot - MIDI note of the chord root
 * @returns RH MIDI notes in Hendrix layout
 */
export function hendrixVoicing(chordRoot: number): number[] {
  return [chordRoot + 4, chordRoot + 10, chordRoot + 15]; // 3, b7, #9
}

/**
 * Generate jazz shell voicing (partial chord subsets).
 *
 * @param chordRoot - MIDI note of the chord root
 * @param type - Shell type: '1-7' (root+7th) or '1-3-7' (root+3rd+7th)
 * @param seventhInterval - Semitones for the 7th (10 for b7, 11 for maj7)
 * @param thirdInterval - Semitones for the 3rd (3 for minor, 4 for major)
 * @returns Shell voicing MIDI notes
 */
export function jazzShell(
  chordRoot: number,
  type: '1-7' | '1-3-7',
  seventhInterval: number,
  thirdInterval: number = 4,
): number[] {
  if (type === '1-7') {
    return [chordRoot, chordRoot + seventhInterval];
  }
  return [chordRoot, chordRoot + thirdInterval, chordRoot + seventhInterval];
}

/**
 * Generate quartal stacking voicing (stacked perfect 4ths).
 * Quality-independent — always stacks P4ths from the given root.
 *
 * @param chordRoot - MIDI note of the starting pitch
 * @param noteCount - Number of notes to stack (default 3)
 * @returns Quartal voicing MIDI notes
 */
export function quartalVoicing(
  chordRoot: number,
  noteCount: number = 3,
): number[] {
  const notes: number[] = [];
  for (let i = 0; i < noteCount; i++) {
    notes.push(chordRoot + i * 5); // P4 = 5 semitones
  }
  return notes;
}

/**
 * Generate gospel stacked 3rds voicing (root position of extended chords).
 * Simply returns root-position intervals transposed to chord root.
 *
 * @param chordRoot - MIDI note of the chord root
 * @param intervals - Root-position interval array
 * @returns MIDI notes in stacked 3rds (root position)
 */
export function gospelStackedThirds(
  chordRoot: number,
  intervals: number[],
): number[] {
  return intervals.map((i) => chordRoot + i);
}
