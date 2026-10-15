/**
 * useWeekGridData — the derivation that feeds `WeekView` (and the month grid).
 *
 * Extracted from `CalendarView` so both the Calendar tab and the Overview
 * "This Week" card derive the same inputs — one source of truth, no drift.
 * Returns everything `WeekView` needs EXCEPT the view-specific bits each
 * consumer owns (`weekAnchor`, `dropIso`, the drag handlers) and
 * `nonSchoolMap` (which comes straight from `useAnnualPlan`).
 *
 * A lesson is on the calendar when it has a `scheduledDate`; there is no Unit
 * layer between the classroom and its lessons.
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
import type { Day } from '../types';
import { resolveSchoolYear, type SchoolYear } from './calendarMath';
import { duplicateDayIds } from './dedupeDays';
import { toIsoDate } from './schoolCalendar';

export interface WeekGridData {
  today: Date;
  todayIso: string;
  schoolYear: SchoolYear;
  getDay: (dayId: string) => Day | undefined;
  /** The classroom's lessons that have a date, minus duplicates (same date +
   *  label as an earlier one), sorted by date then label. */
  scheduledDays: Day[];
  countryFeatures: Feature[] | null;
  songsReady: boolean;
  statusFor: (day: Day) => LessonStatusInfo;
}

export const useWeekGridData = (classroomId: string): WeekGridData => {
  const today = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => toIsoDate(today), [today]);
  const schoolYear = useMemo(() => resolveSchoolYear(today), [today]);
  const { getDay, listDays } = useLocalPlan(classroomId);

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

  // Re-derived each render: `listDays` is a synchronous read of the repository,
  // and `useLocalPlan` re-renders on every repository change.
  const dated = listDays(classroomId).filter((d) => Boolean(d.scheduledDate));
  const hidden = duplicateDayIds(dated);
  const scheduledDays = dated
    .filter((d) => !hidden.has(d.id))
    .sort(
      (a, b) =>
        (a.scheduledDate ?? '').localeCompare(b.scheduledDate ?? '') ||
        a.label.localeCompare(b.label),
    );

  return {
    today,
    todayIso,
    schoolYear,
    getDay,
    scheduledDays,
    countryFeatures,
    songsReady,
    statusFor,
  };
};
