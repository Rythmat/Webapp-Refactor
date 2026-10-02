// ── The Guitar Atlas: Book One — data shapes ──────────────────────────────
// One GuitarKeyCenter per key of the book (12 key centers, C around the
// circle of fifths to F). Pitch is never stored: every note is a fret on a
// string, and sounding MIDI comes from src/lib/guitar/fretboard.ts. Chord
// names and symbols are derived from key + degree + quality (index.ts), so a
// typo in the book cannot come back through the data.

import type {
  FretPosition,
  GuitarBarre,
  GuitarShapeDiagram,
  GuitarStringNumber,
} from '@/lib/guitar/types';

/** The book's key centers, ASCII spelling, in book order. */
export type GuitarKeyName =
  | 'C'
  | 'G'
  | 'D'
  | 'A'
  | 'E'
  | 'B'
  | 'F#'
  | 'Db'
  | 'Ab'
  | 'Eb'
  | 'Bb'
  | 'F';

/**
 * Chord qualities as the book's Hybrid Number System abbreviates them, plus
 * the diminished triad the modal lessons add (Book One never prints one).
 */
export type BookChordQuality =
  | 'maj'
  | 'min'
  | 'dim'
  | 'maj7'
  | 'min7'
  | 'dom7'
  | 'min7b5';

export type ScaleDegree = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Note values and rests used by the Music Maps. */
export type MusicMapRhythm =
  | 'whole'
  | 'dotted-half'
  | 'half'
  | 'dotted-quarter'
  | 'quarter'
  | 'eighth'
  | 'half-rest'
  | 'quarter-rest'
  | 'eighth-rest';

/**
 * Which of a center's scale diagrams a step plays: 'major' is the center's
 * 7-note scale (the major scale in Book One, the mode's scale otherwise),
 * 'pentatonic' its pentatonic and 'pentatonic2' a mode's second pentatonic.
 */
export type GuitarScaleSlot = 'major' | 'pentatonic' | 'pentatonic2';

/** A scale diagram: one position, played tonic to tonic. */
export interface GuitarScalePosition {
  id: GuitarScaleSlot;
  /** Fret printed on the diagram's top row. */
  fretStart: number;
  fretEnd: number;
  /** Strings marked X above the diagram. */
  unusedStrings: readonly GuitarStringNumber[];
  /** The notes in playing order, lowest first. */
  playOrder: readonly FretPosition[];
}

/** A chord box from a Root Position Triads or 7th Chords page. */
export interface GuitarChordShape extends GuitarShapeDiagram {
  degree: ScaleDegree;
  quality: BookChordQuality;
  /** The closing "1" box on the 7th-chord page, an octave above box 1. */
  isOctaveRepeat?: true;
  /** Book errata this shape corrects (bookOneErrata.ts). */
  erratumIds?: readonly string[];
  /** A modal center's shape: the Book One shape it was taken from. */
  sourceShapeId?: string;
}

/** One bar of a Music Map: a chord, the voicing drawn, and its rhythm. */
export interface MusicMapBar extends GuitarShapeDiagram {
  degree: ScaleDegree;
  quality: BookChordQuality;
  rhythm: readonly MusicMapRhythm[];
  erratumIds?: readonly string[];
}

export interface GuitarMusicMap {
  /** Examples 1-3 use triads, 4-5 use 7th chords. */
  example: 1 | 2 | 3 | 4 | 5;
  bars: readonly MusicMapBar[];
  /** The book prints repeat signs around every map. */
  repeat: boolean;
  erratumIds?: readonly string[];
}

export interface GuitarKeyCenter {
  key: GuitarKeyName;
  /** Display spelling with accidentals, e.g. 'F♯', 'D♭'. */
  displayName: string;
  source: { pdfPages: readonly [number, number] };
  signatureText: string;
  /** Scale spelling as the book prints it, ASCII accidentals. */
  scaleNotes: readonly string[];
  pentatonicNotes: readonly string[];
  majorScale: GuitarScalePosition;
  pentatonic: GuitarScalePosition;
  /** Root Position Triads, degrees 1-6. */
  triads: readonly GuitarChordShape[];
  /** Root Position 7th Chords, degrees 1-7 then 1 again. */
  sevenths: readonly GuitarChordShape[];
  /** Music Maps, Examples 1-5. */
  musicMaps: readonly GuitarMusicMap[];
}

// ── Modes ─────────────────────────────────────────────────────────────────

/** The diatonic modes guitar Theory teaches, Ionian being Book One. */
export type GuitarMode =
  | 'ionian'
  | 'dorian'
  | 'phrygian'
  | 'lydian'
  | 'mixolydian'
  | 'aeolian'
  | 'locrian';

export type GuitarModalMode = Exclude<GuitarMode, 'ionian'>;

/**
 * A key center as lessons, steps and shape ids name it: the book key alone
 * for Ionian ('C', exactly as before modes existed), key and mode otherwise
 * ('D:dorian').
 */
export type GuitarCenterId =
  | GuitarKeyName
  | `${GuitarKeyName}:${GuitarModalMode}`;

/** A pentatonic a center teaches (A4, and A5 for a second one). */
export interface GuitarPentatonic {
  /** 'Major Pentatonic', 'Dorian Pentatonic (1 ♭3 4 5 6)'. */
  name: string;
  /** The center's scale degrees it uses, from the note it starts on. */
  degrees: readonly ScaleDegree[];
  position: GuitarScalePosition;
  /** Spelled in the center, ASCII accidentals, from its first note. */
  notes: readonly string[];
}

/**
 * One key center in one mode: Book One's key center for Ionian, or one built
 * from the parent major key's Book One shapes (data/guitar/modes). Every
 * mode-dependent name, root and label is derived from this.
 */
export interface GuitarCenter extends GuitarKeyCenter {
  id: GuitarCenterId;
  mode: GuitarMode;
  tonicPc: number;
  /** The mode's semitone steps from the tonic, 7 of them. */
  steps: readonly number[];
  /** The mode spelled from its tonic, ASCII accidentals ('Ebb' when due). */
  spelling: readonly string[];
  /** The Book One key whose notes (and chord shapes) the mode uses. */
  parentKey: GuitarKeyName;
  /** The tonic's degree in the parent key: 1 Ionian, 2 Dorian … */
  parentDegree: ScaleDegree;
  /** A4 first; Dorian and Phrygian have a second (A5). */
  pentatonics: readonly GuitarPentatonic[];
}

export type { GuitarBarre };
