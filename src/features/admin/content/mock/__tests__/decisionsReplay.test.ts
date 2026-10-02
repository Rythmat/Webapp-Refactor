import { beforeAll, describe, expect, it } from 'vitest';
import { suggestionId } from '@/content/suggestions/keys';
import type {
  RequiredRecord,
  Suggestion,
  SuggestionSource,
} from '@/content/suggestions/types';
import type {
  ContentItemDetail,
  ContentListItem,
} from '@/hooks/data/admin/useAdminContent';
import {
  createContentMockServer,
  SEED_EPOCH,
  type ContentMockServer,
  type MockSeed,
  type MockViewer,
} from '../contentMockServer';
import {
  decisionsFileText,
  parseDecisionsFile,
  standingAccepts,
  type DecisionsFile,
  type ParsedDecisionsFile,
  type ReplayReport,
} from '../decisions';
import { getMockStorageStatus } from '../mockStorageStatus';
import { createMockPersistence, createMockStateCodec } from '../persist';
import { loadSeed } from '../seed';
import { MemoryStorage } from './memoryStorage';
import { seedBeforeImport } from './seedBeforeImport';

/**
 * The owner's review survives what the mock's saved patches do not (design
 * §5.3): a seed change that makes them stale, and a Reset. The committed
 * decisions.json is replayed onto whatever the store holds, where the value
 * is missing, never over something newer.
 */

const ADMIN: MockViewer = { role: 'admin', userId: 'admin-1', name: 'Ada' };
const EDITOR: MockViewer = { role: 'editor', userId: 'ed-1', name: 'Eddie' };

let seed: MockSeed;
beforeAll(async () => {
  // The repo before the bulk import of 30 September 2026, which wrote the
  // values these tests replay onto the items they name (seedBeforeImport.ts).
  seed = seedBeforeImport(await loadSeed('all'));
}, 60_000);

const MB: SuggestionSource = {
  provider: 'musicbrainz',
  url: 'https://musicbrainz.org/artist/afdb7919-059d-43c1-b668-ba1d265e7e42',
};
const APP: SuggestionSource = { provider: 'app', label: 'a planner' };

const suggest = (
  kind: string,
  slug: string,
  path: string,
  value: unknown,
  extra: { sources?: SuggestionSource[]; requires?: RequiredRecord[] } = {},
): Suggestion => {
  const target = { kind, slug };
  return {
    id: suggestionId({ target, path, op: 'set', value }),
    target,
    path,
    op: 'set',
    value,
    display: `${path} ${JSON.stringify(value)}`,
    sources: extra.sources ?? [MB],
    evidence: [],
    confidence: 0.9,
    tier: 'sure',
    ...(extra.requires ? { requires: extra.requires } : {}),
    batch: 'mb-2026-09-30',
  };
};

const ST_ALBANS: RequiredRecord = {
  kind: 'globe_city',
  slug: 'st-albans',
  body: {
    id: 'st-albans',
    name: 'St. Albans',
    country: 'US',
    subdivision: '',
    region: 'north-america',
    coordinates: [40.6948, -73.7669],
    genres: [],
    description: '',
    activeDecades: [],
    pin: false,
  },
};

const S = {
  marvinCity: suggest('artist', 'marvin-gaye', 'basedInPlaceId', 'detroit'),
  marvinBorn: suggest('artist', 'marvin-gaye', 'born', { date: '1939-04-02' }),
  madonnaCity: suggest('artist', 'madonna', 'basedInPlaceId', 'st-albans', {
    requires: [ST_ALBANS],
  }),
  tempoYear: suggest('song', 'lets_get_it_on', 'year', 1974, {
    sources: [APP],
  }),
  memphis: suggest(
    'globe_event',
    'evt-blues-memphis-1951',
    'placeId',
    'memphis',
    {
      sources: [APP],
    },
  ),
  ike: suggest(
    'globe_event',
    'evt-blues-memphis-1951',
    'artistIds',
    ['ike-turner'],
    {
      sources: [APP],
    },
  ),
  whatsGoingOn: suggest('song', 'whats_going_on', 'year', 1971, {
    sources: [APP],
  }),
  toto: suggest('artist', 'toto', 'activeFrom', 1977),
};

let clock = 0;
const makeServer = (
  from: MockSeed,
  committed?: ParsedDecisionsFile,
): ContentMockServer =>
  createContentMockServer({
    seed: from,
    mode: 'all',
    now: () => new Date(Date.UTC(2026, 9, 1) + (clock += 1000)),
    suggestions: { imported: Object.values(S), committed },
  });

const ok = <T>(response: { status: number; body: unknown }): T => {
  if (response.status !== 200)
    throw new Error(`${response.status}: ${JSON.stringify(response.body)}`);
  return response.body as T;
};

const decide = (
  server: ContentMockServer,
  decisions: Record<string, unknown>[],
  viewer = ADMIN,
) =>
  ok(
    server.handle({
      method: 'POST',
      path: '/suggestions/decisions',
      body: { decisions },
      viewer,
    }),
  );

const bodyOf = (server: ContentMockServer, kind: string, slug: string) => {
  const { id } = ok<ContentListItem>(
    server.handle({
      method: 'GET',
      path: '/items/lookup',
      query: { kind, slug },
      viewer: ADMIN,
    }),
  );
  return ok<ContentItemDetail>(
    server.handle({ method: 'GET', path: `/items/${id}`, viewer: ADMIN }),
  );
};

/** The review session: what the owner accepted, replaced and rejected. */
const review = (server: ContentMockServer) => {
  decide(server, [
    { suggestionId: S.marvinCity.id, op: 'accept' },
    { suggestionId: S.madonnaCity.id, op: 'accept' },
    { suggestionId: S.tempoYear.id, op: 'replace', seen: 1973 },
    { suggestionId: S.memphis.id, op: 'accept', method: 'bulk' },
    { suggestionId: S.ike.id, op: 'accept', method: 'bulk' },
    { suggestionId: S.toto.id, op: 'reject' },
  ]);
  // Accepted, then taken back — the value taken out by hand, then the
  // suggestion rejected (a reject leaves the item as it is): the later
  // reject stands.
  decide(server, [{ suggestionId: S.marvinBorn.id, op: 'accept' }]);
  const unborn = { ...bodyOf(server, 'artist', 'marvin-gaye').body };
  delete unborn.born;
  ok(
    server.handle({
      method: 'PUT',
      path: '/items',
      body: { kind: 'artist', slug: 'marvin-gaye', body: unborn },
      viewer: ADMIN,
    }),
  );
  decide(server, [{ suggestionId: S.marvinBorn.id, op: 'reject' }]);
  // An editor's accept waits in a proposal: not the owner's yet.
  decide(server, [{ suggestionId: S.whatsGoingOn.id, op: 'accept' }], EDITOR);
};

/** The committed file, as the owner downloads and commits it. */
const commit = (server: ContentMockServer) =>
  parseDecisionsFile(
    decisionsFileText(
      ok<DecisionsFile>(
        server.handle({
          method: 'GET',
          path: '/suggestions/decisions',
          viewer: ADMIN,
        }),
      ),
    ),
  );

/** The seed with some bodies changed in code, as a repo edit would. */
const changedSeed = (
  changes: Record<string, (body: Record<string, unknown>) => object>,
): MockSeed => ({
  items: seed.items.map((item) => {
    const change = changes[`${item.kind}:${item.slug}`];
    return change
      ? { ...item, body: { ...item.body, ...change(item.body) } }
      : item;
  }),
});

const values = (server: ContentMockServer) => ({
  marvin: bodyOf(server, 'artist', 'marvin-gaye').body.basedInPlaceId,
  madonna: bodyOf(server, 'artist', 'madonna').body.basedInPlaceId,
  year: bodyOf(server, 'song', 'lets_get_it_on').body.year,
  event: bodyOf(server, 'globe_event', 'evt-blues-memphis-1951').body,
});

describe('the committed decisions', () => {
  it('keep what stands: the latest accept or replace per suggestion, confirmed only', () => {
    const server = makeServer(seed);
    review(server);
    const committed = commit(server);
    expect(committed.refused).toEqual([]);
    expect(
      standingAccepts(committed.decisions)
        .map((d) => d.suggestionId)
        .sort(),
    ).toEqual(
      [S.marvinCity, S.madonnaCity, S.tempoYear, S.memphis, S.ike]
        .map((s) => s.id)
        .sort(),
    );
    // The editor's accept is still only a proposal.
    expect(
      committed.decisions.some((d) => d.suggestionId === S.whatsGoingOn.id),
    ).toBe(false);
  });
});

describe('replaying them', () => {
  it('writes back what a seed change took from the saved state, and lists a conflict', () => {
    const storage = new MemoryStorage();
    const before = makeServer(seed);
    const saved = createMockPersistence({
      server: before,
      storage,
      database: null,
      pageEvents: null,
    });
    saved.load();
    review(before);
    saved.flush();
    const committed = commit(before);

    // The repo moves on: every reviewed item's seed body changes, so each
    // saved patch is stale, and Madonna's city is now set in code, to a
    // different place than the one the owner accepted.
    const next = changedSeed({
      'artist:marvin-gaye': () => ({ aliases: ['Marvin Pentz Gay Jr.'] }),
      'artist:madonna': () => ({ basedInPlaceId: 'detroit' }),
      'song:lets_get_it_on': () => ({ tempo: 96 }),
      'globe_event:evt-blues-memphis-1951': (body) => ({
        description: `${String(body.description)} (revised)`,
      }),
    });
    const after = makeServer(next, committed);
    const restored = createMockPersistence({
      server: after,
      storage,
      database: null,
      pageEvents: null,
    });
    restored.load();
    expect(getMockStorageStatus().state).toBe('stale');
    // The patches are gone, and the accepted values with them.
    expect(values(after)).toMatchObject({
      marvin: undefined,
      madonna: 'detroit',
      year: 1973,
    });
    expect(values(after).event.placeId).toBeUndefined();

    const report = after.replayCommittedDecisions() as ReplayReport;
    expect(report).toMatchObject({
      considered: 5,
      applied: 4,
      already: 0,
      removedSince: 0,
      created: 0,
      refused: [],
      error: null,
    });
    expect(report.conflicts).toEqual([
      {
        suggestionId: S.madonnaCity.id,
        target: { kind: 'artist', slug: 'madonna' },
        path: 'basedInPlaceId',
        reason: 'it holds something else',
      },
    ]);
    // Written again, the replace too (the new seed still held 1973)…
    expect(values(after)).toMatchObject({
      marvin: 'detroit',
      madonna: 'detroit',
      year: 1974,
    });
    expect(values(after).event).toMatchObject({
      placeId: 'memphis',
      artistIds: ['ike-turner'],
    });
    // …on top of the new seed, not over it…
    expect(bodyOf(after, 'artist', 'marvin-gaye').body.aliases).toEqual([
      'Marvin Pentz Gay Jr.',
    ]);
    // …as an admin save noted with the suggestions and their sources.
    const event = bodyOf(after, 'globe_event', 'evt-blues-memphis-1951');
    // Made together, replayed in the order they were made.
    expect(event.Revisions[0].note).toBe(
      `Replayed from decisions.json: Accepted 2 suggestions from the app (batch mb-2026-09-30): ${S.memphis.id}, ${S.ike.id}`,
    );
    expect(event.Revisions[0].authorId).toBe('admin-1');
    // The rejected accept stays out.
    expect(bodyOf(after, 'artist', 'marvin-gaye').body.born).toBeUndefined();

    // Replayed again, nothing moves.
    expect(after.replayCommittedDecisions()).toMatchObject({
      applied: 0,
      already: 4,
      conflicts: [{ suggestionId: S.madonnaCity.id }],
    });
    // The log is the committed file: nothing left to download.
    const listed = ok<{ decisions: { notDownloaded: number } }>(
      after.handle({ method: 'GET', path: '/suggestions', viewer: ADMIN }),
    );
    expect(listed.decisions.notDownloaded).toBe(0);
  });

  it('after a Reset, makes the records the accepts need, create-only', () => {
    const before = makeServer(seed);
    review(before);
    const committed = commit(before);

    const reset = makeServer(seed, committed);
    const report = reset.replayCommittedDecisions()!;
    expect(report).toMatchObject({ applied: 5, created: 1, conflicts: [] });
    expect(bodyOf(reset, 'globe_city', 'st-albans').body).toEqual(
      ST_ALBANS.body,
    );
    expect(bodyOf(reset, 'artist', 'madonna').body.basedInPlaceId).toBe(
      'st-albans',
    );
  });

  it('leaves out a value taken out by hand since, and never writes under a proposal', () => {
    const server = makeServer(seed);
    review(server);
    const committed = commit(server);
    // The owner clears Marvin Gaye's city by hand after accepting it.
    const cleared = { ...bodyOf(server, 'artist', 'marvin-gaye').body };
    delete cleared.basedInPlaceId;
    ok(
      server.handle({
        method: 'PUT',
        path: '/items',
        body: { kind: 'artist', slug: 'marvin-gaye', body: cleared },
        viewer: ADMIN,
      }),
    );
    // An editor proposes a change to the song the replace was for.
    const song = bodyOf(server, 'song', 'lets_get_it_on');
    ok(
      server.handle({
        method: 'PUT',
        path: '/items',
        body: {
          kind: 'song',
          slug: 'lets_get_it_on',
          body: { ...song.body, year: 1973 },
        },
        viewer: EDITOR,
      }),
    );

    // Reloaded: the saved state restores (the seed has not moved), and the
    // replay runs over it.
    const reload = makeServer(seed, committed);
    reload.restore(
      createMockStateCodec(reload).decode(
        JSON.parse(
          JSON.stringify(
            createMockStateCodec(server).encode(server.snapshot()),
          ),
        ),
      ),
    );
    const report = reload.replayCommittedDecisions()!;
    expect(report.removedSince).toBe(1);
    expect(bodyOf(reload, 'artist', 'marvin-gaye').body.basedInPlaceId).toBe(
      undefined,
    );
    expect(report.conflicts.map((c) => [c.suggestionId, c.reason])).toEqual([
      [S.tempoYear.id, 'a proposal waits on it; review that first'],
    ]);
    expect(report.applied).toBe(0);
  });

  it('reads a hand-merged file, reporting the rows it cannot use', () => {
    const server = makeServer(seed);
    review(server);
    const text = decisionsFileText(
      ok<DecisionsFile>(
        server.handle({
          method: 'GET',
          path: '/suggestions/decisions',
          viewer: ADMIN,
        }),
      ),
    ).replace('"op":"accept"', '"op":"accepted"');
    const parsed = parseDecisionsFile(text);
    expect(parsed.refused).toHaveLength(1);
    const reset = makeServer(seed, parsed);
    const report = reset.replayCommittedDecisions()!;
    expect(report.refused).toEqual(parsed.refused);
    expect(report.considered).toBe(4);

    expect(parseDecisionsFile('{ nope').error).toMatch(/JSON/);
    expect(parseDecisionsFile('{"decisions": 3}').error).toBe(
      'it has no decisions list',
    );
  });

  it('makes the records a decision kept, with no suggestion served', () => {
    const before = makeServer(seed);
    review(before);
    const committed = commit(before);
    // The app's suggestions are in no artifact: a store that plans none must
    // still make the place Madonna's city needs, from the decision itself.
    const bare = createContentMockServer({
      seed,
      mode: 'all',
      now: () => new Date(Date.UTC(2026, 9, 1) + (clock += 1000)),
      suggestions: { committed },
    });
    const report = bare.replayCommittedDecisions()!;
    expect(report).toMatchObject({ applied: 5, created: 1, conflicts: [] });
    expect(bodyOf(bare, 'globe_city', 'st-albans').body).toEqual(
      ST_ALBANS.body,
    );
    expect(bodyOf(bare, 'artist', 'madonna').body.basedInPlaceId).toBe(
      'st-albans',
    );
    expect(bodyOf(bare, 'artist', 'madonna').Revisions[0].note).toMatch(
      /sources not loaded/,
    );
  });

  it('writes what a seed dated after the decisions lost', () => {
    const before = makeServer(seed);
    review(before);
    // Decisions made before the seed's own date — as if the seed's date
    // moved on past them when it changed. Its bodies were still never saved
    // since, so nothing counts as taken out by hand.
    const early = commit(before).decisions.map((decision, index) => ({
      ...decision,
      at: new Date(SEED_EPOCH.getTime() - 86_400_000 + index).toISOString(),
    }));
    const reset = makeServer(seed, {
      decisions: early,
      refused: [],
      error: null,
    });
    expect(reset.replayCommittedDecisions()).toMatchObject({
      applied: 5,
      removedSince: 0,
    });
  });

  it('plans the suggestions once, however many items it writes', () => {
    // The app's Stage-1 sizes: a place for every hand-authored event, and a
    // list of artists for most of them.
    const events = seed.items.filter(
      (item) => item.kind === 'globe_event' && item.slug.startsWith('evt-'),
    );
    const cities = seed.items.filter((item) => item.kind === 'globe_city');
    const artists = seed.items.filter((item) => item.kind === 'artist');
    const app = [
      ...events.map((event, index) =>
        suggest('globe_event', event.slug, 'placeId', cities[index % 50].slug, {
          sources: [APP],
        }),
      ),
      ...events
        .slice(0, 500)
        .map((event, index) =>
          suggest(
            'globe_event',
            event.slug,
            'artistIds',
            [artists[index % artists.length].slug],
            { sources: [APP] },
          ),
        ),
    ];
    let planned = 0;
    const serverWith = (committed?: ParsedDecisionsFile) =>
      createContentMockServer({
        seed,
        mode: 'all',
        now: () => new Date(Date.UTC(2026, 9, 1) + (clock += 1000)),
        suggestions: {
          app: () => {
            planned += 1;
            return app;
          },
          committed,
        },
      });
    const reviewed = serverWith();
    decide(
      reviewed,
      app.map((s) => ({ suggestionId: s.id, op: 'accept', method: 'bulk' })),
    );
    const committed = commit(reviewed);
    expect(committed.decisions.length).toBeGreaterThan(1500);

    const reset = serverWith(committed);
    planned = 0;
    const started = performance.now();
    const report = reset.replayCommittedDecisions()!;
    const took = performance.now() - started;
    expect(report).toMatchObject({
      applied: committed.decisions.length,
      conflicts: [],
    });
    // Once for the whole replay, not once per item it saved.
    expect(planned).toBe(1);
    expect(took).toBeLessThan(15_000);
  }, 60_000);

  it('writes nothing in a store that has no committed file', () => {
    const server = makeServer(seed);
    expect(server.replayCommittedDecisions()).toBeNull();
    expect(bodyOf(server, 'artist', 'marvin-gaye').updatedAt).toEqual(
      SEED_EPOCH,
    );
  });
});
