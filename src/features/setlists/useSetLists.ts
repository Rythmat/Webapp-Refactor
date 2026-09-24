import { useCallback, useMemo } from 'react';
import { getSong } from '@/curriculum/data/songs';
import * as store from './setListsStore';
import {
  useSetListsStorage,
  type SaveState,
  type SetListsStatus,
} from './storage/gameOptionsSetListsStore';
import type { SaveDestination, SetListsBlob, StoredChart } from './types';

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
    acceptChartUpdate: (
      setListId: string,
      entryId: string,
      fingerprint: string,
    ) => void;
    addProjectChart: (
      setListId: string,
      input: {
        projectId?: string;
        title: string;
        chart: StoredChart;
        semitones?: number;
        notes?: string;
      },
    ) => string;
    replaceProjectChart: (
      setListId: string,
      entryId: string,
      chart: StoredChart,
      title?: string,
    ) => void;
    unlinkProject: (projectId: string) => void;
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

/** The published chart's fingerprint right now, if the song is loaded. */
const fingerprintOf = (songId: string): string | undefined => {
  const song = getSong(songId);
  return song ? store.chartFingerprint(song) : undefined;
};

/**
 * Whether the published chart has been corrected since this entry was added.
 * The set always plays the current chart — this only tells the player that it
 * is not the one they last looked at.
 */
export function chartChangedSince(entry: {
  songId: string;
  chartFingerprint?: string;
}): string | null {
  if (!entry.chartFingerprint) return null;
  const now = fingerprintOf(entry.songId);
  return now && now !== entry.chartFingerprint ? now : null;
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
            store.addSongEntry(
              b,
              setListId,
              { songId, chartFingerprint: fingerprintOf(songId) },
              atIndex,
              now,
            ).blob,
        ),
      acceptChartUpdate: (setListId, entryId, fingerprint) =>
        apply((b, now) =>
          store.acceptChartUpdate(b, setListId, entryId, fingerprint, now),
        ),
      addProjectChart: (setListId, input) =>
        edit((b, now) => {
          const r = store.addProjectEntry(b, setListId, input, undefined, now);
          return { blob: r.blob, value: r.entryId };
        }),
      replaceProjectChart: (setListId, entryId, chart, title) =>
        apply((b, now) =>
          store.replaceProjectChart(b, setListId, entryId, chart, title, now),
        ),
      unlinkProject: (projectId) =>
        apply((b, now) => store.unlinkProject(b, projectId, now)),
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
          const r = store.saveVersionAs(
            b,
            { ...input, chartFingerprint: fingerprintOf(input.songId) },
            now,
          );
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

/**
 * The sets that carry a page printed from this Studio project, and the two
 * things the Studio can do about them: push this chart into them, or cut the
 * link when the project is gone. The pages themselves are never touched by
 * either — that is the promise.
 */
export function useProjectSetListEntries(projectId: string | undefined) {
  const { blob, status, actions, flush } = useSetLists();
  const carrying = useMemo(
    () => (projectId ? store.projectEntries(blob, projectId) : []),
    [blob, projectId],
  );
  return {
    carrying,
    canSend: status !== 'signedOut',
    /** True when at least one set's page is older than this chart. */
    staleFor: useCallback(
      (chart: { key: string; sections: StoredChart['sections'] }) => {
        const now = store.chartFingerprint(chart);
        return carrying.filter(
          (c) => store.chartFingerprint(c.entry.chart) !== now,
        );
      },
      [carrying],
    ),
    actions,
    flush,
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
