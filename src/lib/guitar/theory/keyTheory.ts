// ── Key-level theory ───────────────────────────────────────────────────────
// The chord family of a major key, what each chord does, and how each book
// key differs from the one before it. Spellings come from the key
// (keyScaleSpelling), never from a fixed sharps table.

import {
  GUITAR_KEY_ORDER,
  MAJOR_SCALE_STEPS,
  keyPitchClass,
  keyScaleSpelling,
} from '@/curriculum/data/guitar/bookOne';
import {
  degreeAccidental,
  diatonicTriads,
} from '@/curriculum/data/guitar/centers';
import type {
  BookChordQuality,
  GuitarCenter,
  GuitarKeyCenter,
  GuitarKeyName,
} from '@/curriculum/data/guitar/types';
import type { DiatonicQuality, FunctionGroup, KeyDegree } from './types';

/** Triads on degrees 1-7. Book One teaches 1-6; 7 comes back as min7(♭5). */
export const DIATONIC_TRIADS: readonly DiatonicQuality[] = [
  'maj',
  'min',
  'min',
  'maj',
  'maj',
  'min',
  'dim',
];

export const DIATONIC_SEVENTHS: readonly BookChordQuality[] = [
  'maj7',
  'min7',
  'min7',
  'maj7',
  'dom7',
  'min7',
  'min7b5',
];

export const FUNCTION_OF_DEGREE: Readonly<Record<KeyDegree, FunctionGroup>> = {
  1: 'home',
  3: 'home',
  6: 'home',
  2: 'away',
  4: 'away',
  5: 'tension',
  7: 'tension',
};

/** Its relative minor: the same notes, starting on degree 6. */
export function relativeMinor(center: GuitarKeyCenter): string {
  return center.scaleNotes[5];
}

/** The key before this one in book order (around the circle of fifths). */
export function previousBookKey(key: GuitarKeyName): GuitarKeyName | null {
  const i = GUITAR_KEY_ORDER.indexOf(key);
  return i > 0 ? GUITAR_KEY_ORDER[i - 1] : null;
}

export interface KeyChange {
  removedPc: number;
  addedPc: number;
  /** The removed note, spelled in the previous key. */
  oldNote: string;
  /** The added note, spelled in this key. */
  newNote: string;
  /** Notes both keys share take new names (F♯ → D♭ only). */
  respelled: boolean;
}

function scalePcs(key: GuitarKeyName): number[] {
  return MAJOR_SCALE_STEPS.map((s) => (keyPitchClass(key) + s) % 12);
}

/**
 * The one note that changes between neighbouring keys. Null when the keys
 * differ by more than one note.
 */
export function keyChange(
  prev: GuitarKeyName,
  cur: GuitarKeyName,
): KeyChange | null {
  const before = scalePcs(prev);
  const after = scalePcs(cur);
  const removed = before.filter((pc) => !after.includes(pc));
  const added = after.filter((pc) => !before.includes(pc));
  if (removed.length !== 1 || added.length !== 1) return null;
  const beforeNames = keyScaleSpelling(prev);
  const afterNames = keyScaleSpelling(cur);
  const respelled = before.some((pc, i) => {
    const j = after.indexOf(pc);
    return j >= 0 && afterNames[j] !== beforeNames[i];
  });
  return {
    removedPc: removed[0],
    addedPc: added[0],
    oldNote: beforeNames[before.indexOf(removed[0])],
    newNote: afterNames[after.indexOf(added[0])],
    respelled,
  };
}

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

const ROMAN_SUFFIX: Readonly<Record<DiatonicQuality, string>> = {
  maj: '',
  min: '',
  maj7: 'maj7',
  dom7: '7',
  min7: '7',
  min7b5: 'ø7',
  dim: '°',
  aug: '+',
  majb5: '(♭5)',
  sus2b5: 'sus2(♭5)',
  dim7: '°7',
  minMaj7: '(maj7)',
  'maj7#5': '+maj7',
  dom7b5: '7♭5',
  min6: '6',
  sus2b5add6: 'sus2(♭5)add6',
};

/** Uppercase numerals: chords with a major 3rd, and the sus2(♭5) chords. */
const UPPER_CASE: ReadonlySet<DiatonicQuality> = new Set<DiatonicQuality>([
  'maj',
  'aug',
  'majb5',
  'sus2b5',
  'maj7',
  'dom7',
  'maj7#5',
  'dom7b5',
  'sus2b5add6',
]);

/**
 * Uppercase for major-type chords, lowercase for minor-type: ii7, viiø7. In a
 * mode, a degree that differs from major takes its accidental: Dorian's 3 is
 * ♭III.
 */
export function romanNumeral(
  center: GuitarCenter,
  degree: KeyDegree,
  quality: DiatonicQuality,
): string {
  const numeral = NUMERALS[degree - 1];
  const major = UPPER_CASE.has(quality);
  const accidental = degreeAccidental(center, degree);
  return `${accidental}${major ? numeral : numeral.toLowerCase()}${ROMAN_SUFFIX[quality]}`;
}

/** Other ways charts write the chord. Dom7 has none (it uses `aliases.dom7`). */
export function chordAliases(
  root: string,
  quality: BookChordQuality,
): string[] {
  const suffixes: Record<BookChordQuality, string[]> = {
    maj: ['maj', 'M'],
    min: ['min', '−'],
    dim: ['°', 'o'],
    maj7: ['M7', 'Δ7', 'Δ'],
    min7: ['min7', '−7'],
    min7b5: ['ø7', 'ø', '−7♭5', 'min7(♭5)'],
    dom7: [],
    aug: ['+', '(♯5)'],
    majb5: ['(♭5)'],
    sus2b5: [],
    dim7: ['°7', 'o7'],
    minMaj7: ['−(maj7)', 'mΔ7', 'min(maj7)'],
    'maj7#5': ['+maj7', 'Δ7(♯5)', 'maj7(♯5)'],
    dom7b5: ['7(♭5)'],
    min6: ['−6', 'min6'],
    sus2b5add6: [],
  };
  return suffixes[quality].map((suffix) => `${root}${suffix}`);
}

/**
 * The triad left when a 7th chord loses its root: the triad two degrees up
 * (Cmaj7 without C = E minor, chord 3). In Book One null on 5, whose leftover
 * triad is diminished and not taught; the modes teach every triad.
 */
export function hiddenTriad(
  center: GuitarCenter,
  degree: KeyDegree,
): { degree: KeyDegree; quality: BookChordQuality } | null {
  const hidden = (((degree + 1) % 7) + 1) as KeyDegree;
  const quality = diatonicTriads(center)[hidden - 1];
  return quality === 'dim' && center.mode === 'ionian'
    ? null
    : { degree: hidden, quality };
}
