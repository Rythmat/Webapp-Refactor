/**
 * Phase 11 — Assessment Scoring.
 *
 * Defines pass/fail thresholds, partial credit rules, and grade
 * calculation per assessment type.
 *
 * Thresholds:
 *   pitch_only:                100% notes correct to pass
 *   pitch_order:               100% notes correct to pass
 *   pitch_order_timing:        ≥80% notes within tolerance
 *   pitch_order_timing_duration: ≥80% notes within tolerance
 *
 * Grades: A (≥90%), B (≥80%), C (≥70%), Retry (<70%)
 */

import type { AssessmentType, MatchResult } from './assessmentMatchers';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Grade = 'A' | 'B' | 'C' | 'retry';

export interface AssessmentScore {
  /** Overall accuracy (0-100) */
  accuracy: number;
  /** Letter grade */
  grade: Grade;
  /** Whether the student passed this assessment */
  passed: boolean;
  /** Timing accuracy score (0-100), only for timed assessments */
  timingScore?: number;
  /** Duration accuracy score (0-100), only for duration assessments */
  durationScore?: number;
  /** Number of correct notes */
  correctCount: number;
  /** Total expected notes */
  totalExpected: number;
}

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

/** Pass thresholds by assessment type (percentage) */
const PASS_THRESHOLDS: Record<AssessmentType, number> = {
  pitch_only: 100,
  pitch_order: 100,
  pitch_order_timing: 80,
  pitch_order_timing_duration: 80,
};

/** Grade boundaries (applied to accuracy %) */
const GRADE_BOUNDARIES: Array<{ min: number; grade: Grade }> = [
  { min: 90, grade: 'A' },
  { min: 80, grade: 'B' },
  { min: 70, grade: 'C' },
  { min: 0, grade: 'retry' },
];

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/**
 * Calculate an assessment score from a match result.
 *
 * @param matchResult - Result from one of the assessment matchers
 * @param assessmentType - The type of assessment being scored
 * @param tempo - Tempo in BPM (for timing score calculation)
 * @returns Complete assessment score with grade and pass/fail
 */
export function calculateScore(
  matchResult: MatchResult,
  assessmentType: AssessmentType,
  _tempo?: number,
): AssessmentScore {
  const { accuracy, correctCount, totalExpected } = matchResult;

  const passThreshold = PASS_THRESHOLDS[assessmentType];
  const passed = accuracy >= passThreshold;
  const grade = calculateGrade(accuracy);

  const score: AssessmentScore = {
    accuracy: Math.round(accuracy * 100) / 100,
    grade,
    passed,
    correctCount,
    totalExpected,
  };

  // Add timing score for timed assessments
  if (
    matchResult.avgTimingDeviationMs !== undefined &&
    (assessmentType === 'pitch_order_timing' ||
      assessmentType === 'pitch_order_timing_duration')
  ) {
    score.timingScore = calculateTimingScore(matchResult.avgTimingDeviationMs);
  }

  // Add duration score for duration assessments (uses 300ms max, not 200ms)
  if (
    matchResult.avgDurationDeviationMs !== undefined &&
    assessmentType === 'pitch_order_timing_duration'
  ) {
    score.durationScore = calculateDurationScore(
      matchResult.avgDurationDeviationMs,
    );
  }

  return score;
}

/**
 * Determine letter grade from accuracy percentage.
 */
function calculateGrade(accuracy: number): Grade {
  for (const { min, grade } of GRADE_BOUNDARIES) {
    if (accuracy >= min) return grade;
  }
  return 'retry';
}

/**
 * Calculate a timing accuracy score (0-100) from average deviation.
 * 0ms deviation = 100, ≥200ms deviation = 0.
 */
function calculateTimingScore(avgDeviationMs: number): number {
  const maxDeviation = 200;
  const score = Math.max(0, 1 - avgDeviationMs / maxDeviation) * 100;
  return Math.round(score * 100) / 100;
}

/**
 * Calculate a duration accuracy score (0-100) from average deviation.
 * 0ms deviation = 100, ≥300ms deviation = 0.
 * Uses wider tolerance than timing since duration is harder to control.
 */
function calculateDurationScore(avgDeviationMs: number): number {
  const maxDeviation = 300;
  const score = Math.max(0, 1 - avgDeviationMs / maxDeviation) * 100;
  return Math.round(score * 100) / 100;
}

// ---------------------------------------------------------------------------
// Exports for configuration
// ---------------------------------------------------------------------------

export { PASS_THRESHOLDS, GRADE_BOUNDARIES };
