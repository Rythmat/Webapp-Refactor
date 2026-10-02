import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildCacheManifest,
  cachedGetter,
  createFileCache,
  sha256,
  sha256File,
} from '../fileCache';
import {
  artistLookupUrl,
  createMusicBrainzClient,
  MUSICBRAINZ_HTTP,
} from '../musicbrainz';
import { createPoliteHttp, HttpError } from '../politeHttp';
import { fakeClock, scriptedFetch } from './fakes';

const MBID = 'aab5c954-cabe-432e-899e-1c4f99757327';
const at = () => new Date('2026-09-29T12:00:00.000Z');

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ma-import-cache-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function setup(replies: Parameters<typeof scriptedFetch>[1]) {
  const clock = fakeClock();
  const server = scriptedFetch(clock, replies);
  const http = createPoliteHttp(MUSICBRAINZ_HTTP, server.fetch, clock);
  const cache = createFileCache(dir, at);
  return { server, http, cache };
}

describe('the per-URL cache', () => {
  it('fetches a miss once, then answers from disk without the network', async () => {
    const { server, http, cache } = setup([
      { body: { id: MBID, name: 'Toto' } },
    ]);
    const get = cachedGetter(http, cache);
    const url = artistLookupUrl(MBID);

    const first = await get(url);
    const second = await get(url);

    expect(first).toEqual({
      status: 200,
      body: { id: MBID, name: 'Toto' },
      fromCache: false,
    });
    expect(second).toEqual({ ...first, fromCache: true });
    expect(server.calls).toHaveLength(1);
    expect(get.stats).toEqual({ hits: 1, fetched: 1, wouldFetch: 0 });
  });

  it('keeps one file per URL, grouped by host, holding the URL and a hash', async () => {
    const { http, cache } = setup([{ body: { id: MBID } }]);
    const url = artistLookupUrl(MBID);
    await cachedGetter(http, cache)(url);

    const file = cache.fileFor(url);
    expect(file).toBe(join(dir, 'musicbrainz.org', `${sha256(url)}.json`));
    const stored = JSON.parse(readFileSync(file, 'utf8'));
    expect(stored).toEqual({
      url,
      status: 200,
      fetchedAt: '2026-09-29T12:00:00.000Z',
      sha256: sha256(JSON.stringify({ id: MBID })),
      body: { id: MBID },
    });
    // Written through a rename: nothing half-written is left beside it.
    expect(readdirSync(join(dir, 'musicbrainz.org'))).toEqual([
      `${sha256(url)}.json`,
    ]);
  });

  it('survives a restart: a new cache over the same folder has the answer', async () => {
    const { http, cache } = setup([{ body: { id: MBID } }]);
    const url = artistLookupUrl(MBID);
    await cachedGetter(http, cache)(url);

    const rerun = setup([{ status: 500 }]);
    const get = cachedGetter(rerun.http, createFileCache(dir));
    await expect(get(url)).resolves.toMatchObject({ fromCache: true });
    expect(rerun.server.calls).toHaveLength(0);
  });

  it('remembers a 404 — "no such artist" is an answer', async () => {
    const { server, http, cache } = setup([{ status: 404, body: '<html>' }]);
    const get = cachedGetter(http, cache);
    const url = artistLookupUrl(MBID);

    await expect(get(url)).resolves.toMatchObject({ status: 404, body: null });
    await expect(get(url)).resolves.toMatchObject({
      status: 404,
      fromCache: true,
    });
    expect(server.calls).toHaveLength(1);
  });

  it('keeps nothing for an answer that is not one, so a rerun asks again', async () => {
    const { http, cache } = setup([{ status: 400, body: 'bad query' }]);
    const url = artistLookupUrl(MBID);

    await expect(cachedGetter(http, cache)(url)).rejects.toBeInstanceOf(
      HttpError,
    );
    expect(existsSync(cache.fileFor(url))).toBe(false);
  });

  it('in a dry run, counts a miss instead of fetching it', async () => {
    const { server, http, cache } = setup([{}]);
    const get = cachedGetter(http, cache, { dryRun: true });

    await expect(get(artistLookupUrl(MBID))).resolves.toBeNull();
    expect(server.calls).toHaveLength(0);
    expect(get.stats.wouldFetch).toBe(1);
  });

  it('ignores a file that holds some other URL', async () => {
    const { http, cache } = setup([{ body: { fresh: true } }]);
    const url = artistLookupUrl(MBID);
    await cachedGetter(http, cache)(url);
    const file = cache.fileFor(url);
    const stored = JSON.parse(readFileSync(file, 'utf8'));
    writeFileSync(
      file,
      JSON.stringify({ ...stored, url: 'https://elsewhere/' }),
    );

    expect(cache.get(url)).toBeNull();
  });

  it('treats an unreadable file as a miss: moved aside, refetched, never fatal', async () => {
    const { server, http } = setup([{ body: { id: MBID, name: 'Toto' } }]);
    const lines: string[] = [];
    const cache = createFileCache(dir, at, (line) => lines.push(line));
    const url = artistLookupUrl(MBID);
    const file = cache.fileFor(url);
    // Half a file, as a crash on an old run could leave; and a stray file
    // that parses but isn't a cached response.
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, '{"url":"https://musicbrainz.org/ws/2/art');
    const stray = join(dirname(file), 'stray.json');
    writeFileSync(stray, '{"note":"hand-made"}');

    expect(cache.entries()).toEqual([]);
    expect(existsSync(`${file}.bad`)).toBe(true);
    expect(existsSync(`${stray}.bad`)).toBe(true);
    expect(buildCacheManifest(cache, {}, at).responses.count).toBe(0);

    await expect(cachedGetter(http, cache)(url)).resolves.toMatchObject({
      body: { name: 'Toto' },
      fromCache: false,
    });
    expect(server.calls).toHaveLength(1);
    expect(cache.get(url)?.body).toEqual({ id: MBID, name: 'Toto' });
    expect(lines.join('\n')).toMatch(/moved aside/);
  });

  it('keeps no 200 that is really an error, and asks again for one kept before', async () => {
    const refusal = (body: unknown) =>
      (body as { error?: { code: string } }).error?.code ?? null;
    const { server, http, cache } = setup([
      { body: { error: { code: 'readonly' } } },
      { body: { ok: true } },
    ]);
    const get = cachedGetter(http, cache, { refusal });
    const url = artistLookupUrl(MBID);

    await expect(get(url)).rejects.toThrow(/refused \(readonly\)/);
    expect(existsSync(cache.fileFor(url))).toBe(false);

    // One written by a run from before the check: read as a miss.
    cache.put(url, 200, JSON.stringify({ error: { code: 'readonly' } }));
    await expect(get(url)).resolves.toMatchObject({
      body: { ok: true },
      fromCache: false,
    });
    expect(server.calls).toHaveLength(2);
    expect(cache.get(url)?.body).toEqual({ ok: true });
  });

  it('keeps no 200 that is not JSON', async () => {
    const { http, cache } = setup([{ body: '<html>maintenance</html>' }]);
    const url = artistLookupUrl(MBID);

    await expect(cachedGetter(http, cache)(url)).rejects.toThrow(/not JSON/);
    expect(existsSync(cache.fileFor(url))).toBe(false);
  });

  it('is what the MusicBrainz client reads through', async () => {
    const { server, http, cache } = setup([
      { body: { id: MBID, name: 'Toto', relations: [] } },
    ]);
    const mb = createMusicBrainzClient(cachedGetter(http, cache));

    await mb.lookupArtist(MBID);
    const again = await mb.lookupArtist(MBID);

    expect(again).toMatchObject({ name: 'Toto' });
    expect(server.calls.map((c) => c.url)).toEqual([
      `https://musicbrainz.org/ws/2/artist/${MBID}?inc=aliases+genres+tags+url-rels+artist-rels&fmt=json`,
    ]);
  });
});

describe('the cache manifest', () => {
  it('lists every response by URL, with one digest over all of them', async () => {
    const { http, cache } = setup([{ body: { n: 1 } }, { body: { n: 2 } }]);
    const get = cachedGetter(http, cache);
    const b = 'https://www.wikidata.org/w/api.php?ids=Q2';
    const a = 'https://musicbrainz.org/ws/2/artist/?query=a';
    await get(b);
    await get(a);

    const manifest = buildCacheManifest(cache, {}, at);

    expect(manifest.responses.count).toBe(2);
    expect(manifest.responses.byHost).toEqual({
      'musicbrainz.org': 1,
      'www.wikidata.org': 1,
    });
    // Sorted by URL, whatever order they were fetched in.
    expect(manifest.responses.entries.map((e) => e.url)).toEqual([a, b]);
    expect(manifest.responses.digest).toBe(
      sha256(
        `${a} ${sha256(JSON.stringify({ n: 2 }))}\n${b} ${sha256(JSON.stringify({ n: 1 }))}\n`,
      ),
    );
    // Rebuilt from the files, so it is the same every time it is asked.
    expect(buildCacheManifest(cache, {}, at)).toEqual(manifest);
  });

  it('is empty, not an error, before anything is cached', () => {
    const manifest = buildCacheManifest(
      createFileCache(join(dir, 'none')),
      {},
      at,
    );
    expect(manifest.responses).toMatchObject({ count: 0, entries: [] });
  });

  it('hashes a local input by content', async () => {
    const file = join(dir, '_mb_cache.json');
    writeFileSync(file, '{"toto|africa":{}}');

    await expect(sha256File(file)).resolves.toEqual({
      sha256: sha256('{"toto|africa":{}}'),
      bytes: 18,
    });
  });
});
