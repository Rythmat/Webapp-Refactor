import { describe, expect, it, vi } from 'vitest';
import {
  buildGraph,
  type GraphSnapshot,
  matchSnapshotEvents,
} from '@/content/graph/deriveGraph';
import type { Song } from '@/curriculum/types/songLibrary';
import type { ContentKind } from '@/hooks/data/admin/useAdminContent';
import type { ExportRow } from '@/hooks/data/admin/useContentExport';
import {
  mergeSnapshot,
  type MergeRules,
  WORKING_CONTENT_KINDS,
  workingItems,
} from '../workingSnapshot';

/**
 * The working copy's merge (decision 15): the API wins per id, an
 * authoritative kind drops the repo's copy, a proposal shows as pending, and
 * an archived item leaves the graph but not the Table.
 *
 * The merge is pure like the graph it feeds (it may move into a worker with
 * the build), so this file refuses React and the store the way the graph's
 * purity test does: loading either would throw.
 */

// Hoisted with the mocks, which run before anything else in this file.
const { forbid } = vi.hoisted(() => ({
  forbid: (what: string) => () => {
    throw new Error(`the working snapshot loaded ${what}`);
  },
}));
vi.mock('react', forbid('React'));
vi.mock('react/jsx-runtime', forbid('React'));
vi.mock('@tanstack/react-query', forbid('react-query'));
vi.mock('@/content/contentStore', forbid('the content store'));
vi.mock('@/components/atlas/data/artists', forbid('the globe artist index'));

const song = (id: string, title: string, extra = {}) =>
  ({
    id,
    title,
    artist: 'Toto',
    year: 1982,
    key: 'B',
    mode: 'major',
    genreTags: ['rock'],
    ...extra,
  }) as unknown as Song;

const REPO: GraphSnapshot = {
  songs: [song('africa', 'Africa'), song('rosanna', 'Rosanna')],
  artists: [
    { slug: 'toto', name: 'Toto' },
    { slug: 'the-nobodies', name: 'The Nobodies' },
  ],
  places: [
    { id: 'detroit', name: 'Detroit' },
    { id: 'memphis', name: 'Memphis' },
  ] as unknown as GraphSnapshot['places'],
  progressions: [
    { id: 12, progression: 'I–V–vi–IV', songIds: [], vibes: [], styles: [] },
  ] as unknown as GraphSnapshot['progressions'],
  events: [
    { id: 'evt-live-aid', title: 'Live Aid' },
    { id: 'song-africa', title: 'Africa' },
  ],
  pathways: [{ id: 'pop-80s', title: 'Pop in the 80s', eventIds: [] }],
};

const row = (
  slug: string,
  body: Record<string, unknown> | null,
  extra: Partial<ExportRow> = {},
): ExportRow => ({
  id: `db-${slug}`,
  slug,
  status: 'published',
  editState: null,
  updatedAt: new Date('2026-09-29T00:00:00Z'),
  body,
  ...extra,
});

const exportOf = (
  entries: [ContentKind, ExportRow[]][],
): ReadonlyMap<ContentKind, readonly ExportRow[]> => new Map(entries);

const rules = (...authoritative: ContentKind[]): MergeRules => ({
  isAuthoritative: (kind) => authoritative.includes(kind),
});

describe('mergeSnapshot', () => {
  it('lets the API win per id and adds what only the API has', () => {
    const { snapshot } = mergeSnapshot(
      REPO,
      exportOf([
        [
          'song',
          [
            row('africa', { ...song('africa', 'Africa (edited)') }),
            row('hold_the_line', { ...song('hold_the_line', 'Hold the Line') }),
          ],
        ],
      ]),
      rules(),
    );
    expect(snapshot.songs?.map((s) => s.title)).toEqual([
      'Africa (edited)',
      'Rosanna',
      'Hold the Line',
    ]);
  });

  it('drops the repo copy of an authoritative kind', () => {
    const { snapshot } = mergeSnapshot(
      REPO,
      exportOf([['artist', [row('toto', { slug: 'toto', name: 'TOTO' })]]]),
      rules('artist'),
    );
    // The Nobodies were deleted in the store; they must not come back.
    expect(snapshot.artists).toEqual([{ slug: 'toto', name: 'TOTO' }]);
  });

  it('keeps the repo copy where the kind was not exported, authoritative or not', () => {
    const { snapshot } = mergeSnapshot(REPO, exportOf([]), rules('artist'));
    expect(snapshot.artists).toBe(REPO.artists);
    expect(snapshot.songs).toBe(REPO.songs);
  });

  it('merges an authoritative kind that is empty in the store as empty', () => {
    const { snapshot } = mergeSnapshot(
      REPO,
      exportOf([['globe_city', []]]),
      rules('globe_city'),
    );
    expect(snapshot.places).toEqual([]);
  });

  it('matches a progression by its number as the export spells it', () => {
    const { snapshot } = mergeSnapshot(
      REPO,
      exportOf([
        [
          'chord_progression',
          [row('12', { id: 12, progression: 'I–V–vi–IV (edited)' })],
        ],
      ]),
      rules(),
    );
    expect(snapshot.progressions).toEqual([
      { id: 12, progression: 'I–V–vi–IV (edited)' },
    ]);
  });

  it('marks each API item with its state, a proposal outranking it', () => {
    const { snapshot } = mergeSnapshot(
      REPO,
      exportOf([
        [
          'song',
          [
            row('africa', { ...song('africa', 'Africa') }),
            row(
              'rosanna',
              { ...song('rosanna', 'Rosanna') },
              {
                editState: 'pending',
                pendingBody: { ...song('rosanna', 'Rosanna (proposed)') },
              },
            ),
          ],
        ],
        [
          'globe_city',
          [
            row(
              'detroit',
              { id: 'detroit', name: 'Detroit' },
              { status: 'draft' },
            ),
          ],
        ],
      ]),
      rules(),
    );
    expect(Object.fromEntries(snapshot.statuses ?? [])).toEqual({
      'song:africa': 'published',
      'song:rosanna': 'pending',
      'place:detroit': 'draft',
    });
    // An admin's graph draws the stored body; the proposal waits for review.
    expect(snapshot.songs?.map((s) => s.title)).toEqual(['Africa', 'Rosanna']);
  });

  it('draws a new item that exists only as a proposal', () => {
    const { snapshot, items } = mergeSnapshot(
      REPO,
      exportOf([
        [
          'artist',
          [
            row('jeff-porcaro', null, {
              status: 'draft',
              editState: 'pending',
              pendingBody: { slug: 'jeff-porcaro', name: 'Jeff Porcaro' },
            }),
          ],
        ],
      ]),
      rules(),
    );
    expect(snapshot.artists?.map((a) => a.slug)).toEqual([
      'toto',
      'the-nobodies',
      'jeff-porcaro',
    ]);
    expect(snapshot.statuses?.get('artist:jeff-porcaro')).toBe('pending');
    expect(items.get('artist:jeff-porcaro')?.id).toBe('db-jeff-porcaro');
  });

  it('leaves an archived item out of the graph, repo copy too, but keeps it for the Table', () => {
    const { snapshot, items } = mergeSnapshot(
      REPO,
      exportOf([
        [
          'song',
          [
            row(
              'rosanna',
              { ...song('rosanna', 'Rosanna') },
              { status: 'archived' },
            ),
          ],
        ],
      ]),
      rules(),
    );
    expect(snapshot.songs?.map((s) => s.id)).toEqual(['africa']);
    expect(snapshot.statuses?.has('song:rosanna')).toBe(false);
    expect(items.get('song:rosanna')).toMatchObject({
      status: 'archived',
      contentKind: 'song',
    });
  });

  it('keeps the repo copy for a row that came without a body', () => {
    // The `/items` fallback: the API holds it, but there is nothing to draw.
    const { snapshot, items } = mergeSnapshot(
      REPO,
      exportOf([
        ['artist', [row('toto', null, { title: 'Toto' })]],
        ['song', [row('africa', null, { title: 'Africa' })]],
      ]),
      rules('artist'),
    );
    expect(snapshot.artists).toEqual([{ slug: 'toto', name: 'Toto' }]);
    expect(snapshot.songs).toEqual(REPO.songs);
    expect(snapshot.statuses?.size).toBe(0);
    expect(items.get('artist:toto')?.title).toBe('Toto');
  });

  it('fills in an identity a partial body lacks', () => {
    const { snapshot } = mergeSnapshot(
      REPO,
      exportOf([['artist', [row('toto', { name: 'Toto' })]]]),
      rules(),
    );
    expect(snapshot.artists?.[0]).toEqual({ name: 'Toto', slug: 'toto' });
  });

  it("gives a song's globe event neither the song's status nor its item", () => {
    const { snapshot, items } = mergeSnapshot(
      REPO,
      exportOf([
        [
          'globe_event',
          [
            row('song-africa', { id: 'song-africa', title: 'Africa' }),
            row(
              'evt-live-aid',
              { id: 'evt-live-aid', title: 'Live Aid' },
              { editState: 'pending' },
            ),
          ],
        ],
      ]),
      rules(),
    );
    expect(snapshot.statuses?.has('song:africa')).toBe(false);
    expect(items.has('song:africa')).toBe(false);
    expect(snapshot.statuses?.get('event:evt-live-aid')).toBe('pending');
    expect(items.get('event:evt-live-aid')?.contentKind).toBe('globe_event');
    // Both events are still in the list, for the graph to fold.
    expect(snapshot.events?.map((e) => e.id)).toEqual([
      'evt-live-aid',
      'song-africa',
    ]);
  });

  it('passes the rest of the snapshot through', () => {
    const { snapshot } = mergeSnapshot(REPO, exportOf([['song', []]]), rules());
    expect(snapshot.pathways).toBe(REPO.pathways);
    expect(snapshot.events).toBe(REPO.events);
  });

  it('carries what is not a list: the instrument table and the year', () => {
    const repo: GraphSnapshot = {
      ...REPO,
      instrumentGenres: { piano: ['genre:jazz'] },
      asOfYear: 2026,
    };
    const { snapshot } = mergeSnapshot(
      repo,
      exportOf([['song', [row('africa', { id: 'africa', title: 'Africa' })]]]),
      rules(),
    );
    expect(snapshot.instrumentGenres).toBe(repo.instrumentGenres);
    expect(snapshot.asOfYear).toBe(2026);
  });

  it("takes the song pins from the API's artist locations when it serves them", () => {
    const repo: GraphSnapshot = {
      ...REPO,
      artistLocations: [
        { id: 'toto', city: 'Los Angeles', country: 'US' },
        { id: 'the nobodies', city: 'Memphis', country: 'US' },
      ],
    };
    const { snapshot, items } = mergeSnapshot(
      repo,
      exportOf([
        [
          'artist_location',
          [
            row('toto', { id: 'toto', city: 'Detroit', country: 'US' }),
            row('new act', { city: 'Chicago', country: 'US' }),
          ],
        ],
      ]),
      rules(),
    );
    expect(snapshot.artistLocations).toEqual([
      { id: 'toto', city: 'Detroit', country: 'US' },
      { id: 'the nobodies', city: 'Memphis', country: 'US' },
      { id: 'new act', city: 'Chicago', country: 'US' },
    ]);
    // A pin is a statement about an artist, not a node: it claims no item.
    expect(items.size).toBe(0);
    // Not served: the repo's JSON as it is.
    expect(
      mergeSnapshot(repo, exportOf([['song', []]]), rules()).snapshot
        .artistLocations,
    ).toBe(repo.artistLocations);
  });

  it('asks again who each event is about, over the working lists', () => {
    const base: GraphSnapshot = {
      artists: [{ slug: 'toto', name: 'Toto' }],
      events: [{ id: 'evt-toto-tour', title: 'Toto tour', tags: ['toto'] }],
    };
    const repo = { ...base, eventMatches: matchSnapshotEvents(base) };
    expect(repo.eventMatches.get('evt-toto-tour')?.artists).toContainEqual({
      artistId: 'toto',
      path: 'tags[]',
    });

    // The store renamed the act's slug: the repo's answer names a record
    // that is no longer there, so it is not reused.
    const { snapshot } = mergeSnapshot(
      repo,
      exportOf([
        ['artist', [row('toto-band', { slug: 'toto-band', name: 'Toto' })]],
      ]),
      rules('artist'),
    );
    expect(snapshot.eventMatches).not.toBe(repo.eventMatches);
    expect(
      snapshot.eventMatches
        ?.get('evt-toto-tour')
        ?.artists.map((a) => a.artistId),
    ).toContain('toto-band');

    // Nothing the matcher reads came from the API: the repo's answer stands.
    const labelsOnly = mergeSnapshot(repo, exportOf([['label', []]]), rules());
    expect(labelsOnly.snapshot.eventMatches).toBe(repo.eventMatches);
    // And a snapshot that never asked for matches gets none.
    expect(
      mergeSnapshot(base, exportOf([['artist', []]]), rules()).snapshot
        .eventMatches,
    ).toBeUndefined();
  });

  it('reads every kind in a fixed order, songs before their events', () => {
    expect(WORKING_CONTENT_KINDS.indexOf('song')).toBeLessThan(
      WORKING_CONTENT_KINDS.indexOf('globe_event'),
    );
  });

  it('builds a graph whose API nodes say so', () => {
    const { snapshot } = mergeSnapshot(
      REPO,
      exportOf([
        [
          'artist',
          [
            row('toto', { slug: 'toto', name: 'Toto' }),
            row(
              'jeff-porcaro',
              { slug: 'jeff-porcaro', name: 'Jeff Porcaro' },
              { status: 'draft', editState: 'pending' },
            ),
          ],
        ],
      ]),
      rules('artist'),
    );
    const graph = buildGraph(snapshot);
    expect(graph.nodes.get('artist:toto')).toMatchObject({
      status: 'published',
      origin: 'api',
    });
    expect(graph.nodes.get('artist:jeff-porcaro')).toMatchObject({
      status: 'pending',
      origin: 'api',
    });
    expect(graph.nodes.has('artist:the-nobodies')).toBe(false);
    // Repo songs are still code's.
    expect(graph.nodes.get('song:rosanna')).toMatchObject({
      status: 'code',
      origin: 'code',
    });
  });
});

describe('workingItems', () => {
  it('joins the list rows by canonical node, songs claiming their node first', () => {
    const items = workingItems(
      exportOf([
        ['globe_event', [row('song-africa', null), row('evt-live-aid', null)]],
        ['song', [row('africa', null, { status: 'draft', title: 'Africa' })]],
        ['activity_flow', [row('rock-1', null)]],
      ]),
    );
    expect([...items.keys()].sort()).toEqual([
      'event:evt-live-aid',
      'song:africa',
    ]);
    expect(items.get('song:africa')).toMatchObject({
      contentKind: 'song',
      status: 'draft',
    });
  });
});

describe('the working snapshot module', () => {
  it('would notice React or the store being loaded', async () => {
    // The guard itself (vitest wraps the factory's error in its own message).
    await expect(import('react')).rejects.toThrow();
    await expect(import('@/content/contentStore')).rejects.toThrow();
  });
});
