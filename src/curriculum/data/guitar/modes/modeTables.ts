// ── Guitar modes: tables ──────────────────────────────────────────────────
// What each mode is made of, in one place to read and edit: its steps, the
// pentatonics its A4 (and A5) chapters teach, and its characteristic note
// and chord. The key centers are built from these (index.ts).

import type { GuitarMode, GuitarModalMode, ScaleDegree } from '../types';

/** Semitones above the tonic of each degree. */
export const MODE_STEPS: Readonly<Record<GuitarMode, readonly number[]>> = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
};

/** The degree of the parent major scale each mode starts on, less one. */
export const MODE_INDEX: Readonly<Record<GuitarMode, number>> = {
  ionian: 0,
  dorian: 1,
  phrygian: 2,
  lydian: 3,
  mixolydian: 4,
  aeolian: 5,
  locrian: 6,
};

export interface PentatonicSpec {
  /** Named for the chapter: 'A4: Dorian Pentatonic (1 ♭3 4 5 6)'. */
  name: string;
  /** Degrees of the mode, from the note the scale starts on. */
  degrees: readonly ScaleDegree[];
}

/**
 * The pentatonics each mode teaches. Some are the mode's own five degrees,
 * some a major or minor pentatonic laid over it: Lydian's is the major
 * pentatonic a whole step above the root, played from its 2.
 */
export const MODE_PENTATONICS: Readonly<
  Record<GuitarModalMode, readonly PentatonicSpec[]>
> = {
  dorian: [
    { name: 'Dorian Pentatonic (1 ♭3 4 5 6)', degrees: [1, 3, 4, 5, 6] },
    { name: 'Dorian Pentatonic (1 2 ♭3 5 6)', degrees: [1, 2, 3, 5, 6] },
  ],
  phrygian: [
    { name: 'Phrygian Pentatonic (1 ♭2 4 5 ♭7)', degrees: [1, 2, 4, 5, 7] },
    { name: 'Minor Pentatonic', degrees: [1, 3, 4, 5, 7] },
  ],
  lydian: [
    {
      name: 'Lydian Pentatonic (Major Pentatonic from 2)',
      degrees: [2, 3, 4, 6, 7],
    },
  ],
  mixolydian: [
    { name: 'Mixolydian Pentatonic (1 3 4 5 ♭7)', degrees: [1, 3, 4, 5, 7] },
  ],
  aeolian: [{ name: 'Minor Pentatonic', degrees: [1, 3, 4, 5, 7] }],
  locrian: [
    { name: 'Locrian Pentatonic (1 ♭2 4 ♭5 ♭7)', degrees: [1, 2, 4, 5, 7] },
  ],
};

/** The note that sets each mode apart from major or minor. */
export const COLOUR_DEGREE: Readonly<Record<GuitarModalMode, ScaleDegree>> = {
  dorian: 6,
  phrygian: 2,
  lydian: 4,
  mixolydian: 7,
  aeolian: 6,
  locrian: 5,
};

/**
 * The chord that carries the colour note (never the diminished one): the
 * second chord of the two-chord drills and the mode's vamps.
 */
export const COLOUR_CHORD: Readonly<Record<GuitarModalMode, ScaleDegree>> = {
  dorian: 4,
  phrygian: 2,
  lydian: 2,
  mixolydian: 7,
  aeolian: 6,
  locrian: 2,
};
