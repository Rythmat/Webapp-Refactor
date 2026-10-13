import { describe, expect, it } from 'vitest';
import {
  datesBetween,
  distributeAcrossSchoolDays,
  firstWeekdayWeekAnchor,
  getMonthCalendar,
  getNextNSchoolDays,
  getSchoolDaysInRange,
  getWeekCalendar,
  getWeekDays,
  resolveInitialMonth,
  resolveInitialWeek,
  resolveSchoolYear,
  stepMonth,
  stepWeek,
} from './calendarMath';

describe('resolveSchoolYear', () => {
  it('places autumn in the current year for Aug–Dec dates', () => {
    expect(resolveSchoolYear(new Date(2025, 7, 1))).toEqual({
      autumn: 2025,
      spring: 2026,
    });
    expect(resolveSchoolYear(new Date(2025, 11, 15))).toEqual({
      autumn: 2025,
      spring: 2026,
    });
  });

  it('places spring in the current year for Jan–May dates', () => {
    expect(resolveSchoolYear(new Date(2026, 0, 1))).toEqual({
      autumn: 2025,
      spring: 2026,
    });
    expect(resolveSchoolYear(new Date(2026, 4, 31))).toEqual({
      autumn: 2025,
      spring: 2026,
    });
  });

  it('defaults Jun/Jul to the upcoming school year', () => {
    expect(resolveSchoolYear(new Date(2025, 5, 15))).toEqual({
      autumn: 2025,
      spring: 2026,
    });
    expect(resolveSchoolYear(new Date(2025, 6, 1))).toEqual({
      autumn: 2025,
      spring: 2026,
    });
  });
});

describe('resolveInitialMonth', () => {
  it('returns the current month when it falls in the school year', () => {
    expect(resolveInitialMonth(new Date(2025, 8, 10))).toEqual({
      year: 2025,
      month: 9,
    });
    expect(resolveInitialMonth(new Date(2026, 1, 4))).toEqual({
      year: 2026,
      month: 2,
    });
  });

  it('falls back to August of the upcoming autumn for Jun/Jul', () => {
    expect(resolveInitialMonth(new Date(2025, 5, 20))).toEqual({
      year: 2025,
      month: 8,
    });
    expect(resolveInitialMonth(new Date(2025, 6, 1))).toEqual({
      year: 2025,
      month: 8,
    });
  });
});

describe('getMonthCalendar', () => {
  it('builds Sunday-first weeks for October 2025', () => {
    const cal = getMonthCalendar(2025, 10);
    expect(cal.monthLabel).toBe('October 2025');
    expect(cal.daysInMonth).toBe(31);
    // Oct 1, 2025 is a Wednesday (weekday 3).
    expect(cal.firstWeekday).toBe(3);
    // First cell of the first week should be Sep 28, 2025 (Sunday).
    const firstCell = cal.weeks[0][0];
    expect(firstCell.getFullYear()).toBe(2025);
    expect(firstCell.getMonth()).toBe(8); // September (0-indexed)
    expect(firstCell.getDate()).toBe(28);
    // Every week is exactly 7 cells.
    for (const w of cal.weeks) expect(w).toHaveLength(7);
    // Last cell of the last week should not roll past October by more than a week.
    const lastCell = cal.weeks[cal.weeks.length - 1][6];
    expect(lastCell.getFullYear()).toBe(2025);
    expect(lastCell.getMonth()).toBe(10); // November (0-indexed)
  });

  it('builds calendar for February 2026 (non-leap)', () => {
    const cal = getMonthCalendar(2026, 2);
    expect(cal.daysInMonth).toBe(28);
    // Feb 1, 2026 is a Sunday.
    expect(cal.firstWeekday).toBe(0);
    expect(cal.weeks[0][0].getDate()).toBe(1);
  });
});

describe('stepMonth', () => {
  it('advances and rewinds within a year', () => {
    expect(stepMonth({ year: 2025, month: 9 }, 1)).toEqual({
      year: 2025,
      month: 10,
    });
    expect(stepMonth({ year: 2025, month: 9 }, -1)).toEqual({
      year: 2025,
      month: 8,
    });
  });

  it('rolls the year at boundaries', () => {
    expect(stepMonth({ year: 2025, month: 12 }, 1)).toEqual({
      year: 2026,
      month: 1,
    });
    expect(stepMonth({ year: 2025, month: 1 }, -1)).toEqual({
      year: 2024,
      month: 12,
    });
  });
});

describe('datesBetween', () => {
  it('returns inclusive dates', () => {
    const dates = datesBetween(new Date(2025, 8, 15), new Date(2025, 8, 17));
    expect(dates.map((d) => d.getDate())).toEqual([15, 16, 17]);
  });

  it('returns a single-day array when start equals end', () => {
    expect(
      datesBetween(new Date(2025, 8, 15), new Date(2025, 8, 15)),
    ).toHaveLength(1);
  });
});

describe('getSchoolDaysInRange', () => {
  it('filters out days that are in the non-school map', () => {
    // Range: Sep 15 (Mon) – Sep 21 (Sun) 2025. Sat + Sun = 2 weekend days.
    const map = new Map<string, unknown>();
    map.set('2025-09-20', 'Sat');
    map.set('2025-09-21', 'Sun');
    const days = getSchoolDaysInRange(
      new Date(2025, 8, 15),
      new Date(2025, 8, 21),
      map,
    );
    expect(days).toHaveLength(5); // Mon-Fri
    expect(days.map((d) => d.getDate())).toEqual([15, 16, 17, 18, 19]);
  });
});

describe('distributeAcrossSchoolDays', () => {
  const schoolDays = Array.from(
    { length: 20 },
    (_, i) => new Date(2025, 8, 15 + i),
  );

  it('divides 20 school days evenly across 4 stubs', () => {
    // Formula: floor((i + 0.5) * 20 / 4) → 2, 7, 12, 17
    const indexIn = (d: Date | null) =>
      d ? schoolDays.findIndex((sd) => sd.getTime() === d.getTime()) : -1;
    expect(indexIn(distributeAcrossSchoolDays(0, 4, schoolDays))).toBe(2);
    expect(indexIn(distributeAcrossSchoolDays(1, 4, schoolDays))).toBe(7);
    expect(indexIn(distributeAcrossSchoolDays(2, 4, schoolDays))).toBe(12);
    expect(indexIn(distributeAcrossSchoolDays(3, 4, schoolDays))).toBe(17);
  });

  it('returns null when there are no school days', () => {
    expect(distributeAcrossSchoolDays(0, 3, [])).toBeNull();
  });

  it('returns null when existingCount is >= total', () => {
    expect(distributeAcrossSchoolDays(3, 3, schoolDays)).toBeNull();
    expect(distributeAcrossSchoolDays(10, 3, schoolDays)).toBeNull();
  });

  it('clamps the target to the last available school day', () => {
    // total 10, only 3 school days → the last picks all clamp to day 3.
    const short = schoolDays.slice(0, 3);
    const last = distributeAcrossSchoolDays(9, 10, short);
    expect(last).toBe(short[2]);
  });
});

describe('getNextNSchoolDays', () => {
  const iso = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  it('returns the next N dates when the map is empty', () => {
    const anchor = new Date(2025, 8, 15); // Sep 15, 2025 (a Monday)
    const days = getNextNSchoolDays(anchor, 5, new Map());
    expect(days.map(iso)).toEqual([
      '2025-09-15',
      '2025-09-16',
      '2025-09-17',
      '2025-09-18',
      '2025-09-19',
    ]);
  });

  it('skips dates keyed in the nonSchool map (weekends + holidays)', () => {
    // Skip Sep 20 (Sat), Sep 21 (Sun), and mark Sep 22 as a holiday.
    const nonSchool = new Map<string, unknown>([
      ['2025-09-20', 'weekend'],
      ['2025-09-21', 'weekend'],
      ['2025-09-22', 'holiday'],
    ]);
    const anchor = new Date(2025, 8, 19); // Fri Sep 19
    const days = getNextNSchoolDays(anchor, 3, nonSchool);
    expect(days.map(iso)).toEqual(['2025-09-19', '2025-09-23', '2025-09-24']);
  });

  it('returns fewer than N when the 2-year window runs out', () => {
    // Every day is a non-school day → walker can never accumulate more than 0.
    const nonSchool = new Map<string, unknown>();
    const anchor = new Date(2025, 8, 15);
    // Seed nonSchool with every date across the 2-year forward window.
    const cursor = new Date(anchor);
    while (
      cursor.getTime() <=
      new Date(
        anchor.getFullYear() + 2,
        anchor.getMonth(),
        anchor.getDate(),
      ).getTime()
    ) {
      nonSchool.set(iso(cursor), true);
      cursor.setDate(cursor.getDate() + 1);
    }
    const days = getNextNSchoolDays(anchor, 5, nonSchool);
    expect(days).toEqual([]);
  });

  it('returns an empty array for n <= 0', () => {
    expect(getNextNSchoolDays(new Date(2025, 8, 15), 0, new Map())).toEqual([]);
    expect(getNextNSchoolDays(new Date(2025, 8, 15), -3, new Map())).toEqual(
      [],
    );
  });

  it('is idempotent — does not mutate the anchor Date', () => {
    const anchor = new Date(2025, 8, 15);
    const before = anchor.getTime();
    getNextNSchoolDays(anchor, 5, new Map());
    expect(anchor.getTime()).toBe(before);
  });
});

describe('getWeekDays', () => {
  it('returns the 7 Sunday-first dates of the containing week', () => {
    // Oct 1, 2025 is a Wednesday; its week runs Sun Sep 28 → Sat Oct 4.
    const days = getWeekDays(new Date(2025, 9, 1));
    expect(days).toHaveLength(7);
    expect(days[0].getDay()).toBe(0); // Sunday
    expect(days[0].getMonth()).toBe(8); // September
    expect(days[0].getDate()).toBe(28);
    expect(days[6].getMonth()).toBe(9); // October
    expect(days[6].getDate()).toBe(4);
  });

  it('returns the same week for any day within it', () => {
    const fromSun = getWeekDays(new Date(2025, 8, 28));
    const fromSat = getWeekDays(new Date(2025, 9, 4));
    expect(fromSun.map((d) => d.getTime())).toEqual(
      fromSat.map((d) => d.getTime()),
    );
  });

  it('does not mutate the anchor', () => {
    const anchor = new Date(2025, 9, 1);
    const before = anchor.getTime();
    getWeekDays(anchor);
    expect(anchor.getTime()).toBe(before);
  });
});

describe('getWeekCalendar', () => {
  it('labels a single-month week', () => {
    const wk = getWeekCalendar(new Date(2025, 9, 8)); // Wed Oct 8
    expect(wk.start.getDate()).toBe(5);
    expect(wk.end.getDate()).toBe(11);
    expect(wk.label).toBe('Oct 5 – 11, 2025');
  });

  it('labels a month-straddling week with both months', () => {
    const wk = getWeekCalendar(new Date(2025, 9, 1)); // Sep 28 → Oct 4
    expect(wk.label).toBe('Sep 28 – Oct 4, 2025');
  });

  it('labels a year-straddling week with both years', () => {
    // Dec 31, 2025 is a Wednesday; week runs Sun Dec 28 → Sat Jan 3, 2026.
    const wk = getWeekCalendar(new Date(2025, 11, 31));
    expect(wk.start.getFullYear()).toBe(2025);
    expect(wk.end.getFullYear()).toBe(2026);
    expect(wk.label).toBe('Dec 28, 2025 – Jan 3, 2026');
  });
});

describe('stepWeek', () => {
  it('advances/rewinds a full week, returning the containing Sunday', () => {
    const base = new Date(2025, 9, 1); // Wed Oct 1 → week starts Sun Sep 28
    const next = stepWeek(base, 1);
    expect(next.getDay()).toBe(0);
    expect(next.getMonth()).toBe(9); // October
    expect(next.getDate()).toBe(5); // Sun Oct 5
    const prev = stepWeek(base, -1);
    expect(prev.getMonth()).toBe(8); // September
    expect(prev.getDate()).toBe(21); // Sun Sep 21
  });

  it('rolls across a month/year boundary', () => {
    // Sun Dec 28, 2025 + 1 week → Sun Jan 4, 2026.
    const next = stepWeek(new Date(2025, 11, 28), 1);
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(0);
    expect(next.getDate()).toBe(4);
  });

  it('does not mutate the anchor', () => {
    const anchor = new Date(2025, 9, 1);
    const before = anchor.getTime();
    stepWeek(anchor, 1);
    expect(anchor.getTime()).toBe(before);
  });
});

describe('resolveInitialWeek', () => {
  it('returns the containing Sunday for an in-school-year date', () => {
    const wk = resolveInitialWeek(new Date(2025, 9, 1)); // Wed Oct 1
    expect(wk.getDay()).toBe(0);
    expect(wk.getMonth()).toBe(8); // September
    expect(wk.getDate()).toBe(28);
  });

  it('jumps to the first week of the upcoming August for Jun/Jul', () => {
    // Aug 1, 2025 is a Friday → its week starts Sun Jul 27, 2025.
    const wk = resolveInitialWeek(new Date(2025, 5, 15)); // Jun 15
    expect(wk.getDay()).toBe(0);
    expect(wk.getFullYear()).toBe(2025);
    expect(wk.getMonth()).toBe(6); // July
    expect(wk.getDate()).toBe(27);
  });
});

describe('firstWeekdayWeekAnchor', () => {
  it('skips a weekend 1st so the anchored week has in-month weekdays', () => {
    // Aug 1, 2026 is a Saturday → first weekday is Mon Aug 3, whose week
    // starts Sun Aug 2; its Wednesday (Aug 5) is in August.
    const anchor = firstWeekdayWeekAnchor(2026, 8);
    expect(anchor.getDay()).toBe(0); // Sunday
    expect(anchor.getFullYear()).toBe(2026);
    expect(anchor.getMonth()).toBe(7); // August
    expect(anchor.getDate()).toBe(2);
    expect(getWeekDays(anchor)[3].getMonth()).toBe(7); // Wednesday in August
  });

  it('returns the containing week when the 1st is a weekday', () => {
    // Dec 1, 2026 is a Tuesday; its week runs Sun Nov 29 → Sat Dec 5.
    const anchor = firstWeekdayWeekAnchor(2026, 12);
    expect(anchor.getDay()).toBe(0); // Sunday
    const week = getWeekDays(anchor);
    expect(week.some((d) => d.getMonth() === 11 && d.getDate() === 1)).toBe(
      true,
    );
    expect(week[3].getMonth()).toBe(11); // Wednesday in December
  });
});
