import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  MockResponse,
  MockViewer,
} from '@/features/admin/content/mock/contentMockServer';
import type { MockKind } from '@/features/admin/content/mock/mockKinds';
import { sha256 } from '@/scripts/apiContract/writeVocabulary';
import { LiveRepoStore } from '../repoStore';
import {
  VOCABULARY_CONTRACT_FILES,
  VOCABULARY_DATA_FILES,
} from '../sources/vocabulary';
import { scratchCopy } from './scratchCopy';

/**
 * The vocabulary kinds end to end: a request to the content server in repo
 * mode, through the live store's flush (plan, read back, `checkBases`, write),
 * onto the vocabulary files of a scratch copy of the repo's data.
 *
 * The adapter's own tests (vocabularySource.test.ts) plan over the repo's
 * files, and the rules' (vocabularyKinds.test.ts) run on the server alone;
 * this is where the two meet: what the rules accept lands in its one line,
 * with the API's copy of the vocabulary and its hash beside it, and what
 * they refuse leaves every file as it was. The repo's own files are only
 * ever read, to make the copy.
 */

const ADMIN: MockViewer = { role: 'admin', userId: 'admin-1', name: 'Ada' };

const GENRES = VOCABULARY_DATA_FILES.genre;
const SUBGENRES = VOCABULARY_DATA_FILES.subgenre;
const INSTRUMENTS = VOCABULARY_DATA_FILES.instrument;
const CONTRACT = VOCABULARY_CONTRACT_FILES.vocabulary;
const MANIFEST = VOCABULARY_CONTRACT_FILES.manifest;
const FILES = [GENRES, SUBGENRES, INSTRUMENTS, CONTRACT, MANIFEST];

let root: string;
let live: LiveRepoStore;

beforeAll(async () => {
  root = await scratchCopy('repo-vocabulary-live-');
  live = await LiveRepoStore.open({ root, planners: false, git: false });
}, 120_000);

afterAll(() => {
  if (root) rmSync(root, { recursive: true, force: true });
});

const read = (path: string) => readFileSync(join(root, path), 'utf8');

/** Every vocabulary and contract file's text, by path. */
const texts = () =>
  Object.fromEntries(FILES.map((path) => [path, read(path)])) as Record<
    string,
    string
  >;

const ask = (
  method: string,
  path: string,
  extra: { query?: Record<string, string>; body?: unknown } = {},
): Promise<MockResponse> =>
  live.handle({ method, path, viewer: ADMIN, ...extra });

const idOf = (kind: MockKind, slug: string) => {
  const item = live.server.storedItem(kind, slug);
  if (!item) throw new Error(`no ${kind} ${slug}`);
  return item.id;
};

const detail = async (kind: MockKind, slug: string) => {
  const response = await ask('GET', `/items/${idOf(kind, slug)}`);
  expect(response.status).toBe(200);
  return response.body as { body: Record<string, unknown>; revision: number };
};

/** The lines of two texts of the same length that differ, as they are after. */
const changedLines = (before: string, after: string) => {
  const a = before.split('\n');
  const b = after.split('\n');
  expect(b.length).toBe(a.length);
  return b.filter((line, index) => line !== a[index]);
};

/** The hash the manifest records for the API's copy of the vocabulary. */
const recordedHash = () =>
  (
    JSON.parse(read(MANIFEST)) as { files: { file: string; sha256: string }[] }
  ).files.find((entry) => entry.file === 'vocabulary.generated.json')?.sha256;

interface Refusal {
  code: string;
  error: string;
  problems?: { code: string; path?: string; severity?: string }[];
  referrers?: { kind: string | null; slug: string; path: string }[];
}

/** A surf-rock subgenre's files as they were before it was made. */
let beforeSurfRock: Record<string, string>;

describe('the vocabulary through the live repo store', () => {
  it('writes a genre’s rename into its one line before it answers, with the API’s copy and its hash', async () => {
    const before = texts();
    const { body, revision } = await detail('genre', 'jam-band');

    const saved = await ask('PUT', '/items', {
      body: {
        kind: 'genre',
        slug: 'jam-band',
        body: { ...body, name: 'Jam Bands' },
        expectedRevision: revision,
      },
    });

    expect(saved.status).toBe(200);
    expect((saved.body as { warnings: unknown[] }).warnings).toEqual([]);
    expect(changedLines(before[GENRES], read(GENRES))).toEqual([
      '    {"id":"jam-band","name":"Jam Bands","taught":true,"tags":["Jam Band"]},',
    ]);
    expect(read(SUBGENRES)).toBe(before[SUBGENRES]);
    expect(read(INSTRUMENTS)).toBe(before[INSTRUMENTS]);
    // The API's copy names the genre as it is now, and the manifest's one
    // changed line is that copy's hash.
    expect(read(CONTRACT)).not.toBe(before[CONTRACT]);
    expect(read(CONTRACT)).toContain('"name": "Jam Bands"');
    expect(recordedHash()).toBe(sha256(read(CONTRACT)));
    // Its one changed line is that copy's hash, and, when every file was as
    // last handed over, the draft that hash opens.
    const manifestBefore = JSON.parse(before[MANIFEST]) as {
      artifactsVersion: number;
      draftVersion?: number;
    };
    const opensDraft = manifestBefore.draftVersion === undefined;
    const manifestAfter = read(MANIFEST);
    expect(
      changedLines(
        before[MANIFEST],
        opensDraft
          ? manifestAfter.replace(/\n {2}"draftVersion": \d+,/, '')
          : manifestAfter,
      ),
    ).toEqual([`      "sha256": "${sha256(read(CONTRACT))}",`]);
    if (opensDraft)
      expect(
        (JSON.parse(manifestAfter) as { draftVersion?: number }).draftVersion,
      ).toBe(manifestBefore.artifactsVersion + 1);
    // What the store holds is what the disk holds.
    expect(live.store.item('genre', 'jam-band')?.body.name).toBe('Jam Bands');
    expect((await detail('genre', 'jam-band')).revision).toBe(revision + 1);
  }, 60_000);

  it('writes an instrument’s typical styles into its line, leaving the API’s copy alone', async () => {
    const before = texts();
    const { body, revision } = await detail('instrument', 'theremin');

    const saved = await ask('PUT', '/items', {
      body: {
        kind: 'instrument',
        slug: 'theremin',
        body: { ...body, typicalIn: ['film-scoring', 'electronic'] },
        expectedRevision: revision,
      },
    });

    expect(saved.status).toBe(200);
    expect(changedLines(before[INSTRUMENTS], read(INSTRUMENTS))).toEqual([
      '    {"id":"theremin","name":"Theremin","section":"electronic","worldInstrumentId":"theremin","typicalIn":["film-scoring","electronic"]},',
    ]);
    // `typicalIn` is not in the API's copy, so neither contract file moves.
    for (const path of [GENRES, SUBGENRES, CONTRACT, MANIFEST]) {
      expect(read(path), path).toBe(before[path]);
    }
  }, 60_000);

  it('appends a new subgenre as the last line, the one before it gaining its comma', async () => {
    beforeSurfRock = texts();
    const created = {
      id: 'surf-rock',
      name: 'Surf Rock',
      parent: 'rock',
      tags: ['Surf Rock'],
    };

    const saved = await ask('PUT', '/items', {
      body: {
        kind: 'subgenre',
        slug: 'surf-rock',
        body: created,
        create: true,
      },
    });

    expect(saved.status).toBe(200);
    expect((saved.body as { item: { status: string } }).item.status).toBe(
      'published',
    );
    const before = beforeSurfRock[SUBGENRES].split('\n');
    const after = read(SUBGENRES).split('\n');
    expect(after.length).toBe(before.length + 1);
    // `  ]`, `}` and the final newline close the file.
    const last = before.length - 4;
    expect(after.slice(0, last)).toEqual(before.slice(0, last));
    expect(after[last]).toBe(`${before[last]},`);
    expect(after[last + 1]).toBe(`    ${JSON.stringify(created)}`);
    expect(after.slice(last + 2)).toEqual(before.slice(last + 1));
    expect(read(CONTRACT)).toContain('"id": "surf-rock"');
    expect(recordedHash()).toBe(sha256(read(CONTRACT)));
    expect(read(GENRES)).toBe(beforeSurfRock[GENRES]);
  }, 60_000);

  it('writes nothing when the rules refuse a save', async () => {
    const before = texts();

    const refused = await ask('PUT', '/items', {
      body: {
        kind: 'subgenre',
        slug: 'doo-wop-revival',
        body: {
          id: 'doo-wop-revival',
          name: 'Doo-Wop Revival',
          parent: 'no-such-genre',
          tags: [],
        },
        create: true,
      },
    });

    expect(refused.status).toBe(422);
    const body = refused.body as Refusal;
    expect(body.code).toBe('VALIDATION_FAILED');
    expect(body.problems).toContainEqual(
      expect.objectContaining({ code: 'INVALID_REFERENCE', path: 'parent' }),
    );
    expect(texts()).toEqual(before);
    expect(live.server.storedItem('subgenre', 'doo-wop-revival')).toBeFalsy();
  }, 60_000);

  it('refuses to delete a record something names (409 REFERENCED), force or not, and writes nothing', async () => {
    const before = texts();

    for (const force of [false, true]) {
      const refused = await ask('DELETE', `/items/${idOf('genre', 'rock')}`, {
        query: force ? { force: 'true' } : {},
      });
      expect(refused.status).toBe(409);
      const body = refused.body as Refusal;
      expect(body.code).toBe('REFERENCED');
      const rows = (body.referrers ?? []).map(
        (row) => `${String(row.kind)} ${row.slug} ${row.path}`,
      );
      // Its subgenres, the one just made among them, its own tag, and the
      // code table that maps the song tag onto it.
      expect(rows).toEqual(
        expect.arrayContaining([
          'genre rock tags[0]',
          'subgenre aboriginal-rock parent',
          'subgenre surf-rock parent',
          'null SONG_TAG_TO_GENRE rock',
        ]),
      );
    }
    // A record's own tag names it too: a tag is the globe's way to it.
    const tagged = await ask(
      'DELETE',
      `/items/${idOf('subgenre', 'surf-rock')}`,
    );
    expect(tagged.status).toBe(409);
    expect((tagged.body as Refusal).referrers).toEqual([
      expect.objectContaining({
        kind: 'subgenre',
        slug: 'surf-rock',
        path: 'tags[0]',
      }),
    ]);

    expect(texts()).toEqual(before);
    expect(live.store.item('genre', 'rock')).toBeTruthy();
  }, 60_000);

  it('takes out a record nothing names, leaving the files as they were before it', async () => {
    const { body, revision } = await detail('subgenre', 'surf-rock');
    const untagged = await ask('PUT', '/items', {
      body: {
        kind: 'subgenre',
        slug: 'surf-rock',
        body: { ...body, tags: [] },
        expectedRevision: revision,
      },
    });
    expect(untagged.status).toBe(200);

    const removed = await ask(
      'DELETE',
      `/items/${idOf('subgenre', 'surf-rock')}`,
    );

    expect(removed.status).toBe(200);
    // The subgenre came and went: its file, the API's copy and the manifest
    // read as they did before it was made, byte for byte.
    expect(texts()).toEqual(beforeSurfRock);
    expect(live.store.item('subgenre', 'surf-rock')).toBeUndefined();
  }, 60_000);
});

describe('the importer’s alias tables', () => {
  it('keep an instrument only an alias leads to from being deleted', async () => {
    const before = texts();
    const refused = await ask(
      'DELETE',
      `/items/${idOf('instrument', 'lead-vocals')}`,
      { query: { force: 'true' } },
    );
    expect(refused.status).toBe(409);
    const body = refused.body as Refusal;
    expect(body.code).toBe('REFERENCED');
    expect(JSON.stringify(body.referrers)).toContain(
      'instrumentMap.ts ALIASES',
    );
    expect(texts()).toEqual(before);
  }, 60_000);

  it('warn when a tag a genre alias leads to is taken off', async () => {
    const pop = live.store
      .items('genre')
      .find((item) => (item.body.tags as string[]).includes('Pop'))!;
    const { body, revision } = await detail('genre', pop.slug);
    const saved = await ask('PUT', '/items', {
      body: {
        kind: 'genre',
        slug: pop.slug,
        body: {
          ...body,
          tags: (body.tags as string[]).filter((tag) => tag !== 'Pop'),
        },
        expectedRevision: revision,
      },
    });
    expect(saved.status).toBe(200);
    expect(
      (saved.body as { warnings?: { code: string }[] }).warnings?.map(
        (warning) => warning.code,
      ),
    ).toContain('ALIAS_TAG_REMOVED');
  }, 60_000);
});
