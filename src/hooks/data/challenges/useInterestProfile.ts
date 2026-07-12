import { useMemo } from 'react';
import {
  CURRICULUM_GENRE_IDS,
  CURRICULUM_GENRE_SLUGS,
  CURRICULUM_TO_ENGINE_GENRE,
  type CurriculumGenreId,
} from '@/curriculum/bridge/genreIdMap';
import { getSong } from '@/curriculum/data/songs';
import { useSavedSongsStore } from '@/features/songs/useSavedSongsStore';
import { useMe } from '@/hooks/data';
import { useProgressSummary } from '@/hooks/data/progress/useProgressSummary';
import { useUserBioPreferences } from '@/hooks/useUserBioPreferences';
import { curriculumGenreOf } from '@/lib/challenges/matchCriteria';
import type { InterestProfile } from '@/lib/challenges/types';

const CURRICULUM_SET = new Set<string>(CURRICULUM_GENRE_IDS);

/**
 * Normalize any genre label (bio "Jazz"/"Hip-Hop", song genreTags, curriculum
 * "JAZZ") to a CurriculumGenreId, or null. Upper-casing + hyphen→space covers
 * every source form.
 */
function toCurriculumGenre(raw: string): CurriculumGenreId | null {
  const up = raw.toUpperCase().replace(/-/g, ' ').trim();
  return CURRICULUM_SET.has(up) ? (up as CurriculumGenreId) : null;
}

/**
 * Blended Bio + behavior interest profile for the challenge generator: top
 * genres ranked from explicit Bio, saved-song genres, and studied curriculum
 * genres, plus the Bio focus areas. All client-readable.
 */
export function useInterestProfile(): InterestProfile {
  const { data: me } = useMe();
  const bio = useUserBioPreferences(me?.id);
  const savedIds = useSavedSongsStore((s) => s.savedIds);
  const { data: progress } = useProgressSummary();

  const bioGenres = bio.genres;
  const bioFocus = bio.focus;

  return useMemo(() => {
    const tally = new Map<CurriculumGenreId, number>();
    const bump = (raw: string, weight: number) => {
      const g = toCurriculumGenre(raw);
      if (g) tally.set(g, (tally.get(g) ?? 0) + weight);
    };

    bioGenres.forEach((g) => bump(g, 3)); // explicit — strongest
    Object.keys(savedIds).forEach((songId) => {
      getSong(songId)?.genreTags.forEach((t) => bump(t, 2));
    });
    (progress?.lessons ?? []).forEach((l) => {
      const g = curriculumGenreOf(l.lessonId);
      if (g) bump(g, l.completedCount > 0 ? 2 : 1);
    });

    const genres = [...tally.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([key]) => ({
        key,
        display: CURRICULUM_TO_ENGINE_GENRE[key],
        slug: CURRICULUM_GENRE_SLUGS[key],
      }));

    return { genres, focus: [...bioFocus] };
  }, [bioGenres, bioFocus, savedIds, progress]);
}
