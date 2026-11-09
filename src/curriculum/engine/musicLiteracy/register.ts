/**
 * Where a melody sits: in the treble staff, with as few ledger lines as it
 * can. The owner: "For melodies, we should be entirely in the treble clef
 * staff as much as possible ... Just middle C as the lowest note ideally",
 * and then: "yes let's use the lowest number of ledger lines as default."
 * Chords are voiced the same way, a progression at a time (chords.ts).
 *
 * THE RULE (`placeMelody`)
 * A step's melody (its words, call and response, and so its create pass's
 * notes) is placed as one, so a step never jumps an octave within itself.
 * The octave of the key's 1 is the one needing the fewest ledger lines,
 * keeping every note in C4–A5 (middle C up to the A above the staff, MIDI
 * 60–81) when any octave can; on a tie, the lower.
 *
 * THE EXCEPTION (`melodyRuleFor`)
 * A lesson whose key is its own, not the student's (Part 1, in C), keeps
 * the rule it was written to: the 1 in the lowest octave where every note
 * is in C4–A5 (failing that, the fewest ledger lines, then nearest the
 * staff's middle line, B4, then the lower). Part 1 begins with "a note
 * called C", and that C is middle C: its 1 stays there, its lowest note,
 * though C5 would need no ledger line.
 *
 * Ledger lines are counted by where each note is written on the treble
 * staff, spelled the key's way (a degree's letter is the 1's letter plus
 * the degree, so D♭'s 1 is a D, never a C♯): D4 and G5 need none, C4, B3,
 * A5 and B5 one, A3, G3, C6 and D6 two, and so on. A placement needs as
 * many as its lowest note does below the staff plus its highest above.
 *
 * Pure; no React.
 */

import type {
  LiteracyDegree,
  LiteracyNote,
  LiteracyNumbering,
  MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';
import {
  DEGREE_SEMITONES,
  modalDegree,
  pitchClassOf,
  type LiteracyKey,
} from './pitch';

/** A written note: a degree, and its octave from the 1. */
export type WrittenNote = Pick<LiteracyNote, 'degree' | 'octave'>;

/** The lowest a melody's note may sit: middle C. */
export const MELODY_LOWEST_MIDI = 60;
/** The highest: A5, the first ledger line above the treble staff. */
export const MELODY_HIGHEST_MIDI = 81;

const LETTERS = 'CDEFGAB';

/**
 * A staff position: steps of the staff from C0, a line or a space each, so
 * C4 is 28 and B4 34. The treble staff's lines are E4 G4 B4 D5 F5.
 */
export const staffPositionOf = (letter: string, octave: number): number =>
  LETTERS.indexOf(letter.toUpperCase()) + 7 * octave;

/** The treble staff's bottom line (E4), middle line (B4) and top line (F5). */
export const TREBLE_BOTTOM = staffPositionOf('E', 4);
export const TREBLE_MIDDLE = staffPositionOf('B', 4);
export const TREBLE_TOP = staffPositionOf('F', 5);

/**
 * Ledger lines a note at `position` needs on the treble staff: none from
 * D4 (the space under the staff) to G5 (the space over it), then one more
 * every other step out.
 */
export function trebleLedgerLines(position: number): number {
  const below = TREBLE_BOTTOM - 1 - position;
  if (below > 0) return Math.ceil(below / 2);
  const above = position - (TREBLE_TOP + 1);
  if (above > 0) return Math.ceil(above / 2);
  return 0;
}

/**
 * Ledger lines a set of notes needs, by staff position: as many as the
 * lowest needs below the staff plus as many as the highest needs above.
 */
export function ledgerLinesOf(positions: readonly number[]): number {
  if (positions.length === 0) return 0;
  const low = Math.min(...positions);
  const high = Math.max(...positions);
  return (
    (low < TREBLE_BOTTOM ? trebleLedgerLines(low) : 0) +
    (high > TREBLE_TOP ? trebleLedgerLines(high) : 0)
  );
}

/** The number a degree is written with: 3 for '3' and 'b3', 4 for '#4'. */
const degreeNumber = (degree: LiteracyDegree): number =>
  Number(degree.replace(/[b#]/, ''));

/** A written note's pitch, given the MIDI of its key's 1. */
export function pitchFrom(
  note: WrittenNote,
  tonic: number,
  key: LiteracyKey,
  numbering: LiteracyNumbering = 'chromatic',
): number {
  return (
    tonic +
    DEGREE_SEMITONES[modalDegree(note.degree, key.mode, numbering)] +
    12 * (note.octave ?? 0)
  );
}

/**
 * Where a written note sits on the staff, spelled the key's way: its letter
 * is the 1's letter plus the degree (D♭ major's 7 is a C, F♯'s an E♯), its
 * octave the letter's, from the 1 at `tonic`.
 */
export function staffPosition(
  note: WrittenNote,
  tonic: number,
  key: LiteracyKey,
): number {
  const one = staffPositionOf(key.tonic[0], Math.floor(tonic / 12) - 1);
  return one + degreeNumber(note.degree) - 1 + 7 * (note.octave ?? 0);
}

/** A note's name the key's way, for people: "C♯4", "B♭3". */
export function spelledNote(
  note: WrittenNote,
  tonic: number,
  key: LiteracyKey,
  numbering: LiteracyNumbering = 'chromatic',
): string {
  const position = staffPosition(note, tonic, key);
  const letterIndex = ((position % 7) + 7) % 7;
  const letter = LETTERS[letterIndex];
  const octave = Math.floor(position / 7);
  const natural = [0, 2, 4, 5, 7, 9, 11][letterIndex] + 12 * (octave + 1);
  const alter = pitchFrom(note, tonic, key, numbering) - natural;
  const accidental =
    alter > 0 ? '♯'.repeat(alter) : alter < 0 ? '♭'.repeat(-alter) : '';
  return `${letter}${accidental}${octave}`;
}

/** A melody placed in a key: where its 1 is, and what it comes to. */
export interface MelodyPlacement {
  /** The MIDI of the 1. */
  tonic: number;
  /** The lowest and highest notes, MIDI (the 1, for no notes). */
  lowest: number;
  highest: number;
  /** Ledger lines it needs on the treble staff. */
  ledgerLines: number;
  /** Every note is in C4–A5. */
  fits: boolean;
}

/** The 1's octaves tried: C2–B6, as far as any figure (octave ±2) needs. */
const TONIC_OCTAVES = [2, 3, 4, 5, 6] as const;

/** A melody's notes with its 1 at `tonic`, measured. */
export function measureMelody(
  key: LiteracyKey,
  notes: readonly WrittenNote[],
  tonic: number,
  numbering: LiteracyNumbering = 'chromatic',
): MelodyPlacement & { middle: number } {
  const written: readonly WrittenNote[] = notes.length
    ? notes
    : [{ degree: '1' }];
  const midis = written.map((note) => pitchFrom(note, tonic, key, numbering));
  const positions = written.map((note) => staffPosition(note, tonic, key));
  const lowest = Math.min(...midis);
  const highest = Math.max(...midis);
  return {
    tonic,
    lowest,
    highest,
    ledgerLines: ledgerLinesOf(positions),
    fits: lowest >= MELODY_LOWEST_MIDI && highest <= MELODY_HIGHEST_MIDI,
    // How far the melody's middle is from the staff's.
    middle: Math.abs(
      (Math.min(...positions) + Math.max(...positions)) / 2 - TREBLE_MIDDLE,
    ),
  };
}

/**
 * How a lesson's melodies are placed (see THE RULE and THE EXCEPTION
 * above): the fewest ledger lines, or, for a lesson whose key is its own,
 * the lowest octave from middle C.
 */
export type MelodyRule = 'fewestLedgerLines' | 'lowestFromMiddleC';

/** The rule a lesson's melodies are placed by. */
export const melodyRuleFor = (
  lesson: Partial<Pick<MusicLiteracyLesson, 'keyChoice'>>,
): MelodyRule =>
  lesson.keyChoice === 'student' ? 'fewestLedgerLines' : 'lowestFromMiddleC';

type Measured = ReturnType<typeof measureMelody>;

/** THE RULE: in C4–A5 if any octave can be, the fewest ledger lines, the lower. */
function fewestLedgerLines(options: readonly Measured[]): Measured {
  const fitting = options.filter((option) => option.fits);
  return [...(fitting.length ? fitting : options)].sort(
    (a, b) => a.ledgerLines - b.ledgerLines || a.tonic - b.tonic,
  )[0];
}

/** THE EXCEPTION: the lowest octave in C4–A5, else the fewest ledger lines. */
function lowestFromMiddleC(options: readonly Measured[]): Measured {
  return (
    options.find((option) => option.fits) ??
    [...options].sort(
      (a, b) =>
        a.ledgerLines - b.ledgerLines ||
        a.middle - b.middle ||
        a.tonic - b.tonic,
    )[0]
  );
}

/**
 * Where a melody goes in a key: `notes` are all the step's written notes,
 * its words, call and response together, placed by `rule` (THE RULE above,
 * unless the lesson's key is its own: `melodyRuleFor`). With none, the 1
 * alone is placed.
 */
export function placeMelody(
  key: LiteracyKey,
  notes: readonly WrittenNote[],
  numbering: LiteracyNumbering = 'chromatic',
  rule: MelodyRule = 'fewestLedgerLines',
): MelodyPlacement {
  const pc = pitchClassOf(key.tonic);
  const options = TONIC_OCTAVES.map((octave) =>
    measureMelody(key, notes, 12 * (octave + 1) + pc, numbering),
  );
  const best =
    rule === 'fewestLedgerLines'
      ? fewestLedgerLines(options)
      : lowestFromMiddleC(options);
  return {
    tonic: best.tonic,
    lowest: best.lowest,
    highest: best.highest,
    ledgerLines: best.ledgerLines,
    fits: best.fits,
  };
}
