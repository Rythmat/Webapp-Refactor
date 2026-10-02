import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { firstDifference, formatPath, type Json } from '../literal';
import {
  loadRepoStore,
  loadRepoSuggestions,
  REPO_ROOT,
  repoContentRoot,
  RepoStore,
} from '../repoStore';
import { REGISTRY_FILE } from '../sources/artists';
import { fsReader, newest } from '../sources/common';
import { REPO_KINDS } from '../sources/index';
import { CITIES_FILE } from '../sources/places';
import { SONGS_DIR } from '../sources/songs';

/**
 * The store loaded from the live repo is the app's data: every kind deep-
 * equals what the app's own modules export, as the mock's seed takes it
 * (`plain()`, a JSON round trip).
 *
 * Another session may be editing these data files while this runs (a
 * data-fix workflow edits the registry and the events). So each check loads
 * the store and imports the modules at the same moment, from a fresh module
 * graph, and only a difference that is still there after four tries, half a
 * second apart, fails. Nothing is compared with a fixed count.
 *
 * The store never imports a data module and never reads the broken,
 * gitignored `_generated_index.ts`; the mock below makes any import of it
 * fail this file.
 */

vi.mock('@/curriculum/data/songs/_generated_index', () => {
  throw new Error('_generated_index.ts was imported');
});

const plain = (value: unknown): Json =>
  value === undefined ? null : JSON.parse(JSON.stringify(value));

const importFresh = (path: string): Promise<Record<string, unknown>> =>
  import(/* @vite-ignore */ resolve(REPO_ROOT, path));

/** Differences between two values, as short messages; none when equal. */
const differ = (label: string, got: unknown, want: unknown): string[] => {
  const at = firstDifference(plain(got), plain(want));
  return at === null ? [] : [`${label} differs at ${formatPath(at)}`];
};

/** Runs `check` until it finds nothing, up to four times, from fresh modules. */
async function settled(
  check: (store: RepoStore) => Promise<string[]>,
): Promise<string[]> {
  let problems: string[] = [];
  for (let attempt = 0; attempt < 4; attempt++) {
    vi.resetModules();
    const store = await loadRepoStore({ root: REPO_ROOT });
    problems = await check(store);
    if (!problems.length) return [];
    await new Promise((done) => setTimeout(done, 500));
  }
  return problems;
}

describe('parity: the store holds what the app modules export', () => {
  it('songs: bundled.ts registers the published ones, and each equals plain(BUNDLED_SONGS[id]) or its own module', async () => {
    const problems = await settled(async (store) => {
      const { BUNDLED_SONGS } = (await import(
        '@/curriculum/data/songs/bundled'
      )) as { BUNDLED_SONGS: Record<string, unknown> };
      const out: string[] = [];
      const songs = store.items('song');
      const published = songs.filter((s) => s.status === 'published');
      out.push(
        ...differ(
          'the published ids',
          published.map((s) => s.slug).sort(),
          Object.keys(BUNDLED_SONGS).sort(),
        ),
      );
      for (const song of songs) {
        expect(song.file).toBe(`${SONGS_DIR}/${song.slug}.ts`);
        if (song.status === 'published') {
          out.push(...differ(song.slug, song.body, BUNDLED_SONGS[song.slug]));
        } else {
          const module = await importFresh(song.file);
          const exported = Object.values(module).find(
            (value) => (value as { id?: unknown })?.id === song.slug,
          );
          out.push(...differ(`draft ${song.slug}`, song.body, exported));
        }
      }
      return out;
    });
    expect(problems).toEqual([]);
  }, 180_000);

  it('events: every globe event equals plain(BUNDLED_MUSIC_HISTORY), each once', async () => {
    const problems = await settled(async (store) => {
      const { BUNDLED_MUSIC_HISTORY } = await import(
        '@/components/atlas/data/events'
      );
      const events = store.items('globe_event');
      const want = new Map(BUNDLED_MUSIC_HISTORY.map((e) => [e.id, e]));
      const out: string[] = [];
      if (
        events.length !== BUNDLED_MUSIC_HISTORY.length ||
        want.size !== events.length
      ) {
        out.push(
          `${events.length} events loaded, ${BUNDLED_MUSIC_HISTORY.length} exported (${want.size} ids)`,
        );
      }
      for (const event of events) {
        out.push(...differ(event.slug, event.body, want.get(event.slug)));
        const song = event.slug.startsWith('song-')
          ? event.slug.slice('song-'.length)
          : null;
        const expected =
          song && store.item('song', song)
            ? { kind: 'song', slug: song }
            : undefined;
        out.push(
          ...differ(
            `${event.slug}.derivedFrom`,
            event.derivedFrom ?? null,
            expected ?? null,
          ),
        );
      }
      return out;
    });
    expect(problems).toEqual([]);
  }, 120_000);

  it('places: the pinned places are plain(CITIES), in order', async () => {
    const problems = await settled(async (store) => {
      const { CITIES } = await import('@/components/atlas/data/cities');
      const pinned = store
        .items('globe_city')
        .filter((place) => place.file === CITIES_FILE);
      return [
        ...differ(
          'the cities',
          pinned.map((p) => p.body),
          CITIES,
        ),
        ...differ(
          'the city slugs',
          pinned.map((p) => p.slug),
          CITIES.map((c) => c.id),
        ),
      ];
    });
    expect(problems).toEqual([]);
  }, 60_000);

  it('artists: the roster is plain(ARTIST_REGISTRY), with artists.json rows composed in', async () => {
    const problems = await settled(async (store) => {
      const { ARTIST_REGISTRY } = await import(
        '@/components/atlas/data/artistRegistry'
      );
      const artists = store.items('artist');
      const roster = artists.filter((a) => a.file === REGISTRY_FILE);
      const out = differ(
        'the roster fields',
        roster.map(({ body }) => ({
          slug: body.slug,
          name: body.name,
          ...(body.aliases !== undefined ? { aliases: body.aliases } : {}),
        })),
        ARTIST_REGISTRY,
      );
      // While artists.json holds no rows, the artists are the registry
      // exactly.
      const rowsPath = 'src/content/data/artists.json';
      const rows: unknown[] = store.missing.includes(rowsPath)
        ? []
        : JSON.parse(readFileSync(resolve(REPO_ROOT, rowsPath), 'utf8'));
      if (!rows.length) {
        out.push(
          ...differ(
            'the artists',
            artists.map((a) => a.body),
            ARTIST_REGISTRY,
          ),
        );
      }
      return out;
    });
    expect(problems).toEqual([]);
  }, 60_000);

  it('progressions: plain(CHORD_PROGRESSION_LIBRARY), slugs as the ids written out', async () => {
    const problems = await settled(async (store) => {
      const library = (
        await import('@/curriculum/data/chordProgressionLibrary')
      ).default;
      const items = store.items('chord_progression');
      return [
        ...differ(
          'the library',
          items.map((i) => i.body),
          library,
        ),
        ...differ(
          'the slugs',
          items.map((i) => i.slug),
          library.map((e) => String(e.id)),
        ),
      ];
    });
    expect(problems).toEqual([]);
  }, 60_000);

  it('the vocabulary: the three files, as the vocabulary modules read them, in their order', async () => {
    const problems = await settled(async (store) => {
      const { REPO_VOCABULARY } = (await import(
        '@/content/vocabulary/repo'
      )) as typeof import('@/content/vocabulary/repo');
      const lists = {
        genre: REPO_VOCABULARY.genres,
        subgenre: REPO_VOCABULARY.subgenres,
        instrument: REPO_VOCABULARY.instruments,
      } as const;
      return Object.entries(lists).flatMap(([kind, records]) => {
        const items = store.items(kind as keyof typeof lists);
        return [
          ...differ(
            `the ${kind} records`,
            items.map((item) => item.body),
            records,
          ),
          ...differ(
            `the ${kind} slugs`,
            items.map((item) => item.slug),
            records.map((record) => record.id),
          ),
        ];
      });
    });
    expect(problems).toEqual([]);
  }, 60_000);

  it('artist locations: the JSON file, each as { id, ...place }', async () => {
    const problems = await settled(async (store) => {
      const file = JSON.parse(
        readFileSync(
          resolve(REPO_ROOT, 'src/scripts/artistLocations.json'),
          'utf8',
        ),
      ) as Record<string, object>;
      return differ(
        'the locations',
        store.items('artist_location').map((i) => [i.slug, i.body]),
        Object.entries(file).map(([name, place]) => [
          name,
          { id: name, ...place },
        ]),
      );
    });
    expect(problems).toEqual([]);
  }, 60_000);
});

describe('the items are the mock seed’s, with their files', () => {
  it('matches loadSeed("all") kind by kind, except what the seed adds of its own', async () => {
    const problems = await settled(async (store) => {
      const { loadSeed } = await import('@/features/admin/content/mock/seed');
      const { kindsFor } = await import(
        '@/features/admin/content/mock/mockKinds'
      );
      const seed = await loadSeed('all');
      const out: string[] = [];
      // The contract mock serves no vocabulary (only repo mode does); the
      // vocabulary's own parity is checked against its modules above.
      const seeded = new Set(kindsFor('all'));
      for (const kind of REPO_KINDS.filter((k) => seeded.has(k))) {
        const mine = new Map(store.items(kind).map((i) => [i.slug, i]));
        // The seed reads the same src/content/data/*.json files the store
        // does (the pilot studios and labels among them), so every kind
        // matches, those included.
        const theirs = seed.items.filter((i) => i.kind === kind);
        if (theirs.length !== mine.size) {
          out.push(
            `${kind}: ${mine.size} in the store, ${theirs.length} in the seed`,
          );
        }
        for (const item of theirs) {
          const own = mine.get(item.slug);
          if (!own) {
            out.push(`${kind} '${item.slug}' is not in the store`);
            continue;
          }
          // The seed gives new-york its aliases, which cities.ts lacks.
          const body =
            kind === 'globe_city' && own.body.aliases === undefined
              ? { ...item.body, aliases: undefined }
              : item.body;
          out.push(...differ(`${kind} '${item.slug}'`, own.body, body));
          out.push(
            ...differ(
              `${kind} '${item.slug}'.derivedFrom`,
              own.derivedFrom ?? null,
              item.derivedFrom ?? null,
            ),
          );
        }
      }
      return out;
    });
    expect(problems).toEqual([]);
  }, 180_000);

  it('gives every item its file, that file’s sha256 and its mtime', async () => {
    const store = await loadRepoStore({ root: REPO_ROOT });
    const index = store.fileIndex();
    for (const item of store.items()) {
      expect(item.files[0]).toBe(item.file);
      expect(index.get(item.file)).toBe(item.sha256);
      for (const path of item.files) expect(index.get(path)).toBeTruthy();
      // Other sessions may touch a file after the load; the mtime read then
      // can only be newer.
      const mtimes = item.files.map(
        (path) => statSync(resolve(REPO_ROOT, path)).mtime,
      );
      expect(item.updatedAt.getTime()).toBeLessThanOrEqual(
        newest(mtimes).getTime(),
      );
      if (item.kind !== 'song') expect(item.status).toBe('published');
    }
    for (const path of store.missing) expect(index.get(path)).toBeNull();
  }, 60_000);

  it('never reads or imports _generated_index.ts', async () => {
    const store = await loadRepoStore({ root: REPO_ROOT });
    expect(
      [...store.fileIndex().keys()].filter((path) =>
        path.includes('_generated_index'),
      ),
    ).toEqual([]);
    expect(store.items('song').some((s) => s.slug.startsWith('_'))).toBe(false);
    // No source of the core imports a data module: the files are read as text.
    const { readdirSync } = await import('node:fs');
    const dir = resolve(REPO_ROOT, 'src/scripts/repoContent');
    const sources = [
      ...readdirSync(dir)
        .filter((f) => f.endsWith('.ts'))
        .map((f) => resolve(dir, f)),
      ...readdirSync(resolve(dir, 'sources')).map((f) =>
        resolve(dir, 'sources', f),
      ),
    ];
    for (const path of sources) {
      const text = readFileSync(path, 'utf8');
      expect({ path, generated: text.includes("_generated_index'") }).toEqual({
        path,
        generated: false,
      });
      expect({
        path,
        data: /^import (?!type)[^;]*from '@\/(curriculum\/data|components\/atlas\/data)\//m.test(
          text,
        ),
      }).toEqual({ path, data: false });
    }
  });

  it('reads REPO_CONTENT_ROOT when it is set', () => {
    expect(repoContentRoot({})).toBe(REPO_ROOT);
    expect(repoContentRoot({ REPO_CONTENT_ROOT: '/tmp/x/../scratch' })).toBe(
      '/tmp/scratch',
    );
  });

  it('serves the suggestions the in-browser mock serves', async () => {
    // The importer's artifacts can be re-emitted by another session, so
    // both are read again until they agree.
    let problems: string[] = [];
    for (
      let attempt = 0;
      attempt < 4 && (attempt === 0 || problems.length);
      attempt++
    ) {
      if (attempt) await new Promise((done) => setTimeout(done, 500));
      vi.resetModules();
      const { loadSuggestionSeed } = await import(
        '@/features/admin/content/mock/seed'
      );
      const [mine, theirs] = await Promise.all([
        loadRepoSuggestions(fsReader(REPO_ROOT)),
        loadSuggestionSeed('all'),
      ]);
      problems = [
        ...differ(
          'the importer suggestions',
          mine.imported?.map((s) => s.id),
          theirs.imported?.map((s) => s.id),
        ),
        ...differ('the batches', mine.batches, theirs.batches),
        ...differ('the refusals', mine.refused, theirs.refused),
        ...differ(
          'the committed decisions',
          mine.committed ?? null,
          theirs.committed ?? null,
        ),
        ...(typeof mine.app === typeof theirs.app
          ? []
          : ['the planners differ']),
      ];
    }
    expect(problems).toEqual([]);
  }, 120_000);
});
