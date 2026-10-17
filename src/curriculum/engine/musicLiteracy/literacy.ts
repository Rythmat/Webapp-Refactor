/**
 * Music Literacy's music: scale degrees to pitches in the series' register,
 * and a step laid out on one timeline (count-in, words, call, response).
 * Shared by the Learn player and the console editor.
 *
 * Words with a pickup start before their downbeat: the pickup is sung at
 * the end of the count-in, and the words' bar 1 starts where it always
 * does, so nothing after it moves.
 *
 * Part 2's steps lay out the same way, in the key the student chose (pass
 * their choices; left out, the lesson's key): a step without words has a
 * words segment of no length, so its call comes in on the count-in's last
 * bar line; a chord call places a chord a bar in its rhythm, voiced
 * (chords.ts), and a replay plays a saved progression once per harmony as
 * its call, with no response. The choose steps have nothing to lay out.
 */

import {
  LITERACY_TPQ,
  isChordFigure,
  isEchoStep,
  type LiteracyCall,
  type LiteracyChordFigure,
  type LiteracyDegree,
  type LiteracyFigure,
  type LiteracyHarmony,
  type LiteracyMelodicEchoStep,
  type LiteracyNote,
  type LiteracyReplayStep,
  type LiteracyScaleDegree,
  type LiteracyStep,
  type LiteracyWord,
  type MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';
import {
  chooserOf,
  keyFor,
  progressionFor,
  progressionNameOf,
  type LiteracyChoices,
} from './choices';
import { sampleProgression, voicedChord, type VoicedChord } from './chords';
import {
  degreeOfMidi,
  modalDegree,
  notePitch,
  tonicMidi,
  type LiteracyKey,
} from './pitch';

export { LITERACY_TPQ };
export {
  DEGREE_SEMITONES,
  HIGHEST_TONIC_MIDI,
  LOWEST_TONIC_MIDI,
  SCALE_SEMITONES,
  degreeLabel,
  degreeOfMidi,
  modalDegree,
  noteMidi,
  notePitch,
  tonicMidi,
  writtenDegree,
  type LiteracyKey,
} from './pitch';

export function barTicks(timeSignature: readonly [number, number]): number {
  const [beats, unit] = timeSignature;
  return (beats * LITERACY_TPQ * 4) / unit;
}

/** How long the words' pickup is, in ticks: 0 for none (or no words). */
export const pickupOf = (step: LiteracyStep): number =>
  isEchoStep(step) ? (step.words?.pickup ?? 0) : 0;

/** What the student plays back: the response, or the call echoed. */
export function responseOf(step: LiteracyMelodicEchoStep): LiteracyFigure {
  return step.response ?? step.call;
}

/** What `stepTimeline` needs of a lesson; its steps size a progression. */
export type LessonTiming = Pick<
  MusicLiteracyLesson,
  'timeSignature' | 'countInBars' | 'tempo'
> & { steps?: readonly LiteracyStep[] };

/**
 * A chord figure's length in bars: its chords, or the template of the
 * progression it plays (1 if the lesson has no such progression).
 */
export function chordFigureBars(
  lesson: { steps?: readonly LiteracyStep[] },
  figure: Pick<LiteracyChordFigure, 'chords' | 'progression'>,
): number {
  if (figure.chords) return figure.chords.length;
  const chooser =
    figure.progression && lesson.steps
      ? chooserOf({ steps: lesson.steps }, figure.progression)
      : undefined;
  return chooser?.template.length ?? 1;
}

/** A call's length in bars, notes or chords. */
export function callBars(
  lesson: { steps?: readonly LiteracyStep[] },
  call: LiteracyCall,
): number {
  return isChordFigure(call) ? chordFigureBars(lesson, call) : call.bars;
}

/** A replay's harmonies, in the order it plays them. */
export const replayHarmonies = (
  step: Pick<LiteracyReplayStep, 'harmonies'>,
): LiteracyHarmony[] => step.harmonies ?? ['triads', 'sevenths'];

/** Each segment's bars: what the step's kind lays out. */
function segmentBars(lesson: LessonTiming, step: LiteracyStep) {
  if (isEchoStep(step)) {
    const call = callBars(lesson, step.call);
    const response = isChordFigure(step.call)
      ? call
      : (step.response ?? step.call).bars;
    return { words: step.words?.bars ?? 0, call, response };
  }
  if (step.kind === 'replay') {
    const once = chordFigureBars(lesson, { progression: step.progression });
    return { words: 0, call: once * replayHarmonies(step).length, response: 0 };
  }
  return { words: 0, call: 0, response: 0 };
}

export interface Span {
  start: number;
  length: number;
}

/** One step on a timeline, in ticks from the first count-in click. */
export interface StepTimeline {
  countIn: Span;
  /**
   * The words' pickup: the end of the count-in, sung up to the words'
   * downbeat (`words.start`). Length 0 without one.
   */
  pickup: Span;
  /** The words from their downbeat, their bar 1 (a pickup comes before). */
  words: Span;
  call: Span;
  response: Span;
  total: number;
  barTicks: number;
  tempo: number;
}

export function stepTimeline(
  lesson: LessonTiming,
  step: LiteracyStep,
): StepTimeline {
  const bar = barTicks(lesson.timeSignature);
  const pickup = pickupOf(step);
  const bars = segmentBars(lesson, step);
  // A pickup is sung in the count-in's last bar, so it always has one.
  const countInBars = pickup
    ? Math.max(1, lesson.countInBars)
    : lesson.countInBars;
  const countIn = { start: 0, length: countInBars * bar };
  const words = { start: countIn.length, length: bars.words * bar };
  const call = {
    start: words.start + words.length,
    length: bars.call * bar,
  };
  const response = {
    start: call.start + call.length,
    length: bars.response * bar,
  };
  return {
    countIn,
    pickup: { start: words.start - pickup, length: pickup },
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
  /**
   * Its chromatic degree in the key (minor's 3 in scale numbering is 'b3'):
   * what `degreeLabel` shows.
   */
  degree: LiteracyDegree;
  /** The syllable sung on it (words only). */
  text?: string;
  /** Its index within its segment. */
  index: number;
  /** A chord's note: the index of its attack within the segment. */
  attack?: number;
}

/** A chord struck on the timeline: one attack of a chord figure. */
export interface ChordAttack {
  /** Its index within its segment. */
  index: number;
  /** Its bar within the segment, from 0. */
  bar: number;
  onset: number;
  duration: number;
  chord: VoicedChord;
}

/**
 * The key a step plays in: the key of the progression it plays, when the
 * student saved one (its chords are that mode's), else the lesson's key or
 * the student's choice of it.
 */
export function stepKey(
  lesson: Pick<MusicLiteracyLesson, 'key' | 'keyChoice' | 'steps'>,
  step: LiteracyStep,
  choices?: LiteracyChoices | null,
): LiteracyKey {
  const name = progressionNameOf(step);
  const saved = name ? progressionFor(lesson, choices, name) : undefined;
  return saved
    ? { tonic: saved.tonic, mode: saved.mode }
    : keyFor(lesson, choices);
}

/** A chord figure in a key: each bar's chord, voiced. */
export interface ResolvedChordFigure {
  key: LiteracyKey;
  harmony: LiteracyHarmony;
  rhythm: readonly number[];
  /** Each bar's chord root, as a degree of the key's mode. */
  degrees: LiteracyScaleDegree[];
  /** Each bar's chord, voiced in D3–C♯4. */
  chords: VoicedChord[];
  /**
   * The progression it plays isn't chosen yet, so common chords stand in
   * (a preview): the player should send the student to choose first.
   */
  sample: boolean;
}

/**
 * A chord figure's chords, in the key it plays in: its own chords, the
 * saved progression's, or (the progression not chosen yet) a sample.
 */
export function resolveChordFigure(
  lesson: Pick<MusicLiteracyLesson, 'key' | 'keyChoice' | 'steps'>,
  figure: Pick<
    LiteracyChordFigure,
    'chords' | 'progression' | 'rhythm' | 'harmony'
  >,
  choices?: LiteracyChoices | null,
): ResolvedChordFigure {
  const name = figure.progression;
  const saved = name ? progressionFor(lesson, choices, name) : undefined;
  const key = saved
    ? { tonic: saved.tonic, mode: saved.mode }
    : keyFor(lesson, choices);
  const chooser = name ? chooserOf(lesson, name) : undefined;
  const template = saved?.template ?? chooser?.template;
  const progression =
    saved?.chords ??
    (chooser
      ? sampleProgression(chooser.template, chooser.distinct, key.mode)
      : undefined);
  const firstX = template?.indexOf('X') ?? -1;
  const x =
    (firstX >= 0 ? progression?.[firstX] : undefined) ??
    sampleProgression(['X'], 1, key.mode)[0];
  const degrees: LiteracyScaleDegree[] = figure.chords
    ? figure.chords.map((bar) => (bar === 'X' ? x : bar))
    : (progression ?? ['1']);
  const one = voicedChord(key, '1', figure.harmony)!;
  return {
    key,
    harmony: figure.harmony,
    rhythm: figure.rhythm,
    degrees,
    // A chord the mode leaves out (the schema keeps them out) plays the 1.
    chords: degrees.map(
      (degree) => voicedChord(key, degree, figure.harmony) ?? one,
    ),
    sample: !!name && !saved,
  };
}

/** A replay's passes: the progression once in each harmony, in order. */
export function resolveReplay(
  lesson: Pick<
    MusicLiteracyLesson,
    'key' | 'keyChoice' | 'steps' | 'timeSignature'
  >,
  step: LiteracyReplayStep,
  choices?: LiteracyChoices | null,
): ResolvedChordFigure[] {
  const rhythm = step.rhythm ?? [barTicks(lesson.timeSignature)];
  return replayHarmonies(step).map((harmony) =>
    resolveChordFigure(
      lesson,
      { progression: step.progression, rhythm, harmony },
      choices,
    ),
  );
}

/**
 * A chord figure's attacks from `start`: each bar's chord struck at every
 * value of the rhythm, back to back from the bar's downbeat.
 */
export function placeChords(
  chords: readonly VoicedChord[],
  rhythm: readonly number[],
  start: number,
  bar: number,
): ChordAttack[] {
  const attacks: ChordAttack[] = [];
  chords.forEach((chord, b) => {
    let tick = start + b * bar;
    for (const duration of rhythm) {
      attacks.push({
        index: attacks.length,
        bar: b,
        onset: tick,
        duration,
        chord,
      });
      tick += duration;
    }
  });
  return attacks;
}

/** Chord attacks as their notes, low to high per attack: the roll's notes. */
export function chordNotes(
  attacks: readonly ChordAttack[],
  tonic: number,
): TimedNote[] {
  const notes: TimedNote[] = [];
  for (const attack of attacks) {
    for (const midi of attack.chord.midis) {
      notes.push({
        midi,
        onset: attack.onset,
        duration: attack.duration,
        degree: degreeOfMidi(midi, tonic).degree,
        index: notes.length,
        attack: attack.index,
      });
    }
  }
  return notes;
}

/** A step's notes on its timeline, in the key it plays in. */
export interface StepNotes {
  timeline: StepTimeline;
  /** The 1's pitch. */
  tonic: number;
  key: LiteracyKey;
  words: TimedNote[];
  /** The call's notes; a chord call's chord notes. */
  call: TimedNote[];
  response: TimedNote[];
  /** A chord call's attacks (a replay's are all in `call`); null for notes. */
  chords: { call: ChordAttack[]; response: ChordAttack[] } | null;
  /** Its chords are a stand-in: the progression it plays isn't chosen yet. */
  sample: boolean;
}

/**
 * A step's three segments placed on its timeline, in its key (the student's
 * choice in `choices`, or the lesson's), read the lesson's way. A pickup's
 * syllables (negative ticks) land before the words' downbeat.
 */
export function stepNotes(
  lesson: MusicLiteracyLesson,
  step: LiteracyStep,
  choices?: LiteracyChoices | null,
): StepNotes {
  const timeline = stepTimeline(lesson, step);
  const key = stepKey(lesson, step, choices);
  const tonic = tonicMidi(key.tonic);
  const numbering = lesson.numbering ?? 'chromatic';
  const place = (
    notes: readonly (LiteracyNote | LiteracyWord)[],
    start: number,
  ): TimedNote[] =>
    notes.map((note, index) => ({
      midi: notePitch(note, key, numbering),
      onset: start + note.tick,
      duration: note.duration,
      degree: modalDegree(note.degree, key.mode, numbering),
      ...('text' in note ? { text: note.text } : {}),
      index,
    }));
  const base = { timeline, tonic, key, words: [], call: [], response: [] };

  if (step.kind === 'replay') {
    const passes = resolveReplay(lesson, step, choices);
    const once = timeline.call.length / Math.max(1, passes.length);
    const call = passes.flatMap((pass, p) =>
      placeChords(
        pass.chords,
        pass.rhythm,
        timeline.call.start + p * once,
        timeline.barTicks,
      ),
    );
    call.forEach((attack, index) => {
      attack.index = index;
    });
    return {
      ...base,
      call: chordNotes(call, tonic),
      chords: { call, response: [] },
      sample: passes.some((pass) => pass.sample),
    };
  }
  if (!isEchoStep(step)) return { ...base, chords: null, sample: false };

  const words = place(step.words?.notes ?? [], timeline.words.start);
  if (isChordFigure(step.call)) {
    const figure = resolveChordFigure(lesson, step.call, choices);
    const at = (start: number) =>
      placeChords(figure.chords, figure.rhythm, start, timeline.barTicks);
    const call = at(timeline.call.start);
    const response = at(timeline.response.start);
    return {
      ...base,
      words,
      call: chordNotes(call, tonic),
      response: chordNotes(response, tonic),
      chords: { call, response },
      sample: figure.sample,
    };
  }
  return {
    ...base,
    words,
    call: place(step.call.notes, timeline.call.start),
    response: place(
      (step.response ?? step.call).notes,
      timeline.response.start,
    ),
    chords: null,
    sample: false,
  };
}

/** Seconds per tick at a tempo in quarter notes per minute. */
export function secondsPerTick(tempo: number): number {
  return 60 / tempo / LITERACY_TPQ;
}

/** A run of steps under one section label ("Choose a Color"). */
export interface LiteracySection {
  /** The label; null for steps with none. */
  title: string | null;
  /** The steps' indices, in order. */
  steps: number[];
}

/** The lesson's steps grouped by their `section`, consecutive runs in order. */
export function lessonSections(
  lesson: Pick<MusicLiteracyLesson, 'steps'>,
): LiteracySection[] {
  const sections: LiteracySection[] = [];
  lesson.steps.forEach((step, index) => {
    const title = step.section ?? null;
    const last = sections.at(-1);
    if (last && last.title === title) last.steps.push(index);
    else sections.push({ title, steps: [index] });
  });
  return sections;
}
