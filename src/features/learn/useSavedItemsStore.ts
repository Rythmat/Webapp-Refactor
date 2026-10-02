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

/** Guitar's key centers used to be a Technique tile, saved under this key. */
const LEGACY_GUITAR_TECHNIQUE_KEY =
  'technique:guitar:applied-theory-fundamentals';
/** They are now Theory → Ionian (Major), which is saved by its mode. */
const IONIAN_KEY = 'mode:ionian';

const SAVED_ITEMS_VERSION = 1;

/**
 * Bring stored saves up to date.
 * v0 → v1: a saved guitar Technique tile becomes a saved Ionian (Major), where
 * guitar's key centers now live. Everything else is kept as it was.
 */
export function migrateSavedItems(
  persisted: unknown,
  version: number,
): SavedItemsState {
  const state = (persisted ?? {}) as Partial<SavedItemsState>;
  const saved: Record<string, true> = { ...state.saved };
  if (version < 1 && saved[LEGACY_GUITAR_TECHNIQUE_KEY]) {
    delete saved[LEGACY_GUITAR_TECHNIQUE_KEY];
    saved[IONIAN_KEY] = true;
  }
  return { ...state, saved } as SavedItemsState;
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
      version: SAVED_ITEMS_VERSION,
      migrate: migrateSavedItems,
    },
  ),
);
