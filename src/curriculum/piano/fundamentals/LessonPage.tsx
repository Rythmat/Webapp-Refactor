import { lazy, Suspense, type ComponentType } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { CurriculumRoutes } from '@/constants/routes';
import { LearnInputProvider } from '@/learn/context/LearnInputContext';
import {
  fundamentalsLesson,
  fundamentalsLessonRoute,
  SECTION_LESSON,
} from './course';

/** Each written lesson's page, loaded when it's opened. */
const LESSON_PAGES: Readonly<
  Record<string, React.LazyExoticComponent<ComponentType>>
> = {
  'meet-your-instrument': lazy(() => import('./lessons/meet-your-instrument')),
};

/**
 * /curriculum/piano-fundamentals/:lessonId. The old course's numbered
 * sections go to the lesson that teaches each now; one not yet written, or
 * anything else, to the course.
 */
export function FundamentalsLessonPage() {
  const { lessonId = '' } = useParams<{ lessonId: string }>();
  const course = CurriculumRoutes.pianoFundamentals();
  const moved = SECTION_LESSON[lessonId];
  if (moved) {
    return (
      <Navigate
        replace
        to={
          fundamentalsLesson(moved)?.built
            ? fundamentalsLessonRoute(moved)
            : course
        }
      />
    );
  }
  const lesson = fundamentalsLesson(lessonId);
  const Page = lesson?.built ? LESSON_PAGES[lesson.id] : undefined;
  if (!Page) return <Navigate replace to={course} />;
  return (
    // Clicks, and a MIDI keyboard (the mic stays off for piano: useLearnInput).
    <LearnInputProvider detectionMode="monophonic">
      <Suspense fallback={null}>
        <Page />
      </Suspense>
    </LearnInputProvider>
  );
}
