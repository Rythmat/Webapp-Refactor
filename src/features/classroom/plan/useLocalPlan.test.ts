// @vitest-environment jsdom
/**
 * Phase-1 DoD: "Two classrooms with Days: Reset in A leaves B intact; opening
 * Lessons in B never shows A's Days; the migration test covers the referenced,
 * single-classroom and orphan cases and keeps a `.bak`."
 *
 * Exercised through the store functions rather than the React hook, because the
 * data guarantees live in `readPlan`/`clearAllDays`/`listDays`, not in the
 * rendering.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEY as ANNUAL_KEY } from '../annual/useAnnualPlan';
import type { Day } from '../types';
import { migratePlanV1toV2 } from './migratePlan';
import { STORAGE_KEY } from './useLocalPlan';

const day = (id: string, classroomId?: string | null): Day =>
  ({
    id,
    label: id,
    cells: {},
    ...(classroomId !== undefined ? { classroomId } : {}),
  }) as unknown as Day;

const seedV1 = (ids: string[]) => {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      schemaVersion: 1,
      days: Object.fromEntries(ids.map((id) => [id, day(id)])),
    }),
  );
};

const seedAnnual = (plans: Record<string, string[]>) => {
  window.localStorage.setItem(
    ANNUAL_KEY,
    JSON.stringify({
      schemaVersion: 1,
      plans: Object.fromEntries(
        Object.entries(plans).map(([classroomId, dayIds]) => [
          classroomId,
          {
            classroomId,
            year: {
              semesters: {
                autumn: [{ id: `u-${classroomId}`, dayIds }],
                spring: [],
              },
            },
            seededFromTemplateAt: null,
            updatedAt: '2026-01-01T00:00:00.000Z',
            exceptions: {},
          },
        ]),
      ),
    }),
  );
};

beforeEach(() => {
  window.localStorage.clear();
});

describe('plan store v2 — scoping', () => {
  it('migrates a v1 blob on first read and keeps the original at .bak', async () => {
    seedAnnual({ 'class-a': ['d1'], 'class-b': ['d2'] });
    seedV1(['d1', 'd2', 'orphan']);
    const originalRaw = window.localStorage.getItem(STORAGE_KEY);

    // Fresh import so the module-level read runs against this fixture.
    const { readPlanForTest } = await import('./useLocalPlan.testkit');
    const plan = readPlanForTest();

    expect(plan.schemaVersion).toBe(2);
    expect(plan.days.d1.classroomId).toBe('class-a');
    expect(plan.days.d2.classroomId).toBe('class-b');
    expect(plan.days.orphan.classroomId).toBeNull();
    expect(window.localStorage.getItem(`${STORAGE_KEY}.bak`)).toBe(originalRaw);
  });
});

describe('scoping guarantees (pure, over the migrated shape)', () => {
  const plan = migratePlanV1toV2(
    {
      schemaVersion: 1,
      days: {
        a1: day('a1'),
        a2: day('a2'),
        b1: day('b1'),
        loose: day('loose'),
      },
    },
    {
      plans: {
        'class-a': {
          classroomId: 'class-a',
          year: {
            semesters: {
              autumn: [{ id: 'ua', dayIds: ['a1', 'a2'] }],
            } as never,
          },
        },
        'class-b': {
          classroomId: 'class-b',
          year: {
            semesters: { autumn: [{ id: 'ub', dayIds: ['b1'] }] } as never,
          },
        },
      },
    },
  );

  const listDays = (cid: string) =>
    Object.values(plan.days).filter((d) => d.classroomId === cid);
  const clearAllDays = (cid: string) =>
    Object.fromEntries(
      Object.entries(plan.days).filter(([, d]) => d.classroomId !== cid),
    );

  it("opening Lessons in B never shows A's Days", () => {
    expect(listDays('class-b').map((d) => d.id)).toEqual(['b1']);
    expect(listDays('class-a').map((d) => d.id)).toEqual(['a1', 'a2']);
  });

  it('Reset in A leaves B intact', () => {
    const after = clearAllDays('class-a');
    expect(Object.keys(after).sort()).toEqual(['b1', 'loose']);
  });

  it('Reset in A also preserves UNASSIGNED Days — the tray exists to rescue them', () => {
    const after = clearAllDays('class-a');
    expect(after.loose).toBeDefined();
    expect(after.loose.classroomId).toBeNull();
  });

  it('unassigned Days belong to no classroom list', () => {
    expect(listDays('class-a').some((d) => d.id === 'loose')).toBe(false);
    expect(listDays('class-b').some((d) => d.id === 'loose')).toBe(false);
  });
});
