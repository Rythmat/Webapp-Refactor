import { lazy, Suspense } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { RequirePremium } from '@/components/ui/RequirePremium';
import { LearnRoutes } from '@/constants/routes';
import { useChooseAudio } from '@/features/learn/useInstrumentStore';
import { audioModule } from './catalog';
import { LESSON_PAGES } from './lessonPages';

// Lazy, so that a guided lesson doesn't bring the old lab's frame with it.
const LabLesson = lazy(() =>
  import('./lab/LabLesson').then((m) => ({ default: m.LabLesson })),
);

/**
 * /learn/audio/:module/:lesson: a lesson, behind its module's gate. One route for
 * all of them, so a new one needs only the catalog and its page. Anything else
 * under it goes back to the section.
 */
export function AudioLessonRoute() {
  useChooseAudio();
  const params = useParams<{ module: string; lesson: string }>();
  const module = audioModule(params.module);
  const lesson = module?.lessons.find((l) => l.id === params.lesson);
  if (!module || !lesson) return <Navigate replace to={LearnRoutes.audio()} />;
  const Guided = lesson.kind === 'guided' ? LESSON_PAGES[lesson.id] : undefined;
  if (lesson.kind !== 'lab' && !Guided) {
    return <Navigate replace to={LearnRoutes.audio()} />;
  }
  const page = (
    <Suspense fallback={null}>
      {Guided ? (
        <Guided />
      ) : (
        lesson.kind === 'lab' && <LabLesson module={module} lesson={lesson} />
      )}
    </Suspense>
  );
  return module.access === 'free' ? (
    page
  ) : (
    <RequirePremium>{page}</RequirePremium>
  );
}
