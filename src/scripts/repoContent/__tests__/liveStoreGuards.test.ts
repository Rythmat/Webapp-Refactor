import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  MockResponse,
  MockViewer,
} from '@/features/admin/content/mock/contentMockServer';
import type { MockKind } from '@/features/admin/content/mock/mockKinds';
import type { GitRunner } from '../gitStatus';
import {
  CITY_CODE_FILES,
  DECISIONS_PATH,
  IMPORT_LOCK_FILE,
  LiveRepoStore,
  REPO_ROOT,
} from '../repoStore';
import { sha256 } from '../sources/common';
import { CITIES_FILE, PLACES_FILE } from '../sources/places';
import { LIBRARY_FILE } from '../sources/progressions';
import { RECORD_FILES } from '../sources/records';
import {
  VOCABULARY_CONTRACT_FILES,
  VOCABULARY_DATA_FILES,
} from '../sources/vocabulary';
import { scratchCopy } from './scratchCopy';

/**
 * What the live repo store refuses, over a copy of the repo's data files in
 * a temp directory, so that a save never lands where it would do harm
 * unseen:
 *
 *  - an outside edit to a file the save leaves alone is 409 (reload and try
 *    again), not 422;
 *  - a `decisions.json` with rows that do not read is never written over;
 *  - nothing is written while a bulk import holds its run lock;
 *  - a globe city that code names stays on the globe;
 *  - a chord progression is held to the library's own type;
 *  - `/overview` counts a save made just before it.
 *
 * The repo's own files are only ever read, to make the copy.
 */

const ADMIN: MockViewer = { role: 'admin', userId: 'admin-1', name: 'Ada' };

/** The files git is told about, as they were copied: changed when they differ. */
const tracked = new Map<string, string>();

/**
 * A git that takes its time, as a real one over hundreds of files does, and
 * reports a tracked file as changed once its text differs from the copy's.
 */
const slowGit: GitRunner = async (args, cwd) => {
  if (args[0] !== 'status') return 'main\n';
  await new Promise((done) => setTimeout(done, 80));
  return [...tracked]
    .filter(
      ([path, sha]) => sha256(readFileSync(join(cwd, path), 'utf8')) !== sha,
    )
    .map(([path]) => ` M ${path}\0`)
    .join('');
};

let root: string;
let live: LiveRepoStore;

beforeAll(async () => {
  root = await scratchCopy('repo-guards-');
  for (const path of [RECORD_FILES.label, RECORD_FILES.studio]) {
    tracked.set(path, sha256(readFileSync(join(root, path), 'utf8')));
  }
  live = await LiveRepoStore.open({ root, planners: false, git: slowGit });
}, 120_000);

afterAll(() => {
  if (root) rmSync(root, { recursive: true, force: true });
});

const read = (path: string) => readFileSync(join(root, path), 'utf8');
const write = (path: string, text: string) => {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
};

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

/** Renames the first studio, as an admin would: one line of studios.json. */
const renameStudio = async (name: string) => {
  const studio = live.store.items('studio')[0];
  const { body, revision } = await detail('studio', studio.slug);
  return ask('PUT', '/items', {
    body: {
      kind: 'studio',
      slug: studio.slug,
      body: { ...body, name },
      expectedRevision: revision,
    },
  });
};

describe('an edit made outside, to a file the save leaves alone', () => {
  it('is 409 REPO_FILE_CHANGED naming that file, and the retry goes through', async () => {
    const song = live.store
      .items('song')
      .find((item) => /^\s*popularity: \d+,$/m.test(read(item.file)))!;
    // Edited outside, and the watcher has not said so yet.
    write(
      song.file,
      read(song.file).replace(/^(\s*)popularity: \d+,$/m, '$1popularity: 3,'),
    );
    const studios = read(RECORD_FILES.studio);

    const refused = await renameStudio('Outside Edit Studio');

    expect(refused.status).toBe(409);
    expect(refused.body).toMatchObject({
      code: 'REPO_FILE_CHANGED',
      file: song.file,
    });
    expect(read(RECORD_FILES.studio)).toBe(studios);
    // The store read the files again: the outside edit is in it.
    expect(live.store.item('song', song.slug)?.body.popularity).toBe(3);

    const retried = await renameStudio('Outside Edit Studio');
    expect(retried.status).toBe(200);
    expect(read(RECORD_FILES.studio)).toContain('"Outside Edit Studio"');
  }, 60_000);
});

describe('the overview after a save', () => {
  it('counts the file the save just changed, though git answers slowly', async () => {
    const label = live.store.items('label')[0];
    const { body, revision } = await detail('label', label.slug);
    const saved = await ask('PUT', '/items', {
      body: {
        kind: 'label',
        slug: label.slug,
        body: { ...body, name: `${String(body.name)} Records` },
        expectedRevision: revision,
      },
    });
    expect(saved.status).toBe(200);

    const overview = await ask('GET', '/overview');
    const rows = overview.body as {
      kind: string;
      changedSincePublish: number;
    }[];
    expect(rows.find((row) => row.kind === 'label')?.changedSincePublish).toBe(
      1,
    );
    expect(rows.find((row) => row.kind === 'studio')?.changedSincePublish).toBe(
      1,
    );
  }, 60_000);
});

describe('what git has not committed, counted', () => {
  it('counts each file once, the vocabulary’s contract copy and manifest included', async () => {
    const paths = [
      VOCABULARY_DATA_FILES.genre,
      VOCABULARY_CONTRACT_FILES.vocabulary,
      VOCABULARY_CONTRACT_FILES.manifest,
      RECORD_FILES.studio,
    ];
    const git: GitRunner = async (args) =>
      args[0] === 'status'
        ? paths.map((path) => ` M ${path}\0`).join('')
        : 'main\n';
    const counted = await LiveRepoStore.open({ root, planners: false, git });
    const status = await counted.refreshGit();
    expect(status.files.map((file) => file.path).sort()).toEqual(
      [...paths].sort(),
    );
    const total = Object.values(status.byKind).reduce((n, c) => n + c, 0);
    expect(total).toBe(paths.length);
    expect(status.byKind).toEqual({ genre: 3, studio: 1 });
  }, 60_000);
});

describe('a decisions.json with rows that do not read', () => {
  /** The first `n` open suggestions. */
  const openSuggestions = async (n: number) => {
    const listed = await ask('GET', '/suggestions', {
      query: { limit: String(n), status: 'open' },
    });
    return (
      listed.body as { items: { suggestion: { id: string } }[] }
    ).items.map((row) => row.suggestion.id);
  };
  const reject = (id: string) =>
    ask('POST', '/suggestions/decisions', {
      body: { decisions: [{ suggestionId: id, op: 'reject' }] },
    });

  it('is never written over: a decision is refused until the file is fixed', async () => {
    const [first, second, third] = await openSuggestions(3);
    expect((await reject(first)).status).toBe(200);
    expect((await reject(second)).status).toBe(200);
    const good = read(DECISIONS_PATH);

    // A merge left half done.
    const damaged = good.replace(
      '"decisions": [',
      '"decisions": [\n<<<<<<< HEAD',
    );
    write(DECISIONS_PATH, damaged);
    await live.externalChange([join(root, DECISIONS_PATH)]);

    const refused = await reject(third);
    expect(refused.status).toBe(422);
    expect(refused.body).toMatchObject({
      code: 'REPO_UNWRITABLE',
      file: DECISIONS_PATH,
    });
    expect((refused.body as { error: string }).error).toMatch(
      /cannot be read .*fix the file first/,
    );
    expect(read(DECISIONS_PATH)).toBe(damaged);

    // A row the schema refuses, added by hand, is kept as well.
    const handAdded = good.replace(
      '"decisions": [\n',
      '"decisions": [\n    {"suggestionId": 42},\n',
    );
    write(DECISIONS_PATH, handAdded);
    await live.externalChange([join(root, DECISIONS_PATH)]);
    expect((await reject(third)).status).toBe(422);
    expect(read(DECISIONS_PATH)).toBe(handAdded);

    // Fixed: decisions are saved again, the earlier ones kept.
    write(DECISIONS_PATH, good);
    await live.externalChange([join(root, DECISIONS_PATH)]);
    expect((await reject(third)).status).toBe(200);
    const after = read(DECISIONS_PATH);
    for (const id of [first, second, third]) expect(after).toContain(id);
  }, 60_000);
});

describe('a bulk import running on the same copy', () => {
  afterAll(() => rmSync(join(root, IMPORT_LOCK_FILE), { force: true }));

  it('holds every write until it finishes; a lock nobody runs holds nothing', async () => {
    const studios = read(RECORD_FILES.studio);
    write(
      IMPORT_LOCK_FILE,
      JSON.stringify({ pid: process.pid, startedAt: '2026-09-30T18:00:00Z' }),
    );

    const held = await renameStudio('Saved During An Import');
    expect(held.status).toBe(409);
    expect(held.body).toMatchObject({
      code: 'REPO_BUSY',
      file: IMPORT_LOCK_FILE,
    });
    expect(read(RECORD_FILES.studio)).toBe(studios);

    // Left by an import that was killed: its process is gone.
    write(
      IMPORT_LOCK_FILE,
      JSON.stringify({ pid: 2 ** 30, startedAt: '2026-09-30T18:00:00Z' }),
    );
    const saved = await renameStudio('Saved After The Import');
    expect(saved.status).toBe(200);
    expect(read(RECORD_FILES.studio)).toContain('"Saved After The Import"');
  }, 60_000);
});

describe('a globe city that code names', () => {
  /** The first code file that names `id`, as the refusal names it. */
  const namedIn = (id: string) =>
    CITY_CODE_FILES.find((path) => read(path).includes(`'${id}'`));

  it('is neither deleted nor taken off the globe, force or not, and nothing changes', async () => {
    const cities = read(CITIES_FILE);
    const places = read(PLACES_FILE);
    expect(namedIn('nashville')).toBeTruthy();

    const deleted = await ask(
      'DELETE',
      `/items/${idOf('globe_city', 'nashville')}`,
      { query: { force: 'true' } },
    );
    expect(deleted.status).toBe(422);
    expect(deleted.body).toMatchObject({
      code: 'REPO_BAD_CHANGE',
      file: namedIn('nashville'),
    });

    const { body, revision } = await detail('globe_city', 'memphis');
    const unpinned = await ask('PUT', '/items', {
      body: {
        kind: 'globe_city',
        slug: 'memphis',
        body: { ...body, pin: false },
        expectedRevision: revision,
      },
    });
    expect(unpinned.status).toBe(422);
    expect((unpinned.body as { error: string }).error).toMatch(
      /Code uses the city 'memphis'.*take it off the globe/,
    );

    expect(read(CITIES_FILE)).toBe(cities);
    expect(read(PLACES_FILE)).toBe(places);
    expect(live.store.item('globe_city', 'memphis')?.file).toBe(CITIES_FILE);
  }, 60_000);

  it('lets a city no code names go off the globe', async () => {
    const city = live.store
      .items('globe_city')
      .find((item) => item.file === CITIES_FILE && !namedIn(item.slug))!;
    const { body, revision } = await detail('globe_city', city.slug);

    const unpinned = await ask('PUT', '/items', {
      body: {
        kind: 'globe_city',
        slug: city.slug,
        body: { ...body, pin: false },
        expectedRevision: revision,
      },
    });

    expect(unpinned.status).toBe(200);
    expect(read(CITIES_FILE)).not.toContain(`id: '${city.slug}'`);
    expect(read(PLACES_FILE)).toContain(`"id":"${city.slug}"`);
  }, 60_000);

  it('reads code files the repo has', () => {
    for (const path of CITY_CODE_FILES) {
      expect(readFileSync(join(REPO_ROOT, path), 'utf8')).toMatch(/cityId|'/);
    }
  });
});

describe('a chord progression', () => {
  it('is held to the library’s type: a body tsc would refuse is not written', async () => {
    const library = read(LIBRARY_FILE);
    const entry = live.store.items('chord_progression')[0];
    const { body, revision } = await detail('chord_progression', entry.slug);
    const wrong = { ...body, chords: 'C - F - G', zzExtraField: true };
    delete (wrong as Record<string, unknown>).chordCount;

    const refused = await ask('PUT', '/items', {
      body: {
        kind: 'chord_progression',
        slug: entry.slug,
        body: wrong,
        expectedRevision: revision,
      },
    });

    expect(refused.status).toBe(422);
    expect(JSON.stringify(refused.body)).toContain('INVALID_BODY');
    expect(read(LIBRARY_FILE)).toBe(library);

    // Its own fields, edited as the console edits them, go through.
    const saved = await ask('PUT', '/items', {
      body: {
        kind: 'chord_progression',
        slug: entry.slug,
        body: { ...body, vibes: [...(body.vibes as string[]), 'dreamy'] },
        expectedRevision: revision,
      },
    });
    expect(saved.status).toBe(200);
    expect(read(LIBRARY_FILE)).toContain("'dreamy'");
  }, 60_000);

  it('holds every entry the library has to the type', async () => {
    const report = await ask('GET', '/validate/chord_progression');
    expect(report.status).toBe(200);
    expect(
      (report.body as { problems: unknown[] }).problems.filter(
        (problem) => (problem as { severity: string }).severity === 'error',
      ),
    ).toEqual([]);
  });
});
