/**
 * Pure date/week/segment helpers for the Annual Plan calendar view.
 *
 * No React, no localStorage — everything here is deterministic given its
 * inputs so the calendar view stays thin and the tests stay simple.
 *
 * Conventions:
 *   - Months are 1-indexed (1 = January, 12 = December), matching how the
 *     rest of the classroom domain talks about months (`Theme.month`,
 *     `Unit.monthIndex`). Note: `Date`'s own month getter is 0-indexed —
 *     everywhere in this module we translate at the boundary.
 *   - Weeks are Sunday-first. `Date.getDay()` returns 0 for Sunday, which
 *     lines up directly with the "column" index below.
 *   - "Column" is 1-7 (1 = Sunday) to match how CSS Grid `grid-column-start`
 *     and `span` want their values.
 *
 * SchoolYear: our curriculum runs Aug (autumn) → May (spring). For any
 * given calendar year `Y`, the Autumn semester runs Aug–Dec of `Y`, and
 * the Spring semester runs Jan–May of `Y + 1`. `resolveSchoolYear(today)`
 * returns the pair for whichever school year contains `today`, with a
 * Jun/Jul default to the *upcoming* school year.
 */
import type { Unit } from '../types';

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export interface SchoolYear {
  /** Calendar year that holds Autumn (Aug–Dec). */
  autumn: number;
  /** Calendar year that holds Spring (Jan–May). */
  spring: number;
}

export interface ViewMonth {
  /** Full calendar year. */
  year: number;
  /** 1-indexed month (1 = January, 12 = December). */
  month: number;
}

export interface MonthCalendar {
  /** Each week is an array of exactly 7 Dates, Sunday-first. Padding days
   *  from the previous/next month are included so every week fills 7 cells. */
  weeks: Date[][];
  daysInMonth: number;
  firstWeekday: number; // 0-6, Sunday-first
  monthLabel: string; // e.g. "October 2025"
  year: number;
  month: number; // 1-indexed
}

export interface UnitDateRange {
  start: Date;
  end: Date;
}

export interface UnitWeekSegment {
  /** Index into `MonthCalendar.weeks`. */
  weekIndex: number;
  /** Grid column to start the bar in (1-7, 1 = Sunday). */
  startColumn: number;
  /** How many columns the bar spans this week (1-7). */
  spanColumns: number;
  /** True on the first segment of a multi-week unit (used for label vs. `↳`). */
  isFirstSegment: boolean;
}

/** Days-first — used at week boundaries. */
const startOfDay = (d: Date): Date =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Local-time YYYY-MM-DD key — same shape as schoolCalendar.toIsoDate. */
const isoDateLocal = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Determines which school year a date falls into. */
export const resolveSchoolYear = (today: Date): SchoolYear => {
  const y = today.getFullYear();
  const m0 = today.getMonth(); // 0-indexed
  if (m0 >= 7) {
    // Aug (7) – Dec (11) → Autumn is this year.
    return { autumn: y, spring: y + 1 };
  }
  if (m0 <= 4) {
    // Jan (0) – May (4) → Spring is this year, Autumn was last year.
    return { autumn: y - 1, spring: y };
  }
  // Jun (5) / Jul (6) — default to the upcoming school year.
  return { autumn: y, spring: y + 1 };
};

/** Landing month for the calendar: today's month if it falls in the school
 *  year (Aug–May), else August of the resolved school year. */
export const resolveInitialMonth = (today: Date): ViewMonth => {
  const y = today.getFullYear();
  const m0 = today.getMonth();
  const schoolYear = resolveSchoolYear(today);
  if (m0 >= 7) {
    // Aug–Dec → the current calendar month, current year.
    return { year: y, month: m0 + 1 };
  }
  if (m0 <= 4) {
    // Jan–May → the current calendar month, current year.
    return { year: y, month: m0 + 1 };
  }
  // Jun / Jul → jump to August of the upcoming autumn.
  return { year: schoolYear.autumn, month: 8 };
};

/** Builds the visible weeks for a month, padded to 7-cell rows. */
export const getMonthCalendar = (
  year: number,
  month: number,
): MonthCalendar => {
  // month is 1-indexed; Date wants 0-indexed.
  const firstOfMonth = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = firstOfMonth.getDay(); // 0-6, Sunday-first

  const weeks: Date[][] = [];
  let cursor = new Date(firstOfMonth);
  cursor.setDate(1 - firstWeekday); // step back to the Sunday of the first week

  // Bound by 6 weeks — the widest any Gregorian month can occupy in a
  // Sunday-first grid. Break earlier once the last-day-of-month is covered.
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(startOfDay(cursor));
      cursor = new Date(cursor);
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    const lastCell = week[6];
    if (
      lastCell.getFullYear() > year ||
      (lastCell.getFullYear() === year && lastCell.getMonth() >= month)
    ) {
      break;
    }
  }

  return {
    weeks,
    daysInMonth,
    firstWeekday,
    monthLabel: `${MONTH_NAMES[month - 1]} ${year}`,
    year,
    month,
  };
};

/** Resolves the [start, end] date range for a Unit, given the school year. */
export const resolveUnitDateRange = (
  unit: Unit,
  schoolYear: SchoolYear,
): UnitDateRange => {
  const monthIndex = unit.monthIndex; // 1-12
  // Autumn = Aug–Dec (monthIndex 8–12) → schoolYear.autumn
  // Spring = Jan–May (monthIndex 1–5)  → schoolYear.spring
  // June/July fall to spring by convention (not used by the canonical template).
  const semesterYear = monthIndex >= 8 ? schoolYear.autumn : schoolYear.spring;

  if (unit.dateWindow) {
    // dateWindow may straddle the semester boundary (e.g. HHM 09-15 → 10-15,
    // Indigenous+DDLM 10-12 → 11-02). Parse both ends independently.
    const [sm, sd] = unit.dateWindow.start.split('-').map(Number);
    const [em, ed] = unit.dateWindow.end.split('-').map(Number);
    const startYear = sm >= 8 ? schoolYear.autumn : schoolYear.spring;
    const endYear = em >= 8 ? schoolYear.autumn : schoolYear.spring;
    return {
      start: new Date(startYear, sm - 1, sd),
      end: new Date(endYear, em - 1, ed),
    };
  }

  // Default: whole month.
  const start = new Date(semesterYear, monthIndex - 1, 1);
  const end = new Date(semesterYear, monthIndex, 0); // last day of the month
  return { start, end };
};

/**
 * Given a Unit's actual scheduled ISO dates (from its Days' `scheduledDate`),
 * return the visible date range as `{ start, end } = { min, max }`. Falls
 * back to `fallback` when the Unit has no scheduled Days yet — that lets
 * seeded-but-not-yet-populated Units still draw a bar at their declared
 * window, and it lets the chained-sequential auto-populate's Units draw
 * a bar that hugs their actual scheduled block instead of the (potentially
 * off) declared window.
 */
export const rangeFromScheduledDates = (
  scheduledIsos: readonly string[],
  fallback: UnitDateRange,
): UnitDateRange => {
  if (scheduledIsos.length === 0) return fallback;
  const sorted = [...scheduledIsos].sort();
  const parse = (iso: string): Date => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  return {
    start: parse(sorted[0]),
    end: parse(sorted[sorted.length - 1]),
  };
};

/** Segments a unit's date range across the weeks of a visible calendar
 *  month. Cross-week units emit one segment per week they touch inside the
 *  visible window; the first segment gets `isFirstSegment: true`.
 *
 *  Weekday-only: each week's overlap is clamped to Monday–Friday
 *  (columns 2–6 in the Sunday-first grid) so Unit bars never render over
 *  Saturday or Sunday cells. A Unit that spans Fri → Mon of the next week
 *  produces one 1-column Friday segment plus one 1-column Monday segment;
 *  the weekend cells between them stay empty. */
export const segmentUnitIntoWeeks = (
  range: UnitDateRange,
  calendar: MonthCalendar,
): UnitWeekSegment[] => {
  const segments: UnitWeekSegment[] = [];
  const rangeStart = startOfDay(range.start).getTime();
  const rangeEnd = startOfDay(range.end).getTime();
  const DAY_MS = 24 * 60 * 60 * 1000;

  // The unit's absolute first-day is the same across all weeks — track it so
  // we can flag the first segment relative to the unit's own timeline, not
  // relative to what happens to be visible in the current month.
  const unitFirstDayTime = rangeStart;

  calendar.weeks.forEach((week, weekIndex) => {
    // Clamp each week to its Mon (index 1) — Fri (index 5) cells. Sat + Sun
    // are excluded so Units render only across weekday cells.
    const weekStartTime = startOfDay(week[0]).getTime();
    const weekMonTime = startOfDay(week[1]).getTime();
    const weekFriTime = startOfDay(week[5]).getTime();

    // No weekday-overlap with this week?
    if (rangeEnd < weekMonTime || rangeStart > weekFriTime) return;

    const overlapStart = Math.max(rangeStart, weekMonTime);
    const overlapEnd = Math.min(rangeEnd, weekFriTime);

    // Days from the (Sun-first) start of the week to the overlap start.
    const startColumn = Math.floor((overlapStart - weekStartTime) / DAY_MS) + 1;
    const spanColumns = Math.floor((overlapEnd - overlapStart) / DAY_MS) + 1;

    segments.push({
      weekIndex,
      startColumn,
      spanColumns,
      isFirstSegment: overlapStart === unitFirstDayTime,
    });
  });

  return segments;
};

/** Returns every Date between `start` and `end`, inclusive. */
export const datesBetween = (start: Date, end: Date): Date[] => {
  const out: Date[] = [];
  const cursor = startOfDay(start);
  const last = startOfDay(end).getTime();
  while (cursor.getTime() <= last) {
    out.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
};

/** Filters a range down to only the days that are NOT in the `nonSchool`
 *  keyed-by-ISO map. */
export const getSchoolDaysInRange = (
  start: Date,
  end: Date,
  nonSchool: Map<string, unknown>,
): Date[] =>
  datesBetween(start, end).filter((d) => !nonSchool.has(isoDateLocal(d)));

/**
 * Walks forward from `anchor` and returns the next `n` school days
 * (dates NOT keyed in `nonSchool`). Used by the chained-sequential
 * auto-populate to hand every Unit exactly `n` consecutive school days.
 *
 * Bounded to a 2-year forward search so a bogus (empty) `nonSchool` map
 * still terminates. Returns fewer than `n` days if the walker runs out
 * of the bounded window — caller decides how to handle overflow.
 */
export const getNextNSchoolDays = (
  anchor: Date,
  n: number,
  nonSchool: Map<string, unknown>,
): Date[] => {
  const out: Date[] = [];
  if (n <= 0) return out;
  const cursor = new Date(
    anchor.getFullYear(),
    anchor.getMonth(),
    anchor.getDate(),
  );
  const hardStop = new Date(
    cursor.getFullYear() + 2,
    cursor.getMonth(),
    cursor.getDate(),
  ).getTime();
  while (out.length < n && cursor.getTime() <= hardStop) {
    if (!nonSchool.has(isoDateLocal(cursor))) out.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
};

/**
 * Picks a school day for the `existingCount`-th Day being added to a Unit
 * whose total planned count is `total`. Distributes evenly across the given
 * `schoolDays` list. Returns null if there's no room.
 *
 *   existingCount = 0 → picks the first-chunk midpoint
 *   existingCount = total-1 → picks the last-chunk midpoint
 */
export const distributeAcrossSchoolDays = (
  existingCount: number,
  total: number,
  schoolDays: Date[],
): Date | null => {
  if (total <= 0 || schoolDays.length === 0) return null;
  if (existingCount >= total) return null;
  const targetIndex = Math.floor(
    ((existingCount + 0.5) * schoolDays.length) / total,
  );
  const clamped = Math.min(targetIndex, schoolDays.length - 1);
  return schoolDays[clamped];
};

/** Utility: advance/rewind a ViewMonth by ±1 month, correctly rolling the year. */
export const stepMonth = (view: ViewMonth, delta: -1 | 1): ViewMonth => {
  const next = view.month + delta;
  if (next < 1) return { year: view.year - 1, month: 12 };
  if (next > 12) return { year: view.year + 1, month: 1 };
  return { year: view.year, month: next };
};
