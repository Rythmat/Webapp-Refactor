import { describe, expect, it } from 'vitest';
import { LITERACY_FIXTURE } from '../__fixtures__/literacyFixture';
import {
  LITERACY_PASS_MARK,
  gradeResponse,
  inResponse,
  isRightNote,
  pairResponse,
  passMarkOf,
  TIMING_FLOOR,
  type PlayedNote,
} from '../grading';
import { stepNotes } from '../literacy';
import { runCues, type NoteCue, type RunGroove } from '../run';

const lesson = LITERACY_FIXTURE;
const step = (tag: string) => lesson.steps.find((s) => s.tag === tag)!;

/** The step's answer, graded at 80 against the series mark. */
function grade(tag: string, played: PlayedNote[]) {
  const { response, timeline } = stepNotes(lesson, step(tag));
  return gradeResponse(response, played, {
    timeline,
    tempo: 80,
    passMark: LITERACY_PASS_MARK,
  });
}

/** Quarter notes from the answer's downbeat (7680), `late` ticks off. */
const answer = (midis: number[], late = 0): PlayedNote[] =>
  midis.map((midi, i) => ({
    midi,
    onset: 7680 + i * 480 + late,
    duration: 400,
  }));

describe('grading the answer', () => {
  it('passes the right notes in time, at 100%', () => {
    const result = grade('add-the-3', answer([60, 64, 60]));
    expect(result).toMatchObject({
      percent: 100,
      passed: true,
      pitchAccuracy: 1,
      missedNotes: [],
      wrongNotes: [],
    });
    expect(result.timingAccuracy).toBeCloseTo(1);
    expect(result.outcomes?.map((o) => o.status)).toEqual([
      'hit',
      'hit',
      'hit',
    ]);
  });

  it('takes points off for playing late, more the later', () => {
    const slightly = grade('add-the-3', answer([60, 64, 60], 40));
    const late = grade('add-the-3', answer([60, 64, 60], 160));
    expect(slightly.percent).toBeLessThan(100);
    expect(slightly.passed).toBe(true);
    expect(late.percent).toBeLessThan(slightly.percent);
    expect(late.timingAccuracy).toBeLessThan(0.2);
    expect(late.pitchAccuracy).toBe(1);
  });

  it('scores wrong notes low, and calls them wrong', () => {
    const result = grade('add-the-3', answer([62, 65, 67]));
    expect(result.percent).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.wrongNotes).toEqual([62, 65, 67]);
    expect(result.missedNotes).toEqual([60, 64, 60]);
  });

  it('takes off for one wrong note among right ones', () => {
    const result = grade('add-the-3', answer([60, 63, 60]));
    expect(result.percent).toBeLessThan(70);
    expect(result.wrongNotes).toEqual([63]);
    expect(result.outcomes?.map((o) => o.status)).toEqual([
      'hit',
      'missed',
      'hit',
    ]);
  });

  it('doesn’t count notes played during the call', () => {
    const duringCall = answer([60, 64, 60], -1920); // the call's own bar
    const result = grade('add-the-3', duringCall);
    expect(result.percent).toBe(0);
    expect(result.wrongNotes).toEqual([]); // not wrong: not counted at all
    expect(result.extras).toEqual([]);
    // Playing along with the call doesn't spoil a right answer after it.
    const both = grade('add-the-3', [...duringCall, ...answer([60, 64, 60])]);
    expect(both.percent).toBe(100);
  });

  it('won’t let one C answer all of "1 1 1"', () => {
    const result = grade('note-called-c', answer([60]));
    expect(result.pairs.filter(Boolean)).toHaveLength(1);
    expect(result.missedNotes).toEqual([60, 60]);
    expect(result.passed).toBe(false);
    expect(result.percent).toBeLessThan(40);
  });

  it('counts a keen first note just before the bar, and takes off for a doubled one', () => {
    const keen = grade('note-called-c', [
      { midi: 60, onset: 7680 - 60, duration: 400 },
      ...answer([60, 60]).map((n) => ({ ...n, onset: n.onset + 480 })),
    ]);
    expect(keen.pairs.every(Boolean)).toBe(true);
    expect(keen.passed).toBe(true);
    const doubled = grade('note-called-c', [
      ...answer([60, 60, 60]),
      { midi: 60, onset: 7680 + 1440, duration: 200 },
    ]);
    expect(doubled.extras).toHaveLength(1);
    expect(doubled.percent).toBeLessThan(100);
    expect(doubled.passed).toBe(true);
  });

  it('pairs each target with its closest note, once', () => {
    const targets = [
      { midi: 60, onset: 0 },
      { midi: 60, onset: 480 },
    ];
    const played = [
      { midi: 60, onset: 470 },
      { midi: 60, onset: 30 },
      { midi: 62, onset: 240 },
    ];
    const { pairs, extras } = pairResponse(targets, played);
    expect(pairs).toEqual([played[1], played[0]]);
    expect(extras).toEqual([played[2]]);
  });

  it('hears the answer from an eighth early to the end of its bars', () => {
    const { timeline } = stepNotes(lesson, step('note-called-c'));
    const at = (onset: number) => ({ midi: 60, onset, duration: 1 });
    expect(
      inResponse([at(7439), at(7440), at(9599), at(9600)], timeline).map(
        (n) => n.onset,
      ),
    ).toEqual([7440, 9599]);
  });

  it('passes at the step’s own mark, else the series mark of 70', () => {
    expect(LITERACY_PASS_MARK).toBe(70);
    expect(passMarkOf({})).toBe(70);
    expect(passMarkOf({ passMark: 80 })).toBe(80);
    const { response, timeline } = stepNotes(lesson, step('add-the-3'));
    const strict = gradeResponse(response, answer([60, 64, 60], 120), {
      timeline,
      tempo: 80,
      passMark: 90,
    });
    expect(strict.passed).toBe(
      strict.percent >= 90 && strict.timingAccuracy! >= TIMING_FLOOR / 100,
    );
    expect(strict.passMark).toBe(90);
  });
});

describe('the timing floor', () => {
  it('fails the right notes played off the beat, even above the pass mark', () => {
    const { response, timeline } = stepNotes(lesson, step('add-the-3'));
    // A third of a beat late: every pitch right, timing poor.
    const late = gradeResponse(response, answer([60, 64, 60], 160), {
      timeline,
      tempo: 80,
      passMark: 0,
    });
    expect(late.pitchAccuracy).toBe(1);
    expect(late.timingAccuracy! * 100).toBeLessThan(TIMING_FLOOR);
    expect(late.passed).toBe(false);
  });

  it('passes the right notes on the beat', () => {
    const { response, timeline } = stepNotes(lesson, step('add-the-3'));
    const onTime = gradeResponse(response, answer([60, 64, 60]), {
      timeline,
      tempo: 80,
      passMark: LITERACY_PASS_MARK,
    });
    expect(onTime.passed).toBe(true);
  });
});

describe('a key, right or wrong, as it’s pressed', () => {
  const { response, timeline } = stepNotes(lesson, step('add-the-3'));

  it('is right in the answer when it’s the note due', () => {
    expect(isRightNote(60, 7690, response, timeline)).toBe(true);
    expect(isRightNote(64, 8100, response, timeline)).toBe(true);
    // E is in the figure but C is due on beat 3.
    expect(isRightNote(64, 8640, response, timeline)).toBe(false);
    expect(isRightNote(62, 8160, response, timeline)).toBe(false);
  });

  it('is never wrong in the teacher’s turn: the words and the call', () => {
    // A teacher playing along (or the student joining in), any pitch.
    expect(isRightNote(64, 2000, response, timeline)).toBe(true);
    expect(isRightNote(62, 2000, response, timeline)).toBe(true);
    expect(isRightNote(71, 6240, response, timeline)).toBe(true);
    // From an eighth before the answer, the answer's rule.
    expect(isRightNote(62, 7680 - 200, response, timeline)).toBe(false);
  });

  it('is right out of a run when it’s in the figure', () => {
    expect(isRightNote(60, null, response, timeline)).toBe(true);
    expect(isRightNote(62, null, response, timeline)).toBe(false);
  });
});

describe('the teacher’s turn, played along', () => {
  it('never grades a note of the words or the call, played in time with them', () => {
    const { words, call } = stepNotes(lesson, step('add-the-3'));
    const alongside = [...words, ...call].map((n) => ({
      midi: n.midi,
      onset: n.onset + 20,
      duration: n.duration - 40,
    }));
    const result = grade('add-the-3', [...alongside, ...answer([60, 64, 60])]);
    expect(result.percent).toBe(100);
    expect(result.extras).toEqual([]);
  });

  it('keeps a call note played into the answer’s early eighth out of it', () => {
    const { response, timeline } = stepNotes(lesson, step('add-the-3'));
    // A call with a pickup on the last eighth before the answer.
    const call = [{ midi: 67, onset: 7680 - 240, duration: 200 } as const];
    const pickup = { midi: 67, onset: 7680 - 230, duration: 200 };
    const keen = { midi: 60, onset: 7680 - 100, duration: 300 };
    const figure = { call, response };
    expect(inResponse([pickup, keen], timeline, figure)).toEqual([keen]);
    // The same G is an extra without the call to tell it by.
    expect(inResponse([pickup, keen], timeline)).toEqual([pickup, keen]);
    const graded = gradeResponse(response, [pickup, ...answer([60, 64, 60])], {
      timeline,
      tempo: 80,
      passMark: LITERACY_PASS_MARK,
      call: call.map((n) => ({ ...n, degree: '5', index: 0 })),
    });
    expect(graded.extras).toEqual([]);
    expect(graded.percent).toBe(100);
  });
});

describe('grading over a drum groove', () => {
  const groove: RunGroove = {
    loopTicks: 1920,
    hits: [0, 480, 960, 1440].map((tick) => ({ tick, note: 36, velocity: 99 })),
  };
  const answerCues = (g?: RunGroove) =>
    runCues(lesson, step('add-the-3'), 'play', { metronome: false, groove: g })
      .filter(
        (c): c is NoteCue => c.kind === 'note' && c.segment === 'response',
      )
      .map((c) => [c.tick, c.midi]);

  it('asks for the same answer, at the same ticks', () => {
    expect(answerCues(groove)).toEqual(answerCues());
  });

  it('grades the same, and never hears the final downbeat', () => {
    // The groove changes none of what grading reads: the step's notes and
    // timeline. A key struck with the final kick and crash is past the
    // answer, so not an extra.
    const played = [
      ...answer([60, 64, 60], 30),
      { midi: 60, onset: 9600, duration: 300 },
    ];
    const result = grade('add-the-3', played);
    expect(result.extras).toEqual([]);
    expect(result).toEqual(grade('add-the-3', answer([60, 64, 60], 30)));
  });
});
