import { useCallback, useMemo } from 'react';
import * as store from './setListsStore';
import {
  useSetListsStorage,
  type SaveState,
  type SetListsStatus,
} from './storage/gameOptionsSetListsStore';
import type { SaveDestination, SetListsBlob } from './types';

/**
 * The set lists, and every edit the UI can make to them.
 *
 * Each action reads the document as it stands, applies one pure function from
 * setListsStore, and hands the result back to storage, which updates the cache
 * immediately and saves in the background. Screens never touch storage.
 */

export interface UseSetLists {
  blob: SetListsBlob;
  status: SetListsStatus;
  isSaving: boolean;
  isDirty: boolean;
  saveState: SaveState;
  tree: store.SetListTree[];
  flush: () => Promise<void>;
  actions: {
    createSetList: (title?: string, showId?: string) => string;
    renameSetList: (id: string, title: string) => void;
    deleteSetList: (id: string) => void;
    moveSetList: (id: string, toShowId: string) => void;
    createShow: (artistId: string, title?: string) => string;
    renameShow: (id: string, title: string) => void;
    createArtist: (title?: string) => string;
    renameArtist: (id: string, title: string) => void;
    addSong: (setListId: string, songId: string, atIndex?: number) => void;
    addText: (setListId: string, text?: string) => void;
    removeEntry: (setListId: string, entryId: string) => void;
    duplicateEntry: (setListId: string, entryId: string) => void;
    moveEntry: (setListId: string, from: number, to: number) => void;
    setEntryTranspose: (
      setListId: string,
      entryId: string,
      semitones: number,
    ) => void;
    setEntryNotes: (setListId: string, entryId: string, notes: string) => void;
    setEntryTitle: (setListId: string, entryId: string, title: string) => void;
    setEntryText: (setListId: string, entryId: string, text: string) => void;
    toggleFavorite: (songId: string) => void;
    saveVersionAs: (input: {
      songId: string;
      name?: string;
      semitones?: number;
      notes?: string;
      destination: SaveDestination;
    }) => { setListId: string; entryId: string };
  };
}

export function useSetLists(): UseSetLists {
  const { blob, status, isSaving, isDirty, saveState, save, flush } =
    useSetListsStorage();

  // `now` is read here, at the edge, so the store stays pure and testable.
  const edit = useCallback(
    <T>(
      run: (
        blob: SetListsBlob,
        now: number,
      ) => { blob: SetListsBlob; value: T },
    ): T => {
      const now = Date.now();
      const { blob: next, value } = run(store.ensureDefaults(blob, now), now);
      save(next);
      return value;
    },
    [blob, save],
  );

  const apply = useCallback(
    (run: (blob: SetListsBlob, now: number) => SetListsBlob) =>
      edit((current, now) => ({ blob: run(current, now), value: undefined })),
    [edit],
  );

  const actions = useMemo<UseSetLists['actions']>(
    () => ({
      createSetList: (title, showId) =>
        edit((b, now) => {
          const r = store.createSetList(b, { title, showId }, now);
          return { blob: r.blob, value: r.setListId };
        }),
      renameSetList: (id, title) =>
        apply((b, now) => store.renameSetList(b, id, title, now)),
      deleteSetList: (id) => apply((b, now) => store.deleteSetList(b, id, now)),
      moveSetList: (id, toShowId) =>
        apply((b, now) => store.moveSetList(b, id, toShowId, now)),
      createShow: (artistId, title) =>
        edit((b, now) => {
          const r = store.createShow(b, artistId, title, now);
          return { blob: r.blob, value: r.showId };
        }),
      renameShow: (id, title) =>
        apply((b, now) => store.renameShow(b, id, title, now)),
      createArtist: (title) =>
        edit((b, now) => {
          const r = store.createArtist(b, title, now);
          return { blob: r.blob, value: r.artistId };
        }),
      renameArtist: (id, title) =>
        apply((b, now) => store.renameArtist(b, id, title, now)),
      addSong: (setListId, songId, atIndex) =>
        apply(
          (b, now) =>
            store.addSongEntry(b, setListId, { songId }, atIndex, now).blob,
        ),
      addText: (setListId, text) =>
        apply(
          (b, now) =>
            store.addTextEntry(b, setListId, text, undefined, now).blob,
        ),
      removeEntry: (setListId, entryId) =>
        apply((b, now) => store.removeEntry(b, setListId, entryId, now)),
      duplicateEntry: (setListId, entryId) =>
        apply((b, now) => store.duplicateEntry(b, setListId, entryId, now)),
      moveEntry: (setListId, from, to) =>
        apply((b, now) => store.moveEntry(b, setListId, from, to, now)),
      setEntryTranspose: (setListId, entryId, semitones) =>
        apply((b, now) =>
          store.setEntryTranspose(b, setListId, entryId, semitones, now),
        ),
      setEntryNotes: (setListId, entryId, notes) =>
        apply((b, now) =>
          store.setEntryNotes(b, setListId, entryId, notes, now),
        ),
      setEntryTitle: (setListId, entryId, title) =>
        apply((b, now) =>
          store.setEntryTitle(b, setListId, entryId, title, now),
        ),
      setEntryText: (setListId, entryId, text) =>
        apply((b, now) => store.setEntryText(b, setListId, entryId, text, now)),
      toggleFavorite: (songId) =>
        apply((b, now) => store.toggleFavorite(b, songId, now)),
      saveVersionAs: (input) =>
        edit((b, now) => {
          const r = store.saveVersionAs(b, input, now);
          return {
            blob: r.blob,
            value: { setListId: r.setListId, entryId: r.entryId },
          };
        }),
    }),
    [apply, edit],
  );

  return {
    blob,
    status,
    isSaving,
    isDirty,
    saveState,
    tree: useMemo(() => store.listTree(blob), [blob]),
    flush,
    actions,
  };
}

/** The star on a song row or song page. */
export function useSetListFavorite(songId: string | undefined) {
  const { blob, status, actions } = useSetLists();
  return {
    isFavorite: songId ? store.isFavorite(blob, songId) : false,
    canFavorite: status !== 'signedOut' && !!songId,
    toggleFavorite: useCallback(() => {
      if (songId) actions.toggleFavorite(songId);
    }, [actions, songId]),
  };
}
