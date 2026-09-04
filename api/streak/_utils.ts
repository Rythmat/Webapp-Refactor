// ── Shared helpers for the Learning-Streak API ───────────────────────────
// A per-user "learning day" set persisted in Upstash Redis, mirroring
// api/connections/* + api/bio/*. Auth (Auth0 `sub` == app user id) + the Redis
// client are reused from ../collab/_utils. A "streak day" is any day the user
// completed a learning action (lesson / activity / arcade round).

import type { Redis } from '@upstash/redis';

export { getRedis, verifyAuthToken } from '../collab/_utils.js';

const STREAK_PREFIX = 'streak:';
export const streakKey = (userId: string): string =>
  `${STREAK_PREFIX}${userId}`;

const DAY_MS = 86_400_000;
const MAX_DAYS = 400;
// A forgiving budget: the streak auto-bridges up to this many missed days so a
// single slip never wipes weeks of progress (no punitive loss-aversion).
export const FREEZE_BUDGET = 2;

/** Stored per user. Day boundaries are UTC (per-timezone is a later refinement). */
export interface StreakRecord {
  activeDays: string[]; // 'YYYY-MM-DD'
}

export interface StreakState {
  currentStreak: number;
  longest: number;
  freezeTokens: number;
  activeToday: boolean;
}

const dayKey = (ms: number): string => new Date(ms).toISOString().slice(0, 10);
const todayKey = (): string => dayKey(Date.now());
const todayMs = (): number => Date.parse(todayKey()); // UTC midnight today

/**
 * Current consecutive-day streak counting back from today (or yesterday, so it
 * survives until the day is over), auto-bridging up to `budget` missed days.
 */
export function computeStreak(
  activeDays: string[],
  budget = FREEZE_BUDGET,
): number {
  if (activeDays.length === 0) return 0;
  const set = new Set(activeDays);
  const today = todayMs();
  let cursor: number;
  if (set.has(dayKey(today))) cursor = today;
  else if (set.has(dayKey(today - DAY_MS))) cursor = today - DAY_MS;
  else return 0; // missed today AND yesterday → streak is broken

  let remaining = budget;
  let streak = 0;
  // Walk backwards day by day: count active days, spending freeze budget to
  // bridge gaps. Stop once the day is inactive and no freeze budget remains.
  while (set.has(dayKey(cursor)) || remaining > 0) {
    if (set.has(dayKey(cursor))) {
      streak += 1;
    } else {
      remaining -= 1; // bridge a missed day with a freeze
    }
    cursor -= DAY_MS;
  }
  return streak;
}

/** Longest consecutive run ever (no freeze bridging). */
export function longestStreak(activeDays: string[]): number {
  const sorted = [...new Set(activeDays)].sort();
  if (sorted.length === 0) return 0;
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (Date.parse(sorted[i]) - Date.parse(sorted[i - 1]) === DAY_MS) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }
  return best;
}

export function toState(rec: StreakRecord): StreakState {
  return {
    currentStreak: computeStreak(rec.activeDays),
    longest: longestStreak(rec.activeDays),
    freezeTokens: FREEZE_BUDGET,
    activeToday: rec.activeDays.includes(todayKey()),
  };
}

export async function getRecord(
  redis: Redis,
  userId: string,
): Promise<StreakRecord> {
  const rec = await redis.get<StreakRecord>(streakKey(userId));
  return rec ?? { activeDays: [] };
}

/** Idempotent: marks today as a learning day (only writes on the first call). */
export async function recordActiveDay(
  redis: Redis,
  userId: string,
): Promise<StreakRecord> {
  const rec = await getRecord(redis, userId);
  const today = todayKey();
  if (!rec.activeDays.includes(today)) {
    rec.activeDays = [...rec.activeDays, today].slice(-MAX_DAYS);
    await redis.set(streakKey(userId), rec);
  }
  return rec;
}
