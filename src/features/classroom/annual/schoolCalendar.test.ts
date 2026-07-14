import { describe, expect, it } from 'vitest';
import {
  EMPTY_EXCEPTIONS,
  fromIsoDate,
  getDefaultNonSchoolDaysForYear,
  getNonSchoolDatesForSchoolYear,
  isSchoolDay,
  toIsoDate,
} from './schoolCalendar';

describe('toIsoDate / fromIsoDate', () => {
  it('serialises local Y/M/D without timezone drift', () => {
    // Aug 1 midnight local should serialise to "2025-08-01" everywhere.
    expect(toIsoDate(new Date(2025, 7, 1))).toBe('2025-08-01');
    expect(toIsoDate(new Date(2025, 11, 31))).toBe('2025-12-31');
  });

  it('round-trips a date', () => {
    const d = fromIsoDate('2025-09-15');
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(15);
  });
});

describe('getDefaultNonSchoolDaysForYear', () => {
  it('places Labor Day 2025 on the first Monday of September', () => {
    const days = getDefaultNonSchoolDaysForYear(2025);
    const labor = days.find((d) => d.label === 'Labor Day');
    expect(labor?.date).toBe('2025-09-01');
  });

  it('places MLK Day 2026 on the third Monday of January', () => {
    const days = getDefaultNonSchoolDaysForYear(2026);
    const mlk = days.find((d) => d.label === 'MLK Jr. Day');
    expect(mlk?.date).toBe('2026-01-19');
  });

  it('places Thanksgiving 2025 on the fourth Thursday of November', () => {
    const days = getDefaultNonSchoolDaysForYear(2025);
    const thx = days.find((d) => d.label === 'Thanksgiving');
    expect(thx?.date).toBe('2025-11-27');
  });

  it('includes Thanksgiving break Wed–Fri', () => {
    const days = getDefaultNonSchoolDaysForYear(2025);
    const wed = days.find((d) => d.date === '2025-11-26' && d.kind === 'break');
    const fri = days.find((d) => d.date === '2025-11-28' && d.kind === 'break');
    expect(wed).toBeDefined();
    expect(fri).toBeDefined();
  });

  it('places Winter break Dec 22 – Dec 31 + Jan 2', () => {
    const days = getDefaultNonSchoolDaysForYear(2025);
    for (let d = 22; d <= 31; d++) {
      const iso = `2025-12-${String(d).padStart(2, '0')}`;
      expect(
        days.find((x) => x.date === iso && x.kind === 'break'),
      ).toBeDefined();
    }
    expect(
      days.find((x) => x.date === '2025-01-02' && x.kind === 'break'),
    ).toBeDefined();
  });

  it('places Spring break Mon–Fri of the 2nd week of March', () => {
    // March 2026: Mar 1 is Sunday; first Monday is Mar 2; 2nd is Mar 9.
    const days = getDefaultNonSchoolDaysForYear(2026);
    const springs = days
      .filter((d) => d.label === 'Spring break')
      .map((d) => d.date)
      .sort();
    expect(springs).toEqual([
      '2026-03-09',
      '2026-03-10',
      '2026-03-11',
      '2026-03-12',
      '2026-03-13',
    ]);
  });
});

describe('getNonSchoolDatesForSchoolYear', () => {
  const sy = { autumn: 2025, spring: 2026 };

  it('marks Saturdays and Sundays as weekend', () => {
    const map = getNonSchoolDatesForSchoolYear(sy, EMPTY_EXCEPTIONS);
    // Aug 2, 2025 = Saturday. Aug 3 = Sunday.
    expect(map.get('2025-08-02')?.kind).toBe('weekend');
    expect(map.get('2025-08-03')?.kind).toBe('weekend');
  });

  it('marks Labor Day and MLK Day as federal', () => {
    const map = getNonSchoolDatesForSchoolYear(sy, EMPTY_EXCEPTIONS);
    expect(map.get('2025-09-01')?.kind).toBe('federal');
    expect(map.get('2026-01-19')?.kind).toBe('federal');
  });

  it('honors removals for non-weekend defaults', () => {
    const map = getNonSchoolDatesForSchoolYear(sy, {
      additions: [],
      removals: ['2026-02-16'], // Presidents' Day 2026
    });
    expect(map.has('2026-02-16')).toBe(false);
  });

  it('does NOT allow removing a weekend', () => {
    const map = getNonSchoolDatesForSchoolYear(sy, {
      additions: [],
      removals: ['2025-08-02'], // a Saturday
    });
    expect(map.get('2025-08-02')?.kind).toBe('weekend');
  });

  it('adds custom entries and overrides existing labels', () => {
    const map = getNonSchoolDatesForSchoolYear(sy, {
      additions: [
        { date: '2025-11-03', label: 'Teacher work day', kind: 'custom' },
      ],
      removals: [],
    });
    expect(map.get('2025-11-03')).toEqual({
      date: '2025-11-03',
      label: 'Teacher work day',
      kind: 'custom',
    });
  });
});

describe('isSchoolDay', () => {
  const sy = { autumn: 2025, spring: 2026 };
  const map = getNonSchoolDatesForSchoolYear(sy, EMPTY_EXCEPTIONS);

  it('returns false on a Saturday', () => {
    expect(isSchoolDay(new Date(2025, 7, 2), map)).toBe(false);
  });

  it('returns false on Labor Day', () => {
    expect(isSchoolDay(new Date(2025, 8, 1), map)).toBe(false);
  });

  it('returns true on a random Tuesday', () => {
    expect(isSchoolDay(new Date(2025, 8, 16), map)).toBe(true);
  });
});
