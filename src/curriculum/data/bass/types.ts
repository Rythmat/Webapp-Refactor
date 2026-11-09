// ── The Bass Atlas: Book One — data shapes ────────────────────────────────
// A bass key center is a guitar key center (data/guitar) played on bass: the
// same id, scale, spelling, chords and Music Maps, with bass positions. Its
// theory is never copied — `theory` is the guitar center itself — so the two
// instruments can't disagree about a key. Positions are on BASS (string 4 is
// the low E), and every pitch comes from fretToMidi(position, BASS).

import type {
  BookChordQuality,
  GuitarCenter,
  GuitarCenterId,
  MusicMapRhythm,
  ScaleDegree,
} from '@/curriculum/data/guitar/types';
import type { FretPosition, GuitarStringNumber } from '@/lib/guitar/types';

/** The strings a bass box starts on: 4 is E ('6th' in the book's files), 3 is A ('5th'). */
export type BassRootString = 3 | 4;

/** One box as the book draws it: frets, unused strings and the notes in play order. */
export interface BassBox {
  /** Fret printed on the box's top row. */
  fretStart: number;
  fretEnd: number;
  /** Strings marked X above the box. */
  unusedStrings: readonly GuitarStringNumber[];
  /** The notes in playing order, lowest first. */
  playOrder: readonly FretPosition[];
}

/** A scale box: the center's 7-note scale, or one of its pentatonics. */
export interface BassScaleBox extends BassBox {
  /** 'Major Pentatonic', 'Dorian Pentatonic (1 ♭3 4 5 6)': the guitar center's names. */
  name: string;
  /** The pitch class the box runs from and to. */
  tonicPc: number;
}

/** An arpeggio box: a chord's tones from its root, R 3 5 (7). */
export interface BassArpeggio extends BassBox {
  degree: ScaleDegree;
  quality: BookChordQuality;
  rootPc: number;
  rootString: BassRootString;
  /** The closing '1' on the 7th-arpeggio page. */
  isOctaveRepeat?: true;
}

export interface BassMusicMapBar {
  degree: ScaleDegree;
  quality: BookChordQuality;
  rhythm: readonly MusicMapRhythm[];
  arpeggio: BassArpeggio;
}

export interface BassMusicMap {
  example: 1 | 2 | 3 | 4 | 5;
  repeat: boolean;
  bars: readonly BassMusicMapBar[];
}

export interface BassCenter {
  id: GuitarCenterId;
  /** The key center's theory: names, spelling, steps, chord frame. */
  theory: GuitarCenter;
  /** Where the tonic sits for the pentatonic and the arpeggios. */
  home: { string: BassRootString; fret: number };
  /** The center's 7-note scale (or its pentatonic/blues scale). */
  scale: BassScaleBox;
  /** One per guitar pentatonic (A4, and A5 where a mode has two). */
  pentatonics: readonly BassScaleBox[];
  /** The triad page: the guitar center's triads, in its order. */
  triads: readonly BassArpeggio[];
  /** The 7th page: degrees 1-7, then 1 again. */
  sevenths: readonly BassArpeggio[];
  /** Pentatonic/blues: the chords of its progression; empty otherwise. */
  chords: readonly BassArpeggio[];
  musicMaps: readonly BassMusicMap[];
}
