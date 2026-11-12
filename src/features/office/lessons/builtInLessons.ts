import { OFFICE_LESSONS_SCOPE } from '@/constants/officeScopes';
import {
  generateDayId,
  newBlankDay,
} from '@/features/classroom/plan/newBlankDay';
import {
  DEFAULT_CORTEX_CHOICES,
  applyCortexLessonToDay,
  planCortexLesson,
  type GroupRole,
} from '@/features/classroom/slides/cortex';
import type { LessonAtlas } from '@/features/classroom/slides/cortex/loadLessonAtlas';
import { focusById } from '@/features/classroom/slides/cortex/suggestFocus';
import type { Day } from '@/features/classroom/types';

// ── The Office's built-in lessons (owner, 2026-11-12) ──────────────────────
// The Lessons tab's lessons are written by the Cortex generator from code,
// not saved by hand, so every teacher has them on every device and they
// follow the slides as the slides change. One for now: Michael Jackson ·
// Producer, the lesson being perfected as the template for every lesson.
//
// Present and the editor read lessons from this device's plan, so each one is
// kept there under OFFICE_LESSONS_SCOPE (see `syncBuiltInLesson`). Teaching
// one copies it into a class, where Go Live works.

export interface BuiltInLesson {
  /** The lesson's day id: the same on every device. */
  dayId: string;
  /** The Atlas focus the Cortex builds it around. */
  focusId: string;
  role: GroupRole;
  label: string;
}

export const BUILT_IN_LESSONS: readonly BuiltInLesson[] = [
  {
    dayId: 'builtin-mj-producer',
    focusId: 'artist:michael-jackson',
    role: 'producer',
    label: 'Michael Jackson · Producer',
  },
];

/** The generator's id token: fixed, so every device writes the same ids. */
const TOKEN = 'builtin';

/** The lesson as the code writes it today, or undefined if the Atlas lost its focus. */
export const generateBuiltInLesson = (
  { graph, catalog }: LessonAtlas,
  lesson: BuiltInLesson,
): Day | undefined => {
  const focus = focusById(graph, catalog, lesson.focusId);
  if (!focus) return undefined;
  const plan = planCortexLesson(graph, catalog, focus);
  const day = applyCortexLessonToDay(
    newBlankDay(lesson.label, lesson.dayId),
    plan,
    { ...DEFAULT_CORTEX_CHOICES, role: lesson.role },
    TOKEN,
  );
  return { ...day, classroomId: OFFICE_LESSONS_SCOPE, scheduledDate: null };
};

/** A short fingerprint of what a teacher can change: the name, cells and slides. */
export const lessonHash = (day: Day): string => {
  const text = JSON.stringify([day.label, day.cells, day.deck ?? null]);
  // FNV-1a, 32-bit: enough to tell "unchanged" from "changed".
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
};

/**
 * What to do with this device's copy of a built-in lesson.
 *
 *  - none yet: write the code's lesson;
 *  - unedited (its hash is the one written) but the code's lesson changed:
 *    replace it, so it follows the slides;
 *  - edited by the teacher: keep it (Restore original brings the code's back).
 */
export const syncBuiltInLesson = (
  stored: Day | undefined,
  writtenHash: string | undefined,
  generated: Day,
): { write: boolean; edited: boolean } => {
  if (!stored) return { write: true, edited: false };
  const storedHash = lessonHash(stored);
  const generatedHash = lessonHash(generated);
  // With no record of what was written, a copy unlike the code's is taken
  // as the teacher's: their work is never overwritten on a guess.
  const edited = storedHash !== (writtenHash ?? generatedHash);
  if (edited) return { write: false, edited: true };
  return { write: storedHash !== generatedHash, edited: false };
};

/**
 * A copy of a lesson for a class: new ids throughout (the generated ids all
 * begin with the lesson's id), the class, and the day it's taught.
 */
export const copyLessonToClass = (
  day: Day,
  classroomId: string,
  date: string | null,
  newId: string = generateDayId(),
): Day => {
  const copy = JSON.parse(JSON.stringify(day).split(day.id).join(newId)) as Day;
  return { ...copy, id: newId, classroomId, scheduledDate: date };
};

export const isBuiltInLessonId = (dayId: string): boolean =>
  BUILT_IN_LESSONS.some((l) => l.dayId === dayId);
