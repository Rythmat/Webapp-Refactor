import { describe, expect, it } from 'vitest';
import { CITIES } from '@/components/atlas/data/cities';
import type {
  ContentItemDetail,
  ContentListItem,
  ContentOverviewRow,
  ValidationProblem,
} from '@/hooks/data/admin/useAdminContent';
import { loadRepoStore } from '@/scripts/repoContent/repoStore';
import { REPO_KINDS as STORE_KINDS } from '@/scripts/repoContent/sources/index';
import {
  createContentMockServer,
  type ContentMockServer,
  type MockSeedItem,
  type MockViewer,
  type StoredItem,
} from '../contentMockServer';
import { parseDecisionsFile } from '../decisions';
import { serveContentRequest } from '../mockHttp';
import {
  REPO_KINDS,
  templateFor,
  type Body,
  type MockKind,
} from '../mockKinds';

/**
 * The content mock's `repo` profile: the dev repo content server's store,
 * whose saves go into the repo's data files (design: repo mode, A–D). What
 * changes from the contract mock is what a save into the repo means — an
 * admin's save is the publish's first step (git is the review), so there
 * are no proposals, releases or drafts, every kind is authoritative, and
 * nothing is derived — and what the store needs to write the files: every
 * change reported as it is made, and ids that survive a reload.
 */

const ADMIN: MockViewer = { role: 'admin', userId: 'admin-1', name: 'Ada' };
const EDITOR: MockViewer = { role: 'editor', userId: 'ed-1', name: 'Eddie' };

/** When the files were last written: the seed's updatedAt in repo mode. */
const MTIME = new Date('2026-09-30T18:00:00.000Z');

const city = (id: string): Body => ({
  ...(CITIES.find((entry) => entry.id === id) as unknown as Body),
});
const song = (id: string, extra: Body = {}): Body => ({
  ...templateFor('song', id, 1).body,
  title: id,
  artist: 'Marvin Gaye',
  origin: { artistGlobeId: 'marvin-gaye' },
  ...extra,
});

const SEED: MockSeedItem[] = [
  { kind: 'globe_city', slug: 'detroit', body: city('detroit') },
  {
    kind: 'artist',
    slug: 'marvin-gaye',
    body: { slug: 'marvin-gaye', name: 'Marvin Gaye' },
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
    kind: 'studio',
    slug: 'sunset-sound',
    body: { slug: 'sunset-sound', name: 'Sunset Sound' },
  },
  {
    kind: 'song',
    slug: 'whats_going_on',
    body: song('whats_going_on', {
      session: { studio: 'Hitsville U.S.A.', studioId: 'hitsville-u-s-a' },
    }),
    status: 'published',
  },
  // Not registered in bundled.ts: a draft, which students never see.
  { kind: 'song', slug: 'thank_you', body: song('thank_you'), status: 'draft' },
  {
    kind: 'globe_event',
    slug: 'song-whats_going_on',
    body: {
      ...templateFor('globe_event', 'song-whats_going_on', 1).body,
      year: 1971,
      title: 'What’s Going On — Marvin Gaye',
    },
    derivedFrom: { kind: 'song', slug: 'whats_going_on' },
  },
  {
    kind: 'artist_location',
    slug: 'marvin gaye',
    body: {
      id: 'marvin gaye',
      city: 'Detroit',
      country: 'US',
      lat: 42.33,
      lng: -83.05,
    },
  },
].map((item) => ({ ...item, updatedAt: MTIME }) as MockSeedItem);

let clock = 0;
const makeServer = (
  options: {
    seed?: MockSeedItem[];
    onTouched?: (item: StoredItem) => void;
    uncommitted?: (kind: MockKind) => number;
    committed?: string;
  } = {},
): ContentMockServer =>
  createContentMockServer({
    seed: { items: options.seed ?? SEED },
    mode: 'repo',
    now: () => new Date(Date.UTC(2026, 9, 1) + (clock += 1000)),
    onTouched: options.onTouched,
    uncommitted: options.uncommitted,
    suggestions: options.committed
      ? { committed: parseDecisionsFile(options.committed) }
      : {},
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
    throw new Error(`${response.status}: ${JSON.stringify(response.body)}`);
  return response.body as T;
};

const codeOf = (response: { body: unknown }) =>
  (response.body as { code?: string }).code;

const lookup = (server: ContentMockServer, kind: string, slug: string) =>
  ok<ContentListItem>(
    call(server, 'GET', '/items/lookup', { query: { kind, slug } }),
  );

const detailOf = (server: ContentMockServer, kind: string, slug: string) =>
  ok<ContentItemDetail>(
    call(server, 'GET', `/items/${lookup(server, kind, slug).id}`),
  );

const put = (server: ContentMockServer, input: Record<string, unknown>) =>
  call(server, 'PUT', '/items', { body: input });

type Saved = { item: ContentItemDetail; warnings: ValidationProblem[] };

describe('repo mode: what it serves', () => {
  it('serves the repo’s kinds, all authoritative, with no bundle, and says it is the repo', () => {
    const capabilities = ok<{
      kinds: {
        kind: string;
        authoritative: boolean;
        bundle: string | null;
        schemaVersion: number;
      }[];
      features: Record<string, boolean>;
      store?: string;
    }>(call(makeServer(), 'GET', '/capabilities'));
    expect(capabilities.kinds.map((entry) => entry.kind)).toEqual(REPO_KINDS);
    expect(
      capabilities.kinds.every(
        (entry) => entry.authoritative && entry.bundle === null,
      ),
    ).toBe(true);
    expect(
      capabilities.kinds.find((entry) => entry.kind === 'song')?.schemaVersion,
    ).toBe(2);
    expect(capabilities.features).toEqual({
      export: true,
      lookup: true,
      create: true,
      rename: false,
      merge: false,
      asset: false,
      teachUsage: false,
      suggestions: true,
    });
    expect(capabilities.store).toBe('repo');
    // The contract mock says nothing of a store: that field is repo mode's.
    const mock = createContentMockServer({ seed: { items: [] }, mode: 'all' });
    expect(ok<object>(call(mock, 'GET', '/capabilities'))).not.toHaveProperty(
      'store',
    );
  });

  it('serves exactly the kinds the store has adapters for', () => {
    expect([...REPO_KINDS].sort()).toEqual([...STORE_KINDS].sort());
  });

  it('takes status and updatedAt from the seed: a song bundled.ts does not register is a draft', () => {
    const server = makeServer();
    const draft = lookup(server, 'song', 'thank_you');
    expect(draft.status).toBe('draft');
    expect(draft.updatedAt).toEqual(MTIME);
    expect(draft.revision).toBe(1);
    expect(lookup(server, 'song', 'whats_going_on').status).toBe('published');
    expect(lookup(server, 'studio', 'sunset-sound').status).toBe('published');
  });

  it('reports uncommitted files as what changed since the last publish, and nothing live', () => {
    const server = makeServer({
      uncommitted: (kind) => (kind === 'song' ? 3 : 0),
    });
    const rows = ok<ContentOverviewRow[]>(call(server, 'GET', '/overview'));
    const songs = rows.find((row) => row.kind === 'song')!;
    expect(songs).toEqual({
      kind: 'song',
      total: 2,
      published: 1,
      changedSincePublish: 3,
      pendingReview: 0,
      liveVersion: null,
      livePublishedAt: null,
    });
    expect(rows.find((row) => row.kind === 'studio')?.changedSincePublish).toBe(
      0,
    );
  });

  it('has no published view apart from the working one', () => {
    const server = makeServer();
    for (const kind of ['song', 'studio'] as const) {
      const working = ok(call(server, 'GET', '/export', { query: { kind } }));
      const published = ok(
        call(server, 'GET', '/export', { query: { kind, view: 'published' } }),
      );
      expect(published).toEqual(working);
    }
  });
});

describe('repo mode: who and what', () => {
  it('is admin-only, on every route', () => {
    const server = makeServer();
    for (const [method, path, query] of [
      ['GET', '/capabilities', undefined],
      ['GET', '/overview', undefined],
      ['GET', '/items', { kind: 'song' }],
      ['GET', '/export', { kind: 'song' }],
      ['PUT', '/items', undefined],
    ] as const) {
      const response = call(server, method, path, {
        query,
        viewer: EDITOR,
        body: { kind: 'studio', slug: 'x', body: { slug: 'x', name: 'X' } },
      });
      expect([method, path, response.status, codeOf(response)]).toEqual([
        method,
        path,
        403,
        'REPO_ADMIN_ONLY',
      ]);
    }
  });

  it('has no proposals, releases or rollback: publishing is commit and deploy', () => {
    const server = makeServer();
    const id = lookup(server, 'song', 'whats_going_on').id;
    for (const [method, path] of [
      ['GET', '/pending'],
      ['POST', `/items/${id}/approve`],
      ['POST', `/items/${id}/reject`],
      ['POST', `/items/${id}/discard-edit`],
      ['GET', '/releases'],
      ['POST', '/releases'],
      ['POST', '/releases/r1/parts/0'],
      ['POST', '/releases/r1/activate'],
      ['POST', '/releases/r1/cancel'],
      ['POST', '/rollback'],
    ] as const) {
      const response = call(server, method, path, { body: { kind: 'song' } });
      expect([path, response.status, codeOf(response)]).toEqual([
        path,
        404,
        'REPO_MODE',
      ]);
    }
    expect(server.cdnManifest().kinds).toEqual({});
  });

  it('never writes artist locations: they pin the songs', () => {
    const server = makeServer();
    const location = lookup(server, 'artist_location', 'marvin gaye');
    const body = { ...detailOf(server, 'artist_location', 'marvin gaye').body };
    const moved = put(server, {
      kind: 'artist_location',
      slug: 'marvin gaye',
      body: { ...body, city: 'Los Angeles' },
    });
    expect([moved.status, codeOf(moved)]).toEqual([403, 'REPO_READ_ONLY']);
    const deleted = call(server, 'DELETE', `/items/${location.id}`);
    expect([deleted.status, codeOf(deleted)]).toEqual([403, 'REPO_READ_ONLY']);
    expect(detailOf(server, 'artist_location', 'marvin gaye').body.city).toBe(
      'Detroit',
    );
  });

  it('keeps bodies only: overrides need the API', () => {
    const response = put(makeServer(), {
      kind: 'studio',
      slug: 'sunset-sound',
      body: { slug: 'sunset-sound', name: 'Sunset Sound' },
      overrides: { name: 'Sunset' },
    });
    expect([response.status, codeOf(response)]).toEqual([400, 'BAD_REQUEST']);
  });

  it('uploads no assets', () => {
    const served = serveContentRequest(
      makeServer(),
      '/api/admin/content/asset',
      { method: 'POST', body: new FormData() },
      ADMIN,
    );
    expect(served.response.status).toBe(404);
  });
});

describe('repo mode: a save', () => {
  it('is saved as it is asked, and derives nothing: a song’s event changes only when it is edited', () => {
    const touched: string[] = [];
    const server = makeServer({
      onTouched: (item) => touched.push(`${item.kind}:${item.slug}`),
    });
    const event = detailOf(server, 'globe_event', 'song-whats_going_on');
    const saved = ok<Saved>(
      put(server, {
        kind: 'song',
        slug: 'whats_going_on',
        body: song('whats_going_on', { year: 1971 }),
      }),
    );
    expect(saved.item.body.year).toBe(1971);
    expect(saved.item.status).toBe('published');
    expect(touched).toEqual(['song:whats_going_on']);
    const after = detailOf(server, 'globe_event', 'song-whats_going_on');
    expect(after.body).toEqual(event.body);
    expect(after.revision).toBe(event.revision);
  });

  it('has no drafts but a song’s: anything else asked for as a draft is saved published, with a warning', () => {
    const server = makeServer();
    const studio = ok<Saved>(
      put(server, {
        kind: 'studio',
        slug: 'sunset-sound',
        body: { slug: 'sunset-sound', name: 'Sunset Sound Recorders' },
        status: 'draft',
      }),
    );
    expect(studio.item.status).toBe('published');
    expect(studio.warnings).toEqual([
      expect.objectContaining({
        code: 'REPO_NO_DRAFTS',
        slug: 'sunset-sound',
        severity: 'warning',
      }),
    ]);
    // A song can be a draft (out of bundled.ts), and published again.
    const drafted = ok<Saved>(
      put(server, {
        kind: 'song',
        slug: 'whats_going_on',
        body: song('whats_going_on'),
        status: 'draft',
      }),
    );
    expect([drafted.item.status, drafted.warnings]).toEqual(['draft', []]);
    const archived = ok<Saved>(
      put(server, {
        kind: 'song',
        slug: 'whats_going_on',
        body: song('whats_going_on'),
        status: 'archived',
      }),
    );
    expect(archived.item.status).toBe('draft');
    expect(archived.warnings.map((problem) => problem.code)).toEqual([
      'REPO_NO_DRAFTS',
    ]);
    const published = ok<Saved>(
      put(server, {
        kind: 'song',
        slug: 'whats_going_on',
        body: song('whats_going_on'),
        status: 'published',
      }),
    );
    expect(published.item.status).toBe('published');
  });

  it('starts a new song as a draft and anything else published, under the id a reload gives it', () => {
    const touched: StoredItem[] = [];
    const server = makeServer({ onTouched: (item) => touched.push(item) });
    const made = ok<Saved>(
      put(server, {
        kind: 'studio',
        slug: 'motown-studio-b',
        body: { slug: 'motown-studio-b', name: 'Motown Studio B' },
        create: true,
      }),
    );
    expect(made.item.status).toBe('published');
    const newSong = ok<Saved>(
      put(server, {
        kind: 'song',
        slug: 'inner_city_blues',
        body: song('inner_city_blues'),
        create: true,
      }),
    );
    expect(newSong.item.status).toBe('draft');
    expect(touched.map((item) => item.slug)).toEqual([
      'motown-studio-b',
      'inner_city_blues',
    ]);

    // The store writes them, and reloads: they keep their ids.
    const reloaded = makeServer({
      seed: [
        ...SEED,
        {
          kind: 'studio',
          slug: 'motown-studio-b',
          body: { slug: 'motown-studio-b', name: 'Motown Studio B' },
        },
        {
          kind: 'song',
          slug: 'inner_city_blues',
          body: song('inner_city_blues'),
          status: 'draft',
        },
      ],
    });
    expect(lookup(reloaded, 'studio', 'motown-studio-b').id).toBe(made.item.id);
    expect(lookup(reloaded, 'song', 'inner_city_blues').id).toBe(
      newSong.item.id,
    );

    // Deleted and made again, it takes the same id.
    ok(call(server, 'DELETE', `/items/${made.item.id}`));
    const again = ok<Saved>(
      put(server, {
        kind: 'studio',
        slug: 'motown-studio-b',
        body: { slug: 'motown-studio-b', name: 'Motown B' },
        create: true,
      }),
    );
    expect(again.item.id).toBe(made.item.id);
    expect(again.item.body.name).toBe('Motown B');
  });

  it('refuses create:true for a slug the files hold', () => {
    const response = put(makeServer(), {
      kind: 'studio',
      slug: 'sunset-sound',
      body: { slug: 'sunset-sound', name: 'Sunset Sound' },
      create: true,
    });
    expect([response.status, codeOf(response)]).toEqual([409, 'SLUG_TAKEN']);
  });

  it('checks the revision the edit started from', () => {
    const server = makeServer();
    const studio = lookup(server, 'studio', 'sunset-sound');
    const body = { slug: 'sunset-sound', name: 'Sunset Sound' };
    const saved = ok<Saved>(
      put(server, {
        kind: 'studio',
        slug: 'sunset-sound',
        body,
        expectedRevision: studio.revision,
      }),
    );
    expect(saved.item.revision).toBe(2);
    const stale = put(server, {
      kind: 'studio',
      slug: 'sunset-sound',
      body: { ...body, name: 'Stale' },
      expectedRevision: 1,
    });
    expect([stale.status, codeOf(stale)]).toEqual([409, 'REVISION_CONFLICT']);
    expect((stale.body as { revision: number }).revision).toBe(2);
    expect(detailOf(server, 'studio', 'sunset-sound').body.name).toBe(
      'Sunset Sound',
    );
  });
});

describe('repo mode: a delete', () => {
  it('is refused while another item names the record, unless forced', () => {
    const touched: string[] = [];
    const server = makeServer({
      onTouched: (item) => touched.push(item.slug),
    });
    const studio = lookup(server, 'studio', 'hitsville-u-s-a');
    const refused = call(server, 'DELETE', `/items/${studio.id}`);
    expect([refused.status, codeOf(refused)]).toEqual([409, 'REFERENCED']);
    expect((refused.body as { referrers: unknown }).referrers).toEqual([
      {
        kind: 'song',
        id: lookup(server, 'song', 'whats_going_on').id,
        slug: 'whats_going_on',
        title: 'whats_going_on',
        path: 'session.studioId',
      },
    ]);
    expect(touched).toEqual([]);
    ok(
      call(server, 'DELETE', `/items/${studio.id}`, {
        query: { force: 'true' },
      }),
    );
    expect(touched).toEqual(['hitsville-u-s-a']);
    expect(
      call(server, 'GET', '/items/lookup', {
        query: { kind: 'studio', slug: 'hitsville-u-s-a' },
      }).status,
    ).toBe(404);
  });

  it('never takes a published song out from under students: make it a draft first', () => {
    const server = makeServer();
    const published = lookup(server, 'song', 'whats_going_on');
    const refused = call(server, 'DELETE', `/items/${published.id}`);
    expect([refused.status, codeOf(refused)]).toEqual([422, 'REPO_BAD_CHANGE']);
    // A draft, which nothing names, goes.
    ok(
      call(
        server,
        'DELETE',
        `/items/${lookup(server, 'song', 'thank_you').id}`,
      ),
    );
  });
});

describe('repo mode: validation and decisions', () => {
  it('counts what the files say as live: a published song naming a draft is dangling', () => {
    const server = makeServer();
    expect(ok<{ ok: boolean }>(call(server, 'GET', '/validate/song')).ok).toBe(
      true,
    );
    ok(
      put(server, {
        kind: 'song',
        slug: 'whats_going_on',
        body: song('whats_going_on', {
          relatedRecordings: [
            {
              songId: 'thank_you',
              artist: 'Marvin Gaye',
              relation: 'original',
            },
          ],
        }),
      }),
    );
    const checked = ok<{ ok: boolean; problems: ValidationProblem[] }>(
      call(server, 'GET', '/validate/song'),
    );
    expect(checked.ok).toBe(false);
    expect(checked.problems).toContainEqual(
      expect.objectContaining({
        code: 'DANGLING_REFERENCE',
        slug: 'whats_going_on',
        target: 'song:thank_you',
      }),
    );
  });

  it('never replays the committed decisions: the files are the truth', () => {
    const committed = JSON.stringify({
      artifactsVersion: 1,
      decisions: [
        {
          suggestionId: 's1',
          op: 'accept',
          target: { kind: 'studio', slug: 'sunset-sound' },
          path: 'placeId',
          value: 'detroit',
          valueHash: '0000000000000000',
          method: 'single',
          by: 'admin-1',
          at: '2026-09-30T12:00:00.000Z',
        },
      ],
    });
    const server = makeServer({ committed });
    expect(server.replayCommittedDecisions()).toBeNull();
    expect(detailOf(server, 'studio', 'sunset-sound').body.placeId).toBe(
      undefined,
    );
    expect(server.decisionsFile().decisions).toHaveLength(1);
  });
});

describe('repo mode over the repo itself', () => {
  it('seeds from the store, and every kind validates as it stands', async () => {
    const store = await loadRepoStore();
    const server = createContentMockServer({
      seed: store.seed(),
      mode: 'repo',
    });
    for (const kind of REPO_KINDS) {
      const checked = ok<{ ok: boolean; problems: ValidationProblem[] }>(
        call(server, 'GET', `/validate/${kind}`),
      );
      expect(
        [kind, checked.problems.filter((p) => p.severity !== 'warning')],
        kind,
      ).toEqual([kind, []]);
    }
    const songs = ok<ContentOverviewRow[]>(
      call(server, 'GET', '/overview'),
    ).find((row) => row.kind === 'song')!;
    // Two song files bundled.ts does not register: drafts.
    expect(songs.total - songs.published).toBe(2);
  }, 120_000);
});
