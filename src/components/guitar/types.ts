// ── Guitar diagram components — shared prop types ─────────────────────────
// Book-style chord boxes and scale boxes (vertical, string 6 on the left, as
// The Guitar Atlas draws them) and a horizontal fretboard (string 1 on top,
// lining up with TAB). Colour follows the Atlas rule — keys are colours — so
// the key colour tints a diagram's frame and header, never the finger dots,
// and every state is also told apart by shape, not by colour alone.

import type { ReactNode } from 'react';
import type {
  BookChordQuality,
  GuitarCenterId,
  ScaleDegree,
} from '@/curriculum/data/guitar/types';
import type { LabelMode } from '@/lib/guitar/theory/types';
import type {
  FretPosition,
  GuitarBarre,
  GuitarShapeDiagram,
  GuitarStringNumber,
} from '@/lib/guitar/types';

/** What a chord box's dots say: the book's fingers, or R/3/5/7. */
export type ChordBoxLabelMode = Extract<LabelMode, 'fingers' | 'chordTones'>;
/** What a scale box's dots say. */
export type ScaleBoxLabelMode = Extract<
  LabelMode,
  'fingers' | 'notes' | 'keyNumbers'
>;

/** How a chord or scale box is being used right now. */
export type DiagramState = 'idle' | 'current' | 'done' | 'heard';

/**
 * 'default': the book's look, as the overview, setup and comparison pages
 * draw it. 'lesson': the guitar lesson's quieter look — neutral frame and
 * grid, the key colour only on what is being played now, fixed 12px type,
 * and (chord and scale boxes) two short lines with the rest in an (i).
 */
export type DiagramVariant = 'default' | 'lesson';

/** A dot's state inside a box. Each draws differently (fill, ring, badge). */
export type DiagramDotState = 'idle' | 'next' | 'done' | 'missing' | 'extra';

export interface FretDiagramDot {
  string: GuitarStringNumber;
  fret: number;
  /** Text inside the dot: a finger number, note name or degree. */
  label?: string;
  /** The chord's or scale's root — drawn with a distinct outline. */
  isRoot?: boolean;
  state?: DiagramDotState;
  /**
   * A quality tone (the 3rd or 7th) in chord-tone mode: a thin inner ring,
   * so the notes that make the chord major, minor or dominant stand out.
   */
  ring?: boolean;
  /** Key numbers: a rounded-square chip, so a 1-7 never reads as a finger. */
  chip?: boolean;
}

/** A hairline between two dots, e.g. the two tonics an octave apart. */
export interface DiagramConnector {
  from: FretPosition;
  to: FretPosition;
  /** Printed at the middle of the line, e.g. 'octave'. */
  label: string;
}

/** The book's vertical box: five fret rows, fret numbers down the side. */
export interface FretDiagramProps {
  /** Fret printed on the top row (1 draws the nut). */
  startFret: number;
  /** Rows to draw; the book draws 5. */
  rows?: number;
  /** Strings marked X above the box. */
  muted: readonly GuitarStringNumber[];
  /** Strings marked O above the box. */
  open: readonly GuitarStringNumber[];
  dots: readonly FretDiagramDot[];
  barres?: readonly GuitarBarre[];
  /** Key colour: frame, header and barre accents — not the dots. */
  keyColor: string;
  /** Printed under the box, e.g. the shape string 'X-3-2-0-1-0'. */
  caption?: string;
  /** Printed above the box, e.g. 'D minor 7'. */
  title?: string;
  size?: 'sm' | 'md';
  state?: DiagramState;
  /** Left-handed: geometry mirrored, text still reads normally. */
  mirrored?: boolean;
  /** Text alternative, e.g. 'D major: x x 0 2 3 2, fingers 1 3 2'. */
  ariaLabel: string;
  /**
   * Hollow neck inlays (3, 5, 7, 9, 12, 15) inside a box that starts above
   * fret 1, so a box up the neck reads as that part of the neck.
   */
  inlays?: boolean;
  /** Hairlines between dots (octave connector), drawn under the dots. */
  connectors?: readonly DiagramConnector[];
  /** Dashed hollow outlines where notes are left out (pentatonic 4 and 7). */
  ghosts?: readonly FretPosition[];
  /** More header lines under the title and subtitle (formula, family). */
  headerExtra?: ReactNode;
  /** 'lesson': neutral frame, key-colour frame only when current (default 'default'). */
  variant?: DiagramVariant;
}

/** Tones a chord was missing or had extra, from chord-tone diagnostics. */
export interface ChordDiagnostics {
  missingPcs: readonly number[];
  extraPcs: readonly number[];
  /** One thing to try (the chord-tone rules); shown by the lesson visuals. */
  hint?: string;
  /** Strings the hint points at: their dots are ringed like a missing tone. */
  ringStrings?: readonly GuitarStringNumber[];
}

export interface ChordBoxProps {
  shape: GuitarShapeDiagram;
  /** 'D minor 7' */
  name: string;
  /** Hybrid Number System label, e.g. '2 min7'. */
  hybridLabel?: string;
  rootPc: number;
  keyColor: string;
  /** Finger numbers in the dots (default true). */
  showFingers?: boolean;
  state?: DiagramState;
  size?: 'sm' | 'md';
  mirrored?: boolean;
  /** After a missed strum: ring the dots carrying missing tones, badge extras. */
  diagnostics?: ChordDiagnostics;
  /** "Hear it": plays the exact voicing. Omitted = no button. */
  onHear?: () => void;
  /**
   * The chord's quality. Defaults to `shape.quality` when the shape is a
   * Book One chord shape; without either, the box draws no theory layer
   * (formula, family, chord tones, (i) popover), as before.
   */
  quality?: BookChordQuality;
  /** Degree in the key (defaults to `shape.degree`); needed for the popover notes. */
  degree?: ScaleDegree;
  /**
   * The key center the chord belongs to, 'C' or 'D:dorian' (defaults to the
   * Book One major key whose `degree` has `rootPc` as its root).
   */
  centerId?: GuitarCenterId;
  /**
   * Fingers (the book) or chord tones (R 3 5 7). Defaults to the device
   * setting (useGuitarDisplaySettings.chordBoxLabels). `showFingers: false`
   * still leaves every dot empty.
   */
  labelMode?: ChordBoxLabelMode;
  /** Draw the theory layer when the quality is known (default true). */
  theory?: boolean;
  /**
   * 'lesson': the name and an (i) on one line, the Hybrid label under it,
   * the formula, family, badge, shape and other names in the (i); the box
   * itself plays the chord (default 'default').
   */
  variant?: DiagramVariant;
  /**
   * Each sounding string's chord tone, for a chord with no Book One quality
   * (a song's 7sus4, 13): "Chord tones" labels read these.
   */
  toneLabels?: ReadonlyMap<GuitarStringNumber, string>;
}

/** A note from theoryNotes.ts, resolved, for an (i) popover. */
export interface DiagramInfoNote {
  id: string;
  title: string;
  body: string;
}

export interface ScaleBoxProps {
  /** Positions in playing order, lowest first. */
  playOrder: readonly FretPosition[];
  fretStart: number;
  fretEnd: number;
  unusedStrings: readonly GuitarStringNumber[];
  /** 'C Major Scale' */
  name: string;
  tonicPc: number;
  keyColor: string;
  /** Index into playOrder of the note to play next. */
  activeIndex?: number;
  size?: 'sm' | 'md';
  mirrored?: boolean;
  /**
   * Fingers (one finger per fret), note names, or key numbers (1-7 chips).
   * Omitted: the scale degree in each dot, as before, with no legend layers.
   */
  labelMode?: ScaleBoxLabelMode;
  /** Key-number labels by semitone above the tonic, when a mode's differ. */
  keyNumberLabels?: readonly string[];
  /** A hairline, labelled 'octave', between the low and high tonic. */
  showOctave?: boolean;
  /** Dashed outlines where the pentatonic leaves out notes (4 and 7 in major). */
  ghosts?: readonly FretPosition[];
  /** Notes for an (i) popover beside the box (e.g. 'What is Ionian?'). */
  about?: readonly DiagramInfoNote[];
  /**
   * 'lesson': 'C major scale (i)' over the box and 'Position 7 · finger 1
   * on fret 7' under it (default 'default').
   */
  variant?: DiagramVariant;
}

/**
 * A mark on the horizontal fretboard. Roles, weakest to strongest:
 * context (the book position, faint) < hint (a target not yet due) <
 * next (outline, look-ahead) < target (filled, play now) < done (played
 * right, check) < played (ring) < wrong / missed (✗). When two markers share
 * a spot, the stronger role wins.
 */
export type FretMarkerRole =
  | 'context'
  | 'hint'
  | 'next'
  | 'target'
  | 'done'
  | 'played'
  | 'wrong'
  | 'missed';

export interface FretMarker {
  string: GuitarStringNumber;
  fret: number;
  midi: number;
  /** Note name or degree shown in the marker, and read aloud. */
  label: string;
  role: FretMarkerRole;
  isRoot?: boolean;
  /**
   * Drawn in the marker instead of `label` (a finger, key number or chord
   * tone); `label` is still what is read aloud.
   */
  text?: string;
  /** Read after the label, e.g. 'finger 3', 'flat 3'. */
  spokenText?: string;
}

/** A bracket over two frets of one string, e.g. a half step. */
export interface FretBracket {
  string: GuitarStringNumber;
  fromFret: number;
  toFret: number;
  /** Printed over the bracket: 'H'. */
  label: string;
  /** Read aloud: 'half step'. */
  spoken: string;
}

export interface FretboardProps {
  /** Fret range to draw; fixed for a whole step. */
  window: { min: number; max: number };
  markers: readonly FretMarker[];
  keyColor: string;
  /** Colour for wrong notes (default: the keyboard's wrong-note grey). */
  wrongColor?: string;
  showNoteNames?: boolean;
  height?: number;
  mirrored?: boolean;
  /** Key numbers draw their markers as rounded chips (default 'dot'). */
  labelShape?: 'dot' | 'chip';
  /** Brackets over fret pairs (half steps on A1 with "Show steps"). */
  brackets?: readonly FretBracket[];
  /**
   * 'lesson': no board fill, quieter frets and strings, 12px labels at any
   * height, and the key colour only on the note to play now (default
   * 'default').
   */
  variant?: DiagramVariant;
}
