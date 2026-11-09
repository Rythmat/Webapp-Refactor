import { describe, expect, it } from 'vitest';
import { LITERACY_FIXTURE } from '../__fixtures__/literacyFixture';
import {
  LITERACY_PASS_MARK,
  challengeTargets,
  challengeWindows,
  gradeChallenge,
  gradeResponse,
  isRightNote,
  type ChallengeTarget,
  type PlayedNote,
} from '../grading';
import { stepNotes, type TimedNote } from '../literacy';
import { applyCue, IDLE_RUN_VIEW, runCues, type RunCue } from '../run';

/**
 * The challenge, after a Part 1 step: "Go again and play ALL the notes!"
 * The same run, every note of the words, the call and the response a
 * target, each segment paired on its own, graded by the same rule; and the
 * teacher's turn, graded now, can be wrong.
 */

const lesson = LITERACY_FIXTURE;
const step = lesson.steps.find((s) => s.tag === 'add-the-3')!;
const notes = stepNotes(lesson, step);
const { timeline } = notes;
const targets = challengeTargets(notes);

const played = (list: readonly TimedNote[], late = 0): PlayedNote[] =>
  list.map((n) => ({
    midi: n.midi,
    onset: n.onset + late,
    duration: n.duration - 40,
  }));

const grade = (notesPlayed: PlayedNote[]) =>
  gradeChallenge(targets, notesPlayed, {
    timeline,
    tempo: 80,
    passMark: LITERACY_PASS_MARK,
  });

describe('the challenge’s targets', () => {
  it('are every note of the step, the words first, each with its segment', () => {
    expect(targets).toHaveLength(
      notes.words.length + notes.call.length + notes.response.length,
    );
    expect(targets.map((t) => t.segment)).toEqual([
      ...notes.words.map(() => 'words'),
      ...notes.call.map(() => 'call'),
      ...notes.response.map(() => 'response'),
    ]);
    expect(targets[0]).toMatchObject({
      midi: notes.words[0].midi,
      onset: notes.words[0].onset,
      text: notes.words[0].text,
    });
  });

  it('pair each segment from an eighth before it, to an eighth before the next', () => {
    const windows = challengeWindows(timeline, targets);
    expect(windows.words.start).toBe(timeline.words.start - 240);
    expect(windows.words.end).toBe(timeline.call.start - 240);
    expect(windows.call).toEqual({
      start: timeline.call.start - 240,
      end: timeline.response.start - 240,
    });
    expect(windows.response.end).toBe(timeline.total);
  });
});

describe('grading the challenge', () => {
  it('passes every note, right in time, at 100%', () => {
    const result = grade(played(targets));
    expect(result.percent).toBe(100);
    expect(result.passed).toBe(true);
    expect(result.pairs.every(Boolean)).toBe(true);
    expect(result.segments).toEqual({
      words: {
        targets: notes.words.length,
        hit: notes.words.length,
        extras: 0,
      },
      call: { targets: 3, hit: 3, extras: 0 },
      response: { targets: 3, hit: 3, extras: 0 },
    });
    expect(result.feedbackText).toBe(
      'Every note, right on time. Challenge complete!',
    );
  });

  it('scores lower for the words’ notes left out', () => {
    const noWords = grade(played([...notes.call, ...notes.response]));
    expect(noWords.percent).toBeLessThan(100);
    expect(noWords.segments.words.hit).toBe(0);
    expect(noWords.missedNotes).toHaveLength(notes.words.length);
    // The normal pass would have given this 100%.
    const normal = gradeResponse(notes.response, played(notes.response), {
      timeline,
      tempo: 80,
      passMark: LITERACY_PASS_MARK,
    });
    expect(normal.percent).toBe(100);
  });

  it('counts wrong notes in the teacher’s turn', () => {
    const wrongCall = grade([
      ...played(notes.words),
      ...played(notes.call).map((n) => ({ ...n, midi: n.midi + 2 })),
      ...played(notes.response),
    ]);
    expect(wrongCall.segments.call).toEqual({ targets: 3, hit: 0, extras: 3 });
    expect(wrongCall.wrongNotes).toHaveLength(3);
    expect(wrongCall.percent).toBeLessThan(
      grade(played([...notes.words, ...notes.response])).percent,
    );
  });

  it('never lets a note in the words answer the call', () => {
    const first = notes.call[0];
    // The call's first note, but early: still in the words' window.
    const early: PlayedNote = {
      midi: first.midi,
      onset: timeline.call.start - 300,
      duration: 200,
    };
    const result = grade([
      ...played(notes.words),
      early,
      ...played(notes.call.slice(1)),
      ...played(notes.response),
    ]);
    const callFirst = targets.findIndex(
      (t: ChallengeTarget) => t.segment === 'call' && t.index === 0,
    );
    expect(result.pairs[callFirst]).toBeNull();
    expect(result.segments.call.hit).toBe(2);
    // Its own segment heard it: an extra there, not an answer here.
    expect(result.segments.words.extras).toBe(1);
  });

  it('doesn’t hear the count-in before the words', () => {
    const noodling: PlayedNote = { midi: 61, onset: 100, duration: 200 };
    expect(grade([noodling, ...played(targets)]).percent).toBe(100);
  });
});

describe('the keyboard in the challenge', () => {
  const word = notes.words[1];
  const callNote = notes.call[1];

  it('grays a wrong key in the teacher’s turn, as the normal pass never does', () => {
    const wrong = word.midi + 1;
    expect(isRightNote(wrong, word.onset, notes.response, timeline)).toBe(true);
    expect(
      isRightNote(wrong, word.onset, targets, timeline, { challenge: true }),
    ).toBe(false);
    expect(
      isRightNote(word.midi, word.onset, targets, timeline, {
        challenge: true,
      }),
    ).toBe(true);
    expect(
      isRightNote(callNote.midi, callNote.onset, targets, timeline, {
        challenge: true,
      }),
    ).toBe(true);
    expect(
      isRightNote(callNote.midi + 1, callNote.onset, targets, timeline, {
        challenge: true,
      }),
    ).toBe(false);
  });

  it('leaves the count-in alone, and judges the response as ever', () => {
    expect(isRightNote(61, 100, targets, timeline, { challenge: true })).toBe(
      true,
    );
    const answer = notes.response[1];
    for (const challenge of [false, true]) {
      const list = challenge ? targets : notes.response;
      expect(
        isRightNote(answer.midi, answer.onset, list, timeline, { challenge }),
      ).toBe(true);
      expect(
        isRightNote(answer.midi + 1, answer.onset, list, timeline, {
          challenge,
        }),
      ).toBe(false);
    }
  });
});

describe('the challenge’s run', () => {
  const plain = runCues(lesson, step, 'play', { metronome: true });
  const challenge = runCues(lesson, step, 'play', {
    metronome: true,
    challenge: true,
  });
  const strip = (cues: RunCue[]) =>
    cues.map((cue) => {
      if (cue.kind !== 'beat' && cue.kind !== 'note') return cue;
      const rest: Record<string, unknown> = { ...cue };
      delete rest.playAlong;
      return rest;
    });

  it('is the same run: the same timeline, sounds, lights and end', () => {
    expect(strip(challenge)).toEqual(plain);
    expect(plain.some((c) => 'playAlong' in c)).toBe(false);
  });

  it('marks the words and the call, and their beats, to play along with', () => {
    const along = challenge.filter(
      (c) => (c.kind === 'note' || c.kind === 'beat') && c.playAlong,
    );
    expect(
      along
        .filter((c) => c.kind === 'note')
        .map((c) => c.kind === 'note' && c.segment),
    ).toEqual([
      ...notes.words.map(() => 'words'),
      ...notes.call.map(() => 'call'),
    ]);
    expect(
      challenge.some(
        (c) => c.kind === 'note' && c.segment === 'response' && c.playAlong,
      ),
    ).toBe(false);
    const view = (tick: number) =>
      challenge
        .filter((c) => c.tick <= tick)
        .reduce((v, c) => applyCue(v, c, notes.words.length), IDLE_RUN_VIEW);
    expect(view(timeline.words.start + 10).playAlong).toBe(true);
    expect(view(timeline.call.start + 10).playAlong).toBe(true);
    expect(view(timeline.response.start + 10).playAlong).toBe(false);
    expect(view(100).playAlong).toBeUndefined();
  });
});
