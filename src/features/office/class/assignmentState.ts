import type { Assignment } from '@/features/classroom/assignments/assignmentsStore';
import type {
  AssignmentProgress,
  AssignmentProgressStatus,
} from '@/features/classroom/assignments/useAssignmentProgress';
import type { StatusTone } from '../ui/StatusPill';

// ── How an assignment stands, in one place (owner, 2026-11-09) ─────────────
// The Assignments list, the assignment Inspector and the student Inspector
// all read these, so "3 of 12 done" and "Overdue" agree on every surface.

export type AssignmentGroup =
  | 'overdue'
  | 'due-soon'
  | 'upcoming'
  | 'no-date'
  | 'closed';

export const GROUP_TITLE: Record<AssignmentGroup, string> = {
  overdue: 'Past due',
  'due-soon': 'Due this week',
  upcoming: 'Later',
  'no-date': 'No due date',
  closed: 'Closed',
};

export const GROUP_ORDER: AssignmentGroup[] = [
  'overdue',
  'due-soon',
  'upcoming',
  'no-date',
  'closed',
];

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const assignmentGroup = (
  a: Pick<Assignment, 'status' | 'dueAt'>,
  now: number,
): AssignmentGroup => {
  if (a.status === 'closed') return 'closed';
  if (!a.dueAt) return 'no-date';
  const due = new Date(a.dueAt).getTime();
  if (Number.isNaN(due)) return 'no-date';
  if (due < now) return 'overdue';
  return due - now <= WEEK_MS ? 'due-soon' : 'upcoming';
};

export interface ProgressCounts {
  done: number;
  started: number;
  /** Students on the roster with no progress yet. */
  notStarted: number;
  total: number;
}

/**
 * Counts against the roster: the endpoint returns only rows a student has
 * touched, so everyone else on the active roster hasn't started.
 */
export const progressCounts = (
  rows: readonly AssignmentProgress[],
  activeEnrollmentIds: readonly string[],
): ProgressCounts => {
  const byStudent = new Map(rows.map((r) => [r.enrollmentId, r.status]));
  let done = 0;
  let started = 0;
  for (const id of activeEnrollmentIds) {
    const s = byStudent.get(id);
    if (s === 'done') done += 1;
    else if (s === 'in_progress') started += 1;
  }
  const total = activeEnrollmentIds.length;
  return { done, started, notStarted: total - done - started, total };
};

export const PROGRESS_LABEL: Record<AssignmentProgressStatus | 'none', string> =
  {
    done: 'Done',
    in_progress: 'In progress',
    not_started: 'Not started',
    abandoned: 'Stopped',
    none: 'Not started',
  };

export const PROGRESS_TONE: Record<
  AssignmentProgressStatus | 'none',
  StatusTone
> = {
  done: 'success',
  in_progress: 'warning',
  not_started: 'neutral',
  abandoned: 'neutral',
  none: 'neutral',
};

/** "Due Thu, Nov 12, 5:00 PM" — the date a teacher reads at a glance. */
export const formatDue = (iso: string): string =>
  new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
