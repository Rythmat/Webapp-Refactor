/**
 * CalendarView — Kanban-style timeline calendar for the Annual Plan.
 *
 * Single-month view with prev/next chevrons and Autumn/Spring quick-jump
 * chips. Each Unit renders as a colored horizontal bar spanning the days it
 * covers; individual scheduled Days render as single-column pills stacked
 * beneath their parent Unit's bar. Non-school days (weekends, federal
 * holidays, breaks) are dimmed and labeled.
 */
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLocalPlan } from '../plan/useLocalPlan';
import type { Day, StudentLanguage, Unit } from '../types';
import { DayBar } from './DayBar';
import { UnitBar } from './UnitBar';
import {
  getMonthCalendar,
  rangeFromScheduledDates,
  resolveInitialMonth,
  resolveSchoolYear,
  resolveUnitDateRange,
  segmentUnitIntoWeeks,
  stepMonth,
  type UnitWeekSegment,
  type ViewMonth,
} from './calendarMath';
import { CANONICAL_ANNUAL_TEMPLATE } from './curriculumTemplate';
import { toIsoDate, type NonSchoolDay } from './schoolCalendar';
import type { ClassroomAnnualPlan } from './useAnnualPlan';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const suggestedCountFor = (unitId: string): number => {
  const allStubs = [
    ...CANONICAL_ANNUAL_TEMPLATE.autumn.units,
    ...CANONICAL_ANNUAL_TEMPLATE.spring.units,
  ];
  const matched = allStubs.find((u) => unitId.startsWith(`unit-${u.slug}-`));
  return matched?.dayStubs.length ?? 0;
};

interface CalendarViewProps {
  classroomId: string;
  plan: ClassroomAnnualPlan;
  language: StudentLanguage;
  nonSchoolMap: Map<string, NonSchoolDay>;
}

export const CalendarView = ({
  classroomId,
  plan,
  language,
  nonSchoolMap,
}: CalendarViewProps) => {
  const today = useMemo(() => new Date(), []);
  const schoolYear = useMemo(() => resolveSchoolYear(today), [today]);
  const [view, setView] = useState<ViewMonth>(() => resolveInitialMonth(today));
  const { getDay } = useLocalPlan();

  const calendar = useMemo(
    () => getMonthCalendar(view.year, view.month),
    [view.year, view.month],
  );

  const allUnits = useMemo(
    () => [...plan.year.semesters.autumn, ...plan.year.semesters.spring],
    [plan.year.semesters.autumn, plan.year.semesters.spring],
  );

  /** Reverse-lookup: dayId → parent unit id. */
  const unitByDayId = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of allUnits) {
      for (const dayId of u.dayIds ?? []) {
        map.set(dayId, u.id);
      }
    }
    return map;
  }, [allUnits]);

  /** For each week, the ordered list of unit segments to render.
   *
   *  The visual bar hugs the Unit's ACTUAL scheduled Day dates (min/max) so
   *  the bar and the pills stay aligned even when the chained-sequential
   *  auto-populate has pushed a Unit past its declared window. Units with
   *  no scheduled Days yet fall back to the declared window so seeded-but-
   *  empty Units are still drawn where the teacher expects them. */
  const weekSegments = useMemo(() => {
    const rows: Array<Array<{ unit: Unit; segment: UnitWeekSegment }>> =
      calendar.weeks.map(() => []);
    for (const unit of allUnits) {
      const scheduledIsos = (unit.dayIds ?? [])
        .map((id) => getDay(id))
        .filter((d): d is Day => Boolean(d))
        .map((d) => d.scheduledDate)
        .filter((iso): iso is string => Boolean(iso));
      const range = rangeFromScheduledDates(
        scheduledIsos,
        resolveUnitDateRange(unit, schoolYear),
      );
      const segments = segmentUnitIntoWeeks(range, calendar);
      for (const seg of segments) {
        rows[seg.weekIndex].push({ unit, segment: seg });
      }
    }
    for (const row of rows) {
      row.sort(
        (a, b) =>
          a.segment.startColumn - b.segment.startColumn ||
          a.unit.monthIndex - b.unit.monthIndex,
      );
    }
    return rows;
  }, [allUnits, calendar, getDay, schoolYear]);

  /** For each week, the list of scheduled Day pills (Day + start column). */
  const weekDayPills = useMemo(() => {
    const rows: Array<Array<{ day: Day; startColumn: number }>> =
      calendar.weeks.map(() => []);
    // Collect every scheduled Day referenced by a Unit.
    const seen = new Set<string>();
    for (const [dayId] of unitByDayId) {
      if (seen.has(dayId)) continue;
      seen.add(dayId);
      const day = getDay(dayId);
      if (!day || !day.scheduledDate) continue;
      // Find which week + column this Day lands in.
      for (let wi = 0; wi < calendar.weeks.length; wi++) {
        const week = calendar.weeks[wi];
        const col = week.findIndex((d) => toIsoDate(d) === day.scheduledDate);
        if (col >= 0) {
          rows[wi].push({ day, startColumn: col + 1 });
          break;
        }
      }
    }
    for (const row of rows) row.sort((a, b) => a.startColumn - b.startColumn);
    return rows;
  }, [calendar.weeks, getDay, unitByDayId]);

  const goPrev = () => setView((v) => stepMonth(v, -1));
  const goNext = () => setView((v) => stepMonth(v, 1));
  const jumpAutumn = () => setView({ year: schoolYear.autumn, month: 8 });
  const jumpSpring = () => setView({ year: schoolYear.spring, month: 1 });

  const isAutumn = view.month >= 8;
  const isSpring = view.month <= 5;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous month"
            className="inline-flex size-9 items-center justify-center rounded-full border border-white/10 text-white/70 transition-colors hover:border-white/25 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="min-w-[10ch] text-center text-lg font-medium text-white">
            {calendar.monthLabel}
          </h2>
          <button
            type="button"
            onClick={goNext}
            aria-label="Next month"
            className="inline-flex size-9 items-center justify-center rounded-full border border-white/10 text-white/70 transition-colors hover:border-white/25 hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={jumpAutumn}
            aria-pressed={isAutumn}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              isAutumn
                ? 'border-white/30 bg-white/[0.06] text-white'
                : 'border-white/10 text-white/60 hover:border-white/25 hover:text-white'
            }`}
          >
            Autumn
          </button>
          <button
            type="button"
            onClick={jumpSpring}
            aria-pressed={isSpring}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              isSpring
                ? 'border-white/30 bg-white/[0.06] text-white'
                : 'border-white/10 text-white/60 hover:border-white/25 hover:text-white'
            }`}
          >
            Spring
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
        <div className="grid grid-cols-7 gap-1 pb-2">
          {WEEKDAY_LABELS.map((l) => (
            <div
              key={l}
              className="text-center text-[10px] uppercase tracking-wider text-white/40"
            >
              {l}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          {calendar.weeks.map((week, weekIndex) => (
            <WeekRow
              key={weekIndex}
              week={week}
              viewMonth={view.month}
              segments={weekSegments[weekIndex]}
              dayPills={weekDayPills[weekIndex]}
              unitByDayId={unitByDayId}
              nonSchoolMap={nonSchoolMap}
              classroomId={classroomId}
              language={language}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

interface WeekRowProps {
  week: Date[];
  viewMonth: number; // 1-12
  segments: Array<{ unit: Unit; segment: UnitWeekSegment }>;
  dayPills: Array<{ day: Day; startColumn: number }>;
  unitByDayId: Map<string, string>;
  nonSchoolMap: Map<string, NonSchoolDay>;
  classroomId: string;
  language: StudentLanguage;
}

const WeekRow = ({
  week,
  viewMonth,
  segments,
  dayPills,
  unitByDayId,
  nonSchoolMap,
  classroomId,
  language,
}: WeekRowProps) => {
  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-7 gap-1">
        {week.map((date, i) => {
          const inMonth = date.getMonth() + 1 === viewMonth;
          const iso = toIsoDate(date);
          const nonSchool = nonSchoolMap.get(iso);
          const isWeekend = nonSchool?.kind === 'weekend';
          const isHolidayLike = Boolean(nonSchool) && !isWeekend;
          return (
            <div
              key={i}
              className={`flex min-h-[46px] flex-col justify-between rounded-md border px-2 py-1 text-[11px] ${
                inMonth
                  ? isHolidayLike
                    ? 'border-white/[0.06] bg-white/[0.015] text-white/40'
                    : isWeekend
                      ? 'border-white/[0.05] text-white/30'
                      : 'border-white/[0.08] text-white/60'
                  : 'border-white/[0.03] text-white/20'
              }`}
            >
              {isHolidayLike && (
                <span
                  className="truncate text-[9px] uppercase tracking-wide text-amber-200/70"
                  title={nonSchool?.label}
                >
                  {nonSchool?.label}
                </span>
              )}
              <span className="text-right tabular-nums">{date.getDate()}</span>
            </div>
          );
        })}
      </div>

      {(segments.length > 0 || dayPills.length > 0) && (
        <div
          className="grid grid-cols-7 gap-1"
          style={{ gridAutoRows: 'minmax(24px, auto)' }}
        >
          {segments.map(({ unit, segment }) => (
            <UnitBar
              key={`unit-${unit.id}-${segment.weekIndex}-${segment.startColumn}`}
              classroomId={classroomId}
              unit={unit}
              language={language}
              startColumn={segment.startColumn}
              spanColumns={segment.spanColumns}
              isFirstSegment={segment.isFirstSegment}
              daysPlanned={unit.dayIds?.length ?? 0}
              suggestedDayCount={suggestedCountFor(unit.id)}
            />
          ))}
          {dayPills.map(({ day, startColumn }) => (
            <DayBar
              key={`day-${day.id}`}
              classroomId={classroomId}
              day={day}
              parentUnitId={unitByDayId.get(day.id) ?? null}
              startColumn={startColumn}
            />
          ))}
        </div>
      )}
    </div>
  );
};
