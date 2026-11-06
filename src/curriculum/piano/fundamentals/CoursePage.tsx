import { useMemo } from 'react';
import { PathPage } from '@/components/learn/path/PathPage';
import { useTutorialProgressStore } from '@/features/tutorials/useTutorialProgressStore';
import { fundamentalsCoursePath } from './coursePath';

/** /curriculum/piano-fundamentals: the course's path of lessons. */
export function FundamentalsCoursePage() {
  const completedAt = useTutorialProgressStore((s) => s.completedAt);
  const course = useMemo(
    () => fundamentalsCoursePath(completedAt),
    [completedAt],
  );
  return <PathPage course={course} />;
}
