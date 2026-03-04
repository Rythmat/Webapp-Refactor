import type { RGB, ColorIndex, ModeName } from '../types';

export const KEY_COLORS: Record<ColorIndex, RGB> = {
  0: [255, 255, 255],   // OTHER
  1: [210, 64, 74],     // C
  2: [255, 115, 72],    // G
  3: [254, 169, 42],    // D
  4: [255, 203, 48],    // A
  5: [174, 213, 128],   // E
  6: [127, 199, 131],   // B
  7: [40, 166, 154],    // F#
  8: [98, 180, 247],    // Db
  9: [120, 133, 203],   // Ab
  10: [157, 127, 206],  // Eb
  11: [199, 133, 211],  // Bb
  12: [248, 168, 197],  // F
  13: [205, 165, 85],   // Melodic Minor — warm amber
  14: [175, 75, 100],   // Harmonic Minor — deep rose
  15: [115, 145, 195],  // Harmonic Major — steel blue
  16: [80, 160, 130],   // Double Harmonic — sage emerald
};

/** Circle of fifths order (index 1=C, 2=G, ..., 12=F) */
export const KEYS: string[] = [
  'XXX', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F',
];

/** Maps degree-qualified chord names to color indices */
export const CHORD_COLORS: Record<string, ColorIndex> = {
  '1 major': 1,
  '1 major/3': 1,
  '1 major/4': 1,
  '1 major/5': 1,
  '1 major/6': 1,
  '1 major7': 1,
  '1 major7/5': 1,
  '1 major7/6': 1,
  '1 major9': 1,
  '1 dominant7': 12,
  '1 dominant9': 12,
  '1 sus13': 12,
  '#1 diminished': 14,
  '#1 diminished7': 14,
  'b2 diminished': 14,
  'b2 major7': 9,
  'b2 major9': 9,
  'b2 major7#11': 15,
  'b2 dominant7': 7,
  'b2 dominant7#11': 13,  // Melodic Minor — Lydian Dominant area
  '2 minor': 1,
  '2 major': 2,
  '2 dominant7': 2,
  '2 add2': 2,
  '2 major7': 3,
  '2 dominant9': 2,
  '2 minor7b5': 10,
  '2 minor7': 1,
  '2 minor9': 1,
  '2 minor11': 1,
  '#2 diminished': 14,
  '#2 diminished7': 14,
  'b3 diminished': 14,
  'b3 diminished7': 14,
  'b3 major7': 10,
  'b3 dominant7': 9,
  '3 minor': 1,
  '3 minor7': 1,
  '3 dominant7': 5,
  '3 dominant7b9': 14,
  '3 dominant7#5': 13,
  '3 major': 5,
  '4 major7': 1,
  '4 major/1': 1,
  '4 minor': 10,
  '4 minor6': 15,          // Harmonic Major
  '4 minor6/b3': 15,      // Harmonic Major
  '4 minor6/5': 15,       // Harmonic Major
  '4 minor7': 10,
  '4 minormajor7': 14,
  '4 major': 1,
  '4 major9': 1,
  '4 major7#11': 1,
  '4 dominant7': 11,
  '4 dominant7sus4': 11,
  '#4 minor7b5': 13,
  '#4 diminished': 14,
  '#4 diminished7': 14,
  'b5 minor7b5': 2,
  'b5 major7': 8,
  'b5 dominant7#11': 13,  // Melodic Minor
  'b5 dominant7sus4': 6,
  'b5 dominant7b5': 13,  // Melodic Minor
  '5 major': 1,
  '5 add2': 1,
  '5 dominant7': 1,
  '5 dominant7#5': 14,
  '5 sus7': 1,
  '5 sus4': 1,
  '5 minor7': 12,
  '5 major7': 3,
  '5 major/7': 3,
  '5 dominant7sus4': 1,
  '5 dominant7b9': 14,
  '5 sus13': 1,
  '#5 diminished7': 14,
  '#5 diminished': 4,
  'b6 major': 10,
  'b6 major7': 10,
  'b6 major9': 10,
  'b6 dominant7': 8,
  'b6 dominant7#5': 13,  // Melodic Minor
  '6 minor': 1,
  '6 dominant7': 3,
  '6 dominant7sus4': 3,
  '6 dominant7#5': 13,  // Melodic Minor
  '6 major': 3,
  '6 major7': 4,
  '6 minor7': 1,
  '6 minor9': 1,
  '6 minor11': 1,
  'b7 major': 12,
  'b7 major7': 12,
  'b7 dominant7': 10,
  'b7dominant7#11': 13,
  'b7 dominant7sus4': 10,
  'b7 dominant7#11': 13,
  'b7 minor6': 14,          // Harmonic Minor
  '7 minor7b5': 1,
  '7 diminished7': 14,      // Harmonic Minor
  '7 major7': 7,
  '7 dominant7#5': 13,
};

/** Maps color index to the session key's mode (what mode the key is "in" when this chord is played) */
export const COLOR_TO_MODE: Record<ColorIndex, ModeName> = {
  1: 'ionian',
  2: 'lydian',
  4: 'locrian',
  8: 'locrian',
  9: 'phrygian',
  10: 'aeolian',
  11: 'dorian',
  12: 'mixolydian',
  13: 'melodicMinor',
  14: 'harmonicMinor',
  15: 'harmonicMajor',
  16: 'doubleHarmonicMajor',
};

/** Maps extended chord qualities to their base quality for color inheritance */
export const QUALITY_FALLBACK: Record<string, string> = {
  'major9':          'major7',
  'minor9':          'minor7',
  'minor7b9':        'minor7',
  'minormajor9':     'minormajor7',
  'major9#5':        'major7#5',
  'diminished7b9':   'diminished7',
  'minor7b5b9':      'minor7b5',
  'major7#9':        'major7',
  'dominant7#5b9':   'dominant7#5',
  'dominant9#5':     'dominant7#5',
  'minor9b5':        'minor7b5',
  'dominant7#9':     'dominant7',
  'dominant7#5#9':   'dominant7#5',
  'major7#5#9':      'major7#5',
  'minor6add9':      'minor6',
  'major6add9':      'major6',
  'diminishedmajor7':'diminished7',
};
