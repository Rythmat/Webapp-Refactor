import { IDBFactory } from 'fake-indexeddb';
import { beforeAll, describe, expect, it } from 'vitest';
import { suggestionId } from '@/content/suggestions/keys';
import type { Suggestion } from '@/content/suggestions/types';
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
  type MockSuggestionSources,
  type MockViewer,
} from '../contentMockServer';
import type { DecisionResult } from '../decisions';
import { getMockStorageStatus } from '../mockStorageStatus';
import { createMockPersistence, openMockDatabase } from '../persist';
import { loadSeed, loadSuggestionSeed } from '../seed';
import { seedBeforeImport } from './seedBeforeImport';

/**
 * Stage 1 in the mock's storage (design C22, §8.2 risk 8): the Links page's
 * sure matches, then the event accepts as the Table makes them — bulk runs
 * of decisions through `POST /suggestions/decisions`, each a save with its
 * revision, each logged — and a publish after each run. Then the song half
 * of the importer's review (F2), with its committed artifacts loaded: every
 * sure song row accepted one at a time, the records they need made first.
 * It must save within budget in IndexedDB and come back whole, decisions and
 * all.
 */

const ADMIN: MockViewer = { role: 'admin', userId: 'admin-1', name: 'Ada' };

let seed: MockSeed;
/** The importer's committed artifacts, as the mock serves them. */
let artifacts: MockSuggestionSources;
beforeAll(async () => {
  // The repo before the bulk import of 30 September 2026, which wrote most
  // of the rows these tests accept (seedBeforeImport.ts), and so without
  // the decisions.json the import committed: before it there was none.
  const [loaded, served] = await Promise.all([
    loadSeed('all'),
    loadSuggestionSeed('all', undefined, {}),
  ]);
  seed = seedBeforeImport(loaded);
  artifacts = { ...served };
  delete artifacts.committed;
}, 60_000);

const ok = <T>(response: { status: number; body: unknown }): T => {
  if (response.status !== 200)
    throw new Error(`${response.status}: ${JSON.stringify(response.body)}`);
  return response.body as T;
};

const ofKind = (kind: string) =>
  seed.items.filter((item) => item.kind === kind);

/** The app's Stage-1 event suggestions at the design's measured sizes (§5.1). */
function stageOneSuggestions() {
  const events = ofKind('globe_event').filter((event) =>
    event.slug.startsWith('evt-'),
  );
  const cities = ofKind('globe_city');
  const cityByName = new Map(
    cities.map((city) => [String(city.body.name).toLowerCase(), city.slug]),
  );
  const artists = ofKind('artist').map((artist) => artist.slug);
  const songs = ofKind('song').map((song) => song.slug);
  const make = (slug: string, path: string, value: unknown): Suggestion => {
    const target = { kind: 'globe_event', slug };
    return {
      id: suggestionId({ target, path, op: 'set', value }),
      target,
      path,
      op: 'set',
      value,
      display: `${path}: ${JSON.stringify(value)}`,
      sources: [{ provider: 'app', label: `${slug} ${path}` }],
      evidence: ['read from the event'],
      confidence: 0.9,
      tier: 'sure',
      batch: 'app-stage1',
    };
  };
  const places = events.slice(0, 944).map((event, index) => {
    const city = String(
      (event.body.location as { city?: unknown } | undefined)?.city ?? '',
    ).toLowerCase();
    return make(
      event.slug,
      'placeId',
      cityByName.get(city) ?? cities[index % cities.length].slug,
    );
  });
  // 688 events, 816 pairs: every sixth event about two artists.
  const withArtists = events
    .slice(0, 688)
    .map((event, index) =>
      make(
        event.slug,
        'artistIds',
        index % 6 === 0
          ? [
              artists[(index * 7) % artists.length],
              artists[(index * 7 + 1) % artists.length],
            ]
          : [artists[(index * 7) % artists.length]],
      ),
    );
  const withSongs = events
    .slice(0, 48)
    .map((event, index) =>
      make(event.slug, 'songIds', [songs[(index * 13) % songs.length]]),
    );
  return { places, withArtists, withSongs };
}

describe('the Stage-1 budget, with decisions', () => {
  const makeServer = (app: readonly Suggestion[]) =>
    createContentMockServer({
      seed,
      mode: 'all',
      suggestions: { ...artifacts, app: () => app },
    });

  const publish = (server: ContentMockServer, kind: string) => {
    const created = ok<{ releaseId: string; parts: number[] }>(
      server.handle({
        method: 'POST',
        path: '/releases',
        body: { kind },
        viewer: ADMIN,
      }),
    );
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

  const exportAll = (server: ContentMockServer, kind: string) => {
    const rows: unknown[] = [];
    let cursor: string | undefined;
    do {
      const page = ok<{ items: unknown[]; nextCursor: string | null }>(
        server.handle({
          method: 'GET',
          path: '/export',
          query: { kind, limit: '500', ...(cursor ? { cursor } : {}) },
          viewer: ADMIN,
        }),
      );
      rows.push(...page.items);
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    return rows;
  };

  /**
   * Stage 1 as the Table makes it: the Links page's "Apply the sure
   * matches", then the three bulk runs of event accepts, a publish after
   * each.
   */
  const stageOne = (server: ContentMockServer) => {
    const { places, withArtists, withSongs } = stageOneSuggestions();

    // B's checkpoint: the Links page's "Apply the sure matches" (634 songs),
    // through PUT as the page makes it.
    const songs = ofKind('song');
    const entries: EntityEntry[] = ofKind('artist').map((item) => ({
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
      entries,
    ).filter((group) => group.tier === 'sure');
    const links = linksBySong(
      sure.map((group) => ({ group, slug: group.candidates[0].entry.slug })),
    );
    const songBody = new Map(songs.map((song) => [song.slug, song.body]));
    for (const [slug, found] of links)
      ok(
        server.handle({
          method: 'PUT',
          path: '/items',
          body: {
            kind: 'song',
            slug,
            body: linkBody(songBody.get(slug)!, found),
            note: 'Linked artist names to their records',
          },
          viewer: ADMIN,
        }),
      );
    expect(links.size).toBeGreaterThanOrEqual(600);
    publish(server, 'song');
    // Every song event in the repo has its song (the BBC live Valerie by its
    // alias, songEventAliases.ts), so nothing blocks the event publish.
    publish(server, 'globe_event');

    // The Table's three bulk runs, a publish after each.
    for (const run of [places, withArtists, withSongs]) {
      const { results } = ok<{ results: DecisionResult[] }>(
        server.handle({
          method: 'POST',
          path: '/suggestions/decisions',
          body: {
            decisions: run.map((s) => ({
              suggestionId: s.id,
              op: 'accept',
              method: 'bulk',
            })),
          },
          viewer: ADMIN,
        }),
      );
      expect(results.filter((r) => r.outcome !== 'saved')).toEqual([]);
      publish(server, 'globe_event');
    }
    expect(server.snapshot().decisions).toHaveLength(944 + 688 + 48);
    expect(
      withArtists.reduce((sum, s) => sum + (s.value as string[]).length, 0),
    ).toBe(803);
  };

  /**
   * The song half's review (F2): every sure song row, one at a time as the
   * row panel sends them, in requests of up to 5,000 — the Album, Studio,
   * Credit and Year rows first, then the Label rows, whose releases the
   * Album rows make — and a publish of every kind it wrote, in the
   * contract's order. Answers how many the store took.
   */
  const songReview = (server: ContentMockServer): number => {
    const sure = (artifacts.imported ?? []).filter(
      (s) => s.target.kind !== 'artist' && s.tier === 'sure',
    );
    const results: DecisionResult[] = [];
    for (const run of [
      sure.filter((s) => s.path !== 'labelId'),
      sure.filter((s) => s.path === 'labelId'),
    ])
      for (let at = 0; at < run.length; at += 5000)
        results.push(
          ...ok<{ results: DecisionResult[] }>(
            server.handle({
              method: 'POST',
              path: '/suggestions/decisions',
              body: {
                decisions: run
                  .slice(at, at + 5000)
                  .map((s) => ({ suggestionId: s.id, op: 'accept' })),
              },
              viewer: ADMIN,
            }),
          ).results,
        );
    const written = results.filter(
      (r) => r.outcome === 'saved' || r.outcome === 'already',
    ).length;
    expect(sure.length).toBeGreaterThan(0);
    expect(written / sure.length).toBeGreaterThan(0.99);
    // What a record names goes out before it.
    for (const kind of [
      'globe_city',
      'label',
      'studio',
      'artist',
      'release',
      'song',
    ])
      publish(server, kind);
    return written;
  };

  /**
   * Save the store to IndexedDB as the browser adapter does, and load it
   * into a fresh server: the size of the save, how long its encode took,
   * and the server it came back into.
   */
  const saveAndRestore = async (
    server: ContentMockServer,
    app: readonly Suggestion[],
  ) => {
    const factory = new IDBFactory();
    const database = await openMockDatabase({
      indexedDB: factory,
      storage: null,
    });
    const persistence = createMockPersistence({
      server,
      storage: null,
      database,
      pageEvents: null,
    });
    const started = performance.now();
    const size = persistence.flush();
    const encodeMs = Math.round(performance.now() - started);
    await persistence.settled();
    expect(getMockStorageStatus()).toEqual({ state: 'ok' });
    expect(size).toBeGreaterThan(0);

    const restored = makeServer(app);
    createMockPersistence({
      server: restored,
      storage: null,
      database: await openMockDatabase({ indexedDB: factory, storage: null }),
      pageEvents: null,
    }).load();
    expect(getMockStorageStatus()).toEqual({ state: 'ok' });
    return {
      size: size!,
      encodeMs,
      state: JSON.parse(database!.text()!) as {
        decisions?: unknown[];
        items: { kind: string; body?: unknown }[];
      },
      restored,
    };
  };

  const appliedBy = (target: ContentMockServer, batch: string) =>
    ok<{ total: number; decisions: unknown }>(
      target.handle({
        method: 'GET',
        path: '/suggestions',
        query: { status: 'applied', batch, limit: '1' },
        viewer: ADMIN,
      }),
    );

  // Measured 2026-09-30, after the owner's duplicate merge and the
  // importer's rerun: 2.92M characters, 0.43M of them the 1,680 decisions,
  // encoded in about 90 ms (632 songs and 1,576 events stored as patches;
  // 634 and 1,578 before, when the two Rufus songs still waited for a link
  // they now carry in the repo). Loading the importer's artifacts, songs
  // and records too, changes none of it: suggestions are served, never
  // saved. The IndexedDB
  // record holds far more; the ceiling is what one save may cost the main
  // thread, as in persist.test.ts.
  const BUDGET_CHARS = 8_000_000;

  it('saves the Links write and 1,680 accepted event decisions within budget, with the importer’s artifacts loaded, and restores them', async () => {
    const { places, withArtists, withSongs } = stageOneSuggestions();
    const app = [...places, ...withArtists, ...withSongs];
    const server = makeServer(app);
    expect(
      (artifacts.imported ?? []).some((s) => s.target.kind === 'song'),
    ).toBe(true);
    stageOne(server);
    const decided = server.snapshot().decisions;

    const { size, state, restored } = await saveAndRestore(server, app);
    expect(size).toBeLessThan(BUDGET_CHARS);
    // The log is a small part of it: about 250 characters a decision.
    expect(state.decisions).toHaveLength(decided.length);
    expect(JSON.stringify(state.decisions).length).toBeLessThan(
      decided.length * 400,
    );
    expect(
      state.items.filter((item) => item.kind === 'globe_event' && item.body)
        .length,
    ).toBeGreaterThanOrEqual(944);

    expect(restored.snapshot().decisions).toEqual(decided);
    for (const kind of ['song', 'globe_event'])
      expect(exportAll(restored, kind), kind).toEqual(exportAll(server, kind));
    expect(appliedBy(restored, 'app-stage1')).toMatchObject({
      total: 1680,
      decisions: { total: 1680, notDownloaded: 1680, proposed: 0 },
    });
  }, 180_000);

  // Measured 2026-09-30, after the importer's rerun, with every sure song
  // row accepted (5,562 of 5,571; about 1,440 records made): 10.4M
  // characters, encoded in about 80 ms — the decisions about 3.2M (0.68M
  // of that the records each accept keeps to make again), the items 4.6M,
  // the release snapshots 2.6M. That is over the Stage-1 budget by nearly a
  // third, and 3.6 times what Stage 1 alone saves. (The first measure, on
  // the artifacts before the rerun, was 10.0M for 5,320 of 5,329 rows.)
  // Held here so it cannot grow unnoticed; pruning release snapshots
  // sooner, and keeping each record once in the saved log, are what would
  // bring it under.
  const SONG_REVIEW_CHARS = 12_000_000;

  it('saves the song half’s review on top, and restores it whole', async () => {
    const { places, withArtists, withSongs } = stageOneSuggestions();
    const app = [...places, ...withArtists, ...withSongs];
    const server = makeServer(app);
    stageOne(server);
    const written = songReview(server);
    const decided = server.snapshot().decisions;
    expect(decided).toHaveLength(944 + 688 + 48 + written);

    const { size, encodeMs, restored } = await saveAndRestore(server, app);
    console.info(
      `Stage 1 and the song review: ${size} characters, ${decided.length} decisions, encoded in ${encodeMs} ms`,
    );
    expect(size).toBeLessThan(SONG_REVIEW_CHARS);

    expect(restored.snapshot().decisions).toEqual(decided);
    for (const kind of [
      'song',
      'globe_event',
      'globe_city',
      'label',
      'studio',
      'artist',
      'release',
    ])
      expect(exportAll(restored, kind), kind).toEqual(exportAll(server, kind));
  }, 180_000);
});
