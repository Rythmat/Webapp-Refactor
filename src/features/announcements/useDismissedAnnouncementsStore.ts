import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Cap persisted entries so localStorage can't grow unbounded. */
const MAX = 300;

interface DismissedAnnouncementsState {
  /** announcement id → unix ms when dismissed. */
  dismissedAt: Record<string, number>;
  isDismissed: (id: string) => boolean;
  dismiss: (id: string) => void;
}

/**
 * Per-user "dismissed" set for Home announcements (client-side, like the
 * arcade-activity / awards-earned stores). Keyed by the announcement's stable
 * source-prefixed id so a dismissal persists across reloads and refetches.
 */
export const useDismissedAnnouncementsStore =
  create<DismissedAnnouncementsState>()(
    persist(
      (set, get) => ({
        dismissedAt: {},
        isDismissed: (id) => get().dismissedAt[id] != null,
        dismiss: (id) =>
          set((state) => {
            if (state.dismissedAt[id] != null) return state;
            const next = { ...state.dismissedAt, [id]: Date.now() };
            const entries = Object.entries(next);
            if (entries.length > MAX) {
              entries.sort((a, b) => b[1] - a[1]);
              return { dismissedAt: Object.fromEntries(entries.slice(0, MAX)) };
            }
            return { dismissedAt: next };
          }),
      }),
      { name: 'music-atlas-dismissed-announcements' },
    ),
  );
