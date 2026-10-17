/**
 * A Music Literacy segment (the words, the call or the response) as an
 * instrumental part, for the Parts editor's piano roll and staff, and back.
 * The notes are scale degrees of the lesson's key, so they go out as pitches
 * of its 1 (`tonicMidi`) and come back as degrees of that same 1, whatever
 * key the roll is told the part is in.
 *
 * No React here.
 */

import type {
  LiteracyFigure,
  LiteracyNote,
  LiteracyStep,
  LiteracyWord,
  LiteracyWords,
  MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';
import {
  degreeOfMidi,
  noteMidi,
  tonicMidi,
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

/** A segment's notes and bars, as the step has them now. */
export function segmentOf(
  step: LiteracyStep,
  segment: Segment,
): LiteracyFigure | LiteracyWords {
  if (segment === 'words') return step.words;
  if (segment === 'call') return step.call;
  return step.response ?? step.call;
}

/** The segment as a piano part in the lesson's key, at the step's tempo. */
export function segmentPart(
  lesson: MusicLiteracyLesson,
  step: LiteracyStep,
  segment: Segment,
  id: string,
): InstrumentPart {
  const figure = segmentOf(step, segment);
  const tonic = tonicMidi(lesson.key.tonic);
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
    bars: figure.bars,
    tempo: step.tempo ?? lesson.tempo,
    swing: 50,
    sound: 'piano-sampler',
    notes: [...figure.notes]
      .sort((a, b) => a.tick - b.tick)
      .map(
        (note): PartNote => ({
          tick: note.tick,
          duration: note.duration,
          midi: noteMidi(note, tonic),
          velocity: VELOCITY,
        }),
      ),
    source: { kind: 'scratch' },
  };
}

/** The part's notes as degrees of the lesson's 1, in time order. */
function partNotes(
  part: InstrumentPart,
  lesson: MusicLiteracyLesson,
): LiteracyNote[] {
  const tonic = tonicMidi(lesson.key.tonic);
  return [...part.notes]
    .sort((a, b) => a.tick - b.tick || a.midi - b.midi)
    .map((note) => ({
      tick: Math.max(0, Math.round(note.tick)),
      duration: Math.max(1, Math.round(note.duration)),
      ...degreeOfMidi(note.midi, tonic),
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
 * syllable past the last note is dropped, and both are reported.
 */
export function partWords(
  part: InstrumentPart,
  lesson: MusicLiteracyLesson,
  previous: LiteracyWords,
): WordsFromPart {
  const texts = [...previous.notes]
    .sort((a, b) => a.tick - b.tick)
    .map((note) => note.text);
  const notes = partNotes(part, lesson).map(
    (note, i): LiteracyWord => ({
      ...note,
      text: texts[i] ?? PLACEHOLDER_SYLLABLE,
    }),
  );
  return {
    words: { bars: part.bars, notes },
    added: Math.max(0, notes.length - texts.length),
    dropped: texts.slice(notes.length),
  };
}
