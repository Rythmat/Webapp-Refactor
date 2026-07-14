import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SeenChallengesState {
  /**
   * challenge id → first-seen unix ms. A value of `0` means "seeded" (the
   * challenge already existed the first time we ran, so it is never treated as
   * brand-new — this avoids a wall of "new challenge" notices at feature launch
   * or on a fresh device).
   */
  firstSeenAt: Record<string, number>;
  initialized: boolean;
  /**
   * Observe the currently-active challenge ids. On the very first run every id
   * is seeded (never "new"); afterwards any unseen id is stamped with the
   * current time so the adapter can surface it as a new-challenge announcement.
   */
  observe: (ids: string[]) => void;
}

export const useSeenChallengesStore = create<SeenChallengesState>()(
  persist(
    (set) => ({
      firstSeenAt: {},
      initialized: false,
      observe: (ids) =>
        set((state) => {
          const seeded = !state.initialized;
          let changed = !state.initialized;
          const next = { ...state.firstSeenAt };
          for (const id of ids) {
            if (next[id] == null) {
              next[id] = seeded ? 0 : Date.now();
              changed = true;
            }
          }
          return changed ? { firstSeenAt: next, initialized: true } : state;
        }),
    }),
    { name: 'music-atlas-seen-challenges' },
  ),
);
