import { describe, expect, it, vi } from 'vitest';
import { PHASES } from '../phases';
import type { Day } from '../types';
import { getNextNSchoolDays, resolveSchoolYear } from './calendarMath';
import { CANONICAL_ANNUAL_TEMPLATE } from './curriculumTemplate';
import { getNonSchoolDatesForSchoolYear, toIsoDate } from './schoolCalendar';
import {
  autoPopulateFromTemplate,
  findStubsForUnitId,
  seededDayFromStub,
} from './stubMaterialization';
import { cloneTemplate } from './useAnnualPlan';

const CLASSROOM_ID = 'classroom-alpha';

describe('findStubsForUnitId', () => {
  it('returns non-empty stub arrays for known heritage/genre/location slugs', () => {
    const plan = cloneTemplate(CLASSROOM_ID, CANONICAL_ANNUAL_TEMPLATE);
    const augWelcome = plan.year.semesters.autumn.find((u) =>
      u.id.startsWith('unit-aug-welcome-'),
    )!;
    const sepHhm = plan.year.semesters.autumn.find((u) =>
      u.id.startsWith('unit-sept-hhm-'),
    )!;
    const nolaLoc = plan.year.semesters.autumn.find((u) =>
      u.id.startsWith('unit-oct-new-orleans-'),
    )!;
    expect(findStubsForUnitId(augWelcome.id).length).toBeGreaterThan(0);
    expect(findStubsForUnitId(sepHhm.id).length).toBeGreaterThan(0);
    expect(findStubsForUnitId(nolaLoc.id).length).toBeGreaterThan(0);
  });

  it('returns empty array for unknown unit ids', () => {
    expect(findStubsForUnitId('unit-does-not-exist-abcd')).toEqual([]);
  });
});

describe('seededDayFromStub', () => {
  it('carries the stub label onto the Day', () => {
    const stubs = findStubsForUnitId(
      cloneTemplate(CLASSROOM_ID, CANONICAL_ANNUAL_TEMPLATE).year.semesters
        .autumn[0].id,
    );
    const day = seededDayFromStub(stubs[0]);
    expect(day.label).toBe(stubs[0].label);
  });

  it('fills every phase cell present in phaseSeeds with the EN + ES prompt', () => {
    const plan = cloneTemplate(CLASSROOM_ID, CANONICAL_ANNUAL_TEMPLATE);
    const augWelcome = plan.year.semesters.autumn.find((u) =>
      u.id.startsWith('unit-aug-welcome-'),
    )!;
    const stubs = findStubsForUnitId(augWelcome.id);
    const day = seededDayFromStub(stubs[0]);
    for (const phase of PHASES) {
      const cell = day.cells[phase];
      // Prompt starts with the seed text — Connect may have song-line
      // enrichment appended, other phases are exact.
      expect(
        cell.presentation.prompt.en.startsWith(stubs[0].phaseSeeds[phase]!.en),
      ).toBe(true);
      expect(
        cell.presentation.prompt.es!.startsWith(
          stubs[0].phaseSeeds[phase]!.es!,
        ),
      ).toBe(true);
    }
  });

  it('appends a Song of the day line to the Connect prompt when songId is set', () => {
    const stub = {
      slug: 'test-song',
      label: 'Test',
      songId: 'lean_on_me',
      phaseSeeds: {
        connectRegulate: { en: 'Start', es: 'Comienza' },
        groupPractice: { en: 'a', es: 'a' },
        creativeProjects: { en: 'b', es: 'b' },
        presentPerform: { en: 'c', es: 'c' },
        respondReflectReset: { en: 'd', es: 'd' },
      },
    };
    const day = seededDayFromStub(stub);
    expect(day.cells.connectRegulate.presentation.prompt.en).toContain(
      '/songs/lean_on_me',
    );
    expect(day.cells.connectRegulate.presentation.prompt.es).toContain(
      '/songs/lean_on_me',
    );
  });

  it('adds a Globe LaunchTile to Connect for every globeEventId', () => {
    const stub = {
      slug: 'test-globe',
      label: 'Test',
      globeEventIds: ['evt-x', 'evt-y'],
      phaseSeeds: {
        connectRegulate: { en: 'Start', es: 'Comienza' },
        groupPractice: { en: 'a', es: 'a' },
        creativeProjects: { en: 'b', es: 'b' },
        presentPerform: { en: 'c', es: 'c' },
        respondReflectReset: { en: 'd', es: 'd' },
      },
    };
    const day = seededDayFromStub(stub);
    const tiles = day.cells.connectRegulate.presentation.launchTiles;
    expect(tiles).toHaveLength(2);
    expect(tiles[0].module).toBe('globe');
    expect(tiles[0].activityRef).toBe('evt-x');
    expect(tiles[1].activityRef).toBe('evt-y');
  });

  it('leaves scheduledDate unset — caller is expected to set it', () => {
    const stubs = findStubsForUnitId(
      cloneTemplate(CLASSROOM_ID, CANONICAL_ANNUAL_TEMPLATE).year.semesters
        .autumn[0].id,
    );
    const day = seededDayFromStub(stubs[0]);
    expect(day.scheduledDate).toBeUndefined();
  });
});

describe('autoPopulateFromTemplate', () => {
  const makeOps = () => {
    const savedDays: Day[] = [];
    const unitDayIds: Array<[string, string]> = [];
    return {
      ops: {
        saveDay: (d: Day) => savedDays.push(d),
        addDayToUnit: (unitId: string, dayId: string) =>
          unitDayIds.push([unitId, dayId]),
      },
      savedDays,
      unitDayIds,
    };
  };

  it('creates one Day per school day consumed; overflow stubs stay unmaterialized', () => {
    const plan = cloneTemplate(CLASSROOM_ID, CANONICAL_ANNUAL_TEMPLATE);
    const { ops, savedDays } = makeOps();
    const result = autoPopulateFromTemplate(plan, ops);
    // 24 Units × 10 stubs = 240 total; a full school year is ~180 school days
    // before Jun 15, so we materialize between 150 and 240 Days depending on
    // how much of the chain fits before year-end. Tail Units may get 0 Days.
    expect(result.daysCreated).toBeGreaterThanOrEqual(150);
    expect(result.daysCreated).toBeLessThanOrEqual(240);
    expect(result.unitsPopulated).toBeGreaterThanOrEqual(15);
    expect(result.unitsPopulated).toBeLessThanOrEqual(24);
    expect(savedDays.length).toBe(result.daysCreated);
  });

  it('every materialized Day carries a real ISO scheduledDate', () => {
    // Overflow stubs are intentionally NOT materialized — they stay as
    // dashed "Suggested" cards on UnitPage. Every saved Day therefore has
    // a real date.
    const plan = cloneTemplate(CLASSROOM_ID, CANONICAL_ANNUAL_TEMPLATE);
    const { ops, savedDays } = makeOps();
    autoPopulateFromTemplate(plan, ops);
    for (const d of savedDays) {
      expect(d.scheduledDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('scheduledDates within a unit are distinct — no two Days on the same day', () => {
    const plan = cloneTemplate(CLASSROOM_ID, CANONICAL_ANNUAL_TEMPLATE);
    const { ops, savedDays, unitDayIds } = makeOps();
    autoPopulateFromTemplate(plan, ops);
    // Group saved days by their unit id.
    const dayIdToUnit = new Map<string, string>();
    for (const [unitId, dayId] of unitDayIds) dayIdToUnit.set(dayId, unitId);
    const perUnit = new Map<string, string[]>();
    for (const d of savedDays) {
      const uid = dayIdToUnit.get(d.id)!;
      const list = perUnit.get(uid) ?? [];
      if (d.scheduledDate) list.push(d.scheduledDate);
      perUnit.set(uid, list);
    }
    for (const dates of perUnit.values()) {
      expect(new Set(dates).size).toBe(dates.length);
    }
  });

  it('skips units that already have real Days', () => {
    const plan = cloneTemplate(CLASSROOM_ID, CANONICAL_ANNUAL_TEMPLATE);
    // Baseline count before any skip.
    const baseline = autoPopulateFromTemplate(
      cloneTemplate(CLASSROOM_ID, CANONICAL_ANNUAL_TEMPLATE),
      { saveDay: () => {}, addDayToUnit: () => {} },
    );
    // Now simulate the first Autumn unit already having Days linked.
    const skippedUnit = plan.year.semesters.autumn[0];
    plan.year.semesters.autumn[0] = {
      ...skippedUnit,
      dayIds: ['day-existing-abc'],
    };
    const { ops, savedDays, unitDayIds } = makeOps();
    const result = autoPopulateFromTemplate(plan, ops);
    // With chained-sequential scheduling, tail Units may naturally get 0
    // Days if the year runs out; unitsPopulated counts only Units that
    // materialized at least one Day. So we can only check "at most
    // baseline.unitsPopulated" and that the skipped Unit itself never got
    // any of its own Days from this run.
    expect(result.unitsPopulated).toBeLessThanOrEqual(baseline.unitsPopulated);
    expect(result.daysCreated).toBeLessThan(baseline.daysCreated);
    for (const [unitId] of unitDayIds) {
      expect(unitId).not.toBe(skippedUnit.id);
    }
    expect(savedDays).toHaveLength(result.daysCreated);
  });

  it('threads each created dayId into the matching unit via addDayToUnit', () => {
    const plan = cloneTemplate(CLASSROOM_ID, CANONICAL_ANNUAL_TEMPLATE);
    const { ops, savedDays, unitDayIds } = makeOps();
    autoPopulateFromTemplate(plan, ops);
    const savedIds = new Set(savedDays.map((d) => d.id));
    const linkedIds = new Set(unitDayIds.map(([, dayId]) => dayId));
    expect(linkedIds).toEqual(savedIds);
  });

  it('does not touch other localStorage — pure ops indirection', () => {
    const plan = cloneTemplate(CLASSROOM_ID, CANONICAL_ANNUAL_TEMPLATE);
    const noOp = { saveDay: vi.fn(), addDayToUnit: vi.fn() };
    const result = autoPopulateFromTemplate(plan, noOp);
    expect(noOp.saveDay).toHaveBeenCalledTimes(result.daysCreated);
    expect(noOp.addDayToUnit).toHaveBeenCalledTimes(result.daysCreated);
  });

  it('never places two Days on the same scheduledDate across the whole plan', () => {
    const plan = cloneTemplate(CLASSROOM_ID, CANONICAL_ANNUAL_TEMPLATE);
    const { ops, savedDays } = makeOps();
    autoPopulateFromTemplate(plan, ops);
    const scheduledIsos = savedDays
      .map((d) => d.scheduledDate)
      .filter((d): d is string => d !== null && d !== undefined);
    // Every scheduled date is unique across all Units.
    expect(new Set(scheduledIsos).size).toBe(scheduledIsos.length);
  });

  it('walks Units in chronological start-date order — Aug Welcome Days come first', () => {
    const plan = cloneTemplate(CLASSROOM_ID, CANONICAL_ANNUAL_TEMPLATE);
    const { ops, savedDays, unitDayIds } = makeOps();
    autoPopulateFromTemplate(plan, ops);
    // The first saved Day should belong to Aug Welcome — regardless of the
    // Unit's declaration order inside the template.
    const firstDayId = savedDays[0].id;
    const [firstUnitId] =
      unitDayIds.find(([, dayId]) => dayId === firstDayId) ?? [];
    expect(firstUnitId).toBeDefined();
    expect(firstUnitId!).toMatch(/^unit-aug-welcome-/);
  });

  it('every scheduled Day lands Mon–Fri (weekends are skipped)', () => {
    // Units cover only M/T/W/Th/F — Sat and Sun never get lessons.
    const plan = cloneTemplate(CLASSROOM_ID, CANONICAL_ANNUAL_TEMPLATE);
    const { ops, savedDays } = makeOps();
    autoPopulateFromTemplate(plan, ops);
    for (const d of savedDays) {
      if (!d.scheduledDate) continue;
      const [y, m, day] = d.scheduledDate.split('-').map(Number);
      const dow = new Date(y, m - 1, day).getDay(); // 0=Sun ... 6=Sat
      expect(
        dow >= 1 && dow <= 5,
        `Day "${d.label}" scheduled on ${d.scheduledDate} (dow=${dow}) — must be Mon–Fri`,
      ).toBe(true);
    }
  });

  it('scheduled Days within a Unit form a run of CONSECUTIVE school days', () => {
    // "Consecutive" = the day AFTER date[i] (skipping weekends + holidays)
    // is exactly date[i+1]. This is the "no gap inside a Unit block" invariant.
    const plan = cloneTemplate(CLASSROOM_ID, CANONICAL_ANNUAL_TEMPLATE);
    const { ops, savedDays, unitDayIds } = makeOps();
    autoPopulateFromTemplate(plan, ops);
    const schoolYear = resolveSchoolYear(new Date());
    const nonSchoolMap = getNonSchoolDatesForSchoolYear(
      schoolYear,
      plan.exceptions,
    );

    const dayIdToUnit = new Map<string, string>();
    for (const [uid, did] of unitDayIds) dayIdToUnit.set(did, uid);
    const perUnit = new Map<string, string[]>();
    for (const d of savedDays) {
      if (!d.scheduledDate) continue;
      const uid = dayIdToUnit.get(d.id)!;
      const list = perUnit.get(uid) ?? [];
      list.push(d.scheduledDate);
      perUnit.set(uid, list);
    }

    for (const [uid, iso] of perUnit.entries()) {
      const sorted = [...iso].sort();
      for (let i = 0; i < sorted.length - 1; i++) {
        const [y, m, d] = sorted[i].split('-').map(Number);
        const cur = new Date(y, m - 1, d);
        cur.setDate(cur.getDate() + 1);
        const nextSchoolDay = getNextNSchoolDays(cur, 1, nonSchoolMap)[0];
        expect(
          nextSchoolDay ? toIsoDate(nextSchoolDay) : null,
          `Unit ${uid}: gap between ${sorted[i]} and ${sorted[i + 1]}`,
        ).toBe(sorted[i + 1]);
      }
    }
  });

  it('preserves per-Unit "Day 1 — …" numbering — no global counter', () => {
    const plan = cloneTemplate(CLASSROOM_ID, CANONICAL_ANNUAL_TEMPLATE);
    const { ops, savedDays, unitDayIds } = makeOps();
    autoPopulateFromTemplate(plan, ops);
    // Group saved Days by their parent Unit.
    const dayIdToUnit = new Map<string, string>();
    for (const [uid, did] of unitDayIds) dayIdToUnit.set(did, uid);
    const perUnit = new Map<string, string[]>();
    for (const d of savedDays) {
      const uid = dayIdToUnit.get(d.id)!;
      const list = perUnit.get(uid) ?? [];
      list.push(d.label);
      perUnit.set(uid, list);
    }
    // Multiple Units should each have their own "Day 1" — proving the
    // counter is per-Unit, not global.
    let unitsStartingWithDay1 = 0;
    for (const labels of perUnit.values()) {
      if (labels.some((l) => /^Day 1\b/.test(l))) unitsStartingWithDay1 += 1;
    }
    expect(unitsStartingWithDay1).toBeGreaterThan(1);
  });
});
