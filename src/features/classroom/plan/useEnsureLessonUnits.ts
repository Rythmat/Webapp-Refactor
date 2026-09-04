/**
 * useEnsureLessonUnits — guarantees every Lesson belongs to a Unit.
 *
 * The annual plan is null until the teacher seeds the canonical curriculum, and
 * the Lesson-creation paths never assigned a Unit — so Lessons in a fresh
 * classroom were orphaned ("No unit"). This hook, mounted by the Lessons list:
 *   1. Seeds the canonical Unit tree EMPTY (no day-stubs) if the classroom has
 *      no plan yet — the same Units the canonical curriculum uses, so a later
 *      "Use the canonical curriculum" can still fill their day-stubs.
 *   2. Adopts any orphan Day (not in any Unit) into a Unit — matching the Day's
 *      scheduled month where possible, else the first Unit.
 * Both steps are idempotent (seeds only when there's no plan; only touches Days
 * that aren't already in a Unit), so it converges and is safe to keep mounted.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useAnnualPlan } from '../annual/useAnnualPlan';
import type { Day, Unit } from '../types';
import { useLocalPlan } from './useLocalPlan';

/**
 * The Unit a Lesson should default to: the Unit for the given date's month (or
 * today's month when unscheduled), or `undefined` when no Unit covers that month
 * (the caller then leaves it in the "No unit" bucket, or applies its own
 * first-unit default for interactive create-flows). Pure — shared by the orphan
 * sweep and the New Lesson / deck-wizard pickers.
 */
export const defaultUnitIdFor = (
  units: Unit[],
  scheduledDate?: string | null,
): string | undefined => {
  if (units.length === 0) return undefined;
  // 1-indexed month (1 = Jan … 12 = Dec), matching Unit.monthIndex and
  // calendarMath. For an ISO YYYY-MM-DD read the month field directly rather
  // than `new Date(string)` (which parses as UTC and can drift a month in
  // negative-offset timezones). Unscheduled Days use today's LOCAL month.
  const month = scheduledDate
    ? Number(scheduledDate.slice(5, 7))
    : new Date().getMonth() + 1;
  // The Unit for that month (heritage precedes genre/location in template
  // order); no blanket first-unit fallback — an unmatched Day stays orphaned.
  return units.find((u) => u.monthIndex === month)?.id;
};

/**
 * Decide which orphan Days (not in any Unit) to adopt, and into which Unit.
 * Skips an orphan that only DUPLICATES an already-linked Day (same
 * `scheduledDate` + `label`), and skips duplicates among the orphans
 * themselves — so "Reset to template" (which orphans the old Days without
 * deleting them, then re-materializes fresh ones on the same dates) can't
 * re-adopt every old Day and show each lesson twice. Pure — testable, and
 * shared by the sweep below.
 */
export const planOrphanAdoptions = (
  units: Unit[],
  days: Day[],
): Array<{ dayId: string; unitId: string }> => {
  if (units.length === 0) return [];
  const assigned = new Set<string>();
  for (const u of units) for (const id of u.dayIds ?? []) assigned.add(id);

  const signatureOf = (day: Day): string | null =>
    day.scheduledDate ? `${day.scheduledDate}|${day.label}` : null;

  const linkedSignatures = new Set<string>();
  for (const day of days) {
    if (!assigned.has(day.id)) continue;
    const sig = signatureOf(day);
    if (sig) linkedSignatures.add(sig);
  }

  const adoptions: Array<{ dayId: string; unitId: string }> = [];
  for (const day of days) {
    if (assigned.has(day.id)) continue;
    const sig = signatureOf(day);
    if (sig && linkedSignatures.has(sig)) continue; // duplicate — leave orphaned
    const unitId = defaultUnitIdFor(units, day.scheduledDate);
    if (unitId) {
      adoptions.push({ dayId: day.id, unitId });
      if (sig) linkedSignatures.add(sig);
    }
  }
  return adoptions;
};

export const useEnsureLessonUnits = (classroomId: string): void => {
  const { plan, seedFromTemplate, addDayToUnit } = useAnnualPlan(classroomId);
  const { listDays } = useLocalPlan();
  const seededRef = useRef(false);

  const units = useMemo<Unit[]>(
    () =>
      plan
        ? [...plan.year.semesters.autumn, ...plan.year.semesters.spring]
        : [],
    [plan],
  );

  // Seed the empty canonical Unit tree once, if this classroom has no plan.
  useEffect(() => {
    if (classroomId && !plan && !seededRef.current) {
      seededRef.current = true;
      seedFromTemplate();
    }
  }, [classroomId, plan, seedFromTemplate]);

  // Adopt any orphan Day (not in a Unit) into a Unit, once Units exist —
  // skipping duplicates so a "Reset to template" doesn't double every lesson.
  useEffect(() => {
    if (units.length === 0) return;
    for (const { dayId, unitId } of planOrphanAdoptions(units, listDays())) {
      addDayToUnit(unitId, dayId);
    }
  }, [units, listDays, addDayToUnit]);
};
