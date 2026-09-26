/**
 * useSavedLessons — a teacher's "saved" (bookmarked) lessons, as a Set of Day
 * ids. Storage lives in the curriculum repository; this is the React binding.
 * Global to the teacher, not classroom-scoped.
 */
import { useCallback, useEffect, useState } from 'react';
import { localCurriculumRepository as repo } from '../persistence/localCurriculumRepository';

export {
  SAVED_LESSONS_KEY,
  SAVED_SCHEMA_VERSION as SCHEMA_VERSION,
} from '../persistence/localCurriculumRepository';

export interface UseSavedLessons {
  saved: Set<string>;
  has: (dayId: string) => boolean;
  toggle: (dayId: string) => void;
  remove: (dayId: string) => void;
}

export const useSavedLessons = (): UseSavedLessons => {
  const [saved, setSaved] = useState<Set<string>>(
    () => new Set(repo.listSavedLessons()),
  );

  useEffect(
    () => repo.subscribe(() => setSaved(new Set(repo.listSavedLessons()))),
    [],
  );

  // Mutators re-read before writing so concurrent toggles don't clobber via a
  // stale closure.
  const toggle = useCallback((dayId: string) => {
    const next = new Set(repo.listSavedLessons());
    if (next.has(dayId)) next.delete(dayId);
    else next.add(dayId);
    repo.putSavedLessons([...next]);
    setSaved(next);
  }, []);

  const remove = useCallback((dayId: string) => {
    const next = new Set(repo.listSavedLessons());
    if (next.delete(dayId)) {
      repo.putSavedLessons([...next]);
      setSaved(next);
    }
  }, []);

  const has = useCallback((dayId: string) => saved.has(dayId), [saved]);

  return { saved, has, toggle, remove };
};
