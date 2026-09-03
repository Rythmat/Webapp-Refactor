/**
 * useWeekGridData — the derivation that feeds `WeekView` (and the month grid).
 *
 * Extracted from `CalendarView` so both the Calendar tab and the Overview
 * "This Week" card derive the same inputs from a classroom's annual plan — one
 * source of truth, no drift. Returns everything `WeekView` needs EXCEPT the
 * view-specific bits each consumer owns (`weekAnchor`, `dropIso`, the drag
 * handlers) and `nonSchoolMap` (which comes straight from `useAnnualPlan`).
 */
import type { Feature } from 'geojson';
import { useCallback, useMemo } from 'react';
import { useCountryFeatures } from '@/components/ClassroomLayout/globe/RegionPolygonThumb';
import { useAssignments } from '../assignments/useAssignments';
import { useLocalSessionStore } from '../live/useLocalSessionStore';
import {
  deriveLessonStatus,
  type LessonStatusInfo,
} from '../plan/lessonStatus';
import { useLocalPlan } from '../plan/useLocalPlan';
import { useSongsReady } from '../plan/useSongsReady';
import { usePublishedDays } from '../publish/usePublishedDays';
import type { Day, Unit } from '../types';
import {
  rangeFromScheduledDates,
  resolveSchoolYear,
  resolveUnitDateRange,
  type SchoolYear,
  type UnitDateRange,
} from './calendarMath';
import { duplicateDayIds } from './dedupeDays';
import { toIsoDate } from './schoolCalendar';
import type { ClassroomAnnualPlan } from './useAnnualPlan';

export interface WeekGridData {
  today: Date;
  todayIso: string;
  schoolYear: SchoolYear;
  getDay: (dayId: string) => Day | undefined;
  allUnits: Unit[];
  /** Reverse-lookup: dayId → parent unit id. */
  unitByDayId: Map<string, string>;
  /** Lesson ids to hide as duplicates (same date + label as an earlier one). */
  hiddenDayIds: Set<string>;
  /** Each Unit's visible [start, end] range. */
  unitRanges: Map<string, UnitDateRange>;
  countryFeatures: Feature[] | null;
  songsReady: boolean;
  statusFor: (day: Day) => LessonStatusInfo;
}

export const useWeekGridData = (
  classroomId: string,
  plan: ClassroomAnnualPlan | null,
): WeekGridData => {
  const today = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => toIsoDate(today), [today]);
  const schoolYear = useMemo(() => resolveSchoolYear(today), [today]);
  const { getDay } = useLocalPlan();

  // Lesson-card treatment (image banner + status chip): shared globe country
  // features + song-library readiness feed every LessonThumb (one fetch for the
  // whole grid), and a status resolver mirrors the Lessons page.
  const countryFeatures = useCountryFeatures();
  const songsReady = useSongsReady();
  const { publishedDays } = usePublishedDays(classroomId);
  const { assignments } = useAssignments(classroomId);
  const { getActiveSessionForClassroom } = useLocalSessionStore();
  const activeSession = getActiveSessionForClassroom(classroomId);
  const statusFor = useCallback(
    (day: Day): LessonStatusInfo =>
      deriveLessonStatus(day, { publishedDays, assignments, activeSession }),
    [publishedDays, assignments, activeSession],
  );

  const allUnits = useMemo<Unit[]>(
    () =>
      plan
        ? [...plan.year.semesters.autumn, ...plan.year.semesters.spring]
        : [],
    [plan],
  );

  const unitByDayId = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of allUnits) {
      for (const dayId of u.dayIds ?? []) {
        map.set(dayId, u.id);
      }
    }
    return map;
  }, [allUnits]);

  const hiddenDayIds = useMemo(() => {
    const entries: Array<{
      id: string;
      scheduledDate?: string | null;
      label: string;
    }> = [];
    for (const dayId of unitByDayId.keys()) {
      const d = getDay(dayId);
      if (d) {
        entries.push({
          id: d.id,
          scheduledDate: d.scheduledDate,
          label: d.label,
        });
      }
    }
    return duplicateDayIds(entries);
  }, [unitByDayId, getDay]);

  const unitRanges = useMemo(() => {
    const map = new Map<string, UnitDateRange>();
    for (const unit of allUnits) {
      const scheduledIsos = (unit.dayIds ?? [])
        .map((id) => getDay(id))
        .filter((d): d is Day => Boolean(d))
        .map((d) => d.scheduledDate)
        .filter((iso): iso is string => Boolean(iso));
      map.set(
        unit.id,
        rangeFromScheduledDates(
          scheduledIsos,
          resolveUnitDateRange(unit, schoolYear),
        ),
      );
    }
    return map;
  }, [allUnits, getDay, schoolYear]);

  return {
    today,
    todayIso,
    schoolYear,
    getDay,
    allUnits,
    unitByDayId,
    hiddenDayIds,
    unitRanges,
    countryFeatures,
    songsReady,
    statusFor,
  };
};
