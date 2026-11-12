import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';
import { useLocalPlan } from '@/features/classroom/plan/useLocalPlan';
import {
  LESSON_ATLAS_KEY,
  loadLessonAtlas,
} from '@/features/classroom/slides/cortex/loadLessonAtlas';
import type { Day } from '@/features/classroom/types';
import {
  BUILT_IN_LESSONS,
  generateBuiltInLesson,
  lessonHash,
  syncBuiltInLesson,
} from './builtInLessons';

// What each built-in lesson looked like when this device last wrote it, by
// day id: how an unedited copy is told from one the teacher changed. Not in
// the plan backup; a lost record only means a changed copy is kept as is.
const WRITTEN_KEY = 'ma-teacher:builtin-lessons:v1';

const readWritten = (): Record<string, string> => {
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(WRITTEN_KEY) ?? '{}',
    );
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
};

const recordWritten = (dayId: string, hash: string) => {
  try {
    window.localStorage.setItem(
      WRITTEN_KEY,
      JSON.stringify({ ...readWritten(), [dayId]: hash }),
    );
  } catch {
    // Storage refused: the copy is then treated as the teacher's next time.
  }
};

export interface BuiltInLessonState {
  day: Day;
  /** The teacher changed this device's copy (Restore original undoes it). */
  edited: boolean;
}

/**
 * The Office's built-in lessons on this device, kept in step with the code:
 * written when missing, replaced when the code's lesson changed and the copy
 * wasn't edited. Waits for the plan to hydrate, so a copy still loading is
 * never taken for a missing one.
 */
export const useBuiltInLessons = () => {
  const { getDay, saveDay, isHydrated } = useLocalPlan();
  const atlas = useQuery({
    queryKey: LESSON_ATLAS_KEY,
    queryFn: loadLessonAtlas,
    staleTime: Infinity,
  });

  const generated = useMemo(
    () =>
      atlas.data
        ? BUILT_IN_LESSONS.flatMap((lesson) => {
            const day = generateBuiltInLesson(atlas.data, lesson);
            return day ? [day] : [];
          })
        : [],
    [atlas.data],
  );

  const write = useCallback(
    (day: Day) => {
      saveDay(day);
      // Record what the plan holds, not what was handed to it.
      const saved = getDay(day.id);
      if (saved) recordWritten(day.id, lessonHash(saved));
    },
    [getDay, saveDay],
  );

  useEffect(() => {
    if (!isHydrated) return;
    const written = readWritten();
    for (const day of generated) {
      if (syncBuiltInLesson(getDay(day.id), written[day.id], day).write)
        write(day);
    }
  }, [generated, isHydrated, getDay, write]);

  const written = readWritten();
  const lessons: BuiltInLessonState[] = generated.flatMap((code) => {
    const day = getDay(code.id);
    if (!day) return [];
    return [
      { day, edited: syncBuiltInLesson(day, written[code.id], code).edited },
    ];
  });

  /** Put the code's lesson back over this device's copy. */
  const restore = useCallback(
    (dayId: string) => {
      const day = generated.find((d) => d.id === dayId);
      if (day) write(day);
    },
    [generated, write],
  );

  return {
    lessons,
    isLoading: atlas.isLoading || !isHydrated,
    isError: atlas.isError,
    restore,
  };
};
