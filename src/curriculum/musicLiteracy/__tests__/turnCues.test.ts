import { describe, expect, it } from 'vitest';
import type {
  LiteracyStep,
  MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';
import { LITERACY_FIXTURE } from '@/curriculum/engine/musicLiteracy/__fixtures__/literacyFixture';
import { stepTimeline } from '@/curriculum/engine/musicLiteracy/literacy';
import {
  applyCue,
  IDLE_RUN_VIEW,
  runCues,
  type RunMode,
} from '@/curriculum/engine/musicLiteracy/run';
import { hubHeadline, turnCueAt, turnCueSpans } from '../turnCues';

const lesson = LITERACY_FIXTURE;
const stepOf = (tag: string) => lesson.steps.find((s) => s.tag === tag)!;

/** A step's words moved `pickup` ticks earlier, sung into their downbeat. */
const withPickup = (step: LiteracyStep, pickup: number): LiteracyStep => ({
  ...step,
  words: {
    ...step.words,
    pickup,
    notes: step.words.notes.map((n) => ({ ...n, tick: n.tick - pickup })),
  },
});

/** What the hub says on each beat of a run, as the player draws it. */
function headlinesByBeat(
  l: MusicLiteracyLesson,
  step: LiteracyStep,
  mode: RunMode,
) {
  const timeline = stepTimeline(l, step);
  const [beatsPerBar] = l.timeSignature;
  const words = runCues(l, step, mode, { metronome: true }).filter(
    (c) => c.kind === 'note' && c.segment === 'words',
  ).length;
  let view = IDLE_RUN_VIEW;
  const said: string[] = [];
  for (const cue of runCues(l, step, mode, { metronome: true })) {
    view = applyCue(view, cue, words);
    if (cue.kind === 'beat') {
      said.push(hubHeadline(timeline, view.tick, beatsPerBar, mode).text);
    }
  }
  return said;
}

const times = (text: string, n: number) => Array<string>(n).fill(text);

describe('the turn cues', () => {
  // A bar of count-in, two of words, one of call, one of answer, in 4/4:
  // a beat is 480 ticks, a bar 1920.
  const timeline = stepTimeline(lesson, stepOf('note-called-c'));

  it('say Listen through the count-in and the words, Get Ready from the call, Go! on its last beat and the answer’s first', () => {
    expect(turnCueSpans(timeline, 4)).toEqual({
      listen: { start: 0, length: 5760 },
      getReady: { start: 5760, length: 1440 },
      go: { start: 7200, length: 960 },
    });
    expect(turnCueAt(timeline, 0, 4)).toBe('listen');
    expect(turnCueAt(timeline, 1920, 4)).toBe('listen'); // the words
    expect(turnCueAt(timeline, 5759, 4)).toBe('listen');
    expect(turnCueAt(timeline, 5760, 4)).toBe('getReady'); // the call
    expect(turnCueAt(timeline, 7199, 4)).toBe('getReady');
    // One beat before the answer, held into its first beat.
    expect(turnCueAt(timeline, 7200, 4)).toBe('go');
    expect(turnCueAt(timeline, 7680, 4)).toBe('go');
    expect(turnCueAt(timeline, 8159, 4)).toBe('go');
    expect(turnCueAt(timeline, 8160, 4)).toBeNull();
  });

  it('say nothing before the run or after it', () => {
    expect(turnCueAt(timeline, -1, 4)).toBeNull();
    expect(turnCueAt(timeline, 9600, 4)).toBeNull();
  });

  it('change on the beats, as the hub reads them through a run', () => {
    expect(headlinesByBeat(lesson, stepOf('note-called-c'), 'play')).toEqual([
      ...times('Listen', 12), // the count-in bar and two of words
      ...times('Get Ready', 3),
      ...times('Go!', 2), // the call's last beat, the answer's first
      ...times('Your turn', 3),
    ]);
  });

  it('cover a pickup with Listen: it’s sung over the count-in’s end', () => {
    const step = withPickup(stepOf('root-is-1'), 480);
    const picked = stepTimeline(lesson, step);
    expect(picked.pickup).toEqual({ start: 1440, length: 480 });
    expect(turnCueAt(picked, 1440, 4)).toBe('listen');
    expect(turnCueAt(picked, 1680, 4)).toBe('listen');
    expect(turnCueSpans(picked, 4)).toEqual(turnCueSpans(timeline, 4));
    expect(headlinesByBeat(lesson, step, 'play')).toEqual(
      headlinesByBeat(lesson, stepOf('note-called-c'), 'play'),
    );
  });

  it('cover a pickup with Listen in a lesson with no count-in: it gets its bar', () => {
    const bare = { ...lesson, countInBars: 0 };
    const picked = stepTimeline(bare, withPickup(stepOf('root-is-1'), 240));
    expect(turnCueAt(picked, 0, 4)).toBe('listen');
    expect(turnCueAt(picked, 1680, 4)).toBe('listen'); // the pickup
    expect(turnCueSpans(picked, 4).getReady.start).toBe(5760);
  });

  it('start on the words with no count-in', () => {
    const bare = { ...lesson, countInBars: 0 };
    const t = stepTimeline(bare, stepOf('note-called-c'));
    expect(turnCueSpans(t, 4)).toEqual({
      listen: { start: 0, length: 3840 },
      getReady: { start: 3840, length: 1440 },
      go: { start: 5280, length: 960 },
    });
    expect(headlinesByBeat(bare, stepOf('note-called-c'), 'play')).toEqual([
      ...times('Listen', 8),
      ...times('Get Ready', 3),
      ...times('Go!', 2),
      ...times('Your turn', 3),
    ]);
  });

  it('hold Get Ready through a two-bar call, Go! on its very last beat', () => {
    const t = stepTimeline(lesson, stepOf('major-triad'));
    expect(t.call).toEqual({ start: 5760, length: 3840 });
    expect(turnCueSpans(t, 4)).toEqual({
      listen: { start: 0, length: 5760 },
      getReady: { start: 5760, length: 3360 },
      go: { start: 9120, length: 960 },
    });
    expect(turnCueAt(t, 7680, 4)).toBe('getReady'); // the call's second bar
    expect(headlinesByBeat(lesson, stepOf('major-triad'), 'play')).toEqual([
      ...times('Listen', 12),
      ...times('Get Ready', 7),
      ...times('Go!', 2),
      ...times('Your turn', 7),
    ]);
  });

  it('count the meter’s beats: in 3/4, Go! a quarter before', () => {
    const waltz = { ...lesson, timeSignature: [3, 4] as [number, number] };
    const t = stepTimeline(waltz, stepOf('note-called-c'));
    expect(t.response.start).toBe(1440 * 4);
    expect(turnCueSpans(t, 3).go).toEqual({ start: 5760 - 480, length: 960 });
  });

  it('say the same in Listen, Practice and Play; after Go!, Listen’s answer is Atlas’s, LIKE THIS', () => {
    const step = stepOf('note-called-c');
    const play = headlinesByBeat(lesson, step, 'play');
    expect(headlinesByBeat(lesson, step, 'practice')).toEqual(play);
    expect(headlinesByBeat(lesson, step, 'listen')).toEqual([
      ...play.slice(0, 17),
      ...times('Like this', 3),
    ]);
    expect(hubHeadline(timeline, 7200, 4, 'listen')).toEqual({
      kind: 'cue',
      cue: 'go',
      text: 'Go!',
    });
    expect(hubHeadline(timeline, 8160, 4, 'listen')).toEqual({
      kind: 'turn',
      text: 'Like this',
    });
    expect(hubHeadline(timeline, 8160, 4, 'play')).toEqual({
      kind: 'turn',
      text: 'Your turn',
    });
  });

  it('name the call out of a run, and before its first click', () => {
    expect(hubHeadline(timeline, 2000, 4, null)).toEqual({
      kind: 'idle',
      text: 'The call',
    });
    expect(hubHeadline(timeline, -1, 4, 'play').text).toBe('The call');
  });

  it('don’t hang on the groove: its final downbeat, past the answer, is still YOUR TURN', () => {
    expect(hubHeadline(timeline, 9600, 4, 'play').text).toBe('Your turn');
  });

  it('start every cue on a beat the run draws, so each is seen as it’s heard', () => {
    for (const step of [
      ...lesson.steps,
      withPickup(stepOf('root-is-1'), 480),
    ]) {
      const t = stepTimeline(lesson, step);
      const beats = new Set(
        runCues(lesson, step, 'play', { metronome: false })
          .filter((c) => c.kind === 'beat')
          .map((c) => c.tick),
      );
      const spans = turnCueSpans(t, 4);
      for (const span of Object.values(spans)) {
        expect(beats.has(span.start)).toBe(true);
        expect(beats.has(span.start + span.length)).toBe(true);
      }
    }
  });
});
