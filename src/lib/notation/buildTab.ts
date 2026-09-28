import type { FretPosition } from '@/lib/guitar/types';
import { buildScore } from './buildScore';
import type {
  NotationItem,
  NotationNoteInput,
  NotationOptions,
  NoteValue,
} from './types';

// ── Lesson notes → guitar TAB ──────────────────────────────────────────────
// TAB is the same rhythm as the staff, written as frets instead of pitches. So
// the staff engine does the musical work — quantizing, bars, rests, ties,
// written values and voices — on a single treble staff, and each written
// note is then looked up by its id to find the string and fret it's played
// on. A lesson note carries that position from the book data; nothing here
// guesses a fingering.

/** A note with the string and fret it is played on. `midi` is its sounding pitch. */
export type TabNoteInput = NotationNoteInput & { fretPosition: FretPosition };

export type TabOptions = Required<
  Pick<NotationOptions, 'timeSignature' | 'minMeasures'>
> &
  Pick<NotationOptions, 'ticksPerQuarter' | 'originTick'>;

/**
 * One fret in the TAB, with the lesson note it stands for. The pitch is as
 * the staff engine spelled it (sounding octave), so a drawn TAB can report
 * its notes the way a drawn staff does.
 */
export interface TabPosition extends FretPosition {
  noteId: string;
  midi: number;
  letter: string;
  octave: number;
  alteration: number;
}

/** One written note, chord or rest — a NotationItem with frets for pitches. */
export interface TabItem {
  kind: 'note' | 'rest';
  /** Absolute ticks, like the lesson notes. */
  startTick: number;
  durationTicks: number;
  /** Written value and dot, drawn as the rhythm under the strings. */
  value: NoteValue;
  dots: 0 | 1;
  /** Part of an eighth-note triplet group; `tupletStart` is its beat's tick. */
  tupletStart?: number;
  /** Rest filling a whole bar (drawn centred as a whole rest). */
  wholeMeasure?: boolean;
  /** Space holder in a second voice — drawn invisibly. */
  hidden?: boolean;
  /**
   * Tied over from the previous item: the string is still ringing, not picked
   * again, so the fret is written in brackets.
   */
  ghost: boolean;
  /** One per string, high e (string 1) first. Empty for rests. */
  positions: TabPosition[];
}

export interface TabVoice {
  /** 0 = main voice, 1 = a note held under moving ones. */
  index: 0 | 1;
  items: TabItem[];
}

export interface TabMeasure {
  index: number;
  /** Bar number as printed. */
  number: number;
  /** Absolute ticks: `originTick` is the start of bar 1. */
  startTick: number;
  endTick: number;
  /** Voice 0, then voice 1 when a held note needs one. */
  voices: TabVoice[];
}

export interface TabScore {
  timeSignature: [number, number];
  ticksPerQuarter: number;
  ticksPerMeasure: number;
  /** Ticks per beat for beaming: a quarter, or a dotted quarter in 6/8. */
  beatTicks: number;
  originTick: number;
  measures: TabMeasure[];
}

function tabItem(
  item: NotationItem,
  positionOf: ReadonlyMap<string, FretPosition>,
  inputOrder: ReadonlyMap<string, number>,
  unisonsOf: ReadonlyMap<string, readonly string[]>,
): TabItem {
  const positions: TabPosition[] = [];
  // Earliest-written note first, so a clash keeps the one the lesson gave first.
  const notes = item.keys
    .flatMap((key) =>
      [key.noteId, ...(unisonsOf.get(key.noteId) ?? [])].map((noteId) => ({
        key,
        noteId,
      })),
    )
    .sort((a, b) => inputOrder.get(a.noteId)! - inputOrder.get(b.noteId)!);
  for (const { key, noteId } of notes) {
    const position = positionOf.get(noteId)!;
    const clash = positions.find((p) => p.string === position.string);
    if (clash) {
      // One string sounds one note at a time; the data is wrong somewhere.
      if (import.meta.env.DEV) {
        console.warn(
          `[buildTab] notes ${clash.noteId} and ${noteId} are both on string ${position.string} at tick ${item.startTick}; drawing ${clash.noteId}`,
        );
      }
      continue;
    }
    positions.push({
      string: position.string,
      fret: position.fret,
      noteId,
      midi: key.midi,
      letter: key.letter,
      octave: key.octave,
      alteration: key.alteration,
    });
  }
  positions.sort((a, b) => a.string - b.string);
  return {
    kind: item.kind,
    startTick: item.startTick,
    durationTicks: item.durationTicks,
    value: item.value,
    dots: item.dots,
    ...(item.tupletStart !== undefined
      ? { tupletStart: item.tupletStart }
      : {}),
    ...(item.wholeMeasure ? { wholeMeasure: true } : {}),
    ...(item.hidden ? { hidden: true } : {}),
    ghost: item.tieFromPrev,
    positions,
  };
}

export function buildTab(
  notes: ReadonlyArray<TabNoteInput>,
  options: TabOptions,
): TabScore {
  const positionOf = new Map(notes.map((n) => [n.id, n.fretPosition]));
  const inputOrder = new Map(notes.map((n, i) => [n.id, i]));
  // A unison — one pitch on two strings at once — is a single notehead, and
  // the staff engine would keep only one of the pair. On TAB each string has
  // its own fret, so the staff gets the first and the others ride with it.
  const staffNotes: TabNoteInput[] = [];
  const firstAt = new Map<string, string>();
  const unisonsOf = new Map<string, string[]>();
  for (const note of notes) {
    const at = `${note.startTick}|${note.midi}`;
    const first = firstAt.get(at);
    if (first === undefined) {
      firstAt.set(at, note.id);
      staffNotes.push(note);
    } else {
      unisonsOf.set(first, [...(unisonsOf.get(first) ?? []), note.id]);
    }
  }
  // One staff whatever the register, and no key: TAB has no key signature, so
  // inferring one would be wasted work.
  const score = buildScore(staffNotes, {
    ...options,
    staves: 'treble',
    keyFifths: 0,
  });
  return {
    timeSignature: score.timeSignature,
    ticksPerQuarter: score.ticksPerQuarter,
    ticksPerMeasure: score.ticksPerMeasure,
    beatTicks: score.beatTicks,
    originTick: score.originTick,
    measures: score.measures.map((measure) => ({
      index: measure.index,
      number: measure.number,
      startTick: measure.startTick,
      endTick: measure.endTick,
      voices: measure.staves.treble.map((voice) => ({
        index: voice.index,
        items: voice.items.map((item) =>
          tabItem(item, positionOf, inputOrder, unisonsOf),
        ),
      })),
    })),
  };
}
