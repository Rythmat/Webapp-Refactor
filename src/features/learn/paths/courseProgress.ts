import type { PathCourse, PathRow } from '@/components/learn/path/types';

// ── How far through a course, and what comes next ──────────────────────────
// One answer for every course, whatever teaches it: the path page, Explore's
// cards and the Learn dashboard all read these, so they never disagree.

/** The course's progress, 0 to 100: the mean of its tracked stops. */
export function coursePercent(course: Pick<PathCourse, 'rows'>): number {
  // A stop still to be written counts, as not done: a course isn't finished
  // while lessons are coming.
  const tracked = course.rows.filter((row) => row.tracked || row.soon);
  if (!tracked.length) return 0;
  return Math.round(
    tracked.reduce((sum, row) => sum + Math.min(100, row.percent), 0) /
      tracked.length,
  );
}

/** A stop that's been finished. */
export const isRowDone = (row: PathRow) => row.tracked && row.percent >= 100;

/**
 * The first tracked stop not yet finished, or null once all are. `skip` reads
 * one stop as unfinished for a moment (the path page's just-finished stop).
 */
export function nextRow(
  course: Pick<PathCourse, 'rows'>,
  skip?: string | null,
): PathRow | null {
  return (
    course.rows.find(
      (row) => row.tracked && (!isRowDone(row) || row.id === skip),
    ) ?? null
  );
}

/** The word on the button that opens a stop. */
export function primaryLabel(row: PathRow, isNext: boolean): string {
  if (row.soon) return 'Coming soon';
  if (row.locked) return 'Subscribe to unlock';
  if (isRowDone(row)) return 'Go over it';
  if (row.percent > 0) return 'Continue';
  return isNext ? 'Start' : 'Jump here';
}

/** How many of a course's tracked stops are finished, of how many. */
export function stopsDone(course: Pick<PathCourse, 'rows'>): {
  done: number;
  total: number;
} {
  const tracked = course.rows.filter((row) => row.tracked || row.soon);
  return {
    done: tracked.filter(isRowDone).length,
    total: tracked.length,
  };
}
