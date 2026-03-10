/**
 * Phase 19 — Curriculum Progress Tracking.
 *
 * Tracks student completion per genre/level/section/activity using
 * the existing progress API. Curriculum activities map to the lesson
 * system using a naming convention:
 * - lessonId: `curriculum:{genre}:{level}`
 * - activityInstanceId: `curriculum:{genre}:{level}:{section}:{step}`
 */

import { useCallback, useMemo } from 'react';
import { useLessonProgress } from '@/hooks/data/progress/useLessonProgress';
import { useUpdateActivityProgress } from '@/hooks/data/progress/useUpdateActivityProgress';
import type { ActivityProgressStatus } from '@/lib/progress/types';
import type { CurriculumGenreId } from '../bridge/genreIdMap';
import type { AssessmentResult } from '../engine/assessmentEngine';
import type { ActivitySectionId } from '../types/activity';
import type { CurriculumLevelId } from '../types/curriculum';

// ---------------------------------------------------------------------------
// ID helpers
// ---------------------------------------------------------------------------

/** Current curriculum lesson version. Increment when curriculum content changes. */
const CURRICULUM_LESSON_VERSION = 1;

/**
 * Build a lesson ID for curriculum progress tracking.
 * Format: `curriculum:{genre}:{level}` (e.g., `curriculum:JAZZ:L2`)
 */
export function buildCurriculumLessonId(
  genre: CurriculumGenreId,
  level: CurriculumLevelId,
): string {
  return `curriculum:${genre}:${level}`;
}

/**
 * Build an activity instance ID for curriculum progress tracking.
 * Format: `curriculum:{genre}:{level}:{section}:{step}`
 * (e.g., `curriculum:JAZZ:L2:A:3`)
 */
export function buildCurriculumActivityId(
  genre: CurriculumGenreId,
  level: CurriculumLevelId,
  section: ActivitySectionId,
  stepNumber: number,
): string {
  return `curriculum:${genre}:${level}:${section}:${stepNumber}`;
}

/**
 * Parse a curriculum activity ID back into its components.
 */
export function parseCurriculumActivityId(id: string): {
  genre: CurriculumGenreId;
  level: CurriculumLevelId;
  section: ActivitySectionId;
  stepNumber: number;
} | null {
  const parts = id.split(':');
  if (parts.length !== 5 || parts[0] !== 'curriculum') return null;
  return {
    genre: parts[1] as CurriculumGenreId,
    level: parts[2] as CurriculumLevelId,
    section: parts[3] as ActivitySectionId,
    stepNumber: parseInt(parts[4], 10),
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Track and update curriculum progress for a specific genre/level.
 * Uses the existing progress API (useUpdateActivityProgress).
 */
export function useCurriculumProgress(
  genre: CurriculumGenreId | null,
  level: CurriculumLevelId | null,
) {
  const lessonId = useMemo(
    () => (genre && level ? buildCurriculumLessonId(genre, level) : ''),
    [genre, level],
  );

  // Fetch existing progress
  const { data: lessonProgress } = useLessonProgress(
    lessonId || '',
    CURRICULUM_LESSON_VERSION,
  );

  const { mutate: updateProgress } = useUpdateActivityProgress();

  /**
   * Mark a step as started.
   */
  const startStep = useCallback(
    (section: ActivitySectionId, stepNumber: number) => {
      if (!genre || !level) return;

      const activityId = buildCurriculumActivityId(
        genre,
        level,
        section,
        stepNumber,
      );
      updateProgress({
        activityInstanceId: activityId,
        lessonId,
        lessonVersion: CURRICULUM_LESSON_VERSION,
        activityDefId: activityId,
        mode: '',
        root: '',
        status: 'IN_PROGRESS',
      });
    },
    [genre, level, lessonId, updateProgress],
  );

  /**
   * Mark a step as completed with optional score.
   */
  const completeStep = useCallback(
    (
      section: ActivitySectionId,
      stepNumber: number,
      assessmentResult?: AssessmentResult,
    ) => {
      if (!genre || !level) return;

      const activityId = buildCurriculumActivityId(
        genre,
        level,
        section,
        stepNumber,
      );
      updateProgress({
        activityInstanceId: activityId,
        lessonId,
        lessonVersion: CURRICULUM_LESSON_VERSION,
        activityDefId: activityId,
        mode: '',
        root: '',
        status: 'COMPLETED',
        attemptsDelta: 1,
        score: assessmentResult?.score.accuracy ?? null,
      });
    },
    [genre, level, lessonId, updateProgress],
  );

  /**
   * Get the status of a specific step.
   */
  const getStepStatus = useCallback(
    (
      section: ActivitySectionId,
      stepNumber: number,
    ): ActivityProgressStatus => {
      if (!genre || !level || !lessonProgress) return 'NOT_STARTED';

      const activityId = buildCurriculumActivityId(
        genre,
        level,
        section,
        stepNumber,
      );
      return (
        lessonProgress.progressByActivityInstanceId?.[activityId]?.status ??
        'NOT_STARTED'
      );
    },
    [genre, level, lessonProgress],
  );

  /**
   * Get count of completed steps for a section.
   */
  const getSectionCompletedCount = useCallback(
    (section: ActivitySectionId, totalSteps: number): number => {
      if (!lessonProgress) return 0;
      let completed = 0;
      for (let i = 1; i <= totalSteps; i++) {
        if (getStepStatus(section, i) === 'COMPLETED') completed++;
      }
      return completed;
    },
    [lessonProgress, getStepStatus],
  );

  /**
   * Get overall progress percentage for the current genre/level.
   */
  const overallProgress = useMemo(() => {
    if (!lessonProgress?.progressByActivityInstanceId) return 0;
    const entries = Object.values(lessonProgress.progressByActivityInstanceId);
    if (entries.length === 0) return 0;
    const completed = entries.filter((e) => e.status === 'COMPLETED').length;
    return Math.round((completed / entries.length) * 100);
  }, [lessonProgress]);

  return {
    lessonProgress,
    overallProgress,
    startStep,
    completeStep,
    getStepStatus,
    getSectionCompletedCount,
  };
}
