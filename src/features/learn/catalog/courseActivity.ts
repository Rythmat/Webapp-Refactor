import { GENRE_COURSES } from '@/components/learn/genreCourses';
import { audioModule } from '@/curriculum/audio/catalog';
import type { CortexRecords } from '@/features/cortex/ledger';
import { activityForLocation } from '@/features/cortex/routeTable';
import { familyOfMode } from '@/features/learn/paths/theoryFamilies';
import type { CatalogCourse } from './learnCatalog';

// ── Which course a Cortex activity belongs to ──────────────────────────────
// The Cortex ledger is the student's own history on this account (per user,
// unlike the device-wide song and arcade stores), so it's what says which
// course they were last in and what they finished.

const fold = (s: string) =>
  s
    .toLowerCase()
    .replace('&', 'n')
    .replace(/[^a-z0-9]/g, '');

const GENRE_BY_FOLD = new Map(
  GENRE_COURSES.map((course) => [fold(course.slug), course.slug]),
);

/** A course's id for an activity, by the shape of the activity's id. */
function patternCourse(id: string): string | null {
  const colon = id.indexOf(':');
  const kind = id.slice(0, colon);
  const rest = id.slice(colon + 1);
  if (kind === 'theory') {
    // theory:guitar.dorian.d-flat
    const [instrument, mode] = rest.split('.');
    const family = mode ? familyOfMode(mode) : undefined;
    return instrument && family ? `${instrument}/theory/${family.id}` : null;
  }
  if (kind === 'lesson') {
    // lesson:hiphop-l1
    const match = /^(.+)-l\d+$/.exec(rest);
    const slug = match ? GENRE_BY_FOLD.get(match[1]) : undefined;
    return slug ? `piano/genre/${slug}` : null;
  }
  if (kind === 'audio') {
    // audio:hearing.pitch
    const [moduleId, lesson] = rest.split('.');
    const module = audioModule(moduleId);
    if (!module) return null;
    return module.shelf
      ? `audio/course/${module.id}`
      : `audio/${module.id}/${lesson}`;
  }
  return null;
}

/** Maps activity ids to the catalog's course ids. */
export function activityIndex(
  courses: readonly CatalogCourse[],
): (activityId: string) => string | null {
  // A course whose own page is an activity (a technique lesson, an anatomy
  // lesson) maps by its route.
  const byRoute = new Map<string, string>();
  for (const course of courses) {
    const [pathname, search = ''] = course.route.split('?');
    const activity = activityForLocation(pathname, search ? `?${search}` : '');
    if (activity && !byRoute.has(activity)) byRoute.set(activity, course.id);
  }
  const known = new Set(courses.map((course) => course.id));
  return (activityId) => {
    const direct = byRoute.get(activityId);
    if (direct) return direct;
    const course = patternCourse(activityId);
    return course && known.has(course) ? course : null;
  };
}

export interface CourseTouch {
  /** Last seen in any of its activities (minutes since 1970). */
  lastMin: number;
  /** Last finished one of its activities; 0 if none. */
  doneMin: number;
  /** Its activities finished. */
  doneCount: number;
}

/** Each course's latest touch, from the student's Cortex records. */
export function courseTouches(
  courses: readonly CatalogCourse[],
  records: CortexRecords,
): ReadonlyMap<string, CourseTouch> {
  const toCourse = activityIndex(courses);
  const touches = new Map<string, CourseTouch>();
  for (const [activity, [, last, done]] of Object.entries(records)) {
    const course = toCourse(activity);
    if (!course) continue;
    const was = touches.get(course);
    touches.set(course, {
      lastMin: Math.max(was?.lastMin ?? 0, last, done),
      doneMin: Math.max(was?.doneMin ?? 0, done),
      doneCount: (was?.doneCount ?? 0) + (done > 0 ? 1 : 0),
    });
  }
  return touches;
}
