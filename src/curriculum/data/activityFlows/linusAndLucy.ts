/**
 * Linus and Lucy (Vince Guaraldi) — a trial song lesson, DEV only.
 *
 * Learn has no song lessons yet: this tests the format on one song. The song
 * is under copyright and songLibrary.ts keeps melody out of the song library,
 * so nothing here reaches production (LearnRoutes.linusAndLucy is registered,
 * and its tile shown, only under import.meta.env.DEV) until it is licensed.
 *
 * The notes were measured frame by frame from a falling-note tutorial's two
 * play-throughs of the main theme, and checked against a second teacher's
 * hand-by-hand account. The B section isn't here: no falling notes to measure.
 *
 * Like Applied Theory Fundamentals, the flow stays out of the genre registry:
 * this isn't a genre, and those tables are tied to the audio engine's.
 */

import type { ActivitySectionId } from '@/curriculum/types/activity';
import type {
  ActivityFlowV2,
  ActivityStepV2,
  TargetNote,
} from '@/curriculum/types/activity.v2';
import type { PianoFinger } from '@/lib/learn/pianoFingering/types';

const EIGHTH = 240;
/** Sounding length under the written one, so repeated notes re-attack. */
const RELEASE = 40;
/**
 * Every phrase starts on the "and" of 4: the anticipated low A♭. Written from
 * here, with the first bar's rest before it, the barlines fall where they do
 * in the song.
 */
const PICKUP = 7 * EIGHTH;

/** A note on the phrase's eighth-note grid: [start, length, midi, finger]. */
type Cell = readonly [number, number, number, PianoFinger];
/** One attack of two right-hand notes. */
type Dyad = readonly [
  readonly [number, PianoFinger],
  readonly [number, PianoFinger],
];

// ── Left hand ───────────────────────────────────────────────────────────────

/** Two hits of a three-note shape, 8 eighths long: long, short × 4, long. */
function lhBar(low: number, middle: number, top: number): Cell[] {
  return [
    [0, 2, low, 5],
    [2, 1, middle, 2],
    [3, 1, top, 1],
    [4, 1, low, 5],
    [5, 1, middle, 2],
    [6, 2, top, 1],
  ];
}

const AB1 = 32;
const EB2 = 39;
const F2 = 41;
const AB2 = 44;
const CB2 = 35; // C♭ (B on the keyboard)
const GB2 = 42;
const CB3 = 47;

const HOME_BAR = lhBar(AB1, EB2, AB2);
const SECOND_BAR = lhBar(AB1, EB2, F2);
const MOVED_BAR = lhBar(CB2, GB2, CB3);
const MOVED_SECOND_BAR = lhBar(CB2, GB2, AB2);

const HOME_LH = [HOME_BAR, SECOND_BAR];
const MOVED_LH = [MOVED_BAR, MOVED_SECOND_BAR];

// ── Right hand ──────────────────────────────────────────────────────────────

const POS_1: Dyad = [
  [60, 1],
  [68, 3],
]; // C, A♭
const POS_2: Dyad = [
  [63, 2],
  [70, 4],
]; // E♭, B♭
const POS_3: Dyad = [
  [68, 3],
  [72, 5],
]; // A♭, C
const EB_AB: Dyad = [
  [63, 2],
  [68, 3],
]; // E♭, A♭

type RhEvent = readonly [number, number, Dyad];

const PART_1_RH: RhEvent[] = [
  [0, 2, POS_1],
  [2, 1, POS_2],
  [3, 1, POS_3],
  [5, 1, POS_3],
  [6, 1, POS_2],
  [7, 2, POS_1],
  [9, 3, POS_2],
  [12, 3, POS_1],
];
const PART_2_RH: RhEvent[] = [
  [0, 2, POS_1],
  [2, 1, POS_2],
  [3, 1, POS_3],
  [5, 10, POS_3],
];
const PART_4_RH: RhEvent[] = [
  [0, 4, EB_AB],
  [4, 1, POS_2],
  [5, 10, POS_2],
];
const PART_5_RH: RhEvent[] = [
  [0, 4, POS_1],
  [4, 1, POS_2],
  [5, 10, POS_2],
];

/** A two-bar part of the theme. Part 3 is Part 1 again. */
interface Part {
  lh: readonly Cell[][];
  rh: readonly RhEvent[];
}

const PART_1: Part = { lh: HOME_LH, rh: PART_1_RH };
const PART_2: Part = { lh: HOME_LH, rh: PART_2_RH };
const PART_4: Part = { lh: MOVED_LH, rh: PART_4_RH };
const PART_5: Part = { lh: HOME_LH, rh: PART_5_RH };

/** The main theme, as it runs. */
export const THEME_FORM: readonly Part[] = [
  PART_1,
  PART_2,
  PART_1,
  PART_4,
  PART_5,
];

// ── Cells to notes ──────────────────────────────────────────────────────────

const BAR_CELLS = 8;

const toNote = (
  start: number,
  length: number,
  midi: number,
  finger: PianoFinger,
  hand: 'lh' | 'rh',
): TargetNote => ({
  midi,
  onset: PICKUP + start * EIGHTH,
  duration: length * EIGHTH - RELEASE,
  hand,
  finger,
});

function lhNotes(bars: readonly (readonly Cell[])[], from = 0): TargetNote[] {
  return bars.flatMap((bar, b) =>
    bar.map(([start, length, midi, finger]) =>
      toNote(from + b * BAR_CELLS + start, length, midi, finger, 'lh'),
    ),
  );
}

function rhNotes(events: readonly RhEvent[], from = 0): TargetNote[] {
  return events.flatMap(([start, length, dyad]) =>
    dyad.map(([midi, finger]) =>
      toNote(from + start, length, midi, finger, 'rh'),
    ),
  );
}

const PART_CELLS = 2 * BAR_CELLS;

function formLh(parts: readonly Part[]): TargetNote[] {
  return parts.flatMap((part, i) => lhNotes(part.lh, i * PART_CELLS));
}

function formRh(parts: readonly Part[]): TargetNote[] {
  return parts.flatMap((part, i) => rhNotes(part.rh, i * PART_CELLS));
}

const bothHands = (parts: readonly Part[]): TargetNote[] => [
  ...formLh(parts),
  ...formRh(parts),
];

/** Notes on the beat, one at a time: for finding a hand shape. */
function shapeNotes(
  midis: readonly (readonly (readonly [number, PianoFinger])[])[],
  hand: 'lh' | 'rh',
): TargetNote[] {
  return midis.flatMap((attack, beat) =>
    attack.map(([midi, finger]) => ({
      midi,
      onset: beat * 480,
      duration: 440,
      hand,
      finger,
    })),
  );
}

// ── Steps ───────────────────────────────────────────────────────────────────

// The lesson only completes a wait-for-me step by itself on pitch_only.
const WAIT = 'pitch_only';
const IN_TIME = 'pitch_order_timing';

const TWO_HANDS: ActivityStepV2['instrument_config'] = {
  instrument: 'piano',
  hand_config: 'lh_bass_rh_melody',
  lh_role: 'bass',
  rh_role: 'melody',
  style_ref: 'l1a',
};

let stepNumber = 0;

function step(
  section: ActivitySectionId,
  subsection: string,
  activity: string,
  direction: string,
  assessment: ActivityStepV2['assessment'],
  successFeedback: string,
  tempo: number,
  targetNotes: TargetNote[],
  extra: Partial<ActivityStepV2> = {},
): ActivityStepV2 {
  stepNumber += 1;
  return {
    stepNumber,
    module: 'linus_and_lucy',
    section,
    subsection,
    activity,
    direction,
    assessment,
    tag: `linus_and_lucy:${activity.split(':')[0].toLowerCase()} | linus_and_lucy`,
    styleRef: 'l1a',
    successFeedback,
    tempo,
    targetNotes,
    ...extra,
  };
}

const rightHandSteps = (): ActivityStepV2[] => [
  step(
    'A',
    'A1: The Three Positions',
    'A1.1: Three Positions',
    'The whole melody lives in three double notes: C and A♭ (fingers 1 and 3), E♭ and B♭ (2 and 4), A♭ and C (3 and 5). Walk up and back, at your own pace.',
    WAIT,
    'Three positions, under your fingers.',
    72,
    shapeNotes([POS_1, POS_2, POS_3, POS_2, POS_1], 'rh'),
  ),
  step(
    'A',
    'A2: Part 1',
    'A2.1: Part 1 (At Your Pace)',
    'Up, up, same, down, down, up, down. Once you know the positions, you only need to track the direction.',
    WAIT,
    'That’s the melody everyone knows.',
    72,
    rhNotes(PART_1_RH),
  ),
  step(
    'A',
    'A2: Part 1',
    'A2.2: Part 1 (In Time)',
    'The same notes in a steady tempo. The first one comes before the bar line: it’s on the "and" of 4.',
    IN_TIME,
    'In the pocket.',
    84,
    rhNotes(PART_1_RH),
  ),
  step(
    'A',
    'A3: Part 2',
    'A3.1: Part 2 (At Your Pace)',
    'It starts like Part 1, then lands on A♭ and C and holds them.',
    WAIT,
    'Fewer notes, and just as catchy.',
    72,
    rhNotes(PART_2_RH),
  ),
  step(
    'A',
    'A3: Part 2',
    'A3.2: Part 2 (In Time)',
    'Hold the last double note for its full length, nearly two bars.',
    IN_TIME,
    'Nicely held.',
    84,
    rhNotes(PART_2_RH),
  ),
  step(
    'A',
    'A4: Part 4',
    'A4.1: Part 4 (At Your Pace)',
    'Part 3 is Part 1 again, so you already have it. Part 4 is new: E♭ and A♭, then E♭ and B♭ twice.',
    WAIT,
    'Only three attacks there.',
    72,
    rhNotes(PART_4_RH),
  ),
  step(
    'A',
    'A4: Part 4',
    'A4.2: Part 4 (In Time)',
    'Leave lots of space: the left hand has the room to itself here.',
    IN_TIME,
    'Good, patient counting.',
    84,
    rhNotes(PART_4_RH),
  ),
  step(
    'A',
    'A5: Part 5',
    'A5.1: Part 5 (At Your Pace)',
    'The same rhythm as Part 4, starting from C and A♭ instead.',
    WAIT,
    'That’s the last new notes in the right hand.',
    72,
    rhNotes(PART_5_RH),
  ),
  step(
    'A',
    'A5: Part 5',
    'A5.2: Part 5 (In Time)',
    'Count through the long hold so you’re ready for the top of the theme.',
    IN_TIME,
    'Right hand, every part.',
    84,
    rhNotes(PART_5_RH),
  ),
  step(
    'A',
    'A6: The Whole Right Hand',
    'A6.1: The Whole Right Hand',
    'All five parts in a row: 1, 2, 1, 4, 5.',
    IN_TIME,
    'The whole melody, from memory soon.',
    92,
    formRh(THEME_FORM),
  ),
];

const leftHandSteps = (): ActivityStepV2[] => [
  step(
    'B',
    'B1: The Two Shapes',
    'B1.1: The Home Shape',
    'Pinky and thumb an octave apart on A♭, with your index finger over E♭. Play them bottom to top, at your own pace.',
    WAIT,
    'That’s the shape the whole song sits on.',
    72,
    shapeNotes(
      [[[AB1, 5]], [[EB2, 2]], [[AB2, 1]], [[AB1, 5]], [[EB2, 2]], [[AB2, 1]]],
      'lh',
    ),
  ),
  step(
    'B',
    'B1: The Two Shapes',
    'B1.2: The Second Shape',
    'Only your thumb moves: from A♭ down to F.',
    WAIT,
    'One finger, one new sound.',
    72,
    shapeNotes(
      [[[AB1, 5]], [[EB2, 2]], [[F2, 1]], [[AB1, 5]], [[EB2, 2]], [[F2, 1]]],
      'lh',
    ),
  ),
  step(
    'B',
    'B2: The Intro',
    'B2.1: The Intro (At Your Pace)',
    'One bar of the home shape, one bar of the second. Each low A♭ comes early, before the bar line.',
    WAIT,
    'You’ve got the figure.',
    72,
    lhNotes(HOME_LH),
  ),
  step(
    'B',
    'B2: The Intro',
    'B2.2: The Intro (In Time)',
    'Play it twice. Don’t square it off: that early low A♭ is what makes it swing.',
    IN_TIME,
    'Everyone knows that part, and now you play it.',
    84,
    lhNotes([...HOME_LH, ...HOME_LH]),
  ),
  step(
    'B',
    'B2: The Intro',
    'B2.3: The Intro (Faster)',
    'Same figure, closer to tempo. Keep your hand loose.',
    IN_TIME,
    'That’s rolling.',
    112,
    lhNotes([...HOME_LH, ...HOME_LH]),
  ),
  step(
    'B',
    'B3: The Moved Shape',
    'B3.1: The Moved Shape (At Your Pace)',
    'The same hand shape moves up to C♭ (B on the keyboard), G♭ and C♭. In the second bar your thumb drops to A♭, once.',
    WAIT,
    'Same shape, new place.',
    72,
    lhNotes(MOVED_LH),
  ),
  step(
    'B',
    'B3: The Moved Shape',
    'B3.2: The Moved Shape (In Time)',
    'Keep the rhythm exactly as it was at home.',
    IN_TIME,
    'A clean move.',
    84,
    lhNotes(MOVED_LH),
  ),
  step(
    'B',
    'B4: The Whole Left Hand',
    'B4.1: The Whole Left Hand',
    'Home for six bars, moved for two, home for two.',
    IN_TIME,
    'The whole left hand. It should start to run by itself.',
    92,
    formLh(THEME_FORM),
  ),
];

const togetherSteps = (): ActivityStepV2[] => [
  step(
    'C',
    'C1: Part 1',
    'C1.1: The First Bar (At Your Pace)',
    'This is where it gets tricky, so go note by note. Ask of each one: both hands, left only or right only? Here it’s both, both, both, left, both, both, right.',
    WAIT,
    'That’s the hardest bar in the song.',
    60,
    [...lhNotes([HOME_BAR]), ...rhNotes(PART_1_RH.slice(0, 6))],
    { instrument_config: TWO_HANDS },
  ),
  step(
    'C',
    'C1: Part 1',
    'C1.2: Part 1 (At Your Pace)',
    'In the second bar the right hand mostly waits while the left keeps moving.',
    WAIT,
    'Both hands, all of Part 1.',
    60,
    bothHands([PART_1]),
    { instrument_config: TWO_HANDS },
  ),
  step(
    'C',
    'C1: Part 1',
    'C1.3: Part 1 (In Time)',
    'Slow enough to be right every time. A bar a day is real progress here.',
    IN_TIME,
    'Coordination: that’s the mountain, climbed.',
    72,
    bothHands([PART_1]),
    { instrument_config: TWO_HANDS },
  ),
  step(
    'C',
    'C2: Part 2',
    'C2.1: Part 2 (At Your Pace)',
    'The same alignment as Part 1, then the right hand holds while the left runs on its own.',
    WAIT,
    'Much less to juggle.',
    60,
    bothHands([PART_2]),
    { instrument_config: TWO_HANDS },
  ),
  step(
    'C',
    'C2: Part 2',
    'C2.2: Part 2 (In Time)',
    'Keep the right hand down through the whole held note.',
    IN_TIME,
    'Steady.',
    72,
    bothHands([PART_2]),
    { instrument_config: TWO_HANDS },
  ),
  step(
    'C',
    'C3: Part 4',
    'C3.1: Part 4 (At Your Pace)',
    'The left hand moves up to C♭ as the right hand plays E♭ and A♭, together.',
    WAIT,
    'The change is in your hands now.',
    60,
    bothHands([PART_4]),
    { instrument_config: TWO_HANDS },
  ),
  step(
    'C',
    'C3: Part 4',
    'C3.2: Part 4 (In Time)',
    'Three left-hand notes pass before the right hand moves again.',
    IN_TIME,
    'Well counted.',
    72,
    bothHands([PART_4]),
    { instrument_config: TWO_HANDS },
  ),
  step(
    'C',
    'C4: Part 5',
    'C4.1: Part 5 (At Your Pace)',
    'The left hand is home again. The right hand has the Part 4 rhythm.',
    WAIT,
    'Every part is now hands together.',
    60,
    bothHands([PART_5]),
    { instrument_config: TWO_HANDS },
  ),
  step(
    'C',
    'C4: Part 5',
    'C4.2: Part 5 (In Time)',
    'The song’s tension resolves here: enjoy the long hold.',
    IN_TIME,
    'Lovely.',
    72,
    bothHands([PART_5]),
    { instrument_config: TWO_HANDS },
  ),
];

const DRUMS: ActivityStepV2['backing_parts'] = {
  engine_generates: ['drums'],
  student_plays: ['bass', 'melody'],
};

const playAlongSteps = (): ActivityStepV2[] => [
  step(
    'D',
    'D1: The Main Theme',
    'D1.1: The Main Theme (Slow)',
    'All five parts, hands together, with drums. Don’t chase the tempo.',
    IN_TIME,
    'The whole theme, end to end.',
    84,
    bothHands(THEME_FORM),
    {
      instrument_config: TWO_HANDS,
      backing_parts: DRUMS,
      grooveId: 'groove_pop_01',
    },
  ),
  step(
    'D',
    'D1: The Main Theme',
    'D1.2: The Main Theme (Faster)',
    'Same form, closer to tempo.',
    IN_TIME,
    'It’s starting to dance.',
    112,
    bothHands(THEME_FORM),
    {
      instrument_config: TWO_HANDS,
      backing_parts: DRUMS,
      grooveId: 'groove_pop_01',
    },
  ),
  step(
    'D',
    'D1: The Main Theme',
    'D1.3: The Main Theme (Up to Tempo)',
    'At full speed. Hold every long note for its full length.',
    'pitch_order_timing_duration',
    'Linus and Lucy: you can play it.',
    138,
    bothHands(THEME_FORM),
    {
      instrument_config: TWO_HANDS,
      backing_parts: DRUMS,
      grooveId: 'groove_pop_01',
    },
  ),
];

export function buildLinusAndLucyFlow(): ActivityFlowV2 {
  stepNumber = 0;
  return {
    genre: 'linus-and-lucy',
    level: 1,
    version: 'v2',
    title: 'Linus and Lucy',
    params: {
      defaultKey: 'Ab Major (Ionian)',
      defaultScale: [0, 2, 4, 5, 7, 9, 11],
      defaultScaleId: 'major',
      tempoRange: [60, 138],
      swing: 0,
      grooves: [],
    },
    sections: [
      { id: 'A', name: 'Right Hand', steps: rightHandSteps() },
      { id: 'B', name: 'Left Hand', steps: leftHandSteps() },
      { id: 'C', name: 'Hands Together', steps: togetherSteps() },
      { id: 'D', name: 'Play-Along', steps: playAlongSteps() },
    ],
  };
}
