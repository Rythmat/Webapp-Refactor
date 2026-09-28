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

/** Chord qualities as the book's Hybrid Number System abbreviates them. */
export type BookChordQuality =
  | 'maj'
  | 'min'
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

/** A scale diagram: one position, played tonic to tonic. */
export interface GuitarScalePosition {
  id: 'major' | 'pentatonic';
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

export type { GuitarBarre };
