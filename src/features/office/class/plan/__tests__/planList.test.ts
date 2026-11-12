import { describe, expect, it } from 'vitest';
import type { Day } from '@/features/classroom/types';
import { groupPlan, shortDate, type PlanEntry } from '../planList';

const entry = (
  id: string,
  scheduledDate: string | null,
  status: PlanEntry['status'] = 'draft',
): PlanEntry => ({
  day: { id, label: id, scheduledDate, cells: {} } as unknown as Day,
  status,
  assignment: undefined,
});

const ALL = { status: 'all' as const, savedOnly: false, query: '' };
const none = () => false;

describe('groupPlan', () => {
  it('groups by month in date order, unscheduled last', () => {
    const groups = groupPlan(
      [
        entry('dec', '2026-12-03'),
        entry('loose', null),
        entry('nov-b', '2026-11-20'),
        entry('nov-a', '2026-11-04'),
      ],
      ALL,
      none,
    );
    expect(groups.map((g) => g.title)).toEqual([
      'November 2026',
      'December 2026',
      'Unscheduled',
    ]);
    expect(groups[0].entries.map((e) => e.day.id)).toEqual(['nov-a', 'nov-b']);
  });

  it('ANDs the filters', () => {
    const entries = [
      entry('Blues', '2026-11-04', 'published'),
      entry('Bebop', '2026-11-05', 'draft'),
      entry('Ballads', '2026-11-06', 'published'),
    ];
    const saved = (id: string) => id === 'Ballads';
    const groups = groupPlan(
      entries,
      { status: 'published', savedOnly: true, query: 'b' },
      saved,
    );
    expect(groups.flatMap((g) => g.entries.map((e) => e.day.id))).toEqual([
      'Ballads',
    ]);
    expect(
      groupPlan(entries, { ...ALL, query: 'BEB' }, none).flatMap((g) =>
        g.entries.map((e) => e.day.id),
      ),
    ).toEqual(['Bebop']);
  });

  it('is empty when nothing matches', () => {
    expect(
      groupPlan([entry('a', null)], { ...ALL, status: 'live' }, none),
    ).toEqual([]);
  });
});

describe('shortDate', () => {
  it('reads a date in local time', () => {
    expect(shortDate('2026-11-12')).toBe('Thu, Nov 12');
  });
});
