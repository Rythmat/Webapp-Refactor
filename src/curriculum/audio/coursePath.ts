import { discRatio } from '@/components/learn/path/pathGeometry';
import type { PathCourse, PathRow } from '@/components/learn/path/types';
import { LearnRoutes } from '@/constants/routes';
import { exploreHref } from '@/features/learn/catalog/exploreState';
import { colorForKeyMode } from '@/lib/modeColorShift';
import {
  AUDIO_MODULES,
  audioLessonRoute,
  courseRows,
  LAB_STEPS,
  type AudioModule,
  type CourseRow,
} from './catalog';
import { rowPercent } from './lab/audioProgress';

type Completed = Readonly<Record<string, number>>;

const LEVEL_ID = 'course';

const rowTitle = (row: CourseRow) =>
  row.kind === 'lab' ? row.topic.title : row.lesson.title;

const rowId = (row: CourseRow) =>
  row.kind === 'lab' ? row.topic.id : row.lesson.id;

const rowBlurb = (row: CourseRow) => {
  if (row.kind === 'lab') return row.topic.sub;
  return row.kind === 'guided' ? row.lesson.blurb : undefined;
};

const rowRoute = (module: AudioModule, row: CourseRow) => {
  const route = audioLessonRoute(module, row.lesson);
  return row.kind === 'lab' ? `${route}?topic=${row.topic.id}` : route;
};

const stepsIn = (row: CourseRow) => {
  if (row.kind === 'guided') return row.lesson.screens;
  return row.kind === 'lab' ? LAB_STEPS.length : 0;
};

/** The course after this one on Audio's shelf. */
function followingCourse(module: AudioModule) {
  const courses = AUDIO_MODULES.filter((m) => m.shelf);
  return courses[courses.indexOf(module) + 1];
}

/** An Audio course, as its path page draws it. */
export function audioCoursePath(
  module: AudioModule,
  completedAt: Completed,
  isPremium: boolean,
): PathCourse {
  const courseRowsList = courseRows(module);
  const locked = module.access === 'premium' && !isPremium;
  const rows: PathRow[] = courseRowsList.map((row, i) => ({
    id: rowId(row),
    title: rowTitle(row),
    blurb: rowBlurb(row),
    ratio: discRatio(i),
    levelId: LEVEL_ID,
    route: rowRoute(module, row),
    percent: rowPercent(completedAt, module, row),
    tracked: row.kind === 'guided' || row.kind === 'lab',
    locked,
    side:
      row.kind === 'guided' && row.side
        ? { title: row.side.title, route: row.side.route }
        : undefined,
  }));
  const counted = courseRowsList.filter(
    (row) => row.kind === 'guided' || row.kind === 'lab',
  );
  const next = followingCourse(module);
  return {
    id: module.id,
    title: module.title,
    description: module.blurb ?? '',
    accent: colorForKeyMode(module.accentKey),
    ratio: module.lessons[0].ratio,
    stats: [
      `${counted.length} lessons`,
      `${counted.reduce((sum, row) => sum + stepsIn(row), 0)} steps`,
      ...(module.access === 'free' ? ['Free'] : []),
    ],
    back: { label: 'Learn', to: exploreHref('audio') },
    levels: [
      {
        id: LEVEL_ID,
        kicker: 'Level 1',
        title: module.unit ?? module.title,
        goals: module.goals ?? [],
      },
    ],
    rows,
    upNext: next
      ? {
          title: next.title,
          blurb: next.blurb ?? '',
          to: LearnRoutes.audioCourse({ module: next.id }),
        }
      : undefined,
  };
}
