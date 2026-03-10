/**
 * Phase 29 — Adaptive Difficulty.
 *
 * Adjusts content difficulty within a level based on student performance:
 * - Struggling (≤60% on last 3): simplify contour, widen tolerance
 * - Proficient (≥90% on last 3): tighten tolerance, allow harder content
 * - Normal (60-90%): use GCM defaults
 */

import type { AssessmentScore } from './assessmentScoring';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DifficultyTier = 'simplified' | 'normal' | 'challenge';

export interface AdaptedParams {
  /** Difficulty tier applied */
  tier: DifficultyTier;
  /** Adjusted contour note counts (fewer = easier) */
  contourNotesOverride?: number[];
  /** Adjusted contour tiers (lower = easier) */
  contourTiersOverride?: number[];
  /** Adjusted timing tolerance in ms */
  timingToleranceMs: number;
  /** Adjusted phrase rhythm bars */
  phraseRhythmBarsOverride?: number;
}

export interface PerformanceHistory {
  /** Last N assessment scores */
  lastN: AssessmentScore[];
  /** Performance trend */
  trend: 'improving' | 'stable' | 'declining';
  /** Average accuracy across recent scores */
  avgScore: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STRUGGLING_THRESHOLD = 60;
const PROFICIENT_THRESHOLD = 90;
const HISTORY_WINDOW = 3;

const DEFAULT_TIMING_TOLERANCE = 200;
const SIMPLIFIED_TIMING_TOLERANCE = 300;
const CHALLENGE_TIMING_TOLERANCE = 150;

// ---------------------------------------------------------------------------
// Adaptive difficulty
// ---------------------------------------------------------------------------

/**
 * Determine adapted parameters based on performance history.
 */
export function getAdaptedParams(history: PerformanceHistory): AdaptedParams {
  if (history.lastN.length === 0) {
    return { tier: 'normal', timingToleranceMs: DEFAULT_TIMING_TOLERANCE };
  }

  const avgScore = history.avgScore;

  if (avgScore <= STRUGGLING_THRESHOLD) {
    return {
      tier: 'simplified',
      contourNotesOverride: [3],
      contourTiersOverride: [1],
      timingToleranceMs: SIMPLIFIED_TIMING_TOLERANCE,
      phraseRhythmBarsOverride: 1,
    };
  }

  if (avgScore >= PROFICIENT_THRESHOLD) {
    return {
      tier: 'challenge',
      contourTiersOverride: [1, 2, 3, 4],
      timingToleranceMs: CHALLENGE_TIMING_TOLERANCE,
    };
  }

  return { tier: 'normal', timingToleranceMs: DEFAULT_TIMING_TOLERANCE };
}

/**
 * Build a PerformanceHistory from an array of recent scores.
 */
export function buildPerformanceHistory(
  scores: AssessmentScore[],
  windowSize: number = HISTORY_WINDOW,
): PerformanceHistory {
  const lastN = scores.slice(0, windowSize);

  if (lastN.length === 0) {
    return { lastN: [], trend: 'stable', avgScore: 0 };
  }

  const avgScore = lastN.reduce((sum, s) => sum + s.accuracy, 0) / lastN.length;

  // Determine trend
  let trend: PerformanceHistory['trend'] = 'stable';
  if (lastN.length >= 2) {
    const first = lastN[lastN.length - 1].accuracy;
    const last = lastN[0].accuracy;
    const delta = last - first;
    if (delta > 10) trend = 'improving';
    else if (delta < -10) trend = 'declining';
  }

  return { lastN, trend, avgScore };
}
