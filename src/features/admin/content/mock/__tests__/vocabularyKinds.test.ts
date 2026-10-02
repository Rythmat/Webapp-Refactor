import { describe, expect, it } from 'vitest';
import { REPO_VOCABULARY } from '@/content/vocabulary/repo';
import type {
  ContentItemDetail,
  ContentListItem,
  ValidationProblem,
} from '@/hooks/data/admin/useAdminContent';
import { repoVocabularySources } from '@/scripts/repoContent/sources/vocabulary';
import {
  createContentMockServer,
  type ContentMockServer,
  type MockSeedItem,
  type MockViewer,
  type StoredItem,
} from '../contentMockServer';
import type { Body } from '../mockKinds';
import type { MockVocabularySources } from '../vocabulary';

/**
 * The vocabulary kinds (genre, subgenre, instrument) through the content
 * API, as the dev repo content server serves them: each of the vocabulary's
 * rules (src/content/vocabulary/validate.ts) reaches a save as the API words
 * a problem, and a record anything names is never deleted.
 *
 * The fixture breaks no rule. Its sources are given, so each case reads
 * against a small, known vocabulary; the last block runs on the repo's own.
 */

const ADMIN: MockViewer = { role: 'admin', userId: 'admin-1', name: 'Ada' };

const vocabulary = (kind: string, body: Body): MockSeedItem => ({
  kind: kind as MockSeedItem['kind'],
  slug: String(body.id),
  body,
});

const SEED: MockSeedItem[] = [
  vocabulary('genre', {
    id: 'rock',
    name: 'Rock',
    taught: true,
    tags: ['Rock'],
  }),
  vocabulary('genre', {
    id: 'funk',
    name: 'Funk',
    taught: true,
    tags: ['Funk'],
  }),
  vocabulary('genre', {
    id: 'classical',
    name: 'Classical',
    taught: false,
    note: 'Not taught yet.',
    tags: [],
  }),
  vocabulary('subgenre', {
    id: 'art-rock',
    name: 'Art Rock',
    parent: 'rock',
    tags: ['Art Rock'],
  }),
  vocabulary('subgenre', {
    id: 'rock-and-roll',
    name: 'Rock And Roll',
    parent: 'rock',
    tags: ['Rock and Roll'],
  }),
  vocabulary('subgenre', {
    id: 'gospel',
    name: 'Gospel',
    parent: 'funk',
    tags: ['Gospel'],
  }),
  vocabulary('subgenre', {
    id: 'baroque',
    name: 'Baroque',
    parent: 'classical',
    tags: [],
  }),
  vocabulary('subgenre', {
    id: 'glam-rock',
    name: 'Glam Rock',
    parent: 'rock',
    tags: [],
  }),
  vocabulary('instrument', {
    id: 'piano',
    name: 'Piano',
    section: 'keys',
    typicalIn: ['classical', 'gospel'],
  }),
  vocabulary('instrument', {
    id: 'sitar',
    name: 'Sitar',
    section: 'strings',
    worldInstrumentId: 'sitar',
    typicalIn: [],
  }),
  vocabulary('instrument', {
    id: 'triangle',
    name: 'Triangle',
    section: 'percussion',
    typicalIn: [],
  }),
  // What names them from outside the vocabulary.
  {
    kind: 'artist',
    slug: 'ravi-shankar',
    body: {
      slug: 'ravi-shankar',
      name: 'Ravi Shankar',
      genreIds: ['classical'],
      instrumentIds: ['sitar'],
    },
  },
  {
    kind: 'song',
    slug: 'oh_happy_day',
    body: {
      id: 'oh_happy_day',
      title: 'Oh Happy Day',
      artist: 'Edwin Hawkins Singers',
      subgenreIds: ['gospel'],
      credits: [
        { name: 'Edwin Hawkins', role: 'performer', instrument: 'piano' },
        { name: 'A Guest', role: 'performer', instrument: 'sitar' },
      ],
    },
  },
  {
    kind: 'chord_progression',
    slug: '7',
    body: { id: 7, progression: 'I-IV', styles: ['gospel'] },
  },
];

const SOURCES: MockVocabularySources = {
  tagLists: {
    instrumentTags: ['Marimba'],
    ignoredTags: ['World Music'],
    unplacedTags: ['Trip-Hop'],
  },
  context: {
    worldInstrumentIds: ['sitar', 'conga'],
    artists: [{ slug: 'chicago', name: 'Chicago' }],
    aliasTags: ['Rock and Roll'],
  },
  codeTables: [
    {
      name: 'SONG_TAG_TO_GENRE',
      names: ['genre', 'subgenre'],
      table: { rock: 'rock', funk: 'funk' },
    },
    {
      name: 'instrumentMap.ts ALIASES',
      names: ['instrument'],
      table: { 'grand piano': 'piano' },
    },
  ],
};

const makeServer = (
  options: {
    seed?: MockSeedItem[];
    onTouched?: (item: StoredItem) => void;
    sources?: Partial<MockVocabularySources> | null;
  } = {},
): ContentMockServer =>
  createContentMockServer({
    seed: { items: options.seed ?? SEED },
    mode: 'repo',
    onTouched: options.onTouched,
    ...(options.sources === null
      ? {}
      : { vocabulary: options.sources ?? SOURCES }),
  });

const call = (
  server: ContentMockServer,
  method: string,
  path: string,
  options: { query?: Record<string, string>; body?: unknown } = {},
) => server.handle({ method, path, viewer: ADMIN, ...options });

const ok = <T>(response: { status: number; body: unknown }): T => {
  if (response.status !== 200)
    throw new Error(`${response.status}: ${JSON.stringify(response.body)}`);
  return response.body as T;
};

type Saved = { item: ContentItemDetail; warnings: ValidationProblem[] };
type Refused = {
  code: string;
  error: string;
  problems?: ValidationProblem[];
  referrers?: Record<string, unknown>[];
};

const put = (
  server: ContentMockServer,
  kind: string,
  body: Body,
  extra: Record<string, unknown> = {},
) =>
  call(server, 'PUT', '/items', {
    body: { kind, slug: String(body.id), body, ...extra },
  });

const lookup = (server: ContentMockServer, kind: string, slug: string) =>
  ok<ContentListItem>(
    call(server, 'GET', '/items/lookup', { query: { kind, slug } }),
  );

const bodyOf = (server: ContentMockServer, kind: string, slug: string) =>
  ok<ContentItemDetail>(
    call(server, 'GET', `/items/${lookup(server, kind, slug).id}`),
  ).body;

/** A save's problems as `code path`, errors and warnings alike. */
const codes = (problems: readonly ValidationProblem[] | undefined) =>
  (problems ?? []).map((p) =>
    `${p.severity ?? 'error'} ${p.code} ${p.path ?? ''}`.trim(),
  );

/** A refused save: 422 VALIDATION_FAILED, its problems as `codes`. */
const refused = (response: { status: number; body: unknown }) => {
  expect(response.status).toBe(422);
  const body = response.body as Refused;
  expect(body.code).toBe('VALIDATION_FAILED');
  return codes(body.problems);
};

/** A save that went through, its warnings as `codes`. */
const saved = (response: { status: number; body: unknown }) =>
  codes(ok<Saved>(response).warnings);

const genre = (id: string, extra: Body = {}): Body => ({
  id,
  name: id[0].toUpperCase() + id.slice(1),
  taught: false,
  tags: [],
  ...extra,
});
const subgenre = (id: string, extra: Body = {}): Body => ({
  id,
  name: id,
  parent: 'rock',
  tags: [],
  ...extra,
});

describe('the vocabulary kinds, served', () => {
  it('are in repo mode’s capabilities, keyed by id, authoritative and never bundled', () => {
    const { kinds } = ok<{
      kinds: {
        kind: string;
        identity: string;
        authoritative: boolean;
        bundle: string | null;
        schemaVersion: number;
      }[];
    }>(call(makeServer(), 'GET', '/capabilities'));
    for (const kind of ['genre', 'subgenre', 'instrument'])
      expect(kinds.find((entry) => entry.kind === kind)).toEqual({
        kind,
        identity: 'id',
        authoritative: true,
        bundle: null,
        schemaVersion: 1,
      });
  });

  it('are served by nothing but repo mode', () => {
    const mock = createContentMockServer({
      seed: { items: SEED },
      mode: 'all',
    });
    const response = put(mock, 'genre', genre('soul'));
    expect(response.status).toBe(400);
    expect(
      ok<{ kinds: { kind: string }[] }>(
        call(mock, 'GET', '/capabilities'),
      ).kinds.map((entry) => entry.kind),
    ).not.toContain('genre');
  });

  it('list by name, with the parent or section beside it', () => {
    const server = makeServer();
    const rows = (kind: string) =>
      ok<{ items: ContentListItem[] }>(
        call(server, 'GET', '/items', { query: { kind } }),
      ).items.map((row) => [row.slug, row.title, row.subtitle]);
    expect(rows('genre')).toEqual([
      ['classical', 'Classical', null],
      ['funk', 'Funk', 'Taught'],
      ['rock', 'Rock', 'Taught'],
    ]);
    expect(rows('subgenre')).toContainEqual(['gospel', 'Gospel', 'funk']);
    expect(rows('instrument')).toContainEqual(['sitar', 'Sitar', 'strings']);
  });

  it('start from a template that breaks no rule once named', () => {
    const server = makeServer();
    const template = ok<{ body: Body; slug: string; hint: string }>(
      call(server, 'GET', '/template/instrument', {
        query: { slug: 'cowbell' },
      }),
    );
    expect(template.slug).toBe('cowbell');
    expect(template.hint).toMatch(/never changes/);
    expect(
      saved(put(server, 'instrument', { ...template.body, name: 'Cowbell' })),
    ).toEqual([]);
  });

  it('save as the files hold them, telling the store', () => {
    const touched: string[] = [];
    const server = makeServer({
      onTouched: (item) => touched.push(`${item.kind}:${item.slug}`),
    });
    const funk = { ...bodyOf(server, 'genre', 'funk'), name: 'Funk & Soul' };
    expect(saved(put(server, 'genre', funk))).toEqual([]);
    expect(bodyOf(server, 'genre', 'funk')).toEqual(funk);
    expect(touched).toEqual(['genre:funk']);
  });
});

describe('each rule, through a save', () => {
  it('holds a record to its file’s schema (INVALID_BODY)', () => {
    const server = makeServer();
    expect(refused(put(server, 'genre', genre('soul', { name: ' ' })))).toEqual(
      ['error INVALID_BODY name'],
    );
    expect(
      refused(
        put(server, 'instrument', {
          id: 'kazoo',
          name: 'Kazoo',
          section: 'kitchen',
          typicalIn: [],
        }),
      ),
    ).toEqual(['error INVALID_BODY section']);
    expect(
      refused(put(server, 'subgenre', subgenre('surf-rock', { era: 1962 }))),
    ).toEqual(['error INVALID_BODY']);
    // An id off the kebab-case grammar: the slug's pattern and the schema
    // each say so, as for every kind.
    expect(refused(put(server, 'genre', genre('Soul_Music')))).toEqual([
      'error INVALID_BODY id',
      'error INVALID_BODY id',
    ]);
  });

  it('never changes an id: a body naming another is SLUG_ID_MISMATCH', () => {
    const server = makeServer();
    const response = call(server, 'PUT', '/items', {
      body: {
        kind: 'genre',
        slug: 'rock',
        body: { ...bodyOf(server, 'genre', 'rock'), id: 'rock-music' },
      },
    });
    expect(refused(response)).toEqual(['error SLUG_ID_MISMATCH id']);
  });

  it('never changes taught, and never makes a taught genre (IMMUTABLE_ID)', () => {
    const server = makeServer();
    const rock = bodyOf(server, 'genre', 'rock');
    expect(refused(put(server, 'genre', { ...rock, taught: false }))).toEqual([
      'error IMMUTABLE_ID taught',
    ]);
    expect(
      refused(put(server, 'genre', genre('soul', { taught: true }))),
    ).toEqual(['error IMMUTABLE_ID taught']);
  });

  it('never gives a subgenre a genre’s id (DUPLICATE_ID)', () => {
    const response = put(makeServer(), 'subgenre', subgenre('funk'));
    expect(refused(response)).toEqual(['error DUPLICATE_ID id']);
    expect((response.body as Refused).problems?.[0].target).toBe('genre:funk');
  });

  it('files a subgenre under a genre, and an instrument under what exists (INVALID_REFERENCE)', () => {
    const server = makeServer();
    expect(
      refused(
        put(server, 'subgenre', subgenre('surf-rock', { parent: 'surf' })),
      ),
    ).toEqual(['error INVALID_REFERENCE parent']);
    expect(
      refused(
        put(server, 'instrument', {
          ...bodyOf(server, 'instrument', 'triangle'),
          typicalIn: ['baroque', 'polka'],
        }),
      ),
    ).toEqual(['error INVALID_REFERENCE typicalIn[1]']);
  });

  it('gives a globe tag to one record, and never one the lists say is no genre (DUPLICATE_TAG)', () => {
    const server = makeServer();
    expect(
      refused(put(server, 'subgenre', subgenre('p-funk', { tags: ['Funk'] }))),
    ).toEqual(['error DUPLICATE_TAG tags[0]']);
    expect(
      refused(put(server, 'genre', genre('world', { tags: ['World Music'] }))),
    ).toEqual(['error DUPLICATE_TAG tags[0]']);
    expect(
      refused(
        put(server, 'subgenre', subgenre('marimba-pop', { tags: ['Marimba'] })),
      ),
    ).toEqual(['error DUPLICATE_TAG tags[0]']);
    // An unplaced tag is fine: adding it places it.
    expect(
      saved(
        put(server, 'subgenre', subgenre('trip-hop', { tags: ['Trip-Hop'] })),
      ),
    ).toEqual([]);
  });

  it('links an instrument only to the globe’s instruments (UNKNOWN_CODE_ID)', () => {
    const server = makeServer();
    const triangle = bodyOf(server, 'instrument', 'triangle');
    expect(
      refused(
        put(server, 'instrument', { ...triangle, worldInstrumentId: 'bell' }),
      ),
    ).toEqual(['error UNKNOWN_CODE_ID worldInstrumentId']);
    expect(
      saved(
        put(server, 'instrument', { ...triangle, worldInstrumentId: 'conga' }),
      ),
    ).toEqual([]);
  });

  it('warns, and saves, when a genre reads as an artist (NAME_COLLISION)', () => {
    expect(saved(put(makeServer(), 'genre', genre('chicago')))).toEqual([
      'warning NAME_COLLISION id',
    ]);
  });

  it('warns, and saves, when two records’ tags read as one (TAG_FOLDS_TOGETHER)', () => {
    expect(
      saved(
        put(
          makeServer(),
          'subgenre',
          subgenre('rock-n-roll', { tags: ['Rock & Roll'] }),
        ),
      ),
    ).toEqual(['warning TAG_FOLDS_TOGETHER tags[0]']);
  });

  it('warns, and saves, when a tag the importer’s aliases lead to is taken off (ALIAS_TAG_REMOVED)', () => {
    const server = makeServer();
    expect(
      saved(
        put(server, 'subgenre', {
          ...bodyOf(server, 'subgenre', 'rock-and-roll'),
          tags: [],
        }),
      ),
    ).toEqual(['warning ALIAS_TAG_REMOVED tags']);
  });

  it('never blames a save for a problem the files already had', () => {
    const server = makeServer({
      seed: [
        ...SEED,
        // Already wrong: Art Rock's tag on a second record.
        vocabulary('subgenre', subgenre('glam', { tags: ['Art Rock'] })),
      ],
    });
    expect(
      saved(
        put(server, 'genre', {
          ...bodyOf(server, 'genre', 'funk'),
          name: 'Funk & Soul',
        }),
      ),
    ).toEqual([]);
    // /validate still reports it, under the kind it is on.
    const subgenres = ok<{ ok: boolean; problems: ValidationProblem[] }>(
      call(server, 'GET', '/validate/subgenre'),
    );
    expect(subgenres.ok).toBe(false);
    expect(
      subgenres.problems.map((p) => `${p.code} ${p.slug} ${p.path}`),
    ).toEqual(['DUPLICATE_TAG glam tags[0]']);
    expect(ok<{ ok: boolean }>(call(server, 'GET', '/validate/genre')).ok).toBe(
      true,
    );
  });
});

describe('a delete', () => {
  const remove = (
    server: ContentMockServer,
    kind: string,
    slug: string,
    force = false,
  ) =>
    call(server, 'DELETE', `/items/${lookup(server, kind, slug).id}`, {
      query: force ? { force: 'true' } : {},
    });

  const referrersOf = (response: { status: number; body: unknown }) => {
    expect(response.status).toBe(409);
    const body = response.body as Refused;
    expect(body.code).toBe('REFERENCED');
    return (body.referrers ?? []).map(
      (r) => `${String(r.kind)} ${String(r.slug)} ${String(r.path)}`,
    );
  };

  it('is refused while a genre has subgenres, tags, instruments, code tables or artists naming it, force or not', () => {
    const server = makeServer();
    expect(referrersOf(remove(server, 'genre', 'funk'))).toEqual([
      'genre funk tags[0]',
      'subgenre gospel parent',
      'null SONG_TAG_TO_GENRE funk',
    ]);
    const classical = remove(server, 'genre', 'classical', true);
    expect(referrersOf(classical)).toEqual([
      'subgenre baroque parent',
      'instrument piano typicalIn[0]',
      'artist ravi-shankar genreIds[0]',
    ]);
    // Each row names the item, with its id and title, so the console can
    // link it; a code table is marked as one.
    const rows = (classical.body as Refused).referrers!;
    expect(rows[0]).toEqual({
      kind: 'subgenre',
      id: lookup(server, 'subgenre', 'baroque').id,
      slug: 'baroque',
      title: 'Baroque',
      path: 'parent',
    });
    expect(
      (remove(server, 'genre', 'rock').body as Refused).referrers,
    ).toContainEqual({
      kind: null,
      id: null,
      slug: 'SONG_TAG_TO_GENRE',
      title: 'SONG_TAG_TO_GENRE in code',
      path: 'rock',
      code: true,
    });
    expect((classical.body as Refused).error).toMatch(
      /^3 things still name this genre: Baroque \(parent\)/,
    );
  });

  it('is refused while a subgenre is typical of an instrument, or songs and progressions name it', () => {
    expect(referrersOf(remove(makeServer(), 'subgenre', 'gospel'))).toEqual([
      'subgenre gospel tags[0]',
      'instrument piano typicalIn[1]',
      'song oh_happy_day subgenreIds[0]',
      'chord_progression 7 styles[0]',
    ]);
  });

  it('is refused while credits, artists or the importer’s aliases name an instrument', () => {
    const server = makeServer();
    expect(referrersOf(remove(server, 'instrument', 'sitar'))).toEqual([
      'artist ravi-shankar instrumentIds[0]',
      'song oh_happy_day credits[1].instrument',
    ]);
    expect(referrersOf(remove(server, 'instrument', 'piano'))).toEqual([
      'null instrumentMap.ts ALIASES grand piano',
      'song oh_happy_day credits[0].instrument',
    ]);
  });

  it('takes a record nothing names, and tells the store', () => {
    const touched: string[] = [];
    const server = makeServer({
      onTouched: (item) =>
        touched.push(`${item.kind}:${item.slug}:${item.deleted}`),
    });
    expect(ok(remove(server, 'subgenre', 'glam-rock'))).toMatchObject({
      deleted: true,
    });
    expect(ok(remove(server, 'instrument', 'triangle'))).toMatchObject({
      deleted: true,
    });
    expect(touched).toEqual([
      'subgenre:glam-rock:true',
      'instrument:triangle:true',
    ]);
    expect(
      call(server, 'GET', '/items/lookup', {
        query: { kind: 'subgenre', slug: 'glam-rock' },
      }).status,
    ).toBe(404);
  });
});

describe('over the repo’s own vocabulary and sources', () => {
  const repoSeed = (): MockSeedItem[] => [
    ...REPO_VOCABULARY.genres.map((body) => vocabulary('genre', { ...body })),
    ...REPO_VOCABULARY.subgenres.map((body) =>
      vocabulary('subgenre', { ...body }),
    ),
    ...REPO_VOCABULARY.instruments.map((body) =>
      vocabulary('instrument', { ...body }),
    ),
  ];

  it('validates every kind with no error', () => {
    const server = makeServer({ seed: repoSeed(), sources: null });
    for (const kind of ['genre', 'subgenre', 'instrument']) {
      const { problems } = ok<{ problems: ValidationProblem[] }>(
        call(server, 'GET', `/validate/${kind}`),
      );
      expect(
        problems.filter((p) => p.severity !== 'warning'),
        kind,
      ).toEqual([]);
    }
  });

  const rows = (response: { status: number; body: unknown }) =>
    ((response.body as Refused).referrers ?? []).map(
      (r) => `${String(r.slug)} ${String(r.path)}`,
    );
  const remove = (server: ContentMockServer, kind: string, slug: string) =>
    call(server, 'DELETE', `/items/${lookup(server, kind, slug).id}`);

  it('reads the repo’s tag lists, code tables and globe instruments', () => {
    const server = makeServer({ seed: repoSeed(), sources: null });
    expect(
      refused(put(server, 'genre', genre('world', { tags: ['World Music'] }))),
    ).toEqual(['error DUPLICATE_TAG tags[0]']);
    expect(rows(remove(server, 'genre', 'rnb'))).toEqual(
      expect.arrayContaining([
        'rnb tags[0]',
        'SONG_TAG_TO_GENRE rnb',
        'PROGRESSION_STYLE_TO_GENRE r&b',
        'PROGRESSION_STYLE_TO_GENRE neo-soul',
      ]),
    );
    const sitar = bodyOf(server, 'instrument', 'sitar');
    expect(
      refused(
        put(server, 'instrument', { ...sitar, worldInstrumentId: 'lute' }),
      ),
    ).toEqual(['error UNKNOWN_CODE_ID worldInstrumentId']);
  });

  it('reads the importer’s aliases only when the repo server passes them', async () => {
    // App code never imports the importer, so the server's defaults hold
    // none of its tables; the repo store adds them.
    const bare = makeServer({ seed: repoSeed(), sources: null });
    const full = makeServer({
      seed: repoSeed(),
      sources: await repoVocabularySources(),
    });
    const untagged = (server: ContentMockServer) =>
      put(server, 'genre', { ...bodyOf(server, 'genre', 'rnb'), tags: [] });
    expect(saved(untagged(bare))).toEqual([]);
    expect(saved(untagged(full))).toEqual(['warning ALIAS_TAG_REMOVED tags']);
    expect(rows(remove(full, 'instrument', 'piano'))).toContain(
      'instrumentMap.ts ALIASES grand piano',
    );
    expect(remove(bare, 'instrument', 'piano').status).toBe(200);
  });
});
