/**
 * Plan v1→v2 golden fixtures.
 *
 * The three resolution cases the migration promises — referenced by a Unit,
 * single-classroom fallback, and genuinely unassigned — plus idempotency. These
 * are pure: no storage, no React, which is the whole reason the migration takes
 * the annual store as an argument instead of reading it.
 */
import { describe, expect, it } from 'vitest';
import type { Day } from '../types';
import {
  buildDayOwnership,
  migratePlanV1toV2,
  type AnnualPlansForMigration,
  type PlanV1,
} from './migratePlan';

const day = (id: string): Day =>
  ({ id, label: id, cells: {} }) as unknown as Day;

const planV1 = (...ids: string[]): PlanV1 => ({
  schemaVersion: 1,
  days: Object.fromEntries(ids.map((id) => [id, day(id)])),
});

/** Two classrooms; A's autumn Unit references d1, B's references d2. */
const TWO_CLASSROOMS: AnnualPlansForMigration = {
  plans: {
    'class-a': {
      classroomId: 'class-a',
      year: {
        semesters: {
          autumn: [{ id: 'u1', dayIds: ['d1'] }],
          spring: [],
        } as never,
      },
    },
    'class-b': {
      classroomId: 'class-b',
      year: {
        semesters: {
          autumn: [{ id: 'u2', dayIds: ['d2'] }],
          spring: [],
        } as never,
      },
    },
  },
};

const ONE_CLASSROOM: AnnualPlansForMigration = {
  plans: {
    'class-a': {
      classroomId: 'class-a',
      year: { semesters: { autumn: [], spring: [] } as never },
    },
  },
};

describe('buildDayOwnership', () => {
  it('maps every referenced dayId to its owning classroom', () => {
    expect(buildDayOwnership(TWO_CLASSROOMS)).toEqual({
      d1: 'class-a',
      d2: 'class-b',
    });
  });

  it('is deterministic when two classrooms claim the same Day — first wins', () => {
    const contested: AnnualPlansForMigration = {
      plans: {
        'class-a': {
          classroomId: 'class-a',
          year: {
            semesters: { autumn: [{ id: 'u1', dayIds: ['dx'] }] } as never,
          },
        },
        'class-b': {
          classroomId: 'class-b',
          year: {
            semesters: { autumn: [{ id: 'u2', dayIds: ['dx'] }] } as never,
          },
        },
      },
    };
    expect(buildDayOwnership(contested).dx).toBe('class-a');
    expect(buildDayOwnership(contested)).toEqual(buildDayOwnership(contested));
  });

  it('tolerates a missing/!empty annual store', () => {
    expect(buildDayOwnership(null)).toEqual({});
    expect(buildDayOwnership({ plans: {} })).toEqual({});
  });
});

describe('migratePlanV1toV2 — the three resolution cases', () => {
  it('CASE 1: a Day referenced by a Unit belongs to that Unit’s classroom', () => {
    const out = migratePlanV1toV2(planV1('d1', 'd2'), TWO_CLASSROOMS);
    expect(out.days.d1.classroomId).toBe('class-a');
    expect(out.days.d2.classroomId).toBe('class-b');
    expect(out.schemaVersion).toBe(2);
  });

  it('CASE 2: with exactly one classroom, everything else belongs to it', () => {
    const out = migratePlanV1toV2(planV1('d1', 'd9'), ONE_CLASSROOM);
    expect(out.days.d1.classroomId).toBe('class-a');
    expect(out.days.d9.classroomId).toBe('class-a');
  });

  it('CASE 3: unreferenced, multiple classrooms → UNASSIGNED, never guessed', () => {
    const out = migratePlanV1toV2(planV1('d1', 'orphan'), TWO_CLASSROOMS);
    expect(out.days.d1.classroomId).toBe('class-a');
    expect(out.days.orphan.classroomId).toBeNull();
  });

  it('no annual store at all → everything unassigned', () => {
    const out = migratePlanV1toV2(planV1('a', 'b'), null);
    expect(out.days.a.classroomId).toBeNull();
    expect(out.days.b.classroomId).toBeNull();
  });

  it('preserves every other Day field', () => {
    const src = planV1('d1');
    src.days.d1 = {
      ...src.days.d1,
      label: 'Blues Day',
      scheduledDate: '2026-09-14',
      sourceSeedId: 'seed-7',
    } as Day;
    const out = migratePlanV1toV2(src, ONE_CLASSROOM);
    expect(out.days.d1.label).toBe('Blues Day');
    expect(out.days.d1.scheduledDate).toBe('2026-09-14');
    expect(out.days.d1.sourceSeedId).toBe('seed-7');
  });

  it('is idempotent — re-running does not re-home an already-scoped Day', () => {
    const once = migratePlanV1toV2(planV1('d1', 'orphan'), TWO_CLASSROOMS);
    const twice = migratePlanV1toV2(once as PlanV1, TWO_CLASSROOMS);
    expect(twice.days).toEqual(once.days);
  });

  it('never mutates the input', () => {
    const src = planV1('d1');
    const before = JSON.stringify(src);
    migratePlanV1toV2(src, TWO_CLASSROOMS);
    expect(JSON.stringify(src)).toBe(before);
  });

  it('handles an empty plan', () => {
    expect(migratePlanV1toV2(planV1(), TWO_CLASSROOMS).days).toEqual({});
  });
});
