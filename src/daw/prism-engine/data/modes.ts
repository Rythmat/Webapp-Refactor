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
  'ionian',
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'aeolian',
  'locrian',
];

export const TRIADS: Record<ModeName, string[]> = {
  ionian: ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'],
  dorian: ['minor', 'minor', 'major', 'major', 'minor', 'diminished', 'major'],
  phrygian: [
    'minor',
    'major',
    'major',
    'minor',
    'diminished',
    'major',
    'minor',
  ],
  lydian: ['major', 'major', 'minor', 'diminished', 'major', 'minor', 'minor'],
  mixolydian: [
    'major',
    'minor',
    'diminished',
    'major',
    'minor',
    'minor',
    'major',
  ],
  aeolian: ['minor', 'diminished', 'major', 'minor', 'minor', 'major', 'major'],
  locrian: ['diminished', 'major', 'minor', 'minor', 'major', 'major', 'minor'],
  melodicMinor: [
    'minor',
    'minor',
    'augmented',
    'major',
    'major',
    'diminished',
    'diminished',
  ],
  harmonicMinor: [
    'minor',
    'diminished',
    'augmented',
    'minor',
    'major',
    'major',
    'diminished',
  ],
  harmonicMajor: [
    'major',
    'diminished',
    'minor',
    'minor',
    'major',
    'augmented',
    'diminished',
  ],
  doubleHarmonicMajor: [
    'major',
    'major',
    'minor',
    'minor',
    'majorb5',
    'augmented',
    'sus2b5',
  ],
};

export const TETRADS: Record<ModeName, string[]> = {
  ionian: [
    'major7',
    'minor7',
    'minor7',
    'major7',
    'dominant7',
    'minor7',
    'minor7b5',
  ],
  dorian: [
    'minor7',
    'minor7',
    'major7',
    'dominant7',
    'minor7',
    'minor7b5',
    'major7',
  ],
  phrygian: [
    'minor7',
    'major7',
    'dominant7',
    'minor7',
    'minor7b5',
    'major7',
    'minor7',
  ],
  lydian: [
    'major7',
    'dominant7',
    'minor7',
    'minor7b5',
    'major7',
    'minor7',
    'minor7',
  ],
  mixolydian: [
    'dominant7',
    'minor7',
    'minor7b5',
    'major7',
    'minor7',
    'minor7',
    'major7',
  ],
  aeolian: [
    'minor7',
    'minor7b5',
    'major7',
    'minor7',
    'minor7',
    'major7',
    'dominant7',
  ],
  locrian: [
    'minor7b5',
    'major7',
    'minor7',
    'minor7',
    'major7',
    'dominant7',
    'minor7',
  ],
  melodicMinor: [
    'minormajor7',
    'minor7',
    'major7#5',
    'dominant7',
    'dominant7',
    'minor7b5',
    'minor7b5',
  ],
  harmonicMinor: [
    'minormajor7',
    'minor7b5',
    'major7#5',
    'minor7',
    'dominant7',
    'major7',
    'diminished7',
  ],
  harmonicMajor: [
    'major7',
    'minor7b5',
    'minor7',
    'minormajor7',
    'dominant7',
    'major7#5',
    'diminished7',
  ],
  doubleHarmonicMajor: [
    'major7',
    'major7',
    'minor6',
    'minormajor7',
    'dominant7b5',
    'major7#5',
    'sus2b5add6',
  ],
};

export const DEGREES: string[] = [
  '1',
  'b2',
  '2',
  'b3',
  '3',
  '4',
  'b5',
  '5',
  'b6',
  '6',
  'b7',
  '7',
  'b9',
  '9',
];

// ── Extended Modes (all 35 modes across 5 scale families) ───────────────
// Used for chord recognition and theory display. Does not affect the
// generation system which uses MODES/TRIADS/TETRADS above.

export const ALL_MODES: Record<string, number[]> = {
  // Diatonic (same as MODES)
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],

  // Harmonic Minor family
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  locrianNat6: [0, 1, 3, 5, 6, 9, 10],
  ionianSharp5: [0, 2, 4, 5, 8, 9, 11],
  dorianSharp4: [0, 2, 3, 6, 7, 9, 10],
  phrygianDominant: [0, 1, 4, 5, 7, 8, 10],
  lydianSharp2: [0, 3, 4, 6, 7, 9, 11],
  alteredDiminished: [0, 1, 3, 4, 6, 8, 9],

  // Melodic Minor family
  melodicMinor: [0, 2, 3, 5, 7, 9, 11],
  dorianFlat2: [0, 1, 3, 5, 7, 9, 10],
  lydianAugmented: [0, 2, 4, 6, 8, 9, 11],
  lydianDominant: [0, 2, 4, 6, 7, 9, 10],
  mixolydianFlat6: [0, 2, 4, 5, 7, 8, 10],
  locrianNat2: [0, 2, 3, 5, 6, 8, 10],
  altered: [0, 1, 3, 4, 6, 8, 10],

  // Harmonic Major family
  harmonicMajor: [0, 2, 4, 5, 7, 8, 11],
  dorianFlat5: [0, 2, 3, 5, 6, 9, 10],
  alteredDominantNat5: [0, 1, 3, 4, 7, 8, 10],
  melodicMinorSharp4: [0, 2, 3, 6, 7, 9, 11],
  mixolydianFlat2: [0, 1, 4, 5, 7, 9, 10],
  lydianAugmentedSharp2: [0, 3, 4, 6, 8, 9, 11],
  locrianDoubleFlat7: [0, 1, 3, 5, 6, 8, 9],

  // Double Harmonic family
  doubleHarmonicMajor: [0, 1, 4, 5, 7, 8, 11],
  lydianSharp2Sharp6: [0, 3, 4, 6, 7, 10, 11],
  ultraphrygian: [0, 1, 3, 4, 7, 8, 9],
  doubleHarmonicMinor: [0, 2, 3, 6, 7, 8, 11],
  oriental: [0, 1, 4, 5, 6, 9, 10],
  ionianSharp2Sharp5: [0, 3, 4, 5, 8, 9, 11],
  locrianDoubleFlat3DoubleFlat7: [0, 1, 2, 5, 6, 8, 9],
};

// ── Shared mode display data ─────────────────────────────────────────────
// Used by CircleOfFifths, VocalView pitch correction, and any UI that
// needs to display the 35 modes grouped by family.

/** Display order: brightest → darkest within each family */
export const MODE_GROUPS: { label: string; modes: string[] }[] = [
  {
    label: 'Diatonic',
    modes: [
      'lydian',
      'ionian',
      'mixolydian',
      'dorian',
      'aeolian',
      'phrygian',
      'locrian',
    ],
  },
  {
    label: 'Harmonic Minor',
    modes: [
      'lydianSharp2',
      'ionianSharp5',
      'dorianSharp4',
      'harmonicMinor',
      'phrygianDominant',
      'locrianNat6',
      'alteredDiminished',
    ],
  },
  {
    label: 'Melodic Minor',
    modes: [
      'lydianAugmented',
      'lydianDominant',
      'melodicMinor',
      'mixolydianFlat6',
      'dorianFlat2',
      'locrianNat2',
      'altered',
    ],
  },
  {
    label: 'Harmonic Major',
    modes: [
      'lydianAugmentedSharp2',
      'melodicMinorSharp4',
      'harmonicMajor',
      'mixolydianFlat2',
      'dorianFlat5',
      'alteredDominantNat5',
      'locrianDoubleFlat7',
    ],
  },
  {
    label: 'Double Harmonic',
    modes: [
      'lydianSharp2Sharp6',
      'ionianSharp2Sharp5',
      'doubleHarmonicMinor',
      'doubleHarmonicMajor',
      'oriental',
      'ultraphrygian',
      'locrianDoubleFlat3DoubleFlat7',
    ],
  },
];

/** Human-readable display names for all 35 modes */
export const MODE_DISPLAY: Record<string, string> = {
  ionian: 'Ionian',
  dorian: 'Dorian',
  phrygian: 'Phrygian',
  lydian: 'Lydian',
  mixolydian: 'Mixolydian',
  aeolian: 'Aeolian',
  locrian: 'Locrian',
  harmonicMinor: 'Harmonic Minor',
  locrianNat6: 'Locrian \u266E6',
  ionianSharp5: 'Ionian #5',
  dorianSharp4: 'Dorian #4',
  phrygianDominant: 'Phrygian Dominant',
  lydianSharp2: 'Lydian #2',
  alteredDiminished: 'Altered Diminished',
  melodicMinor: 'Melodic Minor',
  dorianFlat2: 'Dorian \u266D2',
  lydianAugmented: 'Lydian Augmented',
  lydianDominant: 'Lydian Dominant',
  mixolydianFlat6: 'Mixolydian \u266D6',
  locrianNat2: 'Locrian \u266E2',
  altered: 'Altered',
  harmonicMajor: 'Harmonic Major',
  dorianFlat5: 'Dorian \u266D5',
  alteredDominantNat5: 'Altered Dominant \u266E5',
  melodicMinorSharp4: 'Melodic Minor #4',
  mixolydianFlat2: 'Mixolydian \u266D2',
  lydianAugmentedSharp2: 'Lydian Augmented #2',
  locrianDoubleFlat7: 'Locrian \u266D\u266D7',
  doubleHarmonicMajor: 'Double Harmonic Major',
  lydianSharp2Sharp6: 'Lydian #2 #6',
  ultraphrygian: 'Ultraphrygian',
  doubleHarmonicMinor: 'Double Harmonic Minor',
  oriental: 'Oriental',
  ionianSharp2Sharp5: 'Ionian #2 #5',
  locrianDoubleFlat3DoubleFlat7: 'Locrian \u266D\u266D3 \u266D\u266D7',
};

/** Fixed color indices for non-diatonic scale families */
export const FAMILY_COLOR_INDEX: Record<string, number> = {
  'Melodic Minor': 13,
  'Harmonic Minor': 14,
  'Harmonic Major': 15,
  'Double Harmonic': 16,
};

/**
 * Scale-degree order (mode position 0-6) for each family.
 * Used to compute the parent root offset for diatonic color logic.
 * Must stay in scale-degree order, NOT brightness order.
 */
export const FAMILY_DEGREE_ORDER: { label: string; modes: string[] }[] = [
  {
    label: 'Diatonic',
    modes: [
      'ionian',
      'dorian',
      'phrygian',
      'lydian',
      'mixolydian',
      'aeolian',
      'locrian',
    ],
  },
  {
    label: 'Harmonic Minor',
    modes: [
      'harmonicMinor',
      'locrianNat6',
      'ionianSharp5',
      'dorianSharp4',
      'phrygianDominant',
      'lydianSharp2',
      'alteredDiminished',
    ],
  },
  {
    label: 'Melodic Minor',
    modes: [
      'melodicMinor',
      'dorianFlat2',
      'lydianAugmented',
      'lydianDominant',
      'mixolydianFlat6',
      'locrianNat2',
      'altered',
    ],
  },
  {
    label: 'Harmonic Major',
    modes: [
      'harmonicMajor',
      'dorianFlat5',
      'alteredDominantNat5',
      'melodicMinorSharp4',
      'mixolydianFlat2',
      'lydianAugmentedSharp2',
      'locrianDoubleFlat7',
    ],
  },
  {
    label: 'Double Harmonic',
    modes: [
      'doubleHarmonicMajor',
      'lydianSharp2Sharp6',
      'ultraphrygian',
      'doubleHarmonicMinor',
      'oriental',
      'ionianSharp2Sharp5',
      'locrianDoubleFlat3DoubleFlat7',
    ],
  },
];

/** Map each mode key → { familyLabel, position } using scale-degree position */
export const MODE_FAMILY_INFO: Record<
  string,
  { familyLabel: string; position: number }
> = {};
for (const group of FAMILY_DEGREE_ORDER) {
  for (let i = 0; i < group.modes.length; i++) {
    MODE_FAMILY_INFO[group.modes[i]] = {
      familyLabel: group.label,
      position: i,
    };
  }
}
