/**
 * A small Part 2 lesson for the tests: one step of every kind, a melody in
 * scale numbering, chord calls of their own chords and of saved
 * progressions, and a replay. Frozen here, so the real Part 2 seed
 * (src/curriculum/data/musicLiteracy/music-literacy-part-2.json) stays free
 * to change in the console's editor. Only tests import it.
 */

import type {
  LiteracyStep,
  MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';

const q = (
  tick: number,
  degree: '1' | '2' | '3' | '5' | '6' | '7',
  octave?: number,
) => ({
  tick,
  duration: 480,
  degree,
  ...(octave ? { octave } : {}),
});

export const PART2_STEPS = {
  key: { kind: 'chooseKey', tag: 'choose-key', title: 'Choose your key' },
  triad: {
    tag: 'one-three-five',
    section: 'Choose a Color',
    title: '1-3-5',
    call: { bars: 1, notes: [q(0, '1'), q(480, '3'), q(960, '5')] },
  },
  mode: { kind: 'chooseMode', tag: 'choose-mode', title: 'Major or minor?' },
  neighbor: {
    tag: 'one-seven-one',
    section: 'Create a Melody',
    title: '1-7-1',
    call: { bars: 1, notes: [q(0, '1'), q(480, '7', -1), q(960, '1')] },
  },
  ones: {
    tag: 'the-1-chord',
    section: 'Chords',
    title: 'The 1 chord',
    call: { chords: ['1', '4'], rhythm: [480, 480, 960], harmony: 'triads' },
  },
  chooseX: {
    kind: 'chooseChords',
    tag: 'choose-x',
    section: 'Chords',
    title: 'Choose your X',
    template: ['1', 'X'],
    distinct: 1,
    harmony: 'triads',
    saveAs: 'one-x',
  },
  oneX: {
    tag: 'play-1-x',
    section: 'Chords',
    title: 'Play 1 X',
    call: { progression: 'one-x', rhythm: [480, 480, 960], harmony: 'triads' },
  },
  xOne: {
    tag: 'play-x-1',
    section: 'Chords',
    title: 'Play X 1',
    call: {
      chords: ['X', '1'],
      progression: 'one-x',
      rhythm: [480, 480, 960],
      harmony: 'sevenths',
    },
  },
  chooseFour: {
    kind: 'chooseChords',
    tag: 'choose-four',
    section: '7th Chords',
    title: 'Four chords',
    template: ['X', 'X', 'X', 'X'],
    distinct: 4,
    harmony: 'sevenths',
    saveAs: 'four',
  },
  replay: {
    kind: 'replay',
    tag: 'hear-four',
    section: '7th Chords',
    title: 'Your four, with 7ths',
    progression: 'four',
  },
} satisfies Record<string, LiteracyStep>;

export const PART2_FIXTURE: MusicLiteracyLesson = {
  id: 'part-2-fixture',
  name: 'Part 2 fixture',
  status: 'draft',
  part: 2,
  key: { tonic: 'C', mode: 'major' },
  keyChoice: 'student',
  numbering: 'scale',
  passes: { challenge: false, create: true },
  tempo: 80,
  timeSignature: [4, 4],
  countInBars: 1,
  steps: Object.values(PART2_STEPS),
};

/** A step of the fixture by its tag. */
export const part2Step = (tag: string): LiteracyStep =>
  PART2_FIXTURE.steps.find((step) => step.tag === tag)!;

/**
 * The same lesson opening on a gate, as the Part 2 seed does: the key, then
 * major or minor, alone in "Choose a Color" (so it is the gate, not a
 * module), and 1-3-5 moved to the start of Create a Melody. By section:
 *
 *   Choose a Color   choose-key, choose-mode                (the gate)
 *   Create a Melody  one-three-five, one-seven-one
 *   Chords           the-1-chord, choose-x, play-1-x, play-x-1
 *   7th Chords       choose-four, hear-four
 */
export const PART2_GATED_FIXTURE: MusicLiteracyLesson = {
  ...PART2_FIXTURE,
  id: 'part-2-gated-fixture',
  name: 'Part 2 gated fixture',
  steps: [
    { ...PART2_STEPS.key, section: 'Choose a Color' },
    { ...PART2_STEPS.mode, section: 'Choose a Color' },
    { ...PART2_STEPS.triad, section: 'Create a Melody' },
    PART2_STEPS.neighbor,
    PART2_STEPS.ones,
    PART2_STEPS.chooseX,
    PART2_STEPS.oneX,
    PART2_STEPS.xOne,
    PART2_STEPS.chooseFour,
    PART2_STEPS.replay,
  ],
};
