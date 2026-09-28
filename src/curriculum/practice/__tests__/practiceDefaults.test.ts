import { describe, expect, it } from 'vitest';
import type {
  AssessmentResult,
  TargetOutcome,
} from '@/curriculum/hooks/useGenreAssessment';
import {
  CLEAN_PASS,
  HAND_CARE,
  LOOP_PRESETS,
  SPEED_LADDER_DEFAULTS,
  isCleanPass,
  stepPassMark,
} from '../practiceDefaults';

function outcomes(
  counts: Partial<Record<TargetOutcome['status'], number>>,
): TargetOutcome[] {
  return (['hit', 'missed', 'wrong', 'unclear'] as const).flatMap((status) =>
    Array.from({ length: counts[status] ?? 0 }, () => ({
      targetIndex: 0,
      onsetTick: 0,
      status,
    })),
  );
}

function result(over: Partial<AssessmentResult> = {}): AssessmentResult {
  return {
    passed: true,
    pitchAccuracy: 1,
    timingAccuracy: null,
    durationAccuracy: null,
    overallScore: 1,
    missedNotes: [],
    wrongNotes: [],
    xpEarned: 10,
    skillTagsEarned: [],
    feedbackText: '',
    ...over,
  };
}

describe('practice defaults', () => {
  it('match the Beato spec §4 values', () => {
    expect(SPEED_LADDER_DEFAULTS).toEqual({
      startPct: 70,
      stepPct: 5,
      targetPct: 100,
      cleanPassesToStepUp: 2,
      stepBackAfterNonClean: 3,
      stepBackPct: 5,
    });
    expect(CLEAN_PASS).toEqual({
      meetsStepPassMark: true,
      maxMissedTargets: 1,
      maxUnclearRatio: 0.1,
      minPitchSubScore: 0.85,
    });
    expect(LOOP_PRESETS).toEqual([
      'whole-pass',
      'first-half',
      'second-half',
      'tricky-change',
    ]);
    expect(HAND_CARE).toEqual({ barreLoopMinutes: 10, oncePerSession: true });
  });

  it('uses the step pass mark: 75% out of time, 60% in time', () => {
    expect(stepPassMark('pitch_only')).toBe(0.75);
    expect(stepPassMark('pitch_order')).toBe(0.75);
    expect(stepPassMark('pitch_order_timing')).toBe(0.6);
    expect(stepPassMark('pitch_order_timing_duration')).toBe(0.6);
  });
});

describe('isCleanPass', () => {
  it('holds the score to the pass mark, inclusive', () => {
    expect(isCleanPass(result({ overallScore: 0.75 }), 'pitch_only')).toBe(
      true,
    );
    expect(isCleanPass(result({ overallScore: 0.74 }), 'pitch_only')).toBe(
      false,
    );
    expect(
      isCleanPass(result({ overallScore: 0.6 }), 'pitch_order_timing'),
    ).toBe(true);
    expect(
      isCleanPass(result({ overallScore: 0.59 }), 'pitch_order_timing'),
    ).toBe(false);
  });

  it('needs a pitch sub-score of at least 0.85', () => {
    expect(isCleanPass(result({ pitchAccuracy: 0.85 }), 'pitch_only')).toBe(
      true,
    );
    expect(isCleanPass(result({ pitchAccuracy: 0.84 }), 'pitch_only')).toBe(
      false,
    );
  });

  it('allows one missed target, counting wrong ones as missed', () => {
    const clean = (counts: Parameters<typeof outcomes>[0]) =>
      isCleanPass(result({ outcomes: outcomes(counts) }), 'pitch_only');
    expect(clean({ hit: 19, missed: 1 })).toBe(true);
    expect(clean({ hit: 19, wrong: 1 })).toBe(true);
    expect(clean({ hit: 18, missed: 2 })).toBe(false);
    expect(clean({ hit: 18, missed: 1, wrong: 1 })).toBe(false);
  });

  it('allows up to a tenth of the targets unclear', () => {
    const clean = (counts: Parameters<typeof outcomes>[0]) =>
      isCleanPass(result({ outcomes: outcomes(counts) }), 'pitch_only');
    expect(clean({ hit: 9, unclear: 1 })).toBe(true);
    expect(clean({ hit: 8, unclear: 1 })).toBe(false);
  });

  it("isn't clean when the take couldn't be heard or was self-reported", () => {
    expect(isCleanPass(result({ unclear: true }), 'pitch_only')).toBe(false);
    expect(isCleanPass(result({ selfReported: true }), 'pitch_only')).toBe(
      false,
    );
  });

  it('falls back to missed notes when there are no outcomes', () => {
    // Out of time `passed` is false with a miss; a clean pass still allows one.
    expect(
      isCleanPass(result({ passed: false, missedNotes: [60] }), 'pitch_only'),
    ).toBe(true);
    expect(isCleanPass(result({ missedNotes: [60, 62] }), 'pitch_only')).toBe(
      false,
    );
  });
});
