import { lessonNeedsPremium } from '@/content/studioLessons/premium';
import {
  studioLessonSchema,
  type StudioLesson,
  type StudioLessonStep,
} from '@/content/studioLessons/schemas';
import { studioLessonId } from '@/content/studioLessons/template';

/**
 * The lesson editor's pure parts: what is wrong with a draft, the file it
 * saves as, and the ids it makes. Kept apart from the editor's components so
 * they test without a browser.
 */

export interface LessonIssue {
  /** Where, in words: "Step 3 (pick-key) · Instruction". */
  where: string;
  message: string;
  /** The step it is in, when it is in one. */
  step: number | null;
}

const FIELD_WORDS: Record<string, string> = {
  id: 'Id',
  title: 'Title',
  subtitle: 'Subtitle',
  stage: 'Stage',
  instruction: 'Instruction',
  hint: 'Hint',
  target: 'Spotlight',
  check: 'Passes when',
  requires: 'Before the step',
  estMinutes: 'Minutes',
  courseOrder: 'Place in the course',
  steps: 'Steps',
};

/** Every reason the draft can't be saved yet, in the order of the page. */
export function lessonIssues(lesson: StudioLesson): LessonIssue[] {
  const parsed = studioLessonSchema.safeParse(canonicalLesson(lesson));
  if (parsed.success) return [];
  return parsed.error.issues.map((issue) => {
    const [first, index, field] = issue.path;
    if (first === 'steps' && typeof index === 'number') {
      const step = lesson.steps[index];
      const name = `Step ${index + 1}${step?.id ? ` (${step.id})` : ''}`;
      const what =
        typeof field === 'string' ? (FIELD_WORDS[field] ?? field) : '';
      return {
        where: what ? `${name} · ${what}` : name,
        message: issue.message,
        step: index,
      };
    }
    return {
      where: FIELD_WORDS[String(first)] ?? String(first ?? 'Lesson'),
      message: issue.message,
      step: null,
    };
  });
}

const blank = (value: string | undefined) =>
  value === undefined || value.trim() === '';

/** A step without its empty fields, as its file holds it. */
function canonicalStep(step: StudioLessonStep): StudioLessonStep {
  const out: StudioLessonStep = {
    id: step.id,
    stage: step.stage,
    instruction: step.instruction,
  };
  if (!blank(step.hint)) out.hint = step.hint;
  const targets = (
    step.target === undefined
      ? []
      : typeof step.target === 'string'
        ? [step.target]
        : step.target
  ).filter((t) => t.trim() !== '');
  if (targets.length) out.target = targets.length === 1 ? targets[0] : targets;
  if (step.rack) out.rack = step.rack;
  const requires = Object.fromEntries(
    Object.entries(step.requires ?? {}).filter(([, v]) => v !== undefined),
  );
  if (Object.keys(requires).length) out.requires = requires;
  if (step.check) out.check = step.check;
  if (step.demo) out.demo = step.demo;
  return out;
}

/**
 * The lesson laid out as its file is: fields in order, empties dropped, and
 * Premium as its steps make it (a step in Prism needs it).
 */
export function canonicalLesson(lesson: StudioLesson): StudioLesson {
  const steps = lesson.steps.map(canonicalStep);
  return {
    id: lesson.id,
    title: lesson.title,
    subtitle: lesson.subtitle,
    difficulty: lesson.difficulty,
    estMinutes: lesson.estMinutes,
    requiresPremium: lessonNeedsPremium(steps),
    ...(lesson.course
      ? { course: lesson.course, courseOrder: lesson.courseOrder }
      : {}),
    ...(blank(lesson.seed) ? {} : { seed: lesson.seed }),
    status: lesson.status,
    steps,
  };
}

export const sameLesson = (a: StudioLesson, b: StudioLesson) =>
  JSON.stringify(canonicalLesson(a)) === JSON.stringify(canonicalLesson(b));

/** A step id not yet in the lesson: `step`, `step-2`… */
export const newStepId = (lesson: StudioLesson, base = 'step') =>
  studioLessonId(base, new Set(lesson.steps.map((s) => s.id)));

/** The lesson as a JSON download, for a console that can't save. */
export function downloadLesson(lesson: StudioLesson) {
  const blob = new Blob([`${JSON.stringify(lesson, null, 2)}\n`], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${lesson.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** A step moved from one place to another. */
export function moveStep(
  lesson: StudioLesson,
  from: number,
  to: number,
): StudioLesson {
  if (to < 0 || to >= lesson.steps.length || from === to) return lesson;
  const steps = [...lesson.steps];
  const [step] = steps.splice(from, 1);
  steps.splice(to, 0, step);
  return { ...lesson, steps };
}
