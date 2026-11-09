import { describe, expect, it } from 'vitest';
import { assignmentGroup, progressCounts } from '../assignmentState';

const NOW = new Date(2026, 10, 9, 9).getTime();
const at = (d: number, h = 17) => new Date(2026, 10, d, h).toISOString();

describe('assignmentGroup', () => {
  it('files by state and due date', () => {
    expect(assignmentGroup({ status: 'closed', dueAt: at(10) }, NOW)).toBe(
      'closed',
    );
    expect(assignmentGroup({ status: 'open', dueAt: null }, NOW)).toBe(
      'no-date',
    );
    expect(assignmentGroup({ status: 'open', dueAt: 'nonsense' }, NOW)).toBe(
      'no-date',
    );
    expect(assignmentGroup({ status: 'open', dueAt: at(6) }, NOW)).toBe(
      'overdue',
    );
    expect(assignmentGroup({ status: 'open', dueAt: at(12) }, NOW)).toBe(
      'due-soon',
    );
    expect(assignmentGroup({ status: 'open', dueAt: at(30) }, NOW)).toBe(
      'upcoming',
    );
  });
});

describe('progressCounts', () => {
  const row = (
    enrollmentId: string,
    status: 'done' | 'in_progress' | 'not_started',
  ) => ({
    assignmentId: 'a',
    enrollmentId,
    status,
    updatedAt: '',
  });

  it('counts the roster, not only the rows touched', () => {
    expect(
      progressCounts(
        [row('s1', 'done'), row('s2', 'in_progress'), row('gone', 'done')],
        ['s1', 's2', 's3', 's4'],
      ),
    ).toEqual({ done: 1, started: 1, notStarted: 2, total: 4 });
  });

  it('is all zeros with no roster', () => {
    expect(progressCounts([row('s1', 'done')], [])).toEqual({
      done: 0,
      started: 0,
      notStarted: 0,
      total: 0,
    });
  });
});
