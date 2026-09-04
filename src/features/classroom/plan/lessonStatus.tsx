/**
 * Lesson status — the single derived state a Lesson (`Day`) is in for a
 * classroom (`draft | published | assigned | live`), plus the `StatusChip` that
 * renders it. Extracted from `PlanPage` so the Lessons page and the Calendar
 * Week view (`WeekDayCard`) share ONE derivation + chip and never drift.
 */
import type { Assignment } from '../assignments/useAssignments';
import type { SessionState } from '../live/sessionsStore';
import type { PublishedDay } from '../publish/usePublishedDays';
import type { Day } from '../types';

/** A lesson's single derived state, shared by the status chip and the filter. */
export type LessonStatus = 'draft' | 'published' | 'assigned' | 'live';

/** A Day's resolved status + the open assignment (for the Progress link / due date). */
export interface LessonStatusInfo {
  status: LessonStatus;
  assignment: { id: string; dueAt?: string | null } | undefined;
}

/** The classroom-scoped inputs a status derivation reads from. */
export interface LessonStatusContext {
  publishedDays: PublishedDay[];
  assignments: Assignment[];
  activeSession: SessionState | undefined;
}

/**
 * Resolve a Day's published record → open assignment → live state into a single
 * entry, so the chip, the Lessons filter, and the calendar all agree.
 */
export const deriveLessonStatus = (
  day: Day,
  { publishedDays, assignments, activeSession }: LessonStatusContext,
): LessonStatusInfo => {
  const pd = publishedDays.find((p) => p.sourceRef === day.id);
  const assignment = pd
    ? assignments.find((a) => a.publishedDayId === pd.id && a.status === 'open')
    : undefined;
  const status: LessonStatus =
    pd && activeSession && activeSession.publishedDayId === pd.id
      ? 'live'
      : assignment
        ? 'assigned'
        : pd
          ? 'published'
          : 'draft';
  return { status, assignment };
};

const formatDue = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

interface StatusChipProps {
  status: LessonStatus;
  dueAt?: string | null;
}

export const StatusChip = ({ status, dueAt }: StatusChipProps) => {
  if (status === 'live') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-400/[0.08] px-2.5 py-0.5 text-xs font-medium text-rose-200">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
        Live now
      </span>
    );
  }
  if (status === 'assigned') {
    return (
      <span className="rounded-full border border-emerald-400/30 bg-emerald-400/[0.08] px-2.5 py-0.5 text-xs font-medium text-emerald-200">
        Assigned
        {dueAt ? ` · due ${formatDue(dueAt)}` : ''}
      </span>
    );
  }
  if (status === 'published') {
    return (
      <span className="rounded-full border border-sky-400/30 bg-sky-400/[0.08] px-2.5 py-0.5 text-xs font-medium text-sky-200">
        Published
      </span>
    );
  }
  return (
    <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs text-white/50">
      Draft
    </span>
  );
};
