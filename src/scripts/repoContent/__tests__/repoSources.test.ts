import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { Body } from '@/features/admin/content/mock/mockKinds';
import { RepoUnwritableError, SONG_DECLARATION } from '../literal';
import { loadRepoStore, REPO_ROOT } from '../repoStore';
import { ARTISTS_FILE, REGISTRY_FILE } from '../sources/artists';
import {
  declarationValue,
  fsReader,
  mapLimit,
  overlayReader,
  RepoContentError,
  type RepoItem,
} from '../sources/common';
import {
  EVENTS_DIR,
  eventFileRoutes,
  FALLBACK_EVENTS_FILE,
  routeNewEvent,
  SONG_EVENTS_FILE,
} from '../sources/events';
import { CITIES_FILE, PLACES_FILE } from '../sources/places';
import {
  BUNDLED_SONGS_FILE,
  compareSpecifiers,
  readSongRegistrations,
  SONGS_DIR,
  writeSongRegistrations,
} from '../sources/songs';

/**
 * The adapters' parts, in memory: the `bundled.ts` registration writer, the
 * events file routing, the readers, and what a load refuses. The load
 * cases read the live repo through a reader that swaps some files for
 * in-memory texts; nothing is written.
 */

const live = fsReader(REPO_ROOT);

/** The live repo with some files replaced (a text) or removed (null). */
const withFiles = (files: Record<string, string | null>) =>
  loadRepoStore({
    reader: overlayReader(live, new Map(Object.entries(files))),
  });

const failure = (run: Promise<unknown>) =>
  run.then(
    () => null,
    (error: unknown) => error,
  );

/* ── bundled.ts ── */

const BUNDLED = `/** The songs. */
import type { Song } from '@/curriculum/types/songLibrary';
import { _1999 } from './1999';
import { africa } from './africa';
import { dontStopBelievin } from './dont_stop_believin';
import { zebra } from './zebra';

export const BUNDLED_SONGS: Record<string, Song> = {
  dont_stop_believin: dontStopBelievin,
  '1999': _1999,
  africa: africa,
  zebra,
};
`;

describe('bundled.ts registrations', () => {
  it('reads each id, the name it maps to, and where that name comes from', () => {
    expect(readSongRegistrations(BUNDLED)).toEqual([
      {
        id: 'dont_stop_believin',
        identifier: 'dontStopBelievin',
        specifier: './dont_stop_believin',
      },
      { id: '1999', identifier: '_1999', specifier: './1999' },
      { id: 'africa', identifier: 'africa', specifier: './africa' },
      { id: 'zebra', identifier: 'zebra', specifier: './zebra' },
    ]);
  });

  it('orders specifiers as eslint-plugin-import does, and the live file follows it', () => {
    expect(compareSpecifiers('./a', './b')).toBeLessThan(0);
    expect(compareSpecifiers('./Z', './a')).toBeLessThan(0);
    expect(compareSpecifiers('./a_b', './ab')).toBeLessThan(0);
    expect(compareSpecifiers('./9x', './a')).toBeLessThan(0);
    expect(compareSpecifiers('./a', './a/b')).toBeLessThan(0);
    expect(compareSpecifiers('./a', './a')).toBe(0);
    const text = readFileSync(join(REPO_ROOT, BUNDLED_SONGS_FILE), 'utf8');
    const specifiers = [
      ...text.matchAll(/^import \{[^}]*\} from '(\.\/[^']+)';$/gm),
    ].map((m) => m[1]);
    expect(specifiers.length).toBeGreaterThan(600);
    expect([...specifiers].sort(compareSpecifiers)).toEqual(specifiers);
  });

  it('adds imports where they sort, each group in order, and appends the entries', async () => {
    const { text, changed } = await writeSongRegistrations({
      text: BUNDLED,
      add: [
        { id: 'beta', identifier: 'beta' },
        { id: 'alpha', identifier: 'alpha' },
        { id: 'zzz', identifier: 'zzz' },
        { id: '0first', identifier: '_0first' },
      ],
    });
    expect(changed).toBe(true);
    expect(text).toBe(`/** The songs. */
import type { Song } from '@/curriculum/types/songLibrary';
import { _0first } from './0first';
import { _1999 } from './1999';
import { africa } from './africa';
import { alpha } from './alpha';
import { beta } from './beta';
import { dontStopBelievin } from './dont_stop_believin';
import { zebra } from './zebra';
import { zzz } from './zzz';

export const BUNDLED_SONGS: Record<string, Song> = {
  dont_stop_believin: dontStopBelievin,
  '1999': _1999,
  africa: africa,
  zebra,
  beta: beta,
  alpha: alpha,
  zzz: zzz,
  '0first': _0first,
};
`);
  });

  it('removes an entry and its import, in the middle, at the end, and a shorthand one', async () => {
    const { text } = await writeSongRegistrations({
      text: BUNDLED,
      remove: ['1999', 'zebra'],
    });
    expect(text).toBe(`/** The songs. */
import type { Song } from '@/curriculum/types/songLibrary';
import { africa } from './africa';
import { dontStopBelievin } from './dont_stop_believin';

export const BUNDLED_SONGS: Record<string, Song> = {
  dont_stop_believin: dontStopBelievin,
  africa: africa,
};
`);
    // And adding them back is the original again, but for where the
    // entries go: at the end.
    const back = await writeSongRegistrations({
      text,
      add: [
        { id: '1999', identifier: '_1999' },
        { id: 'zebra', identifier: 'zebra' },
      ],
    });
    expect(readSongRegistrations(back.text).map((r) => r.id)).toEqual([
      'dont_stop_believin',
      'africa',
      '1999',
      'zebra',
    ]);
    expect(back.text.split('\n').slice(0, 7)).toEqual(
      BUNDLED.split('\n').slice(0, 7),
    );
  });

  it('changes nothing to register a registered song or take out one that is not', async () => {
    const result = await writeSongRegistrations({
      text: BUNDLED,
      add: [{ id: 'africa', identifier: 'africa' }],
      remove: ['nope'],
    });
    expect(result).toEqual({ text: BUNDLED, changed: false });
  });

  it('refuses a name already imported, a comment in the way, and one id added and removed', async () => {
    expect(
      await failure(
        writeSongRegistrations({
          text: BUNDLED,
          add: [{ id: 'africa_2', identifier: 'africa' }],
        }),
      ),
    ).toBeInstanceOf(RepoUnwritableError);
    expect(
      await failure(
        writeSongRegistrations({
          text: BUNDLED.replace(
            '  africa: africa,',
            '  africa: africa, // the one with the drums',
          ),
          remove: ['africa'],
        }),
      ),
    ).toMatchObject({ code: 'REPO_UNWRITABLE' });
    expect(
      await failure(
        writeSongRegistrations({
          text: BUNDLED,
          add: [{ id: 'new', identifier: 'fresh' }],
          remove: ['new'],
        }),
      ),
    ).toBeInstanceOf(RepoUnwritableError);
    expect(() =>
      readSongRegistrations(
        BUNDLED.replace('africa: africa', 'africa: load()'),
      ),
    ).toThrow(RepoUnwritableError);
  });

  it('refuses a registration under a name no module can declare, written or read', async () => {
    const written = await failure(
      writeSongRegistrations({
        text: BUNDLED,
        add: [{ id: 'static', identifier: 'static' }],
      }),
    );
    expect(written).toBeInstanceOf(RepoUnwritableError);
    expect((written as RepoUnwritableError).reason).toMatch(
      /cannot be imported as `static`/,
    );
    // Under the prefixed name it is an ordinary registration.
    const { text } = await writeSongRegistrations({
      text: BUNDLED,
      add: [{ id: 'static', identifier: '_static' }],
    });
    expect(text).toContain("import { _static } from './static';\n");
    expect(text).toContain('  static: _static,\n');
    // A hand-made bundled.ts that maps to or imports a reserved word is
    // not read as registrations, so it can never pass a read-back.
    expect(() =>
      readSongRegistrations(BUNDLED.replace('africa: africa', 'africa: yield')),
    ).toThrow(/a reserved word/);
    expect(() =>
      readSongRegistrations(
        BUNDLED.replace(
          "import { zebra } from './zebra';",
          "import { let } from './let';",
        ),
      ),
    ).toThrow(/a reserved word/);
  });

  it('says when bundled.ts was not prettier-clean before a registration reformats it', async () => {
    const messy = BUNDLED.replace(
      '  africa: africa,',
      '  africa: africa,\n    "hand_added" :   zebra ,',
    );
    const onUnclean = vi.fn();
    const told = await writeSongRegistrations({
      text: messy,
      add: [{ id: 'alpha', identifier: 'alpha' }],
      onUnclean,
    });
    expect(onUnclean).toHaveBeenCalledWith(BUNDLED_SONGS_FILE);
    expect(told.text).toContain('  hand_added: zebra,\n');

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      await writeSongRegistrations({
        text: messy,
        add: [{ id: 'alpha', identifier: 'alpha' }],
      });
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).toMatch(
        /bundled\.ts was not prettier-clean/,
      );
      warn.mockClear();
      await writeSongRegistrations({
        text: BUNDLED,
        add: [{ id: 'alpha', identifier: 'alpha' }],
      });
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('with no sibling imports yet, puts the first after the last import', async () => {
    const { text } = await writeSongRegistrations({
      text: `import type { Song } from '@/curriculum/types/songLibrary';\n\nexport const BUNDLED_SONGS: Record<string, Song> = {};\n`,
      add: [{ id: 'africa', identifier: 'africa' }],
    });
    expect(text).toBe(
      `import type { Song } from '@/curriculum/types/songLibrary';\nimport { africa } from './africa';\n\nexport const BUNDLED_SONGS: Record<string, Song> = {\n  africa: africa,\n};\n`,
    );
  });
});

/* ── Event routing ── */

const event = (slug: string, file: string, genre: unknown): RepoItem => ({
  kind: 'globe_event',
  slug,
  body: { id: slug, genre } as Body,
  status: 'published',
  updatedAt: new Date(0),
  file,
  sha256: '',
  files: [file],
});

describe('where a new event goes', () => {
  it('to the file whose evt- events most often have its first genre', () => {
    const a = `${EVENTS_DIR}/a.ts`;
    const b = `${EVENTS_DIR}/b.ts`;
    const routes = eventFileRoutes([
      event('evt-1', a, ['Jazz', 'Blues']),
      event('evt-2', b, ['Jazz']),
      event('evt-3', b, ['Jazz']),
      event('evt-4', a, ['Blues']),
      event('evt-5', b, ['Blues']),
      event('evt-6', a, 'Soul'),
      // The songs' own events take no part.
      event('song-x', SONG_EVENTS_FILE, ['Soul']),
      event('evt-7', SONG_EVENTS_FILE, ['Soul']),
      event('evt-8', SONG_EVENTS_FILE, ['Soul']),
    ]);
    expect(Object.fromEntries(routes)).toEqual({
      Jazz: b,
      Blues: a, // a tie goes to the earlier file
      Soul: a,
    });
    expect(routeNewEvent({ id: 'evt-new', genre: ['Jazz'] }, routes)).toBe(b);
    expect(routeNewEvent({ id: 'evt-new', genre: ['Polka'] }, routes)).toBe(
      FALLBACK_EVENTS_FILE,
    );
    expect(routeNewEvent({ id: 'evt-new' }, routes)).toBe(FALLBACK_EVENTS_FILE);
    expect(routeNewEvent({ id: 'song-new', genre: ['Jazz'] }, routes)).toBe(
      SONG_EVENTS_FILE,
    );
  });

  it('over the live files, sends each genre to its own file', async () => {
    const store = await loadRepoStore({ root: REPO_ROOT });
    const routes = eventFileRoutes(store.items('globe_event'));
    expect(routes.get('Jazz')).toBe(`${EVENTS_DIR}/jazz.ts`);
    expect(routes.get('Electronic')).toBe(`${EVENTS_DIR}/electronic.ts`);
    expect(routes.get('Afrobeats')).toBe(`${EVENTS_DIR}/african.ts`);
    expect(routes.get('Film Scoring')).toBe(`${EVENTS_DIR}/musicForMedia.ts`);
    expect([...routes.values()]).not.toContain(SONG_EVENTS_FILE);
  });
});

/* ── Readers ── */

describe('readers', () => {
  it('a missing file or folder reads as none', async () => {
    expect(await live.read('src/content/data/no-such-file.json')).toBeNull();
    expect(await live.list('src/no/such/folder')).toEqual([]);
  });

  it('an overlay replaces, adds and removes files, and lists them so', async () => {
    const overlay = overlayReader(
      live,
      new Map([
        [`${SONGS_DIR}/africa.ts`, 'replaced'],
        [`${SONGS_DIR}/zz_new.ts`, 'added'],
        [`${SONGS_DIR}/air.ts`, null],
      ]),
    );
    expect((await overlay.read(`${SONGS_DIR}/africa.ts`))?.text).toBe(
      'replaced',
    );
    expect(await overlay.read(`${SONGS_DIR}/air.ts`)).toBeNull();
    const names = await overlay.list(SONGS_DIR);
    expect(names).toContain('zz_new.ts');
    expect(names).not.toContain('air.ts');
    expect(names).toContain('africa.ts');
    expect(await overlay.list(EVENTS_DIR)).toEqual(await live.list(EVENTS_DIR));
  });

  it('mapLimit keeps order and runs at most `limit` at once', async () => {
    let running = 0;
    let most = 0;
    const out = await mapLimit([5, 1, 4, 2, 3], 2, async (n) => {
      running++;
      most = Math.max(most, running);
      await new Promise((done) => setTimeout(done, n));
      running--;
      return n * 10;
    });
    expect(out).toEqual([50, 10, 40, 20, 30]);
    expect(most).toBe(2);
  });

  it('a remembered declaration is a fresh value each time', async () => {
    const file = (await live.read(`${SONGS_DIR}/africa.ts`))!;
    const first = declarationValue(file, SONG_DECLARATION) as Body;
    first.title = 'changed';
    const second = declarationValue(file, SONG_DECLARATION) as Body;
    expect(second.title).not.toBe('changed');
  });
});

/* ── What a load refuses ── */

describe('a load refuses data it cannot hold as one set', () => {
  it('an event id in two files', async () => {
    const error = await failure(
      withFiles({
        [`${EVENTS_DIR}/zzFixture.ts`]:
          "export const ZZ_EVENTS = [{ id: 'evt-jazz-nola-1923', year: 1 }];\n",
      }),
    );
    expect(error).toBeInstanceOf(RepoContentError);
    expect(error).toMatchObject({ code: 'REPO_LOAD_FAILED', status: 500 });
    expect((error as Error).message).toContain('evt-jazz-nola-1923');
  });

  it('a song file named for another id, and a registration with no file', async () => {
    const africa = readFileSync(
      join(REPO_ROOT, SONGS_DIR, 'africa.ts'),
      'utf8',
    );
    expect(
      await failure(withFiles({ [`${SONGS_DIR}/africa_copy.ts`]: africa })),
    ).toMatchObject({ code: 'REPO_LOAD_FAILED' });
    expect(
      await failure(withFiles({ [`${SONGS_DIR}/africa.ts`]: null })),
    ).toMatchObject({ code: 'REPO_LOAD_FAILED' });
  });

  it('a song file that is not data, naming it', async () => {
    const error = await failure(
      withFiles({
        [`${SONGS_DIR}/zz_spread.ts`]:
          "import type { Song } from '@/curriculum/types/songLibrary';\nconst base = {};\nexport const zz_spread: Song = { ...base, id: 'zz_spread' };\n",
      }),
    );
    expect(error).toMatchObject({ code: 'REPO_LOAD_FAILED' });
    expect((error as Error).message).toContain('zz_spread.ts');
    expect((error as Error).message).toContain('spread');
  });

  it('a place in both files, and a roster artist’s row holding its name', async () => {
    expect(
      await failure(
        withFiles({
          [PLACES_FILE]:
            '[\n  {"id":"detroit","name":"Detroit","country":"US","subdivision":"","region":"north-america","coordinates":[0,0],"genres":[],"description":"","activeDecades":[],"pin":false}\n]\n',
        }),
      ),
    ).toMatchObject({ code: 'REPO_LOAD_FAILED' });
    expect(
      await failure(
        withFiles({
          [ARTISTS_FILE]: '[\n  {"slug":"abba","name":"ABBA"}\n]\n',
        }),
      ),
    ).toMatchObject({ code: 'REPO_LOAD_FAILED' });
  });

  it('loads a JSON file out of the canonical layout, with a warning', async () => {
    const store = await withFiles({
      [ARTISTS_FILE]: '[{"slug":"abba","group":true}]',
    });
    expect(store.item('artist', 'abba')?.body).toEqual({
      slug: 'abba',
      name: 'ABBA',
      group: true,
    });
    expect(store.warnings).toEqual([
      `${ARTISTS_FILE} is not in the one-record-per-line layout; its next write re-lays the whole file`,
    ]);
  });
});

/* ── Artists and places with their JSON files present ── */

describe('with artists.json and places.json in use', () => {
  it('a roster artist whose row fields are all cleared loses its row', async () => {
    const store = await withFiles({
      [ARTISTS_FILE]:
        '[\n  {"slug":"a6-off-roster","name":"Off"},\n  {"slug":"abba","group":true}\n]\n',
    });
    const abba = store.item('artist', 'abba')!;
    expect(abba.files).toEqual([REGISTRY_FILE, ARTISTS_FILE]);
    const rest = { ...abba.body };
    delete rest.group;
    const plans = await store.plan([
      { kind: 'artist', slug: 'abba', body: rest },
    ]);
    expect(plans.map((p) => [p.path, p.text])).toEqual([
      [ARTISTS_FILE, '[\n  {"slug":"a6-off-roster","name":"Off"}\n]\n'],
    ]);
    await store.verify([{ kind: 'artist', slug: 'abba', body: rest }], plans);
  });

  it('an artist moved onto the roster gets a registry line, and its row keeps only the rest', async () => {
    const store = await withFiles({
      [ARTISTS_FILE]:
        '[\n  {"slug":"a6-off-roster","name":"Off","aliases":["Off!"],"group":true}\n]\n',
    });
    const off = store.item('artist', 'a6-off-roster')!;
    expect(off.file).toBe(ARTISTS_FILE);
    const change = {
      kind: 'artist' as const,
      slug: off.slug,
      body: off.body,
      roster: true,
    };
    const plans = await store.plan([change]);
    const registry = plans.find((p) => p.path === REGISTRY_FILE)!;
    // One line appended to the roster, and nothing else.
    expect(registry.text).toBe(
      registry.before!.replace(
        '\n];\n',
        "\n  { slug: 'a6-off-roster', name: 'Off', aliases: ['Off!'] },\n];\n",
      ),
    );
    expect(plans.find((p) => p.path === ARTISTS_FILE)?.text).toBe(
      '[\n  {"slug":"a6-off-roster","group":true}\n]\n',
    );
    const after = await store.verify([change], plans);
    expect(after.item('artist', 'a6-off-roster')?.file).toBe(REGISTRY_FILE);
  });

  it('an unpinned place edited stays in places.json, one line changed', async () => {
    const row =
      '{"id":"a6-town","name":"Town","country":"US","subdivision":"","region":"north-america","coordinates":[1,2],"genres":[],"description":"","activeDecades":[],"pin":false}';
    const store = await withFiles({ [PLACES_FILE]: `[\n  ${row}\n]\n` });
    const town = store.item('globe_city', 'a6-town')!;
    expect(town.file).toBe(PLACES_FILE);
    const change = {
      kind: 'globe_city' as const,
      slug: 'a6-town',
      body: { ...town.body, name: 'Town Two' },
    };
    const plans = await store.plan([change]);
    expect(plans.map((p) => [p.path, p.text])).toEqual([
      [PLACES_FILE, `[\n  ${row.replace('"Town"', '"Town Two"')}\n]\n`],
    ]);
    expect(plans.some((p) => p.path === CITIES_FILE)).toBe(false);
    await store.verify([change], plans);
  });
});

/* ── The read-back check ── */

describe('verify', () => {
  it('refuses plans that do not read back as the changes', async () => {
    const store = await loadRepoStore({ root: REPO_ROOT });
    const africa = store.item('song', 'africa')!;
    const change = {
      kind: 'song' as const,
      slug: 'africa',
      body: { ...africa.body, tempo: (africa.body.tempo as number) + 1 },
    };
    const plans = await store.plan([change]);
    await expect(store.verify([change], plans)).resolves.toBeDefined();

    // A plan that also changed something nobody asked for.
    const tampered = plans.map((p) => ({
      ...p,
      text: p.text!.replace(/title: '[^']*'/, "title: 'Tampered'"),
    }));
    const error = await failure(store.verify([change], tampered));
    expect(error).toMatchObject({ code: 'REPO_UNWRITABLE', status: 422 });
    expect((error as Error).message).toContain('song:africa differs at title');

    // A plan that lost the file (bundled.ts still registers it), and one
    // that was never made.
    const lost = plans.map((p) => ({ ...p, text: null }));
    expect(
      ((await failure(store.verify([change], lost))) as Error).message,
    ).toMatch(/would not load.*registers 'africa', which has no song file/);
    expect(
      ((await failure(store.verify([change], []))) as Error).message,
    ).toContain('song:africa differs at tempo');
  });
});
