import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SavedSongsState {
  savedIds: Record<string, true>;
  isSaved: (songId: string) => boolean;
  toggleSaved: (songId: string) => void;
  setSaved: (songId: string, saved: boolean) => void;
}

export const useSavedSongsStore = create<SavedSongsState>()(
  persist(
    (set, get) => ({
      savedIds: {},

      isSaved: (songId) => Boolean(get().savedIds[songId]),

      toggleSaved: (songId) =>
        set((state) => {
          const next = { ...state.savedIds };
          if (next[songId]) {
            delete next[songId];
          } else {
            next[songId] = true;
          }
          return { savedIds: next };
        }),

      setSaved: (songId, saved) =>
        set((state) => {
          const next = { ...state.savedIds };
          if (saved) {
            next[songId] = true;
          } else {
            delete next[songId];
          }
          return { savedIds: next };
        }),
    }),
    {
      name: 'music-atlas-saved-songs',
    },
  ),
);
