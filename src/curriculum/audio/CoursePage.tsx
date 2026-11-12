import { useMemo } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { PathPage } from '@/components/learn/path/PathPage';
import { LearnRoutes } from '@/constants/routes';
import { useChooseAudio } from '@/features/learn/useInstrumentStore';
import { useTutorialProgressStore } from '@/features/tutorials/useTutorialProgressStore';
import { useIsPremium } from '@/hooks/useIsPremium';
import { audioModule } from './catalog';
import { audioCoursePath } from './coursePath';

/** /learn/audio/:module. Anything but a course goes back to the section. */
export function CoursePage() {
  useChooseAudio();
  const params = useParams<{ module: string }>();
  const module = audioModule(params.module);
  const completedAt = useTutorialProgressStore((s) => s.completedAt);
  const { isPremium } = useIsPremium();
  const course = useMemo(
    () =>
      module?.shelf ? audioCoursePath(module, completedAt, isPremium) : null,
    [completedAt, isPremium, module],
  );
  if (!course) return <Navigate replace to={LearnRoutes.audio()} />;
  return <PathPage course={course} />;
}
