import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AwardEarnedState {
  /** Unix ms of when each award id first became unlocked. */
  earnedAt: Record<string, number>;
  /** Stamp any of these award ids that aren't stamped yet (first-unlock time). */
  stamp: (ids: string[]) => void;
}

/**
 * Records when each award was first earned so "Recent Awards" can order by
 * recency (awards are otherwise derived from live stats with no timestamp).
 * Client-side (like the arcade-activity / streak stores). On first run for an
 * existing user, all already-unlocked awards are stamped at that moment.
 */
export const useAwardEarnedStore = create<AwardEarnedState>()(
  persist(
    (set) => ({
      earnedAt: {},
      stamp: (ids) =>
        set((state) => {
          let changed = false;
          const next = { ...state.earnedAt };
          for (const id of ids) {
            if (next[id] == null) {
              next[id] = Date.now();
              changed = true;
            }
          }
          return changed ? { earnedAt: next } : state;
        }),
    }),
    { name: 'music-atlas-awards-earned' },
  ),
);
