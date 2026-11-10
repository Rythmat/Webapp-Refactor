// ── Production lesson catalog ──────────────────────────────────────────────
// What a lesson tile shows, and whether the lesson needs Premium, without its
// steps. The Studio dashboard's Production tab imports only this, so it stays
// free of the step checks and the prism-engine barrel that tutorials.ts
// carries (audit practice-tutorial-25); tutorials.ts adds the steps to these
// entries by id.
//
// Data and functions on purpose, with no Studio imports, so the dashboard
// chunk can take it as is. That includes the courses: a course (Studio
// Basics) is a run of lessons taken in order, and Start Here, Teach and the
// dashboard read its order and its progress from here too.
//
// The lessons written in the console (curriculum/engine/studioLessons) join
// these: one with a code lesson's id replaces its entry, any other is a new
// lesson. `listTutorialCatalog` is the merged list; TUTORIAL_CATALOG is the
// code's own.

import { lessonNeedsPremium } from '@/content/studioLessons/premium';
import type { StudioLesson } from '@/content/studioLessons/schemas';
import { listStudioLessons } from '@/curriculum/engine/studioLessons/registry';

export type TutorialDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

/** A course of lessons taken in order (TUTORIAL_COURSES). */
export type TutorialCourseId = 'studio-production';

export interface TutorialCatalogEntry {
  id: string;
  title: string;
  subtitle: string;
  difficulty: TutorialDifficulty;
  estMinutes: number;
  /**
   * The lesson has steps in the old Prism panel, which is part of Premium,
   * so a free student gets the upgrade prompt instead of the lesson (owner
   * decision 8). tutorialCatalog.test.ts derives this from the steps, so it
   * can't drift from them. The lessons rebuilt on 2026-11-09 teach Prism as
   * the prompt bar and are all free.
   */
  requiresPremium: boolean;
  /** The course the lesson belongs to, if any, and its place in it (1 on). */
  course?: TutorialCourseId;
  courseOrder?: number;
  /**
   * The demo song (demoProjects.ts) a cold start opens the lesson on, when
   * it isn't its course's. Every lesson today starts from a blank project
   * (owner, 2026-11-09), so none has one.
   */
  seed?: string;
}

/**
 * Every Production lesson, the Studio Production course's in its order.
 * Each starts from a blank project and builds something from nothing
 * (owner, 2026-11-09): Studio Basics is a first song, start to finish; the
 * others each go deeper into one craft, in a genre.
 */
export const TUTORIAL_CATALOG = [
  {
    id: 'studio-basics',
    title: 'Studio Basics: make your first song',
    subtitle:
      'From an empty project to a finished song: drums, chords, a melody and a bass line, arranged, saved and exported.',
    difficulty: 'Beginner',
    estMinutes: 25,
    requiresPremium: false,
    course: 'studio-production',
    courseOrder: 1,
  },

  // ── Genre pack: one lesson per genre, each a different craft area ──────
  {
    id: 'hiphop-build-the-beat',
    title: 'Hip Hop — Build the beat',
    subtitle: 'Program drums, slow the tempo, and find the pocket.',
    difficulty: 'Beginner',
    estMinutes: 4,
    requiresPremium: false,
    course: 'studio-production',
    courseOrder: 2,
  },
  {
    id: 'house-make-it-pump',
    title: 'House — Make it pump',
    subtitle: 'Sidechain the bass to the kick — the classic pumping groove.',
    difficulty: 'Intermediate',
    estMinutes: 4,
    requiresPremium: false,
    course: 'studio-production',
    courseOrder: 3,
  },
  {
    id: 'edm-design-the-drop',
    title: 'EDM — Design the drop',
    subtitle: 'Wobble bass, minor keys, and saturation — our take on dubstep.',
    difficulty: 'Intermediate',
    estMinutes: 5,
    requiresPremium: true,
    course: 'studio-production',
    courseOrder: 4,
  },
  {
    id: 'jazz-color-your-chords',
    title: 'Jazz — Color your chords',
    subtitle: 'Modes, seventh chords, and swing — harmony with flavor.',
    difficulty: 'Beginner',
    estMinutes: 4,
    requiresPremium: true,
    course: 'studio-production',
    courseOrder: 5,
  },
  {
    id: 'rnb-mix-and-polish',
    title: 'R&B — Mix & polish',
    subtitle: 'Reverb, balance, and a mastering touch — make it smooth.',
    difficulty: 'Intermediate',
    estMinutes: 4,
    requiresPremium: true,
    course: 'studio-production',
    courseOrder: 6,
  },
  {
    id: 'indie-movement-and-dynamics',
    title: 'Indie — Movement & dynamics',
    subtitle: 'Automate volume, pan and sends so your mix breathes.',
    difficulty: 'Intermediate',
    estMinutes: 3,
    requiresPremium: false,
    course: 'studio-production',
    courseOrder: 7,
  },
] as const satisfies readonly TutorialCatalogEntry[];

/**
 * Lessons that went, by id → the lesson that took their place, so a link,
 * a Teach slide or Start Here that still names one opens its successor.
 * The nine short Studio Basics lessons and Make your first track became the
 * one Studio Basics lesson (owner, 2026-11-09).
 */
export const LEGACY_LESSON_IDS: Readonly<Record<string, TutorialId>> = {
  'make-first-track': 'studio-basics',
  'studio-basics-your-tracks': 'studio-basics',
  'studio-basics-add-a-track': 'studio-basics',
  'studio-basics-record': 'studio-basics',
  'studio-basics-piano-roll': 'studio-basics',
  'studio-basics-insight': 'studio-basics',
  'studio-basics-score': 'studio-basics',
  'studio-basics-lead-sheet': 'studio-basics',
  'studio-basics-loop-and-repeat': 'studio-basics',
  'studio-basics-save-and-export': 'studio-basics',
};

/** The id a lesson goes by today, following LEGACY_LESSON_IDS. */
export function currentLessonId(id: string): string {
  return Object.prototype.hasOwnProperty.call(LEGACY_LESSON_IDS, id)
    ? LEGACY_LESSON_IDS[id]
    : id;
}

/** A lesson's id: tutorials.ts must give steps to exactly these. */
export type TutorialId = (typeof TUTORIAL_CATALOG)[number]['id'];

/** A console lesson's tile: its catalog fields, Premium by its steps. */
export function fileCatalogEntry(lesson: StudioLesson): TutorialCatalogEntry {
  return {
    id: lesson.id,
    title: lesson.title,
    subtitle: lesson.subtitle,
    difficulty: lesson.difficulty,
    estMinutes: lesson.estMinutes,
    requiresPremium: lessonNeedsPremium(lesson.steps),
    ...(lesson.course
      ? { course: lesson.course, courseOrder: lesson.courseOrder }
      : {}),
    ...(lesson.seed ? { seed: lesson.seed } : {}),
  };
}

/**
 * Every Production lesson: the code's, each replaced by a console lesson of
 * the same id, then the console's new lessons by title.
 */
export function listTutorialCatalog(): readonly TutorialCatalogEntry[] {
  const files = new Map(listStudioLessons().map((l) => [l.id, l]));
  const code = (TUTORIAL_CATALOG as readonly TutorialCatalogEntry[]).map(
    (entry) => {
      const file = files.get(entry.id);
      return file ? fileCatalogEntry(file) : entry;
    },
  );
  const added = [...files.values()]
    .filter((l) => !code.some((e) => e.id === l.id))
    .sort((a, b) => a.title.localeCompare(b.title))
    .map(fileCatalogEntry);
  return [...code, ...added];
}

export function getTutorialEntry(
  id: string | null,
): TutorialCatalogEntry | null {
  if (!id) return null;
  const current = currentLessonId(id);
  return listTutorialCatalog().find((t) => t.id === current) ?? null;
}

// ── Courses ────────────────────────────────────────────────────────────────

export interface TutorialCourse {
  id: TutorialCourseId;
  title: string;
  /** One sentence-case line: what the course is. */
  description: string;
  /** Its lessons, in the order they are taken. */
  lessonIds: readonly TutorialId[];
  /**
   * The demo song (demoProjects.ts) a cold start opens its lessons on, if
   * any: from the Production tab, a Teach slide or Start Here. Left out, they
   * start from a blank project, as every lesson does today (owner,
   * 2026-11-09). Until a named demo exists, the boot opens
   * FALLBACK_LESSON_SEED (demoSeed.ts) without a word.
   */
  seed?: string;
}

export const TUTORIAL_COURSES: readonly TutorialCourse[] = [
  {
    id: 'studio-production',
    title: 'Studio Production',
    description:
      'Start with your first song, then go deeper: beats, sidechain, sound design, harmony, mixing and arrangement. Every lesson starts from an empty project.',
    lessonIds: [
      'studio-basics',
      'hiphop-build-the-beat',
      'house-make-it-pump',
      'edm-design-the-drop',
      'jazz-color-your-chords',
      'rnb-mix-and-polish',
      'indie-movement-and-dynamics',
    ],
  },
];

export function getTutorialCourse(
  id: string | null | undefined,
): TutorialCourse | null {
  if (!id) return null;
  return TUTORIAL_COURSES.find((c) => c.id === id) ?? null;
}

/** The course lesson `id` belongs to, or null for a lesson on its own. */
export function courseOfLesson(id: string | null): TutorialCourse | null {
  return getTutorialCourse(getTutorialEntry(id)?.course);
}

/**
 * A course's lessons, in order, as catalog entries: every lesson naming the
 * course, by its place in it (a console lesson may join one).
 */
export function courseLessons(
  course: TutorialCourse,
): readonly TutorialCatalogEntry[] {
  const declared = (id: string) => {
    const i = (course.lessonIds as readonly string[]).indexOf(id);
    return i === -1 ? Infinity : i;
  };
  return listTutorialCatalog()
    .filter((t) => t.course === course.id)
    .sort(
      (a, b) =>
        (a.courseOrder ?? Infinity) - (b.courseOrder ?? Infinity) ||
        declared(a.id) - declared(b.id),
    );
}

/** Where lesson `id` sits in its course: "Lesson 3 of 9". */
export function lessonPlace(
  id: string | null,
): { course: TutorialCourse; number: number; total: number } | null {
  const course = courseOfLesson(id);
  if (!course || !id) return null;
  const ids = courseLessons(course).map((t) => t.id);
  const index = ids.indexOf(id);
  if (index === -1) return null;
  return { course, number: index + 1, total: ids.length };
}

/** The lesson after `id` in its course, or null after the last one. */
export function nextCourseLesson(
  id: string | null,
): TutorialCatalogEntry | null {
  const place = lessonPlace(id);
  if (!place) return null;
  return courseLessons(place.course)[place.number] ?? null;
}

/** Completion times by lesson id, as useTutorialProgressStore keeps them. */
export type CompletedLessons = Readonly<Record<string, number | undefined>>;

export interface CourseProgress {
  done: number;
  total: number;
  /** Every lesson finished at least once. */
  complete: boolean;
  /**
   * Where Start or Continue goes: the first lesson not finished yet, or the
   * first lesson once they all are (to take the course again).
   */
  next: TutorialCatalogEntry;
}

/** How far a student is through a course, from their completions. */
export function courseProgress(
  course: TutorialCourse,
  completedAt: CompletedLessons,
): CourseProgress {
  const lessons = courseLessons(course);
  const finished = (t: TutorialCatalogEntry) => completedAt[t.id] != null;
  const done = lessons.filter(finished).length;
  return {
    done,
    total: lessons.length,
    complete: lessons.length > 0 && done === lessons.length,
    next: lessons.find((t) => !finished(t)) ?? lessons[0],
  };
}

/**
 * The demo song lesson `id` opens on from a cold start: its own `seed`, or
 * its course's; null for a lesson that opens on a blank project.
 */
export function lessonSeed(id: string | null): string | null {
  const entry = getTutorialEntry(id);
  if (!entry) return null;
  return entry.seed ?? getTutorialCourse(entry.course)?.seed ?? null;
}

/** True when a student on this plan must upgrade before lesson `id` runs. */
export function lessonNeedsUpgrade(
  id: string | null,
  isPremium: boolean,
): boolean {
  return !isPremium && Boolean(getTutorialEntry(id)?.requiresPremium);
}

/**
 * What opening lesson `id` should do, given the student's plan (callers get
 * it through useLessonAccess, which reads useIsPremium()):
 * - 'open': start it (a free lesson, a premium student, or an id the
 *   catalog doesn't know, which the editor's boot turns away itself);
 * - 'wait': a Premium lesson while the plan is still loading, during which
 *   useIsPremium reports false for everyone, so deciding now would turn a
 *   premium student away;
 * - 'upgrade': a Premium lesson for a free student: show the upgrade prompt.
 */
export type LessonAccess = 'open' | 'wait' | 'upgrade';

export function lessonAccess(
  id: string | null,
  premium: { isPremium: boolean; isLoading: boolean },
): LessonAccess {
  if (!lessonNeedsUpgrade(id, premium.isPremium)) return 'open';
  return premium.isLoading ? 'wait' : 'upgrade';
}
