/**
 * Set Lists — a performer's own organisation of the song library.
 *
 * Artist/Band → Show/Concert → Set List, and a set list holds an ordered list
 * of entries. An entry is either a song (referenced by id, so corrections to
 * the published chart flow through, and carrying its own key and notes for
 * this set) or a page of text the player wrote between songs.
 *
 * The whole tree is one JSON document per user. Nothing here knows how it is
 * stored — see storage/gameOptionsSetListsStore.ts.
 */

import type { SongMode, SongSection } from '@/curriculum/types/songLibrary';

export const SETLIST_SCHEMA_VERSION = 2;

/** The two lists every user starts with. Identified by role, never by title,
 *  so renaming "My Lead Sheets" cannot break them. */
export type SetListRole = 'inbox' | 'favorites';

interface EntryBase {
  id: string;
  createdAt: number;
}

export interface SetListSongEntry extends EntryBase {
  kind: 'song';
  songId: string;
  /**
   * A fingerprint of the published chart when this was added to the set.
   *
   * The entry does NOT hold a copy of the chords: a correction to a chart
   * reaches every set that plays it, which is the point. This is only so the
   * set can SAY that a chart has changed since the player last looked — the
   * thing that matters when you rehearsed from it last week.
   */
  chartFingerprint?: string;
  /** What the player called this version; falls back to the song's title. */
  title?: string;
  /** Semitones from the published key, -11..11. 0 is as written. */
  semitones: number;
  notes?: string;
}

/**
 * A lead sheet sent over from a Studio project.
 *
 * Unlike a library song, this entry OWNS its chart. A Studio project belongs
 * to the player and can be deleted or rewritten at any time; the set must
 * survive that, so sending a chart to a set list copies it — the way you would
 * put a printed page on the stand. `projectId` is kept only so the Studio can
 * offer to push a later edit into the sets that carry it, and so the set can
 * offer to open the project; nothing breaks when the project is gone.
 */
export interface SetListProjectEntry extends EntryBase {
  kind: 'project';
  /** The project this was copied from, if it still exists. */
  projectId?: string;
  title: string;
  /** The chart itself, in the song library's shape so it renders and
   *  transposes like any other chart. */
  chart: StoredChart;
  /** Semitones from the chart as copied, -11..11. */
  semitones: number;
  notes?: string;
  /** When the copy was taken, so the Studio can say what it would replace. */
  copiedAt: number;
}

/** A chart that lives in the set list itself, shaped like a library song. */
export interface StoredChart {
  title: string;
  artist?: string;
  key: string;
  keyRoot: number;
  mode: SongMode;
  tempo: number;
  timeSignature: [number, number];
  sections: SongSection[];
}

export interface SetListTextEntry extends EntryBase {
  kind: 'text';
  text: string;
}

export type SetListEntry =
  | SetListSongEntry
  | SetListProjectEntry
  | SetListTextEntry;

export interface SetList {
  id: string;
  title: string;
  /** The order IS the set order. A song may appear more than once. */
  entries: SetListEntry[];
  /**
   * Where this set is filed, once it has been dragged somewhere. Filing is an
   * annotation, not a move: every set list stays in the flat list, and this
   * only says where else it shows up. Unset means it is not filed at all.
   */
  parent?: SetListParent;
  role?: SetListRole;
  createdAt: number;
  updatedAt: number;
}

/** A set list can be filed under a band, or under one of its shows. */
export type SetListParent =
  | { kind: 'artist'; id: string }
  | { kind: 'show'; id: string };

export interface Show {
  id: string;
  /**
   * The band this show belongs to, if any. A show can stand on its own — a
   * one-off, a festival, a depping gig — and once it is under a band it stays
   * there: a show is not moved between bands, it is duplicated.
   */
  artistId?: string;
  title: string;
  date?: string;
  venue?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Artist {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface SetListsBlob {
  schemaVersion: number;
  updatedAt: number;
  artists: Record<string, Artist>;
  shows: Record<string, Show>;
  setLists: Record<string, SetList>;
  /**
   * One flat order per kind; the entities above say how they nest. A set list
   * appears in `setLists` whether or not it is filed, because the flat list is
   * the whole library and the hierarchy is a second way to look at it.
   */
  order: {
    artists: string[];
    shows: string[];
    setLists: string[];
  };
}

/** Where a saved version should be filed. */
export type SaveDestination =
  | { kind: 'existing'; setListId: string }
  | { kind: 'new'; title: string };

export const DEFAULT_ARTIST_TITLE = 'New Band';
export const DEFAULT_SHOW_TITLE = 'New Show';
/** The master list of what a player performs — a repertoire, not a set. */
export const INBOX_TITLE = 'My Lead Sheets';
/** A subset of the repertoire, shown as a filter within it rather than as a
 *  list of its own. */
export const FAVORITES_TITLE = 'My Favorites';

/** Caps, so one user's document cannot grow unbounded. */
export const LIMITS = {
  title: 120,
  notes: 280,
  text: 4000,
  entriesPerList: 300,
  /** A printed Studio chart lives in the document, so it has a ceiling. */
  chartBars: 400,
  lists: 300,
  artists: 100,
  shows: 300,
} as const;
