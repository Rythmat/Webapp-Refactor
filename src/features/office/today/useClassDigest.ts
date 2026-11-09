import { useMemo } from 'react';
import { useWeekGridData } from '@/features/classroom/annual/useWeekGridData';
import { useAssignmentProgress } from '@/features/classroom/assignments/useAssignmentProgress';
import { useAssignments } from '@/features/classroom/assignments/useAssignments';
import { useEnrollments } from '@/features/classroom/enrollments/useEnrollments';
import { useLocalSessionStore } from '@/features/classroom/live/useLocalSessionStore';
import type { ClassDigest } from './todayModel';

/** What the Office knows of a class from the classrooms API. */
export interface DigestClassroom {
  id: string;
  name: string;
  studentCount?: number | null;
}

/**
 * One class's digest for Today and its Overview, read through the same
 * hooks the class's own pages use, so the numbers agree everywhere: its
 * dated lessons and their status (the Calendar's derivation), its open
 * assignments and how many have finished them, who's waiting to join, and
 * its ended sessions.
 */
export const useClassDigest = (classroom: DigestClassroom): ClassDigest => {
  const cid = classroom.id;
  const grid = useWeekGridData(cid);
  const { assignments } = useAssignments(cid);
  const { listProgress } = useAssignmentProgress(cid);
  const { pending, active } = useEnrollments(cid);
  const { store, getActiveSessionForClassroom } = useLocalSessionStore();

  const activeSessionId = getActiveSessionForClassroom(cid)?.sessionId ?? null;

  // The API's count when it has one; the roster's otherwise.
  const studentCount = classroom.studentCount ?? active.length;

  const lessons = grid.scheduledDays.map((day) => ({
    day,
    date: day.scheduledDate as string,
    status: grid.statusFor(day).status,
  }));

  const openAssignments = assignments
    .filter((a) => a.status === 'open')
    .map((a) => ({
      id: a.id,
      title: a.title,
      dueAt: a.dueAt ?? null,
      done: listProgress(a.id).filter((p) => p.status === 'done').length,
    }));

  const endedSessions = Object.values(store.sessions)
    .filter((s) => s.classroomId === cid && s.status === 'ended')
    .map((s) => ({
      sessionId: s.sessionId,
      endedAt: s.endedAt ?? s.updatedAt,
      responses: Object.keys(store.responses[s.sessionId] ?? {}).length,
    }));

  // Stable identity while nothing changed, so a parent collecting digests
  // isn't told about a "change" on every render.
  const key = JSON.stringify([
    classroom.name,
    studentCount,
    lessons.map((l) => [l.day.id, l.day.label, l.date, l.status]),
    activeSessionId,
    openAssignments,
    pending.length,
    endedSessions,
  ]);
  return useMemo(
    () => ({
      classroomId: cid,
      name: classroom.name,
      studentCount,
      lessons,
      activeSessionId,
      openAssignments,
      pendingEnrollments: pending.length,
      endedSessions,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cid, key],
  );
};
