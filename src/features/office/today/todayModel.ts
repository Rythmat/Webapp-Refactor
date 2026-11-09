import type { LessonStatus } from '@/features/classroom/plan/lessonStatus';
import type { Day } from '@/features/classroom/types';

// ── Today: the teacher's morning, across every class (owner, 2026-11-09) ───
// What Google Classroom's insight cards, Khanmigo's class snapshot and
// Seesaw's "needs your attention" queue each do well, in one pure model:
// the next class to teach, the things waiting on the teacher, plain-sentence
// heads-ups, and the week ahead. Each class contributes a digest (read by
// its own hooks); this merges them, so it is testable without a browser.

/** One class's state, as its hooks read it. */
export interface ClassDigest {
  classroomId: string;
  name: string;
  studentCount: number;
  /** Lessons with a date, earliest first. */
  lessons: DigestLesson[];
  /** The session running now, if one is. */
  activeSessionId: string | null;
  openAssignments: DigestAssignment[];
  /** Students waiting for the teacher to let them in. */
  pendingEnrollments: number;
  endedSessions: DigestSession[];
}

export interface DigestLesson {
  day: Day;
  /** YYYY-MM-DD. */
  date: string;
  status: LessonStatus;
}

export interface DigestAssignment {
  id: string;
  title: string;
  dueAt: string | null;
  /** Students who have finished it. */
  done: number;
}

export interface DigestSession {
  sessionId: string;
  endedAt: string;
  responses: number;
}

/** A lesson with the class it belongs to. */
export interface TodayLesson extends DigestLesson {
  classroomId: string;
  className: string;
}

export type TodayItemKind =
  | 'enrollments'
  | 'due-soon'
  | 'overdue'
  | 'session-report'
  | 'draft-soon'
  | 'nothing-planned';

/** One line on Today: a plain sentence and where acting on it goes. */
export interface TodayItem {
  id: string;
  kind: TodayItemKind;
  classroomId: string;
  className: string;
  text: string;
  /** The action's words ("Review", "Open"). */
  action: string;
  /** What the action opens. */
  target:
    | { page: 'students' }
    | { page: 'assignment'; assignmentId: string }
    | { page: 'report'; sessionId: string }
    | { page: 'lesson'; dayId: string }
    | { page: 'plan' };
}

export interface TodayModel {
  /** A class that is live right now: the hero resumes it. */
  live: { classroomId: string; className: string; sessionId: string } | null;
  /** The next lesson on or after today, any class. */
  next: TodayLesson | null;
  /** Things waiting on the teacher, most urgent first. */
  needsYou: TodayItem[];
  /** Heads-ups: worth knowing, not yet urgent. */
  headsUp: TodayItem[];
  /** Lessons from today through the next six days. */
  week: TodayLesson[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** YYYY-MM-DD in the teacher's own time zone. */
export const isoDay = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const addDays = (iso: string, n: number): string => {
  const [y, m, d] = iso.split('-').map(Number);
  return isoDay(new Date(y, m - 1, d + n));
};

/** "today", "tomorrow", "Thursday", or "Nov 20", from a YYYY-MM-DD. */
export const relativeDay = (iso: string, todayIso: string): string => {
  if (iso === todayIso) return 'today';
  if (iso === addDays(todayIso, 1)) return 'tomorrow';
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (iso > todayIso && iso <= addDays(todayIso, 6)) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

const byDateThenClass = (a: TodayLesson, b: TodayLesson) =>
  a.date.localeCompare(b.date) ||
  a.className.localeCompare(b.className) ||
  a.day.label.localeCompare(b.day.label);

export const buildTodayModel = (
  digests: readonly ClassDigest[],
  now: Date,
): TodayModel => {
  const todayIso = isoDay(now);
  const weekEnd = addDays(todayIso, 6);
  const nowMs = now.getTime();

  const lessons: TodayLesson[] = digests
    .flatMap((c) =>
      c.lessons.map((l) => ({
        ...l,
        classroomId: c.classroomId,
        className: c.name,
      })),
    )
    .sort(byDateThenClass);

  const liveClass = digests.find((c) => c.activeSessionId);
  const live = liveClass
    ? {
        classroomId: liveClass.classroomId,
        className: liveClass.name,
        sessionId: liveClass.activeSessionId as string,
      }
    : null;

  const next = lessons.find((l) => l.date >= todayIso) ?? null;
  const week = lessons.filter((l) => l.date >= todayIso && l.date <= weekEnd);

  const needsYou: TodayItem[] = [];
  const headsUp: TodayItem[] = [];

  for (const c of digests) {
    const base = { classroomId: c.classroomId, className: c.name };

    if (c.pendingEnrollments > 0) {
      needsYou.push({
        ...base,
        id: `enrollments:${c.classroomId}`,
        kind: 'enrollments',
        text: `${plural(c.pendingEnrollments, 'student')} waiting to join ${c.name}`,
        action: 'Review',
        target: { page: 'students' },
      });
    }

    for (const a of c.openAssignments) {
      if (!a.dueAt) continue;
      const due = new Date(a.dueAt).getTime();
      if (Number.isNaN(due)) continue;
      const left = Math.max(0, c.studentCount - a.done);
      if (due < nowMs) {
        needsYou.push({
          ...base,
          id: `overdue:${a.id}`,
          kind: 'overdue',
          text:
            c.studentCount > 0
              ? `${a.title} is past due — ${plural(left, 'student')} still to finish`
              : `${a.title} is past due and still open`,
          action: 'Open',
          target: { page: 'assignment', assignmentId: a.id },
        });
      } else if (due - nowMs <= 2 * DAY_MS) {
        const when = relativeDay(isoDay(new Date(due)), todayIso);
        needsYou.push({
          ...base,
          id: `due:${a.id}`,
          kind: 'due-soon',
          text:
            c.studentCount > 0
              ? `${a.title} is due ${when} — ${a.done} of ${c.studentCount} done`
              : `${a.title} is due ${when}`,
          action: 'Open',
          target: { page: 'assignment', assignmentId: a.id },
        });
      }
    }

    for (const s of c.endedSessions) {
      const ended = new Date(s.endedAt).getTime();
      if (Number.isNaN(ended) || nowMs - ended > 7 * DAY_MS) continue;
      const when = relativeDay(isoDay(new Date(ended)), todayIso);
      needsYou.push({
        ...base,
        id: `report:${s.sessionId}`,
        kind: 'session-report',
        text: `${c.name}'s session ${when === 'today' ? 'today' : `on ${when}`} has ${plural(s.responses, 'response')} to look over`,
        action: 'Report',
        target: { page: 'report', sessionId: s.sessionId },
      });
    }

    for (const l of c.lessons) {
      if (l.status !== 'draft') continue;
      // The hero already shows the next lesson and its state.
      if (
        next &&
        next.classroomId === c.classroomId &&
        next.day.id === l.day.id
      )
        continue;
      if (l.date < todayIso || l.date > addDays(todayIso, 2)) continue;
      headsUp.push({
        ...base,
        id: `draft:${l.day.id}`,
        kind: 'draft-soon',
        text: `${c.name}'s lesson ${relativeDay(l.date, todayIso)}, ${l.day.label}, is still a draft`,
        action: 'Edit',
        target: { page: 'lesson', dayId: l.day.id },
      });
    }

    const planned = c.lessons.some(
      (l) => l.date >= todayIso && l.date <= weekEnd,
    );
    if (!planned) {
      headsUp.push({
        ...base,
        id: `nothing:${c.classroomId}`,
        kind: 'nothing-planned',
        text: `Nothing planned for ${c.name} this week`,
        action: 'Plan',
        target: { page: 'plan' },
      });
    }
  }

  // Overdue work first, then what's due, then who's waiting, then reports.
  const ORDER: Record<TodayItemKind, number> = {
    overdue: 0,
    'due-soon': 1,
    enrollments: 2,
    'session-report': 3,
    'draft-soon': 4,
    'nothing-planned': 5,
  };
  const rank = (a: TodayItem, b: TodayItem) =>
    ORDER[a.kind] - ORDER[b.kind] || a.className.localeCompare(b.className);

  return {
    live,
    next,
    needsYou: needsYou.sort(rank),
    headsUp: headsUp.sort(rank),
    week,
  };
};
