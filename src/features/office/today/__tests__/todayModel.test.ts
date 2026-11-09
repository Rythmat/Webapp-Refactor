import { describe, expect, it } from 'vitest';
import type { Day } from '@/features/classroom/types';
import {
  buildTodayModel,
  isoDay,
  relativeDay,
  type ClassDigest,
} from '../todayModel';

// Monday 9 Nov 2026, 9am local.
const NOW = new Date(2026, 10, 9, 9, 0, 0);

const day = (id: string, label = id): Day =>
  ({ id, label, cells: {} }) as unknown as Day;

const digest = (over: Partial<ClassDigest> = {}): ClassDigest => ({
  classroomId: 'c1',
  name: 'Jazz Band',
  studentCount: 12,
  lessons: [],
  activeSessionId: null,
  openAssignments: [],
  pendingEnrollments: 0,
  endedSessions: [],
  ...over,
});

describe('relativeDay', () => {
  it('says today, tomorrow, a weekday this week, then a date', () => {
    expect(relativeDay('2026-11-09', '2026-11-09')).toBe('today');
    expect(relativeDay('2026-11-10', '2026-11-09')).toBe('tomorrow');
    expect(relativeDay('2026-11-12', '2026-11-09')).toBe('Thursday');
    expect(relativeDay('2026-11-20', '2026-11-09')).toBe('Nov 20');
  });
});

describe('buildTodayModel', () => {
  it('is empty and calm with no classes', () => {
    const m = buildTodayModel([], NOW);
    expect(m).toEqual({
      live: null,
      next: null,
      needsYou: [],
      headsUp: [],
      week: [],
    });
  });

  it('picks the next lesson across classes, skipping the past', () => {
    const m = buildTodayModel(
      [
        digest({
          lessons: [
            { day: day('old'), date: '2026-11-02', status: 'published' },
            { day: day('wed'), date: '2026-11-11', status: 'published' },
          ],
        }),
        digest({
          classroomId: 'c2',
          name: 'Choir',
          lessons: [{ day: day('tue'), date: '2026-11-10', status: 'draft' }],
        }),
      ],
      NOW,
    );
    expect(m.next?.day.id).toBe('tue');
    expect(m.next?.className).toBe('Choir');
    expect(m.week.map((l) => l.day.id)).toEqual(['tue', 'wed']);
  });

  it('keeps the week to today and the six days after', () => {
    const m = buildTodayModel(
      [
        digest({
          lessons: [
            { day: day('sun'), date: '2026-11-15', status: 'draft' },
            { day: day('mon'), date: '2026-11-16', status: 'draft' },
          ],
        }),
      ],
      NOW,
    );
    expect(m.week.map((l) => l.day.id)).toEqual(['sun']);
  });

  it('resumes a live class', () => {
    const m = buildTodayModel([digest({ activeSessionId: 's9' })], NOW);
    expect(m.live).toEqual({
      classroomId: 'c1',
      className: 'Jazz Band',
      sessionId: 's9',
    });
  });

  it('queues overdue work first, then due soon, then waiting students', () => {
    const m = buildTodayModel(
      [
        digest({
          pendingEnrollments: 2,
          openAssignments: [
            {
              id: 'a1',
              title: 'Blues form',
              dueAt: new Date(2026, 10, 10, 17).toISOString(),
              done: 3,
            },
            {
              id: 'a2',
              title: 'Scales',
              dueAt: new Date(2026, 10, 6, 17).toISOString(),
              done: 10,
            },
            // Due in a fortnight: not yet anything to act on.
            {
              id: 'a3',
              title: 'Later',
              dueAt: new Date(2026, 10, 23).toISOString(),
              done: 0,
            },
          ],
        }),
      ],
      NOW,
    );
    expect(m.needsYou.map((i) => i.kind)).toEqual([
      'overdue',
      'due-soon',
      'enrollments',
    ]);
    expect(m.needsYou[0].text).toBe(
      'Scales is past due — 2 students still to finish',
    );
    expect(m.needsYou[1].text).toBe(
      'Blues form is due tomorrow — 3 of 12 done',
    );
    expect(m.needsYou[2].text).toBe('2 students waiting to join Jazz Band');
  });

  it('asks for recent session reports, not old ones', () => {
    const m = buildTodayModel(
      [
        digest({
          endedSessions: [
            {
              sessionId: 's1',
              endedAt: new Date(2026, 10, 6, 10).toISOString(),
              responses: 14,
            },
            {
              sessionId: 's0',
              endedAt: new Date(2026, 9, 1).toISOString(),
              responses: 3,
            },
          ],
        }),
      ],
      NOW,
    );
    const reports = m.needsYou.filter((i) => i.kind === 'session-report');
    expect(reports).toHaveLength(1);
    expect(reports[0].target).toEqual({ page: 'report', sessionId: 's1' });
    expect(reports[0].text).toContain('14 responses');
  });

  it('warns of a draft due to be taught soon, and an empty week', () => {
    const m = buildTodayModel(
      [
        digest({
          lessons: [
            // The next lesson: the hero shows it, so no heads-up repeats it.
            { day: day('d0', 'Warm-ups'), date: '2026-11-09', status: 'draft' },
            {
              day: day('d1', 'Call and response'),
              date: '2026-11-10',
              status: 'draft',
            },
          ],
        }),
        digest({ classroomId: 'c2', name: 'Choir' }),
      ],
      NOW,
    );
    expect(m.headsUp.map((i) => i.kind)).toEqual([
      'draft-soon',
      'nothing-planned',
    ]);
    expect(m.headsUp[0].text).toBe(
      "Jazz Band's lesson tomorrow, Call and response, is still a draft",
    );
    expect(m.headsUp[1].text).toBe('Nothing planned for Choir this week');
  });

  it('dates in local time', () => {
    expect(isoDay(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});
