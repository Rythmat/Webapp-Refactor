import { describe, expect, it } from 'vitest';
import type {
  AssessmentResult,
  TargetOutcome,
} from '@/curriculum/hooks/useGenreAssessment';
import {
  EARLY_LATE_TOLERANCE_TICKS,
  nextStepSuggestion,
  outcomeMistake,
} from '../nextStepSuggestion';

const BAR = 1920;

const at = (
  bar: number,
  status: TargetOutcome['status'],
  timingDevTicks?: number,
): TargetOutcome => ({
  targetIndex: 0,
  onsetTick: bar * BAR + 480,
  status,
  ...(timingDevTicks === undefined ? {} : { timingDevTicks }),
});

function take(outcomes: TargetOutcome[], over: Partial<AssessmentResult> = {}) {
  return {
    passed: false,
    pitchAccuracy: 0.5,
    timingAccuracy: 0.5,
    durationAccuracy: null,
    overallScore: 0.5,
    missedNotes: [],
    wrongNotes: [],
    xpEarned: 0,
    skillTagsEarned: [],
    feedbackText: '',
    outcomes,
    ...over,
  } satisfies AssessmentResult;
}

describe('outcomeMistake', () => {
  it('names what went wrong', () => {
    expect(outcomeMistake(at(0, 'missed'))).toBe('missed');
    expect(outcomeMistake(at(0, 'wrong', -300))).toBe('wrong');
    expect(outcomeMistake(at(0, 'unclear'))).toBe('unclear');
  });

  it('marks hits early or late only past the tolerance', () => {
    const tol = EARLY_LATE_TOLERANCE_TICKS;
    expect(outcomeMistake(at(0, 'hit'))).toBeNull();
    expect(outcomeMistake(at(0, 'hit', tol))).toBeNull();
    expect(outcomeMistake(at(0, 'hit', -tol))).toBeNull();
    expect(outcomeMistake(at(0, 'hit', -tol - 1))).toBe('early');
    expect(outcomeMistake(at(0, 'hit', tol + 1))).toBe('late');
    expect(outcomeMistake(at(0, 'hit', 50), 40)).toBe('late');
  });
});

describe('nextStepSuggestion', () => {
  it('loops the two bars with the most mistakes, at 70% after a full-tempo take', () => {
    const result = take([
      at(0, 'hit'),
      at(1, 'missed'),
      at(2, 'wrong'),
      at(2, 'hit', 300),
      at(3, 'hit'),
    ]);
    expect(nextStepSuggestion(result, { bars: 4, tempoPct: 100 })).toEqual({
      label: 'Loop bars 2–3 at 70%',
      loop: { startBar: 1, endBar: 2 },
      pct: 70,
    });
  });

  it('puts missed and wrong targets before timing slips', () => {
    const result = take([
      at(0, 'missed'),
      at(2, 'hit', 300),
      at(3, 'hit', -300),
      at(3, 'hit', 300),
    ]);
    expect(
      nextStepSuggestion(result, { bars: 4, tempoPct: 100 })?.loop,
    ).toEqual({ startBar: 0, endBar: 1 });
    // Level on pitch, the bars with more timing slips win.
    const level = take([at(0, 'missed'), at(3, 'wrong'), at(3, 'hit', 300)]);
    expect(nextStepSuggestion(level, { bars: 4, tempoPct: 100 })?.loop).toEqual(
      { startBar: 2, endBar: 3 },
    );
  });

  it('loops the timing slips when every target landed', () => {
    const result = take([at(0, 'hit'), at(2, 'hit', -300), at(3, 'hit', 300)]);
    expect(nextStepSuggestion(result, { bars: 4, tempoPct: 100 })).toEqual({
      label: 'Loop bars 3–4 at 70%',
      loop: { startBar: 2, endBar: 3 },
      pct: 70,
    });
  });

  it('takes the earliest pair on a tie', () => {
    const result = take([at(1, 'missed')]);
    expect(
      nextStepSuggestion(result, { bars: 4, tempoPct: 100 })?.loop,
    ).toEqual({ startBar: 0, endBar: 1 });
  });

  it('suggests ten points slower than a slower take, never under 70%', () => {
    const result = take([at(2, 'missed')]);
    expect(nextStepSuggestion(result, { bars: 4, tempoPct: 90 })?.pct).toBe(80);
    expect(nextStepSuggestion(result, { bars: 4, tempoPct: 75 })?.pct).toBe(70);
  });

  it('loops the one bar of a one-bar step', () => {
    expect(
      nextStepSuggestion(take([at(0, 'missed')]), { bars: 1, tempoPct: 100 }),
    ).toEqual({
      label: 'Loop bar 1 at 70%',
      loop: { startBar: 0, endBar: 0 },
      pct: 70,
    });
  });

  it('ignores unclear targets and targets past the step', () => {
    const result = take([at(0, 'unclear'), at(0, 'unclear'), at(5, 'missed')]);
    expect(nextStepSuggestion(result, { bars: 4, tempoPct: 100 })).toBeNull();
  });

  it('has nothing to suggest after a clean take', () => {
    const result = take([at(0, 'hit'), at(1, 'hit', 20)], { passed: true });
    expect(nextStepSuggestion(result, { bars: 2, tempoPct: 100 })).toBeNull();
  });

  it("stays quiet when the take couldn't be judged", () => {
    const outcomes = [at(0, 'missed')];
    expect(
      nextStepSuggestion(take(outcomes, { unclear: true }), {
        bars: 2,
        tempoPct: 100,
      }),
    ).toBeNull();
    expect(
      nextStepSuggestion(take(outcomes, { selfReported: true }), {
        bars: 2,
        tempoPct: 100,
      }),
    ).toBeNull();
    expect(
      nextStepSuggestion(take([], { outcomes: undefined }), {
        bars: 2,
        tempoPct: 100,
      }),
    ).toBeNull();
  });
});
