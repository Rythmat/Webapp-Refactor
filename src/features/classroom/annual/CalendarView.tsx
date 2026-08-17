/**
 * CalendarView — the Annual Plan calendar shell.
 *
 * Owns the shared toolbar (Month/Week switcher, prev/next nav, Today,
 * Autumn/Spring quick-jumps, Settings) and the shared per-Unit memos, then
 * renders either the **Month** grid (a Kanban-style timeline: colored Unit
 * bars spanning the days they cover, with scheduled-Day pills beneath) or the
 * **Week** day-column view (`WeekView`). Both live inside one container-query
 * card so their cells and text scale fluidly with the panel width. Non-school
 * days (weekends, holidays, breaks) are dimmed/hatched; today is accented.
 */
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useLocalPlan } from '../plan/useLocalPlan';
import { SegmentedControl } from '../presentation/SegmentedControl';
import type { Day, StudentLanguage, Unit } from '../types';
import { DayBar } from './DayBar';
import { UnitBar } from './UnitBar';
import { WeekView } from './WeekView';
import {
  computeUnitReschedule,
  hasDragItem,
  readDragItem,
  type CalendarDragItem,
} from './calendarDnd';
import {
  assignUnitLanes,
  firstWeekdayWeekAnchor,
  getMonthCalendar,
  getWeekCalendar,
  rangeFromScheduledDates,
  resolveInitialMonth,
  resolveInitialWeek,
  resolveSchoolYear,
  resolveUnitDateRange,
  segmentUnitIntoWeeks,
  stepMonth,
  stepWeek,
  type UnitDateRange,
  type UnitWeekSegment,
  type ViewMonth,
} from './calendarMath';
import { CAL_FONT, CAL_METRIC } from './calendarSizing';
import { duplicateDayIds } from './dedupeDays';
import { toIsoDate, type NonSchoolDay } from './schoolCalendar';
import { suggestedCountFor } from './unitCoverage';
import { useAnnualPlan, type ClassroomAnnualPlan } from './useAnnualPlan';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type CalendarMode = 'month' | 'week';

/** Diagonal-hatch fills for non-working days (no hatch utility exists). */
const HATCH_WEEKEND =
  'repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 7px)';
const HATCH_HOLIDAY =
  'repeating-linear-gradient(45deg, rgba(251,191,36,0.07) 0, rgba(251,191,36,0.07) 1px, transparent 1px, transparent 7px)';
/** App accent (teal) — used for the "today" cell. */
const TODAY_ACCENT = '#7ecfcf';

interface CalendarViewProps {
  classroomId: string;
  plan: ClassroomAnnualPlan;
  language: StudentLanguage;
  nonSchoolMap: Map<string, NonSchoolDay>;
  /** Open the classroom-settings dialog (button sits beside the semester chips). */
  onOpenSettings: () => void;
}

export const CalendarView = ({
  classroomId,
  plan,
  language,
  nonSchoolMap,
  onOpenSettings,
}: CalendarViewProps) => {
  const today = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => toIsoDate(today), [today]);
  const schoolYear = useMemo(() => resolveSchoolYear(today), [today]);
  const [mode, setMode] = useState<CalendarMode>('month');
  const [view, setView] = useState<ViewMonth>(() => resolveInitialMonth(today));
  const [weekAnchor, setWeekAnchor] = useState<Date>(() =>
    resolveInitialWeek(today),
  );
  const { getDay, saveDay } = useLocalPlan();
  const { setUnitSchedule } = useAnnualPlan(classroomId);
  const [dropIso, setDropIso] = useState<string | null>(null);

  const calendar = useMemo(
    () => getMonthCalendar(view.year, view.month),
    [view.year, view.month],
  );
  const weekCal = useMemo(() => getWeekCalendar(weekAnchor), [weekAnchor]);

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

  /** Ids of Lessons that duplicate an earlier one (same date + label) — hidden
   *  from the calendar so accidental duplicate records (e.g. Days re-adopted
   *  after a "Reset to template") render, and count, only once. */
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

  /** Each Unit's visible [start, end] range — min/max of its scheduled Day
   *  dates, or its declared window when it has none yet. Shared by the bar
   *  segments and the lane assignment so they always agree. */
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

  /** Unit → lane, so overlapping Units render in distinct vertical bands
   *  (each Unit's bar + its Day pills share a lane) instead of piling up. */
  const unitLane = useMemo(() => {
    const ranged = allUnits.map((u) => {
      const r = unitRanges.get(u.id);
      return {
        id: u.id,
        start: r ? r.start.getTime() : 0,
        end: r ? r.end.getTime() : 0,
      };
    });
    return assignUnitLanes(ranged);
  }, [allUnits, unitRanges]);

  /** For each week, the ordered list of unit segments to render (with lane).
   *
   *  The visual bar hugs the Unit's ACTUAL scheduled Day dates (min/max) so
   *  the bar and the pills stay aligned even when the chained-sequential
   *  auto-populate has pushed a Unit past its declared window. Units with
   *  no scheduled Days yet fall back to the declared window so seeded-but-
   *  empty Units are still drawn where the teacher expects them. */
  const weekSegments = useMemo(() => {
    const rows: Array<
      Array<{ unit: Unit; segment: UnitWeekSegment; lane: number }>
    > = calendar.weeks.map(() => []);
    for (const unit of allUnits) {
      const range = unitRanges.get(unit.id);
      if (!range) continue;
      const lane = unitLane.get(unit.id) ?? 0;
      for (const seg of segmentUnitIntoWeeks(range, calendar)) {
        rows[seg.weekIndex].push({ unit, segment: seg, lane });
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
  }, [allUnits, calendar, unitRanges, unitLane]);

  /** For each week, the list of scheduled Day pills (Day + start column +
   *  lane, so a Day sits in its parent Unit's lane). */
  const weekDayPills = useMemo(() => {
    const rows: Array<Array<{ day: Day; startColumn: number; lane: number }>> =
      calendar.weeks.map(() => []);
    // Collect every scheduled Day referenced by a Unit (skipping duplicates).
    for (const [dayId, unitId] of unitByDayId) {
      if (hiddenDayIds.has(dayId)) continue;
      const day = getDay(dayId);
      if (!day || !day.scheduledDate) continue;
      const lane = unitLane.get(unitId) ?? 0;
      // Find which week + column this Day lands in.
      for (let wi = 0; wi < calendar.weeks.length; wi++) {
        const week = calendar.weeks[wi];
        const col = week.findIndex((d) => toIsoDate(d) === day.scheduledDate);
        if (col >= 0) {
          rows[wi].push({ day, startColumn: col + 1, lane });
          break;
        }
      }
    }
    for (const row of rows) row.sort((a, b) => a.startColumn - b.startColumn);
    return rows;
  }, [calendar.weeks, getDay, unitByDayId, unitLane, hiddenDayIds]);

  // Drop a dragged Day or Unit onto a calendar date-cell.
  const handleDropOnDate = useCallback(
    (iso: string, item: CalendarDragItem) => {
      if (item.kind === 'day') {
        // Just reschedule — the Day keeps its Unit membership (dayIds).
        const day = getDay(item.id);
        if (day) saveDay({ ...day, scheduledDate: iso });
        return;
      }
      // Unit: shift its whole block of lessons to the drop date, keeping the
      // school-day gaps between them.
      const unit = allUnits.find((u) => u.id === item.id);
      if (!unit) return;
      const scheduled = (unit.dayIds ?? [])
        .map((id) => getDay(id))
        .flatMap((d) =>
          d && d.scheduledDate ? [{ day: d, iso: d.scheduledDate }] : [],
        )
        .sort((a, b) => a.iso.localeCompare(b.iso));
      if (scheduled.length > 0) {
        // The bar hugs its Days' dates, so moving the Days moves the Unit.
        // Leave `monthIndex` alone — it's only a fallback for empty Units.
        const newIsos = computeUnitReschedule(
          scheduled.map((s) => s.iso),
          iso,
          nonSchoolMap,
        );
        scheduled.forEach(({ day }, i) => {
          if (newIsos[i] && newIsos[i] !== day.scheduledDate) {
            saveDay({ ...day, scheduledDate: newIsos[i] });
          }
        });
      } else {
        // Empty Unit — its bar is driven by the declared window, so re-anchor
        // the month (1-12; the cell is a real date, so this is its month).
        setUnitSchedule(unit.id, {
          monthIndex: Number(iso.slice(5, 7)),
          dateWindow: null,
        });
      }
    },
    [allUnits, getDay, saveDay, nonSchoolMap, setUnitSchedule],
  );

  const handleCellDrop = useCallback(
    (iso: string, item: CalendarDragItem) => {
      handleDropOnDate(iso, item);
      setDropIso(null);
    },
    [handleDropOnDate],
  );

  const goPrev = () =>
    mode === 'month'
      ? setView((v) => stepMonth(v, -1))
      : setWeekAnchor((a) => stepWeek(a, -1));
  const goNext = () =>
    mode === 'month'
      ? setView((v) => stepMonth(v, 1))
      : setWeekAnchor((a) => stepWeek(a, 1));
  const goToday = () => {
    const now = new Date();
    setView(resolveInitialMonth(now));
    setWeekAnchor(resolveInitialWeek(now));
  };
  const jumpAutumn = () => {
    setView({ year: schoolYear.autumn, month: 8 });
    setWeekAnchor(firstWeekdayWeekAnchor(schoolYear.autumn, 8));
  };
  const jumpSpring = () => {
    setView({ year: schoolYear.spring, month: 1 });
    setWeekAnchor(firstWeekdayWeekAnchor(schoolYear.spring, 1));
  };

  // Keep the two cursors in sync when toggling views, so paging in one mode
  // then switching doesn't drop the user on a stale, unrelated date.
  const changeMode = (next: CalendarMode) => {
    if (next === mode) return;
    if (next === 'week') {
      // Enter Week on a week inside the currently-viewed month.
      setWeekAnchor(firstWeekdayWeekAnchor(view.year, view.month));
    } else {
      // Enter Month on the month the viewed week sits in (its Wednesday).
      const wed = weekCal.days[3];
      setView({ year: wed.getFullYear(), month: wed.getMonth() + 1 });
    }
    setMode(next);
  };

  // Representative month for the active view (the week's Wednesday in week
  // mode, so a month-straddling week highlights the right semester chip).
  const activeMonth =
    mode === 'month' ? view.month : weekCal.days[3].getMonth() + 1;
  const isAutumn = activeMonth >= 8;
  const isSpring = activeMonth <= 5;
  const navLabel = mode === 'month' ? calendar.monthLabel : weekCal.label;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SegmentedControl
            label="Calendar view"
            options={[
              { value: 'month', label: 'Month' },
              { value: 'week', label: 'Week' },
            ]}
            value={mode}
            onChange={changeMode}
          />
          <button
            type="button"
            onClick={goPrev}
            aria-label={mode === 'month' ? 'Previous month' : 'Previous week'}
            className="inline-flex size-9 items-center justify-center rounded-full border border-white/10 text-white/70 transition-colors hover:border-white/25 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="min-w-[12ch] text-center text-lg font-medium text-white md:text-xl">
            {navLabel}
          </h2>
          <button
            type="button"
            onClick={goNext}
            aria-label={mode === 'month' ? 'Next month' : 'Next week'}
            className="inline-flex size-9 items-center justify-center rounded-full border border-white/10 text-white/70 transition-colors hover:border-white/25 hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="ml-1 inline-flex items-center rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/70 transition-colors hover:border-white/25 hover:text-white"
          >
            Today
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
          <span aria-hidden className="mx-0.5 h-5 w-px bg-white/10" />
          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/70 transition-colors hover:border-white/25 hover:text-white"
            title="Classroom settings"
          >
            <Settings className="h-3.5 w-3.5" />
            Settings
          </button>
        </div>
      </div>

      <div
        className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 [container-type:inline-size]"
        onDragLeave={(e) => {
          // Clear the hover highlight when the drag leaves the whole card
          // (not when moving between adjacent cells).
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDropIso(null);
          }
        }}
        // dragend bubbles from the source; clears the highlight on any end
        // (drop on a cell, drop off a cell, or an Esc-cancel).
        onDragEnd={() => setDropIso(null)}
      >
        {mode === 'month' ? (
          <>
            <div className="grid grid-cols-7 gap-1.5 pb-3">
              {WEEKDAY_LABELS.map((l) => (
                <div
                  key={l}
                  style={{ fontSize: CAL_FONT.weekday }}
                  className="text-center uppercase tracking-wider text-white/40"
                >
                  {l}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              {calendar.weeks.map((week, weekIndex) => (
                <WeekRow
                  key={weekIndex}
                  week={week}
                  viewMonth={view.month}
                  segments={weekSegments[weekIndex]}
                  dayPills={weekDayPills[weekIndex]}
                  unitByDayId={unitByDayId}
                  hiddenDayIds={hiddenDayIds}
                  nonSchoolMap={nonSchoolMap}
                  classroomId={classroomId}
                  language={language}
                  dropIso={dropIso}
                  todayIso={todayIso}
                  onCellDragOver={setDropIso}
                  onCellDrop={handleCellDrop}
                />
              ))}
            </div>
          </>
        ) : (
          <WeekView
            classroomId={classroomId}
            weekAnchor={weekAnchor}
            language={language}
            allUnits={allUnits}
            unitRanges={unitRanges}
            unitByDayId={unitByDayId}
            getDay={getDay}
            hiddenDayIds={hiddenDayIds}
            nonSchoolMap={nonSchoolMap}
            todayIso={todayIso}
            dropIso={dropIso}
            onCellDragOver={setDropIso}
            onCellDrop={handleCellDrop}
          />
        )}
      </div>
    </section>
  );
};

interface WeekRowProps {
  week: Date[];
  viewMonth: number; // 1-12
  segments: Array<{ unit: Unit; segment: UnitWeekSegment; lane: number }>;
  dayPills: Array<{ day: Day; startColumn: number; lane: number }>;
  unitByDayId: Map<string, string>;
  hiddenDayIds: Set<string>;
  nonSchoolMap: Map<string, NonSchoolDay>;
  classroomId: string;
  language: StudentLanguage;
  dropIso: string | null;
  todayIso: string;
  onCellDragOver: (iso: string) => void;
  onCellDrop: (iso: string, item: CalendarDragItem) => void;
}

const WeekRow = ({
  week,
  viewMonth,
  segments,
  dayPills,
  unitByDayId,
  hiddenDayIds,
  nonSchoolMap,
  classroomId,
  language,
  dropIso,
  todayIso,
  onCellDragOver,
  onCellDrop,
}: WeekRowProps) => {
  // The whole week is ONE 7-column grid so Units/Lessons layer *inside* the day
  // cells (Google-Calendar style) instead of in a band beneath them. Row 1 is
  // the date header; each lane L uses two rows — its Unit bar on `2L+2`, its Day
  // pills on `2L+3`. `maxRow` is the largest row any event occupies (1 = empty
  // week). Cells span every row (`1 / -1`) as the backdrop; the bars/pills are
  // separate grid items on top, so multi-day bars stay continuous across days.
  const maxRow = Math.max(
    1,
    ...segments.map(({ lane }) => 2 * lane + 2),
    ...dayPills.map(({ lane }) => 2 * lane + 3),
  );
  const gridTemplateRows =
    maxRow === 1
      ? // Empty week — one tall row keeps bare cells at calendar height.
        `minmax(${CAL_METRIC.cellMinHeight}, auto)`
      : `${CAL_METRIC.cellHeaderRow} repeat(${maxRow - 1}, minmax(${CAL_METRIC.laneRowMin}, auto))`;

  return (
    <div className="grid grid-cols-7 gap-1.5" style={{ gridTemplateRows }}>
      {week.map((date, i) => {
        const inMonth = date.getMonth() + 1 === viewMonth;
        const iso = toIsoDate(date);
        const nonSchool = nonSchoolMap.get(iso);
        const isWeekend = nonSchool?.kind === 'weekend';
        const isHolidayLike = Boolean(nonSchool) && !isWeekend;
        const isToday = iso === todayIso;
        const hatch =
          inMonth && isHolidayLike
            ? HATCH_HOLIDAY
            : inMonth && isWeekend
              ? HATCH_WEEKEND
              : undefined;
        return (
          <div
            key={i}
            onDragOver={(e) => {
              // Only in-month cells are drop targets — padding cells belong
              // to an adjacent month (and would write an out-of-band month).
              if (inMonth && hasDragItem(e.dataTransfer)) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                onCellDragOver(iso);
              }
            }}
            onDrop={(e) => {
              if (!inMonth) return;
              e.preventDefault();
              const item = readDragItem(e.dataTransfer);
              if (item) onCellDrop(iso, item);
            }}
            style={{
              // Span the full week-row height so the cell is the backdrop the
              // Unit bars / Day pills sit inside, and stays the drop target.
              gridColumn: i + 1,
              gridRow: '1 / -1',
              minHeight: CAL_METRIC.cellMinHeight,
              ...(hatch ? { backgroundImage: hatch } : {}),
            }}
            className={`flex flex-col rounded-lg border px-2.5 py-1.5 ${
              inMonth
                ? isHolidayLike
                  ? 'border-white/[0.06] bg-white/[0.015] text-white/40'
                  : isWeekend
                    ? 'border-white/[0.05] text-white/30'
                    : 'border-white/[0.08] text-white/60'
                : 'border-white/[0.03] text-white/20'
            } ${
              dropIso === iso
                ? 'bg-white/[0.06] ring-2 ring-white/40'
                : isToday
                  ? 'ring-1 ring-[#7ecfcf]/50'
                  : ''
            }`}
          >
            <div className="flex items-start justify-between gap-1">
              {isHolidayLike ? (
                <span
                  style={{ fontSize: CAL_FONT.holiday }}
                  className="min-w-0 truncate uppercase tracking-wide text-amber-200/70"
                  title={nonSchool?.label}
                >
                  {nonSchool?.label}
                </span>
              ) : (
                <span />
              )}
              {isToday ? (
                <span
                  style={{
                    background: TODAY_ACCENT,
                    minWidth: CAL_METRIC.todayBadge,
                    height: CAL_METRIC.todayBadge,
                    fontSize: CAL_FONT.dateNumber,
                  }}
                  className="inline-flex shrink-0 items-center justify-center rounded-full px-1 font-semibold leading-none tabular-nums text-black"
                >
                  {date.getDate()}
                </span>
              ) : (
                <span
                  style={{ fontSize: CAL_FONT.dateNumber }}
                  className="shrink-0 font-medium leading-none tabular-nums"
                >
                  {date.getDate()}
                </span>
              )}
            </div>
          </div>
        );
      })}

      {segments.map(({ unit, segment, lane }) => (
        <UnitBar
          key={`unit-${unit.id}-${segment.weekIndex}-${segment.startColumn}`}
          classroomId={classroomId}
          unit={unit}
          language={language}
          startColumn={segment.startColumn}
          spanColumns={segment.spanColumns}
          isFirstSegment={segment.isFirstSegment}
          daysPlanned={
            (unit.dayIds ?? []).filter((id) => !hiddenDayIds.has(id)).length
          }
          suggestedDayCount={suggestedCountFor(unit.id)}
          gridRow={2 * lane + 2}
        />
      ))}
      {dayPills.map(({ day, startColumn, lane }) => (
        <DayBar
          key={`day-${day.id}`}
          classroomId={classroomId}
          day={day}
          parentUnitId={unitByDayId.get(day.id) ?? null}
          startColumn={startColumn}
          gridRow={2 * lane + 3}
        />
      ))}
    </div>
  );
};
