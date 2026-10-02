import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadRepoStore, REPO_ROOT, type RepoStore } from '../repoStore';
import { ARTIST_LOCATIONS_FILE } from '../sources/artistLocations';
import { ARTISTS_FILE, REGISTRY_FILE } from '../sources/artists';
import {
  type FilePlan,
  type ItemChange,
  RepoContentError,
  sha256,
} from '../sources/common';
import {
  EVENTS_DIR,
  FALLBACK_EVENTS_FILE,
  SONG_EVENTS_FILE,
} from '../sources/events';
import { CITIES_FILE, PLACES_FILE } from '../sources/places';
import { LIBRARY_FILE } from '../sources/progressions';
import { RECORD_FILES } from '../sources/records';
import {
  BUNDLED_SONGS_FILE,
  compareSpecifiers,
  isSongFileName,
  SONG_FILE_HEADER,
  songFileOf,
  SONGS_DIR,
} from '../sources/songs';
import { moduleErrors } from './moduleErrors';

/**
 * Real edits, planned by the store, on a copy of the data files in a temp
 * directory: the repo's own files are never written.
 *
 * Each edit is planned, read back in memory (`verify`, the round-trip
 * check), written to the copy, and loaded again; the store from disk must
 * be the store `verify` predicted. Then the diff of each file is checked to
 * be exactly the edit and nothing else, and the edit is undone by writing
 * the old texts back, so each case starts from the copy as it was made.
 */

let root: string;
let store: RepoStore;
/** Each copied file's sha256, to check the undo restored every byte. */
const copied = new Map<string, string>();

const copy = (path: string) => {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(join(REPO_ROOT, path), target);
  copied.set(path, sha256(readFileSync(target)));
};

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), 'repo-content-fixtures-'));
  for (const name of readdirSync(join(REPO_ROOT, SONGS_DIR))) {
    if (isSongFileName(name) || name === 'bundled.ts') {
      copy(`${SONGS_DIR}/${name}`);
    }
  }
  for (const name of readdirSync(join(REPO_ROOT, EVENTS_DIR))) {
    if (name.endsWith('.ts') && name !== 'index.ts') {
      copy(`${EVENTS_DIR}/${name}`);
    }
  }
  for (const path of [
    CITIES_FILE,
    REGISTRY_FILE,
    LIBRARY_FILE,
    ARTIST_LOCATIONS_FILE,
  ]) {
    copy(path);
  }
  store = await loadRepoStore({ root });
}, 60_000);

afterAll(() => {
  if (root) rmSync(root, { recursive: true, force: true });
});

/* ── Helpers ── */

const read = (path: string): string | null => {
  const absolute = join(root, path);
  return existsSync(absolute) ? readFileSync(absolute, 'utf8') : null;
};

const put = (path: string, text: string | null) => {
  const absolute = join(root, path);
  if (text === null) {
    if (existsSync(absolute)) unlinkSync(absolute);
    return;
  }
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, text);
};

/** Removed and added lines, by a longest-common-subsequence line diff. */
function lineDiff(
  before: string | null,
  after: string | null,
): { removed: string[]; added: string[] } {
  const a = before === null ? [] : before.split('\n');
  const b = after === null ? [] : after.split('\n');
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) {
    start++;
  }
  let end = 0;
  while (
    end < a.length - start &&
    end < b.length - start &&
    a[a.length - 1 - end] === b[b.length - 1 - end]
  ) {
    end++;
  }
  const x = a.slice(start, a.length - end);
  const y = b.slice(start, b.length - end);
  const lcs = Array.from(
    { length: x.length + 1 },
    () => new Uint32Array(y.length + 1),
  );
  for (let i = x.length - 1; i >= 0; i--) {
    for (let j = y.length - 1; j >= 0; j--) {
      lcs[i][j] =
        x[i] === y[j]
          ? lcs[i + 1][j + 1] + 1
          : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const removed: string[] = [];
  const added: string[] = [];
  let i = 0;
  let j = 0;
  while (i < x.length || j < y.length) {
    if (i < x.length && j < y.length && x[i] === y[j]) {
      i++;
      j++;
    } else if (
      j >= y.length ||
      (i < x.length && lcs[i + 1][j] >= lcs[i][j + 1])
    ) {
      removed.push(x[i++]);
    } else {
      added.push(y[j++]);
    }
  }
  return { removed, added };
}

/**
 * The lines of the array element holding `idLine`, from its `  {` to its
 * `  },`: what deleting that element should remove, and nothing more.
 */
function elementLines(text: string, idLine: string): string[] {
  const lines = text.split('\n');
  const at = lines.indexOf(idLine);
  let start = at;
  while (lines[start] !== '  {') start--;
  let end = at;
  while (lines[end] !== '  },') end++;
  return lines.slice(start, end + 1);
}

/** Lines as a sorted list, to compare what was removed regardless of alignment. */
const sortedLines = (lines: string[]) => [...lines].sort();

/** A comparable view of a store: every item's body, status and file. */
const view = (s: RepoStore) =>
  new Map(
    s
      .items()
      .map((item) => [
        `${item.kind}:${item.slug}`,
        JSON.stringify([item.body, item.status, item.file, item.derivedFrom]),
      ]),
  );

interface Edit {
  plans: FilePlan[];
  diff: (path: string) => { removed: string[]; added: string[] };
  plan: (path: string) => FilePlan | undefined;
}

/**
 * Plans `changes`, checks the plan reads back (`verify`), writes it to the
 * copy and loads the copy again, which must give what `verify` predicted.
 */
async function edit(changes: ItemChange[]): Promise<Edit> {
  const plans = await store.plan(changes);
  const predicted = await store.verify(changes, plans);
  for (const plan of plans) {
    expect(plan.before).toBe(read(plan.path));
    expect(plan.baseSha256).toBe(
      plan.before === null ? null : sha256(plan.before),
    );
    put(plan.path, plan.text);
  }
  store = await loadRepoStore({ root });
  expect(view(store)).toEqual(view(predicted));
  return {
    plans,
    diff: (path) => {
      const plan = plans.find((p) => p.path === path);
      if (!plan) throw new Error(`no plan for ${path}`);
      return lineDiff(plan.before, plan.text);
    },
    plan: (path) => plans.find((p) => p.path === path),
  };
}

/** Puts back what an edit replaced, and loads the copy again. */
async function undo(...edits: Edit[]) {
  for (const done of [...edits].reverse()) {
    for (const plan of done.plans) put(plan.path, plan.before);
  }
  store = await loadRepoStore({ root });
}

const body = (kind: ItemChange['kind'], slug: string) => {
  const item = store.item(kind, slug);
  if (!item) throw new Error(`${kind} ${slug} is not in the copy`);
  return structuredClone(item.body);
};

const refusal = async (changes: ItemChange[]) =>
  store.plan(changes).then(
    () => null,
    (error: unknown) => error,
  );

/* ── Songs ── */

describe('songs', () => {
  it('a field edit changes that one line of the song file', async () => {
    const africa = body('song', 'africa');
    const tempo = africa.tempo as number;
    const done = await edit([
      { kind: 'song', slug: 'africa', body: { ...africa, tempo: tempo + 1 } },
    ]);
    expect(done.plans.map((p) => p.path)).toEqual([songFileOf('africa')]);
    expect(done.diff(songFileOf('africa'))).toEqual({
      removed: [`  tempo: ${tempo},`],
      added: [`  tempo: ${tempo + 1},`],
    });
    expect(store.item('song', 'africa')?.status).toBe('published');
    await undo(done);
  });

  it('a year on a song that says `year: undefined` goes where it stands', async () => {
    const song = store
      .items('song')
      .find((s) => /^ {2}year: undefined,$/m.test(read(s.file) ?? ''))!;
    const done = await edit([
      { kind: 'song', slug: song.slug, body: { ...song.body, year: 1980 } },
    ]);
    expect(done.diff(song.file)).toEqual({
      removed: ['  year: undefined,'],
      added: ['  year: 1980,'],
    });
    await undo(done);
  });

  it('a new published song is a new file plus two lines of bundled.ts, and each step back is exact', async () => {
    const originalBundled = read(BUNDLED_SONGS_FILE);
    const fresh = {
      ...body('song', 'thank_you'),
      id: 'a6_fixture_song',
      title: 'A6 Fixture Song',
    };
    const created = await edit([
      {
        kind: 'song',
        slug: 'a6_fixture_song',
        body: fresh,
        status: 'published',
      },
    ]);
    const path = songFileOf('a6_fixture_song');
    expect(created.plans.map((p) => p.path).sort()).toEqual(
      [BUNDLED_SONGS_FILE, path].sort(),
    );
    expect(created.plan(path)?.before).toBeNull();
    expect(
      read(path)!.startsWith(
        `${SONG_FILE_HEADER}\n\nexport const a6_fixture_song: Song = {\n  id: 'a6_fixture_song',`,
      ),
    ).toBe(true);
    const importLine = "import { a6_fixture_song } from './a6_fixture_song';";
    expect(created.diff(BUNDLED_SONGS_FILE)).toEqual({
      removed: [],
      added: [importLine, '  a6_fixture_song: a6_fixture_song,'],
    });
    // The import sits where eslint's import/order puts it.
    const lines = read(BUNDLED_SONGS_FILE)!.split('\n');
    const at = lines.indexOf(importLine);
    const specifierOf = (line: string) =>
      /from '([^']+)'/.exec(line)?.[1] ?? '';
    expect(
      compareSpecifiers(specifierOf(lines[at - 1]), './a6_fixture_song'),
    ).toBeLessThan(0);
    expect(
      compareSpecifiers('./a6_fixture_song', specifierOf(lines[at + 1])),
    ).toBeLessThan(0);
    expect(store.item('song', 'a6_fixture_song')?.status).toBe('published');

    // Back to a draft: bundled.ts is byte for byte what it was.
    const drafted = await edit([
      {
        kind: 'song',
        slug: 'a6_fixture_song',
        body: fresh,
        status: 'draft',
      },
    ]);
    expect(drafted.plans.map((p) => p.path)).toEqual([BUNDLED_SONGS_FILE]);
    expect(read(BUNDLED_SONGS_FILE)).toBe(originalBundled);
    expect(store.item('song', 'a6_fixture_song')?.status).toBe('draft');

    // A draft can be deleted: its file goes.
    const deleted = await edit([
      { kind: 'song', slug: 'a6_fixture_song', body: null },
    ]);
    expect(deleted.plans).toEqual([
      expect.objectContaining({ path, text: null }),
    ]);
    expect(read(path)).toBeNull();
    expect(store.item('song', 'a6_fixture_song')).toBeUndefined();
  });

  it('a new song whose id starts with a digit exports `_<id>` under a quoted key', async () => {
    const fresh = { ...body('song', 'thank_you'), id: '9a6_fixture' };
    const done = await edit([
      { kind: 'song', slug: '9a6_fixture', body: fresh, status: 'published' },
    ]);
    expect(done.diff(BUNDLED_SONGS_FILE)).toEqual({
      removed: [],
      added: [
        "import { _9a6_fixture } from './9a6_fixture';",
        "  '9a6_fixture': _9a6_fixture,",
      ],
    });
    expect(read(songFileOf('9a6_fixture'))).toContain(
      'export const _9a6_fixture: Song = {',
    );
    await undo(done);
  });

  it('a new song named by a reserved word exports `_<id>`, and both files compile', async () => {
    for (const id of ['static', 'true']) {
      const fresh = { ...body('song', 'thank_you'), id, title: id };
      const done = await edit([
        { kind: 'song', slug: id, body: fresh, status: 'published' },
      ]);
      expect(done.diff(BUNDLED_SONGS_FILE)).toEqual({
        removed: [],
        added: [`import { _${id} } from './${id}';`, `  ${id}: _${id},`],
      });
      const songText = read(songFileOf(id))!;
      expect(songText).toContain(`export const _${id}: Song = {`);
      // TypeScript's binder, which the round trip never runs, accepts both.
      // The other songs' imports and the lib types are not given, so their
      // not-found errors are expected.
      expect(
        moduleErrors(
          {
            [`/songs/${id}.ts`]: songText,
            '/songs/bundled.ts': read(BUNDLED_SONGS_FILE)!,
          },
          [2304, 2307],
        ),
      ).toEqual([]);
      await undo(done);
    }
  });

  it('refuses a slug that names one of the folder modules or an importer file, planning nothing', async () => {
    for (const slug of ['bundled', 'index', '_generated_index', '_a6']) {
      for (const status of ['draft', 'published'] as const) {
        const error = await refusal([
          { kind: 'song', slug, body: { id: slug, title: 'x' }, status },
        ]);
        expect(error).toBeInstanceOf(RepoContentError);
        expect(error).toMatchObject({ code: 'REPO_BAD_CHANGE', status: 422 });
        expect((error as Error).message).toMatch(/is not a song file/);
      }
    }
  });

  it('refuses a body JSON would change, naming the value, before any file is planned', async () => {
    const africa = body('song', 'africa');
    const nan = await refusal([
      { kind: 'song', slug: 'africa', body: { ...africa, tempo: NaN } },
    ]);
    expect(nan).toMatchObject({ code: 'REPO_BAD_CHANGE', status: 422 });
    expect((nan as Error).message).toMatch(/`tempo` is NaN/);
    const dated = await refusal([
      {
        kind: 'release',
        slug: 'a6-fixture-release',
        body: {
          slug: 'a6-fixture-release',
          title: 'x',
          date: new Date(0),
        } as never,
      },
    ]);
    expect(dated).toMatchObject({ code: 'REPO_BAD_CHANGE' });
    expect((dated as Error).message).toMatch(/`date` is a Date/);
    // A read-only kind still answers 403 first.
    const location = store.items('artist_location')[0];
    expect(
      await refusal([
        {
          kind: 'artist_location',
          slug: location.slug,
          body: { ...location.body, lat: NaN },
        },
      ]),
    ).toMatchObject({ code: 'REPO_READ_ONLY', status: 403 });
  });

  it('a new song defaults to a draft: its file only', async () => {
    const fresh = { ...body('song', 'thank_you'), id: 'a6_fixture_draft' };
    const done = await edit([
      { kind: 'song', slug: 'a6_fixture_draft', body: fresh },
    ]);
    expect(done.plans.map((p) => p.path)).toEqual([
      songFileOf('a6_fixture_draft'),
    ]);
    expect(store.item('song', 'a6_fixture_draft')?.status).toBe('draft');
    await undo(done);
  });

  it('publishing a draft that exists registers it under its declared name, and unpublishing undoes it exactly', async () => {
    const originalBundled = read(BUNDLED_SONGS_FILE);
    const thankYou = body('song', 'thank_you');
    const published = await edit([
      { kind: 'song', slug: 'thank_you', body: thankYou, status: 'published' },
    ]);
    expect(published.plans.map((p) => p.path)).toEqual([BUNDLED_SONGS_FILE]);
    expect(published.diff(BUNDLED_SONGS_FILE)).toEqual({
      removed: [],
      added: [
        "import { thank_you } from './thank_you';",
        '  thank_you: thank_you,',
      ],
    });
    await edit([
      { kind: 'song', slug: 'thank_you', body: thankYou, status: 'draft' },
    ]);
    expect(read(BUNDLED_SONGS_FILE)).toBe(originalBundled);
  });

  it('refuses deleting a published song, renaming one, and a slug that is not a song id', async () => {
    expect(
      await refusal([{ kind: 'song', slug: 'africa', body: null }]),
    ).toMatchObject({ code: 'REPO_BAD_CHANGE', status: 422 });
    expect(
      await refusal([
        {
          kind: 'song',
          slug: 'africa',
          body: { ...body('song', 'africa'), id: 'africa_2' },
        },
      ]),
    ).toMatchObject({ code: 'REPO_BAD_CHANGE' });
    expect(
      await refusal([
        { kind: 'song', slug: '../escape', body: { id: '../escape' } },
      ]),
    ).toMatchObject({ code: 'REPO_BAD_CHANGE' });
    expect(
      await refusal([{ kind: 'song', slug: 'no_such_song', body: null }]),
    ).toMatchObject({ code: 'REPO_BAD_CHANGE' });
  });
});

/* ── Events ── */

describe('globe events', () => {
  it('an edit changes the event where it stands, in its own file', async () => {
    const id = 'evt-jazz-nola-1923';
    const event = body('globe_event', id);
    const file = store.item('globe_event', id)!.file;
    const description = `${event.description as string} Edited for the fixture.`;
    const done = await edit([
      { kind: 'globe_event', slug: id, body: { ...event, description } },
    ]);
    expect(done.plans.map((p) => p.path)).toEqual([file]);
    const diff = done.diff(file);
    expect(diff.removed).toHaveLength(1);
    expect(diff.added).toEqual([
      `      '${description.replace(/'/g, "\\'")}',`,
    ]);
    await undo(done);
  });

  it('a new evt- event is appended to the file of its first genre', async () => {
    const fresh = {
      id: 'evt-a6-fixture-1950',
      year: 1950,
      location: { lat: 40.7128, lng: -74.006, city: 'New York', country: 'US' },
      genre: ['Jazz'],
      title: 'A fixture event',
      description: 'An event made by the repo store fixture test.',
      tags: ['fixture'],
    };
    const jazz = `${EVENTS_DIR}/jazz.ts`;
    const done = await edit([
      { kind: 'globe_event', slug: fresh.id, body: fresh },
    ]);
    expect(done.plans.map((p) => p.path)).toEqual([jazz]);
    const diff = done.diff(jazz);
    expect(diff.removed).toEqual([]);
    expect(diff.added).toContain("    id: 'evt-a6-fixture-1950',");
    // At the end of the array, laid out like its neighbours.
    expect(read(jazz)!.endsWith("    tags: ['fixture'],\n  },\n];\n")).toBe(
      true,
    );
    expect(diff.added).toContain('    location: {');
    expect(store.item('globe_event', fresh.id)?.file).toBe(jazz);
    await undo(done);
  });

  it('routes a genre no file has to world.ts, and a song- event to songLibrary.ts', async () => {
    const base = {
      year: 2000,
      location: { lat: 0, lng: 0, city: 'Nowhere', country: 'XX' },
      title: 'Fixture',
      description: 'Fixture.',
      tags: [],
    };
    const plans = await store.plan([
      {
        kind: 'globe_event',
        slug: 'evt-a6-fixture-unknown',
        body: {
          ...base,
          id: 'evt-a6-fixture-unknown',
          genre: ['No Such Genre'],
        },
      },
      {
        kind: 'globe_event',
        slug: 'song-a6_fixture',
        body: { ...base, id: 'song-a6_fixture', genre: ['Jazz'] },
      },
    ]);
    expect(plans.map((p) => p.path).sort()).toEqual(
      [FALLBACK_EVENTS_FILE, SONG_EVENTS_FILE].sort(),
    );
  });

  it('a deleted event takes only its element with it', async () => {
    const id = 'evt-jazz-nola-1923';
    const file = store.item('globe_event', id)!.file;
    const element = elementLines(read(file)!, `    id: '${id}',`);
    const done = await edit([{ kind: 'globe_event', slug: id, body: null }]);
    const diff = done.diff(file);
    expect(diff.added).toEqual([]);
    expect(sortedLines(diff.removed)).toEqual(sortedLines(element));
    expect(store.item('globe_event', id)).toBeUndefined();
    await undo(done);
  });
});

/* ── Artists ── */

describe('artists', () => {
  it('a name edit changes one registry line and nothing else', async () => {
    const abba = body('artist', 'abba');
    const done = await edit([
      {
        kind: 'artist',
        slug: 'abba',
        body: { ...abba, name: 'ABBA (edited)' },
      },
    ]);
    expect(done.plans.map((p) => p.path)).toEqual([REGISTRY_FILE]);
    expect(done.diff(REGISTRY_FILE)).toEqual({
      removed: ["  { slug: 'abba', name: 'ABBA' },"],
      added: ["  { slug: 'abba', name: 'ABBA (edited)' },"],
    });
    await undo(done);
  });

  it('a record field of a roster artist goes to artists.json and leaves the registry alone', async () => {
    const abba = body('artist', 'abba');
    const done = await edit([
      {
        kind: 'artist',
        slug: 'abba',
        body: {
          ...abba,
          genreIds: ['pop'],
          activeFrom: 1972,
          born: { date: '1972' },
        },
      },
    ]);
    expect(done.plans.map((p) => p.path)).toEqual([ARTISTS_FILE]);
    expect(done.plan(ARTISTS_FILE)?.before).toBeNull();
    expect(read(ARTISTS_FILE)).toBe(
      '[\n  {"slug":"abba","born":{"date":"1972"},"activeFrom":1972,"genreIds":["pop"]}\n]\n',
    );
    const item = store.item('artist', 'abba')!;
    expect(item.file).toBe(REGISTRY_FILE);
    expect(item.files).toEqual([REGISTRY_FILE, ARTISTS_FILE]);

    // Taken off the roster: its registry line goes, and the row holds it all.
    const off = await edit([
      { kind: 'artist', slug: 'abba', body: item.body, roster: false },
    ]);
    expect(off.diff(REGISTRY_FILE)).toEqual({
      removed: ["  { slug: 'abba', name: 'ABBA' },"],
      added: [],
    });
    expect(read(ARTISTS_FILE)).toBe(
      '[\n  {"slug":"abba","name":"ABBA","born":{"date":"1972"},"activeFrom":1972,"genreIds":["pop"]}\n]\n',
    );
    expect(store.item('artist', 'abba')?.file).toBe(ARTISTS_FILE);
    await undo(done, off);
    expect(read(ARTISTS_FILE)).toBeNull();
  });

  it('a new artist is off the roster, whole in artists.json', async () => {
    const done = await edit([
      {
        kind: 'artist',
        slug: 'a6-fixture-artist',
        body: { slug: 'a6-fixture-artist', name: 'A6 Fixture', group: true },
      },
    ]);
    expect(done.plans.map((p) => p.path)).toEqual([ARTISTS_FILE]);
    expect(read(ARTISTS_FILE)).toBe(
      '[\n  {"slug":"a6-fixture-artist","name":"A6 Fixture","group":true}\n]\n',
    );
    await undo(done);
  });
});

/* ── Places ── */

describe('places', () => {
  it('flipping a city’s pin off moves it from cities.ts to places.json, and back', async () => {
    const nashville = body('globe_city', 'nashville');
    const element = elementLines(read(CITIES_FILE)!, "    id: 'nashville',");
    const off = await edit([
      {
        kind: 'globe_city',
        slug: 'nashville',
        body: { ...nashville, pin: false },
      },
    ]);
    expect(off.plans.map((p) => p.path).sort()).toEqual(
      [CITIES_FILE, PLACES_FILE].sort(),
    );
    const removed = off.diff(CITIES_FILE);
    expect(removed.added).toEqual([]);
    expect(sortedLines(removed.removed)).toEqual(sortedLines(element));
    expect(read(PLACES_FILE)).toMatch(
      /^\[\n {2}\{"id":"nashville",.*"pin":false\}\n\]\n$/,
    );
    expect(store.item('globe_city', 'nashville')?.file).toBe(PLACES_FILE);

    // Back on: it rejoins the cities, at the end, and places.json empties.
    const on = await edit([
      { kind: 'globe_city', slug: 'nashville', body: nashville },
    ]);
    const back = on.diff(CITIES_FILE);
    expect(back.removed).toEqual([]);
    expect(sortedLines(back.added)).toEqual(sortedLines(element));
    expect(read(PLACES_FILE)).toBe('[]\n');
    expect(store.item('globe_city', 'nashville')?.file).toBe(CITIES_FILE);
    await undo(off, on);
  });

  it('a new place without a pin goes to places.json only', async () => {
    const detroit = body('globe_city', 'detroit');
    const done = await edit([
      {
        kind: 'globe_city',
        slug: 'a6-fixture-town',
        body: {
          ...detroit,
          id: 'a6-fixture-town',
          name: 'Fixture',
          pin: false,
        },
      },
    ]);
    expect(done.plans.map((p) => p.path)).toEqual([PLACES_FILE]);
    await undo(done);
  });
});

/* ── Progressions ── */

describe('chord progressions', () => {
  it('adding songIds inserts one line after `song`', async () => {
    const first = body('chord_progression', '1');
    const done = await edit([
      {
        kind: 'chord_progression',
        slug: '1',
        body: { ...first, songIds: ['africa'] },
      },
    ]);
    expect(done.plans.map((p) => p.path)).toEqual([LIBRARY_FILE]);
    expect(done.diff(LIBRARY_FILE)).toEqual({
      removed: [],
      added: ["    songIds: ['africa'],"],
    });

    // And editing them changes that line.
    const again = await edit([
      {
        kind: 'chord_progression',
        slug: '1',
        body: { ...first, songIds: ['africa', 'air'] },
      },
    ]);
    expect(again.diff(LIBRARY_FILE)).toEqual({
      removed: ["    songIds: ['africa'],"],
      added: ["    songIds: ['africa', 'air'],"],
    });
    await undo(done, again);
  });

  it('refuses a progression whose id is written as a string', async () => {
    const first = body('chord_progression', '1');
    expect(
      await refusal([
        { kind: 'chord_progression', slug: '1', body: { ...first, id: '1' } },
      ]),
    ).toMatchObject({ code: 'REPO_BAD_CHANGE' });
  });
});

/* ── Records ── */

describe('releases, studios and labels', () => {
  it('a new release creates releases.json; an edit is a one-line diff; a delete empties it', async () => {
    const release = {
      slug: 'a6-fixture-release',
      title: 'Fixture',
      artistIds: ['abba'],
      format: 'album',
      year: 1976,
    };
    const created = await edit([
      { kind: 'release', slug: release.slug, body: release },
    ]);
    expect(created.plans.map((p) => p.path)).toEqual([RECORD_FILES.release]);
    expect(read(RECORD_FILES.release)).toBe(
      '[\n  {"slug":"a6-fixture-release","title":"Fixture","artistIds":["abba"],"format":"album","year":1976}\n]\n',
    );
    const studio = { slug: 'a6-fixture-studio', name: 'Fixture Studio' };
    const edited = await edit([
      { kind: 'release', slug: release.slug, body: { ...release, year: 1977 } },
      { kind: 'studio', slug: studio.slug, body: studio },
    ]);
    expect(edited.diff(RECORD_FILES.release)).toEqual({
      removed: [
        '  {"slug":"a6-fixture-release","title":"Fixture","artistIds":["abba"],"format":"album","year":1976}',
      ],
      added: [
        '  {"slug":"a6-fixture-release","title":"Fixture","artistIds":["abba"],"format":"album","year":1977}',
      ],
    });
    expect(read(RECORD_FILES.studio)).toBe(
      '[\n  {"slug":"a6-fixture-studio","name":"Fixture Studio"}\n]\n',
    );
    const deleted = await edit([
      { kind: 'release', slug: release.slug, body: null },
    ]);
    expect(read(RECORD_FILES.release)).toBe('[]\n');
    await undo(created, edited, deleted);
  });

  it('refuses a field the schema does not have, as REPO_UNWRITABLE', async () => {
    const error = await refusal([
      {
        kind: 'label',
        slug: 'a6-fixture-label',
        body: { slug: 'a6-fixture-label', name: 'Fixture', colour: 'red' },
      },
    ]);
    expect(error).toBeInstanceOf(RepoContentError);
    expect(error).toMatchObject({ code: 'REPO_UNWRITABLE', status: 422 });
  });
});

/* ── Several kinds at once, and what is refused ── */

describe('checkBases: the files a plan was worked out from', () => {
  it('passes while the disk holds them, and answers 409 once one is edited, deleted or made', async () => {
    const africa = body('song', 'africa');
    const edited = await store.plan([
      { kind: 'song', slug: 'africa', body: { ...africa, difficulty: 5 } },
    ]);
    const fresh = await store.plan([
      {
        kind: 'song',
        slug: 'a6_fixture_bases',
        body: { ...body('song', 'thank_you'), id: 'a6_fixture_bases' },
      },
    ]);
    const plans = [...edited, ...fresh];
    await expect(store.checkBases(plans)).resolves.toBeUndefined();

    const africaPath = songFileOf('africa');
    const original = read(africaPath)!;
    const newPath = songFileOf('a6_fixture_bases');
    const conflict = async () =>
      store.checkBases(plans).then(
        () => null,
        (error: unknown) => error,
      );
    try {
      put(africaPath, `${original}// touched\n`);
      expect(await conflict()).toMatchObject({
        code: 'REPO_FILE_CHANGED',
        status: 409,
        file: africaPath,
        message: expect.stringContaining(
          `${africaPath} (edited since the load)`,
        ),
      });
      put(africaPath, null);
      expect(await conflict()).toMatchObject({
        message: expect.stringContaining(
          `${africaPath} (deleted since the load)`,
        ),
      });
      put(africaPath, original);
      put(newPath, 'export {};\n');
      expect(await conflict()).toMatchObject({
        code: 'REPO_FILE_CHANGED',
        file: newPath,
        message: expect.stringContaining(`${newPath} (made since the load)`),
      });
    } finally {
      put(africaPath, original);
      put(newPath, null);
    }
    await expect(store.checkBases(plans)).resolves.toBeUndefined();
  });
});

describe('one save across kinds', () => {
  it('plans each file once, reads back, and lands on disk as predicted', async () => {
    const africa = body('song', 'africa');
    const detroit = body('globe_city', 'detroit');
    const done = await edit([
      { kind: 'song', slug: 'africa', body: { ...africa, difficulty: 3 } },
      {
        kind: 'globe_city',
        slug: 'detroit',
        body: {
          ...detroit,
          genres: [...(detroit.genres as string[]), 'Fixture'],
        },
      },
      {
        kind: 'artist',
        slug: 'abba',
        body: { ...body('artist', 'abba'), bio: 'A fixture.' },
      },
    ]);
    expect(done.plans.map((p) => p.path).sort()).toEqual(
      [songFileOf('africa'), CITIES_FILE, ARTISTS_FILE].sort(),
    );
    await undo(done);
  });

  it('refuses artist locations, lessons, and one item twice', async () => {
    const location = store.items('artist_location')[0];
    expect(
      await refusal([
        {
          kind: 'artist_location',
          slug: location.slug,
          body: { ...location.body, lat: 0 },
        },
      ]),
    ).toMatchObject({ code: 'REPO_READ_ONLY', status: 403 });
    expect(
      await refusal([{ kind: 'activity_flow', slug: 'x', body: { id: 'x' } }]),
    ).toMatchObject({ code: 'REPO_BAD_CHANGE' });
    const africa = body('song', 'africa');
    expect(
      await refusal([
        { kind: 'song', slug: 'africa', body: africa },
        { kind: 'song', slug: 'africa', body: africa },
      ]),
    ).toMatchObject({ code: 'REPO_BAD_CHANGE' });
  });

  it('left the copy byte for byte as it was made', () => {
    for (const [path, hash] of copied) {
      expect({ path, hash: sha256(readFileSync(join(root, path))) }).toEqual({
        path,
        hash,
      });
    }
    for (const path of [
      ARTISTS_FILE,
      PLACES_FILE,
      ...Object.values(RECORD_FILES),
    ]) {
      expect({ path, exists: read(path) !== null }).toEqual({
        path,
        exists: false,
      });
    }
  });
});
