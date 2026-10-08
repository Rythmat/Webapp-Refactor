import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { artistSlug } from '@/content/graph/slugs';
import type { EntityEntry } from '../../entities/rankEntities';
import {
  linkBody,
  linksBySong,
  resolveLegacyArtists,
  type SongLike,
} from '../../entities/resolveLegacy';
import {
  createContentMockServer,
  type ContentMockServer,
  type MockSeed,
  type MockViewer,
} from '../contentMockServer';
import { getMockStorageStatus } from '../mockStorageStatus';
import { applyPatch, diffJson, jsonEqual } from '../patch';
import {
  createMockPersistence,
  createMockStateCodec,
  MOCK_STORAGE_KEY,
  openMockDatabase,
} from '../persist';
import { loadSeed } from '../seed';
import { MemoryStorage } from './memoryStorage';

const ADMIN: MockViewer = { role: 'admin', userId: 'admin-1', name: 'Ada' };
const EDITOR: MockViewer = { role: 'editor', userId: 'ed-1', name: 'Eddie' };

let seed: MockSeed;
beforeAll(async () => {
  seed = await loadSeed('all');
}, 60_000);

const makeServer = () => createContentMockServer({ seed, mode: 'all' });

const ok = (response: { status: number; body: unknown }) => {
  if (response.status !== 200)
    throw new Error(`${response.status}: ${JSON.stringify(response.body)}`);
  return response.body as Record<string, unknown>;
};

const put = (
  server: ContentMockServer,
  body: Record<string, unknown>,
  viewer = ADMIN,
) => ok(server.handle({ method: 'PUT', path: '/items', body, viewer }));

/** What the console would read back: every item's working state, as admin. */
const workingView = (server: ContentMockServer, kind: string) => {
  const rows: unknown[] = [];
  let cursor: string | undefined;
  do {
    const page = ok(
      server.handle({
        method: 'GET',
        path: '/export',
        query: { kind, limit: '500', ...(cursor ? { cursor } : {}) },
        viewer: ADMIN,
      }),
    ) as { items: unknown[]; nextCursor: string | null };
    rows.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return rows;
};

describe('structural patches', () => {
  it('round-trips nested objects and arrays without touching the base', () => {
    const base = {
      title: 'Africa',
      origin: { region: 'north-america' },
      sections: [
        { id: 'a', bars: [{ chords: ['1'] }, { chords: ['4'] }] },
        { id: 'b', bars: [{ chords: ['5'] }] },
      ],
      gone: true,
    };
    const next = {
      title: 'Africa',
      origin: { region: 'north-america', artistGlobeId: 'toto' },
      sections: [
        { id: 'a', bars: [{ chords: ['1'] }, { chords: ['6m'] }] },
        { id: 'b', bars: [{ chords: ['5'] }, { chords: ['1'] }] },
      ],
    };
    const frozen = JSON.stringify(base);
    const ops = diffJson(base, next);
    expect(ops).toEqual([
      { path: ['gone'], op: 'del' },
      {
        path: ['origin', 'artistGlobeId'],
        op: 'set',
        value: 'toto',
      },
      {
        path: ['sections', 0, 'bars', 1, 'chords', 0],
        op: 'set',
        value: '6m',
      },
      // A length change replaces that one array.
      {
        path: ['sections', 1, 'bars'],
        op: 'set',
        value: [{ chords: ['5'] }, { chords: ['1'] }],
      },
    ]);
    expect(applyPatch(base, ops)).toEqual(next);
    expect(JSON.stringify(base)).toBe(frozen);
    // Untouched branches are shared, not copied.
    expect(applyPatch<typeof base>(base, ops).sections[0].bars[0]).toBe(
      base.sections[0].bars[0],
    );
  });

  it('treats undefined as absent, as JSON does', () => {
    expect(diffJson({ a: 1, b: undefined }, { a: 1 })).toEqual([]);
    expect(jsonEqual({ a: 1, b: undefined }, { a: 1 })).toBe(true);
    expect(applyPatch({}, [{ path: ['x', 0], op: 'set', value: 1 }])).toEqual({
      x: [1],
    });
  });
});

describe('the persisted state', () => {
  it('restores edits, proposals, new items, deletes and releases', () => {
    const before = makeServer();
    const africa = ok(
      before.handle({
        method: 'GET',
        path: '/items/lookup',
        query: { kind: 'song', slug: 'africa' },
        viewer: ADMIN,
      }),
    );
    const detail = ok(
      before.handle({
        method: 'GET',
        path: `/items/${africa.id}`,
        viewer: ADMIN,
      }),
    ) as { body: Record<string, unknown> };
    put(before, {
      kind: 'song',
      slug: 'africa',
      body: { ...detail.body, title: 'Africa (admin)' },
    });
    put(
      before,
      {
        kind: 'song',
        slug: 'africa',
        body: { ...detail.body, title: 'Africa (proposal)' },
        note: 'Retitle',
      },
      EDITOR,
    );
    put(before, {
      kind: 'studio',
      slug: 'electric-lady',
      body: {
        slug: 'electric-lady',
        name: 'Electric Lady',
        placeId: 'new-york',
      },
      status: 'published',
      create: true,
    });
    put(
      before,
      {
        kind: 'label',
        // A label the seed lacks (Motown until the bulk import of 30
        // September 2026 made it).
        slug: 'philadelphia-international',
        body: {
          slug: 'philadelphia-international',
          name: 'Philadelphia International',
          placeId: 'philadelphia',
        },
        create: true,
      },
      EDITOR,
    );
    const hitsville = ok(
      before.handle({
        method: 'GET',
        path: '/items/lookup',
        query: { kind: 'studio', slug: 'britannia-row' },
        viewer: ADMIN,
      }),
    );
    ok(
      before.handle({
        method: 'DELETE',
        path: `/items/${hitsville.id}`,
        viewer: ADMIN,
      }),
    );
    // Publish studios so a runtime release has to survive too.
    const created = ok(
      before.handle({
        method: 'POST',
        path: '/releases',
        body: { kind: 'studio' },
        viewer: ADMIN,
      }),
    ) as { releaseId: string; parts: number[] };
    for (const part of created.parts)
      ok(
        before.handle({
          method: 'POST',
          path: `/releases/${created.releaseId}/parts/${part}`,
          viewer: ADMIN,
        }),
      );
    ok(
      before.handle({
        method: 'POST',
        path: `/releases/${created.releaseId}/activate`,
        viewer: ADMIN,
      }),
    );

    const text = JSON.stringify(
      createMockStateCodec(before).encode(before.snapshot()),
    );
    const after = makeServer();
    after.restore(createMockStateCodec(after).decode(JSON.parse(text)));

    for (const kind of ['song', 'studio', 'label'])
      expect(workingView(after, kind), kind).toEqual(workingView(before, kind));
    const releases = (server: ContentMockServer) =>
      server.handle({ method: 'GET', path: '/releases', viewer: ADMIN }).body;
    expect(releases(after)).toEqual(releases(before));
    expect(after.cdnManifest().kinds.studios).toEqual({
      ...before.cdnManifest().kinds.studios,
    });
    const pending = (server: ContentMockServer) =>
      server.handle({ method: 'GET', path: '/pending', viewer: ADMIN }).body;
    expect(pending(after)).toEqual(pending(before));
  });

  it('keeps the songs under 1 MB after an editor batch-edits all 642 songs', () => {
    const server = makeServer();
    const songs = seed.items.filter((item) => item.kind === 'song');
    expect(songs).toHaveLength(642);
    for (const song of songs) {
      // An admin fix to the live body (nearly every song ships at 50)…
      put(server, {
        kind: 'song',
        slug: song.slug,
        body: { ...song.body, popularity: 61 },
      });
      // …and an editor's proposal linking the lead act.
      put(
        server,
        {
          kind: 'song',
          slug: song.slug,
          body: {
            ...song.body,
            popularity: 61,
            origin: {
              ...(song.body.origin as object | undefined),
              artistGlobeId: artistSlug(String(song.body.artist)),
            },
          },
          note: 'Link the lead act',
        },
        EDITOR,
      );
    }

    const text = JSON.stringify(
      createMockStateCodec(server).encode(server.snapshot()),
    );
    const sizeOf = (value: unknown) =>
      new TextEncoder().encode(JSON.stringify(value)).length;
    const state = JSON.parse(text) as {
      items: { kind?: string; body?: unknown; pendingBody?: unknown }[];
    };
    // What the batch stores for the songs: a small patch per song, both
    // halves, well under 1 MB (about 430 KB).
    expect(
      sizeOf(state.items.filter((item) => item.kind === 'song')),
    ).toBeLessThan(1_000_000);
    // Each admin save also re-derives the song's globe event. The whole state
    // was under 1 MB until the bulk import of 30 September 2026: since then a
    // derived event carries its song's credits, records and studios, about
    // 1 MB more for all 642. It stays far inside localStorage's 5 MB, the
    // limit of the fallback store.
    expect(new TextEncoder().encode(text).length).toBeLessThan(2_000_000);
    // Both halves really were stored, as patches. (The admin saves also
    // re-derived the song events, which are stored beside them.)
    const songRows = state.items.filter(
      (item) => (item as { kind?: string }).kind === 'song',
    );
    expect(songRows.filter((item) => item.body)).toHaveLength(642);
    expect(songRows.filter((item) => item.pendingBody)).toHaveLength(642);

    const restored = makeServer();
    restored.restore(createMockStateCodec(restored).decode(JSON.parse(text)));
    expect(workingView(restored, 'song')).toEqual(workingView(server, 'song'));
  }, 60_000);
});

describe('the seed under a saved patch', () => {
  const studioSeed = (aliases: string[]): MockSeed => ({
    items: [
      {
        kind: 'studio',
        slug: 'x-studio',
        body: { slug: 'x-studio', name: 'X', aliases },
      },
    ],
  });
  const studioBody = (server: ContentMockServer) =>
    (workingView(server, 'studio')[0] as { body: { aliases: string[] } }).body;

  it('leaves out a patch whose seed body moved, and says which', () => {
    const storage = new MemoryStorage();
    const before = createContentMockServer({
      seed: studioSeed(['one', 'two', 'three']),
      mode: 'all',
    });
    put(before, {
      kind: 'studio',
      slug: 'x-studio',
      body: {
        slug: 'x-studio',
        name: 'X',
        aliases: ['one', 'EDITED', 'three'],
      },
    });
    // A release too, so its entry has to notice as well.
    const created = ok(
      before.handle({
        method: 'POST',
        path: '/releases',
        body: { kind: 'studio' },
        viewer: ADMIN,
      }),
    ) as { releaseId: string; parts: number[] };
    for (const part of created.parts)
      ok(
        before.handle({
          method: 'POST',
          path: `/releases/${created.releaseId}/parts/${part}`,
          viewer: ADMIN,
        }),
      );
    ok(
      before.handle({
        method: 'POST',
        path: `/releases/${created.releaseId}/activate`,
        viewer: ADMIN,
      }),
    );
    createMockPersistence({ server: before, storage }).flush();

    // The same seed again: everything comes back.
    const same = createContentMockServer({
      seed: studioSeed(['one', 'two', 'three']),
      mode: 'all',
    });
    createMockPersistence({ server: same, storage }).load();
    expect(getMockStorageStatus()).toEqual({ state: 'ok' });
    expect(studioBody(same).aliases).toEqual(['one', 'EDITED', 'three']);

    // The repo changed that body since: replaying the index-based patch
    // would edit the wrong alias, so it is left out and reported.
    const moved = createContentMockServer({
      seed: studioSeed(['zero', 'one', 'two', 'three']),
      mode: 'all',
    });
    const persistence = createMockPersistence({ server: moved, storage });
    persistence.load();
    expect(getMockStorageStatus()).toMatchObject({ state: 'stale' });
    const { detail } = getMockStorageStatus() as { detail: string };
    expect(detail).toContain('studio x-studio');
    expect(detail).toContain('studio v2 x-studio');
    expect(studioBody(moved).aliases).toEqual(['zero', 'one', 'two', 'three']);
    // The release stays whole, serving the seed's body for that item.
    const studios = moved.cdnManifest().kinds.studios!;
    expect(studios.version).toBe(2);
    expect(JSON.parse(moved.cdnObjectText(studios.objects[0].key)!)).toEqual([
      { slug: 'x-studio', name: 'X', aliases: ['zero', 'one', 'two', 'three'] },
    ]);

    // Saving carries on, drops what could not be restored, and the notice
    // stays until Reset.
    expect(persistence.flush()).toBeGreaterThan(0);
    expect(getMockStorageStatus()).toMatchObject({ state: 'stale' });
    persistence.reset();
    expect(getMockStorageStatus()).toEqual({ state: 'ok' });
  });

  it('refuses a saved state with a bad date rather than restore it', () => {
    const storage = new MemoryStorage();
    const first = makeServer();
    put(first, {
      kind: 'label',
      slug: 'apple',
      body: { slug: 'apple', name: 'Apple Records', placeId: 'london' },
    });
    createMockPersistence({ server: first, storage }).flush();
    const saved = JSON.parse(storage.getItem(MOCK_STORAGE_KEY)!) as {
      items: Record<string, unknown>[];
    };
    delete saved.items[0].createdAt;
    const broken = JSON.stringify(saved);
    storage.data.set(MOCK_STORAGE_KEY, broken);

    const second = makeServer();
    const persistence = createMockPersistence({ server: second, storage });
    persistence.load();
    expect(getMockStorageStatus()).toMatchObject({ state: 'unreadable' });
    expect(persistence.flush()).toBeNull();
    expect(storage.getItem(MOCK_STORAGE_KEY)).toBe(broken);
    persistence.reset();
  });

  it('reports a save it cannot encode instead of throwing', () => {
    const storage = new MemoryStorage();
    const server = makeServer();
    put(server, {
      kind: 'label',
      slug: 'apple',
      body: { slug: 'apple', name: 'Apple Records', placeId: 'london' },
    });
    // The live item, as the server holds it.
    server.snapshot().items[0].updatedAt = new Date(Number.NaN);
    const persistence = createMockPersistence({ server, storage });
    expect(persistence.flush()).toBeNull();
    expect(getMockStorageStatus()).toMatchObject({ state: 'unavailable' });
    expect(storage.writes).toBe(0);
    persistence.reset();
  });

  it('lists a release whose items it no longer keeps as not restorable', () => {
    const server = makeServer();
    const publishLabels = () => {
      const created = ok(
        server.handle({
          method: 'POST',
          path: '/releases',
          body: { kind: 'label' },
          viewer: ADMIN,
        }),
      ) as { releaseId: string; parts: number[] };
      for (const part of created.parts)
        ok(
          server.handle({
            method: 'POST',
            path: `/releases/${created.releaseId}/parts/${part}`,
            viewer: ADMIN,
          }),
        );
      ok(
        server.handle({
          method: 'POST',
          path: `/releases/${created.releaseId}/activate`,
          viewer: ADMIN,
        }),
      );
    };
    // v2 to v6: v6 is live, and of v2 to v5 only the newest three are kept.
    for (let run = 0; run < 5; run += 1) publishLabels();
    const text = JSON.stringify(
      createMockStateCodec(server).encode(server.snapshot()),
    );
    const restored = makeServer();
    restored.restore(createMockStateCodec(restored).decode(JSON.parse(text)));

    const listed = restored.handle({
      method: 'GET',
      path: '/releases',
      viewer: ADMIN,
    }).body as { kind: string; version: number; error: string | null }[];
    const labels = listed.filter((release) => release.kind === 'label');
    expect(labels.find((release) => release.version === 2)?.error).toMatch(
      /cannot be restored/,
    );
    expect(labels.find((release) => release.version === 3)?.error).toBeNull();
    const rollback = restored.handle({
      method: 'POST',
      path: '/rollback',
      body: { kind: 'label', version: 2 },
      viewer: ADMIN,
    });
    expect(rollback.status).toBe(409);
    expect(rollback.body).toMatchObject({ code: 'SNAPSHOT_PRUNED' });
  });
});

describe('createMockPersistence', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('saves after a burst of changes, once', () => {
    vi.useFakeTimers();
    const server = makeServer();
    const storage = new MemoryStorage();
    const persistence = createMockPersistence({ server, storage });
    persistence.load();
    server.subscribe(() => persistence.schedule());
    for (const name of ['One', 'Two', 'Three'])
      put(server, {
        kind: 'studio',
        slug: 'sunset-sound',
        body: { slug: 'sunset-sound', name, placeId: 'los-angeles' },
      });
    expect(storage.writes).toBe(0);
    vi.runAllTimers();
    expect(storage.writes).toBe(1);
    expect(storage.getItem(MOCK_STORAGE_KEY)).toContain('Three');
  });

  it('loads what it saved into a fresh server, and reset forgets it', () => {
    const storage = new MemoryStorage();
    const first = makeServer();
    const persistence = createMockPersistence({ server: first, storage });
    put(first, {
      kind: 'label',
      slug: 'apple',
      body: { slug: 'apple', name: 'Apple Records', placeId: 'london' },
    });
    expect(persistence.flush()).toBeGreaterThan(0);

    const second = makeServer();
    createMockPersistence({ server: second, storage }).load();
    const label = (server: ContentMockServer) =>
      workingView(server, 'label').find(
        (row) => (row as { slug: string }).slug === 'apple',
      ) as { body: { name: string } };
    expect(label(second).body.name).toBe('Apple Records');

    createMockPersistence({ server: second, storage }).reset();
    expect(storage.getItem(MOCK_STORAGE_KEY)).toBeNull();
    const third = makeServer();
    createMockPersistence({ server: third, storage }).load();
    expect(label(third).body.name).toBe('Apple');
    expect(getMockStorageStatus()).toEqual({ state: 'ok' });
  });

  it('reports a full quota and leaves the last good save alone', () => {
    const storage = new MemoryStorage();
    const server = makeServer();
    const persistence = createMockPersistence({ server, storage });
    put(server, {
      kind: 'label',
      slug: 'apple',
      body: { slug: 'apple', name: 'Saved', placeId: 'london' },
    });
    persistence.flush();
    const good = storage.getItem(MOCK_STORAGE_KEY);

    storage.failWith = new DOMException('full', 'QuotaExceededError');
    put(server, {
      kind: 'label',
      slug: 'apple',
      body: { slug: 'apple', name: 'Lost', placeId: 'london' },
    });
    expect(persistence.flush()).toBeNull();
    expect(getMockStorageStatus()).toMatchObject({ state: 'full' });
    expect(storage.getItem(MOCK_STORAGE_KEY)).toBe(good);

    // Reset clears the banner state.
    persistence.reset();
    expect(getMockStorageStatus()).toEqual({ state: 'ok' });
  });

  it('never overwrites a save it could not read', () => {
    const storage = new MemoryStorage();
    storage.data.set(MOCK_STORAGE_KEY, '{not json');
    const server = makeServer();
    const persistence = createMockPersistence({ server, storage });
    persistence.load();
    expect(getMockStorageStatus()).toMatchObject({ state: 'unreadable' });
    put(server, {
      kind: 'label',
      slug: 'apple',
      body: { slug: 'apple', name: 'New', placeId: 'london' },
    });
    expect(persistence.flush()).toBeNull();
    expect(storage.getItem(MOCK_STORAGE_KEY)).toBe('{not json');

    persistence.reset();
    expect(persistence.flush()).toBeGreaterThan(0);
  });

  it('runs in memory when the browser gives it no storage', () => {
    const persistence = createMockPersistence({
      server: makeServer(),
      storage: null,
    });
    persistence.load();
    expect(getMockStorageStatus()).toMatchObject({ state: 'unavailable' });
    expect(persistence.flush()).toBeNull();
    persistence.reset();
  });
});

describe('the Stage-1 budget', () => {
  /** Build, fill and switch on a release of a kind, as the console does. */
  const publish = (server: ContentMockServer, kind: string) => {
    const created = ok(
      server.handle({
        method: 'POST',
        path: '/releases',
        body: { kind },
        viewer: ADMIN,
      }),
    ) as { releaseId: string; parts: number[] };
    for (const part of created.parts)
      ok(
        server.handle({
          method: 'POST',
          path: `/releases/${created.releaseId}/parts/${part}`,
          viewer: ADMIN,
        }),
      );
    ok(
      server.handle({
        method: 'POST',
        path: `/releases/${created.releaseId}/activate`,
        viewer: ADMIN,
      }),
    );
  };

  const ofKind = (kind: string) =>
    seed.items.filter((item) => item.kind === kind);

  /**
   * Stage 1 as design §5.1 counts it, through the server's own PUT (each
   * save a revision; each song save re-derives its event) and a publish
   * after each bulk run, so the event kind ends with its live release and
   * the three older snapshots the mock keeps.
   */
  const stageOne = () => {
    const server = makeServer();

    // B's checkpoint: the Links page's "Apply the sure matches" (634 songs).
    const songs = ofKind('song');
    const artists: EntityEntry[] = ofKind('artist').map((item) => ({
      id: `artist:${item.slug}` as EntityEntry['id'],
      kind: 'artist',
      slug: item.slug,
      name: String(item.body.name ?? item.slug),
      aliases: Array.isArray(item.body.aliases)
        ? item.body.aliases.map(String)
        : undefined,
      source: 'published',
    }));
    const sure = resolveLegacyArtists(
      songs.map((song) => ({ ...song.body, id: song.slug }) as SongLike),
      artists,
    ).filter((group) => group.tier === 'sure');
    const links = linksBySong(
      sure.map((group) => ({ group, slug: group.candidates[0].entry.slug })),
    );
    const songBody = new Map(songs.map((song) => [song.slug, song.body]));
    for (const [slug, found] of links)
      put(server, {
        kind: 'song',
        slug,
        body: linkBody(songBody.get(slug)!, found),
        note: 'Linked artist names to their records',
      });
    publish(server, 'song');
    // Every song event in the repo has its song (the BBC live Valerie by its
    // alias, songEventAliases.ts), so nothing blocks the event publish.
    publish(server, 'globe_event');

    // The event accepts, one bulk run each, then a publish: ≈944 places,
    // 688 artists, 48 songs.
    const events = ofKind('globe_event').filter((event) =>
      event.slug.startsWith('evt-'),
    );
    const eventBody = new Map(events.map((event) => [event.slug, event.body]));
    const cities = ofKind('globe_city');
    const cityByName = new Map(
      cities.map((city) => [String(city.body.name).toLowerCase(), city.slug]),
    );
    const artistSlugs = artists.map((artist) => artist.slug);
    const songSlugs = songs.map((song) => song.slug);
    const accept = (
      count: number,
      fields: (body: Record<string, unknown>, index: number) => object,
    ) => {
      for (const [index, event] of events.slice(0, count).entries()) {
        const body = eventBody.get(event.slug)!;
        const next = { ...body, ...fields(body, index) };
        put(server, {
          kind: 'globe_event',
          slug: event.slug,
          body: next,
          note: `Accepted suggestion app:${event.slug}`,
        });
        eventBody.set(event.slug, next);
      }
      publish(server, 'globe_event');
    };
    accept(944, (body, index) => {
      const city = String(
        (body.location as { city?: unknown } | undefined)?.city ?? '',
      );
      return {
        placeId:
          cityByName.get(city.toLowerCase()) ??
          cities[index % cities.length].slug,
      };
    });
    accept(688, (_body, index) => ({
      artistIds: [artistSlugs[(index * 7) % artistSlugs.length]],
    }));
    accept(48, (_body, index) => ({
      songIds: [songSlugs[(index * 13) % songSlugs.length]],
    }));
    return { server, songsLinked: links.size, eventSaves: 944 + 688 + 48 };
  };

  // IndexedDB has room for far more; the ceiling is what one save costs on
  // the main thread, at every debounce and on pagehide: the encode, then
  // IndexedDB's copy of the text. Measured 2026-09-29: 2.47M characters,
  // encoded in about 80 ms cold and 15 ms warm, restored in about 20 ms. That
  // is already Safari's localStorage (5 MB of UTF-16), before any imported
  // suggestion is accepted.
  const BUDGET_CHARS = 8_000_000;

  it('saves in IndexedDB within budget, and restores all of it', async () => {
    const { server, songsLinked, eventSaves } = stageOne();
    expect(songsLinked).toBeGreaterThanOrEqual(600);
    expect(eventSaves).toBe(1680);

    const factory = new IDBFactory();
    const database = await openMockDatabase({
      indexedDB: factory,
      storage: null,
    });
    const persistence = createMockPersistence({
      server,
      storage: null,
      database,
    });
    const size = persistence.flush();
    await persistence.settled();
    expect(getMockStorageStatus()).toEqual({ state: 'ok' });
    expect(size).toBeGreaterThan(0);
    expect(size).toBeLessThan(BUDGET_CHARS);

    const state = JSON.parse(database!.text()!) as {
      items: { kind: string; body?: unknown; revisions?: unknown[] }[];
      releases: { kind: string; entries?: { put: unknown[] } }[];
    };
    // Every accepted item is stored as a patch, with its revisions…
    const stored = (kind: string) =>
      state.items.filter((item) => item.kind === kind && item.body);
    expect(stored('song')).toHaveLength(songsLinked);
    expect(stored('globe_event').length).toBeGreaterThanOrEqual(944);
    // …and the event kind keeps its live release and three snapshots.
    expect(
      state.releases.filter(
        (release) =>
          release.kind === 'globe_event' && release.entries?.put.length,
      ),
    ).toHaveLength(4);

    const restored = makeServer();
    createMockPersistence({
      server: restored,
      storage: null,
      database: await openMockDatabase({ indexedDB: factory, storage: null }),
    }).load();
    expect(getMockStorageStatus()).toEqual({ state: 'ok' });
    for (const kind of ['song', 'globe_event'])
      expect(workingView(restored, kind), kind).toEqual(
        workingView(server, kind),
      );
    const releases = (target: ContentMockServer) =>
      target.handle({ method: 'GET', path: '/releases', viewer: ADMIN }).body;
    expect(releases(restored)).toEqual(releases(server));
    expect(restored.cdnManifest().kinds).toEqual(server.cdnManifest().kinds);
  }, 120_000);
});
