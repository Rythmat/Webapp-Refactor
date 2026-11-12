import {
  foldForSearch,
  type ProjectRow,
  type ProjectRowSections,
} from '@/daw/shell/projects/projectRows';
import type { StudioProjectSummary } from '@/lib/studio-projects/projectsClient';
import type {
  LibraryOrder,
  LibraryProject,
  LibrarySort,
} from './libraryLocalMeta';
import { projectKey } from './libraryProjects';
import {
  cloudVersion,
  sourceKey,
  timeOf,
  type LibrarySource,
} from './libraryTypes';

// ── The Library's sessions and projects, filtered and sorted ───────────────
// Pure. Sessions come from the Studio's Projects dialog's rows
// (projectRows.ts): the account's and the work on this device that isn't
// in it. A draft holding changes to a saved session isn't an item of its
// own: the saved one's item says so ('Edited on this device'). 'Found on
// this device' work belongs to nobody yet, so it stays in that dialog.
// Projects are the student's folders of sessions (libraryProjects.ts).

export interface LibraryItem {
  /** sourceKey(source). */
  key: string;
  source: LibrarySource;
  name: string;
  composer: string | null;
  createdAt: number;
  updatedAt: number;
  /** In the account. */
  saved: boolean;
  /** A saved session with changes on this device not saved yet. */
  editedOnDevice: boolean;
  bpm: number | null;
  trackCount: number | null;
  genre: string | null;
  status: string | null;
  /** What a cached render of it is keyed by. */
  version: string;
  canDelete: boolean;
  /** Open in the Studio right now, in this page. */
  isOpen: boolean;
}

export type LibraryTab = 'all' | 'projects' | 'sessions' | 'favorites';

/** Where a session is kept: Samply's Mine / Unsaved chips. */
export type LibraryWhere = 'any' | 'saved' | 'device';

export interface LibraryFilter {
  tab: LibraryTab;
  where: LibraryWhere;
  query: string;
  genre: string | null;
  status: string | null;
  favorites: readonly string[];
}

function fromCloud(
  row: ProjectRow,
  project: StudioProjectSummary,
): LibraryItem {
  const source: LibrarySource = { kind: 'cloud', projectId: project.id };
  return {
    key: sourceKey(source),
    source,
    name: row.name,
    composer: project.composerName?.trim() || null,
    createdAt: timeOf(project.createdAt),
    updatedAt: row.updatedAt,
    saved: true,
    editedOnDevice: row.tags.includes('changes-on-device'),
    bpm: typeof project.bpm === 'number' ? Math.round(project.bpm) : null,
    trackCount:
      typeof project.trackCount === 'number' ? project.trackCount : null,
    genre: project.libraryGenre ?? null,
    status: project.libraryStatus ?? null,
    version: cloudVersion(project),
    canDelete: !row.isOpen,
    isOpen: row.isOpen,
  };
}

function fromDraft(row: ProjectRow): LibraryItem | null {
  const meta = row.draft;
  if (!meta || !row.openIntent) return null;
  const source: LibrarySource = { kind: 'draft', draftId: meta.draftId };
  return {
    key: sourceKey(source),
    source,
    name: row.name,
    composer: null,
    createdAt: timeOf(meta.createdAt),
    updatedAt: row.updatedAt,
    saved: false,
    editedOnDevice: false,
    bpm: null,
    trackCount: typeof meta.trackCount === 'number' ? meta.trackCount : null,
    genre: null,
    status: null,
    version: `t${timeOf(meta.updatedAt)}`,
    canDelete: row.canDelete,
    isOpen: row.isOpen,
  };
}

/** The Library's items from the dialog's sections. */
export function toLibraryItems(sections: ProjectRowSections): LibraryItem[] {
  const items: LibraryItem[] = [];
  for (const row of sections.account) {
    if (row.cloud) items.push(fromCloud(row, row.cloud));
  }
  for (const row of sections.device) {
    // Changes to a saved project: its item says so.
    if (row.tags.includes('changes-on-device')) continue;
    const item = fromDraft(row);
    if (item) items.push(item);
  }
  return items;
}

/** A project in the Library's lists: its sessions there, in its order. */
export interface ProjectEntry {
  key: string;
  project: LibraryProject;
  /** The ones still in the Library (a deleted one drops out). */
  sessions: LibraryItem[];
  name: string;
  composer: null;
  createdAt: number;
  /** Its own change, or its newest session's, whichever is later. */
  updatedAt: number;
}

export function toProjectEntries(
  projects: readonly LibraryProject[],
  items: readonly LibraryItem[],
): ProjectEntry[] {
  const byKey = new Map(items.map((i) => [i.key, i]));
  return projects.map((project) => {
    const sessions = project.sessions
      .map((k) => byKey.get(k))
      .filter((i): i is LibraryItem => Boolean(i));
    return {
      key: projectKey(project.id),
      project,
      sessions,
      name: project.name,
      composer: null,
      createdAt: project.createdAt,
      updatedAt: Math.max(
        project.updatedAt,
        ...sessions.map((i) => i.updatedAt),
      ),
    };
  });
}

/** The sessions the search, the chips and the tab leave (a project's own
 *  page filters nothing). */
export function filterLibrary(
  items: readonly LibraryItem[],
  filter: Omit<LibraryFilter, 'tab'> & { tab?: LibraryTab },
): LibraryItem[] {
  const query = foldForSearch(filter.query.trim());
  const favorites = new Set(filter.favorites);
  return items.filter((item) => {
    if (filter.where === 'saved' && !item.saved) return false;
    if (filter.where === 'device' && item.saved) return false;
    if (filter.tab === 'favorites' && !favorites.has(item.key)) return false;
    if (filter.genre && item.genre !== filter.genre) return false;
    if (filter.status && item.status !== filter.status) return false;
    if (query) {
      const text = foldForSearch(`${item.name} ${item.composer ?? ''}`);
      if (!text.includes(query)) return false;
    }
    return true;
  });
}

/**
 * The projects the search and the tab leave: one whose name matches, or
 * holding a session that does. The session chips (saved, genre, status)
 * filter sessions only; with one on, a project shows while it holds a
 * session that passes.
 */
export function filterProjects(
  entries: readonly ProjectEntry[],
  filter: LibraryFilter,
): ProjectEntry[] {
  if (filter.tab === 'sessions') return [];
  const query = foldForSearch(filter.query.trim());
  const favorites = new Set(filter.favorites);
  const chips = filter.where !== 'any' || filter.genre || filter.status;
  return entries.filter((entry) => {
    if (filter.tab === 'favorites' && !favorites.has(entry.key)) return false;
    const passing = filterLibrary(entry.sessions, { ...filter, tab: 'all' });
    if (chips && passing.length === 0) return false;
    if (!query) return true;
    return foldForSearch(entry.name).includes(query) || passing.length > 0;
  });
}

/** What sorting needs of a session or a project. */
interface Sortable {
  key: string;
  name: string;
  composer: string | null;
  createdAt: number;
  updatedAt: number;
}

const byName = (a: Sortable, b: Sortable) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

/**
 * Sorted as asked. Name and composer read A–Z ('newest' first) or Z–A; the
 * times newest or oldest first. Never played sorts after every played one.
 * Ties fall back to the name, so the order never jumps. A project's last
 * play is its sessions' latest.
 */
export function sortLibrary<T extends Sortable>(
  items: readonly T[],
  sort: LibrarySort,
  order: LibraryOrder,
  played: Readonly<Record<string, number>>,
): T[] {
  const sign = order === 'newest' ? 1 : -1;
  const playedAt = (item: T): number => {
    const sessions = (item as Partial<ProjectEntry>).sessions;
    return sessions
      ? Math.max(0, ...sessions.map((s) => played[s.key] ?? 0))
      : (played[item.key] ?? 0);
  };
  const time = (item: T): number => {
    switch (sort) {
      case 'created':
        return item.createdAt;
      case 'played':
        return playedAt(item);
      default:
        return item.updatedAt;
    }
  };
  return [...items].sort((a, b) => {
    if (sort === 'name') return sign * byName(a, b);
    if (sort === 'composer') {
      // Without a composer, last either way.
      if (!a.composer !== !b.composer) return a.composer ? -1 : 1;
      const diff = (a.composer ?? '').localeCompare(
        b.composer ?? '',
        undefined,
        { sensitivity: 'base' },
      );
      return diff !== 0 ? sign * diff : byName(a, b);
    }
    if (sort === 'played' && !time(a) !== !time(b)) return time(a) ? -1 : 1;
    const diff = time(b) - time(a);
    return diff !== 0 ? sign * diff : byName(a, b);
  });
}

/** A card in Home's Library row: a project, or a session in none. */
export type HomeLibraryCard =
  | { kind: 'project'; key: string; entry: ProjectEntry }
  | { kind: 'session'; key: string; item: LibraryItem };

/**
 * Home's Library row (owner, 2026-11-11, Suno's New Albums): the student's
 * projects, last changed first, then their newest sessions that are in no
 * project, `limit` in all.
 */
export function homeLibraryCards(
  entries: readonly ProjectEntry[],
  items: readonly LibraryItem[],
  limit = 12,
): HomeLibraryCard[] {
  const filed = new Set(entries.flatMap((e) => e.project.sessions));
  const projects = sortLibrary(entries, 'modified', 'newest', {}).map(
    (entry): HomeLibraryCard => ({ kind: 'project', key: entry.key, entry }),
  );
  const sessions = sortLibrary(
    items.filter((i) => !filed.has(i.key)),
    'modified',
    'newest',
    {},
  ).map((item): HomeLibraryCard => ({ kind: 'session', key: item.key, item }));
  return [...projects, ...sessions].slice(0, limit);
}
