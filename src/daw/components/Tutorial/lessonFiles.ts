import type {
  StudioLesson,
  StudioLessonStep,
} from '@/content/studioLessons/schemas';
import { TUTORIAL_CATALOG } from './tutorialCatalog';
import { TUTORIALS, type TutorialStep } from './tutorials';

// ── A code lesson as a console lesson ──────────────────────────────────────
// What the console's lesson editor opens a code lesson as, before it has
// been edited: the same lesson as data, each step keeping its code check and
// demo by reference ({ kind: 'code' }). Saved unchanged, the file runs
// exactly as the code does (lessonFiles.test.ts).

function stepAsFile(lessonId: string, step: TutorialStep): StudioLessonStep {
  const ref = { kind: 'code' as const, lesson: lessonId, step: step.id };
  const out: StudioLessonStep = {
    id: step.id,
    stage: step.stage,
    instruction: step.instruction,
  };
  if (step.why !== undefined) out.why = step.why;
  if (step.hint !== undefined) out.hint = step.hint;
  if (step.target !== undefined)
    out.target = Array.isArray(step.target) ? [...step.target] : step.target;
  if (step.rack !== undefined) out.rack = step.rack;
  if (step.requires) {
    const { mixRack, ...rest } = step.requires;
    const requires: NonNullable<StudioLessonStep['requires']> = { ...rest };
    // A data lesson can't name a track's rack: only Master's or a return's.
    if (mixRack && mixRack.kind !== 'track') requires.mixRack = mixRack;
    out.requires = requires;
  }
  if (step.check || step.synthCheck || step.promptCheck) out.check = ref;
  if (step.demo) out.demo = ref;
  return out;
}

/** A code lesson, as the editor opens it; null for an id the code lacks. */
export function codeLessonAsFile(id: string): StudioLesson | null {
  const lesson = TUTORIALS.find((t) => t.id === id);
  if (!lesson) return null;
  return {
    id: lesson.id,
    title: lesson.title,
    subtitle: lesson.subtitle,
    difficulty: lesson.difficulty,
    estMinutes: lesson.estMinutes,
    requiresPremium: lesson.requiresPremium,
    ...(lesson.course
      ? { course: lesson.course, courseOrder: lesson.courseOrder }
      : {}),
    ...(lesson.seed ? { seed: lesson.seed } : {}),
    status: 'live',
    steps: lesson.steps.map((st) => stepAsFile(lesson.id, st)),
  };
}

/** Whether a lesson id is one the code ships (an edit replaces it). */
export const isCodeLesson = (id: string): boolean =>
  (TUTORIAL_CATALOG as readonly { id: string }[]).some((t) => t.id === id);
