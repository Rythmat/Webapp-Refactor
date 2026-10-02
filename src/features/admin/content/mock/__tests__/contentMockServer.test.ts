import { beforeAll, describe, expect, it } from 'vitest';
import { BUNDLED_MUSIC_HISTORY } from '@/components/atlas/data/events';
import { songIdForEvent } from '@/components/atlas/data/songEventAliases';
import STUDIO_ROWS from '@/content/data/studios.json';
import { GENRES } from '@/content/graph/genres';
import { toSlug } from '@/content/graph/slugs';
import PROGRESSIONS from '@/curriculum/data/chordProgressionLibrary';
import { BUNDLED_SONGS } from '@/curriculum/data/songs/bundled';
import type {
  ContentItemDetail,
  ContentListItem,
  ContentOverviewRow,
  ContentRelease,
  PendingEdit,
  ValidationProblem,
} from '@/hooks/data/admin/useAdminContent';
import {
  createContentMockServer,
  type ContentMockServer,
  type MockSeed,
  type MockViewer,
} from '../contentMockServer';
import type { ContentMockMode } from '../mockSwitch';
import { createMockStateCodec } from '../persist';
import { loadSeed } from '../seed';

/**
 * The offline mock against the contract it imitates
 * (docs/console-content-api-contract.md), on the real seed: the console will
 * be built against this server, so its semantics are what is under test.
 */

const ADMIN: MockViewer = { role: 'admin', userId: 'admin-1', name: 'Ada' };
const EDITOR: MockViewer = { role: 'editor', userId: 'ed-1', name: 'Eddie' };
const OTHER_EDITOR: MockViewer = {
  role: 'editor',
  userId: 'ed-2',
  name: 'Otto',
};

let seeds: Record<Exclude<ContentMockMode, 'repo'>, MockSeed>;

beforeAll(async () => {
  seeds = { all: await loadSeed('all'), legacy: await loadSeed('legacy') };
}, 60_000);

let clock = 0;
const makeServer = (mode: Exclude<ContentMockMode, 'repo'> = 'all') =>
  createContentMockServer({
    seed: seeds[mode],
    mode,
    // A clock that always moves, so orderings by time are deterministic.
    now: () => new Date(Date.UTC(2026, 9, 1) + (clock += 1000)),
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

/** A 2xx body, failing the test with the error body otherwise. */
const ok = <T>(response: { status: number; body: unknown }): T => {
  if (response.status !== 200)
    throw new Error(
      `Expected 200, got ${response.status}: ${JSON.stringify(response.body)}`,
    );
  return response.body as T;
};

const lookupId = (server: ContentMockServer, kind: string, slug: string) =>
  ok<ContentListItem>(
    call(server, 'GET', '/items/lookup', { query: { kind, slug } }),
  ).id;

const detailOf = (
  server: ContentMockServer,
  kind: string,
  slug: string,
  viewer = ADMIN,
) =>
  ok<ContentItemDetail>(
    call(server, 'GET', `/items/${lookupId(server, kind, slug)}`, { viewer }),
  );

const put = (
  server: ContentMockServer,
  input: Record<string, unknown>,
  viewer = ADMIN,
) => call(server, 'PUT', '/items', { body: input, viewer });

const overviewRow = (server: ContentMockServer, kind: string) =>
  ok<ContentOverviewRow[]>(call(server, 'GET', '/overview')).find(
    (row) => row.kind === kind,
  )!;

/** Run the publish loop exactly as usePublishContent does. */
const publish = (server: ContentMockServer, kind: string) => {
  const created = ok<{ releaseId: string; parts: number[]; version: number }>(
    call(server, 'POST', '/releases', { body: { kind } }),
  );
  for (const part of created.parts)
    ok(call(server, 'POST', `/releases/${created.releaseId}/parts/${part}`));
  return ok<ContentRelease>(
    call(server, 'POST', `/releases/${created.releaseId}/activate`),
  );
};

/** Read one published body back out of the mock CDN. */
const fromCdn = (
  server: ContentMockServer,
  bundle: string,
  match: (body: Record<string, unknown>) => boolean,
) => {
  const entry = server.cdnManifest().kinds[bundle]!;
  for (const object of entry.objects) {
    const bodies = JSON.parse(server.cdnObjectText(object.key)!) as Record<
      string,
      unknown
    >[];
    const found = bodies.find(match);
    if (found) return found;
  }
  return undefined;
};

const africa = () =>
  JSON.parse(JSON.stringify(BUNDLED_SONGS.africa)) as Record<string, unknown>;

/**
 * The studios the seed holds: studios.json's rows. The four pilot studios
 * until the bulk import of 30 September 2026 added 105.
 */
const SEEDED_STUDIOS = STUDIO_ROWS.map((row) => row.slug);

describe('the seed', () => {
  it('holds what the app ships, all published with a live v1', () => {
    const server = makeServer();
    const rows = ok<ContentOverviewRow[]>(call(server, 'GET', '/overview'));
    const totals = Object.fromEntries(rows.map((row) => [row.kind, row.total]));
    // The bulk import of 30 September 2026 made 349 places (299 cities
    // before), 133 labels and 105 studios (the four pilots of each before),
    // 1,022 artists and 411 releases (none before), in src/content/data.
    expect(totals).toEqual({
      globe_city: 648,
      label: 137,
      studio: 109,
      // 907 artists and 362 song pins before 30 Sep 2026. The owner's 23
      // duplicate merges and the album title "Remind In Light" left 883
      // artists. Of the 23 dropped spellings' pins, 12 were dropped because
      // the kept name has its own (Joe Legend's said Ottawa; John Legend's
      // Springfield stands), 10 moved to the kept name, and Redbone (Pat
      // Vegas) had none. Remind In Light's pin repeated Talking Heads'. So
      // 349 pins. The bulk import's 1,022 artists make 1,905; 1,903 since its
      // review took out two film producers credited on "Dock of the Bay",
      // and its 411 releases 407, less four albums that came out years after
      // the recording (a compilation, a soundtrack).
      artist: 1903,
      release: 407,
      // bundled.ts's 638, plus the two charts it leaves out that the store has.
      song: 640,
      globe_event: 1723,
      activity_flow: expect.any(Number),
      fundamentals_flow: 1,
      artist_location: 349,
      chord_progression: 695,
    });
    // Every kind is live at v1, releases too now the seed holds some (with
    // none until the import, they had no live version).
    for (const row of rows) {
      expect(row.published, row.kind).toBe(row.total);
      expect(row.changedSincePublish, row.kind).toBe(0);
      expect(row.liveVersion, row.kind).toBe(1);
    }
  });

  it('seeds the pilot studios and labels, from src/content/data, with toSlug slugs and real places', () => {
    // The four pilot songs' studios and labels (contract priority 5), the
    // first rows of studios.json and labels.json.
    const pilots = {
      studio: [
        'hitsville-u-s-a',
        'sunset-sound',
        'britannia-row',
        'abbey-road-studios',
      ],
      label: ['tamla', 'columbia', 'chrysalis', 'apple'],
    };
    const server = makeServer();
    for (const [kind, slugs] of Object.entries(pilots))
      for (const slug of slugs) {
        const { body } = detailOf(server, kind, slug);
        expect(slug).toBe(toSlug(String(body.name)));
        expect(
          lookupId(server, 'globe_city', String(body.placeId)),
        ).toBeTruthy();
      }
    expect(detailOf(server, 'label', 'columbia').body.placeId).toBe('new-york');
    for (const place of ['detroit', 'los-angeles', 'london', 'new-york'])
      expect(lookupId(server, 'globe_city', place)).toBeTruthy();
    expect(detailOf(server, 'globe_city', 'new-york').body.aliases).toEqual([
      'New York',
      'NYC',
    ]);
  });

  it('passes its own validation, the song events included', () => {
    const server = makeServer();
    for (const kind of [
      'song',
      'artist',
      'studio',
      'label',
      'globe_city',
      'globe_event',
      'chord_progression',
      'activity_flow',
    ]) {
      const result = ok<{ ok: boolean; problems: ValidationProblem[] }>(
        call(server, 'GET', `/validate/${kind}`),
      );
      expect(
        result.problems.filter((p) => p.severity !== 'warning'),
        kind,
      ).toEqual([]);
      expect(result.ok, kind).toBe(true);
    }
    // Every song event has its song, by its id or by its alias: the BBC live
    // Valerie is the song valerie (songEventAliases.ts). songEventLinks.test.ts
    // holds the repo to the same.
    const seededSongs = new Set(
      seeds.all.items
        .filter((item) => item.kind === 'song')
        .map((item) => item.slug),
    );
    const orphans = BUNDLED_MUSIC_HISTORY.filter((event) => {
      const song = songIdForEvent(event.id);
      return song !== null && !seededSongs.has(song);
    }).map((event) => event.id);
    expect(orphans).toEqual([]);
  });
});

describe('GET /capabilities', () => {
  it('reports every kind with its identity, and the contract features', () => {
    const server = makeServer();
    const caps = ok<{
      kinds: {
        kind: string;
        identity: string;
        schemaVersion: number;
        bundle: string | null;
        authoritative: boolean;
      }[];
      features: Record<string, boolean>;
      artifactsVersion: number;
    }>(call(server, 'GET', '/capabilities'));
    const byKind = Object.fromEntries(caps.kinds.map((k) => [k.kind, k]));
    expect(byKind.artist).toEqual({
      kind: 'artist',
      identity: 'slug',
      // The artist body with `born` (contract §2, 5b).
      schemaVersion: 2,
      bundle: 'artists',
      authoritative: true,
    });
    // The contract's latest bodies: song v2, and the v2 city and event.
    expect(byKind.song).toMatchObject({ identity: 'id', schemaVersion: 2 });
    expect(byKind.globe_city).toMatchObject({ schemaVersion: 2 });
    expect(byKind.globe_event).toMatchObject({ schemaVersion: 2 });
    expect(byKind.activity_flow).toMatchObject({ schemaVersion: 1 });
    // Never published, so no bundle yet. Releases have one since the bulk
    // import of 30 September 2026 put 411 in the seed, published with it.
    expect(byKind.release.bundle).toBe('releases');
    expect(byKind.artist_location.bundle).toBeNull();
    expect(caps.features).toEqual({
      export: true,
      lookup: true,
      create: true,
      rename: false,
      merge: false,
      asset: true,
      teachUsage: false,
      suggestions: true,
    });
    // The repo's files are version 4 (manifest.json), and the mock runs
    // them.
    expect(caps.artifactsVersion).toBe(4);
  });
});

describe('GET /items', () => {
  it('pages through a kind with nextCursor', () => {
    const server = makeServer();
    const seen = new Set<string>();
    let cursor: string | null = null;
    let pages = 0;
    do {
      const page: { items: ContentListItem[]; nextCursor: string | null } = ok(
        call(server, 'GET', '/items', {
          query: { kind: 'song', limit: '200', ...(cursor ? { cursor } : {}) },
        }),
      );
      for (const item of page.items) seen.add(item.slug);
      cursor = page.nextCursor;
      pages += 1;
    } while (cursor);
    expect(pages).toBe(4);
    expect(seen.size).toBe(640);
  });

  it('returns every match with no limit, and filters by search and status', () => {
    const server = makeServer();
    // The contract sets no page size, and the console's tables do not page.
    const all = ok<{ items: ContentListItem[]; nextCursor: string | null }>(
      call(server, 'GET', '/items', { query: { kind: 'globe_event' } }),
    );
    expect(all.items).toHaveLength(1723);
    expect(all.nextCursor).toBeNull();

    const found = ok<{ items: ContentListItem[] }>(
      call(server, 'GET', '/items', {
        query: { kind: 'song', search: 'AFRICA' },
      }),
    );
    expect(found.items.map((item) => item.slug)).toContain('africa');
    expect(found.items[0]).toMatchObject({
      kind: 'song',
      status: 'published',
      subtitle: 'Toto',
      editState: null,
    });

    const drafts = ok<{ items: ContentListItem[] }>(
      call(server, 'GET', '/items', {
        query: { kind: 'song', status: 'draft' },
      }),
    );
    expect(drafts.items).toEqual([]);
  });

  it('answers 400 for a kind it does not serve, or a bad limit', () => {
    const server = makeServer();
    expect(
      call(server, 'GET', '/items', { query: { kind: 'teach_unit' } }).status,
    ).toBe(400);
    expect(
      call(server, 'GET', '/items', { query: { kind: 'song', limit: '0' } })
        .status,
    ).toBe(400);
  });
});

describe('PUT /items', () => {
  it('saves an admin edit in place and answers { item, warnings }', () => {
    const server = makeServer();
    const saved = ok<{ item: ContentItemDetail; warnings: unknown[] }>(
      put(server, {
        kind: 'song',
        slug: 'africa',
        body: { ...africa(), title: 'Africa (edited)' },
        note: 'Title fix',
      }),
    );
    expect(saved.warnings).toEqual([]);
    expect(saved.item.body.title).toBe('Africa (edited)');
    expect(saved.item.status).toBe('published');
    expect(saved.item.Revisions.map((r) => r.revision)).toEqual([2, 1]);
    expect(saved.item.Revisions[0]).toMatchObject({
      note: 'Title fix',
      authorId: 'admin-1',
    });
    expect(overviewRow(server, 'song').changedSincePublish).toBe(1);
  });

  it('holds an editor save as a proposal beside the live body', () => {
    const server = makeServer();
    const saved = ok<{ item: ContentItemDetail }>(
      put(
        server,
        {
          kind: 'song',
          slug: 'africa',
          body: { ...africa(), title: 'Proposed' },
          status: 'archived',
          note: 'Better title',
        },
        EDITOR,
      ),
    );
    expect(saved.item.body.title).toBe('Africa');
    expect(saved.item.pendingBody?.title).toBe('Proposed');
    expect(saved.item.editState).toBe('pending');
    // An editor cannot move status.
    expect(saved.item.status).toBe('published');

    // Another editor sees that a proposal exists, not what it says.
    const other = detailOf(server, 'song', 'africa', OTHER_EDITOR);
    expect(other.editState).toBe('pending');
    expect(other.pendingBody).toBeNull();

    const queue = ok<PendingEdit[]>(call(server, 'GET', '/pending'));
    expect(queue).toEqual([
      expect.objectContaining({
        slug: 'africa',
        title: 'Proposed',
        isNew: false,
        note: 'Better title',
        submittedBy: { id: 'ed-1', name: 'Eddie' },
      }),
    ]);
  });

  it('applies a proposal on approve and marks the item published', () => {
    const server = makeServer();
    put(
      server,
      {
        kind: 'song',
        slug: 'africa',
        body: { ...africa(), title: 'Proposed' },
      },
      EDITOR,
    );
    const id = lookupId(server, 'song', 'africa');
    const approved = ok<ContentItemDetail>(
      call(server, 'POST', `/items/${id}/approve`),
    );
    expect(approved.body.title).toBe('Proposed');
    expect(approved.pendingBody).toBeNull();
    expect(approved.editState).toBeNull();
    expect(approved.Revisions[0].authorId).toBe('ed-1');
    expect(ok<PendingEdit[]>(call(server, 'GET', '/pending'))).toEqual([]);
  });

  it('needs a note to reject, keeps the proposal, and lets its author discard it', () => {
    const server = makeServer();
    put(
      server,
      { kind: 'song', slug: 'africa', body: { ...africa(), title: 'Nope' } },
      EDITOR,
    );
    const id = lookupId(server, 'song', 'africa');

    const bare = call(server, 'POST', `/items/${id}/reject`, { body: {} });
    expect(bare.status).toBe(400);
    expect(bare.body).toMatchObject({ code: 'BAD_REQUEST' });

    const rejected = ok<ContentItemDetail>(
      call(server, 'POST', `/items/${id}/reject`, {
        body: { note: 'Keep the original' },
      }),
    );
    expect(rejected).toMatchObject({
      editState: 'rejected',
      reviewNote: 'Keep the original',
    });
    expect(detailOf(server, 'song', 'africa', EDITOR).pendingBody?.title).toBe(
      'Nope',
    );

    expect(
      call(server, 'POST', `/items/${id}/discard-edit`, {
        viewer: OTHER_EDITOR,
      }).status,
    ).toBe(403);
    ok(call(server, 'POST', `/items/${id}/discard-edit`, { viewer: EDITOR }));
    const after = detailOf(server, 'song', 'africa');
    expect(after.pendingBody).toBeNull();
    expect(after.editState).toBeNull();
    expect(after.body.title).toBe('Africa');
  });

  it('refuses create:true for a slug that exists in any state', () => {
    const server = makeServer();
    const taken = put(server, {
      kind: 'song',
      slug: 'africa',
      body: africa(),
      create: true,
    });
    expect(taken.status).toBe(409);
    expect(taken.body).toEqual({
      error: expect.any(String),
      code: 'SLUG_TAKEN',
      kind: 'song',
      slug: 'africa',
      id: lookupId(server, 'song', 'africa'),
    });

    // A new item that exists only as someone's proposal is taken too.
    ok(
      put(
        server,
        {
          kind: 'studio',
          slug: 'motown-studio-b',
          body: { slug: 'motown-studio-b', name: 'Motown Studio B' },
          create: true,
        },
        EDITOR,
      ),
    );
    expect(
      put(
        server,
        {
          kind: 'studio',
          slug: 'motown-studio-b',
          body: { slug: 'motown-studio-b', name: 'Again' },
          create: true,
        },
        OTHER_EDITOR,
      ).body,
    ).toMatchObject({ code: 'SLUG_TAKEN' });
  });

  it('keeps a new proposal from other editors but lets lookup find it', () => {
    const server = makeServer();
    // A label the seed lacks. (Motown until the bulk import of 30 September
    // 2026 made it.)
    put(
      server,
      {
        kind: 'label',
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
    const listFor = (viewer: MockViewer) =>
      ok<{ items: ContentListItem[] }>(
        call(server, 'GET', '/items', { query: { kind: 'label' }, viewer }),
      ).items.map((item) => item.slug);
    expect(listFor(EDITOR)).toContain('philadelphia-international');
    expect(listFor(ADMIN)).toContain('philadelphia-international');
    expect(listFor(OTHER_EDITOR)).not.toContain('philadelphia-international');

    const found = ok<ContentListItem>(
      call(server, 'GET', '/items/lookup', {
        query: { kind: 'label', slug: 'philadelphia-international' },
        viewer: OTHER_EDITOR,
      }),
    );
    expect(found).toMatchObject({
      title: 'Philadelphia International',
      status: 'draft',
    });

    // No stored body yet: the proposal stands in, so the edit page can open
    // it for review.
    const asAdmin = detailOf(server, 'label', 'philadelphia-international');
    expect(asAdmin.body).toEqual(asAdmin.pendingBody);
    expect(asAdmin.pendingBody).toMatchObject({
      name: 'Philadelphia International',
    });
    expect(asAdmin.status).toBe('draft');
    expect(ok<PendingEdit[]>(call(server, 'GET', '/pending'))[0].isNew).toBe(
      true,
    );
  });

  it('rejects what the contract rejects with 422 VALIDATION_FAILED', () => {
    const server = makeServer();
    const problemsOf = (response: { status: number; body: unknown }) => {
      expect(response.status).toBe(422);
      const body = response.body as {
        code: string;
        problems: ValidationProblem[];
      };
      expect(body.code).toBe('VALIDATION_FAILED');
      return body.problems;
    };

    expect(
      problemsOf(
        put(server, { kind: 'song', slug: 'not_africa', body: africa() }),
      ),
    ).toEqual([
      expect.objectContaining({ code: 'SLUG_ID_MISMATCH', path: 'id' }),
    ]);

    expect(
      problemsOf(
        put(server, {
          kind: 'artist',
          slug: 'Bad Slug',
          body: { slug: 'Bad Slug', name: 'Bad' },
        }),
      ),
    ).toEqual([
      expect.objectContaining({ code: 'INVALID_BODY', path: 'slug' }),
    ]);

    expect(
      problemsOf(
        put(server, {
          kind: 'artist',
          slug: 'someone-new',
          body: { slug: 'someone-new', name: 'Someone', imageRef: 'x' },
        }),
      ),
    ).toEqual([expect.objectContaining({ code: 'INVALID_BODY' })]);

    // A namespaced id in an id field is a wrong-kind value.
    expect(
      problemsOf(
        put(server, {
          kind: 'studio',
          slug: 'sunset-sound',
          body: {
            slug: 'sunset-sound',
            name: 'Sunset Sound',
            placeId: 'place:los-angeles',
          },
        }),
      ),
    ).toEqual([
      expect.objectContaining({
        code: 'INVALID_REFERENCE',
        path: 'placeId',
        severity: 'error',
      }),
    ]);
  });

  it('says what is wrong in `error`, which is what the pages show', () => {
    const server = makeServer();
    const errorOf = (input: Record<string, unknown>) => {
      const response = put(server, input);
      expect(response.status).toBe(422);
      return response.body as { error: string; problems: unknown[] };
    };

    const mismatch = errorOf({
      kind: 'song',
      slug: 'not_africa',
      body: africa(),
    });
    expect(mismatch.error).toBe(
      'Invalid song body — The slug "not_africa" must equal body.id ("africa").',
    );

    const unknownKey = errorOf({
      kind: 'artist',
      slug: 'someone-new',
      body: { slug: 'someone-new', name: 'Someone', bogus: 1 },
    });
    expect(unknownKey.error).toMatch(/^Invalid artist body — .*bogus/);

    const namespaced = errorOf({
      kind: 'artist',
      slug: 'someone-new',
      body: {
        slug: 'someone-new',
        name: 'Someone',
        basedInPlaceId: 'place:detroit',
      },
    });
    expect(namespaced.error).toMatch(
      /^Invalid artist body — basedInPlaceId must be a place slug/,
    );
    // A value that is not a slug names nothing, so there is no target.
    expect(namespaced.problems[0]).not.toHaveProperty('target');
  });

  it('validates song v2 and the event v2 body, and holds their ids to their patterns', () => {
    const server = makeServer();
    // A key neither level has is still refused: v2 is strict too.
    const unknown = put(server, {
      kind: 'song',
      slug: 'africa',
      body: { ...africa(), albums: ['Toto IV'] },
    });
    expect(unknown.status).toBe(422);

    // A hand-authored event stores who, what and where it is about; `[]`
    // says "reviewed: none", and a value off its pattern is refused.
    const slug = 'evt-elvis-memphis-1954';
    const evt = detailOf(server, 'globe_event', slug).body;
    const saved = ok<{ warnings: ValidationProblem[] }>(
      put(server, {
        kind: 'globe_event',
        slug,
        body: {
          ...evt,
          artistIds: ['elvis-presley'],
          songIds: [],
          placeId: 'memphis',
          releaseIds: ['elvis-presley-the-sun-sessions'],
          studioIds: [],
          unverified: true,
          source: 'wikipedia',
        },
      }),
    );
    // Elvis and Memphis are published; the record is not made yet.
    expect(saved.warnings).toEqual([
      expect.objectContaining({
        code: 'UNPUBLISHED_REFERENCE',
        path: 'releaseIds[0]',
      }),
    ]);
    expect(detailOf(server, 'globe_event', slug).body).toMatchObject({
      artistIds: ['elvis-presley'],
      songIds: [],
      studioIds: [],
    });
    const refused = put(server, {
      kind: 'globe_event',
      slug,
      body: { ...evt, studioIds: ['Studio:Nope'] },
    });
    expect(refused.status).toBe(422);
    expect(
      (refused.body as { problems: ValidationProblem[] }).problems,
    ).toEqual([
      expect.objectContaining({
        code: 'INVALID_REFERENCE',
        path: 'studioIds[0]',
      }),
    ]);
  });

  it('warns, without rejecting, about a link to something not yet published', () => {
    const server = makeServer();
    const saved = ok<{
      item: ContentItemDetail;
      warnings: ValidationProblem[];
    }>(
      put(server, {
        kind: 'artist',
        slug: 'toto',
        body: {
          slug: 'toto',
          name: 'Toto',
          basedInPlaceId: 'atlantis',
          labelIds: ['columbia'],
        },
      }),
    );
    expect(saved.warnings).toEqual([
      expect.objectContaining({
        code: 'UNPUBLISHED_REFERENCE',
        severity: 'warning',
        path: 'basedInPlaceId',
        target: 'place:atlantis',
      }),
    ]);
  });
});

describe('DELETE /items/:id', () => {
  it('soft-deletes: gone from the API, still live until the next publish', () => {
    const server = makeServer();
    const id = lookupId(server, 'studio', 'britannia-row');
    expect(
      call(server, 'DELETE', `/items/${id}`, { viewer: EDITOR }).status,
    ).toBe(403);
    ok(call(server, 'DELETE', `/items/${id}`));

    expect(call(server, 'GET', `/items/${id}`).status).toBe(404);
    expect(
      call(server, 'GET', '/items/lookup', {
        query: { kind: 'studio', slug: 'britannia-row' },
      }).status,
    ).toBe(404);
    expect(overviewRow(server, 'studio')).toMatchObject({
      total: SEEDED_STUDIOS.length - 1,
      changedSincePublish: 1,
    });
    expect(
      fromCdn(server, 'studios', (b) => b.slug === 'britannia-row'),
    ).toBeTruthy();

    // The slug is free again, under a new id.
    const again = ok<{ item: ContentItemDetail }>(
      put(server, {
        kind: 'studio',
        slug: 'britannia-row',
        body: {
          slug: 'britannia-row',
          name: 'Britannia Row',
          placeId: 'london',
        },
        create: true,
      }),
    );
    expect(again.item.id).not.toBe(id);
  });
});

describe('GET /export', () => {
  const setup = () => {
    const server = makeServer();
    put(server, {
      kind: 'studio',
      slug: 'sunset-sound',
      body: {
        slug: 'sunset-sound',
        name: 'Sunset Sound (admin)',
        placeId: 'los-angeles',
      },
    });
    put(
      server,
      {
        kind: 'studio',
        slug: 'abbey-road-studios',
        body: {
          slug: 'abbey-road-studios',
          name: 'Abbey Road (proposed)',
          placeId: 'london',
        },
      },
      EDITOR,
    );
    put(
      server,
      {
        kind: 'studio',
        slug: 'electric-lady',
        body: {
          slug: 'electric-lady',
          name: 'Electric Lady',
          placeId: 'new-york',
        },
        create: true,
      },
      EDITOR,
    );
    return server;
  };
  type Page = {
    items: {
      slug: string;
      status: string;
      editState: string | null;
      body: Record<string, unknown> | null;
      pendingBody?: Record<string, unknown>;
    }[];
    nextCursor: string | null;
  };
  const exportFor = (
    server: ContentMockServer,
    viewer: MockViewer,
    query: Record<string, string> = {},
  ) =>
    ok<Page>(
      call(server, 'GET', '/export', {
        query: { kind: 'studio', ...query },
        viewer,
      }),
    );
  const row = (page: Page, slug: string) =>
    page.items.find((item) => item.slug === slug);

  it('gives an admin stored bodies plus every proposal', () => {
    const page = exportFor(setup(), ADMIN);
    // Every seeded studio, and the proposed one, in slug order.
    expect(SEEDED_STUDIOS).not.toContain('electric-lady');
    expect(page.items.map((item) => item.slug)).toEqual(
      [...SEEDED_STUDIOS, 'electric-lady'].sort(),
    );
    expect(row(page, 'sunset-sound')?.body?.name).toBe('Sunset Sound (admin)');
    expect(row(page, 'abbey-road-studios')).toMatchObject({
      body: { name: 'Abbey Road Studios' },
      pendingBody: { name: 'Abbey Road (proposed)' },
      editState: 'pending',
    });
    expect(row(page, 'electric-lady')).toMatchObject({
      body: null,
      pendingBody: { name: 'Electric Lady' },
      status: 'draft',
    });
  });

  it('gives an editor their own proposals as the body, and nobody else’s', () => {
    const server = setup();
    const own = exportFor(server, EDITOR);
    expect(row(own, 'abbey-road-studios')?.body?.name).toBe(
      'Abbey Road (proposed)',
    );
    expect(row(own, 'abbey-road-studios')).not.toHaveProperty('pendingBody');
    expect(row(own, 'electric-lady')?.body?.name).toBe('Electric Lady');

    const other = exportFor(server, OTHER_EDITOR);
    expect(row(other, 'abbey-road-studios')?.body?.name).toBe(
      'Abbey Road Studios',
    );
    expect(row(other, 'abbey-road-studios')).not.toHaveProperty('pendingBody');
    expect(row(other, 'electric-lady')).toBeUndefined();
  });

  it('serves the live release in the published view', () => {
    const page = exportFor(setup(), ADMIN, { view: 'published' });
    expect(page.items).toHaveLength(SEEDED_STUDIOS.length);
    expect(row(page, 'sunset-sound')).toMatchObject({
      body: { name: 'Sunset Sound' },
      status: 'published',
      editState: null,
    });
    expect(row(page, 'electric-lady')).toBeUndefined();
  });

  it('omits sections and audio sources, pages, and refuses bad parameters', () => {
    const server = makeServer();
    const songs = ok<Page>(
      call(server, 'GET', '/export', {
        query: { kind: 'song', omit: 'sections,audioSources', limit: '600' },
      }),
    );
    expect(songs.items).toHaveLength(500);
    expect(songs.nextCursor).not.toBeNull();
    expect(songs.items[0].body).not.toHaveProperty('sections');
    expect(songs.items[0].body).toHaveProperty('title');
    const refused: Record<string, string>[] = [
      { kind: 'song', omit: 'title' },
      { kind: 'song', view: 'draft' },
      { kind: 'song', limit: '-1' },
      { kind: 'nope' },
    ];
    for (const query of refused)
      expect(call(server, 'GET', '/export', { query }).status).toBe(400);
  });
});

describe('releases and the mock CDN', () => {
  it('publishes a kind: parts, activate, and the CDN serves the change', () => {
    const server = makeServer();
    put(server, {
      kind: 'song',
      slug: 'africa',
      body: { ...africa(), title: 'Africa (v2)' },
    });

    const live = publish(server, 'song');
    expect(live).toMatchObject({
      kind: 'song',
      version: 2,
      status: 'live',
      itemCount: 640,
    });
    expect(live.objectKeys).toHaveLength(4);
    expect(live.totalBytes).toBeGreaterThan(1_000_000);

    const manifest = server.cdnManifest();
    expect(manifest.kinds.songs).toMatchObject({ version: 2, itemCount: 640 });
    expect(fromCdn(server, 'songs', (b) => b.id === 'africa')?.title).toBe(
      'Africa (v2)',
    );

    const releases = ok<ContentRelease[]>(call(server, 'GET', '/releases'));
    const songReleases = releases.filter((r) => r.kind === 'song');
    expect(songReleases.map((r) => [r.version, r.status])).toEqual([
      [2, 'live'],
      [1, 'superseded'],
    ]);
    expect(overviewRow(server, 'song')).toMatchObject({
      liveVersion: 2,
      changedSincePublish: 0,
    });
  });

  it('rolls back to an earlier version, and forward again', () => {
    const server = makeServer();
    put(server, {
      kind: 'song',
      slug: 'africa',
      body: { ...africa(), title: 'Africa (v2)' },
    });
    publish(server, 'song');

    ok(
      call(server, 'POST', '/rollback', { body: { kind: 'song', version: 1 } }),
    );
    expect(server.cdnManifest().kinds.songs?.version).toBe(1);
    expect(fromCdn(server, 'songs', (b) => b.id === 'africa')?.title).toBe(
      'Africa',
    );
    const statuses = () =>
      ok<ContentRelease[]>(call(server, 'GET', '/releases'))
        .filter((r) => r.kind === 'song')
        .map((r) => [r.version, r.status]);
    expect(statuses()).toEqual([
      [2, 'rolled_back'],
      [1, 'live'],
    ]);

    ok(
      call(server, 'POST', '/rollback', { body: { kind: 'song', version: 2 } }),
    );
    expect(statuses()).toEqual([
      [2, 'live'],
      [1, 'rolled_back'],
    ]);
    // The live version cannot be "rolled back" to.
    expect(
      call(server, 'POST', '/rollback', { body: { kind: 'song', version: 2 } })
        .status,
    ).toBe(409);
  });

  it('cancels a building release, which then cannot activate', () => {
    const server = makeServer();
    const created = ok<{ releaseId: string }>(
      call(server, 'POST', '/releases', { body: { kind: 'label' } }),
    );
    expect(
      call(server, 'POST', '/releases', { body: { kind: 'label' } }).status,
    ).toBe(409);
    const cancelled = ok<ContentRelease>(
      call(server, 'POST', `/releases/${created.releaseId}/cancel`),
    );
    expect(cancelled.status).toBe('failed');
    expect(
      call(server, 'POST', `/releases/${created.releaseId}/activate`).status,
    ).toBe(409);
  });

  it('will not activate before every part is built', () => {
    const server = makeServer();
    const created = ok<{ releaseId: string; parts: number[] }>(
      call(server, 'POST', '/releases', { body: { kind: 'song' } }),
    );
    ok(call(server, 'POST', `/releases/${created.releaseId}/parts/0`));
    expect(
      call(server, 'POST', `/releases/${created.releaseId}/activate`).body,
    ).toMatchObject({ code: 'PARTS_MISSING' });
  });

  it('blocks publishing a dangling reference to an authoritative kind', () => {
    const server = makeServer();
    put(server, {
      kind: 'artist',
      slug: 'toto',
      body: { slug: 'toto', name: 'Toto', basedInPlaceId: 'atlantis' },
    });
    const validated = ok<{ ok: boolean; problems: ValidationProblem[] }>(
      call(server, 'GET', '/validate/artist'),
    );
    expect(validated.ok).toBe(false);
    expect(validated.problems).toEqual([
      expect.objectContaining({ code: 'DANGLING_REFERENCE', slug: 'toto' }),
    ]);
    const blocked = call(server, 'POST', '/releases', {
      body: { kind: 'artist' },
    });
    expect(blocked.status).toBe(422);
    expect(blocked.body).toMatchObject({ code: 'VALIDATION_FAILED' });

    // Publishing the place first, in the contract's order, unblocks it.
    ok(
      put(server, {
        kind: 'globe_city',
        slug: 'atlantis',
        body: {
          id: 'atlantis',
          name: 'Atlantis',
          country: 'Nowhere',
          subdivision: '',
          region: 'west-europe',
          coordinates: [0, 0],
          genres: [],
          description: '',
          activeDecades: [],
          pin: false,
        },
        status: 'published',
      }),
    );
    publish(server, 'globe_city');
    expect(publish(server, 'artist').status).toBe('live');
  });

  it('blocks a publish on everything /validate calls an error, today’s codes too', () => {
    const server = makeServer();
    // The repo has no song event without its song any more, so the test
    // makes one: a published event for a chart that does not exist.
    const slug = 'song-no_such_song';
    ok(
      put(server, {
        kind: 'globe_event',
        slug,
        body: {
          ...detailOf(server, 'globe_event', 'song-africa').body,
          id: slug,
        },
        status: 'published',
      }),
    );
    const validated = ok<{ ok: boolean; problems: ValidationProblem[] }>(
      call(server, 'GET', '/validate/globe_event'),
    );
    expect(validated.ok).toBe(false);

    const blocked = call(server, 'POST', '/releases', {
      body: { kind: 'globe_event' },
    });
    expect(blocked.status).toBe(422);
    const body = blocked.body as {
      code: string;
      error: string;
      problems: ValidationProblem[];
    };
    expect(body.code).toBe('VALIDATION_FAILED');
    expect(body.error).toBe(
      '1 problem blocks this globe event publish — song-no_such_song: Derived from the song "no_such_song", which does not exist.',
    );
    expect(body.problems).toEqual(
      validated.problems.filter((problem) => problem.severity !== 'warning'),
    );

    // Resolving it is what unblocks the publish.
    ok(
      call(server, 'DELETE', `/items/${lookupId(server, 'globe_event', slug)}`),
    );
    expect(publish(server, 'globe_event').status).toBe('live');
  });

  it('publishes the repo’s globe events as they are', () => {
    // The BBC live Valerie once blocked every one of these: its song id was
    // its own, and no chart had it. It names the song valerie now
    // (songEventAliases.ts), so nothing needs resolving first.
    const server = makeServer();
    expect(publish(server, 'globe_event').status).toBe('live');
    expect(
      fromCdn(
        server,
        'globe-events',
        (b) => b.id === 'song-valerie_bbc_live_version',
      ),
    ).toMatchObject({ videoId: '6pAz9UpnRKw' });
  });

  it('keeps publishing to admins', () => {
    const server = makeServer();
    for (const [method, path] of [
      ['POST', '/releases'],
      ['GET', '/pending'],
      ['POST', '/rollback'],
    ])
      expect(
        call(server, method, path, { body: { kind: 'song' }, viewer: EDITOR })
          .status,
      ).toBe(403);
  });
});

describe('GET /template/:kind', () => {
  it('starts each kind from its contract template', () => {
    const server = makeServer();
    const nextId = Math.max(...PROGRESSIONS.map((entry) => entry.id)) + 1;
    expect(
      ok(call(server, 'GET', '/template/artist', { query: { slug: 'x' } })),
    ).toMatchObject({
      kind: 'artist',
      slug: 'x',
      body: { slug: 'x', name: '' },
    });
    expect(
      ok<{ body: { id: number }; slug: string }>(
        call(server, 'GET', '/template/chord_progression'),
      ),
    ).toMatchObject({ slug: String(nextId), body: { id: nextId } });
  });
});

describe('song → globe event derivation', () => {
  const event = (server: ContentMockServer, songSlug: string) =>
    detailOf(server, 'globe_event', `song-${songSlug}`);
  const genreNames = (tags: unknown) =>
    (tags as string[]).map(
      (tag) => GENRES.find((genre) => genre.id === tag)?.name,
    );

  it('carries an admin’s song edit onto song-<id>, fields and all', () => {
    const server = makeServer();
    const before = event(server, 'africa');
    expect(before.derivedFromSlug).toBe('africa');
    ok(
      put(server, {
        kind: 'song',
        slug: 'africa',
        body: {
          ...africa(),
          title: 'Africa RENAMED',
          historicalDescription: 'NEW DESC',
        },
      }),
    );
    const after = event(server, 'africa');
    const song = africa();
    const session = song.session as Record<string, unknown>;
    // Only a live basedInPlaceId moves the pin, and Toto has had one, Van
    // Nuys, since the bulk import of 30 September 2026: the derived event
    // goes there (it stayed at its Los Angeles pin before). The students'
    // globe reads the song events in code, which the import left alone.
    expect(detailOf(server, 'artist', 'toto').body.basedInPlaceId).toBe(
      'van-nuys',
    );
    expect(before.body.location).toMatchObject({ city: 'Los Angeles' });
    expect(after.body).toMatchObject({
      id: 'song-africa',
      title: 'Africa RENAMED — Toto',
      description: 'NEW DESC',
      year: song.year,
      genre: genreNames(song.genreTags),
      location: {
        city: 'Van Nuys',
        country: 'US',
        lat: 34.1833,
        lng: -118.4333,
      },
      videoId: before.body.videoId,
      label: session.label,
      studio: session.studio,
      credits: song.credits,
    });
    // Its credits name no artistGlobeId, so there are no artist ids: a derived
    // field with no value is left out, never [].
    expect(after.body).not.toHaveProperty('artistIds');
    expect(after.Revisions[0].note).toBe('Derived from the song "africa"');
    expect(overviewRow(server, 'globe_event').changedSincePublish).toBe(1);
  });

  it('carries the song v2 ids: records, studio, label and place', () => {
    const server = makeServer();
    const song = africa();
    const session = song.session as Record<string, unknown>;
    const saved = ok<{
      item: ContentItemDetail;
      warnings: ValidationProblem[];
    }>(
      put(server, {
        kind: 'song',
        slug: 'africa',
        body: {
          ...song,
          // A record the seed lacks (Toto IV has been one since the bulk
          // import of 30 September 2026).
          releases: [{ releaseId: 'toto-the-seventh-one', track: 10 }],
          subgenreIds: ['soft-rock'],
          session: {
            ...session,
            studioId: 'sunset-sound',
            labelId: 'columbia',
            placeId: 'los-angeles',
            source: 'liner notes',
          },
        },
      }),
    );
    // Song v2 is what the mock validates now; the record does not exist
    // yet, which is a warning, never a refusal.
    expect(saved.warnings).toEqual([
      expect.objectContaining({
        code: 'UNPUBLISHED_REFERENCE',
        path: 'releases[0].releaseId',
        target: 'release:toto-the-seventh-one',
      }),
    ]);
    const after = event(server, 'africa').body;
    expect(after).toMatchObject({
      releaseIds: ['toto-the-seventh-one'],
      studioIds: ['sunset-sound'],
      placeId: 'los-angeles',
      // The pin stays where placement put it (at Toto's City, Van Nuys,
      // since the bulk import of 30 September 2026 gave Toto one: see the
      // test above); placeId is where it was cut.
      location: { city: 'Van Nuys', country: 'US' },
      label: session.label,
    });
    // On a record, the song's label is the record's, so the event names none.
    expect(after).not.toHaveProperty('labelIds');

    // Without records, the session's label id is the event's; cleared, every
    // v2 field is left out again, never []. (Africa's own record, Toto IV
    // since the bulk import of 30 September 2026, is left out for this.)
    const withoutRecords = { ...song };
    delete withoutRecords.releases;
    ok(
      put(server, {
        kind: 'song',
        slug: 'africa',
        body: {
          ...withoutRecords,
          session: { ...session, labelId: 'columbia' },
        },
      }),
    );
    const labelled = event(server, 'africa').body;
    expect(labelled.labelIds).toEqual(['columbia']);
    for (const key of ['releaseIds', 'studioIds', 'placeId'])
      expect(labelled).not.toHaveProperty(key);
    ok(put(server, { kind: 'song', slug: 'africa', body: song }));
    expect(event(server, 'africa').body).not.toHaveProperty('labelIds');

    // The derived event passes its own v2 body schema.
    const events = ok<{ ok: boolean; problems: ValidationProblem[] }>(
      call(server, 'GET', '/validate/globe_event'),
    );
    expect(
      events.problems.filter((problem) => problem.slug === 'song-africa'),
    ).toEqual([]);
  });

  it('carries the lead act’s id from origin.artistGlobeId', () => {
    const server = makeServer();
    const song = JSON.parse(
      JSON.stringify(BUNDLED_SONGS.dont_stop_believin),
    ) as Record<string, unknown>;
    ok(put(server, { kind: 'song', slug: 'dont_stop_believin', body: song }));
    expect(event(server, 'dont_stop_believin').body.artistIds).toEqual([
      'journey',
    ]);
  });

  it('creates the event for a new song, and waits for approval on a proposal', () => {
    const server = makeServer();
    ok(
      put(server, {
        kind: 'song',
        slug: 'africa_copy',
        body: { ...africa(), id: 'africa_copy' },
        create: true,
      }),
    );
    const created = event(server, 'africa_copy');
    expect(created).toMatchObject({
      status: 'draft',
      derivedFromSlug: 'africa_copy',
      body: { id: 'song-africa_copy', title: 'Africa — Toto' },
    });

    put(
      server,
      {
        kind: 'song',
        slug: 'africa',
        body: { ...africa(), title: 'Proposed' },
      },
      EDITOR,
    );
    expect(event(server, 'africa').body.title).toBe('Africa — Toto');
    ok(
      call(
        server,
        'POST',
        `/items/${lookupId(server, 'song', 'africa')}/approve`,
      ),
    );
    expect(event(server, 'africa').body.title).toBe('Proposed — Toto');
  });

  it('pins at the lead act’s basedInPlaceId once both are live', () => {
    const server = makeServer();
    const toto = detailOf(server, 'artist', 'toto');
    put(server, {
      kind: 'artist',
      slug: 'toto',
      body: { ...toto.body, basedInPlaceId: 'london' },
    });
    publish(server, 'artist');
    ok(put(server, { kind: 'song', slug: 'africa', body: africa() }));
    expect(event(server, 'africa').body.location).toMatchObject({
      city: 'London',
    });

    // And the Globe gets it on the next globe_event publish.
    publish(server, 'globe_event');
    expect(
      fromCdn(server, 'globe-events', (b) => b.id === 'song-africa')?.location,
    ).toMatchObject({ city: 'London' });
  });
});

describe('GET /derivation-health', () => {
  it('places songs by the lead act’s basedInPlaceId once it is live', () => {
    const server = makeServer();
    type Health = {
      totalSongs: number;
      matched: number;
      defaultedToNewYork: number;
      placedBy: Record<string, number>;
      unmatchedArtists: { slug: string; songCount: number }[];
    };
    const before = ok<Health>(call(server, 'GET', '/derivation-health'));
    expect(before.totalSongs).toBe(640);
    expect(before.matched + before.defaultedToNewYork).toBe(640);
    // None until the bulk import of 30 September 2026 gave 332 acts a City:
    // 457 songs were placed by their lead act's then, and 467 since its
    // review billed each song's own act before its guests (Crazy in Love:
    // Beyoncé, then Jay-Z). (The students' globe keeps its song pins; this
    // is how the contract's derivation would place them.)
    expect(before.placedBy.basedInPlace).toBe(467);

    const target = before.unmatchedArtists.find((row) =>
      lookupIdSafe(server, 'artist', row.slug),
    );
    expect(target).toBeDefined();
    const artist = detailOf(server, 'artist', target!.slug);
    put(server, {
      kind: 'artist',
      slug: target!.slug,
      body: { ...artist.body, basedInPlaceId: 'london' },
    });
    publish(server, 'artist');

    const after = ok<Health>(call(server, 'GET', '/derivation-health'));
    expect(after.placedBy.basedInPlace).toBe(
      before.placedBy.basedInPlace + target!.songCount,
    );
    expect(after.defaultedToNewYork).toBe(
      before.defaultedToNewYork - target!.songCount,
    );
  });
});

const detailOfLegacy = (server: ContentMockServer, slug: string) => {
  // Today's API has no lookup; find the id the way the console does.
  const found = ok<{ items: ContentListItem[] }>(
    call(server, 'GET', '/items', { query: { kind: 'song', search: slug } }),
  ).items.find((item) => item.slug === slug)!;
  return ok<ContentItemDetail>(call(server, 'GET', `/items/${found.id}`));
};

const lookupIdSafe = (server: ContentMockServer, kind: string, slug: string) =>
  call(server, 'GET', '/items/lookup', { query: { kind, slug } }).status ===
  200;

describe('legacy mode (today’s API)', () => {
  it('has no capabilities, lookup or export, and serves the six kinds', () => {
    const server = makeServer('legacy');
    expect(call(server, 'GET', '/capabilities').status).toBe(404);
    expect(
      call(server, 'GET', '/items/lookup', {
        query: { kind: 'song', slug: 'africa' },
      }).status,
    ).toBe(404);
    expect(
      call(server, 'GET', '/export', { query: { kind: 'song' } }).status,
    ).toBe(404);
    const rows = ok<ContentOverviewRow[]>(call(server, 'GET', '/overview'));
    expect(rows.map((row) => row.kind).sort()).toEqual(
      [
        'activity_flow',
        'artist_location',
        'fundamentals_flow',
        'globe_city',
        'globe_event',
        'song',
      ].sort(),
    );
    // Served, but empty, as today.
    expect(rows.find((row) => row.kind === 'globe_city')?.total).toBe(0);
    expect(
      put(server, {
        kind: 'artist',
        slug: 'toto',
        body: { slug: 'toto', name: 'Toto' },
      }).status,
    ).toBe(400);
  });

  it('answers PUT with the bare item and ignores create', () => {
    const server = makeServer('legacy');
    // The seed holds the level-0 copy, which today's schema accepts.
    const stored = detailOfLegacy(server, 'africa');
    const saved = ok<ContentItemDetail>(
      put(server, {
        kind: 'song',
        slug: 'africa',
        body: { ...stored.body, title: 'Upserted' },
        create: true,
      }),
    );
    expect(saved).not.toHaveProperty('item');
    expect(saved.body.title).toBe('Upserted');
  });

  it('refuses what song schema level 0 refuses, in today’s words', () => {
    const server = makeServer('legacy');
    // Since the bulk import of 30 September 2026 the repo's Africa names its
    // record (`releases`, song v2), which the v1 schema refuses before level
    // 0 is asked.
    const full = put(server, { kind: 'song', slug: 'africa', body: africa() });
    expect((full.body as { error: string }).error).toBe(
      "Invalid song body — Unrecognized key(s) in object: 'releases'",
    );
    // Without it, Africa carries the v1 root keys and instrumental sections.
    const v1Africa = africa();
    delete v1Africa.releases;
    const response = put(server, {
      kind: 'song',
      slug: 'africa',
      body: v1Africa,
    });
    expect(response.status).toBe(422);
    const { error, problems } = response.body as {
      error: string;
      problems: ValidationProblem[];
    };
    expect(error).toMatch(
      /^Invalid song body — Unrecognized key\(s\) in object: 'credits'.*; sections\.0: Unrecognized key\(s\) in object: 'instrumental'/,
    );
    expect(problems).toEqual([
      expect.objectContaining({ code: 'INVALID_BODY', path: 'credits' }),
    ]);

    // A bar key alone is refused too.
    const stored = detailOfLegacy(server, 'africa');
    const sections = stored.body.sections as {
      bars: Record<string, unknown>[];
    }[];
    const withRepeat = sections.map((section, index) =>
      index === 0
        ? {
            ...section,
            bars: section.bars.map((bar, b) =>
              b === 0 ? { ...bar, repeatStart: true } : bar,
            ),
          }
        : section,
    );
    const bar = put(server, {
      kind: 'song',
      slug: 'africa',
      body: { ...stored.body, sections: withRepeat },
    });
    expect((bar.body as { error: string }).error).toBe(
      "Invalid song body — sections.0.bars.0: Unrecognized key(s) in object: 'repeatStart'",
    );

    // Every repo chart through today's check: production's import run was
    // refused on 341 (docs/song-body-schema-gap.md), and so was the mock.
    // 602 since the bulk import of 30 September 2026 gave 261 more charts
    // credits, a session or a record, keys today's schema refuses: the
    // repo's charts need song v2 on the server before they import whole.
    const refused = seeds.all.items
      .filter((item) => item.kind === 'song')
      .filter(
        (item) =>
          put(server, { kind: 'song', slug: item.slug, body: item.body })
            .status === 422,
      );
    expect(refused).toHaveLength(602);

    // What the seed holds is what production holds: level-0 copies, all valid.
    const validated = ok<{ ok: boolean; problems: ValidationProblem[] }>(
      call(server, 'GET', '/validate/song'),
    );
    expect(validated).toEqual({ ok: true, problems: [] });
  });
});

describe('the item revision (contract 5b)', () => {
  const sunset = {
    slug: 'sunset-sound',
    name: 'Sunset Sound',
    placeId: 'los-angeles',
  };
  const revisionOf = (server: ContentMockServer) =>
    detailOf(server, 'studio', 'sunset-sound').revision;

  it('is on every row and detail, and moves on every stored change, a review’s too', () => {
    const server = makeServer();
    const start = detailOf(server, 'studio', 'sunset-sound');
    expect(start.revision).toBe(1);
    const exported = ok<{ items: { slug: string; revision?: number }[] }>(
      call(server, 'GET', '/export', { query: { kind: 'studio' } }),
    );
    expect(
      exported.items.find((row) => row.slug === 'sunset-sound')?.revision,
    ).toBe(1);
    const listed = ok<{ items: ContentListItem[] }>(
      call(server, 'GET', '/items', { query: { kind: 'studio' } }),
    );
    expect(
      listed.items.find((row) => row.slug === 'sunset-sound')?.revision,
    ).toBe(1);

    ok(
      put(
        server,
        {
          kind: 'studio',
          slug: 'sunset-sound',
          body: { ...sunset, name: 'Sunset' },
        },
        EDITOR,
      ),
    );
    expect(revisionOf(server)).toBe(2);
    ok(
      call(server, 'POST', `/items/${start.id}/reject`, {
        body: { note: 'Not yet' },
      }),
    );
    expect(revisionOf(server)).toBe(3);
    ok(
      call(server, 'POST', `/items/${start.id}/discard-edit`, {
        viewer: EDITOR,
      }),
    );
    expect(revisionOf(server)).toBe(4);
    // Reading changes nothing.
    detailOf(server, 'studio', 'sunset-sound');
    expect(revisionOf(server)).toBe(4);
  });

  it('writes nothing when the item moved since the edit started from it', () => {
    const server = makeServer();
    const saved = ok<{ item: ContentItemDetail }>(
      put(server, {
        kind: 'studio',
        slug: 'sunset-sound',
        body: { ...sunset, name: 'Sunset Sound Recorders' },
        expectedRevision: 1,
      }),
    );
    expect(saved.item.revision).toBe(2);

    const stale = put(server, {
      kind: 'studio',
      slug: 'sunset-sound',
      body: { ...sunset, name: 'Stale' },
      expectedRevision: 1,
    });
    expect(stale.status).toBe(409);
    expect(stale.body).toMatchObject({
      code: 'REVISION_CONFLICT',
      revision: 2,
    });
    expect(detailOf(server, 'studio', 'sunset-sound').body.name).toBe(
      'Sunset Sound Recorders',
    );
    // An editor's proposal is checked the same way.
    expect(
      put(
        server,
        {
          kind: 'studio',
          slug: 'sunset-sound',
          body: sunset,
          expectedRevision: 1,
        },
        EDITOR,
      ).status,
    ).toBe(409);
    // An item gone since has no revision to be at.
    const gone = put(server, {
      kind: 'studio',
      slug: 'no-such-studio',
      body: { slug: 'no-such-studio', name: 'Nowhere' },
      expectedRevision: 3,
    });
    expect(gone.body).toMatchObject({
      code: 'REVISION_CONFLICT',
      revision: null,
    });
    expect(
      call(server, 'GET', '/items/lookup', {
        query: { kind: 'studio', slug: 'no-such-studio' },
      }).status,
    ).toBe(404);
    // Anything but a whole number is a bad request.
    expect(
      put(server, {
        kind: 'studio',
        slug: 'sunset-sound',
        body: sunset,
        expectedRevision: '2',
      }).status,
    ).toBe(400);
  });

  it('survives a reload of the saved mock', () => {
    const before = makeServer();
    ok(
      put(before, {
        kind: 'studio',
        slug: 'sunset-sound',
        body: { ...sunset, name: 'A' },
      }),
    );
    ok(
      put(before, {
        kind: 'studio',
        slug: 'sunset-sound',
        body: { ...sunset, name: 'B' },
      }),
    );
    expect(revisionOf(before)).toBe(3);
    const text = JSON.stringify(
      createMockStateCodec(before).encode(before.snapshot()),
    );
    const after = makeServer();
    after.restore(createMockStateCodec(after).decode(JSON.parse(text)));
    expect(revisionOf(after)).toBe(3);
  });

  it('is not today’s API: legacy mode sends none, and ignores the check', () => {
    const server = makeServer('legacy');
    const stored = detailOfLegacy(server, 'africa');
    expect(stored).not.toHaveProperty('revision');
    const saved = put(server, {
      kind: 'song',
      slug: 'africa',
      body: stored.body,
      expectedRevision: 99,
    });
    expect(saved.status).toBe(200);
    expect(saved.body).not.toHaveProperty('revision');
  });
});

describe('DELETE of an item others name (contract priority 7)', () => {
  it('answers 409 REFERENCED with every field that names it, and deletes with force', () => {
    const server = makeServer();
    const detroit = lookupId(server, 'globe_city', 'detroit');
    const refused = call(server, 'DELETE', `/items/${detroit}`);
    expect(refused.status).toBe(409);
    const { code, referrers } = refused.body as {
      code: string;
      referrers: {
        kind: string;
        slug: string;
        path: string;
        id: string;
        title: string;
      }[];
    };
    expect(code).toBe('REFERENCED');
    // The pilot studio and label in Detroit, by their placeId.
    expect(referrers).toEqual(
      expect.arrayContaining([
        {
          kind: 'studio',
          id: lookupId(server, 'studio', 'hitsville-u-s-a'),
          slug: 'hitsville-u-s-a',
          title: 'Hitsville U.S.A.',
          path: 'placeId',
        },
        expect.objectContaining({
          kind: 'label',
          slug: 'tamla',
          path: 'placeId',
        }),
      ]),
    );
    expect(call(server, 'GET', `/items/${detroit}`).status).toBe(200);
    ok(
      call(server, 'DELETE', `/items/${detroit}`, { query: { force: 'true' } }),
    );
    expect(call(server, 'GET', `/items/${detroit}`).status).toBe(404);
  });

  it('counts a waiting proposal that names it', () => {
    const server = makeServer();
    const body = ok<ContentItemDetail>(
      call(server, 'GET', `/items/${lookupId(server, 'label', 'columbia')}`),
    ).body;
    ok(
      put(
        server,
        {
          kind: 'label',
          slug: 'columbia',
          body: { ...body, parentLabelId: 'chrysalis' },
        },
        EDITOR,
      ),
    );
    const refused = call(
      server,
      'DELETE',
      `/items/${lookupId(server, 'label', 'chrysalis')}`,
    );
    expect(refused.status).toBe(409);
    // The proposal is counted beside the stored names: since the bulk import
    // of 30 September 2026 two records were released on Chrysalis.
    expect((refused.body as { referrers: unknown[] }).referrers).toEqual([
      expect.objectContaining({
        kind: 'release',
        slug: 'pat-benatar-crimes-of-passion',
        path: 'labelId',
      }),
      expect.objectContaining({
        kind: 'release',
        slug: 'the-proclaimers-sunshine-on-leith',
        path: 'labelId',
      }),
      expect.objectContaining({ slug: 'columbia', path: 'parentLabelId' }),
    ]);
  });
});
