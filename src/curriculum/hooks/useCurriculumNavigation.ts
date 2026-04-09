/**
 * Phase 18 — Curriculum Navigation Hook.
 *
 * Syncs URL params with the curriculum store so that:
 * - Navigating to /curriculum/jazz/2 sets genre=JAZZ, level=L2 in the store
 * - Changing genre/level in the store updates the URL
 */

import { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CurriculumRoutes } from '@/constants/routes';
import {
  CURRICULUM_GENRE_IDS,
  SLUG_TO_CURRICULUM_GENRE,
  CURRICULUM_GENRE_SLUGS,
  type CurriculumGenreId,
} from '../bridge/genreIdMap';
import { useCurriculumStore } from '../store/curriculumStore';
import type { CurriculumLevelId } from '../types/curriculum';

/**
 * Sync URL params → store on mount and param changes.
 * Call this from route components that have :genre and :level params.
 */
export function useCurriculumNavigation() {
  const { genre: genreParam, level: levelParam } = useParams<{
    genre?: string;
    level?: string;
  }>();
  const navigate = useNavigate();
  const setGenreLevel = useCurriculumStore((s) => s.setGenreLevel);
  const currentGenre = useCurriculumStore((s) => s.currentGenre);
  const currentLevel = useCurriculumStore((s) => s.currentLevel);

  // URL → Store sync
  useEffect(() => {
    if (!genreParam) return;

    // Resolve genre slug to CurriculumGenreId via slug map, fallback to uppercase
    const genreId =
      SLUG_TO_CURRICULUM_GENRE[genreParam.toLowerCase()] ??
      CURRICULUM_GENRE_IDS.find(
        (id) => id === genreParam.toUpperCase().replace(/-/g, ' '),
      );
    if (!genreId) return;

    // Parse level (default to L1)
    const levelNum = levelParam ? parseInt(levelParam, 10) : 1;
    const levelId =
      `L${Math.max(1, Math.min(3, levelNum))}` as CurriculumLevelId;

    // Only update if different to avoid loops
    if (genreId !== currentGenre || levelId !== currentLevel) {
      setGenreLevel(genreId, levelId);
    }
  }, [genreParam, levelParam, setGenreLevel, currentGenre, currentLevel]);

  // Navigate to a genre/level
  const navigateTo = useCallback(
    (genre: CurriculumGenreId, level: CurriculumLevelId) => {
      const genreSlug = CURRICULUM_GENRE_SLUGS[genre];
      const levelNum = level.replace('L', '');
      navigate(
        CurriculumRoutes.genreLevel({ genre: genreSlug, level: levelNum }),
      );
    },
    [navigate],
  );

  // Navigate back to the curriculum browser
  const navigateToRoot = useCallback(() => {
    navigate(CurriculumRoutes.root());
  }, [navigate]);

  return {
    currentGenre,
    currentLevel,
    navigateTo,
    navigateToRoot,
  };
}
