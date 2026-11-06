import { useMemo } from 'react';
import { getSong } from '@/curriculum/data/songs';
import type { Song } from '@/curriculum/types/songLibrary';
import {
  allCourses,
  type CatalogCourse,
  type CatalogTopic,
} from '@/features/learn/catalog/learnCatalog';

// ── Staff Picks (owner, 2026-11-04: console-managed) ───────────────────────
// What the team features on the Learn dashboard: courses and songs, in order.
// The console will publish this list as its own content kind once the API
// has one (backend follow-up); until then the bundled list below stands in,
// in exactly the shape the console will publish, and useStaffPicks is the
// one place that reads it.

export interface StaffPick {
  kind: 'course' | 'song';
  /** A catalog course id (`piano/genre/pop`) or a song id (`dreams`). */
  id: string;
  /** Why the team picked it, shown under its title. */
  note?: string;
}

export const BUNDLED_STAFF_PICKS: readonly StaffPick[] = [
  { kind: 'course', id: 'piano/genre/pop', note: 'Our favourite first course' },
  { kind: 'song', id: 'dreams' },
  {
    kind: 'course',
    id: 'audio/course/sound-basics',
    note: 'Free for everyone',
  },
  { kind: 'course', id: 'piano/theory/diatonic' },
  { kind: 'song', id: 'africa' },
];

export type ResolvedPick =
  | { kind: 'course'; pick: StaffPick; course: CatalogCourse }
  | { kind: 'song'; pick: StaffPick; song: Song };

/** The picks that name something real, in their order. */
export function resolveStaffPicks(
  picks: readonly StaffPick[],
  topics: readonly CatalogTopic[],
  songOf: (id: string) => Song | null | undefined = getSong,
): ResolvedPick[] {
  const courses = new Map(allCourses(topics).map((c) => [c.id, c]));
  return picks.flatMap((pick): ResolvedPick[] => {
    if (pick.kind === 'course') {
      const course = courses.get(pick.id);
      return course && !course.comingSoon
        ? [{ kind: 'course', pick, course }]
        : [];
    }
    const song = songOf(pick.id);
    return song ? [{ kind: 'song', pick, song }] : [];
  });
}

/** The dashboard's Staff Picks, resolved against the catalog and songs. */
export function useStaffPicks(topics: readonly CatalogTopic[]): ResolvedPick[] {
  return useMemo(
    () => resolveStaffPicks(BUNDLED_STAFF_PICKS, topics),
    [topics],
  );
}
