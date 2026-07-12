/**
 * Pure school-calendar module — rule-based US federal holidays + typical K-12
 * break defaults + weekend awareness. No React, no localStorage; consumers
 * merge the returned Map with per-classroom `exceptions`.
 *
 * All dates are handled in local time by construction (`new Date(year, m, d)`)
 * and serialized via `toIsoDate` which pulls the local Y/M/D — no timezone
 * drift on calendar boundaries.
 */

export type NonSchoolKind = 'weekend' | 'federal' | 'break' | 'custom';

export interface NonSchoolDay {
  /** YYYY-MM-DD */
  date: string;
  label: string;
  kind: NonSchoolKind;
}

export interface SchoolCalendarExceptions {
  /** Teacher-added dates that ARE non-school (e.g. "Teacher work day"). */
  additions: NonSchoolDay[];
  /** Dates the teacher wants treated AS school even though a default marks them off. */
  removals: string[];
}

export interface SchoolYear {
  autumn: number;
  spring: number;
}

/** Serialize a Date to YYYY-MM-DD using LOCAL year/month/day. */
export const toIsoDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Parse a YYYY-MM-DD string as a LOCAL Date at midnight. */
export const fromIsoDate = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Nth weekday of a month, e.g. nthWeekdayOf(2025, 8 /* Sep 0-idx *\/, 1 /* Mon *\/, 1) = first Mon of Sept. */
const nthWeekdayOf = (
  year: number,
  monthIndex0: number,
  weekday: number,
  n: number,
): Date => {
  const first = new Date(year, monthIndex0, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return new Date(year, monthIndex0, 1 + offset + (n - 1) * 7);
};

/** Last weekday of a month, e.g. last Monday of May = Memorial Day. */
const lastWeekdayOf = (
  year: number,
  monthIndex0: number,
  weekday: number,
): Date => {
  const lastDay = new Date(year, monthIndex0 + 1, 0);
  const diff = (lastDay.getDay() - weekday + 7) % 7;
  return new Date(year, monthIndex0, lastDay.getDate() - diff);
};

/**
 * Returns the federal + typical-K-12-break non-school days for a given
 * calendar year. Weekends NOT included (they're handled at merge time).
 */
export const getDefaultNonSchoolDaysForYear = (
  year: number,
): NonSchoolDay[] => {
  const out: NonSchoolDay[] = [];
  const push = (d: Date, label: string, kind: NonSchoolKind) =>
    out.push({ date: toIsoDate(d), label, kind });

  // Federal fixed-date
  push(new Date(year, 0, 1), "New Year's Day", 'federal');
  push(new Date(year, 5, 19), 'Juneteenth', 'federal');
  push(new Date(year, 6, 4), 'Independence Day', 'federal');
  push(new Date(year, 10, 11), 'Veterans Day', 'federal');
  push(new Date(year, 11, 25), 'Christmas Day', 'federal');

  // Federal floating
  push(nthWeekdayOf(year, 0, 1, 3), 'MLK Jr. Day', 'federal'); // 3rd Mon Jan
  push(nthWeekdayOf(year, 1, 1, 3), "Presidents' Day", 'federal'); // 3rd Mon Feb
  push(lastWeekdayOf(year, 4, 1), 'Memorial Day', 'federal'); // last Mon May
  push(nthWeekdayOf(year, 8, 1, 1), 'Labor Day', 'federal'); // 1st Mon Sept
  push(nthWeekdayOf(year, 9, 1, 2), "Indigenous Peoples' Day", 'federal'); // 2nd Mon Oct
  const thanksgiving = nthWeekdayOf(year, 10, 4, 4); // 4th Thu Nov
  push(thanksgiving, 'Thanksgiving', 'federal');

  // K-12 breaks
  // Thanksgiving break: Wed–Fri of Thanksgiving week (Wed = Thu-1, Fri = Thu+1).
  const wedBeforeThx = new Date(thanksgiving);
  wedBeforeThx.setDate(thanksgiving.getDate() - 1);
  push(wedBeforeThx, 'Thanksgiving break', 'break');
  const friAfterThx = new Date(thanksgiving);
  friAfterThx.setDate(thanksgiving.getDate() + 1);
  push(friAfterThx, 'Thanksgiving break', 'break');

  // Winter break: Dec 22 – Dec 31 of this year (Jan 1–2 comes from next-year
  // pass; caller unions across both calendar years).
  for (let d = 22; d <= 31; d++) {
    push(new Date(year, 11, d), 'Winter break', 'break');
  }
  // Early January winter break tail.
  for (let d = 2; d <= 2; d++) {
    push(new Date(year, 0, d), 'Winter break', 'break');
  }

  // Spring break: 2nd full week of March (Mon–Fri). "Full week" = starting on
  // the second Monday that itself isn't Mar 1-2.
  const mar1 = new Date(year, 2, 1);
  // First Monday of March:
  const firstMonMar = new Date(mar1);
  firstMonMar.setDate(1 + ((1 - mar1.getDay() + 7) % 7));
  // Second Monday = first + 7. If firstMonMar is Mar 1 itself, the "2nd full
  // week" heuristic still picks Mar 8 (or later) — we simply add 7 days.
  const springStart = new Date(firstMonMar);
  springStart.setDate(firstMonMar.getDate() + 7);
  for (let i = 0; i < 5; i++) {
    const d = new Date(springStart);
    d.setDate(springStart.getDate() + i);
    push(d, 'Spring break', 'break');
  }

  return out;
};

/**
 * Union of default + weekend + exceptions for the full school year window
 * (Aug 1 of `schoolYear.autumn` → May 31 of `schoolYear.spring`). Returns a
 * Map keyed by YYYY-MM-DD so callers can check `map.has(iso)` per cell.
 *
 * Merge order:
 *   1. Weekends (Sat/Sun) across every day in the school-year window.
 *   2. Federal + break defaults for both calendar years spanned.
 *   3. Drop entries whose date appears in `exceptions.removals`.
 *   4. Overlay `exceptions.additions` (custom entries) — custom wins.
 */
export const getNonSchoolDatesForSchoolYear = (
  schoolYear: SchoolYear,
  exceptions: SchoolCalendarExceptions,
): Map<string, NonSchoolDay> => {
  const out = new Map<string, NonSchoolDay>();

  // 1. Weekends
  const start = new Date(schoolYear.autumn, 7, 1); // Aug 1 autumn
  const end = new Date(schoolYear.spring, 5, 30); // Jun 30 spring — safe upper bound
  for (
    const cursor = new Date(start);
    cursor <= end;
    cursor.setDate(cursor.getDate() + 1)
  ) {
    const dow = cursor.getDay();
    if (dow === 0 || dow === 6) {
      const iso = toIsoDate(cursor);
      out.set(iso, {
        date: iso,
        label: dow === 0 ? 'Sun' : 'Sat',
        kind: 'weekend',
      });
    }
  }

  // 2. Federal + break defaults for both years
  for (const y of [schoolYear.autumn, schoolYear.spring]) {
    for (const d of getDefaultNonSchoolDaysForYear(y)) {
      out.set(d.date, d);
    }
  }

  // 3. Removals — teacher marks a default as instructional
  for (const r of exceptions.removals) {
    // Only remove non-weekend defaults; weekends stay non-school always.
    const existing = out.get(r);
    if (existing && existing.kind !== 'weekend') {
      out.delete(r);
    }
  }

  // 4. Additions — custom entries win over weekend labels
  for (const a of exceptions.additions) {
    out.set(a.date, a);
  }

  return out;
};

export const isSchoolDay = (
  date: Date,
  nonSchool: Map<string, NonSchoolDay>,
): boolean => !nonSchool.has(toIsoDate(date));

/** Empty exceptions singleton — used by default-cloned plans. */
export const EMPTY_EXCEPTIONS: SchoolCalendarExceptions = {
  additions: [],
  removals: [],
};
