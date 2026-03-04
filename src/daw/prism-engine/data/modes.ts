import type { ModeName } from '../types';

export const MODES: Record<ModeName, number[]> = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  melodicMinor: [0, 2, 3, 5, 7, 9, 11],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  harmonicMajor: [0, 2, 4, 5, 7, 8, 11],
  doubleHarmonicMajor: [0, 1, 4, 5, 7, 8, 11],
};

export const MODE_NAMES: ModeName[] = [
  'ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian',
];

export const TRIADS: Record<ModeName, string[]> = {
  ionian: ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'],
  dorian: ['minor', 'minor', 'major', 'major', 'minor', 'diminished', 'major'],
  phrygian: ['minor', 'major', 'major', 'minor', 'diminished', 'major', 'minor'],
  lydian: ['major', 'major', 'minor', 'diminished', 'major', 'minor', 'minor'],
  mixolydian: ['major', 'minor', 'diminished', 'major', 'minor', 'minor', 'major'],
  aeolian: ['minor', 'diminished', 'major', 'minor', 'minor', 'major', 'major'],
  locrian: ['diminished', 'major', 'minor', 'minor', 'major', 'major', 'minor'],
  melodicMinor: ['minor', 'minor', 'augmented', 'major', 'major', 'diminished', 'diminished'],
  harmonicMinor: ['minor', 'diminished', 'augmented', 'minor', 'major', 'major', 'diminished'],
  harmonicMajor: ['major', 'diminished', 'minor', 'minor', 'major', 'augmented', 'diminished'],
  doubleHarmonicMajor: ['major', 'minor', 'minor', 'diminished', 'major', 'augmented', 'diminished'],
};

export const TETRADS: Record<ModeName, string[]> = {
  ionian: ['major7', 'minor7', 'minor7', 'major7', 'dominant7', 'minor7', 'minor7b5'],
  dorian: ['minor7', 'minor7', 'major7', 'dominant7', 'minor7', 'minor7b5', 'major7'],
  phrygian: ['minor7', 'major7', 'dominant7', 'minor7', 'minor7b5', 'major7', 'minor7'],
  lydian: ['major7', 'dominant7', 'minor7', 'minor7b5', 'major7', 'minor7', 'minor7'],
  mixolydian: ['dominant7', 'minor7', 'minor7b5', 'major7', 'minor7', 'minor7', 'major7'],
  aeolian: ['minor7', 'minor7b5', 'major7', 'minor7', 'minor7', 'major7', 'dominant7'],
  locrian: ['minor7b5', 'major7', 'minor7', 'minor7', 'major7', 'dominant7', 'minor7'],
  melodicMinor: ['minormajor7', 'minor7', 'major7#5', 'dominant7', 'dominant7', 'minor7b5', 'minor7b5'],
  harmonicMinor: ['minormajor7', 'diminished7', 'major7#5', 'minor7', 'dominant7', 'major7', 'diminished7'],
  harmonicMajor: ['major7', 'diminished7', 'minor7', 'minormajor7', 'dominant7', 'major7#5', 'diminished7'],
  doubleHarmonicMajor: ['major7', 'dominant7', 'minor6', 'diminished7', 'dominant7b5', 'dominant7#5', 'diminished7'],
};

export const DEGREES: string[] = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7', 'b9', '9'];

// ── Extended Modes (all 35 modes across 5 scale families) ───────────────
// Used for chord recognition and theory display. Does not affect the
// generation system which uses MODES/TRIADS/TETRADS above.

export const ALL_MODES: Record<string, number[]> = {
  // Diatonic (same as MODES)
  ionian:      [0, 2, 4, 5, 7, 9, 11],
  dorian:      [0, 2, 3, 5, 7, 9, 10],
  phrygian:    [0, 1, 3, 5, 7, 8, 10],
  lydian:      [0, 2, 4, 6, 7, 9, 11],
  mixolydian:  [0, 2, 4, 5, 7, 9, 10],
  aeolian:     [0, 2, 3, 5, 7, 8, 10],
  locrian:     [0, 1, 3, 5, 6, 8, 10],

  // Harmonic Minor family
  harmonicMinor:      [0, 2, 3, 5, 7, 8, 11],
  locrianNat6:        [0, 1, 3, 5, 6, 9, 10],
  ionianSharp5:       [0, 2, 4, 5, 8, 9, 11],
  dorianSharp4:       [0, 2, 3, 6, 7, 9, 10],
  phrygianDominant:   [0, 1, 4, 5, 7, 8, 10],
  lydianSharp2:       [0, 3, 4, 6, 7, 9, 11],
  alteredDiminished:  [0, 1, 3, 4, 6, 8, 9],

  // Melodic Minor family
  melodicMinor:    [0, 2, 3, 5, 7, 9, 11],
  dorianFlat2:     [0, 1, 3, 5, 7, 9, 10],
  lydianAugmented: [0, 2, 4, 6, 8, 9, 11],
  lydianDominant:  [0, 2, 4, 6, 7, 9, 10],
  mixolydianFlat6: [0, 2, 4, 5, 7, 8, 10],
  locrianNat2:     [0, 2, 3, 5, 6, 8, 10],
  altered:         [0, 1, 3, 4, 6, 8, 10],

  // Harmonic Major family
  harmonicMajor:          [0, 2, 4, 5, 7, 8, 11],
  dorianFlat5:            [0, 2, 3, 5, 6, 9, 10],
  alteredDominantNat5:    [0, 1, 3, 4, 7, 8, 10],
  melodicMinorSharp4:     [0, 2, 3, 6, 7, 9, 11],
  mixolydianFlat2:        [0, 1, 4, 5, 7, 9, 10],
  lydianAugmentedSharp2:  [0, 3, 4, 6, 8, 9, 11],
  locrianDoubleFlat7:     [0, 1, 3, 5, 6, 8, 9],

  // Double Harmonic family
  doubleHarmonicMajor:            [0, 1, 4, 5, 7, 8, 11],
  lydianSharp2Sharp6:             [0, 3, 4, 6, 7, 10, 11],
  ultraphrygian:                  [0, 1, 3, 4, 7, 8, 9],
  doubleHarmonicMinor:            [0, 2, 3, 6, 7, 8, 11],
  oriental:                       [0, 1, 4, 5, 6, 9, 10],
  ionianSharp2Sharp5:             [0, 3, 4, 5, 8, 9, 11],
  locrianDoubleFlat3DoubleFlat7:  [0, 1, 2, 5, 6, 8, 9],
};
