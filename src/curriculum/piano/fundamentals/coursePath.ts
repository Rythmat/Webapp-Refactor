import { discRatio } from '@/components/learn/path/pathGeometry';
import type { PathCourse } from '@/components/learn/path/types';
import { CurriculumRoutes } from '@/constants/routes';
import { lessonPercent } from '@/curriculum/audio/lab/audioProgress';
import { exploreHref } from '@/features/learn/catalog/exploreState';
import { colorForKeyMode } from '@/lib/modeColorShift';
import {
  FUNDAMENTALS_COURSE,
  fundamentalsLessonKey,
  fundamentalsLessonRoute,
} from './course';

type Completed = Readonly<Record<string, number>>;

const LEVEL_ID = 'first-steps';

/** Piano Fundamentals, as its path page draws it. */
export function fundamentalsCoursePath(completedAt: Completed): PathCourse {
  const course = FUNDAMENTALS_COURSE;
  return {
    id: course.id,
    title: course.title,
    description: course.blurb,
    accent: colorForKeyMode(course.accentKey),
    // The octave: where the keyboard starts.
    ratio: [1, 2],
    stats: [`${course.lessons.length} lessons`, 'Free'],
    back: { label: 'Learn', to: exploreHref('piano') },
    levels: [
      {
        id: LEVEL_ID,
        kicker: 'Level 1',
        title: 'Your first steps',
        goals: course.goals,
      },
    ],
    rows: course.lessons.map((lesson, i) => ({
      id: lesson.id,
      title: lesson.title,
      blurb: lesson.blurb,
      ratio: discRatio(i),
      levelId: LEVEL_ID,
      route: fundamentalsLessonRoute(lesson.id),
      percent: lesson.built
        ? lessonPercent(
            completedAt,
            fundamentalsLessonKey(lesson.id),
            lesson.screens,
          )
        : 0,
      tracked: lesson.built,
      locked: false,
      soon: !lesson.built,
      side: lesson.side,
    })),
    upNext: {
      title: 'Applied Theory Fundamentals',
      blurb: 'Scales and chords in every key, once you know your way round.',
      to: CurriculumRoutes.appliedTheoryFundamentals(),
    },
  };
}
