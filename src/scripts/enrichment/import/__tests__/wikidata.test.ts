import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cachedGetter, createFileCache } from '../fileCache';
import { createPoliteHttp, HttpError } from '../politeHttp';
import {
  batchIds,
  createWikidataClient,
  entitiesUrl,
  isTransientRefusal,
  knownEntitiesFrom,
  linkedIds,
  WIKIDATA_CACHE,
  WIKIDATA_HTTP,
  type WdEntity,
} from '../wikidata';
import { fakeClock, scriptedFetch } from './fakes';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ma-import-wd-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const qids = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => `Q${from + i}`);

/** A server that answers any wbgetentities request with the items it names. */
function entityServer(clock = fakeClock()) {
  const calls: string[] = [];
  const fetch = async (url: string) => {
    calls.push(url);
    const ids = new URL(url).searchParams.get('ids')?.split('|') ?? [];
    const entities = Object.fromEntries(
      ids.map((id) => [
        id,
        { id, labels: { en: { language: 'en', value: `item ${id}` } } },
      ]),
    );
    return new Response(JSON.stringify({ entities }), { status: 200 });
  };
  const http = createPoliteHttp(WIKIDATA_HTTP, fetch, clock);
  return { calls, http };
}

describe('batching', () => {
  it('makes batches of fifty, deduplicated and in numeric order', () => {
    const ids = [...qids(1, 120), 'Q7', 'Q7', 'not-an-id', 'P31'].reverse();

    const batches = batchIds(ids);

    expect(batches.map((b) => b.length)).toEqual([50, 50, 20]);
    expect(batches[0].slice(0, 3)).toEqual(['Q1', 'Q2', 'Q3']);
    expect(batches[2][batches[2].length - 1]).toBe('Q120');
  });

  it('asks with maxlag=5 and a fixed parameter order (the URL is the cache key)', () => {
    expect(entitiesUrl(['Q2', 'Q10'], ['labels', 'claims'])).toBe(
      'https://www.wikidata.org/w/api.php?action=wbgetentities&ids=Q2|Q10' +
        '&props=labels|claims&languages=en&format=json&maxlag=5',
    );
  });

  it('fetches 120 items in three requests, and none again once cached', async () => {
    const server = entityServer();
    const cache = createFileCache(dir);
    const client = createWikidataClient(cachedGetter(server.http, cache));

    const items = await client.getEntities(qids(1, 120), ['labels']);

    expect(items.size).toBe(120);
    expect(items.get('Q77')?.labels?.en.value).toBe('item Q77');
    expect(server.calls).toHaveLength(3);
    expect(
      server.calls.map(
        (u) => new URL(u).searchParams.get('ids')?.split('|').length,
      ),
    ).toEqual([50, 50, 20]);

    // A later run — say the full one after a --limit smoke test — only asks
    // for what it doesn't have, even though its batches differ.
    const later = entityServer();
    const rerun = createWikidataClient(
      cachedGetter(later.http, cache),
      knownEntitiesFrom(cache.entries('www.wikidata.org')),
    );
    const more = await rerun.getEntities(qids(100, 130), ['labels']);
    expect(more.size).toBe(31);
    expect(later.calls).toHaveLength(1);
    expect(new URL(later.calls[0]).searchParams.get('ids')).toBe(
      qids(121, 130).join('|'),
    );
  });

  it('keeps items fetched with different props apart', async () => {
    const server = entityServer();
    const client = createWikidataClient(
      cachedGetter(server.http, createFileCache(dir)),
    );

    await client.getEntities(['Q1'], ['labels']);
    await client.getEntities(['Q1'], ['labels', 'claims']);

    expect(server.calls).toHaveLength(2);
  });

  it('finds a merged item under the id that was asked for', async () => {
    const fetch = async () =>
      new Response(
        JSON.stringify({
          entities: { Q2: { id: 'Q2', redirects: { from: 'Q1', to: 'Q2' } } },
        }),
      );
    const client = createWikidataClient(
      cachedGetter(
        createPoliteHttp(WIKIDATA_HTTP, fetch, fakeClock()),
        createFileCache(dir),
      ),
    );

    const items = await client.getEntities(['Q1'], ['labels']);

    expect(items.get('Q1')?.id).toBe('Q2');
  });
});

describe('refusals', () => {
  const error = (code: string) => JSON.stringify({ error: { code } });

  it('recognises a "not now", and only a "not now"', () => {
    expect(
      isTransientRefusal(
        JSON.stringify({
          error: { code: 'maxlag', info: 'Waiting for db: 6 seconds lagged' },
        }),
      ),
    ).toBe(true);
    expect(isTransientRefusal(error('readonly'))).toBe(true);
    expect(isTransientRefusal(error('ratelimited'))).toBe(true);
    expect(isTransientRefusal(error('internal_api_error_DBQueryError'))).toBe(
      true,
    );
    // "Not this": asking again gets the same answer.
    expect(isTransientRefusal(error('no-such-entity'))).toBe(false);
    expect(isTransientRefusal(JSON.stringify({ entities: {} }))).toBe(false);
    expect(
      isTransientRefusal(
        JSON.stringify({ entities: { Q1: { note: '"error"' } } }),
      ),
    ).toBe(false);
  });

  it('never caches an error answered with 200, so a rerun resumes', async () => {
    // Rate-limited past every retry: the run fails, and keeps nothing.
    const clock = fakeClock();
    const refusing = scriptedFetch(clock, [
      { status: 200, body: { error: { code: 'ratelimited' } } },
    ]);
    const cache = createFileCache(dir);
    const client = createWikidataClient(
      cachedGetter(
        createPoliteHttp(
          { ...WIKIDATA_HTTP, maxAttempts: 2 },
          refusing.fetch,
          clock,
        ),
        cache,
        WIKIDATA_CACHE,
      ),
    );
    await expect(client.getEntities(['Q1'], ['labels'])).rejects.toBeInstanceOf(
      HttpError,
    );
    expect(refusing.calls).toHaveLength(2);
    expect(cache.entries()).toEqual([]);

    // The next run, against a healthy server, asks again and gets the item.
    const healthy = entityServer();
    const rerun = createWikidataClient(
      cachedGetter(healthy.http, cache, WIKIDATA_CACHE),
      knownEntitiesFrom(cache.entries('www.wikidata.org')),
    );
    const items = await rerun.getEntities(['Q1'], ['labels']);
    expect(items.get('Q1')?.labels?.en.value).toBe('item Q1');
    expect(healthy.calls).toHaveLength(1);
  });

  it('fails an error that will not clear at once, keeping nothing', async () => {
    const clock = fakeClock();
    const server = scriptedFetch(clock, [
      { status: 200, body: { error: { code: 'no-such-entity' } } },
    ]);
    const cache = createFileCache(dir);
    const client = createWikidataClient(
      cachedGetter(
        createPoliteHttp(WIKIDATA_HTTP, server.fetch, clock),
        cache,
        WIKIDATA_CACHE,
      ),
    );

    await expect(client.getEntities(['Q1'], ['labels'])).rejects.toThrow(
      /refused \(no-such-entity\)/,
    );
    expect(server.calls).toHaveLength(1);
    expect(cache.entries()).toEqual([]);
  });

  it('waits as told and asks again, then caches the real answer', async () => {
    const clock = fakeClock();
    const server = scriptedFetch(clock, [
      {
        status: 200,
        headers: { 'Retry-After': '5' },
        body: { error: { code: 'maxlag', info: 'lagged' } },
      },
      { body: { entities: { Q1: { id: 'Q1' } } } },
    ]);
    const http = createPoliteHttp(WIKIDATA_HTTP, server.fetch, clock);
    const cache = createFileCache(dir);
    const client = createWikidataClient(cachedGetter(http, cache));

    const items = await client.getEntities(['Q1'], ['labels']);

    expect(items.get('Q1')).toEqual({ id: 'Q1' });
    expect(server.calls.map((c) => c.at)).toEqual([0, 5000]);
    expect(server.calls[0].url).toContain('maxlag=5');
    expect(server.calls[0].headers['User-Agent']).not.toContain('@');
    // The refusal itself was never cached.
    expect(cache.entries()).toHaveLength(1);
    expect(cache.entries()[0].body).toEqual({ entities: { Q1: { id: 'Q1' } } });
  });
});

describe('inHand', () => {
  it('answers from what is cached and never asks', async () => {
    const server = entityServer();
    const cache = createFileCache(dir);
    await createWikidataClient(cachedGetter(server.http, cache)).getEntities(
      ['Q1', 'Q2'],
      ['labels'],
    );

    const later = entityServer();
    const client = createWikidataClient(
      cachedGetter(later.http, cache),
      knownEntitiesFrom(cache.entries('www.wikidata.org')),
    );
    const held = await client.inHand(['Q1', 'Q3'], ['labels']);

    expect([...held.keys()]).toEqual(['Q1']);
    expect(later.calls).toHaveLength(0);
  });
});

describe('linkedIds', () => {
  it('collects the items the given properties point at', () => {
    const claim = (property: string, id: string) => ({
      mainsnak: {
        snaktype: 'value',
        property,
        datavalue: { type: 'wikibase-entityid', value: { id } },
      },
    });
    const artists: WdEntity[] = [
      {
        id: 'Q1',
        claims: {
          P19: [claim('P19', 'Q61')],
          P136: [claim('P136', 'Q11401'), claim('P136', 'Q9759')],
          P569: [
            {
              mainsnak: {
                snaktype: 'value',
                property: 'P569',
                datavalue: {
                  type: 'time',
                  value: { time: '+1939-04-02T00:00:00Z' },
                },
              },
            },
          ],
        },
      },
      { id: 'Q2', claims: { P19: [claim('P19', 'Q61')] } },
    ];

    expect(linkedIds(artists, ['P19', 'P136'])).toEqual([
      'Q61',
      'Q9759',
      'Q11401',
    ]);
  });
});
