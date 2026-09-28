import type { AssessmentResult } from '@/curriculum/hooks/useGenreAssessment';
import type { AssessmentType } from '@/curriculum/types/activity';

// ── Practice-tool defaults ─────────────────────────────────────────────────
// docs/guitar-atlas/design/beato-knowledge-spec.md §4. Instrument-agnostic:
// nothing here knows about guitar, so piano can adopt the tools later.

/** Speed-trainer ladder, as percentages of the step's tempo. */
export const SPEED_LADDER_DEFAULTS = {
  startPct: 70,
  stepPct: 5,
  targetPct: 100,
  cleanPassesToStepUp: 2,
  stepBackAfterNonClean: 3,
  /** Never below startPct. */
  stepBackPct: 5,
} as const;

/** When a silently scored practice pass counts as clean. */
export const CLEAN_PASS = {
  /** 75% out of time, 60% in time — the step's own pass mark. */
  meetsStepPassMark: true,
  maxMissedTargets: 1,
  maxUnclearRatio: 0.1,
  minPitchSubScore: 0.85,
} as const;

export const LOOP_PRESETS = [
  'whole-pass',
  'first-half',
  'second-half',
  'tricky-change',
] as const;

export type LoopPresetId = (typeof LOOP_PRESETS)[number];

/** One break reminder per session, after this much looping on barre steps. */
export const HAND_CARE = {
  barreLoopMinutes: 10,
  oncePerSession: true,
} as const;

/** The step's pass mark: useGenreAssessment's 0.75 out of time, 0.6 in time. */
export function stepPassMark(assessment: AssessmentType): number {
  return assessment === 'pitch_order_timing' ||
    assessment === 'pitch_order_timing_duration'
    ? 0.6
    : 0.75;
}

/**
 * Whether a practice pass was clean enough to climb the ladder. The score is
 * held to the pass mark rather than to `passed`: out of time, `passed` also
 * demands every note, which would leave no room for the one allowed miss.
 * A target played wrong counts as missed. Without per-target outcomes (no
 * assessment policy) the missed notes stand in and nothing is unclear.
 */
export function isCleanPass(
  result: AssessmentResult,
  assessment: AssessmentType,
): boolean {
  if (result.unclear || result.selfReported) return false;
  if (
    CLEAN_PASS.meetsStepPassMark &&
    result.overallScore < stepPassMark(assessment)
  ) {
    return false;
  }
  if (result.pitchAccuracy < CLEAN_PASS.minPitchSubScore) return false;

  const { outcomes } = result;
  if (!outcomes) {
    return result.missedNotes.length <= CLEAN_PASS.maxMissedTargets;
  }
  const missed = outcomes.filter(
    (o) => o.status === 'missed' || o.status === 'wrong',
  ).length;
  const unclear = outcomes.filter((o) => o.status === 'unclear').length;
  const unclearRatio = outcomes.length > 0 ? unclear / outcomes.length : 0;
  return (
    missed <= CLEAN_PASS.maxMissedTargets &&
    unclearRatio <= CLEAN_PASS.maxUnclearRatio
  );
}
