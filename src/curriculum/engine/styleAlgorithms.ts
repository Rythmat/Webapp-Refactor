/**
 * Phase 12 — Style Algorithms.
 *
 * 13 genre-based style algorithms for filtering progressions by genre
 * characteristics. Each style defines chord quality preferences and
 * harmonic patterns typical of the genre.
 *
 * Source: Algorithms_Scales.md
 */

import type { ChordProgressionEntry } from '../data/chordProgressionLibrary';
import type { StyleTag } from '../types/progression';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StyleAlgorithmDef {
  genre: StyleTag;
  /** Chord qualities typical of this genre */
  typicalQualities: string[];
  /** Qualities rarely/never used in this genre */
  avoidQualities: string[];
  /** Primary modes/scales for this genre */
  primaryModes: string[];
  /** Secondary modes/scales for this genre */
  secondaryModes: string[];
}

// ---------------------------------------------------------------------------
// Algorithm definitions
// ---------------------------------------------------------------------------

export const STYLE_ALGORITHMS: Record<StyleTag, StyleAlgorithmDef> = {
  jazz: {
    genre: 'jazz',
    typicalQualities: [
      'major7',
      'minor7',
      'dominant7',
      'diminished7',
      'minor7b5',
      'dominant9',
      'minor9',
      'major9',
      'dominant13',
    ],
    avoidQualities: ['power'],
    primaryModes: ['dorian', 'mixolydian', 'ionian', 'bebopDominant'],
    secondaryModes: ['lydian', 'alteredDominant', 'lydianDominant', 'blues'],
  },
  rock: {
    genre: 'rock',
    typicalQualities: ['major', 'minor', 'power', 'sus4', 'dominant7'],
    avoidQualities: ['major7#11', 'dominant13', 'minor11'],
    primaryModes: ['pentatonicMinor', 'pentatonicMajor', 'aeolian', 'blues'],
    secondaryModes: ['ionian', 'mixolydian', 'dorian'],
  },
  folk: {
    genre: 'folk',
    typicalQualities: ['major', 'minor', 'sus2', 'sus4', 'add2', 'add4'],
    avoidQualities: ['dominant7#9', 'diminished7', 'dominant13'],
    primaryModes: ['ionian', 'mixolydian', 'dorian'],
    secondaryModes: ['aeolian', 'lydian'],
  },
  funk: {
    genre: 'funk',
    typicalQualities: ['minor7', 'dominant7', 'dominant9', 'dominant7#9'],
    avoidQualities: ['major7#11', 'diminished7'],
    primaryModes: ['dorian', 'mixolydian', 'blues', 'pentatonicMinor'],
    secondaryModes: ['aeolian'],
  },
  'r&b': {
    genre: 'r&b',
    typicalQualities: [
      'major7',
      'minor7',
      'dominant7',
      'dominant7#5',
      'dominant7sus4',
      'major9',
      'minor9',
    ],
    avoidQualities: ['power'],
    primaryModes: ['dorian', 'aeolian', 'mixolydian', 'ionian'],
    secondaryModes: ['lydian', 'pentatonicMinor'],
  },
  'neo-soul': {
    genre: 'neo-soul',
    typicalQualities: [
      'minor9',
      'major9',
      'minor11',
      'minor7',
      'major7',
      'dominant9',
    ],
    avoidQualities: ['power'],
    primaryModes: ['dorian', 'aeolian', 'mixolydian'],
    secondaryModes: ['lydian', 'pentatonicMinor', 'blues'],
  },
  'jam band': {
    genre: 'jam band',
    typicalQualities: ['major', 'minor', 'minor7', 'dominant7', 'sus4'],
    avoidQualities: [],
    primaryModes: ['ionian', 'dorian', 'mixolydian'],
    secondaryModes: ['pentatonicMajor', 'pentatonicMinor', 'blues', 'aeolian'],
  },
  pop: {
    genre: 'pop',
    typicalQualities: ['major', 'minor', 'add2', 'sus2', 'add4', 'sus4'],
    avoidQualities: ['diminished7', 'minor7b5', 'dominant7#9'],
    primaryModes: ['ionian', 'aeolian'],
    secondaryModes: ['mixolydian', 'dorian'],
  },
  'hip hop': {
    genre: 'hip hop',
    typicalQualities: ['minor', 'minor7', 'power'],
    avoidQualities: ['major7#11', 'dominant13'],
    primaryModes: ['aeolian', 'pentatonicMinor', 'dorian'],
    secondaryModes: ['phrygian', 'blues'],
  },
  electronic: {
    genre: 'electronic',
    typicalQualities: ['minor', 'minor7', 'major', 'sus2', 'sus4'],
    avoidQualities: [],
    primaryModes: ['aeolian', 'dorian', 'pentatonicMinor'],
    secondaryModes: ['ionian', 'lydian', 'phrygian'],
  },
  latin: {
    genre: 'latin',
    typicalQualities: ['major', 'minor', 'dominant7', 'minor7'],
    avoidQualities: [],
    primaryModes: ['ionian', 'aeolian', 'dorian', 'mixolydian'],
    secondaryModes: ['phrygian', 'pentatonicMinor'],
  },
  african: {
    genre: 'african',
    typicalQualities: ['major', 'minor', 'sus4'],
    avoidQualities: [],
    primaryModes: ['pentatonicMajor', 'pentatonicMinor', 'ionian', 'dorian'],
    secondaryModes: ['aeolian', 'mixolydian'],
  },
  reggae: {
    genre: 'reggae',
    typicalQualities: ['major', 'minor', 'dominant7', 'minor7'],
    avoidQualities: ['diminished7', 'major7#11'],
    primaryModes: ['ionian', 'aeolian', 'dorian', 'mixolydian'],
    secondaryModes: ['pentatonicMinor', 'blues'],
  },
  blues: {
    genre: 'blues',
    typicalQualities: ['dominant7', 'dominant9', 'minor7', 'dominant7#9'],
    avoidQualities: ['major7#11'],
    primaryModes: ['blues', 'pentatonicMinor', 'mixolydian', 'dorian'],
    secondaryModes: ['aeolian', 'alteredDominant'],
  },
};

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

/**
 * Filter progressions by style (genre) tag.
 * Returns progressions that have the style in their styles array.
 */
export function filterProgressionsByStyle(
  progressions: ChordProgressionEntry[],
  styleTag: StyleTag,
): ChordProgressionEntry[] {
  return progressions.filter((p) => p.styles.includes(styleTag));
}

/**
 * Get all modes (primary + secondary) for a style.
 */
export function getModesForStyle(styleTag: StyleTag): string[] {
  const style = STYLE_ALGORITHMS[styleTag];
  return [...style.primaryModes, ...style.secondaryModes];
}

/**
 * Get primary modes only for a style.
 */
export function getPrimaryModesForStyle(styleTag: StyleTag): string[] {
  return STYLE_ALGORITHMS[styleTag].primaryModes;
}
