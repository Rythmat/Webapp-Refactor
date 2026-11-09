import { describe, expect, it } from 'vitest';
import type {
  LiteracyStep,
  LiteracyWord,
  MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';
import {
  gradeResponse,
  LITERACY_PASS_MARK,
  responseWindow,
  type PlayedNote,
} from '../grading';
import { stepNotes, stepTimeline } from '../literacy';
import {
  applyCue,
  IDLE_RUN_VIEW,
  phaseAt,
  runCues,
  type BeatCue,
  type DrumCue,
  type NoteCue,
  type RunCue,
  type RunGroove,
  type RunView,
} from '../run';

/**
 * Words with a pickup: "When I" on beat 4 and its "and", at the end of the
 * count-in bar, into the words' downbeat. The count-in clicks on under it,
 * the teacher's turn starts with it, and nothing from the downbeat on
 * moves: the call, the answer, its grading and the drums.
 */

const syllable = (
  tick: number,
  duration: number,
  text: string,
  degree: LiteracyWord['degree'] = '1',
): LiteracyWord => ({ tick, duration, degree, text });

/** "When I add the 3, that's how to make Ma-jor", "When I" a pickup. */
const PICKUP_WORDS: LiteracyWord[] = [
  syllable(-480, 240, 'When'),
  syllable(-240, 240, 'I'),
  syllable(0, 480, 'add'),
  syllable(480, 480, 'the'),
  syllable(960, 480, '3', '3'),
  syllable(1440, 240, 'That’s'),
  syllable(1680, 240, 'how'),
  syllable(1920, 240, 'to'),
  syllable(2160, 240, 'make'),
  syllable(2400, 480, 'Ma-', '3'),
  syllable(2880, 480, 'jor', '3'),
];

const step = (
  words: LiteracyWord[] = PICKUP_WORDS,
  /** 0: none. */
  pickup = 480,
): LiteracyStep => ({
  tag: 'add-the-3',
  title: 'Add the 3',
  words: { bars: 2, ...(pickup ? { pickup } : {}), notes: words },
  call: {
    bars: 1,
    notes: [
      { tick: 0, duration: 480, degree: '1' },
      { tick: 480, duration: 480, degree: '3' },
      { tick: 960, duration: 480, degree: '1' },
    ],
  },
});

const lesson = (
  steps: LiteracyStep[] = [step()],
  countInBars = 1,
): MusicLiteracyLesson => ({
  id: 'pickup',
  name: 'Pickup',
  status: 'live',
  part: 1,
  key: { tonic: 'C', mode: 'major' },
  tempo: 80,
  timeSignature: [4, 4],
  countInBars,
  steps,
});

/** The same line sung from the downbeat, no pickup. */
const plainStep = step(
  PICKUP_WORDS.map((w) => ({ ...w, tick: w.tick + 480 })),
  0,
);

const beats = (cues: RunCue[]) =>
  cues.filter((c): c is BeatCue => c.kind === 'beat');
const notes = (cues: RunCue[], segment: NoteCue['segment']) =>
  cues.filter((c): c is NoteCue => c.kind === 'note' && c.segment === segment);
const drums = (cues: RunCue[]) =>
  cues.filter((c): c is DrumCue => c.kind === 'drum');

describe('a pickup on the step timeline', () => {
  it('sits at the end of the count-in, the words’ downbeat where it always is', () => {
    const timeline = stepTimeline(lesson(), step());
    expect(timeline).toMatchObject({
      countIn: { start: 0, length: 1920 },
      pickup: { start: 1440, length: 480 },
      words: { start: 1920, length: 3840 },
      call: { start: 5760, length: 1920 },
      response: { start: 7680, length: 1920 },
      total: 9600,
    });
    const plain = stepTimeline(lesson([plainStep]), plainStep);
    expect(plain.pickup).toEqual({ start: 1920, length: 0 });
    expect({ ...timeline, pickup: null }).toEqual({ ...plain, pickup: null });
  });

  it('places the pickup’s syllables before the downbeat: "When" on 4, "I" on its "and"', () => {
    const { words } = stepNotes(lesson(), step());
    expect(words.slice(0, 3).map((w) => [w.text, w.onset])).toEqual([
      ['When', 1440],
      ['I', 1680],
      ['add', 1920],
    ]);
  });

  it('counts in a bar for a pickup when the lesson counts in none', () => {
    const timeline = stepTimeline(lesson([step()], 0), step());
    expect(timeline.countIn).toEqual({ start: 0, length: 1920 });
    expect(timeline.pickup).toEqual({ start: 1440, length: 480 });
    expect(timeline.words.start).toBe(1920);
    // Without a pickup, none is none.
    expect(stepTimeline(lesson([plainStep], 0), plainStep).words.start).toBe(0);
    // Two bars of count-in: the pickup is at the end of the second.
    expect(stepTimeline(lesson([step()], 2), step()).pickup).toEqual({
      start: 3360,
      length: 480,
    });
  });
});

describe('a run with a pickup', () => {
  const play = runCues(lesson(), step(), 'play', { metronome: false });

  it('clicks every beat of the count-in, under the pickup too', () => {
    expect(
      beats(play)
        .filter((c) => c.click)
        .map((c) => c.tick),
    ).toEqual([0, 480, 960, 1440]);
  });

  it('sounds and lights the pickup like any syllable, before the downbeat', () => {
    const words = notes(play, 'words');
    expect(words.slice(0, 3).map((n) => n.tick)).toEqual([1440, 1680, 1920]);
    expect(words.every((n) => n.sound && n.light)).toBe(true);
  });

  it('is the teacher’s turn from the first pickup syllable', () => {
    const phaseOf = (tick: number) =>
      beats(play).find((c) => c.tick === tick)!.phase;
    expect(phaseOf(960)).toBe('countIn');
    expect(phaseOf(1440)).toBe('words');
    expect(phaseOf(1920)).toBe('words');
    const timeline = stepTimeline(lesson(), step());
    expect(phaseAt(timeline, 1440)).toBe('countIn'); // by the bars alone
    expect(phaseAt(timeline, 1440, 1440)).toBe('words');
  });

  it('turns the hub to MY TURN and lights "When" on beat 4, "I" on its "and"', () => {
    const wordCount = PICKUP_WORDS.length;
    const viewAt = (tick: number): RunView =>
      play
        .filter((c) => c.tick <= tick)
        .reduce((v, c) => applyCue(v, c, wordCount), IDLE_RUN_VIEW);
    expect(viewAt(1000)).toMatchObject({ phase: 'countIn', beat: 2, word: -1 });
    expect(viewAt(1440)).toMatchObject({ phase: 'words', beat: 3, word: 0 });
    expect(viewAt(1680)).toMatchObject({ phase: 'words', beat: 3, word: 1 });
    expect(viewAt(1920)).toMatchObject({ phase: 'words', beat: 0, word: 2 });
  });

  it('turns to the teacher at a pickup syllable off the beat', () => {
    // Just "I", on the "and" of 4: beat 4 still counts in.
    const late = step(PICKUP_WORDS.slice(1), 480);
    const cues = runCues(lesson([late]), late, 'listen', { metronome: false });
    expect(beats(cues).find((c) => c.tick === 1440)!.phase).toBe('countIn');
    const viewAt = (tick: number): RunView =>
      cues
        .filter((c) => c.tick <= tick)
        .reduce((v, c) => applyCue(v, c, 10), IDLE_RUN_VIEW);
    expect(viewAt(1500).phase).toBe('countIn');
    expect(viewAt(1680)).toMatchObject({ phase: 'words', word: 0 });
  });

  it('moves nothing from the downbeat on: the call, the answer and the pulse', () => {
    const plain = runCues(lesson([plainStep]), plainStep, 'play', {
      metronome: false,
    });
    const after = (cues: RunCue[]) =>
      cues.filter(
        (c) =>
          !(c.kind === 'note' || c.kind === 'noteEnd') || c.segment !== 'words',
      );
    // Only the count-in's last beat changes hands: the pickup is on it.
    const pulse = (cues: RunCue[]) =>
      after(cues).map((c) => (c.kind === 'beat' ? { ...c, phase: null } : c));
    expect(pulse(play)).toEqual(pulse(plain));
  });

  it('brings the drums in on the real downbeat, not under the pickup', () => {
    const rock: RunGroove = {
      loopTicks: 1920,
      hits: [0, 480, 960, 1440].map((tick) => ({
        tick,
        note: tick % 960 ? 38 : 36,
        velocity: 100,
      })),
    };
    const over = runCues(lesson(), step(), 'play', {
      metronome: false,
      groove: rock,
    });
    expect(drums(over)[0].tick).toBe(1920);
    expect(drums(over).some((c) => c.tick < 1920)).toBe(false);
    // The count-in still clicks all four, the pickup's beat included.
    expect(
      beats(over)
        .filter((c) => c.click)
        .map((c) => c.tick),
    ).toEqual([0, 480, 960, 1440]);
  });
});

describe('grading with a pickup', () => {
  /** Quarter notes from the answer's downbeat (7680), `late` ticks off. */
  const answer = (midis: number[], late = 0): PlayedNote[] =>
    midis.map((midi, i) => ({
      midi,
      onset: 7680 + i * 480 + late,
      duration: 400,
    }));
  const grade = (s: LiteracyStep, played: PlayedNote[]) => {
    const { response, timeline, call } = stepNotes(lesson([s]), s);
    return gradeResponse(response, played, {
      timeline,
      tempo: 80,
      passMark: LITERACY_PASS_MARK,
      call,
    });
  };

  it('grades the answer exactly as without one', () => {
    for (const played of [
      answer([60, 64, 60]),
      answer([60, 64, 60], 90),
      answer([60, 62, 60]),
      answer([60, 64]),
    ]) {
      expect(grade(step(), played)).toEqual(grade(plainStep, played));
    }
    expect(grade(step(), answer([60, 64, 60]))).toMatchObject({
      percent: 100,
      passed: true,
    });
    expect(responseWindow(stepTimeline(lesson(), step()))).toEqual(
      responseWindow(stepTimeline(lesson([plainStep]), plainStep)),
    );
  });
});
