/**
 * Phase 23 — Curriculum Assignment Hook.
 *
 * Enables teachers to assign curriculum activities to classrooms.
 * Curriculum assignments map to the existing lesson system:
 * - lessonId: `curriculum:{genre}:{level}`
 * - Activities are tracked via the existing progress API.
 *
 * This hook provides the interface — actual API calls use the
 * existing useUpdateActivityProgress infrastructure.
 */

import { useCallback } from 'react';
import type { CurriculumGenreId } from '../bridge/genreIdMap';
import type { ActivitySectionId } from '../types/activity';
import type { CurriculumLevelId } from '../types/curriculum';
import {
  buildCurriculumLessonId,
  buildCurriculumActivityId,
} from './useCurriculumProgress';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CurriculumAssignment {
  /** Unique assignment ID */
  id: string;
  /** Classroom this is assigned to */
  classroomId: string;
  /** Curriculum genre */
  genre: CurriculumGenreId;
  /** Curriculum level */
  level: CurriculumLevelId;
  /** Which sections are assigned (empty = all) */
  sections: ActivitySectionId[];
  /** Due date (ISO string) */
  dueDate: string | null;
  /** When the assignment was created */
  createdAt: string;
  /** Derived lessonId for progress tracking */
  lessonId: string;
}

export interface CreateAssignmentParams {
  classroomId: string;
  genre: CurriculumGenreId;
  level: CurriculumLevelId;
  sections?: ActivitySectionId[];
  dueDate?: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Hook for managing curriculum assignments.
 *
 * Note: This currently stores assignments in local state.
 * In production, assignments would be persisted via the classroom API
 * using the existing lesson assignment pattern.
 */
export function useCurriculumAssignment() {
  /**
   * Build an assignment object from parameters.
   * The lessonId follows the curriculum naming convention so that
   * existing progress hooks (useLessonProgress) work transparently.
   */
  const buildAssignment = useCallback(
    (params: CreateAssignmentParams): CurriculumAssignment => {
      const lessonId = buildCurriculumLessonId(params.genre, params.level);
      return {
        id: `assign-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        classroomId: params.classroomId,
        genre: params.genre,
        level: params.level,
        sections: params.sections ?? ['A', 'B', 'C', 'D'],
        dueDate: params.dueDate ?? null,
        createdAt: new Date().toISOString(),
        lessonId,
      };
    },
    [],
  );

  /**
   * Get the activity instance IDs for an assignment.
   * These are used to query progress via the existing API.
   */
  const getAssignmentActivityIds = useCallback(
    (
      assignment: CurriculumAssignment,
      stepsPerSection: Record<ActivitySectionId, number>,
    ): string[] => {
      const ids: string[] = [];
      for (const section of assignment.sections) {
        const stepCount = stepsPerSection[section] ?? 0;
        for (let step = 1; step <= stepCount; step++) {
          ids.push(
            buildCurriculumActivityId(
              assignment.genre,
              assignment.level,
              section,
              step,
            ),
          );
        }
      }
      return ids;
    },
    [],
  );

  return {
    buildAssignment,
    getAssignmentActivityIds,
  };
}
