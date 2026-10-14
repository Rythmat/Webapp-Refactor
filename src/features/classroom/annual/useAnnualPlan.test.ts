// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  STORAGE_KEY,
  readAnnualPlanStore,
  writeAnnualPlanStore,
} from './useAnnualPlan';

const CLASSROOM_ID = 'classroom-alpha';

beforeEach(() => {
  window.localStorage.clear();
});

describe('school-calendar exceptions', () => {
  it('normalizes legacy plans without exceptions on read', () => {
    // Simulate a plan persisted before `exceptions` existed.
    const legacyPlan = {
      classroomId: CLASSROOM_ID,
      year: {
        id: 'year-legacy',
        label: 'Legacy',
        semesters: { autumn: [], spring: [] },
      },
      seededFromTemplateAt: null,
      updatedAt: '2025-01-01T00:00:00.000Z',
      // no `exceptions` field
    };
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        plans: { [CLASSROOM_ID]: legacyPlan },
      }),
    );
    const read = readAnnualPlanStore();
    expect(read.plans[CLASSROOM_ID]?.exceptions).toEqual({
      additions: [],
      removals: [],
    });
  });

  it('round-trips a plan with exceptions through write + read', () => {
    const withExceptions = {
      classroomId: CLASSROOM_ID,
      year: {
        id: 'year-test',
        label: 'School year',
        semesters: { autumn: [], spring: [] },
      },
      seededFromTemplateAt: null,
      updatedAt: '2025-01-01T00:00:00.000Z',
      exceptions: {
        additions: [
          {
            date: '2025-11-03',
            label: 'Teacher work day',
            kind: 'custom' as const,
          },
        ],
        removals: ['2026-02-16'],
      },
    };
    writeAnnualPlanStore({
      schemaVersion: 1,
      plans: { [CLASSROOM_ID]: withExceptions },
    });
    const round = readAnnualPlanStore();
    expect(round.plans[CLASSROOM_ID]?.exceptions.additions).toHaveLength(1);
    expect(round.plans[CLASSROOM_ID]?.exceptions.additions[0].date).toBe(
      '2025-11-03',
    );
    expect(round.plans[CLASSROOM_ID]?.exceptions.removals).toEqual([
      '2026-02-16',
    ]);
  });
});
