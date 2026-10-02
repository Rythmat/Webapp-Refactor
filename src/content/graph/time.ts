import { MUSICAL_ERAS } from '@/components/atlas/data/musicalEras';
import { CODE_OWNERS, type Edge, type EntityId } from './types';

/**
 * When a thing is from, as nodes the graph can walk: `year:1982`,
 * `decade:1980s`, and the era the year falls in.
 *
 * A song, a record, a label's founding and a studio's opening each state a
 * year (and globe events will). A year is a value, not a reference — no rename
 * can leave one dangling — so the graph turns it into an edge to its year node
 * (`from_year`), and every year in use walks up to its decade and its era, the
 * way a subgenre walks up to its genre. Standing on the 1980s then reaches
 * every year in it, and each year everything from it. A song's or a record's
 * era comes through its year.
 *
 * Which decade and which era a year is in are the calendar's and
 * `MUSICAL_ERAS`' to say, not any content item's, so those edges carry
 * `via.code`. This module is the calendar: it knows nothing about songs or
 * records, and stays pure like the rest of the graph.
 */

/** The years the id grammar can spell (`SLUG_PATTERN.year`). */
const FIRST_YEAR = 1;
const LAST_YEAR = 9999;

/** The most decades one span may touch; see `decadesBetween`. */
const MAX_DECADES = 30;

/** The `via.path` of a year's edge to its decade. */
export const YEAR_DECADE_PATH = 'decade';

/** The `via.path` of a year's edge to its era: the `MUSICAL_ERAS` range it is in. */
export const YEAR_ERA_PATH = 'era';

/**
 * The year a field states, or null when it states none.
 *
 * A number must be a whole year the grammar can spell, so a stray 1982.5 or 0
 * never becomes a node. A string must be a year written in four digits, alone
 * or starting a date ('1982-04-08'), the way ISO 8601 writes them — so '0590'
 * is the year 590. Anything else — blank, 'c. 1960', 'the eighties', or a
 * longer number such as '19820' that merely starts like a year — states no
 * year rather than a guessed one.
 */
export function yearOf(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= FIRST_YEAR && value <= LAST_YEAR
      ? value
      : null;
  }
  if (typeof value !== 'string') return null;
  const digits = /^(\d{4})(?=$|-)/.exec(value.trim());
  return digits ? yearOf(Number(digits[1])) : null;
}

/**
 * Whether a date written 'YYYY', 'YYYY-MM' or 'YYYY-MM-DD' names a real
 * month and day: 1939-02-30 does not. A pattern can hold a month to 01–12
 * and a day to 01–31 (the artist schema's `born.date` does), but only the
 * calendar knows how long each month is. A value that is not written that
 * way at all is not a calendar date either.
 */
export function isCalendarDate(date: string): boolean {
  const match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(date);
  if (!match) return false;
  const [year, month, day] = match
    .slice(1)
    .map((part) => (part === undefined ? undefined : Number(part)));
  if (month === undefined) return true;
  if (month < 1 || month > 12) return false;
  if (day === undefined) return true;
  // Day 0 of the next month is the last of this one; UTC, so no zone moves it.
  const last = new Date(Date.UTC(year!, month, 0)).getUTCDate();
  return day >= 1 && day <= last;
}

/**
 * The decade a year is in, as its slug: 1982 → '1980s', 590 → '590s'. Null
 * for a value that is not a year, and for the years 1–9, whose decade would
 * be '0s' — a name the grammar does not accept, for years nothing is from.
 */
export function decadeOf(year: number): string | null {
  const y = yearOf(year);
  if (y === null || y < 10) return null;
  return `${y - (y % 10)}s`;
}

/**
 * Every decade a span of years touches, both ends included: 1965 to 1982 is
 * the 1960s, 1970s and 1980s. For stated ranges such as an artist's years
 * active. A span longer than 30 decades — three centuries — touches none: it
 * is a mistyped year (1065 for 1965), and any 30 of its decades would be a
 * guess, as well as a hundred edges hung off one node. So does a span that
 * ends before it starts, or has an end that is not a year.
 */
export function decadesBetween(from: number, to: number): string[] {
  const start = yearOf(from);
  const end = yearOf(to);
  if (start === null || end === null || end < start) return [];
  const first = Math.max(start - (start % 10), 10);
  const last = end - (end % 10);
  if ((last - first) / 10 + 1 > MAX_DECADES) return [];
  const decades: string[] = [];
  for (let decade = first; decade <= last; decade += 10) {
    decades.push(`${decade}s`);
  }
  return decades;
}

/** The musical era a year falls in, or null outside every era. */
export function eraForYear(year: number | undefined): string | null {
  if (year === undefined || !Number.isFinite(year)) return null;
  return (
    MUSICAL_ERAS.find((e) => year >= e.yearStart && year <= e.yearEnd)?.id ??
    null
  );
}

/**
 * A year up to its decade and its era. Code states both — the calendar and
 * `MUSICAL_ERAS` — so each is filed under the year with `via.code`, like a
 * subgenre's parent, and no content item is ever held to them. Nothing for a
 * value that is not a year, and no era for a year before the first era
 * begins (500).
 */
export function edgesForYear(year: number): Edge[] {
  const y = yearOf(year);
  if (y === null) return [];
  const self: EntityId = `year:${y}`;
  const edges: Edge[] = [];
  const decade = decadeOf(y);
  if (decade) {
    edges.push({
      from: self,
      kind: 'in_decade',
      to: `decade:${decade}`,
      via: { item: self, path: YEAR_DECADE_PATH, code: CODE_OWNERS.calendar },
    });
  }
  const era = eraForYear(y);
  if (era) {
    edges.push({
      from: self,
      kind: 'from_era',
      to: `era:${era}`,
      via: { item: self, path: YEAR_ERA_PATH, code: CODE_OWNERS.eras },
    });
  }
  return edges;
}
