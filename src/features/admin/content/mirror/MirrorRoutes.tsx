import { useMemo } from 'react';
import {
  Navigate,
  type RouteObject,
  useLocation,
  useRoutes,
} from 'react-router-dom';
import { curriculumPages } from '@/curriculum/routes';
import {
  atlasPages,
  gamesPages,
  learnPages,
  songsPages,
  studioPages,
} from '@/features/classroom/ClassroomPages';
import { searchPages } from '@/features/search/routes';
import { NotMirroredYet } from './NotMirroredYet';
import { ClassroomMirror } from './segments/ClassroomMirror';
import { HomeMirror } from './segments/HomeMirror';
import { LearnMirror } from './segments/LearnMirror';
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
  { path: '/', element: <HomeMirror /> },
  // Home: the dashboard only; awards and the plan page are per-student.
  { path: '/home', element: <HomeMirror /> },
  // Learn, always on a tab (LearnMirror explains why).
  segment(learnPages, (child) =>
    child.index ? { ...child, element: <LearnMirror /> } : child,
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
  segment(atlasPages),
  // Studio: the dashboard and its Production lessons; the editor opens a
  // student's own project.
  segment(studioPages, (child) =>
    child.path === 'editor' ? notMirrored(child) : child,
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

/** Old /teach links land on Office, keeping the unit and day they named. */
const TeachRedirect = () => {
  const { search } = useLocation();
  return <Navigate replace to={`/office${search}`} />;
};

export const MirrorRoutes = () => {
  const routes = useMemo(buildRoutes, []);
  return useRoutes(routes);
};
