import type { LessonStatus } from '@/features/classroom/plan/lessonStatus';
import type { Day } from '@/features/classroom/types';

// ── Plan's list: filter, then group by month (owner, 2026-11-09) ───────────
// Pure, so the list page and its tests agree: lessons by scheduled month in
// date order, then an Unscheduled group; filters are ANDed.

export type StatusFilter = LessonStatus | 'all';

export interface PlanEntry {
  day: Day;
  status: LessonStatus;
  assignment: { id: string; dueAt?: string | null } | undefined;
}

export interface PlanGroup {
  id: string;
  title: string;
  entries: PlanEntry[];
}

export const UNSCHEDULED = 'unscheduled';

const monthTitle = (yyyyMm: string): string => {
  const [y, m] = yyyyMm.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
};

export const groupPlan = (
  entries: readonly PlanEntry[],
  filter: { status: StatusFilter; savedOnly: boolean; query: string },
  isSaved: (dayId: string) => boolean,
): PlanGroup[] => {
  const q = filter.query.trim().toLowerCase();
  const visible = entries
    .filter(
      (e) =>
        (filter.status === 'all' || e.status === filter.status) &&
        (!filter.savedOnly || isSaved(e.day.id)) &&
        (!q || e.day.label.toLowerCase().includes(q)),
    )
    .sort(
      (a, b) =>
        (a.day.scheduledDate ?? '').localeCompare(b.day.scheduledDate ?? '') ||
        a.day.label.localeCompare(b.day.label),
    );

  const groups = new Map<string, PlanGroup>();
  const unscheduled: PlanEntry[] = [];
  for (const entry of visible) {
    const iso = entry.day.scheduledDate;
    if (!iso) {
      unscheduled.push(entry);
      continue;
    }
    const key = iso.slice(0, 7);
    const group = groups.get(key) ?? {
      id: key,
      title: monthTitle(key),
      entries: [],
    };
    group.entries.push(entry);
    groups.set(key, group);
  }
  const out = [...groups.values()];
  if (unscheduled.length) {
    out.push({ id: UNSCHEDULED, title: 'Unscheduled', entries: unscheduled });
  }
  return out;
};

/** "Thu, Nov 12" from a YYYY-MM-DD, in the teacher's own calendar. */
export const shortDate = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};
