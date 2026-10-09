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
 * the diminished triad the modal lessons add (Book One never prints one) and
 * the chords of the harmonic, melodic and double harmonic families: the
 * augmented and two ♭5 triads, and six more four-note chords.
 */
export type BookChordQuality =
  | 'maj'
  | 'min'
  | 'dim'
  | 'aug'
  | 'majb5'
  | 'sus2b5'
  | 'maj7'
  | 'min7'
  | 'dom7'
  | 'min7b5'
  | 'dim7'
  | 'minMaj7'
  | 'maj7#5'
  | 'dom7b5'
  | 'min6'
  | 'sus2b5add6';

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

// ── The rest of Theory ────────────────────────────────────────────────────

/** Learn → Theory's families, as its Mode Family filter names them. */
export type GuitarScaleFamily =
  | 'diatonic'
  | 'pentatonic-blues'
  | 'harmonic-minor'
  | 'melodic-minor'
  | 'harmonic-major'
  | 'double-harmonic';

/**
 * The seven-note modes of the harmonic minor, melodic minor, harmonic major
 * and double harmonic scales, by an ASCII engine key: the Theory tile's slug
 * with '#' as 'sharp', '♭' as 'flat' and '𝄫' as 'doubleflat' (and the tile
 * 'mixolydiannat6', whose mode is Mixolydian ♭6, as 'mixolydianflat6').
 */
export type GuitarHeptatonicScale =
  | 'harmonicminor'
  | 'locriannat6'
  | 'ioniansharp5'
  | 'doriansharp4'
  | 'phrygiandominant'
  | 'lydiansharp2'
  | 'altereddiminished'
  | 'melodicminor'
  | 'dorianflat2'
  | 'lydianaugmented'
  | 'lydiandominant'
  | 'mixolydianflat6'
  | 'locriannat2'
  | 'altereddominant'
  | 'harmonicmajor'
  | 'dorianflat5'
  | 'altereddominantnat5'
  | 'melodicminorsharp4'
  | 'mixolydianflat2'
  | 'lydianaugmentedsharp2'
  | 'locriandoubleflat7'
  | 'doubleharmonicmajor'
  | 'lydiansharp2sharp6'
  | 'ultraphrygian'
  | 'doubleharmonicminor'
  | 'oriental'
  | 'ioniansharp2sharp5'
  | 'locriandoubleflat3doubleflat7';

/** The pentatonic and blues scales (five and six notes). */
export type GuitarPentatonicScale =
  | 'majorpentatonic'
  | 'minorpentatonic'
  | 'majorblues'
  | 'minorblues';

export type GuitarExtendedScale = GuitarHeptatonicScale | GuitarPentatonicScale;

/** Every scale guitar Theory can teach: a diatonic mode or one of the rest. */
export type GuitarScaleKey = GuitarMode | GuitarExtendedScale;

/**
 * A key center as lessons, steps and shape ids name it: the book key alone
 * for Ionian ('C', exactly as before modes existed), key and scale otherwise
 * ('D:dorian', 'E:phrygiandominant'). Never an underscore: piano scale ids
 * have them, and every flow is asked for its center.
 */
export type GuitarCenterId =
  | GuitarKeyName
  | `${GuitarKeyName}:${Exclude<GuitarScaleKey, 'ionian'>}`;

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

interface GuitarCenterCommon extends GuitarKeyCenter {
  id: GuitarCenterId;
  tonicPc: number;
  /** The scale's semitone steps from the tonic: 7, or 5-6 for pentatonic/blues. */
  steps: readonly number[];
  /** The scale spelled from its tonic, ASCII accidentals ('Ebb' when due). */
  spelling: readonly string[];
  /** Each note's degree as written: '1', '♭3', '♯4', '𝄫7'. */
  degreeLabels: readonly string[];
  /**
   * The seven-note frame chord degrees count in: the scale itself, or for
   * pentatonic/blues the mode its chords come from (minor pentatonic's ♭VI
   * is degree 6 of Aeolian).
   */
  chordSteps: readonly number[];
  chordSpelling: readonly string[];
  /** A4 first; Dorian and Phrygian have a second (A5). */
  pentatonics: readonly GuitarPentatonic[];
}

/**
 * One key center in one diatonic mode: Book One's key center for Ionian, or
 * one built from the parent major key's Book One shapes (data/guitar/modes).
 */
export interface DiatonicGuitarCenter extends GuitarCenterCommon {
  family: 'diatonic';
  mode: GuitarMode;
  /** The Book One key whose notes (and chord shapes) the mode uses. */
  parentKey: GuitarKeyName;
  /** The tonic's degree in the parent key: 1 Ionian, 2 Dorian … */
  parentDegree: ScaleDegree;
}

/**
 * A key center in one of the other Theory families (data/guitar/scales):
 * its chord boxes and scale position are generated, not borrowed from a book
 * key.
 */
export interface ExtendedGuitarCenter extends GuitarCenterCommon {
  family: Exclude<GuitarScaleFamily, 'diatonic'>;
  mode: GuitarExtendedScale;
  /**
   * The family's first mode this one is played from: D Locrian ♮6 is
   * C harmonic minor from its 2. Null for pentatonic/blues.
   */
  familyParent: {
    scale: GuitarHeptatonicScale;
    /** Spelled, ASCII accidentals. */
    tonic: string;
    tonicPc: number;
    degree: ScaleDegree;
  } | null;
  /** Pentatonic/blues: the chords of its progression; otherwise empty. */
  chords: readonly GuitarChordShape[];
}

/** Every mode-dependent name, root and label is derived from this. */
export type GuitarCenter = DiatonicGuitarCenter | ExtendedGuitarCenter;

export type { GuitarBarre };
