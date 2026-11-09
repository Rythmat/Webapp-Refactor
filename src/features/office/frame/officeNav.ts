import { OfficeRoutes, TeacherRoutes } from '@/constants/routes';

// ── The Office's navigation, from the URL alone (owner, 2026-11-09) ────────
// Two levels, as the LMSs teachers like best have it: the Office's own
// pages (Today, Classes, Planner, Library, Review) and, inside a class,
// that class's pages (Overview, Plan, Assignments, Students, Progress). The
// bottom rail shows whichever set the URL is in; the top rail's crumb says
// where. A pure function, so the rails and the tests agree.

export type OfficeTabId =
  | 'today'
  | 'classes'
  | 'planner'
  | 'library'
  | 'review'
  | 'overview'
  | 'plan'
  | 'assignments'
  | 'students'
  | 'progress';

export interface OfficeTab {
  id: OfficeTabId;
  label: string;
  /** A phone's narrower name, where the rail has less room. */
  short: string;
  to: string;
}

export type OfficeNav =
  | { scope: 'office'; tabs: OfficeTab[]; active: OfficeTabId | null }
  | {
      scope: 'class';
      classroomId: string;
      tabs: OfficeTab[];
      active: OfficeTabId | null;
    };

/** The Office's static first segments: never a classroom id. */
const OFFICE_PAGES: Record<string, OfficeTabId> = {
  classes: 'classes',
  planner: 'planner',
  library: 'library',
  review: 'review',
};

export const officeTabs = (): OfficeTab[] => [
  { id: 'today', label: 'Today', short: 'Today', to: OfficeRoutes.root() },
  {
    id: 'classes',
    label: 'Classes',
    short: 'Classes',
    to: OfficeRoutes.classes(),
  },
  {
    id: 'planner',
    label: 'Planner',
    short: 'Plan',
    to: OfficeRoutes.planner(),
  },
  {
    id: 'library',
    label: 'Library',
    short: 'Library',
    to: OfficeRoutes.library(),
  },
  { id: 'review', label: 'Review', short: 'Review', to: OfficeRoutes.review() },
];

export const classTabs = (classroomId: string): OfficeTab[] => [
  {
    id: 'overview',
    label: 'Overview',
    short: 'Home',
    to: TeacherRoutes.classroomDashboard({ classroomId }),
  },
  {
    id: 'plan',
    label: 'Plan',
    short: 'Plan',
    to: TeacherRoutes.plan({ classroomId }),
  },
  {
    id: 'assignments',
    label: 'Assignments',
    short: 'Work',
    to: TeacherRoutes.assignments({ classroomId }),
  },
  {
    id: 'students',
    label: 'Students',
    short: 'Students',
    to: TeacherRoutes.students({ classroomId }),
  },
  {
    id: 'progress',
    label: 'Progress',
    short: 'Progress',
    to: TeacherRoutes.progress({ classroomId }),
  },
];

/** Which class tab a class page belongs under, by its first segment. */
const CLASS_SECTION: Record<string, OfficeTabId> = {
  plan: 'plan',
  present: 'plan',
  assignments: 'assignments',
  students: 'students',
  progress: 'progress',
  grades: 'progress',
  // A live session and its reports are the class's day-to-day, so they sit
  // under Overview, where the class's recent sessions are listed.
  sessions: 'overview',
  reports: 'overview',
};

/** The Office's navigation for a pathname, or null outside `/office`. */
export const officeNav = (pathname: string): OfficeNav | null => {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'office') return null;
  const first = parts[1];
  if (first === undefined) {
    return { scope: 'office', tabs: officeTabs(), active: 'today' };
  }
  const page = OFFICE_PAGES[first];
  if (page) return { scope: 'office', tabs: officeTabs(), active: page };

  const classroomId = decodeURIComponent(first);
  const section = parts[2];
  return {
    scope: 'class',
    classroomId,
    tabs: classTabs(classroomId),
    active:
      section === undefined ? 'overview' : (CLASS_SECTION[section] ?? null),
  };
};

/**
 * The pages that leave the Office's frame: the projected surfaces, which
 * take the whole screen in front of a class.
 */
const PROJECTED =
  /^\/office\/[^/]+\/(present\/[^/]+|sessions\/[^/]+\/projector)\/?$/;

/** A page drawn in the Office's frame (rails, stage, Inspector). */
export const isOfficeFramePath = (pathname: string): boolean =>
  officeNav(pathname) !== null && !PROJECTED.test(pathname);
