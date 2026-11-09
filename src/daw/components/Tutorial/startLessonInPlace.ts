import { useStore } from '@/daw/store';
import { getTutorialCourse, type TutorialCourseId } from './tutorialCatalog';

// ── A lesson on the song that is open ──────────────────────────────────────
// The "in place" start: a lesson run on the project the student has open
// (their own song), with no reset and no navigation. A cold start (the
// Production tab, a Teach slide, Start Here) goes through the editor's
// ?tutorial= link instead, which opens the course's demo song first. From
// the practice screen, the lesson starts on Create, where its steps are.

export function startLessonInPlace(lessonId: string): void {
  const store = useStore.getState();
  if (store.currentView === 'practice') store.setCurrentView('arrange');
  store.startTutorial(lessonId);
}

/** A course's first lesson, on the song that is open. */
export function startCourseInPlace(courseId: TutorialCourseId): void {
  const first = getTutorialCourse(courseId)?.lessonIds[0];
  if (first) startLessonInPlace(first);
}
