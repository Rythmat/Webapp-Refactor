/**
 * A Music Literacy segment (the words, the call or the response) as an
 * instrumental part, for the Parts editor's piano roll and staff, and back.
 * The notes are scale degrees of the lesson's key, so they go out as pitches
 * of its 1 (`tonicMidi`) and come back as degrees of that same 1, whatever
 * key the roll is told the part is in, read the lesson's way: under scale
 * numbering (Part 2) a 3 goes out as the mode's 3rd and comes back a 3.
 *
 * Words with a pickup go out a bar longer: the roll's bar 1 is the pickup
 * bar, the end of the count-in, with the pickup at its end, and the words'
 * bar 1 is the roll's bar 2. They come back a bar earlier.
 *
 * No React here.
 */

import {
  PICKUP_STEP,
  type LiteracyFigure,
  type LiteracyMelodicEchoStep,
  type LiteracyNote,
  type LiteracyWord,
  type LiteracyWords,
  type MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';
import {
  barTicks,
  notePitch,
  pickupOf,
  tonicMidi,
  writtenDegree,
} from '@/curriculum/engine/musicLiteracy/literacy';
import type { InstrumentPart, PartNote } from '@/curriculum/engine/parts/part';

export type Segment = 'words' | 'call' | 'response';

export const SEGMENT_LABEL: Record<Segment, string> = {
  words: 'Words',
  call: 'Call',
  response: 'Response',
};

/** What a syllable is sung to when the roll adds a note the line lacks. */
export const PLACEHOLDER_SYLLABLE = 'la';

const VELOCITY = 96;

/** A step's words, or a blank line for a step with none (a Part 2 echo). */
export const wordsOf = (step: LiteracyMelodicEchoStep): LiteracyWords =>
  step.words ?? { bars: 1, notes: [] };

/** A segment's notes and bars, as the step has them now. */
export function segmentOf(
  step: LiteracyMelodicEchoStep,
  segment: Segment,
): LiteracyFigure | LiteracyWords {
  if (segment === 'words') return wordsOf(step);
  if (segment === 'call') return step.call;
  return step.response ?? step.call;
}

/**
 * Where the segment's tick 0 is in its part: a bar in for words with a
 * pickup, which the roll's first bar holds.
 */
export function partOffset(
  lesson: Pick<MusicLiteracyLesson, 'timeSignature'>,
  step: LiteracyMelodicEchoStep,
  segment: Segment,
): number {
  return segment === 'words' && pickupOf(step) > 0
    ? barTicks(lesson.timeSignature)
    : 0;
}

/** The segment as a piano part in the lesson's key, at the step's tempo. */
export function segmentPart(
  lesson: MusicLiteracyLesson,
  step: LiteracyMelodicEchoStep,
  segment: Segment,
  id: string,
): InstrumentPart {
  const figure = segmentOf(step, segment);
  const tonic = tonicMidi(lesson.key.tonic);
  const offset = partOffset(lesson, step, segment);
  return {
    id,
    name: `${step.title} · ${SEGMENT_LABEL[segment]}`,
    instrument: 'piano',
    role: 'melody',
    level: 1,
    tags: [],
    status: 'draft',
    key: {
      tonic: tonic % 12,
      mode: lesson.key.mode === 'minor' ? 'aeolian' : 'ionian',
    },
    timeSignature: [lesson.timeSignature[0], lesson.timeSignature[1]],
    bars: figure.bars + (offset ? 1 : 0),
    tempo: step.tempo ?? lesson.tempo,
    swing: 50,
    sound: 'piano-sampler',
    notes: [...figure.notes]
      .sort((a, b) => a.tick - b.tick)
      .map(
        (note): PartNote => ({
          tick: note.tick + offset,
          duration: note.duration,
          midi: notePitch(note, lesson.key, lesson.numbering),
          velocity: VELOCITY,
        }),
      ),
    source: { kind: 'scratch' },
  };
}

/**
 * The part's notes as degrees of the lesson's 1, in time order, from the
 * segment's tick 0: `offset` into the part.
 */
function partNotes(
  part: InstrumentPart,
  lesson: MusicLiteracyLesson,
  offset = 0,
): LiteracyNote[] {
  const tonic = tonicMidi(lesson.key.tonic);
  return [...part.notes]
    .sort((a, b) => a.tick - b.tick || a.midi - b.midi)
    .map((note) => ({
      tick: Math.max(0, Math.round(note.tick)) - offset,
      duration: Math.max(1, Math.round(note.duration)),
      ...writtenDegree(note.midi - tonic, lesson.key.mode, lesson.numbering),
    }));
}

/** A call or response back from the roll: its notes and its bars. */
export function partFigure(
  part: InstrumentPart,
  lesson: MusicLiteracyLesson,
): LiteracyFigure {
  return { bars: part.bars, notes: partNotes(part, lesson) };
}

export interface WordsFromPart {
  words: LiteracyWords;
  /** Notes the line had no syllable for, sung to the placeholder. */
  added: number;
  /** Syllables left with no note, in order. */
  dropped: string[];
}

/**
 * The words back from the roll: the line's syllables on the roll's notes,
 * one each in order. A note past the last syllable sings the placeholder; a
 * syllable past the last note is dropped, and both are reported. Words
 * with a pickup come back from the roll's second bar; a note put earlier in
 * the pickup bar than the pickup reaches makes the pickup that much longer,
 * to the eighth, as far as a bar less an eighth.
 */
export function partWords(
  part: InstrumentPart,
  lesson: MusicLiteracyLesson,
  previous: LiteracyWords,
): WordsFromPart {
  const texts = [...previous.notes]
    .sort((a, b) => a.tick - b.tick)
    .map((note) => note.text);
  const pickup = previous.pickup ?? 0;
  const bar = barTicks(lesson.timeSignature);
  const notes = partNotes(part, lesson, pickup ? bar : 0).map(
    (note, i): LiteracyWord => ({
      ...note,
      text: texts[i] ?? PLACEHOLDER_SYLLABLE,
    }),
  );
  const earliest = Math.min(0, ...notes.map((note) => note.tick));
  const reach = Math.min(
    bar - PICKUP_STEP,
    Math.ceil(-earliest / PICKUP_STEP) * PICKUP_STEP,
  );
  const bars = pickup ? Math.max(1, part.bars - 1) : part.bars;
  return {
    words: pickup
      ? { bars, pickup: Math.max(pickup, reach), notes }
      : { bars, notes },
    added: Math.max(0, notes.length - texts.length),
    dropped: texts.slice(notes.length),
  };
}
