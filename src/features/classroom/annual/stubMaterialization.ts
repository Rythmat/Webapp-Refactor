/**
 * Shared helpers for turning template Day *stubs* into real Days.
 *
 * Two consumers:
 *   - `UnitPage` — single-click "Add this Day" flow.
 *   - `AnnualPlanPage` — bulk auto-populate after seed / reset.
 *
 * The bulk auto-populate computes school-day distribution INLINE using the
 * plan passed in, so it stays correct even during the React batched update
 * that follows `seedFromTemplate` / `resetToTemplate` (when the hook's
 * `plan` state hasn't flushed yet). The single-Day flow inside UnitPage
 * still goes through `useAnnualPlan.suggestDayScheduleInUnit`, which reads
 * the hook's already-committed state.
 */
import { PHASES } from '../phases';
import { newBlankDay } from '../plan/newBlankDay';
import type { Day } from '../types';
import {
  getNextNSchoolDays,
  getSchoolDaysInRange,
  resolveSchoolYear,
  resolveUnitDateRange,
} from './calendarMath';
import { CANONICAL_ANNUAL_TEMPLATE, type DayStub } from './curriculumTemplate';
import { getNonSchoolDatesForSchoolYear, toIsoDate } from './schoolCalendar';
import type { ClassroomAnnualPlan } from './useAnnualPlan';

/** How many school days each Unit occupies on the calendar (invariant enforced
 * by the curriculumTemplate tests — every Unit ships exactly 10 stubs). */
export const UNIT_LENGTH_DAYS = 10;

/**
 * Chained scheduling stops writing scheduledDates strictly after this cut-off
 * (Jun 15 of the spring semester's calendar year). Any remaining stubs get
 * `scheduledDate: null` and render as dashed "Suggested" cards on UnitPage —
 * the teacher can then move them onto unused calendar slots manually.
 */
const YEAR_END_MONTH_INDEX = 5; // June (0-indexed for Date ctor)
const YEAR_END_DAY = 15;

export const findStubsForUnitId = (unitId: string): DayStub[] => {
  const allStubs = [
    ...CANONICAL_ANNUAL_TEMPLATE.autumn.units,
    ...CANONICAL_ANNUAL_TEMPLATE.spring.units,
  ];
  const matched = allStubs.find((u) => unitId.startsWith(`unit-${u.slug}-`));
  return matched?.dayStubs ?? [];
};

/**
 * Materialize a template stub into a real Day. The Day's label carries the
 * stub's label; each phase cell's `presentation.prompt` gets the stub's
 * bilingual `phaseSeeds` entry (missing phases stay blank).
 *
 * Song + Globe integration on the Connect cell:
 *   - `songId`: sets `presentation.song = { id }` on the Connect cell (a
 *     structured reference the presentation surface resolves to artwork) —
 *     NOT appended into the prompt prose.
 *   - `globeEventIds`: each id becomes a `LaunchTile { module: 'globe',
 *     activityRef: <id> }` on the Connect cell — students click and land
 *     on the Globe with the pin already selected.
 *
 * `scheduledDate` starts null — callers are expected to set it via the
 * auto-scheduler before saving.
 */
export const seededDayFromStub = (stub: DayStub): Day => {
  const day = newBlankDay(stub.label);
  const cells = { ...day.cells };
  for (const phase of PHASES) {
    const seed = stub.phaseSeeds[phase];
    if (!seed) continue;
    cells[phase] = {
      ...cells[phase],
      presentation: {
        ...cells[phase].presentation,
        prompt: { en: seed.en, es: seed.es },
      },
    };
  }

  // Enrich Connect with song reference + globe launch tiles.
  const connect = cells.connectRegulate;
  const connectPresentation = connect.presentation;

  const globeTiles = (stub.globeEventIds ?? []).map((eventId, i) => ({
    id: `${day.id}-globe-${i}`,
    module: 'globe' as const,
    activityRef: eventId,
    label: { en: 'Explore on the Globe', es: 'Explora en el Globo' },
  }));

  cells.connectRegulate = {
    ...connect,
    presentation: {
      ...connectPresentation,
      // Structured song reference — resolved to artwork by the presentation
      // surface. Never appended to the prompt (that produced a raw slug).
      ...(stub.songId ? { song: { id: stub.songId } } : {}),
      launchTiles: [...connectPresentation.launchTiles, ...globeTiles],
    },
  };

  return { ...day, cells };
};

export interface AutoPopulateOps {
  saveDay: (day: Day) => void;
  addDayToUnit: (unitId: string, dayId: string) => void;
  /**
   * Optional lookup for pre-existing Days' scheduled ISO dates. When a Unit
   * is skipped (it already has `dayIds`), we call this to learn what
   * calendar slots those Days occupy so the chain cursor can jump past
   * them. If omitted, the walker falls back to the Unit's declared date
   * range end — imperfect but conservative for typical pre-populated Units.
   */
  getExistingUnitDates?: (unitId: string) => string[];
}

export interface AutoPopulateResult {
  daysCreated: number;
  unitsPopulated: number;
}

/**
 * Walk every Unit in `plan.year.semesters`, materialize each of its template
 * stubs into a real Day with an auto-scheduled date, and thread the new
 * dayIds into the unit's `dayIds` reference list via the provided ops.
 *
 * Fully self-contained — computes the non-school map inline from
 * `plan.exceptions`, so it stays correct even when called immediately after
 * `seedFromTemplate` while React state is still settling.
 *
 * Chained-sequential scheduling: every Unit is a **10-consecutive-school-day
 * block** covering only Monday–Friday. Weekends (Sat/Sun) and marked
 * non-school days (federal holidays, breaks, teacher-added exceptions) are
 * baked into `nonSchoolMap` by `getNonSchoolDatesForSchoolYear` and skipped
 * automatically by the `getNextNSchoolDays` walker. Units are processed in
 * chronological order of their effective start date (ties broken by original
 * template order). Each Unit anchors to `max(cursor, unit's natural start)`
 * where `cursor` is the day after the previous Unit's last school day. From
 * that anchor, we walk forward and grab the next `UNIT_LENGTH_DAYS` school
 * days — no gaps, no overlaps.
 *
 * Windowed Units (e.g. HHM 9/15–10/15) honor their window START via
 * `resolveUnitDateRange` — the natural start becomes Sep 15. We do NOT clamp
 * to the window END; if the chain pushes the 10-day block past the declared
 * end, so be it (the pedagogical anchor is preserved by the start).
 *
 * Year end: any school day landing after `YEAR_END_MONTH_INDEX + 1 / YEAR_END_DAY`
 * is dropped, and the stub gets `scheduledDate: null`. Overflow surfaces as
 * dashed "Suggested" cards on UnitPage; teacher can move Units later.
 *
 * Per-Unit Day numbering is preserved: each stub keeps its authored
 * "Day 1 — <topic>" label so a teacher can move a Unit around the calendar
 * without cascading a renumber.
 *
 * Units that already have real Days (`dayIds.length > 0`) are SKIPPED so
 * any manual work survives a re-seed.
 */
export const autoPopulateFromTemplate = (
  plan: ClassroomAnnualPlan,
  ops: AutoPopulateOps,
): AutoPopulateResult => {
  let daysCreated = 0;
  let unitsPopulated = 0;

  const today = new Date();
  const schoolYear = resolveSchoolYear(today);
  const nonSchoolMap = getNonSchoolDatesForSchoolYear(
    schoolYear,
    plan.exceptions,
  );

  // First school day of the school year — anchors the walk when a Unit's
  // natural start is before school even begins.
  const schoolYearStart = getSchoolDaysInRange(
    new Date(schoolYear.autumn, 7, 1), // Aug 1
    new Date(schoolYear.autumn, 8, 30), // Sep 30 — widen a bit for late-start districts.
    nonSchoolMap,
  )[0];

  // Any scheduledDate strictly after this is dropped (overflow → null).
  const yearEndMs = new Date(
    schoolYear.spring,
    YEAR_END_MONTH_INDEX,
    YEAR_END_DAY,
  ).getTime();

  const allUnits = [
    ...plan.year.semesters.autumn,
    ...plan.year.semesters.spring,
  ];

  // Chronological order — earliest start-date wins; template declaration
  // order breaks ties (heritage → genre → location within a month cluster).
  const orderedUnits = allUnits
    .map((u, idx) => ({
      unit: u,
      idx,
      start: resolveUnitDateRange(u, schoolYear).start.getTime(),
    }))
    .sort((a, b) => a.start - b.start || a.idx - b.idx)
    .map((x) => x.unit);

  // Cursor = the next school day the chain is allowed to consume.
  let cursor = schoolYearStart ?? new Date(schoolYear.autumn, 7, 1);

  for (const unit of orderedUnits) {
    // Skipped Units still need to advance the cursor past whatever calendar
    // slots their pre-existing Days occupy — otherwise the next Unit's block
    // silently overlaps with the teacher's manual work.
    if ((unit.dayIds?.length ?? 0) > 0) {
      const existing = ops.getExistingUnitDates?.(unit.id) ?? [];
      const isoAfterLast = [...existing].sort().at(-1);
      if (isoAfterLast) {
        const [ey, em, ed] = isoAfterLast.split('-').map(Number);
        const dayAfter = new Date(ey, em - 1, ed);
        dayAfter.setDate(dayAfter.getDate() + 1);
        if (dayAfter.getTime() > cursor.getTime()) cursor = dayAfter;
      } else {
        // Caller didn't wire `getExistingUnitDates`. Conservatively assume
        // the pre-existing Days sit inside the Unit's declared window and
        // advance past that window's end.
        const range = resolveUnitDateRange(unit, schoolYear);
        const dayAfter = new Date(range.end);
        dayAfter.setDate(dayAfter.getDate() + 1);
        if (dayAfter.getTime() > cursor.getTime()) cursor = dayAfter;
      }
      continue;
    }
    const stubs = findStubsForUnitId(unit.id);
    if (stubs.length === 0) continue;

    const range = resolveUnitDateRange(unit, schoolYear);
    // Anchor: never earlier than the cursor OR the Unit's natural start.
    // Windowed Units get their dateWindow.start honored via `range.start`.
    const anchorMs = Math.max(cursor.getTime(), range.start.getTime());
    const anchor = new Date(anchorMs);

    // Grab one school day per stub, then drop any past year-end. The block
    // width equals `stubs.length` so a Unit with N stubs occupies exactly N
    // consecutive school days — no empty slots consumed by the chain. If the
    // chain has run past year-end, `block` comes back shorter than `stubs`;
    // the extra stubs are NOT materialized (they stay as dashed "Suggested"
    // cards on UnitPage, so the teacher can still add them later).
    const block = getNextNSchoolDays(anchor, stubs.length, nonSchoolMap).filter(
      (d) => d.getTime() <= yearEndMs,
    );

    let addedForThisUnit = 0;
    for (let i = 0; i < block.length; i++) {
      const day: Day = {
        ...seededDayFromStub(stubs[i]),
        scheduledDate: toIsoDate(block[i]),
      };
      ops.saveDay(day);
      ops.addDayToUnit(unit.id, day.id);
      daysCreated += 1;
      addedForThisUnit += 1;
    }
    if (addedForThisUnit > 0) unitsPopulated += 1;

    // Advance the cursor to the day AFTER the last consumed school day.
    // If no days landed, keep the cursor where it was — next Unit tries again.
    if (block.length > 0) {
      const nextCursor = new Date(block[block.length - 1]);
      nextCursor.setDate(nextCursor.getDate() + 1);
      cursor = nextCursor;
    }
  }

  return { daysCreated, unitsPopulated };
};
