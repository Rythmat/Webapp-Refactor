import {
  getWeekDays,
  resolveInitialWeek,
} from '@/features/classroom/annual/calendarMath';
import { toIsoDate } from '@/features/classroom/annual/schoolCalendar';

// ── The Planner's week (owner, 2026-11-09) ─────────────────────────────────
// A school week reads Monday first, weekend last; the week lives in the URL
// as its Sunday (`?week=YYYY-MM-DD`) so a link opens the same week.

export interface PlannerDay {
  iso: string;
  date: Date;
  weekend: boolean;
}

/** The week's Sunday from `?week=`, or this school week's. */
export const weekFromParam = (value: string | null, today: Date): Date => {
  const m = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return resolveInitialWeek(today);
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(date.getTime())
    ? resolveInitialWeek(today)
    : getWeekDays(date)[0];
};

/**
 * Monday to Sunday from the week that holds `anchor`: that week's Monday
 * to Saturday, then the Sunday after (the calendar's weeks start Sunday).
 */
export const plannerDays = (anchor: Date): PlannerDay[] => {
  const [sun, ...rest] = getWeekDays(anchor);
  const nextSunday = new Date(sun);
  nextSunday.setDate(sun.getDate() + 7);
  return [...rest, nextSunday].map((date) => ({
    iso: toIsoDate(date),
    date,
    weekend: date.getDay() === 0 || date.getDay() === 6,
  }));
};

/** "Nov 9 – 15, 2026" for Monday to Sunday. */
export const plannerLabel = (days: readonly PlannerDay[]): string => {
  const a = days[0].date;
  const b = days[days.length - 1].date;
  const month = (d: Date) => d.toLocaleDateString('en-US', { month: 'short' });
  return a.getMonth() === b.getMonth()
    ? `${month(a)} ${a.getDate()} – ${b.getDate()}, ${b.getFullYear()}`
    : `${month(a)} ${a.getDate()} – ${month(b)} ${b.getDate()}, ${b.getFullYear()}`;
};
