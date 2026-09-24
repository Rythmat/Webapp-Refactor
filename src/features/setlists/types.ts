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

export const SETLIST_SCHEMA_VERSION = 1;

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
  /** What the player called this version; falls back to the song's title. */
  title?: string;
  /** Semitones from the published key, -11..11. 0 is as written. */
  semitones: number;
  notes?: string;
}

export interface SetListTextEntry extends EntryBase {
  kind: 'text';
  text: string;
}

export type SetListEntry = SetListSongEntry | SetListTextEntry;

export interface SetList {
  id: string;
  showId: string;
  title: string;
  /** The order IS the set order. A song may appear more than once. */
  entries: SetListEntry[];
  role?: SetListRole;
  createdAt: number;
  updatedAt: number;
}

export interface Show {
  id: string;
  artistId: string;
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
  /** The tree holds only ids; the entities live in the maps above. */
  order: {
    artists: string[];
    showsByArtist: Record<string, string[]>;
    setListsByShow: Record<string, string[]>;
  };
}

/** Where a saved version should be filed. */
export type SaveDestination =
  | { kind: 'existing'; setListId: string }
  | { kind: 'new'; title: string };

export const DEFAULT_ARTIST_TITLE = 'My Music';
export const DEFAULT_SHOW_TITLE = 'Unfiled';
export const INBOX_TITLE = 'My Lead Sheets';
export const FAVORITES_TITLE = 'My Favorites';

/** Caps, so one user's document cannot grow unbounded. */
export const LIMITS = {
  title: 120,
  notes: 280,
  text: 4000,
  entriesPerList: 300,
  lists: 300,
} as const;
