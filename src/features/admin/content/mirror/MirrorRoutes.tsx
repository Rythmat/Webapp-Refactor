import { lazy, useMemo, type ReactNode } from 'react';
import {
  Navigate,
  type RouteObject,
  useLocation,
  useRoutes,
} from 'react-router-dom';
import { LearnRoutes, StudioRoutes } from '@/constants/routes';
import { curriculumPages } from '@/curriculum/routes';
import {
  globePages,
  gamesPages,
  learnPages,
  songsPages,
  studioPages,
} from '@/features/classroom/ClassroomPages';
import { learnIndexRedirect } from '@/features/learn/learnPaths';
import { useLearnInstrument } from '@/features/learn/useInstrumentStore';
import { searchPages } from '@/features/search/routes';
import { NotMirroredYet } from './NotMirroredYet';
import { ClassroomMirror } from './segments/ClassroomMirror';
import { LessonMirrorPage } from './segments/LessonMirrorPage';
import { SongMirrorPage } from './segments/SongMirrorPage';
import { TeachMirror } from './segments/TeachMirror';

/**
 * The app's own routes, inside the mirror.
 *
 * Each segment reuses the app's route factory — its `children`, minus the
 * wrapper that mounts the student shell and its guards — so every page a
 * student can reach in Learn, Songs, Curriculum, Globe and the Studio and
 * Arcade dashboards is here, unchanged, and a route added to the app appears
 * in the console without anyone remembering to add it. Only the exceptions
 * are listed: pages that show a student's own data rather than content.
 */

/** The app's Home, as students see it (their own parts as placeholders). */
const HomeInlet = lazy(() =>
  import('@/components/ClassroomLayout/HomeInlet').then((m) => ({
    default: m.HomeInlet,
  })),
);

type Factory = () => { path?: string; children?: RouteObject[] };

/** A segment's app routes, with some of its children replaced. */
const segment = (
  factory: Factory,
  replace: (child: RouteObject) => RouteObject | null = (child) => child,
): RouteObject => {
  const { path, children = [] } = factory();
  return {
    path,
    children: children.flatMap((child) => {
      const next = replace(child);
      return next ? [next] : [];
    }),
  };
};

const notMirrored = (child: RouteObject): RouteObject => ({
  ...child,
  element: <NotMirroredYet />,
  children: undefined,
});

const buildRoutes = (): RouteObject[] => [
  { path: '/', element: <HomeInlet /> },
  // Home: the dashboard only; awards and the plan page are per-student.
  { path: '/home', element: <HomeInlet /> },
  // Learn: the catalog's shelves (owner, 2026-11-04). Old links go where the
  // app sends them. A genre course's level is its lesson, with its Edit mode
  // (`?edit=1`).
  segment(learnPages, (child) =>
    child.index
      ? { ...child, element: <LearnIndexMirror hub={child.element} /> }
      : child.path === LearnRoutes.genreLesson.definition
        ? { ...child, element: <LessonMirrorPage preview={child.element} /> }
        : child,
  ),
  // Songs: the song pages, each with its Edit mode (`?edit=1`); set lists
  // are a student's own.
  segment(songsPages, (child) =>
    child.path?.startsWith('setlists')
      ? notMirrored(child)
      : child.path === ':songId'
        ? { ...child, element: <SongMirrorPage preview={child.element} /> }
        : child,
  ),
  segment(curriculumPages),
  segment(globePages),
  // Studio: its Production lessons. `/studio` is the editor, a student's
  // own project, so it opens only to preview a lesson (`?tutorial=<id>`).
  segment(studioPages, (child) =>
    child.index
      ? { ...child, element: <StudioIndexMirror editor={child.element} /> }
      : child,
  ),
  // Arcade: the dashboard; the games are code, and some open live rooms.
  segment(gamesPages, (child) => (child.index ? child : notMirrored(child))),
  segment(searchPages),
  // Office, in the console, is the curriculum Music Atlas ships to every
  // teacher (a teacher's own Office is their plan, not content).
  { path: '/office', element: <TeachMirror /> },
  { path: '/classrooms/*', element: <ClassroomMirror /> },
  // The first cut of the mirror called the curriculum "Teach".
  { path: '/teach', element: <TeachRedirect /> },
  { path: '*', element: <NotMirroredYet /> },
];

/** Bare /learn: an old link's place, else the catalog's shelves. */
export const LearnIndexMirror = ({ hub }: { hub: ReactNode }) => {
  const instrument = useLearnInstrument();
  const { search, hash } = useLocation();
  const to = learnIndexRedirect(instrument, search, hash);
  return to ? <Navigate replace to={to} /> : <>{hub}</>;
};

/** Bare /studio: a lesson's preview in the real editor, else Production. */
export const StudioIndexMirror = ({ editor }: { editor: ReactNode }) => {
  const { search } = useLocation();
  if (new URLSearchParams(search).get('tutorial')) return <>{editor}</>;
  return <Navigate replace to={StudioRoutes.production()} />;
};

/** Old /teach links land on Office, keeping the unit and day they named. */
const TeachRedirect = () => {
  const { search } = useLocation();
  return <Navigate replace to={`/office${search}`} />;
};

export const MirrorRoutes = () => {
  const routes = useMemo(buildRoutes, []);
  return useRoutes(routes);
};
