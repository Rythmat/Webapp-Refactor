import { describe, expect, it } from 'vitest';
import { MUSICAL_ERAS } from '@/components/atlas/data/musicalEras';
import { eraForYear as eraForYearFromGraph } from '../deriveGraph';
import {
  decadeOf,
  decadesBetween,
  edgesForYear,
  eraForYear,
  isCalendarDate,
  YEAR_DECADE_PATH,
  YEAR_ERA_PATH,
  yearOf,
} from '../time';
import { CODE_OWNERS, isValidEdge, isWellFormed } from '../types';

/**
 * The calendar the graph dates things by. A year is the one date content
 * states; its decade and era are derived here, so these pin what counts as a
 * year, how decades are named, and that every edge the calendar makes is one
 * the graph accepts.
 */

describe('reading a year', () => {
  it('takes a whole year the grammar can spell', () => {
    expect(yearOf(1982)).toBe(1982);
    expect(yearOf(590)).toBe(590);
    expect(yearOf(1)).toBe(1);
    expect(yearOf(9999)).toBe(9999);
  });

  it('refuses a number that is not one', () => {
    for (const value of [0, -5, 10_000, 1982.5, Number.NaN, Infinity]) {
      expect(yearOf(value), String(value)).toBeNull();
    }
  });

  it('reads a year written in four digits, alone or starting a date', () => {
    expect(yearOf('1982')).toBe(1982);
    expect(yearOf('1982-04-08')).toBe(1982);
    expect(yearOf(' 1977 ')).toBe(1977);
    // ISO 8601 pads an early year to four digits.
    expect(yearOf('0590')).toBe(590);
    expect(yearOf('0590-06-01')).toBe(590);
  });

  it('guesses nothing from text that is not a year', () => {
    for (const value of ['', '82', '590', 'c. 1960', 'the eighties', '0000']) {
      expect(yearOf(value), value).toBeNull();
    }
    // A longer number, or a year run into text, only starts like one.
    for (const value of ['19820', '12345', '1982abc', '1982.5', '1982s']) {
      expect(yearOf(value), value).toBeNull();
    }
    expect(yearOf(undefined)).toBeNull();
    expect(yearOf(null)).toBeNull();
    expect(yearOf({ year: 1982 })).toBeNull();
  });
});

describe('a calendar date', () => {
  it('names a month and a day the month has', () => {
    for (const date of ['1939', '1939-04', '1939-04-02', '1944-02-29'])
      expect(isCalendarDate(date), date).toBe(true);
    for (const date of [
      '1939-02-30',
      '1939-02-29',
      '1939-13',
      '1939-00',
      '1939-04-31',
      '1939-04-00',
      '1939-4-2',
      ' 1939',
      '39',
    ])
      expect(isCalendarDate(date), date).toBe(false);
  });
});

describe('decades', () => {
  it('names a decade by its first year', () => {
    expect(decadeOf(1980)).toBe('1980s');
    expect(decadeOf(1982)).toBe('1980s');
    expect(decadeOf(1989)).toBe('1980s');
    expect(decadeOf(590)).toBe('590s');
    expect(decadeOf(15)).toBe('10s');
  });

  it('has none for the years 1–9, or for what is not a year', () => {
    expect(decadeOf(9)).toBeNull();
    expect(decadeOf(0)).toBeNull();
    expect(decadeOf(1982.5)).toBeNull();
  });

  it('lists every decade a span touches, both ends included', () => {
    expect(decadesBetween(1965, 1982)).toEqual(['1960s', '1970s', '1980s']);
    expect(decadesBetween(1982, 1982)).toEqual(['1980s']);
    expect(decadesBetween(1979, 1980)).toEqual(['1970s', '1980s']);
    // The nameless first decade is skipped, not named '0s'.
    expect(decadesBetween(5, 25)).toEqual(['10s', '20s']);
  });

  it('touches none for a backwards or broken span', () => {
    expect(decadesBetween(1990, 1980)).toEqual([]);
    expect(decadesBetween(1965, Number.NaN)).toEqual([]);
    expect(decadesBetween(0, 1982)).toEqual([]);
  });

  it('touches none past thirty decades, where a year was mistyped', () => {
    // 1065 for 1965: no thirty of its ninety-three decades would be right.
    expect(decadesBetween(1065, 1982)).toEqual([]);
    expect(decadesBetween(1000, 2020)).toEqual([]);
    const span = decadesBetween(1700, 1999);
    expect(span).toHaveLength(30);
    expect(span[0]).toBe('1700s');
    expect(span[span.length - 1]).toBe('1990s');
    expect(decadesBetween(1700, 2000)).toEqual([]);
  });
});

describe('eras', () => {
  it('buckets a year into its era, boundaries included', () => {
    expect(eraForYear(1979)).toBe('postwar');
    expect(eraForYear(1980)).toBe('electronic-hiphop');
    expect(eraForYear(2026)).toBe('global-digital');
    expect(eraForYear(300)).toBeNull();
    expect(eraForYear(undefined)).toBeNull();
    for (const era of MUSICAL_ERAS) {
      expect(eraForYear(era.yearStart), era.id).toBe(era.id);
      expect(eraForYear(era.yearEnd), era.id).toBe(era.id);
    }
  });

  it('is still the one deriveGraph exports', () => {
    expect(eraForYearFromGraph).toBe(eraForYear);
  });
});

describe('a year in the graph', () => {
  it('sits in its decade and its era, both stated by code', () => {
    expect(edgesForYear(1982)).toEqual([
      {
        from: 'year:1982',
        kind: 'in_decade',
        to: 'decade:1980s',
        via: {
          item: 'year:1982',
          path: YEAR_DECADE_PATH,
          code: CODE_OWNERS.calendar,
        },
      },
      {
        from: 'year:1982',
        kind: 'from_era',
        to: 'era:electronic-hiphop',
        via: { item: 'year:1982', path: YEAR_ERA_PATH, code: CODE_OWNERS.eras },
      },
    ]);
  });

  it('has a decade but no era before the first era begins', () => {
    expect(edgesForYear(300).map((e) => `${e.kind} ${e.to}`)).toEqual([
      'in_decade decade:300s',
    ]);
  });

  it('has nothing for a value that is not a year, or one with no decade', () => {
    expect(edgesForYear(0)).toEqual([]);
    expect(edgesForYear(1982.5)).toEqual([]);
    expect(edgesForYear(5)).toEqual([]);
  });

  it('only ever makes edges the graph accepts', () => {
    const refused: string[] = [];
    for (let year = 1; year <= 2100; year++) {
      if (!isWellFormed(`year:${year}`)) refused.push(`year:${year}`);
      for (const edge of edgesForYear(year)) {
        if (!isValidEdge(edge) || !isWellFormed(edge.to)) {
          refused.push(`${edge.from} ${edge.kind} ${edge.to}`);
        }
      }
    }
    expect(refused).toEqual([]);
  });
});
