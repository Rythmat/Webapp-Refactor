import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SavedItemKind = 'mode' | 'technique' | 'course';
type SavedKey = `${SavedItemKind}:${string}`;

interface SavedItemsState {
  saved: Record<SavedKey, true>;
  isSaved: (kind: SavedItemKind, id: string) => boolean;
  toggleSaved: (kind: SavedItemKind, id: string) => void;
  setSaved: (kind: SavedItemKind, id: string, value: boolean) => void;
}

export const useSavedItemsStore = create<SavedItemsState>()(
  persist(
    (set, get) => ({
      saved: {},

      isSaved: (kind, id) => Boolean(get().saved[`${kind}:${id}`]),

      toggleSaved: (kind, id) =>
        set((state) => {
          const key = `${kind}:${id}` as SavedKey;
          const next = { ...state.saved };
          if (next[key]) {
            delete next[key];
          } else {
            next[key] = true;
          }
          return { saved: next };
        }),

      setSaved: (kind, id, value) =>
        set((state) => {
          const key = `${kind}:${id}` as SavedKey;
          const next = { ...state.saved };
          if (value) {
            next[key] = true;
          } else {
            delete next[key];
          }
          return { saved: next };
        }),
    }),
    {
      name: 'music-atlas-saved-learn-items',
    },
  ),
);
