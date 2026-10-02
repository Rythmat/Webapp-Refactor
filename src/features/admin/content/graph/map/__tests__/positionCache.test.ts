/**
 * The Mind Map's remembered layouts, in IndexedDB (fake-indexeddb): saved
 * and read back by node id, warm only at 95% coverage, shifted for a local
 * graph, four signatures kept, saved when the page is hidden, and quiet
 * failure wherever storage is missing, refused or holds something odd.
 */
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { ALPHA } from '../layout/forceLayout';
import {
  createPositionCache,
  KEEP_SIGNATURES,
  layoutSignature,
  POSITION_DATABASE,
  type PageHideEvents,
} from '../layout/positionCache';

const IDS = Array.from({ length: 20 }, (_, i) => `song:${i}`);
const XY = Float32Array.from({ length: 40 }, (_, i) => i * 10 - 150);

/** A clock that moves on a millisecond each time it is read. */
const ticking = () => {
  let at = 1_000;
  return () => (at += 1);
};

const cacheWith = (factory: IDBFactory | null = new IDBFactory()) =>
  createPositionCache({ indexedDB: factory, now: ticking() });

describe('saving and loading', () => {
  it('reads back what was saved, in the order asked for, as a warm start', async () => {
    const cache = cacheWith();
    expect(await cache.save({ signature: 'global|a', ids: IDS, xy: XY })).toBe(
      true,
    );
    const start = await cache.load('global|a', IDS);
    expect(start.placed).toBe(20);
    expect(start.coverage).toBe(1);
    expect(start.alpha).toBe(ALPHA.warm);
    expect(Array.from(start.xy)).toEqual(Array.from(XY));

    const reversed = [...IDS].reverse();
    const flipped = await cache.load('global|a', reversed);
    expect(flipped.xy[0]).toBe(XY[38]);
    expect(flipped.xy[1]).toBe(XY[39]);
  });

  it('starts warm only when 95% of the nodes asked for have a position', async () => {
    const cache = cacheWith();
    await cache.save({ signature: 's', ids: IDS, xy: XY });

    const oneNew = [...IDS.slice(0, 19), 'song:new'];
    const warm = await cache.load('s', oneNew);
    expect(warm.coverage).toBe(0.95);
    expect(warm.alpha).toBe(ALPHA.warm);
    expect(Number.isNaN(warm.xy[38])).toBe(true);

    const twoNew = [...IDS.slice(0, 18), 'song:new', 'song:newer'];
    const cold = await cache.load('s', twoNew);
    expect(cold.coverage).toBe(0.9);
    expect(cold.alpha).toBe(ALPHA.cold);
    expect(cold.placed).toBe(18);
  });

  it('shifts positions so a local graph starts with its focus at the origin', async () => {
    const cache = cacheWith();
    await cache.save({ signature: 's', ids: IDS, xy: XY });
    const local = await cache.load('s', ['song:3', 'song:4'], {
      center: 'song:3',
    });
    expect(Array.from(local.xy)).toEqual([0, 0, XY[8] - XY[6], XY[9] - XY[7]]);
  });

  it('starts cold for a signature it has never seen, or an empty list', async () => {
    const cache = cacheWith();
    const unknown = await cache.load('never', IDS);
    expect(unknown).toMatchObject({
      placed: 0,
      coverage: 0,
      alpha: ALPHA.cold,
    });
    expect(Array.from(unknown.xy).every(Number.isNaN)).toBe(true);
    await cache.save({ signature: 's', ids: IDS, xy: XY });
    expect(await cache.load('s', [])).toMatchObject({ coverage: 0, alpha: 1 });
  });

  it('keeps the four most recently saved signatures', async () => {
    const cache = cacheWith();
    const signatures = ['a', 'b', 'c', 'd', 'e'];
    for (const signature of signatures)
      await cache.save({ signature, ids: IDS, xy: XY });
    expect(KEEP_SIGNATURES).toBe(4);
    expect((await cache.load('a', IDS)).placed).toBe(0);
    for (const signature of signatures.slice(1))
      expect((await cache.load(signature, IDS)).placed).toBe(20);

    // Saving "b" again makes it the newest, so "c" is the next to go.
    const moved = XY.map((v) => v + 1);
    await cache.save({ signature: 'b', ids: IDS, xy: moved });
    await cache.save({ signature: 'f', ids: IDS, xy: XY });
    expect((await cache.load('c', IDS)).placed).toBe(0);
    expect((await cache.load('b', IDS)).xy[0]).toBe(moved[0]);
  });

  it('skips a save identical to the last one', async () => {
    let reads = 0;
    const cache = createPositionCache({
      indexedDB: new IDBFactory(),
      now: () => {
        reads += 1;
        return 5_000 + reads;
      },
    });
    await cache.save({ signature: 's', ids: IDS, xy: XY });
    await cache.save({ signature: 's', ids: IDS, xy: Float32Array.from(XY) });
    expect(reads).toBe(1);
    await cache.save({ signature: 's', ids: IDS, xy: XY.map((v) => v + 1) });
    expect(reads).toBe(2);
  });

  it('refuses positions that do not match the ids', async () => {
    const cache = cacheWith();
    expect(
      await cache.save({ signature: 's', ids: IDS, xy: new Float32Array(3) }),
    ).toBe(false);
  });
});

describe('saving when the page is hidden', () => {
  const pageEvents = () => {
    const window = new EventTarget();
    const document = Object.assign(new EventTarget(), {
      visibilityState: 'visible',
    });
    const events: PageHideEvents = { window, document };
    return { events, window, document };
  };

  it('saves the current layout on pagehide and when the tab is hidden', async () => {
    const cache = cacheWith();
    const page = pageEvents();
    let xy = XY;
    const stop = cache.saveOnPageHide(
      () => ({ signature: 's', ids: IDS, xy }),
      page.events,
    );

    page.window.dispatchEvent(new Event('pagehide'));
    await cache.settled();
    expect((await cache.load('s', IDS)).xy[0]).toBe(XY[0]);

    xy = XY.map((v) => v * 2);
    page.document.dispatchEvent(new Event('visibilitychange'));
    await cache.settled();
    expect((await cache.load('s', IDS)).xy[2]).toBe(XY[2]);

    page.document.visibilityState = 'hidden';
    page.document.dispatchEvent(new Event('visibilitychange'));
    await cache.settled();
    expect((await cache.load('s', IDS)).xy[2]).toBe(XY[2] * 2);

    stop();
    xy = XY.map((v) => v * 3);
    page.window.dispatchEvent(new Event('pagehide'));
    await cache.settled();
    expect((await cache.load('s', IDS)).xy[2]).toBe(XY[2] * 2);
  });

  it('saves nothing when there is no layout to save', async () => {
    const cache = cacheWith();
    const page = pageEvents();
    cache.saveOnPageHide(() => null, page.events);
    page.window.dispatchEvent(new Event('pagehide'));
    await cache.settled();
    expect((await cache.load('s', IDS)).placed).toBe(0);
  });
});

describe('without working storage', () => {
  it('starts cold and saves nothing when IndexedDB is missing', async () => {
    const cache = cacheWith(null);
    expect(await cache.save({ signature: 's', ids: IDS, xy: XY })).toBe(false);
    expect(await cache.load('s', IDS)).toMatchObject({ placed: 0, alpha: 1 });
    // In node there is no browser IndexedDB either.
    const fallback = createPositionCache();
    expect(await fallback.save({ signature: 's', ids: IDS, xy: XY })).toBe(
      false,
    );
  });

  it('starts cold when the database refuses to open', async () => {
    const refusing = {
      open: () => {
        throw new DOMException('refused', 'SecurityError');
      },
    } as unknown as IDBFactory;
    const cache = cacheWith(refusing);
    expect(await cache.save({ signature: 's', ids: IDS, xy: XY })).toBe(false);
    expect((await cache.load('s', IDS)).placed).toBe(0);
  });

  it('ignores a record it cannot read', async () => {
    const factory = new IDBFactory();
    const cache = cacheWith(factory);
    await cache.save({ signature: 'other', ids: IDS, xy: XY });
    cache.close();
    // Write a malformed record behind the cache's back.
    await new Promise<void>((resolve, reject) => {
      const request = factory.open(POSITION_DATABASE);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('layouts', 'readwrite');
        tx.objectStore('layouts').put({
          signature: 'bad',
          savedAt: 1,
          ids: 'x',
        });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });
    const reopened = cacheWith(factory);
    expect((await reopened.load('bad', IDS)).placed).toBe(0);
    expect((await reopened.load('other', IDS)).placed).toBe(20);
  });

  it('saves nothing once closed', async () => {
    const cache = cacheWith();
    cache.close();
    expect(await cache.save({ signature: 's', ids: IDS, xy: XY })).toBe(false);
    expect((await cache.load('s', IDS)).placed).toBe(0);
  });
});

describe('signatures', () => {
  it('are stable whatever order the filters come in', () => {
    const a = layoutSignature('global', {
      tags: false,
      families: ['time', 'genres'],
      orphans: true,
    });
    const b = layoutSignature('global', {
      orphans: true,
      families: ['genres', 'time'],
      tags: false,
    });
    expect(a).toBe(b);
    expect(a).toBe('global|families=genres,time|orphans=true|tags=false');
    expect(layoutSignature('global', { tags: true })).not.toBe(
      layoutSignature('global', { tags: false }),
    );
  });
});
