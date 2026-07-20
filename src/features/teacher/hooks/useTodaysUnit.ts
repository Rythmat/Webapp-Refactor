/**
 * `useTodaysUnit(classroomId)` — walks the classroom's Annual Plan and returns
 * the Unit(s) whose date range contains today.
 *
 * The hook lives in `features/teacher/` because it feeds the Teacher Dashboard.
 * The pure "which unit covers this date" helper is exported separately from
 * the hook so the calendar math module stays deterministic and the dashboard
 * hook stays testable.
 */
import { useMemo } from 'react';
import {
  resolveSchoolYear,
  resolveUnitDateRange,
} from '@/features/classroom/annual/calendarMath';
import { useAnnualPlan } from '@/features/classroom/annual/useAnnualPlan';
import type { Unit } from '@/features/classroom/types';

const inRange = (date: Date, start: Date, end: Date): boolean => {
  const t = date.getTime();
  return t >= start.setHours(0, 0, 0, 0) && t <= end.setHours(23, 59, 59, 999);
};

/**
 * Pure helper — returns every Unit in `units` whose date range contains
 * `today`. Exported for testability; the hook below just wraps it around
 * the classroom's annual plan.
 */
export const findUnitsActiveOn = (
  units: Unit[],
  today: Date,
  schoolYear: { autumn: number; spring: number },
): Unit[] =>
  units.filter((u) => {
    const range = resolveUnitDateRange(u, schoolYear);
    return inRange(new Date(today), new Date(range.start), new Date(range.end));
  });

export interface UseTodaysUnit {
  units: Unit[];
  primary: Unit | null;
}

export const useTodaysUnit = (classroomId: string): UseTodaysUnit => {
  const { plan } = useAnnualPlan(classroomId);

  return useMemo(() => {
    if (!plan) return { units: [], primary: null };
    const today = new Date();
    const schoolYear = resolveSchoolYear(today);
    const all = [...plan.year.semesters.autumn, ...plan.year.semesters.spring];
    const active = findUnitsActiveOn(all, today, schoolYear);
    return { units: active, primary: active[0] ?? null };
  }, [plan]);
};
