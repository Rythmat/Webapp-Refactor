/**
 * WeekView — the Annual Plan's single-week, day-column layout.
 *
 * A reference-styled, spacious week: five tall Mon–Fri columns (the school
 * week) with large lesson cards stacked under each weekday. Lessons are
 * date-scheduled (no time-of-day), so cards stack by day rather than on an
 * hourly axis. Reuses the Month view's drag-drop model and deep-links. Weekend-
 * scheduled Days (rare — only reachable by a Month-view drag) surface in a
 * strip below the grid so nothing is hidden.
 */
import type { Feature } from 'geojson';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';
import { LessonThumb } from '../plan/LessonThumb';
import { StatusChip, type LessonStatusInfo } from '../plan/lessonStatus';
import type { Day } from '../types';
import {
  hasDragItem,
  readDragItem,
  setDragItem,
  type CalendarDragItem,
} from './calendarDnd';
import { getWeekCalendar } from './calendarMath';
import { CAL_FONT, CAL_WEEK } from './calendarSizing';
import { toIsoDate, type NonSchoolDay } from './schoolCalendar';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Diagonal hatch for a non-school (holiday/break) day column — the same
 *  neutral white hatch as the month view (CalendarView). */
const HATCH_HOLIDAY =
  'repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 7px)';
/** App accent (teal) — the "today" highlight. */
const TODAY_ACCENT = '#7ecfcf';

/** Five equal Mon–Fri columns. */
const FIVE_COLS = 'repeat(5, minmax(0, 1fr))';

interface WeekViewProps {
  classroomId: string;
  /** Any date within the week to show; normalized to its Sunday-first week. */
  weekAnchor: Date;
  /** The classroom's dated lessons, de-duplicated (see `useWeekGridData`). */
  scheduledDays: Day[];
  nonSchoolMap: Map<string, NonSchoolDay>;
  todayIso: string;
  dropIso: string | null;
  onCellDragOver: (iso: string) => void;
  onCellDrop: (iso: string, item: CalendarDragItem) => void;
  /** Shared globe country GeoJSON for lesson-card location polygons. */
  countryFeatures: Feature[] | null;
  /** Whether the song library has hydrated (artist images). */
  songsReady: boolean;
  /** Resolve a Day's status + open assignment for the card's status chip. */
  statusFor: (day: Day) => LessonStatusInfo;
  /** Whether lesson cards can be dragged to reschedule. Off for read-only
   *  embeds (e.g. the Overview "This Week" card). Defaults to true. */
  draggableCards?: boolean;
  /** Override the per-column min-height (CSS length). Embeds pass a taller
   *  value so an empty week reserves a populated week's height. Defaults to
   *  `CAL_WEEK.columnMinHeight`. */
  columnMinHeight?: string;
}

export const WeekView = ({
  classroomId,
  weekAnchor,
  scheduledDays,
  nonSchoolMap,
  todayIso,
  dropIso,
  onCellDragOver,
  onCellDrop,
  countryFeatures,
  songsReady,
  statusFor,
  draggableCards = true,
  columnMinHeight = CAL_WEEK.columnMinHeight,
}: WeekViewProps) => {
  const week = useMemo(() => getWeekCalendar(weekAnchor), [weekAnchor]);
  const monFri = useMemo(() => week.days.slice(1, 6), [week.days]); // Mon…Fri

  /** Scheduled Days grouped by weekday ISO; weekend-scheduled Days set aside. */
  const { byIso, weekend } = useMemo(() => {
    const weekIsos = week.days.map(toIsoDate);
    const isoToIndex = new Map(weekIsos.map((iso, i) => [iso, i]));
    const byIso = new Map<string, Day[]>();
    const weekend: Array<{ day: Day; date: Date }> = [];
    // `scheduledDays` is already sorted by date then label.
    for (const day of scheduledDays) {
      if (!day.scheduledDate) continue;
      const idx = isoToIndex.get(day.scheduledDate);
      if (idx === undefined) continue;
      if (idx === 0 || idx === 6) {
        weekend.push({ day, date: week.days[idx] });
      } else {
        const arr = byIso.get(day.scheduledDate) ?? [];
        arr.push(day);
        byIso.set(day.scheduledDate, arr);
      }
    }
    return { byIso, weekend };
  }, [week.days, scheduledDays]);

  return (
    <div className="flex flex-col gap-3">
      {/* Day columns (Mon–Fri). */}
      <div className="grid gap-1.5" style={{ gridTemplateColumns: FIVE_COLS }}>
        {monFri.map((date) => {
          const iso = toIsoDate(date);
          const nonSchool = nonSchoolMap.get(iso);
          const holidayLike =
            Boolean(nonSchool) && nonSchool?.kind !== 'weekend';
          const isToday = iso === todayIso;
          const cards = byIso.get(iso) ?? [];
          return (
            <div
              key={iso}
              onDragOver={(e) => {
                // Every visible column is a real date, so no in-month guard.
                if (hasDragItem(e.dataTransfer)) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  onCellDragOver(iso);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                const item = readDragItem(e.dataTransfer);
                if (item) onCellDrop(iso, item);
              }}
              style={{
                minHeight: columnMinHeight,
                backgroundImage: holidayLike ? HATCH_HOLIDAY : undefined,
              }}
              className={`flex flex-col gap-2 rounded-xl border p-2 transition-colors ${
                holidayLike
                  ? 'border-white/[0.06] bg-white/[0.015]'
                  : 'border-white/[0.08] bg-white/[0.02]'
              } ${
                dropIso === iso
                  ? 'ring-2 ring-white/40'
                  : isToday
                    ? 'ring-1 ring-[#7ecfcf]/50'
                    : ''
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span
                  style={{ fontSize: CAL_WEEK.weekdayName }}
                  className="uppercase tracking-wide text-white/45"
                >
                  {WEEKDAY_LABELS[date.getDay()]}
                </span>
                {isToday ? (
                  <span
                    style={{
                      background: TODAY_ACCENT,
                      fontSize: CAL_WEEK.dateNumber,
                    }}
                    className="inline-flex items-center justify-center rounded-full px-2 font-semibold leading-none tabular-nums text-black"
                  >
                    {date.getDate()}
                  </span>
                ) : (
                  <span
                    style={{ fontSize: CAL_WEEK.dateNumber }}
                    className="font-semibold leading-none tabular-nums text-white/85"
                  >
                    {date.getDate()}
                  </span>
                )}
              </div>
              {holidayLike && (
                <span
                  style={{ fontSize: CAL_FONT.holiday }}
                  className="truncate uppercase tracking-wide text-white/50"
                  title={nonSchool?.label}
                >
                  {nonSchool?.label}
                </span>
              )}
              {cards.length > 0 ? (
                cards.map((day) => (
                  <WeekDayCard
                    key={day.id}
                    classroomId={classroomId}
                    day={day}
                    countryFeatures={countryFeatures}
                    songsReady={songsReady}
                    statusFor={statusFor}
                    draggable={draggableCards}
                  />
                ))
              ) : !holidayLike ? (
                <span
                  style={{ fontSize: CAL_FONT.dayLabel }}
                  className="mt-0.5 text-white/25"
                >
                  No lessons
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Weekend overflow — only when a Day was dragged onto Sat/Sun. */}
      {weekend.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2">
          <span
            style={{ fontSize: CAL_FONT.holiday }}
            className="uppercase tracking-wide text-white/40"
          >
            Weekend
          </span>
          <div
            className="grid gap-1.5"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            }}
          >
            {weekend.map(({ day, date }) => (
              <WeekDayCard
                key={day.id}
                classroomId={classroomId}
                day={day}
                tag={WEEKDAY_LABELS[date.getDay()]}
                countryFeatures={countryFeatures}
                songsReady={songsReady}
                statusFor={statusFor}
                draggable={draggableCards}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface WeekDayCardProps {
  classroomId: string;
  day: Day;
  /** Optional weekday chip (used by the weekend overflow strip). */
  tag?: string;
  countryFeatures: Feature[] | null;
  songsReady: boolean;
  statusFor: (day: Day) => LessonStatusInfo;
  /** Whether the card is a reschedule drag source. Defaults to true. */
  draggable?: boolean;
}

/** A large, readable lesson card — the Week view's "event". Mirrors the
 *  Lessons-page card (`LessonThumb` image banner + status chip), deep-links to
 *  the DayEditor, drag source. */
const WeekDayCard = ({
  classroomId,
  day,
  tag,
  countryFeatures,
  songsReady,
  statusFor,
  draggable = true,
}: WeekDayCardProps) => {
  const [dragging, setDragging] = useState(false);
  const { status, assignment } = statusFor(day);

  return (
    <Link
      to={TeacherRoutes.dayEditor({ classroomId, dayId: day.id })}
      draggable={draggable}
      onDragStart={
        draggable
          ? (e) => {
              setDragItem(e.dataTransfer, { kind: 'day', id: day.id });
              setDragging(true);
            }
          : undefined
      }
      onDragEnd={draggable ? () => setDragging(false) : undefined}
      className={`group flex overflow-hidden rounded-lg border border-white/15 bg-white/[0.04] transition hover:brightness-125 ${
        draggable ? 'cursor-grab active:cursor-grabbing' : ''
      } ${dragging ? 'opacity-50' : ''}`}
      title={day.label}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1.5 px-2 py-2">
        <LessonThumb
          day={day}
          countryFeatures={countryFeatures}
          songsReady={songsReady}
        />
        <span className="flex min-w-0 flex-col gap-1 px-0.5">
          <span className="flex items-center gap-1.5">
            {tag && (
              <span
                style={{ fontSize: CAL_FONT.coverage }}
                className="shrink-0 rounded-full border border-white/15 px-1.5 py-px font-medium uppercase tracking-wide text-white/50"
              >
                {tag}
              </span>
            )}
            <span
              style={{ fontSize: CAL_WEEK.cardTitle }}
              className="truncate font-medium leading-tight text-white/90"
            >
              {day.label}
            </span>
          </span>
          <span className="flex flex-wrap items-center gap-1">
            <StatusChip status={status} dueAt={assignment?.dueAt} />
          </span>
        </span>
      </span>
    </Link>
  );
};
