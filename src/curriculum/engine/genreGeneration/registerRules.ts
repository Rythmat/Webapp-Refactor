/**
 * registerRules.ts — Register of Chord and Bass Notes.
 *
 * One rule, stated once, applied everywhere student-facing notes are produced:
 *
 *   1. If the lowest note in a chord is above C5, the chord shifts down an
 *      octave.
 *   2. If the highest note in a hand's chords is above C6, that hand's chords
 *      shift down an octave.
 *   3. If the highest note in a bass line (or a single bass note) is above C4,
 *      the line (or note) shifts down an octave.
 *
 * Every shift repeats until the note set is in range, so a chord sitting two
 * octaves too high lands in register rather than merely getting closer.
 *
 * WHY A CHORD NEEDS BOTH A FLOOR AND A CEILING
 * Rule 1 asks where a chord STARTS, and it lets a figure through as soon as one
 * note is low enough — which is how Pop L3 D1.1 shipped an octave high. Its
 * first chord bottoms out on Bb4, inside the limit, while the rest of the step
 * climbs to F6, where nobody comps. Rule 2 asks how far the same figure
 * REACHES, so a part has to be in register at both ends to be left alone.
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
 * Rule 2 is the one exception, and only for a step whose two hands are BOTH
 * comping: there it is the hand that reaches too high that drops, not both. A
 * left hand holding the middle of the texture has no business following a right
 * hand down out of the whistle register — and that pairing, common in jazz, is
 * the only place the two groupings differ. Everywhere else a step's chords are
 * one hand's work and the unit is the same either way.
 *
 * WHAT COUNTS AS WHAT
 * Roles come from `instrument_config` when a step declares one, and from the
 * section otherwise (C = bass, B/D = chords, A = melody). Melody is never
 * touched — these rules are about accompaniment register, and a melody is
 * supposed to sit up there.
 *
 * HIP HOP SITS HIGHER
 * Chords sit high in Hip Hop — a stylistic shift, in Aaron's words — so its
 * chord activities start in C5–C6. For `genre: 'hip-hop'` the chord window
 * moves up an octave: a chord may start as high as C6 and reach C7. Bass is
 * unchanged. See `chordLimits`.
 */

import type { ActivitySectionId } from '../../types/activity';
import type { InstrumentConfig } from '../../types/activity.v2';

/** C5. A chord whose lowest note is ABOVE this is too high. */
export const CHORD_REGISTER_CEILING = 72;

/** C6. A chord reaching ABOVE this is too high, wherever it starts. */
export const CHORD_REGISTER_TOP = 84;

/** Genres whose chords sit an octave higher (see HIP HOP SITS HIGHER). */
const HIGH_CHORD_GENRES = new Set(['hip-hop']);

export interface ChordLimits {
  /** A chord whose lowest note is ABOVE this is too high. */
  floor: number;
  /** A chord reaching ABOVE this is too high. */
  top: number;
}

/** The chord window for a step's genre. */
export function chordLimits(genre?: string): ChordLimits {
  return genre && HIGH_CHORD_GENRES.has(genre)
    ? { floor: CHORD_REGISTER_CEILING + 12, top: CHORD_REGISTER_TOP + 12 }
    : { floor: CHORD_REGISTER_CEILING, top: CHORD_REGISTER_TOP };
}

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
  /** The flow's genre; Hip Hop gets a higher chord window. */
  genre?: string;
}

/**
 * Semitones to move a chord so its lowest note is no higher than C5.
 * Always 0 or a negative multiple of 12.
 */
export function chordOctaveShift(
  midis: readonly number[],
  floor: number = CHORD_REGISTER_CEILING,
): number {
  if (midis.length === 0) return 0;
  const lowest = Math.min(...midis);
  let shift = 0;
  while (lowest + shift > floor) shift -= 12;
  return shift;
}

/**
 * Semitones to move a chord so its highest note is no higher than C6.
 * Always 0 or a negative multiple of 12.
 */
export function chordCeilingShift(
  midis: readonly number[],
  top: number = CHORD_REGISTER_TOP,
): number {
  if (midis.length === 0) return 0;
  const highest = Math.max(...midis);
  let shift = 0;
  while (highest + shift > top) shift -= 12;
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

/** Which hand a note belongs to, with one bucket for the untagged. */
export type HandKey = 'lh' | 'rh' | 'none';

const handKeyOf = (note: RegisterNote): HandKey => note.hand ?? 'none';

export interface RegisterShifts {
  /** Rule 1: the whole chord figure, from its lowest note. */
  chord: number;
  /** Rule 3: the whole bass line, from its highest note. */
  bass: number;
  /**
   * Rule 2: a further drop for one hand's chords, from that hand's highest
   * note, on top of `chord`. Hands with nothing to move are absent.
   */
  ceiling: Partial<Record<HandKey, number>>;
}

/**
 * The shift each role needs for one step's notes, or 0 where nothing moves.
 * Exported so the data migration and the runtime pass agree by construction.
 */
export function registerShiftsFor(
  notes: readonly RegisterNote[],
  ctx: RegisterContext,
): RegisterShifts {
  const chords: RegisterNote[] = [];
  const bassMidis: number[] = [];

  for (const note of notes) {
    const role = classifyNote(note, ctx);
    if (role === 'chord') chords.push(note);
    else if (role === 'bass') bassMidis.push(note.midi);
  }

  const chord = chordOctaveShift(
    chords.map((n) => n.midi),
    chordLimits(ctx.genre).floor,
  );
  return {
    chord,
    bass: bassOctaveShift(bassMidis),
    ceiling: ceilingShifts(chords, chord, notes, ctx),
  };
}

/**
 * Rule 2, hand by hand: how much further each hand's chords must drop to get
 * under C6, measured where rule 1 has already left them.
 *
 * THE GUARD
 * When the other hand is playing UNDERNEATH — a bass, or the lower half of a
 * two-hand comp — the drop is refused if it would carry these chords below it.
 * Fixing a part that sits too high by crossing it under the hand holding the
 * bottom of the texture is not a fix; better to leave the step as authored and
 * let it be caught by ear. A hand playing above, such as a melody, is no
 * obstacle: dropping away from it is the whole point, and the hand-crossing
 * rule below has the last word there. Ranges, not simultaneities — the hands
 * share a keyboard for the whole step.
 */
function ceilingShifts(
  chords: readonly RegisterNote[],
  chordShift: number,
  all: readonly RegisterNote[],
  ctx: RegisterContext,
): Partial<Record<HandKey, number>> {
  const shifts: Partial<Record<HandKey, number>> = {};
  const byHand = new Map<HandKey, number[]>();
  for (const note of chords) {
    const key = handKeyOf(note);
    const at = byHand.get(key) ?? [];
    at.push(note.midi + chordShift);
    byHand.set(key, at);
  }

  for (const [hand, midis] of byHand) {
    const shift = chordCeilingShift(midis, chordLimits(ctx.genre).top);
    if (shift === 0) continue;
    const bottom = Math.min(...midis);
    const otherTop = topOfOtherHand(all, hand, chordShift, ctx);
    const underneath = otherTop !== null && otherTop < bottom;
    if (underneath && bottom + shift < otherTop) continue;
    shifts[hand] = shift;
  }
  return shifts;
}

/** The highest note the other hand plays once rules 1 and 3 have been applied. */
function topOfOtherHand(
  all: readonly RegisterNote[],
  hand: HandKey,
  chordShift: number,
  ctx: RegisterContext,
): number | null {
  const bassShift = bassOctaveShift(
    all.filter((n) => classifyNote(n, ctx) === 'bass').map((note) => note.midi),
  );
  const others = all
    .filter((note) => handKeyOf(note) !== hand)
    .map((note) => {
      const role = classifyNote(note, ctx);
      if (role === 'chord') return note.midi + chordShift;
      if (role === 'bass') return note.midi + bassShift;
      return note.midi;
    });
  return others.length === 0 ? null : Math.max(...others);
}

/**
 * Apply every rule to one step's notes.
 *
 * Returns the same array instance when nothing moves, so callers can treat an
 * unchanged step as untouched.
 */
export function applyRegisterRules<T extends RegisterNote>(
  notes: readonly T[],
  ctx: RegisterContext,
): readonly T[] {
  const shifts = registerShiftsFor(notes, ctx);
  const shiftFor = (note: RegisterNote): number => {
    const role = classifyNote(note, ctx);
    if (role === 'bass') return shifts.bass;
    if (role !== 'chord') return 0;
    return shifts.chord + (shifts.ceiling[handKeyOf(note)] ?? 0);
  };
  const placed = notes.map((note) => {
    const shift = shiftFor(note);
    return shift === 0 ? note : { ...note, midi: note.midi + shift };
  });
  const moved = notes.some((note) => shiftFor(note) !== 0);

  // Hands are separated after the register rules, so the decision is made on
  // where the notes actually ended up rather than where they were authored.
  const hand = handCrossingShift(placed, ctx);
  if (hand === 0) {
    return moved ? placed : notes;
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
