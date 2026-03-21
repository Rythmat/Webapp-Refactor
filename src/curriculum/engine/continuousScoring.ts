// ── Continuous Scoring ────────────────────────────────────────────────────
// Wraps continuousMatchers output into the same grade/pass structure as
// assessmentScoring.ts, so the rest of the system (adaptiveDifficulty,
// progress tracking) can consume continuous scores without changes.
//
// Key differences from assessmentScoring.ts:
//   - Uses 0–1 continuous scores instead of count-based accuracy
//   - Reports weakestDimension for targeted feedback
//   - Same grade boundaries (A≥0.9, B≥0.8, C≥0.7)

import type { ContinuousPerformanceScore } from '@/learn/audio/v2/types';
import type { AssessmentType } from './assessmentMatchers';
import type { AssessmentScore, Grade } from './assessmentScoring';
import {
  scorePerformanceContinuous,
  type ReceivedNote,
  type ContinuousScoringOptions,
} from './continuousMatchers';
import type { MidiNoteEvent } from './melodyPipeline';

// ── Convert to Legacy Format ────────────────────────────────────────────

/**
 * Score a performance using the continuous system and return both the
 * rich ContinuousPerformanceScore and a backward-compatible AssessmentScore.
 */
export function scoreContinuous(
  expected: MidiNoteEvent[],
  received: ReceivedNote[],
  tempo: number,
  assessmentType: AssessmentType,
  options?: ContinuousScoringOptions,
): {
  continuous: ContinuousPerformanceScore;
  legacy: AssessmentScore;
} {
  const continuous = scorePerformanceContinuous(
    expected,
    received,
    tempo,
    assessmentType,
    options,
  );

  // Map to legacy format
  const accuracy = continuous.overallScore * 100;
  const grade = mapGrade(continuous.grade);
  const correctCount = continuous.perNoteScores.filter(
    (s) => s.compositeScore >= 0.5,
  ).length;

  const legacy: AssessmentScore = {
    accuracy: Math.round(accuracy * 100) / 100,
    grade,
    passed: continuous.passed,
    correctCount,
    totalExpected: expected.length,
  };

  // Add timing/duration scores for relevant assessment types
  if (
    assessmentType === 'pitch_order_timing' ||
    assessmentType === 'pitch_order_timing_duration'
  ) {
    legacy.timingScore = Math.round(continuous.timingScore * 100 * 100) / 100;
  }

  if (assessmentType === 'pitch_order_timing_duration') {
    legacy.durationScore =
      Math.round(continuous.durationScore * 100 * 100) / 100;
  }

  return { continuous, legacy };
}

/** Map ContinuousPerformanceScore grade to legacy Grade type. */
function mapGrade(grade: 'A' | 'B' | 'C' | 'Retry'): Grade {
  if (grade === 'Retry') return 'retry';
  return grade;
}
