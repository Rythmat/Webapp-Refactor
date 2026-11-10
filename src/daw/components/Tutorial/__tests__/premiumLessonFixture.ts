import type { StudioLesson } from '@/content/studioLessons/schemas';
import {
  rememberStudioLessonDeleted,
  rememberStudioLessonSaved,
} from '@/curriculum/engine/studioLessons/registry';

// ── A Premium lesson, for the tests of Premium's gate ──────────────────────
// Every Studio Production lesson is free since the rebuild (owner,
// 2026-11-09), but the gate stays for a lesson with steps in the old Prism
// panel: a console lesson can still be one. This is one, saved into the
// registry for a test and taken out after it.

export const PREMIUM_LESSON = 'premium-console-lesson';

export const PREMIUM_LESSON_TITLE = 'A Prism lesson';

const lesson: StudioLesson = {
  id: PREMIUM_LESSON,
  title: PREMIUM_LESSON_TITLE,
  subtitle: 'Written in the console, with a step in Prism.',
  difficulty: 'Beginner',
  estMinutes: 3,
  requiresPremium: true,
  status: 'live',
  steps: [
    {
      id: 'meet-prism',
      stage: 'Prism',
      instruction: 'Meet **Prism**.',
      target: 'prism-panel',
    },
  ],
};

/** Puts the Premium lesson in the catalog; returns its removal. */
export function addPremiumLesson(): () => void {
  rememberStudioLessonSaved(lesson);
  return () => rememberStudioLessonDeleted(PREMIUM_LESSON);
}
