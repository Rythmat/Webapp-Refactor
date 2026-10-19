/**
 * Music Literacy's music: scale degrees to pitches in the series' register,
 * and a step laid out on one timeline (count-in, words, call, response).
 * Shared by the Learn player and the console editor.
 */

import {
  LITERACY_TPQ,
  type LiteracyDegree,
  type LiteracyFigure,
  type LiteracyNote,
  type LiteracyStep,
  type LiteracyTonic,
  type LiteracyWord,
  type MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';

export { LITERACY_TPQ };

/** Semitones above the tonic, per degree. */
export const DEGREE_SEMITONES: Readonly<Record<LiteracyDegree, number>> = {
  '1': 0,
  b2: 1,
  '2': 2,
  b3: 3,
  '3': 4,
  '4': 5,
  '#4': 6,
  '5': 7,
  b6: 8,
  '6': 9,
  b7: 10,
  '7': 11,
};

/** The degree written for each semitone above the tonic. */
const DEGREE_OF_SEMITONE: readonly LiteracyDegree[] = [
  '1',
  'b2',
  '2',
  'b3',
  '3',
  '4',
  '#4',
  '5',
  'b6',
  '6',
  'b7',
  '7',
];

const TONIC_PITCH_CLASS: Readonly<Record<LiteracyTonic, number>> = {
  C: 0,
  Db: 1,
  D: 2,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  Ab: 8,
  A: 9,
  Bb: 10,
  B: 11,
};

/** The lowest and highest the 1 may sit: F♯3 and F4, around middle C. */
export const LOWEST_TONIC_MIDI = 54;
export const HIGHEST_TONIC_MIDI = 65;

/**
 * The 1 of a key, in the series' register: within a tritone of middle C, so
 * F♯ starts an augmented 4th below it and F a perfect 4th above. Everything
 * Part 1 and the melodies use (the low 5 up to the 5 above) then fits on the
 * two octaves C3–C5.
 */
export function tonicMidi(tonic: LiteracyTonic): number {
  const midi = 60 + TONIC_PITCH_CLASS[tonic];
  return midi > HIGHEST_TONIC_MIDI ? midi - 12 : midi;
}

/** A note's pitch, given its key's 1. */
export function noteMidi(
  note: Pick<LiteracyNote, 'degree' | 'octave'>,
  tonic: number,
): number {
  return tonic + DEGREE_SEMITONES[note.degree] + 12 * (note.octave ?? 0);
}

/** A pitch back as a degree and octave of a key (the editors' piano roll). */
export function degreeOfMidi(
  midi: number,
  tonic: number,
): Pick<LiteracyNote, 'degree' | 'octave'> {
  const above = midi - tonic;
  const octave = Math.floor(above / 12);
  const degree = DEGREE_OF_SEMITONE[above - octave * 12];
  return octave === 0 ? { degree } : { degree, octave };
}

/** "♭3" for "b3", "♯4" for "#4": how a degree is shown. */
export function degreeLabel(degree: LiteracyDegree): string {
  return degree.replace('b', '♭').replace('#', '♯');
}

export function barTicks(timeSignature: readonly [number, number]): number {
  const [beats, unit] = timeSignature;
  return (beats * LITERACY_TPQ * 4) / unit;
}

/** What the student plays back: the response, or the call echoed. */
export function responseOf(step: LiteracyStep): LiteracyFigure {
  return step.response ?? step.call;
}

export interface Span {
  start: number;
  length: number;
}

/** One step on a timeline, in ticks from the first count-in click. */
export interface StepTimeline {
  countIn: Span;
  words: Span;
  call: Span;
  response: Span;
  total: number;
  barTicks: number;
  tempo: number;
}

export function stepTimeline(
  lesson: Pick<MusicLiteracyLesson, 'timeSignature' | 'countInBars' | 'tempo'>,
  step: LiteracyStep,
): StepTimeline {
  const bar = barTicks(lesson.timeSignature);
  const countIn = { start: 0, length: lesson.countInBars * bar };
  const words = { start: countIn.length, length: step.words.bars * bar };
  const call = {
    start: words.start + words.length,
    length: step.call.bars * bar,
  };
  const response = {
    start: call.start + call.length,
    length: responseOf(step).bars * bar,
  };
  return {
    countIn,
    words,
    call,
    response,
    total: response.start + response.length,
    barTicks: bar,
    tempo: step.tempo ?? lesson.tempo,
  };
}

/** A note placed on the step's timeline, as the player and grader use it. */
export interface TimedNote {
  midi: number;
  onset: number;
  duration: number;
  degree: LiteracyDegree;
  /** The syllable sung on it (words only). */
  text?: string;
  /** Its index within its segment. */
  index: number;
}

function place(
  notes: readonly (LiteracyNote | LiteracyWord)[],
  start: number,
  tonic: number,
): TimedNote[] {
  return notes.map((note, index) => ({
    midi: noteMidi(note, tonic),
    onset: start + note.tick,
    duration: note.duration,
    degree: note.degree,
    ...('text' in note ? { text: note.text } : {}),
    index,
  }));
}

/** A step's three segments placed on its timeline, in its lesson's key. */
export function stepNotes(lesson: MusicLiteracyLesson, step: LiteracyStep) {
  const timeline = stepTimeline(lesson, step);
  const tonic = tonicMidi(lesson.key.tonic);
  return {
    timeline,
    tonic,
    words: place(step.words.notes, timeline.words.start, tonic),
    call: place(step.call.notes, timeline.call.start, tonic),
    response: place(responseOf(step).notes, timeline.response.start, tonic),
  };
}

/** Seconds per tick at a tempo in quarter notes per minute. */
export function secondsPerTick(tempo: number): number {
  return 60 / tempo / LITERACY_TPQ;
}
