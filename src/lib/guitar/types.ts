// ── Guitar primitives ──────────────────────────────────────────────────────
// Shared by the Guitar Atlas data, the TAB and diagram components and the
// guitar evaluator. Strings are numbered the way the book and VexFlow number
// them: 1 is the high E, 6 is the low E.

export type GuitarStringNumber = 1 | 2 | 3 | 4 | 5 | 6;

/** Where a note is played: a string and a fret (0 = open). */
export interface FretPosition {
  string: GuitarStringNumber;
  fret: number;
}

/** One string of a chord shape: a fret, 0 for open, or null for muted (X). */
export type ShapeFret = number | null;

export type FingerNumber = 1 | 2 | 3 | 4;

/** A fretting-hand finger on one string (1 = index … 4 = pinky). */
export interface GuitarFingerPlacement {
  finger: FingerNumber;
  string: GuitarStringNumber;
  fret: number;
}

/** One finger laid across several adjacent strings at one fret. */
export interface GuitarBarre {
  fret: number;
  /** Lowest-pitched string the barre covers (the larger number). */
  fromString: GuitarStringNumber;
  /** Highest-pitched string the barre covers (the smaller number). */
  toString: GuitarStringNumber;
  finger: FingerNumber;
}

/**
 * A chord diagram as the book draws it.
 *
 * `frets` is the book's shape string, written from string 6 to string 1
 * (`'X-3-2-0-1-0'` is open C). `diagramStartFret` is the fret printed on the
 * top row of the five-row box.
 */
export interface GuitarShapeDiagram {
  frets: string;
  diagramStartFret: number;
  /** Empty when the book gives no fingering for this voicing. */
  fingering: readonly GuitarFingerPlacement[];
  barre?: GuitarBarre;
}
