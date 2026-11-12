import { describe, expect, it } from 'vitest';
import type { ProjectRow } from '@/daw/shell/projects/projectRows';
import type { DraftMeta } from '@/lib/studio-projects/drafts/types';
import type { StudioProjectSummary } from '@/lib/studio-projects/projectsClient';
import {
  filterLibrary,
  filterProjects,
  homeLibraryCards,
  sortLibrary,
  toLibraryItems,
  toProjectEntries,
  type LibraryFilter,
  type LibraryItem,
} from '../libraryItems';
import type { LibraryProject } from '../libraryLocalMeta';
import {
  cloudVersion,
  sourceOfStudioHref,
  studioHrefOf,
} from '../libraryTypes';
import { previewKey } from '../preview/previewCache';

const item = (
  partial: Partial<LibraryItem> & { key: string },
): LibraryItem => ({
  source: { kind: 'cloud', projectId: partial.key },
  name: partial.key,
  composer: null,
  createdAt: 0,
  updatedAt: 0,
  saved: true,
  editedOnDevice: false,
  bpm: null,
  trackCount: null,
  genre: null,
  status: null,
  version: 'r1',
  canDelete: true,
  isOpen: false,
  ...partial,
});

const cloud = (id: string, extra: Partial<StudioProjectSummary> = {}) =>
  ({
    id,
    name: `Song ${id}`,
    composerName: 'Ada',
    bpm: 92.4,
    createdAt: new Date(1000),
    updatedAt: new Date(2000),
    revision: 7,
    trackCount: 4,
    libraryGenre: 'funk',
    libraryStatus: 'idea',
    libraryInstruments: [],
    collaborators: [],
    ...extra,
  }) as StudioProjectSummary;

const row = (partial: Partial<ProjectRow> & { key: string }): ProjectRow => ({
  section: 'account',
  name: 'Untitled Project',
  subtitle: '',
  updatedAt: 0,
  sizeChars: null,
  draft: null,
  cloud: null,
  tags: [],
  isOpen: false,
  canOpen: true,
  canDelete: false,
  openIntent: null,
  openSavedIntent: null,
  ...partial,
});

describe('toLibraryItems', () => {
  it('keeps the account’s projects and unsaved work, one item each', () => {
    const draftMeta = {
      draftId: 'd1',
      createdAt: 500,
      updatedAt: 900,
      trackCount: 2,
    } as DraftMeta;
    const items = toLibraryItems({
      account: [
        row({
          key: 'cloud:p1',
          name: 'Song p1',
          updatedAt: 2000,
          cloud: cloud('p1'),
          tags: ['changes-on-device'],
        }),
      ],
      device: [
        // Changes to p1: said on p1's item, not an item of its own.
        row({
          key: 'draft:d0',
          section: 'device',
          tags: ['changes-on-device'],
          draft: { ...draftMeta, draftId: 'd0' },
          openIntent: { kind: 'draft', draftId: 'd0' },
        }),
        row({
          key: 'draft:d1',
          section: 'device',
          name: 'Sketch',
          updatedAt: 900,
          draft: draftMeta,
          canDelete: true,
          openIntent: { kind: 'draft', draftId: 'd1' },
        }),
      ],
      found: [],
    });
    expect(items.map((i) => i.key)).toEqual(['cloud:p1', 'draft:d1']);
    expect(items[0]).toMatchObject({
      saved: true,
      editedOnDevice: true,
      composer: 'Ada',
      bpm: 92,
      genre: 'funk',
      status: 'idea',
      version: 'r7',
    });
    expect(items[1]).toMatchObject({
      saved: false,
      name: 'Sketch',
      version: 't900',
      canDelete: true,
    });
  });
});

describe('filterLibrary', () => {
  const items = [
    item({ key: 'a', name: 'Café Groove', composer: 'Ada', genre: 'funk' }),
    item({ key: 'b', name: 'Night', saved: false, status: 'idea' }),
    item({ key: 'c', name: 'Blue', composer: 'Bo' }),
  ];
  const base = {
    tab: 'all' as const,
    where: 'any' as const,
    query: '',
    genre: null,
    status: null,
    favorites: [] as string[],
  };
  const keys = (list: LibraryItem[]) => list.map((i) => i.key);

  it('filters by where it is kept, and to the favourites', () => {
    expect(keys(filterLibrary(items, { ...base, where: 'saved' }))).toEqual([
      'a',
      'c',
    ]);
    expect(keys(filterLibrary(items, { ...base, where: 'device' }))).toEqual([
      'b',
    ]);
    expect(
      keys(
        filterLibrary(items, { ...base, tab: 'favorites', favorites: ['c'] }),
      ),
    ).toEqual(['c']);
  });

  it('searches names and composers without case or accents', () => {
    expect(keys(filterLibrary(items, { ...base, query: 'cafe' }))).toEqual([
      'a',
    ]);
    expect(keys(filterLibrary(items, { ...base, query: 'BO' }))).toEqual(['c']);
  });

  it('filters by genre and status', () => {
    expect(keys(filterLibrary(items, { ...base, genre: 'funk' }))).toEqual([
      'a',
    ]);
    expect(keys(filterLibrary(items, { ...base, status: 'idea' }))).toEqual([
      'b',
    ]);
  });
});

describe('sortLibrary', () => {
  const items = [
    item({
      key: 'a',
      name: 'beta',
      composer: 'Zed',
      createdAt: 1,
      updatedAt: 30,
    }),
    item({ key: 'b', name: 'Alpha', createdAt: 3, updatedAt: 10 }),
    item({
      key: 'c',
      name: 'gamma',
      composer: 'Amy',
      createdAt: 2,
      updatedAt: 20,
    }),
  ];
  const keys = (list: LibraryItem[]) => list.map((i) => i.key);

  it('sorts names A–Z, or Z–A', () => {
    expect(keys(sortLibrary(items, 'name', 'newest', {}))).toEqual([
      'b',
      'a',
      'c',
    ]);
    expect(keys(sortLibrary(items, 'name', 'oldest', {}))).toEqual([
      'c',
      'a',
      'b',
    ]);
  });

  it('sorts times newest first, or oldest', () => {
    expect(keys(sortLibrary(items, 'modified', 'newest', {}))).toEqual([
      'a',
      'c',
      'b',
    ]);
    expect(keys(sortLibrary(items, 'created', 'oldest', {}))).toEqual([
      'a',
      'c',
      'b',
    ]);
  });

  it('puts projects without a composer, or never played, last either way', () => {
    expect(keys(sortLibrary(items, 'composer', 'newest', {}))).toEqual([
      'c',
      'a',
      'b',
    ]);
    expect(keys(sortLibrary(items, 'composer', 'oldest', {}))).toEqual([
      'a',
      'c',
      'b',
    ]);
    const played = { c: 5, b: 9 };
    expect(keys(sortLibrary(items, 'played', 'newest', played))).toEqual([
      'b',
      'c',
      'a',
    ]);
    expect(keys(sortLibrary(items, 'played', 'oldest', played))).toEqual([
      'c',
      'b',
      'a',
    ]);
  });
});

describe('links', () => {
  it('reads the project a Studio link opens', () => {
    const saved = { kind: 'cloud' as const, projectId: 'p 9' };
    expect(sourceOfStudioHref(studioHrefOf(saved))).toEqual(saved);
    expect(sourceOfStudioHref('/studio?draft=d1')).toEqual({
      kind: 'draft',
      draftId: 'd1',
    });
    expect(sourceOfStudioHref('/studio')).toBeNull();
    expect(sourceOfStudioHref('/learn/x?y=1')).toBeNull();
  });

  it('versions a cloud project by revision, else by its last write', () => {
    expect(cloudVersion({ revision: 3, updatedAt: new Date(5) })).toBe('r3');
    expect(cloudVersion({ updatedAt: '1970-01-01T00:00:00.005Z' })).toBe('t5');
  });

  it('opens a session in the Studio: a saved one by its id, a draft by its', () => {
    expect(studioHrefOf({ kind: 'cloud', projectId: 'p9' })).toBe(
      '/studio?project=p9',
    );
    expect(studioHrefOf({ kind: 'draft', draftId: 'd 1' })).toBe(
      '/studio?draft=d%201',
    );
  });

  it('keys a kept render by user, session and version', () => {
    expect(previewKey('u1', 'cloud:p', 'r3')).toBe('u1|cloud:p|r3|mix');
  });
});

describe('projects: folders of sessions', () => {
  const items = [
    item({ key: 'a', name: 'Intro', updatedAt: 50 }),
    item({ key: 'b', name: 'Night Drive', updatedAt: 10, genre: 'funk' }),
    item({ key: 'c', name: 'Blue', updatedAt: 5, saved: false }),
  ];
  const project = (p: Partial<LibraryProject> & { id: string }) =>
    ({
      name: p.id,
      createdAt: 1,
      updatedAt: 2,
      sessions: [],
      ...p,
    }) as LibraryProject;
  const base = {
    tab: 'all' as const,
    where: 'any' as const,
    query: '',
    genre: null,
    status: null,
    favorites: [] as string[],
  };

  it('holds its sessions in its order, dropping any no longer there', () => {
    const [entry] = toProjectEntries(
      [project({ id: 'p', sessions: ['b', 'gone', 'a'] })],
      items,
    );
    expect(entry.key).toBe('folder:p');
    expect(entry.sessions.map((i) => i.key)).toEqual(['b', 'a']);
    // Its newest session's change counts as its own.
    expect(entry.updatedAt).toBe(50);
  });

  it('matches a search by its name or by a session in it', () => {
    const entries = toProjectEntries(
      [
        project({ id: 'p1', name: 'Album', sessions: ['b'] }),
        project({ id: 'p2', name: 'Demos', sessions: ['c'] }),
      ],
      items,
    );
    const names = (q: string) =>
      filterProjects(entries, { ...base, query: q }).map((e) => e.name);
    expect(names('album')).toEqual(['Album']);
    expect(names('drive')).toEqual(['Album']);
    expect(names('')).toEqual(['Album', 'Demos']);
  });

  it('shows with a chip on only while it holds a session that passes', () => {
    const entries = toProjectEntries(
      [
        project({ id: 'p1', name: 'Album', sessions: ['b'] }),
        project({ id: 'p2', name: 'Demos', sessions: ['c'] }),
      ],
      items,
    );
    const names = (f: Partial<LibraryFilter>) =>
      filterProjects(entries, { ...base, ...f }).map((e) => e.name);
    expect(names({ where: 'device' })).toEqual(['Demos']);
    expect(names({ genre: 'funk' })).toEqual(['Album']);
  });

  it('isn’t listed on the Sessions tab; on Favorites only when starred', () => {
    const entries = toProjectEntries([project({ id: 'p1' })], items);
    expect(filterProjects(entries, { ...base, tab: 'sessions' })).toEqual([]);
    expect(filterProjects(entries, { ...base, tab: 'favorites' })).toEqual([]);
    expect(
      filterProjects(entries, {
        ...base,
        tab: 'favorites',
        favorites: ['folder:p1'],
      }),
    ).toHaveLength(1);
  });

  it('sorts by its sessions’ last play', () => {
    const entries = toProjectEntries(
      [
        project({ id: 'p1', name: 'One', sessions: ['a'] }),
        project({ id: 'p2', name: 'Two', sessions: ['b', 'c'] }),
      ],
      items,
    );
    const sorted = sortLibrary(entries, 'played', 'newest', { c: 9, a: 3 });
    expect(sorted.map((e) => e.name)).toEqual(['Two', 'One']);
  });
});

describe('Home’s Library row', () => {
  it('shows projects (last changed first), then sessions in none, newest first', () => {
    const items = [
      item({ key: 'a', updatedAt: 50 }),
      item({ key: 'b', updatedAt: 40 }),
      item({ key: 'c', updatedAt: 30 }),
      item({ key: 'd', updatedAt: 60 }),
    ];
    const mk = (id: string, sessions: string[], updatedAt: number) =>
      ({ id, name: id, createdAt: 1, updatedAt, sessions }) as LibraryProject;
    const entries = toProjectEntries(
      [mk('old', ['c'], 1), mk('new', ['b'], 2)],
      items,
    );
    // 'old' holds c (30) and 'new' holds b (40): a project is as new as its
    // newest session.
    expect(homeLibraryCards(entries, items).map((c) => c.key)).toEqual([
      'folder:new',
      'folder:old',
      'd',
      'a',
    ]);
    expect(homeLibraryCards(entries, items, 3)).toHaveLength(3);
  });
});
