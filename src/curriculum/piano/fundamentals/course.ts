import { CurriculumRoutes, LearnRoutes } from '@/constants/routes';

// ── Piano Fundamentals, as a course (owner, 2026-11-05) ────────────────────
// The first step at the keys, for someone who has never played: five short
// guided lessons on the Audio lessons' player, folding in the old Fundamentals
// sections and the Piano and Keyboard Anatomy pages. Free, all of it. A lesson
// is listed before it's written (`built: false`): the path shows it coming.

export interface FundamentalsLesson {
  id: string;
  title: string;
  blurb: string;
  /** How many screens its script has (a test holds it to the script). */
  screens: number;
  built: boolean;
  /** A page that hangs off it, such as the full Anatomy page. */
  side?: { title: string; route: string };
}

export const FUNDAMENTALS_COURSE = {
  id: 'piano-fundamentals',
  title: 'Piano Fundamentals',
  blurb:
    'Your first steps at the keys: how a piano and a keyboard work, and how to find your way round one.',
  accentKey: 'C',
  goals: [
    'Know the parts of a piano and a keyboard, and how each makes its sound',
    'Find any key by the groups of black keys',
    'Name every white key, and the sharps and flats between them',
    'Find Middle C, and sit with your hands in place',
  ],
  lessons: [
    {
      id: 'meet-your-instrument',
      title: 'Meet your instrument',
      blurb: 'What’s inside a piano and a keyboard, and how to sit at one.',
      screens: 23,
      built: true,
      side: { title: 'Take a piano apart', route: LearnRoutes.pianoAnatomy() },
    },
    {
      id: 'the-layout',
      title: 'The layout',
      blurb: 'Low to high, and the groups of two and three black keys.',
      screens: 0,
      built: false,
    },
    {
      id: 'note-names',
      title: 'Note names',
      blurb: 'The musical alphabet, A to G, on the white keys.',
      screens: 0,
      built: false,
    },
    {
      id: 'sharps-and-flats',
      title: 'Sharps & flats',
      blurb: 'The black keys’ two names, and half and whole steps.',
      screens: 0,
      built: false,
    },
    {
      id: 'octaves-and-hands',
      title: 'Octaves, Middle C & your hands',
      blurb: 'Find Middle C, number your fingers, and play in position.',
      screens: 0,
      built: false,
    },
  ] satisfies readonly FundamentalsLesson[] as readonly FundamentalsLesson[],
} as const;

/** The id a lesson's progress and XP are kept under. */
export const fundamentalsLessonKey = (lessonId: string) =>
  `piano:fundamentals:${lessonId}`;

export const fundamentalsLesson = (id: string | undefined) =>
  FUNDAMENTALS_COURSE.lessons.find((lesson) => lesson.id === id);

export const fundamentalsLessonRoute = (lessonId: string) =>
  CurriculumRoutes.fundamentalsLesson({ lessonId });

/** The old course's sections, to the lesson that now teaches each. */
export const SECTION_LESSON: Readonly<Record<string, string>> = {
  '1': 'the-layout',
  '2': 'note-names',
  '3': 'sharps-and-flats',
  '4': 'octaves-and-hands',
  '5': 'octaves-and-hands',
  '6': 'octaves-and-hands',
};

/** A written lesson's page: the whole window, one screen at a time. */
export function isFundamentalsLessonPath(pathname: string): boolean {
  const match = /^\/curriculum\/piano-fundamentals\/([^/]+)\/?$/.exec(pathname);
  return Boolean(match && fundamentalsLesson(match[1])?.built);
}
