import { useMemo } from 'react';
import { useStudioLessonsVersion } from '@/curriculum/engine/studioLessons/registry';
import type { GenreReadiness } from '@/features/learn/genreReadiness';
import { isLearnInstrumentEnabled } from '@/features/learn/useInstrumentStore';
import { useTutorialProgressStore } from '@/features/tutorials/useTutorialProgressStore';
import { useProgressSummary } from '@/hooks/data/progress';
import { useIsPremium } from '@/hooks/useIsPremium';
import { buildLearnCatalog, type CatalogTopic } from './learnCatalog';

const NO_LESSONS: readonly never[] = [];

/** Learn's catalog, with this student's progress and plan. */
export function useLearnCatalog(
  genreReady: GenreReadiness | null,
): readonly CatalogTopic[] {
  const { isPremium } = useIsPremium();
  const { data: summary } = useProgressSummary(true);
  const completedAt = useTutorialProgressStore((s) => s.completedAt);
  const lessons = summary?.lessons ?? NO_LESSONS;
  // Audio lists the Studio's lessons, which a console save can change.
  const studioLessons = useStudioLessonsVersion();
  return useMemo(
    () =>
      buildLearnCatalog({
        enabled: isLearnInstrumentEnabled,
        isPremium,
        lessons,
        completedAt,
        genreReady,
      }),
    [completedAt, genreReady, isPremium, lessons, studioLessons],
  );
}
