import type { CortexRecords } from '@/features/cortex/ledger';
import type { DailyExperienceSummary } from '@/lib/experience/types';

// ── This week, for the dashboard ───────────────────────────────────────────
// Days practised against the student's own target, XP and lessons finished,
// Monday to Sunday. A weekly target, not a daily streak to lose (Codecademy;
// Mobbin's study of 859 streak designs): missing a day costs nothing here.

export interface WeekStats {
  /** Days this week with any practice. */
  daysActive: number;
  /** Which, as dates. */
  activeDates: readonly string[];
  xp: number;
  /** Learn activities finished this week. */
  finished: number;
}

const LEARN_KINDS = /^(theory|lesson|audio|technique|anatomy|literacy):/;

const pad = (n: number) => String(n).padStart(2, '0');

/** A local calendar date: "2026-11-04". */
export const dateKey = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** This week's dates, Monday first. */
export function weekDates(nowMs: number): string[] {
  const now = new Date(nowMs);
  const sinceMonday = (now.getDay() + 6) % 7;
  const monday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - sinceMonday,
  );
  return Array.from({ length: 7 }, (_, i) =>
    dateKey(
      new Date(
        monday.getFullYear(),
        monday.getMonth(),
        monday.getDate() + i,
      ).getTime(),
    ),
  );
}

export function weekStats(
  timeline: readonly DailyExperienceSummary[] | undefined,
  records: CortexRecords,
  nowMs: number,
): WeekStats {
  const week = new Set(weekDates(nowMs));
  const active = new Set<string>();
  let xp = 0;
  for (const day of timeline ?? []) {
    const key = day.date.slice(0, 10);
    if (!week.has(key)) continue;
    xp += day.totalExperience;
    if (day.totalExperience > 0) active.add(key);
  }
  let finished = 0;
  for (const [id, [, last, done]] of Object.entries(records)) {
    // 1 is backfill's "no date".
    if (last > 1 && week.has(dateKey(last * 60_000))) {
      active.add(dateKey(last * 60_000));
    }
    if (done > 1 && week.has(dateKey(done * 60_000))) {
      active.add(dateKey(done * 60_000));
      if (LEARN_KINDS.test(id)) finished += 1;
    }
  }
  return {
    daysActive: active.size,
    activeDates: [...active].sort(),
    xp,
    finished,
  };
}
