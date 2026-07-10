import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Keep the play history bounded so localStorage doesn't grow forever. */
const MAX_TRACKED = 60;

const todayKey = () => new Date().toISOString().slice(0, 10);

interface ArcadeActivityState {
  /** Unix ms of the most recent launch, per game route. */
  playedAt: Record<string, number>;
  /** Total launches, per game route. */
  playCount: Record<string, number>;
  /** Distinct `YYYY-MM-DD` days with at least one launch (for the streak). */
  activeDays: string[];
  /** Record a game launch (call from the hub when a game is opened). */
  recordPlay: (route: string) => void;
}

/**
 * Tracks Arcade game launches — powers the Arcade dashboard's "Jump back in"
 * row, the games-played stat, and the day-streak. Purely client-side (like the
 * viewed-songs store); a brand-new player simply reads as zeros / empty.
 */
export const useArcadeActivityStore = create<ArcadeActivityState>()(
  persist(
    (set) => ({
      playedAt: {},
      playCount: {},
      activeDays: [],
      recordPlay: (route) =>
        set((state) => {
          const playedAt = { ...state.playedAt, [route]: Date.now() };
          // Bound the recency map to the most-recent MAX_TRACKED games.
          const trimmed = Object.fromEntries(
            Object.entries(playedAt)
              .sort((a, b) => b[1] - a[1])
              .slice(0, MAX_TRACKED),
          );
          const day = todayKey();
          const activeDays = state.activeDays.includes(day)
            ? state.activeDays
            : [...state.activeDays, day].slice(-400);
          return {
            playedAt: trimmed,
            playCount: {
              ...state.playCount,
              [route]: (state.playCount[route] ?? 0) + 1,
            },
            activeDays,
          };
        }),
    }),
    { name: 'music-atlas-arcade-activity' },
  ),
);

/** Total number of game launches across all games. */
export const selectTotalPlays = (s: ArcadeActivityState): number =>
  Object.values(s.playCount).reduce((sum, n) => sum + n, 0);

/**
 * Current consecutive-day play streak. Counts back from today (or yesterday, so
 * the streak survives until the day is over) through unbroken days of activity.
 */
export const computeStreak = (activeDays: string[]): number => {
  if (activeDays.length === 0) return 0;
  const set = new Set(activeDays);
  const dayMs = 86_400_000;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  // Allow the streak to "hold" through today even before playing again.
  let cursor = set.has(todayKey()) ? start.getTime() : start.getTime() - dayMs;
  let streak = 0;
  while (set.has(new Date(cursor).toISOString().slice(0, 10))) {
    streak += 1;
    cursor -= dayMs;
  }
  return streak;
};
