/**
 * registerRules.ts — Register of Chord and Bass Notes.
 *
 * One rule, stated once, applied everywhere student-facing notes are produced:
 *
 *   1. If the lowest note in a chord is above C5, the whole chord shifts down
 *      an octave.
 *   2. If the highest note in a bass line (or a single bass note) is above C4,
 *      the line (or note) shifts down an octave.
 *
 * Both shifts repeat until the note set is in range, so a chord sitting two
 * octaves too high lands in register rather than merely getting closer.
 *
 * WHAT MOVES TOGETHER
 * A chord figure moves as one unit for the whole step — never per simultaneity.
 * An arpeggio spells a chord one note at a time, so shifting only the notes
 * that happen to sit above C5 would shatter the shape; shifting only some bars
 * of a progression would put an octave break in the middle of the voice
 * leading. The lowest note of the entire figure decides, and everything moves
 * with it. The same holds for a bass line: the highest note decides, and the
 * whole line moves.
 *
 * WHAT COUNTS AS WHAT
 * Roles come from `instrument_config` when a step declares one, and from the
 * section otherwise (C = bass, B/D = chords, A = melody). Melody is never
 * touched — these rules are about accompaniment register, and a melody is
 * supposed to sit up there.
 */

import type { ActivitySectionId } from '../../types/activity';
import type { InstrumentConfig } from '../../types/activity.v2';

/** C5. A chord whose lowest note is ABOVE this is too high. */
export const CHORD_REGISTER_CEILING = 72;

/** C4. A bass note ABOVE this is too high. */
export const BASS_REGISTER_CEILING = 60;

/**
 * C3. After a hand-crossing shift, no single LH chord may put more than
 * MAX_NOTES_BELOW_LH_FLOOR of its notes below this — that is what stops the
 * fix from burying the left hand in mud.
 */
export const LH_CHORD_FLOOR = 48;
export const MAX_NOTES_BELOW_LH_FLOOR = 2;

export type NoteRole = 'chord' | 'bass' | 'other';

/** A note carrying just enough to be placed — matches TargetNote and GenreNoteEvent. */
export interface RegisterNote {
  midi: number;
  hand?: 'lh' | 'rh';
  /** Notes sharing an onset are one chord — the hand-crossing guard reads this. */
  onset?: number;
}

/** Everything the rules need to know about the step a note came from. */
export interface RegisterContext {
  section?: ActivitySectionId;
  instrument_config?: InstrumentConfig;
}

/**
 * Semitones to move a chord so its lowest note is no higher than C5.
 * Always 0 or a negative multiple of 12.
 */
export function chordOctaveShift(midis: readonly number[]): number {
  if (midis.length === 0) return 0;
  const lowest = Math.min(...midis);
  let shift = 0;
  while (lowest + shift > CHORD_REGISTER_CEILING) shift -= 12;
  return shift;
}

/**
 * Semitones to move a bass line so its highest note is no higher than C4.
 * Always 0 or a negative multiple of 12.
 */
export function bassOctaveShift(midis: readonly number[]): number {
  if (midis.length === 0) return 0;
  const highest = Math.max(...midis);
  let shift = 0;
  while (highest + shift > BASS_REGISTER_CEILING) shift -= 12;
  return shift;
}

/**
 * Which rule governs a note.
 *
 * An explicit `instrument_config` wins: it names what each hand is doing. A
 * hand doing something the rules do not govern (melody, open) returns 'other'.
 * Without one, the section decides — which is why untagged notes in a Section A
 * melody stay put while untagged notes in Section C are treated as bass.
 */
export function classifyNote(
  note: RegisterNote,
  ctx: RegisterContext,
): NoteRole {
  const roles = ctx.instrument_config;

  if (note.hand === 'lh') {
    if (roles?.lh_role === 'bass') return 'bass';
    if (roles?.lh_role === 'chords') return 'chord';
    return 'other';
  }
  if (note.hand === 'rh') {
    if (roles?.rh_role === 'chords') return 'chord';
    return 'other';
  }

  // Untagged notes: the section is the only signal available.
  if (ctx.section === 'C') return 'bass';
  if (ctx.section === 'B' || ctx.section === 'D') return 'chord';
  return 'other';
}

/**
 * The shift each role needs for one step's notes, or 0 where nothing moves.
 * Exported so the data migration and the runtime pass agree by construction.
 */
export function registerShiftsFor(
  notes: readonly RegisterNote[],
  ctx: RegisterContext,
): { chord: number; bass: number } {
  const chordMidis: number[] = [];
  const bassMidis: number[] = [];

  for (const note of notes) {
    const role = classifyNote(note, ctx);
    if (role === 'chord') chordMidis.push(note.midi);
    else if (role === 'bass') bassMidis.push(note.midi);
  }

  return {
    chord: chordOctaveShift(chordMidis),
    bass: bassOctaveShift(bassMidis),
  };
}

/**
 * Apply both rules to one step's notes.
 *
 * Returns the same array instance when nothing moves, so callers can treat an
 * unchanged step as untouched.
 */
export function applyRegisterRules<T extends RegisterNote>(
  notes: readonly T[],
  ctx: RegisterContext,
): readonly T[] {
  const shifts = registerShiftsFor(notes, ctx);
  const placed = notes.map((note) => {
    const role = classifyNote(note, ctx);
    const shift =
      role === 'chord' ? shifts.chord : role === 'bass' ? shifts.bass : 0;
    return shift === 0 ? note : { ...note, midi: note.midi + shift };
  });

  // Hands are separated after the register rules, so the decision is made on
  // where the notes actually ended up rather than where they were authored.
  const hand = handCrossingShift(placed, ctx);
  if (hand === 0) {
    return shifts.chord === 0 && shifts.bass === 0 ? notes : placed;
  }

  return placed.map((note) =>
    note.hand === 'lh' && classifyNote(note, ctx) === 'chord'
      ? { ...note, midi: note.midi + hand }
      : note,
  );
}

// ── Hands crossing ─────────────────────────────────────────────────────────

/**
 * Two-hand activities: the LH chords must stay out of the RH melody's way.
 *
 * THE RULE
 * When a step has LH chords under an RH melody and the LH's top note reaches
 * the RH melody's lowest note — touching it counts — the LH chords drop one
 * octave. Exactly one octave, never two: a chord still overlapping afterwards
 * is left as authored rather than pushed into the bass.
 *
 * THE GUARD
 * The drop is refused when it would leave any one chord with more than two
 * notes below C3. Below that, a four-note voicing stops speaking and turns
 * into mud.
 *
 * ALL OR NOTHING
 * The whole LH part moves together. If one chord in the step can't legally
 * drop, none of them do — a comping part split across two octaves mid-phrase
 * is a worse problem than the crossing it would fix.
 *
 * Ranges, not simultaneities: the hands share a keyboard for the whole step, so
 * an LH chord in bar 1 sitting above where the melody lands in bar 2 is still
 * a crossing, and reads as one on the staff.
 */
export function handCrossingShift(
  notes: readonly RegisterNote[],
  ctx: RegisterContext,
): number {
  const roles = ctx.instrument_config;
  // Precisely LH chords under an RH melody — not LH bass, not two-hand comping.
  if (roles?.lh_role !== 'chords' || roles?.rh_role !== 'melody') return 0;

  const lh = notes.filter((n) => n.hand === 'lh');
  const rh = notes.filter((n) => n.hand === 'rh');
  if (lh.length === 0 || rh.length === 0) return 0;

  const lhTop = Math.max(...lh.map((n) => n.midi));
  const rhLow = Math.min(...rh.map((n) => n.midi));
  if (lhTop < rhLow) return 0; // no overlap — hands are clear

  return canDropLhChords(lh) ? -12 : 0;
}

/** Whether every LH chord in the step survives the drop with its low notes intact. */
function canDropLhChords(lh: readonly RegisterNote[]): boolean {
  const byOnset = new Map<number, number[]>();
  for (const note of lh) {
    // A note without an onset is treated as part of one chord; grouping is
    // only about which notes sound together.
    const onset = note.onset ?? 0;
    const at = byOnset.get(onset) ?? [];
    at.push(note.midi - 12);
    byOnset.set(onset, at);
  }
  for (const chord of byOnset.values()) {
    const below = chord.filter((midi) => midi < LH_CHORD_FLOOR).length;
    if (below > MAX_NOTES_BELOW_LH_FLOOR) return false;
  }
  return true;
}
