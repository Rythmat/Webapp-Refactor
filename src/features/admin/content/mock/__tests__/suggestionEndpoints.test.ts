import { beforeAll, describe, expect, it } from 'vitest';
import { withoutProvenance } from '@/content/suggestions/apply';
import { suggestionId } from '@/content/suggestions/keys';
import type {
  RequiredRecord,
  Suggestion,
  SuggestionDecision,
  SuggestionSource,
  SuggestionTier,
} from '@/content/suggestions/types';
import type {
  ContentItemDetail,
  ContentListItem,
  ContentRelease,
} from '@/hooks/data/admin/useAdminContent';
import {
  createContentMockServer,
  type ContentMockServer,
  type MockSeed,
  type MockSuggestionSources,
  type MockViewer,
} from '../contentMockServer';
import {
  decisionsFileText,
  parseDecisionsFile,
  type DecisionResult,
  type DecisionsFile,
} from '../decisions';
import { createMockStateCodec } from '../persist';
import { loadSeed } from '../seed';
import type { PlannerInput, SuggestionRow } from '../suggestions';
import { seedBeforeImport } from './seedBeforeImport';

/**
 * `/suggestions` on the offline mock: what it serves, what a decision does
 * to the store, and what the log keeps (design decisions 9–10, §5.3; the
 * contract's §10 as the mock plays it).
 */

const ADMIN: MockViewer = { role: 'admin', userId: 'admin-1', name: 'Ada' };
const EDITOR: MockViewer = { role: 'editor', userId: 'ed-1', name: 'Eddie' };
const OTHER_EDITOR: MockViewer = {
  role: 'editor',
  userId: 'ed-2',
  name: 'Otto',
};

let seed: MockSeed;
let legacySeed: MockSeed;
beforeAll(async () => {
  // The repo before the bulk import of 30 September 2026, which wrote the
  // values these tests accept onto the items they name (seedBeforeImport.ts).
  const [all, legacy] = await Promise.all([
    loadSeed('all'),
    loadSeed('legacy'),
  ]);
  seed = seedBeforeImport(all);
  legacySeed = seedBeforeImport(legacy);
}, 60_000);

const MB: SuggestionSource = {
  provider: 'musicbrainz',
  url: 'https://musicbrainz.org/artist/afdb7919-059d-43c1-b668-ba1d265e7e42',
  label: 'area',
};
const WD: SuggestionSource = {
  provider: 'wikidata',
  url: 'https://www.wikidata.org/wiki/Q5950',
  label: 'P19',
};

/** A suggestion with its stable id, as a planner or the importer makes it. */
const suggest = (parts: {
  kind: string;
  slug: string;
  path: string;
  value: unknown;
  op?: 'set' | 'add';
  tier?: SuggestionTier;
  sources?: SuggestionSource[];
  requires?: RequiredRecord[];
  batch?: string;
}): Suggestion => {
  const target = { kind: parts.kind, slug: parts.slug };
  const op = parts.op ?? 'set';
  return {
    id: suggestionId({ target, path: parts.path, op, value: parts.value }),
    target,
    path: parts.path,
    op,
    value: parts.value,
    display: `${parts.path} ${JSON.stringify(parts.value)}`,
    sources: parts.sources ?? [MB],
    evidence: ['a test says so'],
    confidence: parts.tier === 'likely' ? 0.7 : 0.9,
    tier: parts.tier ?? 'sure',
    ...(parts.requires ? { requires: parts.requires } : {}),
    batch: parts.batch ?? 'mb-2026-09-30',
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

const IMPORTED = {
  marvinCity: suggest({
    kind: 'artist',
    slug: 'marvin-gaye',
    path: 'basedInPlaceId',
    value: 'detroit',
  }),
  marvinBorn: suggest({
    kind: 'artist',
    slug: 'marvin-gaye',
    path: 'born',
    value: { date: '1939-04-02', placeId: 'washington-dc' },
    sources: [MB, WD],
  }),
  madonnaCity: suggest({
    kind: 'artist',
    slug: 'madonna',
    path: 'basedInPlaceId',
    value: 'st-albans',
    tier: 'likely',
    requires: [ST_ALBANS],
  }),
  totoFrom: suggest({
    kind: 'artist',
    slug: 'toto',
    path: 'activeFrom',
    value: 1977,
    sources: [WD],
    batch: 'mb-2026-09-29',
  }),
};

const APP = {
  memphis: suggest({
    kind: 'globe_event',
    slug: 'evt-blues-memphis-1951',
    path: 'placeId',
    value: 'memphis',
    sources: [
      { provider: 'app', label: 'evt-blues-memphis-1951 location.city' },
    ],
    batch: 'app-stage1',
  }),
  ikeTurner: suggest({
    kind: 'globe_event',
    slug: 'evt-blues-memphis-1951',
    path: 'artistIds',
    value: ['ike-turner'],
    sources: [{ provider: 'app', label: 'evt-blues-memphis-1951 tags' }],
    batch: 'app-stage1',
  }),
  // One element onto a list no one has stored: unreachable (apply.ts).
  ikeAlone: suggest({
    kind: 'globe_event',
    slug: 'evt-blues-memphis-1951',
    path: 'artistIds[]',
    op: 'add',
    value: 'ike-turner',
    sources: [{ provider: 'app', label: 'evt-blues-memphis-1951 tags' }],
    batch: 'app-stage1',
  }),
  whatsGoingOnYear: suggest({
    kind: 'song',
    slug: 'whats_going_on',
    path: 'year',
    value: 1971,
    tier: 'likely',
    sources: [{ provider: 'app', label: 'song-whats_going_on year' }],
    batch: 'app-stage1',
  }),
  letsGetItOnYear: suggest({
    kind: 'song',
    slug: 'lets_get_it_on',
    path: 'year',
    value: 1974,
    tier: 'likely',
    sources: [{ provider: 'app', label: 'song-lets_get_it_on year' }],
    batch: 'app-stage1',
  }),
  // The importer's Marvin Gaye city, read from his song pins too.
  marvinCity: suggest({
    kind: 'artist',
    slug: 'marvin-gaye',
    path: 'basedInPlaceId',
    value: 'detroit',
    tier: 'likely',
    sources: [{ provider: 'app', label: 'artist_location "marvin gaye"' }],
    batch: 'app-stage1',
  }),
};

let clock = 0;
let planned = 0;
const makeServer = (sources: MockSuggestionSources = {}) =>
  createContentMockServer({
    seed,
    mode: 'all',
    now: () => new Date(Date.UTC(2026, 9, 1) + (clock += 1000)),
    suggestions: {
      imported: Object.values(IMPORTED),
      batches: [
        { batch: 'mb-2026-09-30', calibrated: true, measuredPrecision: 0.99 },
        { batch: 'mb-2026-09-29', calibrated: false, measuredPrecision: null },
      ],
      app: () => {
        planned += 1;
        return Object.values(APP);
      },
      ...sources,
    },
  });

const call = (
  server: ContentMockServer,
  method: string,
  path: string,
  {
    query,
    body,
    viewer = ADMIN,
  }: {
    query?: Record<string, string>;
    body?: unknown;
    viewer?: MockViewer;
  } = {},
) => server.handle({ method, path, query, body, viewer });

const ok = <T>(response: { status: number; body: unknown }): T => {
  if (response.status !== 200)
    throw new Error(
      `Expected 200, got ${response.status}: ${JSON.stringify(response.body)}`,
    );
  return response.body as T;
};

interface ListBody {
  items: SuggestionRow[];
  nextCursor: string | null;
  total: number;
  batches: {
    batch: string;
    providers: string[];
    count: number;
    calibrated: boolean | null;
  }[];
  decisions: { total: number; notDownloaded: number; proposed: number };
  notServed: { artifacts: string[]; planners: string | null };
}

const list = (
  server: ContentMockServer,
  query: Record<string, string> = {},
  viewer = ADMIN,
) => ok<ListBody>(call(server, 'GET', '/suggestions', { query, viewer }));

const rowOf = (
  server: ContentMockServer,
  suggestion: Suggestion,
  viewer = ADMIN,
) => list(server, { id: suggestion.id }, viewer).items[0];

const decideAll = (
  server: ContentMockServer,
  decisions: Record<string, unknown>[],
  viewer = ADMIN,
) =>
  ok<{ results: DecisionResult[] }>(
    call(server, 'POST', '/suggestions/decisions', {
      body: { decisions },
      viewer,
    }),
  ).results;

const decideOne = (
  server: ContentMockServer,
  decision: Record<string, unknown>,
  viewer = ADMIN,
) =>
  call(server, 'POST', '/suggestions/decisions', {
    body: { decisions: [decision] },
    viewer,
  });

const detailOf = (
  server: ContentMockServer,
  kind: string,
  slug: string,
  viewer = ADMIN,
) => {
  const { id } = ok<ContentListItem>(
    call(server, 'GET', '/items/lookup', { query: { kind, slug } }),
  );
  return ok<ContentItemDetail>(call(server, 'GET', `/items/${id}`, { viewer }));
};

const put = (
  server: ContentMockServer,
  input: Record<string, unknown>,
  viewer = ADMIN,
) => call(server, 'PUT', '/items', { body: input, viewer });

const download = (server: ContentMockServer, viewer = ADMIN) =>
  ok<DecisionsFile>(call(server, 'GET', '/suggestions/decisions', { viewer }));

const publish = (server: ContentMockServer, kind: string) => {
  const created = ok<{ releaseId: string; parts: number[] }>(
    call(server, 'POST', '/releases', { body: { kind } }),
  );
  for (const part of created.parts)
    ok(call(server, 'POST', `/releases/${created.releaseId}/parts/${part}`));
  return ok<ContentRelease>(
    call(server, 'POST', `/releases/${created.releaseId}/activate`),
  );
};

describe('the suggestion capability', () => {
  it('is on in the contract mode, and the endpoints are off in legacy', () => {
    const caps = ok<{ features: Record<string, boolean> }>(
      call(makeServer(), 'GET', '/capabilities'),
    );
    expect(caps.features.suggestions).toBe(true);

    const legacy = createContentMockServer({
      seed: legacySeed,
      mode: 'legacy',
    });
    expect(call(legacy, 'GET', '/suggestions').status).toBe(404);
    expect(call(legacy, 'GET', '/suggestions/decisions').status).toBe(404);
    expect(
      call(legacy, 'POST', '/suggestions/decisions', {
        body: { decisions: [{ suggestionId: 'x', op: 'reject' }] },
      }).status,
    ).toBe(404);
  });
});

describe('GET /suggestions', () => {
  it("serves the importer's and the app's, one row per id, sources pooled", () => {
    const server = makeServer();
    const all = list(server, { limit: '1000' });
    // Marvin Gaye's city is offered by both: one row, both sources, the
    // importer's surer tier.
    expect(all.total).toBe(
      Object.values(IMPORTED).length + Object.values(APP).length - 1,
    );
    const city = all.items.find(
      (row) => row.suggestion.id === IMPORTED.marvinCity.id,
    )!;
    expect(city.suggestion.tier).toBe('sure');
    expect(city.suggestion.sources.map((s) => s.provider)).toEqual([
      'musicbrainz',
      'app',
    ]);
    // In a stable order: kind, slug, path, id.
    const keys = all.items.map(
      (row) =>
        `${row.suggestion.target.kind}/${row.suggestion.target.slug}/${row.suggestion.path}`,
    );
    expect(keys).toEqual([...keys].sort());
    expect(all.batches).toEqual([
      {
        batch: 'app-stage1',
        providers: ['app'],
        count: 5,
        calibrated: null,
        measuredPrecision: null,
      },
      {
        batch: 'mb-2026-09-29',
        providers: ['wikidata'],
        count: 1,
        calibrated: false,
        measuredPrecision: null,
      },
      {
        batch: 'mb-2026-09-30',
        providers: ['app', 'musicbrainz', 'wikidata'],
        count: 3,
        calibrated: true,
        measuredPrecision: 0.99,
      },
    ]);
    expect(all.notServed).toEqual({ artifacts: [], planners: null });
  });

  it('filters by target, path, provider, tier, batch and id, and pages', () => {
    const server = makeServer();
    const ids = (query: Record<string, string>) =>
      list(server, query)
        .items.map((row) => row.suggestion.id)
        .sort();

    expect(ids({ kind: 'artist', slug: 'marvin-gaye' })).toEqual(
      [IMPORTED.marvinCity.id, IMPORTED.marvinBorn.id].sort(),
    );
    expect(ids({ kind: 'artist', slug: 'marvin-gaye,toto' })).toHaveLength(3);
    expect(ids({ path: 'year' })).toEqual(
      [APP.whatsGoingOnYear.id, APP.letsGetItOnYear.id].sort(),
    );
    expect(ids({ provider: 'wikidata' })).toEqual(
      [IMPORTED.marvinBorn.id, IMPORTED.totoFrom.id].sort(),
    );
    expect(ids({ tier: 'likely', kind: 'artist' })).toEqual([
      IMPORTED.madonnaCity.id,
    ]);
    expect(ids({ batch: 'mb-2026-09-29' })).toEqual([IMPORTED.totoFrom.id]);

    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const page: ListBody = list(server, {
        limit: '4',
        ...(cursor ? { cursor } : {}),
      });
      seen.push(...page.items.map((row) => row.suggestion.id));
      cursor = page.nextCursor;
      pages += 1;
    } while (cursor);
    expect(pages).toBe(3);
    expect(new Set(seen).size).toBe(9);
  });

  it('answers 400 for a filter it does not know', () => {
    const server = makeServer();
    const queries: Record<string, string>[] = [
      { status: 'maybe' },
      { decision: 'accepted,later' },
      { provider: 'discogs' },
      { tier: 'weak' },
      { kind: 'teach_day' },
      { limit: '0' },
      { cursor: 'nonsense' },
    ];
    for (const query of queries)
      expect(
        call(server, 'GET', '/suggestions', { query }).status,
        JSON.stringify(query),
      ).toBe(400);
  });

  it('gives each row its status against the body the viewer would save', () => {
    const server = makeServer();
    const status = (suggestion: Suggestion, viewer = ADMIN) =>
      rowOf(server, suggestion, viewer).status;
    expect(status(IMPORTED.marvinCity)).toBe('open');
    // 1973 is there already: side by side, with Replace.
    expect(status(APP.letsGetItOnYear)).toBe('conflict');
    // One element onto a list nobody has stored.
    expect(status(APP.ikeAlone)).toBe('unreachable');
    // No such item.
    const ghost = suggest({
      kind: 'artist',
      slug: 'nobody-at-all',
      path: 'activeFrom',
      value: 1990,
    });
    const withGhost = makeServer({ imported: [ghost] });
    expect(rowOf(withGhost, ghost).status).toBe('unreachable');

    // An editor's accept is theirs to see at once; the admin sees it waiting.
    const results = decideAll(
      server,
      [{ suggestionId: IMPORTED.marvinCity.id, op: 'accept' }],
      EDITOR,
    );
    expect(results[0].outcome).toBe('proposed');
    expect(status(IMPORTED.marvinCity, EDITOR)).toBe('applied');
    expect(status(IMPORTED.marvinCity)).toBe('accepted');
    expect(
      list(server, { status: 'accepted' }).items.map(
        (row) => row.suggestion.id,
      ),
    ).toEqual([IMPORTED.marvinCity.id]);
    expect(
      list(server, { decision: 'accepted' }).items.map(
        (row) => row.suggestion.id,
      ),
    ).toEqual([IMPORTED.marvinCity.id]);
  });

  it('plans the app suggestions from the store, again only after it changes', () => {
    let input: PlannerInput | null = null;
    const server = makeServer({
      app: (given) => {
        planned += 1;
        input = given;
        return Object.values(APP);
      },
    });
    const before = planned;
    list(server);
    list(server);
    expect(planned - before).toBe(1);
    expect(input!.events!.length).toBe(1723);
    // Every registry artist: 907 until the owner's 23 duplicate merges and the
    // removal of the album title "Remind In Light" (30 Sep 2026).
    expect(input!.artists!.length).toBe(883);
    expect(input!.songs!.length).toBe(640);
    expect(input!.imported).toHaveLength(Object.values(IMPORTED).length);

    decideAll(server, [{ suggestionId: APP.memphis.id, op: 'accept' }]);
    list(server);
    expect(planned - before).toBe(2);
  });

  it('keeps serving the importer when the planners throw, and says why', () => {
    const server = makeServer({
      app: () => {
        throw new Error('no matches');
      },
    });
    const body = list(server);
    expect(body.total).toBe(Object.values(IMPORTED).length);
    expect(body.notServed.planners).toBe('no matches');
    const none = makeServer({ app: null });
    expect(list(none).notServed.planners).toMatch(/not loaded/);
  });
});

describe('POST /suggestions/decisions', () => {
  it("writes an admin's accept as a direct save, noted with the id and sources", () => {
    const server = makeServer();
    const results = decideAll(server, [
      { suggestionId: IMPORTED.marvinCity.id, op: 'accept' },
      { suggestionId: IMPORTED.marvinBorn.id, op: 'accept', method: 'bulk' },
    ]);
    expect(results.map((r) => r.outcome)).toEqual(['saved', 'saved']);

    const marvin = detailOf(server, 'artist', 'marvin-gaye');
    expect(marvin.body.basedInPlaceId).toBe('detroit');
    // Born carries RefMeta, but an outside suggestion goes in bare: no
    // source, no unverified mark (owner decision of 30 September 2026).
    expect(marvin.body.born).toEqual({
      date: '1939-04-02',
      placeId: 'washington-dc',
    });
    // Both went in one save, whose note names them.
    expect(marvin.Revisions).toHaveLength(2);
    expect(marvin.Revisions[0].note).toBe(
      `Accepted 2 suggestions from an outside source and the app (batch mb-2026-09-30): ${IMPORTED.marvinCity.id}, ${IMPORTED.marvinBorn.id}`,
    );
    expect(marvin.Revisions[0].authorId).toBe('admin-1');

    const log = download(server).decisions;
    expect(log.map((d) => [d.suggestionId, d.op, d.method, d.by])).toEqual([
      [IMPORTED.marvinCity.id, 'accept', 'single', 'admin-1'],
      [IMPORTED.marvinBorn.id, 'accept', 'bulk', 'admin-1'],
    ]);
    expect(rowOf(server, IMPORTED.marvinBorn)).toMatchObject({
      status: 'applied',
      unreviewed: true,
    });
    // "Mark reviewed" (C29).
    decideAll(server, [{ suggestionId: IMPORTED.marvinBorn.id, op: 'review' }]);
    expect(rowOf(server, IMPORTED.marvinBorn).unreviewed).toBe(false);
    expect(list(server, { unreviewed: '1' }).total).toBe(0);
  });

  it("holds an editor's accept in their proposal until it is approved", () => {
    const server = makeServer();
    const [result] = decideAll(
      server,
      [{ suggestionId: APP.memphis.id, op: 'accept' }],
      EDITOR,
    );
    expect(result).toMatchObject({ outcome: 'proposed' });

    const event = detailOf(server, 'globe_event', 'evt-blues-memphis-1951');
    expect(event.body.placeId).toBeUndefined();
    expect(event.pendingBody?.placeId).toBe('memphis');
    expect(event.editState).toBe('pending');
    expect(event.pendingNote).toBe(
      `Accepted suggestion ${APP.memphis.id} from the app (batch app-stage1)`,
    );
    // Not the owner's until approved: not downloaded, not replayed.
    expect(download(server).decisions).toEqual([]);
    expect(list(server).decisions).toEqual({
      total: 1,
      notDownloaded: 0,
      proposed: 1,
    });

    ok(call(server, 'POST', `/items/${event.id}/approve`));
    expect(download(server).decisions.map((d) => d.by)).toEqual(['ed-1']);
    expect(rowOf(server, APP.memphis).status).toBe('applied');
  });

  it('takes a withdrawn proposal’s accepts out of the log', () => {
    const server = makeServer();
    decideAll(server, [{ suggestionId: APP.memphis.id, op: 'accept' }], EDITOR);
    const event = detailOf(server, 'globe_event', 'evt-blues-memphis-1951');
    ok(
      call(server, 'POST', `/items/${event.id}/discard-edit`, {
        viewer: EDITOR,
      }),
    );
    expect(list(server).decisions.total).toBe(0);
    expect(rowOf(server, APP.memphis).status).toBe('open');
  });

  it('will not write under a proposal: a clear 409 for an admin and for another editor', () => {
    const server = makeServer();
    const marvin = detailOf(server, 'artist', 'marvin-gaye');
    put(
      server,
      {
        kind: 'artist',
        slug: 'marvin-gaye',
        body: { ...marvin.body, activeFrom: 1957 },
        note: 'Years active',
      },
      EDITOR,
    );
    const admin = decideOne(server, {
      suggestionId: IMPORTED.marvinCity.id,
      op: 'accept',
    });
    expect(admin.status).toBe(409);
    expect(admin.body).toMatchObject({
      code: 'PENDING_PROPOSAL',
      suggestionId: IMPORTED.marvinCity.id,
    });
    expect((admin.body as { error: string }).error).toMatch(
      /proposal waiting from Eddie.*approved/,
    );
    expect(
      decideOne(
        server,
        { suggestionId: IMPORTED.marvinCity.id, op: 'accept' },
        OTHER_EDITOR,
      ).status,
    ).toBe(409);
    // The proposal's own author accepts into it.
    expect(
      decideAll(
        server,
        [{ suggestionId: IMPORTED.marvinCity.id, op: 'accept' }],
        EDITOR,
      )[0].outcome,
    ).toBe('proposed');
    const after = detailOf(server, 'artist', 'marvin-gaye', EDITOR);
    expect(after.pendingBody).toMatchObject({
      activeFrom: 1957,
      basedInPlaceId: 'detroit',
    });
    expect(list(server).decisions.total).toBe(1);
  });

  it('refuses a conflict until the owner replaces what they saw', () => {
    const server = makeServer();
    const accept = decideOne(server, {
      suggestionId: APP.letsGetItOnYear.id,
      op: 'accept',
    });
    expect(accept.status).toBe(409);
    expect(accept.body).toMatchObject({
      code: 'SUGGESTION_CONFLICT',
      current: 1973,
    });
    // A replace over something the owner did not see is a conflict too.
    expect(
      decideOne(server, {
        suggestionId: APP.letsGetItOnYear.id,
        op: 'replace',
        seen: 1972,
      }).status,
    ).toBe(409);

    const [replaced] = decideAll(server, [
      { suggestionId: APP.letsGetItOnYear.id, op: 'replace', seen: 1973 },
    ]);
    expect(replaced.outcome).toBe('saved');
    expect(detailOf(server, 'song', 'lets_get_it_on').body.year).toBe(1974);
    const [logged] = download(server).decisions;
    expect(logged).toMatchObject({ op: 'replace', value: 1974 });
    expect(logged.seenHash).toMatch(/^[0-9a-f]{16}$/);
    // The song's own event follows it, as after any admin song save.
    expect(
      detailOf(server, 'globe_event', 'song-lets_get_it_on').body.year,
    ).toBe(1974);
  });

  it('writes the value the owner changed, and logs that value', () => {
    const server = makeServer();
    decideAll(server, [
      { suggestionId: APP.whatsGoingOnYear.id, op: 'accept', value: 1970 },
    ]);
    expect(detailOf(server, 'song', 'whats_going_on').body.year).toBe(1970);
    const [logged] = download(server).decisions;
    expect(logged.value).toBe(1970);
    // The decision is still about the suggestion as offered.
    expect(rowOf(server, APP.whatsGoingOnYear).status).toBe('applied');
  });

  it('logs rejects, drops and reviews for admins only', () => {
    const server = makeServer();
    const editor = decideOne(
      server,
      { suggestionId: IMPORTED.totoFrom.id, op: 'reject' },
      EDITOR,
    );
    expect(editor.status).toBe(403);

    const results = decideAll(server, [
      { suggestionId: IMPORTED.totoFrom.id, op: 'reject' },
      { suggestionId: APP.marvinCity.id, op: 'drop' },
    ]);
    expect(results.map((r) => r.outcome)).toEqual(['recorded', 'recorded']);
    expect(rowOf(server, IMPORTED.totoFrom).status).toBe('rejected');
    // The app's Marvin Gaye city is the importer's too: one decision, one id.
    expect(rowOf(server, IMPORTED.marvinCity).status).toBe('dropped');
    expect(list(server, { decision: 'rejected,dropped' }).total).toBe(2);
    expect(detailOf(server, 'artist', 'toto').Revisions).toHaveLength(1);
  });

  it('creates the records a suggestion needs, create-only, before the item', () => {
    const server = makeServer();
    const [result] = decideAll(server, [
      { suggestionId: IMPORTED.madonnaCity.id, op: 'accept' },
    ]);
    expect(result.outcome).toBe('saved');
    const place = detailOf(server, 'globe_city', 'st-albans');
    expect(place.body).toEqual(ST_ALBANS.body);
    // Published, so it goes out with the next places release.
    expect(place.status).toBe('published');
    expect(place.Revisions[0].note).toBe(
      `Created for suggestion ${IMPORTED.madonnaCity.id}`,
    );
    expect(detailOf(server, 'artist', 'madonna').body.basedInPlaceId).toBe(
      'st-albans',
    );
  });

  it('makes no record for an accept that cannot be written', () => {
    const server = makeServer();
    const madonna = detailOf(server, 'artist', 'madonna');
    ok(
      put(server, {
        kind: 'artist',
        slug: 'madonna',
        body: { ...madonna.body, basedInPlaceId: 'detroit' },
      }),
    );
    const response = decideOne(server, {
      suggestionId: IMPORTED.madonnaCity.id,
      op: 'accept',
    });
    expect(response.body).toMatchObject({
      code: 'SUGGESTION_CONFLICT',
      current: 'detroit',
    });
    expect(
      call(server, 'GET', '/items/lookup', {
        query: { kind: 'globe_city', slug: 'st-albans' },
      }).status,
    ).toBe(404);
  });

  it('uses a place already there only when it is the same place (C33)', () => {
    const near = suggest({
      kind: 'artist',
      slug: 'toto',
      path: 'basedInPlaceId',
      value: 'st-albans',
      requires: [
        {
          ...ST_ALBANS,
          body: {
            ...(ST_ALBANS.body as object),
            coordinates: [40.75, -73.8],
            name: 'St Albans',
          },
        },
      ],
    });
    const far = suggest({
      kind: 'artist',
      slug: 'madonna',
      path: 'born',
      value: { placeId: 'st-albans' },
      requires: [
        {
          ...ST_ALBANS,
          body: {
            ...(ST_ALBANS.body as object),
            name: 'St Albans',
            country: 'GB',
            coordinates: [51.755, -0.336],
          },
        },
      ],
    });
    const server = makeServer({
      imported: [IMPORTED.madonnaCity, near, far],
    });
    decideAll(server, [
      { suggestionId: IMPORTED.madonnaCity.id, op: 'accept' },
    ]);
    // Same name (accents and punctuation aside), same country, 8 km away.
    expect(
      decideAll(server, [{ suggestionId: near.id, op: 'accept' }])[0].outcome,
    ).toBe('saved');
    const refused = decideOne(server, { suggestionId: far.id, op: 'accept' });
    expect(refused.status).toBe(409);
    expect(refused.body).toMatchObject({ code: 'REQUIRED_RECORD_TAKEN' });
    // Never written over.
    expect(detailOf(server, 'globe_city', 'st-albans').body.country).toBe('US');
    expect(detailOf(server, 'artist', 'madonna').body.born).toBeUndefined();
  });

  it('answers each decision of a batch, and 404 or 400 for a bad one alone', () => {
    const server = makeServer();
    const results = decideAll(server, [
      { suggestionId: APP.memphis.id, op: 'accept', method: 'bulk' },
      { suggestionId: APP.ikeAlone.id, op: 'accept', method: 'bulk' },
      { suggestionId: APP.ikeTurner.id, op: 'accept', method: 'bulk' },
      { suggestionId: 'feedfacefeedface', op: 'accept', method: 'bulk' },
    ]);
    expect(results.map((r) => r.outcome)).toEqual([
      'saved',
      'refused',
      'saved',
      'refused',
    ]);
    // One artist onto a list nobody has stored would drop every other
    // guessed artist from the graph: only the whole list may start it.
    expect(results[1]).toMatchObject({
      code: 'SUGGESTION_UNREACHABLE',
      status: 409,
    });
    expect(results[3]).toMatchObject({
      code: 'NO_SUCH_SUGGESTION',
      status: 404,
    });
    // The two accepts for the event are one save.
    const event = detailOf(server, 'globe_event', 'evt-blues-memphis-1951');
    expect(event.body).toMatchObject({
      placeId: 'memphis',
      artistIds: ['ike-turner'],
    });
    expect(event.Revisions).toHaveLength(2);

    expect(
      decideOne(server, { suggestionId: 'feedfacefeedface', op: 'reject' })
        .status,
    ).toBe(404);
    for (const body of [
      {},
      { decisions: [] },
      { decisions: [{ op: 'accept' }] },
      { decisions: [{ suggestionId: APP.memphis.id, op: 'undo' }] },
      {
        decisions: [
          { suggestionId: APP.memphis.id, op: 'accept', method: 'all' },
        ],
      },
    ])
      expect(
        call(server, 'POST', '/suggestions/decisions', { body }).status,
        JSON.stringify(body),
      ).toBe(400);
  });

  it('refuses what the body schema refuses, with its 422', () => {
    const bad = suggest({
      kind: 'artist',
      slug: 'toto',
      path: 'born',
      value: { date: '1977-13' },
    });
    const server = makeServer({ imported: [bad] });
    const response = decideOne(server, { suggestionId: bad.id, op: 'accept' });
    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({ code: 'VALIDATION_FAILED' });
    expect(list(server).decisions.total).toBe(0);
  });

  it('makes nothing for a save that would be refused, nor for a place the owner’s value no longer names', () => {
    const bad = suggest({
      kind: 'artist',
      slug: 'madonna',
      path: 'born',
      value: { date: '1958-8-16', placeId: 'st-albans' },
      requires: [ST_ALBANS],
    });
    const server = makeServer({ imported: [bad, IMPORTED.madonnaCity] });
    expect(
      decideOne(server, { suggestionId: bad.id, op: 'accept' }).status,
    ).toBe(422);
    // The place it needed was never made.
    expect(
      call(server, 'GET', '/items/lookup', {
        query: { kind: 'globe_city', slug: 'st-albans' },
      }).status,
    ).toBe(404);
    // Pointed at Detroit instead: St. Albans is not made, and the decision
    // keeps no record to make.
    const [edited] = decideAll(server, [
      { suggestionId: IMPORTED.madonnaCity.id, op: 'accept', value: 'detroit' },
    ]);
    expect(edited).toMatchObject({ outcome: 'saved' });
    expect(
      call(server, 'GET', '/items/lookup', {
        query: { kind: 'globe_city', slug: 'st-albans' },
      }).status,
    ).toBe(404);
    expect(download(server).decisions[0]).not.toHaveProperty('requires');
  });

  it('keeps the records an accept made in its decision', () => {
    const server = makeServer();
    decideAll(server, [
      { suggestionId: IMPORTED.madonnaCity.id, op: 'accept' },
    ]);
    expect(download(server).decisions[0]).toMatchObject({
      suggestionId: IMPORTED.madonnaCity.id,
      value: 'st-albans',
      requires: [ST_ALBANS],
    });
  });

  it('uses a place the store has under another slug, and writes that slug (C33)', () => {
    const queens = suggest({
      kind: 'artist',
      slug: 'toto',
      path: 'basedInPlaceId',
      value: 'st-albans-queens',
      tier: 'likely',
      requires: [
        {
          kind: 'globe_city',
          slug: 'st-albans-queens',
          body: {
            ...(ST_ALBANS.body as object),
            id: 'st-albans-queens',
            name: 'St Albans',
            coordinates: [40.69, -73.76],
          },
        },
      ],
    });
    const server = makeServer({ imported: [IMPORTED.madonnaCity, queens] });
    decideAll(server, [
      { suggestionId: IMPORTED.madonnaCity.id, op: 'accept' },
    ]);
    const [result] = decideAll(server, [
      { suggestionId: queens.id, op: 'accept' },
    ]);
    expect(result).toMatchObject({ outcome: 'saved' });
    expect(detailOf(server, 'artist', 'toto').body.basedInPlaceId).toBe(
      'st-albans',
    );
    expect(
      call(server, 'GET', '/items/lookup', {
        query: { kind: 'globe_city', slug: 'st-albans-queens' },
      }).status,
    ).toBe(404);
    // Logged as written, so a replay writes the same place.
    const [, logged] = download(server).decisions;
    expect(logged).toMatchObject({ value: 'st-albans' });
    expect(logged).not.toHaveProperty('requires');
    expect(rowOf(server, queens).status).toBe('applied');
  });

  it('accepts in bulk only for an admin, and only what bulk may take', () => {
    const server = makeServer();
    const refusal = (decision: Record<string, unknown>, viewer = ADMIN) => {
      const response = decideOne(
        server,
        { ...decision, op: decision.op ?? 'accept', method: 'bulk' },
        viewer,
      );
      return [response.status, (response.body as { error?: string }).error];
    };
    // A song's year is accepted one at a time (C15).
    expect(refusal({ suggestionId: APP.whatsGoingOnYear.id })).toEqual([
      422,
      'Not accepted in bulk: a song’s year is accepted one at a time: a person checks it.',
    ]);
    // The importer's sure tier waits for its batch to be calibrated.
    expect(refusal({ suggestionId: IMPORTED.totoFrom.id })).toEqual([
      422,
      "Not accepted in bulk: the importer's sure tier is not calibrated yet.",
    ]);
    // An editor accepts one at a time, for an admin to review.
    expect(refusal({ suggestionId: APP.memphis.id }, EDITOR)[0]).toBe(403);
    // A replace, or a changed value, is a person's call.
    expect(
      refusal({ suggestionId: APP.memphis.id, op: 'replace', seen: 'x' })[0],
    ).toBe(422);
    expect(refusal({ suggestionId: APP.memphis.id, value: 'detroit' })[0]).toBe(
      422,
    );
    // Rejected before: never put back in bulk.
    decideAll(server, [{ suggestionId: APP.ikeTurner.id, op: 'reject' }]);
    expect(refusal({ suggestionId: APP.ikeTurner.id })).toEqual([
      422,
      'Not accepted in bulk: it was rejected.',
    ]);
    // A City read from song pins is a person's to check, however sure the
    // importer is of it too (one suggestion with the app's song pin).
    expect(refusal({ suggestionId: IMPORTED.marvinCity.id })).toEqual([
      422,
      'Not accepted in bulk: a City read from song pins is never accepted in bulk: a person checks it.',
    ]);
    // What bulk may take goes through: the importer's calibrated sure row,
    // and the app's sure place.
    expect(
      decideAll(server, [
        { suggestionId: IMPORTED.marvinBorn.id, op: 'accept', method: 'bulk' },
        { suggestionId: APP.memphis.id, op: 'accept', method: 'bulk' },
      ]).map((r) => r.outcome),
    ).toEqual(['saved', 'saved']);
    // Sent again, it is there already: nothing is logged twice.
    expect(refusal({ suggestionId: APP.memphis.id })).toEqual([
      422,
      'Not accepted in bulk: the item says it already.',
    ]);
    expect(list(server).decisions.total).toBe(3);
  });

  it('will not write beside a proposal that was sent back, either', () => {
    const server = makeServer();
    decideAll(server, [{ suggestionId: APP.memphis.id, op: 'accept' }], EDITOR);
    const event = detailOf(server, 'globe_event', 'evt-blues-memphis-1951');
    ok(
      call(server, 'POST', `/items/${event.id}/reject`, {
        body: { note: 'Not yet' },
      }),
    );
    const other = decideOne(
      server,
      { suggestionId: APP.ikeTurner.id, op: 'accept' },
      OTHER_EDITOR,
    );
    expect(other.status).toBe(409);
    expect((other.body as { error: string }).error).toMatch(
      /sent back to Eddie.*replace their proposal/,
    );
    expect(
      decideOne(server, { suggestionId: APP.ikeTurner.id, op: 'accept' })
        .status,
    ).toBe(409);
    // Eddie's proposal is as he left it.
    const after = detailOf(server, 'globe_event', 'evt-blues-memphis-1951');
    expect(after.pendingById).toBe('ed-1');
    expect(after.pendingBody?.placeId).toBe('memphis');
    expect(after.pendingBody?.artistIds).toBeUndefined();
  });

  it('confirms on approval only the accepts the proposal still holds', () => {
    const server = makeServer();
    decideAll(
      server,
      [
        { suggestionId: APP.memphis.id, op: 'accept' },
        { suggestionId: APP.ikeTurner.id, op: 'accept' },
      ],
      EDITOR,
    );
    const event = detailOf(
      server,
      'globe_event',
      'evt-blues-memphis-1951',
      EDITOR,
    );
    // The editor takes the place out again before anyone approves.
    const edited = { ...event.pendingBody! };
    delete edited.placeId;
    ok(
      put(
        server,
        { kind: 'globe_event', slug: 'evt-blues-memphis-1951', body: edited },
        EDITOR,
      ),
    );
    expect(list(server).decisions).toMatchObject({ total: 1, proposed: 1 });
    ok(call(server, 'POST', `/items/${event.id}/approve`));
    expect(download(server).decisions.map((d) => d.suggestionId)).toEqual([
      APP.ikeTurner.id,
    ]);
    // A replay after a Reset writes only what was approved.
    const reset = makeServer({
      committed: parseDecisionsFile(decisionsFileText(download(server))),
    });
    reset.replayCommittedDecisions();
    expect(
      detailOf(reset, 'globe_event', 'evt-blues-memphis-1951').body,
    ).toMatchObject({ artistIds: ['ike-turner'] });
    expect(
      detailOf(reset, 'globe_event', 'evt-blues-memphis-1951').body.placeId,
    ).toBeUndefined();
  });
});

describe('the decisions log', () => {
  it('downloads as decisions.json, and reads back the same', () => {
    const server = makeServer();
    decideAll(server, [
      { suggestionId: IMPORTED.marvinCity.id, op: 'accept' },
      { suggestionId: IMPORTED.totoFrom.id, op: 'reject' },
    ]);
    const file = download(server);
    expect(file.artifactsVersion).toBe(1);
    expect(file.decisions).toHaveLength(2);
    const text = decisionsFileText(file);
    // One decision per line, so a review session reads as the lines it adds.
    expect(
      text.split('\n').filter((line) => line.startsWith('    {')),
    ).toHaveLength(2);
    expect(parseDecisionsFile(text)).toEqual({
      decisions: file.decisions,
      refused: [],
      error: null,
    });
    // An editor may download it too.
    expect(download(server, EDITOR)).toEqual(file);
    expect(list(server).decisions.notDownloaded).toBe(2);
  });

  it('counts only what the committed file lacks as not downloaded', () => {
    const first = makeServer();
    decideAll(first, [{ suggestionId: IMPORTED.totoFrom.id, op: 'reject' }]);
    const committed = parseDecisionsFile(decisionsFileText(download(first)));

    const server = makeServer({ committed });
    expect(list(server).decisions).toEqual({
      total: 1,
      notDownloaded: 0,
      proposed: 0,
    });
    expect(rowOf(server, IMPORTED.totoFrom).status).toBe('rejected');
    decideAll(server, [{ suggestionId: APP.memphis.id, op: 'accept' }]);
    expect(list(server).decisions.notDownloaded).toBe(1);
    expect(download(server).decisions).toHaveLength(2);
  });

  it('is saved with the store and restored whole', () => {
    const server = makeServer();
    decideAll(server, [{ suggestionId: APP.memphis.id, op: 'accept' }], EDITOR);
    decideAll(server, [{ suggestionId: IMPORTED.totoFrom.id, op: 'reject' }]);
    const text = JSON.stringify(
      createMockStateCodec(server).encode(server.snapshot()),
    );
    const restored = makeServer();
    restored.restore(createMockStateCodec(restored).decode(JSON.parse(text)));
    expect(restored.snapshot().decisions).toEqual(server.snapshot().decisions);
    expect(list(restored).decisions).toEqual({
      total: 2,
      notDownloaded: 1,
      proposed: 1,
    });

    // A log that cannot be read fails the load, as any bad saved part does.
    const broken = JSON.parse(text) as { decisions: SuggestionDecision[] };
    broken.decisions[0] = { ...broken.decisions[0], op: 'undo' as never };
    expect(() => createMockStateCodec(restored).decode(broken)).toThrow(
      /bad decision/,
    );
  });
});

describe('an artist release', () => {
  it("derives its lead acts' song events again when their city moves", () => {
    const server = makeServer();
    const pinned = () =>
      detailOf(server, 'globe_event', 'song-whats_going_on').body.location as {
        city: string;
      };
    const washington = pinned().city;
    expect(washington).toBe('Washington');

    decideAll(server, [{ suggestionId: IMPORTED.marvinCity.id, op: 'accept' }]);
    // Saved, not yet released: the pins stay where they are.
    expect(pinned().city).toBe(washington);

    const release = publish(server, 'artist');
    expect(pinned().city).toBe('Detroit');
    const event = detailOf(server, 'globe_event', 'song-whats_going_on');
    expect(event.Revisions[0].note).toBe(
      `Derived again: its lead act's basedInPlaceId changed in artist v${release.version}`,
    );
    // Another act's songs are left alone.
    expect(
      (detailOf(server, 'globe_event', 'song-africa').Revisions as unknown[])
        .length,
    ).toBe(1);

    // Rolled back, the events are derived again, and the pin stays: only a
    // live basedInPlaceId moves an existing pin (the song-pin city does not).
    ok(
      call(server, 'POST', '/rollback', {
        body: { kind: 'artist', version: release.version - 1 },
      }),
    );
    expect(pinned().city).toBe('Detroit');
  });
});

describe('reopening a reject', () => {
  it('puts a rejected or dropped suggestion back on offer, and logs it', () => {
    const server = makeServer();
    decideAll(server, [
      { suggestionId: APP.memphis.id, op: 'reject' },
      { suggestionId: IMPORTED.totoFrom.id, op: 'drop' },
    ]);
    const results = decideAll(server, [
      { suggestionId: APP.memphis.id, op: 'reopen' },
      { suggestionId: IMPORTED.totoFrom.id, op: 'reopen' },
    ]);
    expect(results.map((r) => r.outcome)).toEqual(['recorded', 'recorded']);
    expect(rowOf(server, APP.memphis)).toMatchObject({
      status: 'open',
      decision: null,
    });
    expect(rowOf(server, IMPORTED.totoFrom).status).toBe('open');
    // The reject stays in the log beneath the reopen, and both download.
    expect(
      download(server).decisions.map((d) => [d.suggestionId, d.op]),
    ).toEqual([
      [APP.memphis.id, 'reject'],
      [IMPORTED.totoFrom.id, 'drop'],
      [APP.memphis.id, 'reopen'],
      [IMPORTED.totoFrom.id, 'reopen'],
    ]);
    // Open again, bulk may take it again.
    expect(
      decideAll(server, [
        { suggestionId: APP.memphis.id, op: 'accept', method: 'bulk' },
      ])[0].outcome,
    ).toBe('saved');
  });

  it('is an admin’s, and only of a reject or a drop', () => {
    const server = makeServer();
    decideAll(server, [{ suggestionId: APP.memphis.id, op: 'reject' }]);
    expect(
      decideOne(server, { suggestionId: APP.memphis.id, op: 'reopen' }, EDITOR)
        .status,
    ).toBe(403);

    // Nothing to reopen: never decided, or accepted (an accept is taken
    // back by editing the item).
    const open = decideOne(server, {
      suggestionId: APP.ikeTurner.id,
      op: 'reopen',
    });
    expect(open.status).toBe(409);
    expect(open.body).toMatchObject({ code: 'NOT_REOPENABLE' });
    decideAll(server, [{ suggestionId: APP.ikeTurner.id, op: 'accept' }]);
    expect(
      decideOne(server, { suggestionId: APP.ikeTurner.id, op: 'reopen' }).body,
    ).toMatchObject({ code: 'NOT_REOPENABLE', error: /editing its item/ });
    expect(rowOf(server, APP.ikeTurner).status).toBe('applied');
    expect(list(server).decisions.total).toBe(2);
  });

  it('is never replayed as an accept: reopening a reject puts back the offer, not the value', () => {
    const first = makeServer();
    decideAll(first, [{ suggestionId: APP.memphis.id, op: 'accept' }]);
    // Taken back: out of the item by hand, then rejected.
    const without = {
      ...detailOf(first, 'globe_event', 'evt-blues-memphis-1951').body,
    } as Record<string, unknown>;
    delete without.placeId;
    ok(
      put(first, {
        kind: 'globe_event',
        slug: 'evt-blues-memphis-1951',
        body: without,
      }),
    );
    decideAll(first, [{ suggestionId: APP.memphis.id, op: 'reject' }]);
    decideAll(first, [{ suggestionId: APP.memphis.id, op: 'reopen' }]);
    const reset = makeServer({
      committed: parseDecisionsFile(decisionsFileText(download(first))),
    });
    expect(reset.replayCommittedDecisions()).toMatchObject({
      considered: 0,
      applied: 0,
    });
    expect(rowOf(reset, APP.memphis).status).toBe('open');
  });
});

describe('the bulk threshold', () => {
  const cautious = suggest({
    kind: 'globe_event',
    slug: 'evt-blues-memphis-1951',
    path: 'placeId',
    value: 'memphis',
    sources: [{ provider: 'app', label: 'evt-blues-memphis-1951 location' }],
    batch: 'app-stage1',
  });
  const at = (confidence: number) => ({ ...cautious, confidence });
  const bulk = (
    server: ContentMockServer,
    suggestion: Suggestion,
    threshold?: unknown,
  ) =>
    call(server, 'POST', '/suggestions/decisions', {
      body: {
        decisions: [
          { suggestionId: suggestion.id, op: 'accept', method: 'bulk' },
        ],
        ...(threshold !== undefined ? { threshold } : {}),
      },
    });

  it('takes what the owner set, from 0.85 down to 0.7', () => {
    const server = makeServer({ imported: [], app: () => [at(0.75)] });
    expect(bulk(server, cautious).body).toMatchObject({
      code: 'NOT_BULK',
      error: 'Not accepted in bulk: its confidence is below 85%.',
    });
    expect(bulk(server, cautious, 0.8).body).toMatchObject({
      error: 'Not accepted in bulk: its confidence is below 80%.',
    });
    expect(bulk(server, cautious, 0.75).status).toBe(200);
  });

  it('never goes below 0.7, whatever is sent', () => {
    const server = makeServer({ imported: [], app: () => [at(0.65)] });
    expect(bulk(server, cautious, 0.5).body).toMatchObject({
      error: 'Not accepted in bulk: its confidence is below 70%.',
    });
    // A single accept is a person's, and no threshold applies.
    expect(
      decideAll(server, [{ suggestionId: cautious.id, op: 'accept' }])[0]
        .outcome,
    ).toBe('saved');
  });

  it('answers 400 for a threshold that is not a confidence', () => {
    const server = makeServer();
    for (const threshold of ['0.8', 1.5, -1, null])
      expect(
        bulk(server, APP.memphis, threshold).status,
        String(threshold),
      ).toBe(400);
  });
});

describe('the song half’s records', () => {
  const RELEASE_GROUP = 'e7e8ba1f-4f34-3a4d-8ec2-2c7e3a0c4b7d';
  const TAMLA = '5a584f3c-bb5a-4ee1-9f47-5a9dc6a4cf13';
  const WHATS_GOING_ON: RequiredRecord = {
    kind: 'release',
    slug: 'marvin-gaye-whats-going-on',
    body: {
      slug: 'marvin-gaye-whats-going-on',
      title: 'What’s Going On',
      artistIds: ['marvin-gaye'],
      format: 'album',
      year: 1971,
      externalIds: { mbid: RELEASE_GROUP },
      unverified: true,
      source: 'musicbrainz',
    },
  };
  const tamla = (mbid: string): RequiredRecord => ({
    kind: 'label',
    slug: 'tamla-us',
    body: {
      slug: 'tamla-us',
      name: 'Tamla',
      unverified: true,
      source: `https://musicbrainz.org/label/${mbid}`,
    },
  });
  const SONGS = 'mb-songs-2026-09-30';
  const album = suggest({
    kind: 'song',
    slug: 'whats_going_on',
    path: 'releases[]',
    op: 'add',
    value: {
      releaseId: WHATS_GOING_ON.slug,
      track: 1,
      unverified: true,
      source: 'musicbrainz',
    },
    requires: [WHATS_GOING_ON],
    batch: SONGS,
  });
  const label: Suggestion = {
    ...suggest({
      kind: 'release',
      slug: WHATS_GOING_ON.slug,
      path: 'labelId',
      value: 'tamla-us',
      requires: [WHATS_GOING_ON, tamla(TAMLA)],
      batch: SONGS,
    }),
    dependsOn: album.id,
  };
  const studio = suggest({
    kind: 'song',
    slug: 'whats_going_on',
    path: 'session.studioId',
    value: 'hitsville-u-s-a',
    batch: SONGS,
  });
  const credit = suggest({
    kind: 'song',
    slug: 'whats_going_on',
    path: 'credits[]',
    op: 'add',
    value: {
      name: 'James Jamerson',
      role: 'performer',
      instrument: 'bass',
      unverified: true,
      source:
        'https://musicbrainz.org/artist/6f5b1a4b-23c9-4b35-a8e5-b6f4a6d4b4a1',
    },
    batch: SONGS,
  });
  const songServer = (extra: Suggestion[] = []) =>
    makeServer({
      imported: [album, label, studio, credit, ...extra],
      batches: [{ batch: SONGS, calibrated: false, measuredPrecision: null }],
      app: null,
    });

  it('labels a release only once an Album row has made it, and never matches the release it labels', () => {
    const server = songServer();
    // Before the Album row: the release does not exist yet.
    expect(rowOf(server, label).status).toBe('unreachable');
    const early = decideOne(server, { suggestionId: label.id, op: 'accept' });
    expect(early.status).toBe(404);
    expect((early.body as { error: string }).error).toMatch(
      /made when a suggestion that needs it is accepted/,
    );
    expect(
      call(server, 'GET', '/items/lookup', {
        query: { kind: 'label', slug: 'tamla-us' },
      }).status,
    ).toBe(404);

    decideAll(server, [{ suggestionId: album.id, op: 'accept' }]);
    // Made bare: no outside id, source or unverified mark.
    expect(detailOf(server, 'release', WHATS_GOING_ON.slug).body).toEqual(
      withoutProvenance(WHATS_GOING_ON.body),
    );
    // Edited since: the Label row writes into it all the same.
    ok(
      put(server, {
        kind: 'release',
        slug: WHATS_GOING_ON.slug,
        body: { ...(WHATS_GOING_ON.body as object), year: 1972 },
      }),
    );
    expect(rowOf(server, label).status).toBe('open');
    expect(
      decideAll(server, [{ suggestionId: label.id, op: 'accept' }])[0].outcome,
    ).toBe('saved');
    expect(detailOf(server, 'release', WHATS_GOING_ON.slug).body).toMatchObject(
      { labelId: 'tamla-us', year: 1972 },
    );
    expect(detailOf(server, 'label', 'tamla-us').body).toEqual(
      withoutProvenance(tamla(TAMLA).body),
    );
  });

  // The records an outside suggestion makes keep no outside id now (owner
  // decision of 30 September 2026), so one already there is the same record
  // only when it says the same once both are bare, as for the import.
  it('uses a label already there that says the same; one edited since is for a person (C33)', () => {
    const again = suggest({
      kind: 'song',
      slug: 'lets_get_it_on',
      path: 'session.labelId',
      value: 'tamla-us',
      requires: [tamla(TAMLA)],
      batch: SONGS,
    });
    const namesake = suggest({
      kind: 'song',
      slug: 'aint_no_mountain_high_enough',
      path: 'session.labelId',
      value: 'tamla-us',
      requires: [tamla('00000000-0000-4000-8000-000000000000')],
      batch: SONGS,
    });
    const server = songServer([again, namesake]);
    decideAll(server, [{ suggestionId: album.id, op: 'accept' }]);
    decideAll(server, [{ suggestionId: label.id, op: 'accept' }]);
    expect(
      decideAll(server, [{ suggestionId: again.id, op: 'accept' }])[0].outcome,
    ).toBe('saved');
    // The owner places the label: a record that says more than the one a
    // suggestion would make is left for a person to match.
    ok(
      put(server, {
        kind: 'label',
        slug: 'tamla-us',
        body: {
          ...(withoutProvenance(tamla(TAMLA).body) as object),
          placeId: 'detroit',
        },
      }),
    );
    expect(
      decideOne(server, { suggestionId: namesake.id, op: 'accept' }).body,
    ).toMatchObject({ code: 'REQUIRED_RECORD_TAKEN' });
    expect(detailOf(server, 'label', 'tamla-us').body.placeId).toBe('detroit');
  });

  it("fills the studio's name beside its id, and writes an outside credit bare (C20)", () => {
    const server = songServer();
    decideAll(server, [
      { suggestionId: studio.id, op: 'accept' },
      { suggestionId: credit.id, op: 'accept' },
    ]);
    const song = detailOf(server, 'song', 'whats_going_on').body;
    // No catalogue named and no catalogue link kept (owner decision of 30
    // September 2026); the decision log keeps the trail.
    expect(song.session).toEqual({
      studioId: 'hitsville-u-s-a',
      studio: 'Hitsville U.S.A.',
    });
    expect((song.credits as unknown[]).at(-1)).toEqual({
      name: 'James Jamerson',
      role: 'performer',
      instrument: 'bass',
    });
  });

  it('replays an Album row and then its Label row after a Reset: the release made again is written into', () => {
    const server = songServer();
    decideAll(server, [{ suggestionId: album.id, op: 'accept' }]);
    decideAll(server, [{ suggestionId: label.id, op: 'accept' }]);
    const replayed = createContentMockServer({
      seed,
      mode: 'all',
      now: () => new Date(Date.UTC(2026, 9, 1) + (clock += 1000)),
      suggestions: {
        imported: [album, label, studio, credit],
        committed: parseDecisionsFile(decisionsFileText(download(server))),
      },
    });
    expect(replayed.replayCommittedDecisions()).toMatchObject({
      considered: 2,
      applied: 2,
      removedSince: 0,
      created: 2,
      conflicts: [],
    });
    expect(detailOf(replayed, 'release', WHATS_GOING_ON.slug).body).toEqual({
      ...withoutProvenance(WHATS_GOING_ON.body as object),
      labelId: 'tamla-us',
    });
  });

  it('approves the records an editor’s accepts made with the item that names them', () => {
    const server = songServer();
    // The editor accepts the Album row, then the Label row on the release
    // it made: each record is a new proposal of theirs.
    decideAll(server, [{ suggestionId: album.id, op: 'accept' }], EDITOR);
    decideAll(server, [{ suggestionId: label.id, op: 'accept' }], EDITOR);
    const pendingOf = (kind: string, slug: string) =>
      detailOf(server, kind, slug).editState;
    expect(pendingOf('release', WHATS_GOING_ON.slug)).toBe('pending');
    expect(pendingOf('label', 'tamla-us')).toBe('pending');

    const song = detailOf(server, 'song', 'whats_going_on');
    ok(call(server, 'POST', `/items/${song.id}/approve`));
    // The song never goes live naming a record that is only a proposal.
    for (const [kind, slug] of [
      ['release', WHATS_GOING_ON.slug],
      ['label', 'tamla-us'],
    ]) {
      const record = detailOf(server, kind, slug);
      expect(record.editState, slug).toBeNull();
      expect(record.status, slug).toBe('published');
    }
    expect(detailOf(server, 'release', WHATS_GOING_ON.slug).body).toMatchObject(
      { labelId: 'tamla-us' },
    );
    // Every accept is the owner's now: downloaded, and replayed as the
    // store has it.
    expect(
      download(server).decisions.map((decision) => decision.suggestionId),
    ).toEqual([album.id, label.id]);
    expect(rowOf(server, album).status).toBe('applied');
    expect(rowOf(server, label).status).toBe('applied');
  });

  it('stops an approval whose accepts name another editor’s proposed record', () => {
    const server = songServer();
    decideAll(server, [{ suggestionId: album.id, op: 'accept' }], EDITOR);
    // The release is Eddie's proposal; Otto's accept on another song names
    // the same release.
    const release = detailOf(server, 'release', WHATS_GOING_ON.slug);
    const song = detailOf(server, 'song', 'whats_going_on');
    // Handed to Otto, as if he had proposed it.
    ok(
      put(
        server,
        {
          kind: 'release',
          slug: WHATS_GOING_ON.slug,
          body: release.pendingBody ?? release.body,
        },
        OTHER_EDITOR,
      ),
    );
    const answer = call(server, 'POST', `/items/${song.id}/approve`);
    expect(answer.status).toBe(409);
    expect((answer.body as { code: string }).code).toBe('PENDING_PROPOSAL');
    expect(detailOf(server, 'song', 'whats_going_on').editState).toBe(
      'pending',
    );
  });

  it('accepts none of them in bulk while the song half is not calibrated', () => {
    const server = songServer();
    for (const row of [album, studio, credit])
      expect(
        decideOne(server, {
          suggestionId: row.id,
          op: 'accept',
          method: 'bulk',
        }).body,
      ).toMatchObject({
        code: 'NOT_BULK',
        error:
          "Not accepted in bulk: the importer's sure tier is not calibrated yet.",
      });
  });
});

describe('what a decision rests on, and what it undoes', () => {
  const identity = suggest({
    kind: 'artist',
    slug: 'marvin-gaye',
    path: 'externalIds.mbid',
    value: 'afdb7919-059d-43c1-b668-ba1d265e7e42',
  });
  const from: Suggestion = {
    ...suggest({
      kind: 'artist',
      slug: 'marvin-gaye',
      path: 'activeFrom',
      value: 1959,
    }),
    dependsOn: identity.id,
  };
  const studio: Suggestion = {
    ...suggest({
      kind: 'song',
      slug: 'whats_going_on',
      path: 'session.studioId',
      value: 'hitsville-u-s-a',
    }),
    dependsOn: identity.id,
  };
  const server = () =>
    makeServer({ imported: [identity, from, studio], app: null });
  const inBulk = (on: ContentMockServer, suggestion: Suggestion) =>
    decideOne(on, {
      suggestionId: suggestion.id,
      op: 'accept',
      method: 'bulk',
    });
  const RESTS_ON =
    'Not accepted in bulk: the suggestion it rests on is not accepted yet.';

  it('serves how another item’s suggestion stands beside a row that rests on it', () => {
    // An identity row stands as the import takes it (next test), so this
    // one rests on the act's City instead.
    const city = suggest({
      kind: 'artist',
      slug: 'marvin-gaye',
      path: 'basedInPlaceId',
      value: 'detroit',
    });
    const onCity: Suggestion = { ...studio, dependsOn: city.id };
    const on = makeServer({ imported: [city, onCity], app: null });
    const song = () => list(on, { kind: 'song' }).items[0];
    expect(song().dependency).toEqual({
      id: city.id,
      target: city.target,
      path: city.path,
      display: city.display,
      status: 'open',
      stands: false,
    });
    // An editor's accept waits in their proposal: it is in the body their
    // saves build on, and does not stand yet.
    decideAll(on, [{ suggestionId: city.id, op: 'accept' }], EDITOR);
    expect(
      list(on, { kind: 'song' }, EDITOR).items[0].dependency,
    ).toMatchObject({ status: 'applied', stands: false });
    expect(song().dependency).toMatchObject({
      status: 'accepted',
      stands: false,
    });
    expect(inBulk(on, onCity).body).toMatchObject({ error: RESTS_ON });

    const artist = detailOf(on, 'artist', 'marvin-gaye');
    ok(call(on, 'POST', `/items/${artist.id}/approve`));
    expect(song().dependency).toMatchObject({
      status: 'applied',
      stands: true,
    });
    expect(inBulk(on, onCity).status).toBe(200);
  });

  it('takes an identity row, never written nor shown, as given while the import would take it', () => {
    const on = server();
    const song = () => list(on, { kind: 'song' }).items[0];
    // Open and sure: it stands, so the row resting on it can go in bulk.
    expect(song().dependency).toMatchObject({
      id: identity.id,
      status: 'open',
      stands: true,
    });
    expect(inBulk(on, studio).status).toBe(200);
    // Rejected, it no longer does.
    decideAll(on, [{ suggestionId: identity.id, op: 'reject' }]);
    expect(song().dependency).toMatchObject({
      status: 'rejected',
      stands: false,
    });
    expect(inBulk(on, from).body).toMatchObject({ error: RESTS_ON });
  });

  it('no longer rests on an identity taken out by hand since', () => {
    const on = server();
    decideAll(on, [{ suggestionId: identity.id, op: 'accept' }]);
    const body = { ...detailOf(on, 'artist', 'marvin-gaye').body };
    delete body.externalIds;
    ok(put(on, { kind: 'artist', slug: 'marvin-gaye', body }));
    expect(rowOf(on, identity).status).toBe('removed');
    expect(inBulk(on, from).body).toMatchObject({
      code: 'NOT_BULK',
      error: RESTS_ON,
    });
  });

  it('refuses to reject what the item says, and takes a reject and its undo in one request', () => {
    const on = server();
    decideAll(on, [{ suggestionId: from.id, op: 'accept' }]);
    const refused = decideOne(on, { suggestionId: from.id, op: 'reject' });
    expect(refused.status).toBe(409);
    expect(refused.body).toMatchObject({ code: 'SUGGESTION_APPLIED' });
    // So is what a proposal on it says.
    decideAll(on, [{ suggestionId: studio.id, op: 'accept' }], EDITOR);
    expect(
      decideOne(on, { suggestionId: studio.id, op: 'drop' }).body,
    ).toMatchObject({
      code: 'SUGGESTION_APPLIED',
      error: expect.stringMatching(/in the proposal waiting on it/),
    });
    // Nothing logged: the item and the log still agree.
    expect(rowOf(on, from).status).toBe('applied');

    const both = decideAll(on, [
      { suggestionId: identity.id, op: 'reject' },
      { suggestionId: identity.id, op: 'reopen' },
    ]);
    expect(both.map((result) => result.outcome)).toEqual([
      'recorded',
      'recorded',
    ]);
    expect(rowOf(on, identity).status).toBe('open');
  });

  it('writes a fuller decisions.json’s accepts over a store an earlier one was replayed into', () => {
    const first = server();
    decideAll(first, [{ suggestionId: identity.id, op: 'accept' }]);
    const partial = download(first);
    decideAll(first, [{ suggestionId: from.id, op: 'accept' }]);
    const full = download(first);

    // Another machine replays the partial file, then pulls the full one:
    // the first replay's save is no later decision by a person.
    const other = makeServer({
      imported: [identity, from, studio],
      app: null,
      committed: parseDecisionsFile(decisionsFileText(partial)),
    });
    expect(other.replayCommittedDecisions()).toMatchObject({ applied: 1 });
    // Saved as the browser saves it, and read back on the next load.
    const saved = JSON.stringify(
      createMockStateCodec(other).encode(other.snapshot()),
    );
    const pulled = makeServer({
      imported: [identity, from, studio],
      app: null,
      committed: parseDecisionsFile(decisionsFileText(full)),
    });
    pulled.restore(createMockStateCodec(pulled).decode(JSON.parse(saved)));
    expect(pulled.replayCommittedDecisions()).toMatchObject({
      considered: 2,
      applied: 1,
      already: 1,
      removedSince: 0,
      conflicts: [],
    });
    expect(detailOf(pulled, 'artist', 'marvin-gaye').body).toMatchObject({
      activeFrom: 1959,
    });
    expect(rowOf(pulled, from).status).toBe('applied');
  });
});
