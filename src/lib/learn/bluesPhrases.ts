/**
 * The written melodic lines for the Major Blues and Minor Blues lessons.
 *
 * Every other Learn > Theory lesson generates its melodies from the contour
 * pool (see Games/content/melodyConstraints). The two blues scales don't:
 * these are transcriptions of Aaron's manuscript, and the whole point is that
 * the student plays THAT line, in that rhythm, every time.
 *
 * Kept scale-relative so a lesson in any key plays the same music: `offset` is
 * semitones from the lesson's tonic, negative reaching below it, and the ticks
 * are the phrase's own clock at PPQ 480 — one bar of 4/4 is 1920.
 *
 * Two things the manuscript has that the data does not:
 *   - Rests are the gaps. Nothing is written for them, so the response bars in
 *     the minor line are simply space in the clock.
 *   - A tie is one note of the combined length, which is how it is played.
 *
 * Every offset is a degree of its own scale, and `__tests__/bluesPhrases.test`
 * holds that line — a mistyped offset fails the suite rather than teaching a
 * wrong note.
 */

import type { ScaleLessonSlug } from './scaleLessons';

/** Ticks per quarter note. The Learn activities' clock. */
export const BLUES_PHRASE_PPQ = 480;

/** Ticks in a bar of 4/4. */
const BAR_TICKS = BLUES_PHRASE_PPQ * 4;

export interface BluesPhraseNote {
  /** Semitones from the lesson's tonic; negative reaches below it. */
  offset: number;
  startTicks: number;
  durationTicks: number;
}

export interface BluesPhrase {
  id: string;
  /** What the line is doing, for the activity's direction line. */
  description: string;
  /** Bars of 4/4 it is written over, its rests included. */
  bars: number;
  notes: BluesPhraseNote[];
}

/** The three phrases a lesson's melody chapter needs. */
export interface BluesLessonPhrases {
  /** Musical Contour — Hold, then Play Along. */
  short: BluesPhrase;
  /** Melodic Phrase — the long line, Hold then Play Along. */
  long: BluesPhrase;
  /** The staccato, legato and mixed exercises, which share one phrase. */
  articulation: BluesPhrase;
}

/**
 * A note written where a player would say it is: `bar` and `beat` are both
 * 1-based and `beats` is how long it is held, so an eighth on the and-of-4 of
 * bar 1 tied to a quarter is `note(1, 4.5, 12, 1.5)`.
 */
const note = (
  bar: number,
  beat: number,
  offset: number,
  beats: number,
): BluesPhraseNote => ({
  offset,
  startTicks: (bar - 1) * BAR_TICKS + Math.round((beat - 1) * BLUES_PHRASE_PPQ),
  durationTicks: Math.round(beats * BLUES_PHRASE_PPQ),
});

/**
 * Minor blues, the eight-bar line: four two-bar calls, each answered by a bar
 * of silence. Written in C — 1, ♭3, 4, ♭5 up and back down; then the ♭5 – 4 –
 * ♭3 turn twice, low; then ♯4 – 5 – ♭7 climbing home to the 1.
 *
 * The manuscript spells the blue note both ways, G♭ coming down and F♯ going
 * up. Both are offset 6; the staff takes its spelling from the lesson.
 */
const MINOR_BLUES_LINE: BluesPhrase = {
  id: 'minorblues-line',
  description: 'four calls, each answered by a bar of space',
  bars: 8,
  notes: [
    // Bar 1 — up to the ♭5 and back, holding over into bar 2.
    note(1, 1, 12, 0.5),
    note(1, 1.5, 15, 0.5),
    note(1, 2, 17, 0.5),
    note(1, 2.5, 18, 0.5),
    note(1, 3, 17, 1),
    note(1, 4, 15, 0.5),
    note(1, 4.5, 12, 1.5),
    // Bar 3 — the same shape an octave down, rocking ♭5 – 4 – ♭3.
    note(3, 1, 6, 0.5),
    note(3, 1.5, 5, 0.5),
    note(3, 2, 3, 0.5),
    note(3, 2.5, 5, 1.5),
    note(3, 4, 3, 1),
    // Bar 5 — down the scale from the ♭7 to the 1.
    note(5, 1, 10, 0.5),
    note(5, 1.5, 7, 0.5),
    note(5, 2, 6, 0.5),
    note(5, 2.5, 5, 1),
    note(5, 3.5, 3, 0.5),
    note(5, 4, 0, 1),
    // Bar 7 — ♯4 up through the 5 and ♭7 to the octave.
    note(7, 1, 6, 0.5),
    note(7, 1.5, 7, 0.5),
    note(7, 2, 10, 0.5),
    note(7, 2.5, 12, 1.5),
  ],
};

/**
 * Minor blues, the ascending call: ♭7 below the tonic up to the 5, straight
 * eighths, landing on a half note. The second bar is the student's answer.
 */
const MINOR_BLUES_CALL_UP: BluesPhrase = {
  id: 'minorblues-call-up',
  description: 'up from the ♭7 below to the 5, then a bar to answer',
  bars: 2,
  notes: [
    note(1, 1, -2, 0.5),
    note(1, 1.5, 0, 0.5),
    note(1, 2, 3, 0.5),
    note(1, 2.5, 5, 0.5),
    note(1, 3, 7, 2),
  ],
};

/**
 * Minor blues, the answering call: a sixteenth-note drop from the 5 to the 1,
 * dipping to the ♭7 below and settling back on the tonic.
 */
const MINOR_BLUES_CALL_DOWN: BluesPhrase = {
  id: 'minorblues-call-down',
  description: 'a sixteenth-note drop from the 5, settling on the 1',
  bars: 2,
  notes: [
    note(1, 1, 7, 0.25),
    note(1, 1.25, 5, 0.25),
    note(1, 1.5, 3, 0.25),
    note(1, 1.75, 0, 0.25),
    note(1, 2, -2, 0.5),
    note(1, 2.5, 0, 2.5),
  ],
};

/**
 * Major blues, the four-bar line. Written in F — the 6 and the ♭3 – 3 crush
 * that gives the scale its name, worked down to the 1 and back up.
 */
const MAJOR_BLUES_LINE: BluesPhrase = {
  id: 'majorblues-line',
  description: 'four bars working the ♭3 – 3 crush down to the 1',
  bars: 4,
  notes: [
    // Bar 1 — the 6, then ♭3 bending into the 3, down to the 1.
    note(1, 1, 9, 1),
    note(1, 2, 3, 0.5),
    note(1, 2.5, 4, 0.5),
    note(1, 3, 0, 0.5),
    // Bar 2 — from the octave down onto the same crush.
    note(2, 1, 12, 0.5),
    note(2, 1.5, 9, 0.5),
    note(2, 2, 3, 0.5),
    note(2, 2.5, 4, 0.5),
    // Bar 3 — 6, 5, ♭3, 2, resting on the 1.
    note(3, 1, 9, 0.5),
    note(3, 1.5, 7, 0.5),
    note(3, 2, 3, 0.5),
    note(3, 2.5, 2, 0.5),
    note(3, 3, 0, 1),
    // Bar 4 — down to the 6 below, then the crush once more.
    note(4, 1, 3, 0.5),
    note(4, 1.5, 2, 0.5),
    note(4, 2, 0, 0.5),
    note(4, 2.5, -3, 0.5),
    note(4, 3, 9, 0.5),
    note(4, 3.5, 3, 0.5),
    note(4, 4, 4, 0.5),
    note(4, 4.5, 0, 0.5),
  ],
};

/**
 * Major blues, the climb: straight eighths up the scale, twice — the second
 * time from the 5 below the tonic. The plainest statement of the scale, which
 * is why the articulation exercises use it.
 */
const MAJOR_BLUES_CLIMB: BluesPhrase = {
  id: 'majorblues-climb',
  description: 'straight eighths up the scale, twice',
  bars: 2,
  notes: [
    note(1, 1, 0, 0.5),
    note(1, 1.5, 2, 0.5),
    note(1, 2, 3, 0.5),
    note(1, 2.5, 4, 0.5),
    note(2, 1, -5, 0.5),
    note(2, 1.5, -3, 0.5),
    note(2, 2, 0, 0.5),
    note(2, 2.5, 2, 0.5),
    note(2, 3, 3, 0.5),
    note(2, 3.5, 4, 0.5),
  ],
};

/**
 * Major blues, the turn: the 1 held, then the climb through the crush up to
 * the 5.
 */
const MAJOR_BLUES_TURN: BluesPhrase = {
  id: 'majorblues-turn',
  description: 'the 1 held, then up through the crush to the 5',
  bars: 1,
  notes: [
    note(1, 1, 0, 1),
    note(1, 2, 2, 0.5),
    note(1, 2.5, 3, 0.5),
    note(1, 3, 4, 0.5),
    note(1, 3.5, 7, 0.5),
  ],
};

/**
 * Which written phrase each melody activity plays. A phrase never carries
 * across an In Time activity — short, long and articulation are three
 * different pieces of music, the same rule the generated lessons follow.
 */
const BLUES_LESSON_PHRASES: Partial<
  Record<ScaleLessonSlug, BluesLessonPhrases>
> = {
  minorblues: {
    short: MINOR_BLUES_CALL_DOWN,
    long: MINOR_BLUES_LINE,
    articulation: MINOR_BLUES_CALL_UP,
  },
  majorblues: {
    short: MAJOR_BLUES_TURN,
    long: MAJOR_BLUES_LINE,
    articulation: MAJOR_BLUES_CLIMB,
  },
};

/** Every phrase in the file, for the tests and for anything that surveys them. */
export const ALL_BLUES_PHRASES: BluesPhrase[] = [
  MINOR_BLUES_LINE,
  MINOR_BLUES_CALL_UP,
  MINOR_BLUES_CALL_DOWN,
  MAJOR_BLUES_LINE,
  MAJOR_BLUES_CLIMB,
  MAJOR_BLUES_TURN,
];

export { BLUES_LESSON_PHRASES };

/**
 * The written phrases for a lesson, or null for every lesson that generates
 * its melodies instead.
 */
export const getBluesPhrases = (
  mode: string | null | undefined,
): BluesLessonPhrases | null =>
  (mode && BLUES_LESSON_PHRASES[mode.toLowerCase() as ScaleLessonSlug]) || null;

/** A phrase note once it has been placed in the lesson's key. */
export interface TimedNote {
  midi: number;
  startTicks: number;
  durationTicks: number;
}

/** Place a written phrase in a key. `rootMidi` is the lesson's tonic. */
export const transposeBluesPhrase = (
  phrase: BluesPhrase,
  rootMidi: number,
): TimedNote[] =>
  phrase.notes.map((n) => ({
    midi: rootMidi + n.offset,
    startTicks: n.startTicks,
    durationTicks: n.durationTicks,
  }));
