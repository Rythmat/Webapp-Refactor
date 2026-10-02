import { describe, expect, it } from 'vitest';
import { CITIES } from '@/components/atlas/data/cities';
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
  type ContentMockServer,
  type MockSeedItem,
  type MockViewer,
} from '../contentMockServer';
import type { DecisionResult, DecisionsFile } from '../decisions';
import { REPO_KINDS, templateFor, type Body } from '../mockKinds';
import type { ContentMockMode } from '../mockSwitch';

/**
 * The bulk import's policy (design E.1; `decide` with `policy: 'import'`,
 * reached through the server's `importDecisions`), under the owner's
 * decisions of 30 September 2026: everything sure or likely goes in at
 * once, as plain data. No value, record or decision it writes names an
 * outside catalogue, carries `unverified`, or waits to be reviewed; no
 * external id is written, though the identity it names is trusted; and a
 * stated value is never overwritten.
 */

const ADMIN: MockViewer = { role: 'admin', userId: 'admin-1', name: 'Ada' };
const EDITOR: MockViewer = { role: 'editor', userId: 'ed-1', name: 'Eddie' };

const MBID = 'afdb7919-059d-43c1-b668-ba1d265e7e42';
const MB: SuggestionSource = {
  provider: 'musicbrainz',
  url: `https://musicbrainz.org/artist/${MBID}`,
};
const WD: SuggestionSource = {
  provider: 'wikidata',
  url: 'https://www.wikidata.org/wiki/Q134549',
};
const PIN: SuggestionSource = {
  provider: 'app',
  label: 'artist_location "marvin gaye"',
};

/** Anything that would name an outside catalogue or wait to be confirmed. */
const PROVENANCE =
  /musicbrainz|wikidata|metabrainz|externalIds|unverified|"source"/i;

const suggest = (
  kind: string,
  slug: string,
  path: string,
  value: unknown,
  extra: Partial<Suggestion> = {},
): Suggestion => {
  const target = { kind, slug };
  const op = path.endsWith('[]') ? 'add' : 'set';
  return {
    id: suggestionId({ target, path, op, value }),
    target,
    path,
    op,
    value,
    display: `${path} ${JSON.stringify(value)}`,
    sources: [MB],
    evidence: [],
    confidence: 0.9,
    tier: 'sure',
    batch: 'mb-2026-09-30',
    ...extra,
  };
};

/** A record as the importer carries it: its provenance on it. */
const newArtist = (slug: string, name: string): RequiredRecord => ({
  kind: 'artist',
  slug,
  body: {
    slug,
    name,
    externalIds: { mbid: '8f08eb4f-873e-4d63-8271-fa7a5563c2d1' },
    unverified: true,
    source: 'musicbrainz',
  },
});
const WGO_ALBUM: RequiredRecord = {
  kind: 'release',
  slug: 'marvin-gaye-whats-going-on',
  body: {
    slug: 'marvin-gaye-whats-going-on',
    title: 'What’s Going On',
    artistIds: ['marvin-gaye'],
    format: 'album',
    year: 1971,
    externalIds: { mbid: '0e2f3b8a-7a2c-3b4f-9a55-2a0a3f9d7b10' },
    unverified: true,
    source: 'musicbrainz',
  },
};

const ID = suggest('artist', 'marvin-gaye', 'externalIds.mbid', MBID);
const ID_J5 = suggest(
  'artist',
  'the-jackson-5',
  'externalIds.mbid',
  '5a8c0c6b-8b7a-4d6f-9e0e-6c1b1d3c9a11',
);
const credit = (song: string, name: string, slug: string, dependsOn: string) =>
  suggest(
    'song',
    song,
    'credits[]',
    {
      name,
      role: 'songwriter',
      artistGlobeId: slug,
      unverified: true,
      source: `https://musicbrainz.org/artist/${MBID}`,
    },
    { requires: [newArtist(slug, name)], dependsOn },
  );
const S = {
  born: suggest('artist', 'marvin-gaye', 'born.date', '1939-04-02', {
    tier: 'likely',
    sources: [MB, WD],
    dependsOn: ID.id,
  }),
  ambiguous: suggest('artist', 'marvin-gaye', 'activeFrom', 1961, {
    tier: 'ambiguous',
    dependsOn: ID.id,
  }),
  genre: suggest('artist', 'marvin-gaye', 'genreIds[]', 'soul', {
    dependsOn: ID.id,
  }),
  pinCity: suggest('artist', 'marvin-gaye', 'basedInPlaceId', 'detroit', {
    tier: 'likely',
    sources: [PIN],
    batch: 'app-2026-09-30',
  }),
  j5Active: suggest('artist', 'the-jackson-5', 'activeFrom', 1965, {
    dependsOn: ID_J5.id,
  }),
  credit: credit('whats_going_on', 'James Jamerson', 'james-jamerson', ID.id),
  credit2: credit('lets_get_it_on', 'James Jamerson', 'james-jamerson', ID.id),
  namesake: credit('abc', 'Earl Van Dyke', 'earl-van-dyke', ID_J5.id),
  year: suggest('song', 'whats_going_on', 'year', 1971, { dependsOn: ID.id }),
  studio: suggest(
    'song',
    'whats_going_on',
    'session.studioId',
    'hitsville-u-s-a',
    { dependsOn: ID.id },
  ),
  album: suggest(
    'song',
    'whats_going_on',
    'releases[]',
    {
      releaseId: 'marvin-gaye-whats-going-on',
      track: 1,
      unverified: true,
      source: 'musicbrainz',
    },
    { requires: [WGO_ALBUM], dependsOn: ID.id },
  ),
};
const LABEL = suggest(
  'release',
  'marvin-gaye-whats-going-on',
  'labelId',
  'tamla',
  {
    requires: [WGO_ALBUM],
    dependsOn: S.album.id,
  },
);

const city = (id: string): Body => ({
  ...(CITIES.find((entry) => entry.id === id) as unknown as Body),
});
const song = (id: string, title: string, artist: string, lead: string) => ({
  ...templateFor('song', id, 1).body,
  title,
  artist,
  origin: { artistGlobeId: lead },
});
const SEED: MockSeedItem[] = [
  { kind: 'globe_city', slug: 'detroit', body: city('detroit') },
  { kind: 'globe_city', slug: 'los-angeles', body: city('los-angeles') },
  {
    kind: 'artist',
    slug: 'marvin-gaye',
    body: { slug: 'marvin-gaye', name: 'Marvin Gaye' },
  },
  {
    kind: 'artist',
    slug: 'the-jackson-5',
    body: { slug: 'the-jackson-5', name: 'The Jackson 5', activeFrom: 1964 },
  },
  {
    kind: 'artist',
    slug: 'earl-van-dyke',
    body: { slug: 'earl-van-dyke', name: 'Earl Van Dyke', activeFrom: 1950 },
  },
  {
    kind: 'studio',
    slug: 'hitsville-u-s-a',
    body: {
      slug: 'hitsville-u-s-a',
      name: 'Hitsville U.S.A.',
      placeId: 'detroit',
    },
  },
  {
    kind: 'label',
    slug: 'tamla',
    body: { slug: 'tamla', name: 'Tamla', placeId: 'detroit' },
  },
  {
    kind: 'song',
    slug: 'whats_going_on',
    body: song(
      'whats_going_on',
      'What’s Going On',
      'Marvin Gaye',
      'marvin-gaye',
    ),
  },
  {
    kind: 'song',
    slug: 'lets_get_it_on',
    body: song(
      'lets_get_it_on',
      'Let’s Get It On',
      'Marvin Gaye',
      'marvin-gaye',
    ),
  },
  {
    kind: 'song',
    slug: 'abc',
    body: song('abc', 'ABC', 'The Jackson 5', 'the-jackson-5'),
  },
];

let clock = 0;
const makeServer = (
  mode: Exclude<ContentMockMode, 'legacy'> = 'all',
  onTouched?: (kindSlug: string) => void,
): ContentMockServer =>
  createContentMockServer({
    seed: {
      items: SEED.filter(
        (item) => mode !== 'repo' || REPO_KINDS.includes(item.kind),
      ),
    },
    mode,
    now: () => new Date(Date.UTC(2026, 9, 1) + (clock += 1000)),
    suggestions: {
      imported: [ID, ID_J5, ...Object.values(S), LABEL],
    },
    ...(onTouched
      ? { onTouched: (item) => onTouched(`${item.kind}:${item.slug}`) }
      : {}),
  });

const ok = <T>(response: { status: number; body: unknown }): T => {
  if (response.status !== 200)
    throw new Error(`${response.status}: ${JSON.stringify(response.body)}`);
  return response.body as T;
};

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

/** Import these, as the CLI does: each an admin's accept, method import. */
const importing = (
  server: ContentMockServer,
  suggestions: readonly Suggestion[],
  viewer = ADMIN,
): DecisionResult[] =>
  server.importDecisions(
    suggestions.map((suggestion) => ({
      suggestionId: suggestion.id,
      op: 'accept',
      method: 'import',
    })),
    viewer,
  );

const refusal = (result: DecisionResult) =>
  result.outcome === 'refused'
    ? { code: result.code, error: result.error }
    : { code: null, error: null };

describe('the bulk import', () => {
  it('writes plain data: bare values, bare records, no external id', () => {
    const server = makeServer();
    const results = importing(server, [
      S.born,
      S.genre,
      S.credit,
      S.year,
      S.studio,
      S.album,
    ]);
    expect(results.map((result) => result.outcome)).toEqual([
      'saved',
      'saved',
      'saved',
      'saved',
      'saved',
      'saved',
    ]);

    // The identity it rests on is trusted, and never written.
    expect(bodyOf(server, 'artist', 'marvin-gaye').body).toEqual({
      slug: 'marvin-gaye',
      name: 'Marvin Gaye',
      born: { date: '1939-04-02' },
      genreIds: ['soul'],
    });
    const wgo = bodyOf(server, 'song', 'whats_going_on').body;
    expect(wgo.credits).toEqual([
      {
        name: 'James Jamerson',
        role: 'songwriter',
        artistGlobeId: 'james-jamerson',
      },
    ]);
    expect(wgo.year).toBe(1971);
    // No display text beside the id: students read session.studio.
    expect(wgo.session).toEqual({ studioId: 'hitsville-u-s-a' });
    expect(wgo.releases).toEqual([
      { releaseId: 'marvin-gaye-whats-going-on', track: 1 },
    ]);
    // The records it made are bare too.
    expect(bodyOf(server, 'artist', 'james-jamerson').body).toEqual({
      slug: 'james-jamerson',
      name: 'James Jamerson',
    });
    expect(
      bodyOf(server, 'release', 'marvin-gaye-whats-going-on').body,
    ).toEqual({
      slug: 'marvin-gaye-whats-going-on',
      title: 'What’s Going On',
      artistIds: ['marvin-gaye'],
      format: 'album',
      year: 1971,
    });

    // Nothing the site reads names an outside catalogue or waits to be
    // confirmed.
    for (const kind of ['artist', 'song', 'release']) {
      const exported = ok<{ items: { body: unknown }[] }>(
        server.handle({
          method: 'GET',
          path: '/export',
          query: { kind, limit: '500' },
          viewer: ADMIN,
        }),
      );
      expect(JSON.stringify(exported.items.map((row) => row.body))).not.toMatch(
        PROVENANCE,
      );
    }
    // Nor does any revision note the console shows.
    const note = bodyOf(server, 'song', 'whats_going_on').Revisions[0].note;
    expect(note).toMatch(/^Imported 4 suggestions: /);
    expect(note).not.toMatch(/musicbrainz|wikidata|mb-|batch/i);
  });

  it('logs each as an import, bare, which counts as reviewed', () => {
    const server = makeServer();
    importing(server, [S.born, S.credit]);
    const file = ok<DecisionsFile>(
      server.handle({
        method: 'GET',
        path: '/suggestions/decisions',
        viewer: ADMIN,
      }),
    );
    expect(file.decisions.map((row) => [row.suggestionId, row.method])).toEqual(
      [
        [S.born.id, 'import'],
        [S.credit.id, 'import'],
      ],
    );
    const logged = file.decisions.find(
      (row) => row.suggestionId === S.credit.id,
    )!;
    expect(logged.value).toEqual({
      name: 'James Jamerson',
      role: 'songwriter',
      artistGlobeId: 'james-jamerson',
    });
    expect(logged.requires).toEqual([
      {
        kind: 'artist',
        slug: 'james-jamerson',
        body: { slug: 'james-jamerson', name: 'James Jamerson' },
      },
    ]);
    // Not in the "accepted in bulk, not reviewed" list.
    const unreviewed = ok<{ total: number }>(
      server.handle({
        method: 'GET',
        path: '/suggestions',
        query: { unreviewed: '1' },
        viewer: ADMIN,
      }),
    );
    expect(unreviewed.total).toBe(0);
  });

  it('takes song years and Cities read from song pins, which a bulk accept never does', () => {
    const server = makeServer();
    const bulk = server.handle({
      method: 'POST',
      path: '/suggestions/decisions',
      body: {
        decisions: [
          { suggestionId: S.pinCity.id, op: 'accept', method: 'bulk' },
        ],
      },
      viewer: ADMIN,
    });
    expect(bulk.status).toBe(422);
    expect((bulk.body as { code: string }).code).toBe('NOT_BULK');
    const results = importing(server, [S.pinCity, S.year]);
    expect(results.map((result) => result.outcome)).toEqual(['saved', 'saved']);
    expect(bodyOf(server, 'artist', 'marvin-gaye').body.basedInPlaceId).toBe(
      'detroit',
    );
  });

  it('leaves out the ambiguous and every external id, and never writes over a stated value', () => {
    const server = makeServer();
    const [ambiguous, identity, conflict] = importing(server, [
      S.ambiguous,
      ID,
      S.j5Active,
    ]);
    expect(refusal(ambiguous)).toEqual({
      code: 'NOT_IMPORTED',
      error:
        'Not imported: it is ambiguous: its sources point at more than one thing.',
    });
    expect(refusal(identity).code).toBe('NOT_IMPORTED');
    expect(refusal(identity).error).toMatch(/external id is never imported/);
    expect(conflict).toMatchObject({
      outcome: 'refused',
      code: 'SUGGESTION_CONFLICT',
      current: 1964,
    });
    expect(bodyOf(server, 'artist', 'the-jackson-5').body.activeFrom).toBe(
      1964,
    );
    expect(bodyOf(server, 'artist', 'marvin-gaye').body).toEqual({
      slug: 'marvin-gaye',
      name: 'Marvin Gaye',
    });
  });

  it('holds back the rows resting on an identity someone rejected', () => {
    const server = makeServer();
    ok(
      server.handle({
        method: 'POST',
        path: '/suggestions/decisions',
        body: { decisions: [{ suggestionId: ID.id, op: 'reject' }] },
        viewer: ADMIN,
      }),
    );
    const [born] = importing(server, [S.born]);
    expect(refusal(born)).toEqual({
      code: 'NOT_IMPORTED',
      error: 'Not imported: the suggestion it rests on is not accepted yet.',
    });
  });

  it('goes in waves: a Label row waits for the Album row it rests on', () => {
    const server = makeServer();
    const [album, label] = importing(server, [S.album, LABEL]);
    expect(album.outcome).toBe('saved');
    expect(refusal(label).code).toBe('NOT_IMPORTED');
    // The next wave: the Album row stands now.
    const [again] = importing(server, [LABEL]);
    expect(again.outcome).toBe('saved');
    expect(
      bodyOf(server, 'release', 'marvin-gaye-whats-going-on').body.labelId,
    ).toBe('tamla');
  });

  it('uses a bare record it made before, and refuses a namesake with more to it', () => {
    const server = makeServer();
    importing(server, [S.credit]);
    const [second] = importing(server, [S.credit2]);
    expect(second.outcome).toBe('saved');
    expect(bodyOf(server, 'song', 'lets_get_it_on').body.credits).toEqual([
      {
        name: 'James Jamerson',
        role: 'songwriter',
        artistGlobeId: 'james-jamerson',
      },
    ]);
    const [namesake] = importing(server, [S.namesake]);
    expect(refusal(namesake).code).toBe('REQUIRED_RECORD_TAKEN');
    expect(bodyOf(server, 'artist', 'earl-van-dyke').body).toEqual({
      slug: 'earl-van-dyke',
      name: 'Earl Van Dyke',
      activeFrom: 1950,
    });
    expect(bodyOf(server, 'song', 'abc').body.credits).toBeUndefined();
  });

  it('is repeatable: a second run writes and logs nothing', () => {
    const touched: string[] = [];
    const server = makeServer('repo', (key) => touched.push(key));
    const all = [
      S.born,
      S.genre,
      S.pinCity,
      S.credit,
      S.year,
      S.studio,
      S.album,
    ];
    importing(server, all);
    expect(new Set(touched)).toEqual(
      new Set([
        'artist:marvin-gaye',
        'artist:james-jamerson',
        'release:marvin-gaye-whats-going-on',
        'song:whats_going_on',
      ]),
    );
    const logged = server.decisionsFile().decisions.length;
    touched.length = 0;
    const again = importing(server, all);
    expect(again.every((result) => result.outcome === 'refused')).toBe(true);
    expect(refusal(again[0]).error).toBe(
      'Not imported: the item says it already.',
    );
    expect(touched).toEqual([]);
    expect(server.decisionsFile().decisions).toHaveLength(logged);
  });

  it('is the import’s alone: never over HTTP, never an editor, only accepts as offered', () => {
    const server = makeServer();
    const http = server.handle({
      method: 'POST',
      path: '/suggestions/decisions',
      body: {
        decisions: [
          { suggestionId: S.born.id, op: 'accept', method: 'import' },
        ],
      },
      viewer: ADMIN,
    });
    expect(http.status).toBe(400);
    expect((http.body as { error: string }).error).toMatch(
      /import is the bulk import’s own/,
    );
    const [asSingle] = server.importDecisions(
      [{ suggestionId: S.born.id, op: 'accept', method: 'single' }],
      ADMIN,
    );
    expect(refusal(asSingle).code).toBe('NOT_IMPORT');
    const [asReject] = server.importDecisions(
      [{ suggestionId: S.born.id, op: 'reject', method: 'import' }],
      ADMIN,
    );
    expect(refusal(asReject).code).toBe('NOT_IMPORT');
    const [changed] = server.importDecisions(
      [
        {
          suggestionId: S.born.id,
          op: 'accept',
          method: 'import',
          value: '1939',
        },
      ],
      ADMIN,
    );
    expect(refusal(changed).code).toBe('NOT_IMPORT');
    const [editor] = importing(server, [S.born], EDITOR);
    expect(refusal(editor).code).toBe('FORBIDDEN');
    expect(bodyOf(server, 'artist', 'marvin-gaye').body.born).toBeUndefined();
  });
});

describe('the decisions log, once the repo store has written it', () => {
  it('counts nothing as not downloaded until the next decision', () => {
    const server = makeServer('repo');
    importing(server, [S.born, S.year]);
    expect(server.decisionCounts()).toMatchObject({
      total: 2,
      notDownloaded: 2,
    });
    const written = server.decisionsFile();
    server.markDecisionsCommitted();
    expect(server.decisionCounts()).toMatchObject({
      total: 2,
      notDownloaded: 0,
    });
    expect(server.decisionsFile()).toEqual(written);
    importing(server, [S.genre]);
    expect(server.decisionCounts()).toMatchObject({
      total: 3,
      notDownloaded: 1,
    });
  });
});
