import { useSyncExternalStore } from 'react';
import {
  getLocalStoreUserKey,
  onLocalStoreUserChange,
  type UserKey,
} from '@/lib/local-store/userScope';

// ── What the Library keeps on this device ──────────────────────────────────
// Per user, in localStorage: the student's projects (folders of sessions),
// the favourites, when each session was last played (Samply's "Last
// accessed"), and how they left the page (sort, layout). The account has
// no place for any of it yet (a request with the API team), so it stays on
// this device. Never session data: a project holds sessions by their keys.

export type LibrarySort =
  | 'name'
  | 'composer'
  | 'created'
  | 'modified'
  | 'played';
export type LibraryOrder = 'newest' | 'oldest';
export type LibraryLayout = 'grid' | 'list';

/** A project: a folder of sessions, in the student's order. */
export interface LibraryProject {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  /** Its sessions' source keys (libraryTypes.sourceKey). A session is in
   *  one project at most. */
  sessions: string[];
  /** The image the student chose (projectCovers.ts); none: its sessions'
   *  covers. */
  cover?: string | null;
}

export interface LibraryLocalMeta {
  projects: LibraryProject[];
  /** Favourites: sessions by source key, projects by projectKey(id). */
  favorites: string[];
  /** When each was last played or opened (ms), by source key. */
  played: Record<string, number>;
  sort: LibrarySort;
  order: LibraryOrder;
  layout: LibraryLayout;
}

const EMPTY: LibraryLocalMeta = {
  projects: [],
  favorites: [],
  played: {},
  sort: 'modified',
  order: 'newest',
  layout: 'grid',
};

const storageKey = (userKey: UserKey) => `musicAtlas:library:${userKey}`;

const SORTS: readonly LibrarySort[] = [
  'name',
  'composer',
  'created',
  'modified',
  'played',
];

function isProject(value: unknown): value is LibraryProject {
  const p = value as LibraryProject | null;
  return (
    !!p &&
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    typeof p.createdAt === 'number' &&
    typeof p.updatedAt === 'number' &&
    Array.isArray(p.sessions) &&
    p.sessions.every((k) => typeof k === 'string') &&
    (p.cover === undefined || p.cover === null || typeof p.cover === 'string')
  );
}

function read(userKey: UserKey | null): LibraryLocalMeta {
  if (userKey === null) return EMPTY;
  try {
    const raw = localStorage.getItem(storageKey(userKey));
    if (!raw) return EMPTY;
    const value = JSON.parse(raw) as Partial<LibraryLocalMeta>;
    return {
      projects: Array.isArray(value.projects)
        ? value.projects.filter(isProject)
        : [],
      favorites: Array.isArray(value.favorites)
        ? value.favorites.filter((v) => typeof v === 'string')
        : [],
      played:
        value.played && typeof value.played === 'object' ? value.played : {},
      sort: SORTS.includes(value.sort as LibrarySort)
        ? (value.sort as LibrarySort)
        : EMPTY.sort,
      order: value.order === 'oldest' ? 'oldest' : 'newest',
      layout: value.layout === 'list' ? 'list' : 'grid',
    };
  } catch {
    return EMPTY;
  }
}

let cached: { userKey: UserKey | null; meta: LibraryLocalMeta } | null = null;
const listeners = new Set<() => void>();

function current(): LibraryLocalMeta {
  const userKey = getLocalStoreUserKey();
  if (!cached || cached.userKey !== userKey) {
    cached = { userKey, meta: read(userKey) };
  }
  return cached.meta;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const off = onLocalStoreUserChange(() => listener());
  return () => {
    listeners.delete(listener);
    off();
  };
}

/** Change this user's Library meta; nothing is kept while auth is unknown. */
export function updateLibraryMeta(
  change: (meta: LibraryLocalMeta) => Partial<LibraryLocalMeta>,
): void {
  const userKey = getLocalStoreUserKey();
  if (userKey === null) return;
  const before = current();
  const meta = { ...before, ...change(before) };
  cached = { userKey, meta };
  try {
    localStorage.setItem(storageKey(userKey), JSON.stringify(meta));
  } catch {
    // Storage full or blocked: the change holds for this page.
  }
  listeners.forEach((fn) => fn());
}

export function toggleFavorite(key: string): void {
  updateLibraryMeta(({ favorites }) => ({
    favorites: favorites.includes(key)
      ? favorites.filter((k) => k !== key)
      : [...favorites, key],
  }));
}

export function markPlayed(key: string, at = Date.now()): void {
  updateLibraryMeta(({ played }) => ({ played: { ...played, [key]: at } }));
}

export function useLibraryMeta(): LibraryLocalMeta {
  return useSyncExternalStore(subscribe, current, () => EMPTY);
}

/** Tests: forget the page's copy. */
export function resetLibraryMetaForTests(): void {
  cached = null;
}
