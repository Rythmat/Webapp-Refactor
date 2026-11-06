import { useMemo } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import type { CortexRecords } from '@/features/cortex/ledger';
import { courseTouches } from '@/features/learn/catalog/courseActivity';
import {
  allCourses,
  type CatalogTopic,
} from '@/features/learn/catalog/learnCatalog';
import { genreSlugOf } from '@/features/learn/profile/learnProfile';
import { useUserBioPreferences } from '@/hooks/useUserBioPreferences';
import { GENRE_COURSES } from '../genreCourses';

const GENRE_SLUGS = GENRE_COURSES.map((course) => course.slug);

/**
 * The styles a student likes, as genre slugs: what they told us, then the
 * genre courses they've been in. Never the device-wide saved songs (shared
 * Chromebooks). The dashboard and Explore both read it.
 */
export function useTasteGenres(
  topics: readonly CatalogTopic[],
  records: CortexRecords,
): readonly string[] {
  const { appUser } = useAuthContext();
  const bio = useUserBioPreferences(appUser?.id);
  return useMemo(() => {
    const told = [...bio.genres]
      .map((genre) => genreSlugOf(genre, GENRE_SLUGS))
      .filter((slug): slug is string => Boolean(slug));
    const touches = courseTouches(allCourses(topics), records);
    const done = allCourses(topics)
      .filter((c) => c.kind === 'genre' && touches.has(c.id))
      .map((c) => c.slug);
    return [...new Set([...told, ...done])];
  }, [bio.genres, topics, records]);
}

/** Why a row of songs is there: the styles it's for, or their level. */
export function songsReason(tasteGenres: readonly string[]): string {
  const names = tasteGenres
    .slice(0, 2)
    .map((slug) => GENRE_COURSES.find((c) => c.slug === slug)?.title)
    .filter(Boolean);
  return names.length
    ? `Because you like ${names.join(' and ')}`
    : 'Popular at your level';
}
