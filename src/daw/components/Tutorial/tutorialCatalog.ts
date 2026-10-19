// ── Production lesson catalog ──────────────────────────────────────────────
// What a lesson tile shows, and whether the lesson needs Premium, without its
// steps. The Studio dashboard's Production tab imports only this, so it stays
// free of the step checks and the prism-engine barrel that tutorials.ts
// carries (audit practice-tutorial-25); tutorials.ts adds the steps to these
// entries by id.
//
// Pure data and functions on purpose: no imports, so the dashboard chunk can
// take it as is. That includes the courses: a course (Studio Basics) is a
// run of lessons taken in order, and Start Here, Teach and the dashboard read
// its order and its progress from here too.

export type TutorialDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

/** A course of lessons taken in order (TUTORIAL_COURSES). */
export type TutorialCourseId = 'studio-basics';

export interface TutorialCatalogEntry {
  id: string;
  title: string;
  subtitle: string;
  difficulty: TutorialDifficulty;
  estMinutes: number;
  /**
   * The lesson has steps in Prism, which is part of Premium, so a free
   * student gets the upgrade prompt instead of the lesson (owner decision 8:
   * Prism is not unlocked during lessons). tutorialCatalog.test.ts derives
   * this from the steps, so it can't drift from them.
   */
  requiresPremium: boolean;
  /** The course the lesson belongs to, if any, and its place in it (1 on). */
  course?: TutorialCourseId;
  courseOrder?: number;
  /**
   * The demo song (demoProjects.ts) a cold start opens the lesson on, when
   * it isn't its course's. A lesson with no seed of either kind opens on a
   * blank project, as the Production lessons always have.
   */
  seed?: string;
}

/**
 * Every Production lesson. The dashboard lists the courses' lessons first,
 * each course in its own order (TUTORIAL_COURSES), then the rest in this
 * order.
 */
export const TUTORIAL_CATALOG = [
  {
    id: 'make-first-track',
    title: 'Make your first track',
    subtitle:
      'Add an instrument, build a progression, shape the feel, and hear it play.',
    difficulty: 'Beginner',
    estMinutes: 5,
    requiresPremium: true,
  },

  // ── Genre pack: one lesson per genre, each a different craft area ──────
  {
    id: 'jazz-color-your-chords',
    title: 'Jazz — Color your chords',
    subtitle: 'Modes, seventh chords, and swing — harmony with flavor.',
    difficulty: 'Beginner',
    estMinutes: 4,
    requiresPremium: true,
  },
  {
    id: 'hiphop-build-the-beat',
    title: 'Hip Hop — Build the beat',
    subtitle: 'Program drums, slow the tempo, and find the pocket.',
    difficulty: 'Beginner',
    estMinutes: 4,
    requiresPremium: false,
  },
  {
    id: 'pop-flip-a-sample',
    title: 'Pop — Flip a sample',
    subtitle: 'Load a one-shot and play it like an instrument.',
    difficulty: 'Beginner',
    estMinutes: 3,
    requiresPremium: false,
  },
  {
    id: 'edm-design-the-drop',
    title: 'EDM — Design the drop',
    subtitle: 'Wobble bass, minor keys, and saturation — our take on dubstep.',
    difficulty: 'Intermediate',
    estMinutes: 5,
    requiresPremium: true,
  },
  {
    id: 'house-make-it-pump',
    title: 'House — Make it pump',
    subtitle: 'Sidechain the bass to the kick — the classic pumping groove.',
    difficulty: 'Intermediate',
    estMinutes: 4,
    requiresPremium: false,
  },
  {
    id: 'rnb-mix-and-polish',
    title: 'R&B — Mix & polish',
    subtitle: 'Reverb, balance, and a mastering touch — make it smooth.',
    difficulty: 'Intermediate',
    estMinutes: 4,
    requiresPremium: true,
  },
  {
    id: 'indie-movement-and-dynamics',
    title: 'Indie — Movement & dynamics',
    subtitle: 'Automate volume, pan and sends so your mix breathes.',
    difficulty: 'Intermediate',
    estMinutes: 3,
    requiresPremium: false,
  },

  // ── Studio Basics: the beginner's tour, stop 4 of Start Here ───────────
  // Free, like everything on the Start Here path. The steps are in
  // studioBasics/studioBasicsLessons.ts.
  {
    id: 'studio-basics-your-tracks',
    title: 'Your Tracks',
    subtitle: 'Meet the tracks in a song and the views that show them.',
    difficulty: 'Beginner',
    estMinutes: 3,
    requiresPremium: false,
    course: 'studio-basics',
    courseOrder: 1,
  },
  {
    id: 'studio-basics-add-a-track',
    title: 'Add a Track',
    subtitle: 'Pick an instrument and give your song a new part.',
    difficulty: 'Beginner',
    estMinutes: 3,
    requiresPremium: false,
    course: 'studio-basics',
    courseOrder: 2,
  },
  {
    id: 'studio-basics-record',
    title: 'Record',
    subtitle: 'Play along with your song and keep your own take.',
    difficulty: 'Beginner',
    estMinutes: 4,
    requiresPremium: false,
    course: 'studio-basics',
    courseOrder: 3,
  },
  {
    id: 'studio-basics-piano-roll',
    title: 'The Piano Roll',
    subtitle: 'See every note, then move, stretch and draw your own.',
    difficulty: 'Beginner',
    estMinutes: 4,
    requiresPremium: false,
    course: 'studio-basics',
    courseOrder: 4,
  },
  {
    id: 'studio-basics-insight',
    title: 'Insight',
    subtitle: 'See the key and the chords your song is using.',
    difficulty: 'Beginner',
    estMinutes: 3,
    requiresPremium: false,
    course: 'studio-basics',
    courseOrder: 5,
  },
  {
    id: 'studio-basics-score',
    title: 'The Score',
    subtitle: 'Your song as sheet music, ready to read and print.',
    difficulty: 'Beginner',
    estMinutes: 4,
    requiresPremium: false,
    course: 'studio-basics',
    courseOrder: 6,
  },
  {
    id: 'studio-basics-lead-sheet',
    title: 'The Lead Sheet',
    subtitle: 'The chords over the melody, the way a band reads a song.',
    difficulty: 'Beginner',
    estMinutes: 4,
    requiresPremium: false,
    course: 'studio-basics',
    courseOrder: 7,
  },
  {
    id: 'studio-basics-loop-and-repeat',
    title: 'Loop and Repeat',
    subtitle: 'Loop a part to practice it, and repeat your best ideas.',
    difficulty: 'Beginner',
    estMinutes: 4,
    requiresPremium: false,
    course: 'studio-basics',
    courseOrder: 8,
  },
  {
    id: 'studio-basics-save-and-export',
    title: 'Save and Export',
    subtitle: 'Keep your song, then share it as audio, MIDI or a printout.',
    difficulty: 'Beginner',
    estMinutes: 3,
    requiresPremium: false,
    course: 'studio-basics',
    courseOrder: 9,
  },
] as const satisfies readonly TutorialCatalogEntry[];

/** A lesson's id: tutorials.ts must give steps to exactly these. */
export type TutorialId = (typeof TUTORIAL_CATALOG)[number]['id'];

export function getTutorialEntry(
  id: string | null,
): TutorialCatalogEntry | null {
  if (!id) return null;
  return (
    (TUTORIAL_CATALOG as readonly TutorialCatalogEntry[]).find(
      (t) => t.id === id,
    ) ?? null
  );
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
   * The demo song (demoProjects.ts) a cold start opens its lessons on: from
   * the Production tab, a Teach slide or Start Here. A lesson started from
   * inside the editor runs on the open project instead (startTutorial is
   * that "in place" start). Until the demo exists, the boot opens
   * FALLBACK_LESSON_SEED (demoSeed.ts) without a word.
   */
  seed: string;
}

export const TUTORIAL_COURSES: readonly TutorialCourse[] = [
  {
    id: 'studio-basics',
    title: 'Studio Basics',
    description:
      'Nine short tutorials around the Studio: watch each tool in action, then try it on a real song.',
    lessonIds: [
      'studio-basics-your-tracks',
      'studio-basics-add-a-track',
      'studio-basics-record',
      'studio-basics-piano-roll',
      'studio-basics-insight',
      'studio-basics-score',
      'studio-basics-lead-sheet',
      'studio-basics-loop-and-repeat',
      'studio-basics-save-and-export',
    ],
    seed: 'demo-studio-basics',
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

/** A course's lessons, in order, as catalog entries. */
export function courseLessons(
  course: TutorialCourse,
): readonly TutorialCatalogEntry[] {
  return course.lessonIds.flatMap((id) => {
    const entry = getTutorialEntry(id);
    return entry ? [entry] : [];
  });
}

/** Where lesson `id` sits in its course: "Lesson 3 of 9". */
export function lessonPlace(
  id: string | null,
): { course: TutorialCourse; number: number; total: number } | null {
  const course = courseOfLesson(id);
  if (!course || !id) return null;
  const index = course.lessonIds.indexOf(id as TutorialId);
  if (index === -1) return null;
  return { course, number: index + 1, total: course.lessonIds.length };
}

/** The lesson after `id` in its course, or null after the last one. */
export function nextCourseLesson(
  id: string | null,
): TutorialCatalogEntry | null {
  const place = lessonPlace(id);
  if (!place) return null;
  return getTutorialEntry(place.course.lessonIds[place.number] ?? null);
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
