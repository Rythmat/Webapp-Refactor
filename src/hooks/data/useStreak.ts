import { useEffect, useMemo, useRef } from 'react';
import { useExperienceSummary } from '@/hooks/data/experience';
import { challengeEventBus } from '@/lib/challenges/eventBus';
import type { DailyExperienceSummary } from '@/lib/experience/types';
import { showSuccess } from '@/util/toast';

export interface StreakState {
  currentStreak: number;
  longest: number;
  freezeTokens: number;
  activeToday: boolean;
}

/**
 * The learning streak, derived from the XP timeline (`user_daily_experience`)
 * rather than stored separately.
 *
 * It used to live in its own Upstash Redis key behind `/api/streak`, written by
 * a client "learning ping". That was a second, unreconciled record of a fact the
 * database already had: the same three actions that counted toward the streak
 * (lesson activity, lesson completion, arcade round) each write a daily XP row.
 * Deriving removes the duplicate write path and the client/server disagreement
 * over what counted — there is now one source of truth.
 */

const DAY_MS = 86_400_000;

/**
 * A forgiving budget: the streak auto-bridges up to this many missed days so a
 * single slip never wipes weeks of progress (no punitive loss-aversion).
 */
export const FREEZE_BUDGET = 2;

const dayKey = (ms: number): string => new Date(ms).toISOString().slice(0, 10);
const todayKey = (): string => dayKey(Date.now());
/** UTC midnight today — matches the API, which stores `date` as a UTC date. */
const todayMs = (): number => Date.parse(todayKey());

/** Days the user did something that earned (or attempted to earn) XP. */
export function activeDaysFromTimeline(
  timeline: DailyExperienceSummary[] | undefined,
): string[] {
  return (timeline ?? [])
    .filter((d) => d.totalExperience > 0 || d.arcadeCompletions > 0)
    .map((d) => d.date.slice(0, 10));
}

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
    if (set.has(dayKey(cursor))) streak += 1;
    else remaining -= 1; // bridge a missed day with a freeze
    cursor -= DAY_MS;
  }
  return streak;
}

/** Longest consecutive run in the window (no freeze bridging). */
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

export function streakFromTimeline(
  timeline: DailyExperienceSummary[] | undefined,
): StreakState {
  const days = activeDaysFromTimeline(timeline);
  return {
    currentStreak: computeStreak(days),
    longest: longestStreak(days),
    freezeTokens: FREEZE_BUDGET,
    activeToday: days.includes(todayKey()),
  };
}

/**
 * The current user's learning streak. Shares the `['experienceSummary']` query
 * with the XP surfaces, so this adds no request of its own and refreshes
 * automatically whenever an XP award invalidates that key.
 */
export function useStreak(): { data: StreakState; isLoading: boolean } {
  const { data, isLoading } = useExperienceSummary();
  const state = useMemo(() => streakFromTimeline(data?.timeline), [data]);
  return { data: state, isLoading };
}

// A day counts toward the streak when a real learning action completes — not
// bare login (rewards learning, per the research + COPPA-gentle design). These
// are exactly the events fired alongside an XP award, so the daily row that
// backs the streak already exists by the time one arrives.
const QUALIFYING_EVENTS = new Set([
  'lesson_completed',
  'activity_completed',
  'arcade_streak',
]);

/**
 * Mount ONCE (in ClassroomDashboard). Shows a single gentle, gain-framed toast
 * the first time a qualifying learning action completes each day.
 *
 * This no longer records anything — the XP award already wrote the day, and its
 * mutation invalidates `['experienceSummary']`, which is what `useStreak` reads.
 */
export function useStreakPing() {
  const { data: streak } = useStreak();
  const pingedDay = useRef<string | null>(null);
  // Read the latest streak inside the subscription without resubscribing.
  const streakRef = useRef(streak);
  streakRef.current = streak;

  useEffect(() => {
    return challengeEventBus.subscribe((event) => {
      if (!QUALIFYING_EVENTS.has(event.kind)) return;
      const today = todayKey();
      if (pingedDay.current === today) return; // already celebrated today
      const current = streakRef.current;
      if (current.activeToday) return; // the day was already counted
      pingedDay.current = today;

      // The award that triggered this event adds today to the timeline; the
      // refetch it queued has not landed yet, so count it here.
      const next = current.currentStreak + 1;
      showSuccess(
        next > 1
          ? `${next}-day streak — keep it going!`
          : 'Streak started — nice work!',
      );
    });
  }, []);
}
