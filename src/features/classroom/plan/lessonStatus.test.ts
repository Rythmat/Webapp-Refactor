import { describe, expect, it } from 'vitest';
import type { Assignment } from '../assignments/useAssignments';
import type { SessionState } from '../live/sessionsStore';
import type { PublishedDay } from '../publish/usePublishedDays';
import type { Day } from '../types';
import { deriveLessonStatus } from './lessonStatus';
import { newBlankDay } from './newBlankDay';

const pubDay = (id: string, sourceRef: string): PublishedDay => ({
  id,
  classroomId: 'c1',
  teacherId: 't1',
  sourceRef,
  snapshot: {} as PublishedDay['snapshot'],
  publishedAt: '2026-01-01T00:00:00.000Z',
});

const openAssignment = (
  publishedDayId: string,
  dueAt?: string,
): Assignment => ({
  id: 'a1',
  classroomId: 'c1',
  title: 'T',
  kind: 'day',
  publishedDayId,
  dueAt: dueAt ?? null,
  status: 'open',
  createdAt: '2026-01-01T00:00:00.000Z',
});

const liveSession = (publishedDayId: string): SessionState => ({
  sessionId: 's1',
  classroomId: 'c1',
  publishedDayId,
  teacherId: 't1',
  currentPhase: 'connectRegulate',
  mode: 'teacher_paced',
  locked: false,
  sharedInteractionIds: [],
  status: 'live',
  startedAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const emptyCtx = {
  publishedDays: [] as PublishedDay[],
  assignments: [] as Assignment[],
  activeSession: undefined as SessionState | undefined,
};

describe('deriveLessonStatus', () => {
  it('is "draft" when the Day has no published record', () => {
    const day: Day = newBlankDay('Test');
    expect(deriveLessonStatus(day, emptyCtx)).toEqual({
      status: 'draft',
      assignment: undefined,
    });
  });

  it('is "published" when a published record exists but no assignment/session', () => {
    const day = newBlankDay('Test');
    const result = deriveLessonStatus(day, {
      ...emptyCtx,
      publishedDays: [pubDay('pd1', day.id)],
    });
    expect(result.status).toBe('published');
    expect(result.assignment).toBeUndefined();
  });

  it('is "assigned" with the open assignment (and its due date) surfaced', () => {
    const day = newBlankDay('Test');
    const due = '2026-05-01T00:00:00.000Z';
    const result = deriveLessonStatus(day, {
      ...emptyCtx,
      publishedDays: [pubDay('pd1', day.id)],
      assignments: [openAssignment('pd1', due)],
    });
    expect(result.status).toBe('assigned');
    expect(result.assignment?.id).toBe('a1');
    expect(result.assignment?.dueAt).toBe(due);
  });

  it('ignores an assignment tied to a different published day', () => {
    const day = newBlankDay('Test');
    const result = deriveLessonStatus(day, {
      ...emptyCtx,
      publishedDays: [pubDay('pd1', day.id)],
      assignments: [openAssignment('pd-other')],
    });
    expect(result.status).toBe('published');
  });

  it('is "live" when an active session runs this published day (wins over assigned)', () => {
    const day = newBlankDay('Test');
    const result = deriveLessonStatus(day, {
      publishedDays: [pubDay('pd1', day.id)],
      assignments: [openAssignment('pd1')],
      activeSession: liveSession('pd1'),
    });
    expect(result.status).toBe('live');
  });
});
