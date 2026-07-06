import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SavedSongsState {
  savedIds: Record<string, true>;
  /** Unix ms timestamp of the most recent save toggle for each id. Legacy IDs
      without a stored timestamp fall back to 0 at read time. */
  savedAt: Record<string, number>;
  isSaved: (songId: string) => boolean;
  toggleSaved: (songId: string) => void;
  setSaved: (songId: string, saved: boolean) => void;
}

export const useSavedSongsStore = create<SavedSongsState>()(
  persist(
    (set, get) => ({
      savedIds: {},
      savedAt: {},

      isSaved: (songId) => Boolean(get().savedIds[songId]),

      toggleSaved: (songId) =>
        set((state) => {
          const nextIds = { ...state.savedIds };
          const nextAt = { ...state.savedAt };
          if (nextIds[songId]) {
            delete nextIds[songId];
            delete nextAt[songId];
          } else {
            nextIds[songId] = true;
            nextAt[songId] = Date.now();
          }
          return { savedIds: nextIds, savedAt: nextAt };
        }),

      setSaved: (songId, saved) =>
        set((state) => {
          const nextIds = { ...state.savedIds };
          const nextAt = { ...state.savedAt };
          if (saved) {
            nextIds[songId] = true;
            nextAt[songId] = Date.now();
          } else {
            delete nextIds[songId];
            delete nextAt[songId];
          }
          return { savedIds: nextIds, savedAt: nextAt };
        }),
    }),
    {
      name: 'music-atlas-saved-songs',
    },
  ),
);
