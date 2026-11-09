import { describe, expect, it } from 'vitest';
import { buildProgressGrid } from '../progressModel';

const NOW = new Date(2026, 10, 9, 9).getTime();
const at = (d: number) => new Date(2026, 10, d, 17).toISOString();

describe('buildProgressGrid', () => {
  const grid = buildProgressGrid({
    students: [
      { id: 'e2', displayName: 'Leo' },
      { id: 'e1', displayName: 'Ana' },
    ],
    assignments: [
      {
        id: 'later',
        title: 'Later',
        dueAt: at(20),
        status: 'open',
        createdAt: at(1),
      },
      {
        id: 'past',
        title: 'Past',
        dueAt: at(5),
        status: 'open',
        createdAt: at(1),
      },
      {
        id: 'shut',
        title: 'Shut',
        dueAt: null,
        status: 'closed',
        createdAt: at(2),
      },
    ],
    progress: (id) =>
      ({
        later: [{ enrollmentId: 'e1', status: 'in_progress' as const }],
        past: [{ enrollmentId: 'e1', status: 'done' as const }],
        shut: [],
      })[id] ?? [],
    sessions: [['e1', 'e2'], ['e1']],
    now: NOW,
  });

  it('orders columns by due date, then creation', () => {
    expect(grid.columns.map((c) => c.id)).toEqual(['shut', 'past', 'later']);
  });

  it('orders students by name', () => {
    expect(grid.rows.map((r) => r.name)).toEqual(['Ana', 'Leo']);
  });

  it('marks work missed once it closed or came due', () => {
    const [ana, leo] = grid.rows;
    expect(ana.cells).toEqual(['missed', 'done', 'started']);
    expect(leo.cells).toEqual(['missed', 'missed', 'not-yet']);
    expect(ana).toMatchObject({ done: 1, missed: 1, sessions: 2 });
    expect(leo).toMatchObject({ done: 0, missed: 2, sessions: 1 });
  });

  it('counts each column’s finishers and the sessions run', () => {
    expect(grid.columns.map((c) => c.done)).toEqual([0, 1, 0]);
    expect(grid.sessionCount).toBe(2);
  });
});
