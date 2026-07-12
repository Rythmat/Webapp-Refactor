import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Keep the view history bounded so localStorage doesn't grow forever. */
const MAX_VIEWED = 50;

interface ViewedSongsState {
  /** Unix ms timestamp of the most recent time each song's detail page opened. */
  viewedAt: Record<string, number>;
  /** Stamp a song as just-viewed (call when its detail page opens). */
  recordView: (songId: string) => void;
}

/**
 * Tracks songs the user has *looked at* (opened the detail page for), saved or
 * not — powers the Learn hub's "Continue" bar. Distinct from the saved-songs
 * store, which only holds explicit favorites.
 */
export const useViewedSongsStore = create<ViewedSongsState>()(
  persist(
    (set) => ({
      viewedAt: {},
      recordView: (songId) =>
        set((state) => {
          const merged = { ...state.viewedAt, [songId]: Date.now() };
          const trimmed = Object.fromEntries(
            Object.entries(merged)
              .sort((a, b) => b[1] - a[1])
              .slice(0, MAX_VIEWED),
          );
          return { viewedAt: trimmed };
        }),
    }),
    { name: 'music-atlas-viewed-songs' },
  ),
);
