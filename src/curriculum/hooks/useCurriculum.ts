/**
 * Phase 18 — Curriculum convenience hooks.
 *
 * Thin wrappers around the curriculum store for common access patterns.
 */

import { useCallback, useMemo } from 'react';
import {
  generateFullActivity,
  type GeneratedActivity,
} from '../engine/contentOrchestrator';
import { useCurriculumStore } from '../store/curriculumStore';

/**
 * Access current genre selection with setter.
 */
export function useCurriculumGenre() {
  const genre = useCurriculumStore((s) => s.currentGenre);
  const setGenre = useCurriculumStore((s) => s.setGenre);
  return [genre, setGenre] as const;
}

/**
 * Access current level selection with setter.
 */
export function useCurriculumLevel() {
  const level = useCurriculumStore((s) => s.currentLevel);
  const setLevel = useCurriculumStore((s) => s.setLevel);
  return [level, setLevel] as const;
}

/**
 * Access current key root with setter.
 */
export function useCurriculumKeyRoot() {
  const keyRoot = useCurriculumStore((s) => s.keyRoot);
  const setKeyRoot = useCurriculumStore((s) => s.setKeyRoot);
  return [keyRoot, setKeyRoot] as const;
}

/**
 * Get or generate content for the current genre/level/key.
 * Returns cached content if available, generates fresh content if not.
 */
export function useCurriculumContent() {
  const genre = useCurriculumStore((s) => s.currentGenre);
  const level = useCurriculumStore((s) => s.currentLevel);
  const keyRoot = useCurriculumStore((s) => s.keyRoot);
  const getCachedContent = useCurriculumStore((s) => s.getCachedContent);
  const cacheContent = useCurriculumStore((s) => s.cacheContent);

  const content = useMemo(() => getCachedContent(), [getCachedContent]);

  const generate = useCallback(
    (tempo?: number): GeneratedActivity | null => {
      if (!genre || !level) return null;
      const activity = generateFullActivity(genre, level, keyRoot, tempo);
      cacheContent(activity);
      return activity;
    },
    [genre, level, keyRoot, cacheContent],
  );

  const regenerate = useCallback(
    (tempo?: number): GeneratedActivity | null => {
      return generate(tempo);
    },
    [generate],
  );

  return { content, generate, regenerate };
}

/**
 * Access assessment history for the current genre/level.
 */
export function useCurriculumAssessments() {
  const recordAssessment = useCurriculumStore((s) => s.recordAssessment);
  const getHistory = useCurriculumStore((s) => s.getAssessmentHistory);
  const getRecent = useCurriculumStore((s) => s.getRecentAssessments);

  const history = useMemo(() => getHistory(), [getHistory]);

  return { history, recordAssessment, getRecent };
}
