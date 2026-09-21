import type { DrumNotehead } from './drumMap';

// ── Notation engine types ──────────────────────────────────────────────────
// Piano-roll notes in, a grand-staff score out. The score is renderer-neutral:
// every item already knows its written duration, ties, tuplet and which
// accidentals to show, so a renderer only has to draw it.

export type StaffId = 'treble' | 'bass' | 'percussion';

/** One piano-roll note. Ticks are absolute; `originTick` marks bar 1. */
export interface NotationNoteInput {
  id: string;
  midi: number;
  startTick: number;
  durationTicks: number;
  /** Spelled name ("B♭4", "F#3", "Cb5"). Spelled from `spell` when absent. */
  name?: string;
  /** Force a staff (lessons tag hands); otherwise split at `splitMidi`. */
  staff?: StaffId;
  /** Write this note as a rhythmic slash rather than at its pitch. */
  slash?: boolean;
}

export interface NotationOptions {
  /** Ticks per quarter note. Learn and Studio both use 480. */
  ticksPerQuarter?: number;
  /** [numerator, denominator]; default 4/4. */
  timeSignature?: [number, number];
  /** Tick where measure 1 begins (default 0). */
  originTick?: number;
  /** Render at least this many measures (a lesson's full length). */
  minMeasures?: number;
  /** Number printed on the first measure (Studio clips start mid-song). */
  firstMeasureNumber?: number;
  /** Key signature as a count of fifths (−7 … 7). Inferred when absent. */
  keyFifths?: number;
  /** Tonic pitch class; breaks ties when inferring the key signature. */
  keyTonicPc?: number;
  /** Lowest MIDI note on the treble staff when a note has no `staff` (C4). */
  splitMidi?: number;
  /**
   * Staves to write on: a grand staff (default), one staff for a part that
   * belongs in a single clef — a bass line, a horn, a melody — or a drumset
   * staff, where notes are placed by instrument instead of by pitch.
   */
  staves?: 'grand' | 'treble' | 'bass' | 'percussion';
  /** Names notes that come without one. */
  spell?: (midi: number) => string;
}

export type Accidental = 'bb' | 'b' | 'n' | '#' | '##';

export interface NotationKey {
  midi: number;
  /** 'c' … 'b' */
  letter: string;
  /** −2 … 2 */
  alteration: number;
  /** Octave of the written letter (C♭5 is MIDI 71). */
  octave: number;
  /** Accidental to print, or null when the key signature / bar covers it. */
  accidental: Accidental | null;
  noteId: string;
  /** Notehead shape — cymbals take a cross on a drumset staff. */
  notehead?: DrumNotehead;
  /** Printed above the note: the o of an open hi-hat. */
  articulation?: 'open';
  /** Instrument name on a drumset staff, for tooltips and tests. */
  drumLabel?: string;
  /** Written as a rhythmic slash on the middle line. */
  slash?: boolean;
}

/** Written note values, VexFlow-style: 'w' 'h' 'q' '8' '16' '32'. */
export type NoteValue = 'w' | 'h' | 'q' | '8' | '16' | '32';

export interface NotationItem {
  kind: 'note' | 'rest';
  startTick: number;
  durationTicks: number;
  value: NoteValue;
  dots: 0 | 1;
  /** Part of an eighth-note triplet group; `tupletStart` is its beat's tick. */
  tupletStart?: number;
  /** Rest filling a whole bar (drawn centred as a whole rest). */
  wholeMeasure?: boolean;
  /** Space holder in a second voice — drawn invisibly. */
  hidden?: boolean;
  /** Sorted low → high. Empty for rests. */
  keys: NotationKey[];
  /** Tied from the previous item of the same notes. */
  tieFromPrev: boolean;
  /** Tied into the next item of the same notes. */
  tieToNext: boolean;
}

export interface NotationVoice {
  /** 0 = main voice (stems free / up), 1 = second voice (stems down). */
  index: 0 | 1;
  items: NotationItem[];
}

export interface NotationMeasure {
  index: number;
  number: number;
  startTick: number;
  endTick: number;
  staves: Record<StaffId, NotationVoice[]>;
}

export interface NotationScore {
  /** Staves this score is written on, top to bottom. */
  staves: StaffId[];
  timeSignature: [number, number];
  keyFifths: number;
  ticksPerQuarter: number;
  ticksPerMeasure: number;
  /** Ticks per beat for beaming: a quarter, or a dotted quarter in 6/8. */
  beatTicks: number;
  originTick: number;
  measures: NotationMeasure[];
}
