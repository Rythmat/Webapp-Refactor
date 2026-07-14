// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { CANONICAL_ANNUAL_TEMPLATE } from './curriculumTemplate';
import {
  STORAGE_KEY,
  cloneTemplate,
  findUnitLocation,
  readAnnualPlanStore,
  writeAnnualPlanStore,
} from './useAnnualPlan';

const CLASSROOM_ID = 'classroom-alpha';

beforeEach(() => {
  window.localStorage.clear();
});

describe('cloneTemplate', () => {
  it('produces both semesters populated with the canonical heritage themes present', () => {
    const plan = cloneTemplate(CLASSROOM_ID, CANONICAL_ANNUAL_TEMPLATE);
    expect(plan.classroomId).toBe(CLASSROOM_ID);
    expect(plan.year.semesters.autumn.length).toBeGreaterThanOrEqual(5);
    expect(plan.year.semesters.spring.length).toBeGreaterThanOrEqual(5);
    // Every heritage month theme still shows up somewhere in the tree.
    const themeIds = plan.year.semesters.autumn
      .concat(plan.year.semesters.spring)
      .map((u) => u.theme?.themeId);
    for (const t of [
      'theme-august',
      'theme-september',
      'theme-october',
      'theme-november',
      'theme-december',
      'theme-january',
      'theme-february',
      'theme-march',
      'theme-april',
      'theme-may',
    ]) {
      expect(themeIds).toContain(t);
    }
  });

  it('carries the Hispanic Heritage date window through to the cloned unit', () => {
    const plan = cloneTemplate(CLASSROOM_ID, CANONICAL_ANNUAL_TEMPLATE);
    const hhm = plan.year.semesters.autumn.find(
      (u) => u.theme?.themeId === 'theme-september',
    );
    expect(hhm?.dateWindow).toEqual({ start: '09-15', end: '10-15' });
  });

  it('mints fresh unit ids on each clone (so re-seeding does not collide)', () => {
    const a = cloneTemplate(CLASSROOM_ID, CANONICAL_ANNUAL_TEMPLATE);
    const b = cloneTemplate(CLASSROOM_ID, CANONICAL_ANNUAL_TEMPLATE);
    const idsA = a.year.semesters.autumn.map((u) => u.id);
    const idsB = b.year.semesters.autumn.map((u) => u.id);
    for (const id of idsA) expect(idsB).not.toContain(id);
  });
});

describe('store round-trip', () => {
  it('empty read returns EMPTY_STORE shape', () => {
    const s = readAnnualPlanStore();
    expect(s.schemaVersion).toBe(1);
    expect(s.plans).toEqual({});
  });

  it('write then read preserves the plan', () => {
    const plan = cloneTemplate(CLASSROOM_ID, CANONICAL_ANNUAL_TEMPLATE);
    writeAnnualPlanStore({ schemaVersion: 1, plans: { [CLASSROOM_ID]: plan } });
    const round = readAnnualPlanStore();
    expect(
      round.plans[CLASSROOM_ID]?.year.semesters.autumn.length,
    ).toBeGreaterThanOrEqual(5);
  });

  it('unknown schemaVersion resets and preserves a backup', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: 999, plans: { future: 'data' } }),
    );
    const s = readAnnualPlanStore();
    expect(s.plans).toEqual({});
    expect(window.localStorage.getItem(`${STORAGE_KEY}.bak`)).toContain('999');
  });
});

describe('findUnitLocation', () => {
  it('returns the semester and index for a known unit', () => {
    const plan = cloneTemplate(CLASSROOM_ID, CANONICAL_ANNUAL_TEMPLATE);
    const target = plan.year.semesters.spring[1]; // Black History Month
    const loc = findUnitLocation(plan.year, target.id);
    expect(loc).toEqual({ semester: 'spring', index: 1 });
  });

  it('returns null for an unknown unit', () => {
    const plan = cloneTemplate(CLASSROOM_ID, CANONICAL_ANNUAL_TEMPLATE);
    expect(findUnitLocation(plan.year, 'unit-does-not-exist')).toBeNull();
  });
});

describe('Day cross-references are pure ids, not full Days', () => {
  it('units come out with an empty dayIds array after clone', () => {
    const plan = cloneTemplate(CLASSROOM_ID, CANONICAL_ANNUAL_TEMPLATE);
    for (const s of ['autumn', 'spring'] as const) {
      for (const u of plan.year.semesters[s]) {
        expect(u.dayIds).toEqual([]);
      }
    }
  });

  it('carries no CellPresentation payload from the template into the tree (firewall check)', () => {
    const plan = cloneTemplate(CLASSROOM_ID, CANONICAL_ANNUAL_TEMPLATE);
    const serialized = JSON.stringify(plan);
    // The annual tree must never carry student-facing cell content — only
    // metadata + dayId references. If any of these keys leaks in, a future
    // refactor accidentally put presentation data into the tree.
    expect(serialized).not.toContain('cells');
    expect(serialized).not.toContain('presentation');
    expect(serialized).not.toContain('launchTiles');
  });
});

describe('school-calendar exceptions', () => {
  it('cloneTemplate initialises exceptions to empty additions + removals', () => {
    const plan = cloneTemplate(CLASSROOM_ID, CANONICAL_ANNUAL_TEMPLATE);
    expect(plan.exceptions).toEqual({ additions: [], removals: [] });
  });

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
    const plan = cloneTemplate(CLASSROOM_ID, CANONICAL_ANNUAL_TEMPLATE);
    const withExceptions = {
      ...plan,
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
