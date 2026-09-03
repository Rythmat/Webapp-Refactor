/**
 * WeekView — the Annual Plan's single-week, day-column layout.
 *
 * A reference-styled, spacious week: five tall Mon–Fri columns (the school
 * week), a unit-span band across the top for multi-week context, and large
 * lesson cards stacked under each weekday. Lessons are date-scheduled (no
 * time-of-day), so cards stack by day rather than on an hourly axis. Reuses
 * the Month view's unit colors, drag-drop model, and deep-links. Weekend-
 * scheduled Days (rare — only reachable by a Month-view drag) surface in a
 * strip below the grid so nothing is hidden.
 */
import type { Feature } from 'geojson';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';
import { useThemeBank } from '../content/hooks';
import { LessonThumb } from '../plan/LessonThumb';
import { StatusChip, type LessonStatusInfo } from '../plan/lessonStatus';
import type { Day, StudentLanguage, Unit } from '../types';
import { UnitBar } from './UnitBar';
import {
  hasDragItem,
  readDragItem,
  setDragItem,
  type CalendarDragItem,
} from './calendarDnd';
import {
  assignUnitLanes,
  getWeekCalendar,
  segmentUnitIntoWeek,
  type UnitDateRange,
  type UnitWeekSegment,
} from './calendarMath';
import { CAL_FONT, CAL_WEEK } from './calendarSizing';
import { toIsoDate, type NonSchoolDay } from './schoolCalendar';
import { colorForUnitId } from './unitColors';
import { suggestedCountFor } from './unitCoverage';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Amber diagonal hatch for a non-school (holiday/break) day column. */
const HATCH_HOLIDAY =
  'repeating-linear-gradient(45deg, rgba(251,191,36,0.07) 0, rgba(251,191,36,0.07) 1px, transparent 1px, transparent 7px)';
/** App accent (teal) — the "today" highlight. */
const TODAY_ACCENT = '#7ecfcf';

/** Five equal Mon–Fri columns. */
const FIVE_COLS = 'repeat(5, minmax(0, 1fr))';

interface WeekViewProps {
  classroomId: string;
  /** Any date within the week to show; normalized to its Sunday-first week. */
  weekAnchor: Date;
  language: StudentLanguage;
  allUnits: Unit[];
  /** Each Unit's visible [start, end] range (shared with the Month view). */
  unitRanges: Map<string, UnitDateRange>;
  unitByDayId: Map<string, string>;
  getDay: (dayId: string) => Day | undefined;
  /** Lesson ids to hide as duplicates (same date + label as an earlier one). */
  hiddenDayIds: Set<string>;
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
  /** Keep the unit-band row's vertical footprint even when no unit touches the
   *  week, so empty weeks stay the same height as populated ones. Default false. */
  reserveBandRow?: boolean;
}

export const WeekView = ({
  classroomId,
  weekAnchor,
  language,
  allUnits,
  unitRanges,
  unitByDayId,
  getDay,
  hiddenDayIds,
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
  reserveBandRow = false,
}: WeekViewProps) => {
  const week = useMemo(() => getWeekCalendar(weekAnchor), [weekAnchor]);
  const monFri = useMemo(() => week.days.slice(1, 6), [week.days]); // Mon…Fri

  const unitById = useMemo(() => {
    const map = new Map<string, Unit>();
    for (const u of allUnits) map.set(u.id, u);
    return map;
  }, [allUnits]);

  /** Unit-band segments touching this week, with compact lanes among just the
   *  visible units (so the band has no empty lanes from off-week units). */
  const band = useMemo(() => {
    const visible: Array<{
      unit: Unit;
      seg: UnitWeekSegment;
      range: UnitDateRange;
    }> = [];
    for (const unit of allUnits) {
      const range = unitRanges.get(unit.id);
      if (!range) continue;
      const seg = segmentUnitIntoWeek(range, week.days);
      if (!seg) continue;
      visible.push({ unit, seg, range });
    }
    const lanes = assignUnitLanes(
      visible.map(({ unit, range }) => ({
        id: unit.id,
        start: range.start.getTime(),
        end: range.end.getTime(),
      })),
    );
    const laneCount = visible.reduce(
      (max, { unit }) => Math.max(max, (lanes.get(unit.id) ?? 0) + 1),
      0,
    );
    return { visible, lanes, laneCount };
  }, [allUnits, unitRanges, week.days]);

  /** Scheduled Days grouped by weekday ISO; weekend-scheduled Days set aside. */
  const { byIso, weekend } = useMemo(() => {
    const weekIsos = week.days.map(toIsoDate);
    const isoToIndex = new Map(weekIsos.map((iso, i) => [iso, i]));
    const byIso = new Map<string, Array<{ day: Day; parentUnitId: string }>>();
    const weekend: Array<{ day: Day; parentUnitId: string; date: Date }> = [];
    for (const [dayId, unitId] of unitByDayId) {
      if (hiddenDayIds.has(dayId)) continue;
      const day = getDay(dayId);
      if (!day?.scheduledDate) continue;
      const idx = isoToIndex.get(day.scheduledDate);
      if (idx === undefined) continue;
      if (idx === 0 || idx === 6) {
        weekend.push({ day, parentUnitId: unitId, date: week.days[idx] });
      } else {
        const arr = byIso.get(day.scheduledDate) ?? [];
        arr.push({ day, parentUnitId: unitId });
        byIso.set(day.scheduledDate, arr);
      }
    }
    for (const arr of byIso.values()) {
      arr.sort((a, b) => a.day.label.localeCompare(b.day.label));
    }
    return { byIso, weekend };
  }, [week.days, unitByDayId, getDay, hiddenDayIds]);

  return (
    <div className="flex flex-col gap-3">
      {/* Unit-span band (multi-week context, like an "all-day" row). When
          `reserveBandRow` is set, the row is kept even with no units so an
          empty week stays the same height as a populated one. */}
      {(reserveBandRow || band.laneCount > 0) && (
        <div
          className="grid gap-1.5"
          style={{
            gridTemplateColumns: FIVE_COLS,
            gridAutoRows: `minmax(${CAL_WEEK.bandRowMin}, auto)`,
            minHeight: CAL_WEEK.bandRowMin,
          }}
        >
          {band.visible.map(({ unit, seg }) => {
            const lane = band.lanes.get(unit.id) ?? 0;
            return (
              <UnitBar
                key={`band-${unit.id}`}
                classroomId={classroomId}
                unit={unit}
                language={language}
                // Segment columns are Sunday-first (2–6); remap to Mon–Fri 1–5.
                // Math.max guards against an invalid grid-column-start of 0.
                startColumn={Math.max(1, seg.startColumn - 1)}
                spanColumns={seg.spanColumns}
                isFirstSegment={seg.isFirstSegment}
                daysPlanned={
                  (unit.dayIds ?? []).filter((id) => !hiddenDayIds.has(id))
                    .length
                }
                suggestedDayCount={suggestedCountFor(unit.id)}
                gridRow={lane + 1}
              />
            );
          })}
        </div>
      )}

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
                  className="truncate uppercase tracking-wide text-amber-200/70"
                  title={nonSchool?.label}
                >
                  {nonSchool?.label}
                </span>
              )}
              {cards.length > 0 ? (
                cards.map(({ day, parentUnitId }) => (
                  <WeekDayCard
                    key={day.id}
                    classroomId={classroomId}
                    day={day}
                    parentUnit={unitById.get(parentUnitId) ?? null}
                    language={language}
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
            {weekend.map(({ day, parentUnitId, date }) => (
              <WeekDayCard
                key={day.id}
                classroomId={classroomId}
                day={day}
                parentUnit={unitById.get(parentUnitId) ?? null}
                language={language}
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
  parentUnit: Unit | null;
  language: StudentLanguage;
  /** Optional weekday chip (used by the weekend overflow strip). */
  tag?: string;
  countryFeatures: Feature[] | null;
  songsReady: boolean;
  statusFor: (day: Day) => LessonStatusInfo;
  /** Whether the card is a reschedule drag source. Defaults to true. */
  draggable?: boolean;
}

/** A large, readable lesson card — the Week view's "event". Mirrors the
 *  Lessons-page card (`LessonThumb` image banner + status chip), accent-striped
 *  in its parent Unit's color, deep-links to the DayEditor, drag source. */
const WeekDayCard = ({
  classroomId,
  day,
  parentUnit,
  language,
  tag,
  countryFeatures,
  songsReady,
  statusFor,
  draggable = true,
}: WeekDayCardProps) => {
  const [dragging, setDragging] = useState(false);
  const { byId } = useThemeBank();
  const theme = parentUnit?.theme ? byId(parentUnit.theme.themeId) : undefined;
  const color = parentUnit ? colorForUnitId(parentUnit.id) : null;
  const bgClass = color?.bg ?? 'bg-white/[0.04]';
  const borderClass = color?.border ?? 'border-white/15';
  const stripe = color?.hex ?? '#ffffff';

  const titleEn = theme?.title.en ?? parentUnit?.label ?? '';
  const titleEs = theme?.title.es;
  const subtitle =
    language === 'es' && titleEs
      ? titleEs
      : language === 'both' && titleEs
        ? `${titleEn} · ${titleEs}`
        : titleEn;

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
      className={`group flex overflow-hidden rounded-lg border ${bgClass} ${borderClass} transition hover:brightness-125 ${
        draggable ? 'cursor-grab active:cursor-grabbing' : ''
      } ${dragging ? 'opacity-50' : ''}`}
      title={day.label}
    >
      <span
        aria-hidden
        className="w-1.5 shrink-0 self-stretch"
        style={{ background: stripe }}
      />
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
          {subtitle && (
            <span
              style={{ fontSize: CAL_WEEK.cardSubtitle }}
              className="truncate leading-tight text-white/55"
            >
              {subtitle}
            </span>
          )}
          <span className="flex flex-wrap items-center gap-1">
            <StatusChip status={status} dueAt={assignment?.dueAt} />
          </span>
        </span>
      </span>
    </Link>
  );
};
