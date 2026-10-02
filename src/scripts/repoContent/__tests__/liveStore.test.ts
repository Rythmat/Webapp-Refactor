import {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  MockResponse,
  MockViewer,
} from '@/features/admin/content/mock/contentMockServer';
import { DECISIONS_FILE } from '@/features/admin/content/mock/decisions';
import type { MockKind } from '@/features/admin/content/mock/mockKinds';
import type { GitRunner } from '../gitStatus';
import {
  DECISIONS_PATH,
  EVENT_CODE_FILES,
  eventCodeReferences,
  LiveRepoStore,
  REPO_ROOT,
  REPO_WRITE_DIR,
  SUGGESTIONS_DIR,
} from '../repoStore';
import { ARTISTS_FILE, REGISTRY_FILE } from '../sources/artists';
import { RECORD_FILES } from '../sources/records';
import { songFileOf, SONGS_DIR } from '../sources/songs';
import { scratchCopy } from './scratchCopy';

/**
 * The repo store live (design A.4), over a copy of the repo's data files in
 * a temp directory: the content server in repo mode, with each change
 * written into the files before its answer. The repo's own files are only
 * ever read, to make the copy.
 */

const ADMIN: MockViewer = { role: 'admin', userId: 'admin-1', name: 'Ada' };

/** Git, as it would answer for three changed data files and one that is not data. */
const fakeGit: GitRunner = async (args) =>
  args[0] === 'status'
    ? [
        ` M ${REGISTRY_FILE}`,
        ` M ${songFileOf('africa')}`,
        `?? ${SONGS_DIR}/new_song.ts`,
        ` M ${DECISIONS_PATH}`,
        ' M src/components/atlas/data/artists.ts',
        '',
      ].join('\0')
    : 'main\n';

let root: string;
let live: LiveRepoStore;

beforeAll(async () => {
  root = await scratchCopy('repo-live-');
  live = await LiveRepoStore.open({ root, planners: false, git: fakeGit });
}, 120_000);

afterAll(() => {
  if (root) rmSync(root, { recursive: true, force: true });
});

const read = (path: string) => readFileSync(join(root, path), 'utf8');
const write = (path: string, text: string) =>
  writeFileSync(join(root, path), text);

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
  return response.body as {
    body: Record<string, unknown>;
    revision: number;
  };
};

/** The lines of `after` that are not in `before`, and the reverse. */
const changedLines = (before: string, after: string) => {
  const a = before.split('\n');
  const b = after.split('\n');
  return {
    removed: a.filter((line) => !b.includes(line)),
    added: b.filter((line) => !a.includes(line)),
  };
};

/** A song with a numeric year, to edit. */
const songWithYear = (skip: readonly string[] = []) => {
  const song = live.store
    .items('song')
    .find(
      (item) =>
        typeof item.body.year === 'number' &&
        !skip.includes(item.slug) &&
        /^\s*year: \d+,$/m.test(read(item.file)),
    );
  if (!song) throw new Error('no song with a year');
  return song;
};

describe('the live repo store', () => {
  it('writes an artist’s record field into artists.json before it answers, and nothing else', async () => {
    // An artist on the roster with no row in artists.json yet: since the
    // bulk import of 30 September 2026 most have one.
    const rows = read(ARTISTS_FILE);
    const artist = live.store
      .items('artist')
      .find(
        (item) =>
          item.file === REGISTRY_FILE &&
          !item.body.born &&
          !rows.includes(`{"slug":${JSON.stringify(item.slug)}`),
      )!;
    const registry = read(REGISTRY_FILE);
    const artists = read(ARTISTS_FILE);
    const { body, revision } = await detail('artist', artist.slug);

    const saved = await ask('PUT', '/items', {
      body: {
        kind: 'artist',
        slug: artist.slug,
        body: { ...body, born: { date: '1939-04-02' } },
        expectedRevision: revision,
      },
    });

    expect(saved.status).toBe(200);
    expect(read(REGISTRY_FILE)).toBe(registry);
    // One line more: the artist's record row (an empty file's `[]` opens up
    // into `[` and `]` around it). Since the bulk import of 30 September
    // 2026 filled the file it goes in among the other rows, in slug order,
    // so it ends in a comma unless it is the last.
    const { removed, added } = changedLines(artists, read(ARTISTS_FILE));
    expect(removed.filter((line) => line !== '[]')).toEqual([]);
    expect(
      added
        .filter((line) => line !== '[' && line !== ']')
        .map((line) => line.replace(/,$/, '')),
    ).toEqual([`  {"slug":"${artist.slug}","born":{"date":"1939-04-02"}}`]);
    expect((await detail('artist', artist.slug)).revision).toBe(revision + 1);
    // What the store holds now is what the disk holds.
    expect(live.store.file(ARTISTS_FILE)?.text).toBe(read(ARTISTS_FILE));
    // The new text went through a temp file, renamed into place: none is left.
    expect(existsSync(join(root, REPO_WRITE_DIR))).toBe(true);
    expect(readdirSync(join(root, REPO_WRITE_DIR))).toEqual([]);
  });

  it('changes one line of a song file for one field', async () => {
    const song = songWithYear();
    const before = read(song.file);
    const { body, revision } = await detail('song', song.slug);

    const saved = await ask('PUT', '/items', {
      body: {
        kind: 'song',
        slug: song.slug,
        body: { ...body, title: `${String(body.title)} (live)` },
        expectedRevision: revision,
      },
    });

    expect(saved.status).toBe(200);
    const { removed, added } = changedLines(before, read(song.file));
    expect(removed).toHaveLength(1);
    expect(added).toHaveLength(1);
    expect(added[0]).toContain('(live)');
  });

  it('knows its own writes, and nobody else’s', () => {
    const path = join(root, ARTISTS_FILE);
    expect(live.isOwnWrite(path, read(ARTISTS_FILE))).toBe(true);
    expect(live.isOwnWrite(path, `${read(ARTISTS_FILE)}\n`)).toBe(false);
    expect(
      live.isOwnWrite(join(root, REGISTRY_FILE), read(REGISTRY_FILE)),
    ).toBe(false);
  });

  it('reloads after an edit made outside, and what reads the same keeps its revision', async () => {
    const [artist] = live.store
      .items('artist')
      .filter((item) => item.file === REGISTRY_FILE);
    const kept = (await detail('artist', artist.slug)).revision;
    const studios = read(RECORD_FILES.studio);
    const studio = live.store.items('studio')[0];
    const name = String(studio.body.name);
    write(
      RECORD_FILES.studio,
      studios.replace(`"name":"${name}"`, `"name":"${name} II"`),
    );

    const kinds = await live.externalChange([join(root, RECORD_FILES.studio)]);

    expect(kinds).toEqual(['studio']);
    expect((await detail('studio', studio.slug)).body.name).toBe(`${name} II`);
    expect((await detail('artist', artist.slug)).revision).toBe(kept);
  });

  it('does not reload for its own writes, or for a file that is not data', async () => {
    expect(await live.externalChange([join(root, ARTISTS_FILE)])).toEqual([]);
    write(`${SONGS_DIR}/_generated_index.ts`, 'export {};\n');
    expect(
      await live.externalChange([join(root, SONGS_DIR, '_generated_index.ts')]),
    ).toEqual([]);
    expect(live.covers(join(root, ARTISTS_FILE))).toBe(true);
    expect(
      live.covers(join(root, 'src/components/atlas/data/artists.ts')),
    ).toBe(false);
    expect(live.covers('/somewhere/else.json')).toBe(false);
  });

  it('refuses a save over a file that changed underneath it (409), reloads, and the retry keeps both edits', async () => {
    const song = songWithYear();
    const file = read(song.file);
    const { body, revision } = await detail('song', song.slug);
    // Edited outside, and the watcher has not said so yet.
    const year = Number(body.year);
    write(
      song.file,
      file.replace(/^(\s*)year: \d+,$/m, `$1year: ${year + 1},`),
    );
    const outside = read(song.file);

    const refused = await ask('PUT', '/items', {
      body: {
        kind: 'song',
        slug: song.slug,
        body: { ...body, popularity: 77 },
        expectedRevision: revision,
      },
    });

    expect(refused.status).toBe(409);
    expect(refused.body).toMatchObject({
      code: 'REPO_FILE_CHANGED',
      file: song.file,
    });
    expect(read(song.file)).toBe(outside);
    // Read again: the store has the edit made outside.
    const now = await detail('song', song.slug);
    expect(now.body.year).toBe(year + 1);
    expect(now.revision).toBeGreaterThan(revision);

    const retried = await ask('PUT', '/items', {
      body: {
        kind: 'song',
        slug: song.slug,
        body: { ...now.body, popularity: 77 },
        expectedRevision: now.revision,
      },
    });
    expect(retried.status).toBe(200);
    expect(read(song.file)).toMatch(new RegExp(`year: ${year + 1},`));
    expect(read(song.file)).toMatch(/popularity: 77/);
  });

  it('refuses a save the file cannot take (422), and none of it stays', async () => {
    const song = songWithYear();
    // A comment at the end of the year's line, which removing the year
    // would orphan: the writer refuses that.
    write(
      song.file,
      read(song.file).replace(/^(\s*year: \d+,)$/m, '$1 // checked'),
    );
    await live.externalChange([join(root, song.file)]);
    const text = read(song.file);
    const { body, revision } = await detail('song', song.slug);
    const without = { ...body };
    delete without.year;

    const refused = await ask('PUT', '/items', {
      body: {
        kind: 'song',
        slug: song.slug,
        body: without,
        expectedRevision: revision,
      },
    });

    expect(refused.status).toBe(422);
    expect(refused.body).toMatchObject({ code: 'REPO_UNWRITABLE' });
    expect(read(song.file)).toBe(text);
    const after = await detail('song', song.slug);
    expect(after.body.year).toBe(body.year);
    // The client never had the answer that moved it: the revision it holds
    // is still good.
    expect(after.revision).toBe(revision);
  });

  it('writes decisions.json with each decision, one line each, and counts it committed', async () => {
    // The decisions the copy holds already: the bulk import's of 30
    // September 2026, less any that an edit above took out (the server keeps
    // the decisions that still stand). None until the import.
    const committed = (
      (await ask('GET', '/suggestions/decisions')).body as {
        decisions: unknown[];
      }
    ).decisions.length;
    const listed = await ask('GET', '/suggestions', {
      query: { limit: '20', status: 'open' },
    });
    expect(listed.status).toBe(200);
    const open = (
      listed.body as { items: { suggestion: { id: string } }[] }
    ).items.map((row) => row.suggestion);
    expect(open.length).toBeGreaterThan(1);

    const first = await ask('POST', '/suggestions/decisions', {
      body: { decisions: [{ suggestionId: open[0].id, op: 'reject' }] },
    });
    expect(first.status).toBe(200);
    const once = read(DECISIONS_PATH);
    expect(once).toContain(open[0].id);
    expect(live.server.decisionCounts().notDownloaded).toBe(0);

    await ask('POST', '/suggestions/decisions', {
      body: { decisions: [{ suggestionId: open[1].id, op: 'reject' }] },
    });
    const twice = read(DECISIONS_PATH);
    expect(changedLines(once, twice).removed).toEqual([
      expect.stringContaining(open[0].id),
    ]);
    expect(twice).toContain(open[1].id);
    expect(twice.match(/"suggestionId"/g)).toHaveLength(committed + 2);
    expect(DECISIONS_PATH).toBe(`${SUGGESTIONS_DIR}/${DECISIONS_FILE}`);

    // Read back as the server serves it.
    const served = await ask('GET', '/suggestions/decisions');
    expect((served.body as { decisions: unknown[] }).decisions).toHaveLength(
      committed + 2,
    );

    // Its own write is no news: a reload for another file reports that
    // file's kind alone, and the decisions survive it.
    write(
      RECORD_FILES.label,
      read(RECORD_FILES.label).replace('"name":"', '"name":"The '),
    );
    expect(await live.externalChange([join(root, RECORD_FILES.label)])).toEqual(
      ['label'],
    );
    expect(live.server.decisionCounts()).toMatchObject({
      total: committed + 2,
      notDownloaded: 0,
    });
  });

  it('moves an artist off the globe roster and back, and nothing else about it', async () => {
    const artist = live.store
      .items('artist')
      .find((item) => item.file === REGISTRY_FILE)!;
    const name = String(artist.body.name);
    const off = await live.setRoster(artist.slug, false);
    expect(off).toMatchObject({ slug: artist.slug, on: false, changed: true });
    expect(read(REGISTRY_FILE)).not.toContain(`slug: '${artist.slug}'`);
    expect(read(ARTISTS_FILE)).toContain(`"name":${JSON.stringify(name)}`);
    expect(await live.roster()).not.toContain(artist.slug);

    const on = await live.setRoster(artist.slug, true);
    expect(on).toMatchObject({ on: true, changed: true });
    expect(await live.roster()).toContain(artist.slug);
    expect((await live.setRoster(artist.slug, true))?.changed).toBe(false);
    expect(await live.setRoster('no-such-artist-anywhere', true)).toBeNull();
    expect((await detail('artist', artist.slug)).body.name).toBe(name);
  });

  it('reports what git has not committed, by kind, and counts it on the overview', async () => {
    const status = await live.refreshGit();
    expect(status).toMatchObject({
      git: true,
      branch: 'main',
      decisions: true,
      byKind: { artist: 1, song: 2 },
    });
    expect(status.files.map((file) => file.path)).toEqual(
      [
        REGISTRY_FILE,
        songFileOf('africa'),
        `${SONGS_DIR}/new_song.ts`,
        DECISIONS_PATH,
      ].sort(),
    );
    const overview = await ask('GET', '/overview');
    const rows = overview.body as {
      kind: string;
      changedSincePublish: number;
    }[];
    expect(rows.find((row) => row.kind === 'song')?.changedSincePublish).toBe(
      2,
    );
    expect(rows.find((row) => row.kind === 'studio')?.changedSincePublish).toBe(
      0,
    );
  });
});

describe('deleting a globe event', () => {
  /** The first code file that names `id`, as the refusal names it. */
  const namedIn = (id: string) =>
    EVENT_CODE_FILES.find((path) => read(path).includes(`'${id}'`));

  it('is refused while code names it, force or not, and nothing changes', async () => {
    const event = live.store
      .items('globe_event')
      .find((item) => item.slug.startsWith('evt-') && namedIn(item.slug))!;
    const file = read(event.file);

    const refused = await ask(
      'DELETE',
      `/items/${idOf('globe_event', event.slug)}`,
      { query: { force: 'true' } },
    );

    expect(refused.status).toBe(422);
    expect(refused.body).toMatchObject({
      code: 'REPO_BAD_CHANGE',
      file: namedIn(event.slug),
    });
    expect((refused.body as { error: string }).error).toContain(event.slug);
    expect(read(event.file)).toBe(file);
    expect((await detail('globe_event', event.slug)).body.id).toBe(event.slug);
  });

  it('goes ahead for an event no code names', async () => {
    const event = live.store
      .items('globe_event')
      .find((item) => item.slug.startsWith('evt-') && !namedIn(item.slug))!;

    const deleted = await ask(
      'DELETE',
      `/items/${idOf('globe_event', event.slug)}`,
      { query: { force: 'true' } },
    );

    expect(deleted.status).toBe(200);
    expect(read(event.file)).not.toContain(`'${event.slug}'`);
    expect(live.store.item('globe_event', event.slug)).toBeUndefined();
  });

  it('counts a whole id as named, never one that only starts the same', async () => {
    const reader = {
      root: '/',
      read: async (path: string) =>
        path === EVENT_CODE_FILES[2]
          ? {
              path,
              text: "const stops = [{ eventId: 'evt-soul-1962' }];\n",
              sha256: '',
              mtime: new Date(0),
            }
          : null,
      list: async () => [],
    };
    const named = await eventCodeReferences(reader, [
      'evt-soul',
      'evt-soul-1962',
    ]);
    expect([...named]).toEqual([['evt-soul-1962', [EVENT_CODE_FILES[2]]]]);
  });

  it('reads code files the repo has', () => {
    for (const path of EVENT_CODE_FILES) {
      expect(existsSync(join(REPO_ROOT, path)), path).toBe(true);
    }
  });
});

describe('a dry run', () => {
  it('plans and reads back every write, and keeps it in memory', async () => {
    const dry = await LiveRepoStore.open({
      root,
      planners: false,
      git: false,
      dryRun: true,
    });
    const song = songWithYear();
    const before = read(song.file);
    const item = dry.server.storedItem('song', song.slug)!;

    const saved = await dry.handle({
      method: 'PUT',
      path: '/items',
      viewer: ADMIN,
      body: {
        kind: 'song',
        slug: song.slug,
        body: { ...item.body, title: 'Only in memory' },
      },
    });

    expect(saved.status).toBe(200);
    expect(read(song.file)).toBe(before);
    expect(dry.plannedWrites().get(song.file)).toContain('Only in memory');
    // Later plans start from what the earlier ones would have written.
    expect(dry.store.item('song', song.slug)?.body.title).toBe(
      'Only in memory',
    );
  }, 60_000);
});
