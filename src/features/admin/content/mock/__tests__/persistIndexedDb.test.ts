/**
 * The mock's changes in IndexedDB (fake-indexeddb): the one-time move out of
 * localStorage, the write-behind saves and the flush when the tab is hidden
 * or left, the fallbacks, and the database that opens late. The codec and
 * the localStorage path are in persist.test.ts, with the Stage-1 budget.
 */
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createContentMockServer,
  type ContentMockServer,
  type MockSeed,
  type MockViewer,
} from '../contentMockServer';
import { getMockStorageStatus } from '../mockStorageStatus';
import {
  createMockPersistence,
  MOCK_DATABASE_NAME,
  MOCK_STORAGE_KEY,
  openMockDatabase,
  type MockDatabase,
  type MockPageEvents,
} from '../persist';
import { MemoryStorage } from './memoryStorage';

const ADMIN: MockViewer = { role: 'admin', userId: 'admin-1', name: 'Ada' };

const SEED: MockSeed = {
  items: [
    {
      kind: 'studio',
      slug: 'x-studio',
      body: { slug: 'x-studio', name: 'X', aliases: ['one'] },
    },
    { kind: 'studio', slug: 'y-studio', body: { slug: 'y-studio', name: 'Y' } },
  ],
};

const makeServer = () => createContentMockServer({ seed: SEED, mode: 'all' });

const rename = (server: ContentMockServer, name: string) => {
  const response = server.handle({
    method: 'PUT',
    path: '/items',
    body: {
      kind: 'studio',
      slug: 'x-studio',
      body: { slug: 'x-studio', name, aliases: ['one'] },
    },
    viewer: ADMIN,
  });
  if (response.status !== 200)
    throw new Error(`${response.status}: ${JSON.stringify(response.body)}`);
};

const nameOf = (server: ContentMockServer) => {
  const found = server.handle({
    method: 'GET',
    path: '/items/lookup',
    query: { kind: 'studio', slug: 'x-studio' },
    viewer: ADMIN,
  }).body as { id: string };
  const detail = server.handle({
    method: 'GET',
    path: `/items/${found.id}`,
    viewer: ADMIN,
  }).body as { body: { name: string } };
  return detail.body.name;
};

/** What the database holds, read through a connection of its own. */
const storedText = async (factory: IDBFactory) => {
  const database = await openMockDatabase({
    indexedDB: factory,
    storage: null,
  });
  if (!database) throw new Error('The database did not open.');
  const text = database.text();
  database.close();
  return text;
};

const open = async (factory: IDBFactory, storage: Storage | null = null) => {
  const database = await openMockDatabase({ indexedDB: factory, storage });
  if (!database) throw new Error('The database did not open.');
  return database;
};

/** A saved state, as the localStorage version of the mock left it. */
const legacySave = (name: string) => {
  const storage = new MemoryStorage();
  const server = makeServer();
  rename(server, name);
  createMockPersistence({ server, storage, database: null }).flush();
  return storage;
};

/** Count the records IndexedDB is asked to store. */
const countPuts = () => vi.spyOn(IDBObjectStore.prototype, 'put');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('moving the localStorage save into IndexedDB', () => {
  it('moves it once, removes the old key, and restores it', async () => {
    const factory = new IDBFactory();
    const storage = legacySave('Moved');
    const legacy = storage.getItem(MOCK_STORAGE_KEY);
    expect(legacy).toContain('Moved');

    const database = await open(factory, storage);
    expect(database.text()).toBe(legacy);
    expect(storage.getItem(MOCK_STORAGE_KEY)).toBeNull();

    const server = makeServer();
    createMockPersistence({ server, storage, database }).load();
    expect(getMockStorageStatus()).toEqual({ state: 'ok' });
    expect(nameOf(server)).toBe('Moved');

    // A second open reads the database; there is nothing left to move.
    expect(await storedText(factory)).toBe(legacy);
    expect(storage.writes).toBe(1);
  });

  it('removes the key an interrupted move left, even once the database has moved on', async () => {
    const factory = new IDBFactory();
    const storage = legacySave('Moved');
    const legacy = storage.getItem(MOCK_STORAGE_KEY)!;
    const first = await open(factory, storage);
    // Saved since in the database; the key comes back as if its removal
    // had never happened.
    const since = legacySave('Saved since').getItem(MOCK_STORAGE_KEY)!;
    await first.write(since);
    first.close();
    storage.setItem(MOCK_STORAGE_KEY, legacy);

    const database = await open(factory, storage);
    expect(database.text()).toContain('Saved since');
    expect(storage.getItem(MOCK_STORAGE_KEY)).toBeNull();
    database.close();

    // A key that is the database's own record is a copy too.
    const same = new MemoryStorage();
    same.setItem(MOCK_STORAGE_KEY, since);
    const again = await open(factory, same);
    expect(same.getItem(MOCK_STORAGE_KEY)).toBeNull();
    again.close();
  });

  it('never deletes a localStorage save it did not move in', async () => {
    const factory = new IDBFactory();
    const first = await open(factory);
    await first.write(legacySave('In the database').getItem(MOCK_STORAGE_KEY)!);
    first.close();

    // Written while IndexedDB was refused (the fallback), or by an older
    // build: newer or not, it is not the database's to throw away.
    const storage = legacySave('Written elsewhere');
    const database = await open(factory, storage);
    expect(database.text()).toContain('In the database');
    expect(storage.getItem(MOCK_STORAGE_KEY)).toContain('Written elsewhere');
    database.close();

    // Reset clears both.
    const server = makeServer();
    const reopened = await open(factory, storage);
    const persistence = createMockPersistence({
      server,
      storage,
      database: reopened,
    });
    persistence.reset();
    await persistence.settled();
    expect(storage.getItem(MOCK_STORAGE_KEY)).toBeNull();
    expect(await storedText(factory)).toBeNull();
  });

  it('leaves the save in localStorage when the move fails', async () => {
    const factory = new IDBFactory();
    const storage = legacySave('Stays put');
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    expect(await openMockDatabase({ indexedDB: factory, storage })).toBeNull();
    expect(storage.getItem(MOCK_STORAGE_KEY)).toContain('Stays put');

    // So the mock carries on in localStorage, with nothing lost.
    const server = makeServer();
    createMockPersistence({ server, storage, database: null }).load();
    expect(nameOf(server)).toBe('Stays put');
  });
});

describe('saving to IndexedDB', () => {
  it('writes behind: flush returns at once and the record lands after', async () => {
    const factory = new IDBFactory();
    const database = await open(factory);
    const server = makeServer();
    const persistence = createMockPersistence({
      server,
      storage: null,
      database,
    });
    persistence.load();

    rename(server, 'Written behind');
    let landed = false;
    const size = persistence.flush();
    void persistence.settled().then(() => {
      landed = true;
    });
    expect(size).toBeGreaterThan(0);
    expect(landed).toBe(false);
    await persistence.settled();
    expect(landed).toBe(true);
    const stored = await storedText(factory);
    expect(stored).toHaveLength(size!);
    expect(stored).toContain('Written behind');
    expect(getMockStorageStatus()).toEqual({ state: 'ok' });

    // And a fresh server on a fresh connection reads it back.
    const again = makeServer();
    createMockPersistence({
      server: again,
      storage: null,
      database: await open(factory),
    }).load();
    expect(nameOf(again)).toBe('Written behind');
  });

  it('saves a burst of changes once, and an unchanged state not at all', async () => {
    const database = await open(new IDBFactory());
    const puts = countPuts();
    const server = makeServer();
    const persistence = createMockPersistence({
      server,
      storage: null,
      database,
      debounceMs: 5,
    });
    persistence.load();
    server.subscribe(() => persistence.schedule());
    for (const name of ['One', 'Two', 'Three']) rename(server, name);
    expect(puts).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(puts).toHaveBeenCalledTimes(1));
    await persistence.settled();
    expect(database.text()).toContain('Three');

    // The page's own pagehide handler flushes after this module's: with the
    // server unchanged, neither encodes nor writes again.
    const snapshots = vi.spyOn(server, 'snapshot');
    expect(persistence.flush()).toBeGreaterThan(0);
    expect(persistence.flush()).toBeGreaterThan(0);
    await persistence.settled();
    expect(snapshots).not.toHaveBeenCalled();
    expect(puts).toHaveBeenCalledTimes(1);
  });

  it('flushes a pending save when the tab is hidden or left', async () => {
    const factory = new IDBFactory();
    const database = await open(factory);
    const page = new EventTarget();
    const doc = Object.assign(new EventTarget(), {
      visibilityState: 'visible',
    });
    const pageEvents: MockPageEvents = { window: page, document: doc };
    const server = makeServer();
    const persistence = createMockPersistence({
      server,
      storage: null,
      database,
      // Longer than any test: only the page events can save.
      debounceMs: 60_000,
      pageEvents,
    });
    persistence.load();
    server.subscribe(() => persistence.schedule());

    rename(server, 'Before hiding');
    doc.dispatchEvent(new Event('visibilitychange'));
    await persistence.settled();
    expect(await storedText(factory)).toBeNull();

    doc.visibilityState = 'hidden';
    doc.dispatchEvent(new Event('visibilitychange'));
    await persistence.settled();
    expect(await storedText(factory)).toContain('Before hiding');

    rename(server, 'Before leaving');
    page.dispatchEvent(new Event('pagehide'));
    await persistence.settled();
    expect(await storedText(factory)).toContain('Before leaving');

    // Disposed, it hears nothing more.
    persistence.dispose();
    rename(server, 'After dispose');
    page.dispatchEvent(new Event('pagehide'));
    await persistence.settled();
    expect(await storedText(factory)).toContain('Before leaving');
  });

  it('reports a full database and leaves the last good save alone', async () => {
    const factory = new IDBFactory();
    const database = await open(factory);
    const server = makeServer();
    const persistence = createMockPersistence({
      server,
      storage: null,
      database,
    });
    persistence.load();
    rename(server, 'Good');
    persistence.flush();
    await persistence.settled();

    const put = vi
      .spyOn(IDBObjectStore.prototype, 'put')
      .mockImplementation(() => {
        throw new DOMException('full', 'QuotaExceededError');
      });
    rename(server, 'Lost');
    // Write-behind: the failure arrives with the write, not the flush.
    expect(persistence.flush()).toBeGreaterThan(0);
    await persistence.settled();
    expect(getMockStorageStatus()).toMatchObject({ state: 'full' });
    expect(database.text()).toContain('Good');
    expect(await storedText(factory)).toContain('Good');

    // Room again: the next save goes through, even with nothing new.
    put.mockRestore();
    expect(persistence.flush()).toBeGreaterThan(0);
    await persistence.settled();
    expect(getMockStorageStatus()).toEqual({ state: 'ok' });
    expect(await storedText(factory)).toContain('Lost');
  });

  it('never overwrites a record it could not read, until Reset', async () => {
    const factory = new IDBFactory();
    const database = await open(factory);
    await database.write('{not json');
    for (const persistence of [
      // Text that does not decode…
      createMockPersistence({
        server: makeServer(),
        storage: null,
        database: await open(factory),
      }),
      // …and a record that is not text at all.
      await (async () => {
        await rawPut(factory, { not: 'text' });
        return createMockPersistence({
          server: makeServer(),
          storage: null,
          database: await open(factory),
        });
      })(),
    ]) {
      persistence.load();
      expect(getMockStorageStatus()).toMatchObject({ state: 'unreadable' });
      expect(persistence.flush()).toBeNull();
      await persistence.settled();
    }
    const unreadable = await open(factory);
    expect(unreadable.readError()).toMatch(/not text/);

    // Reset clears it, and the console's next persistence (the same
    // database, as the page keeps it) starts clean.
    const server = makeServer();
    const persistence = createMockPersistence({
      server,
      storage: null,
      database: unreadable,
    });
    persistence.load();
    persistence.dispose();
    persistence.reset();
    const next = createMockPersistence({
      server: makeServer(),
      storage: null,
      database: unreadable,
    });
    next.load();
    expect(getMockStorageStatus()).toEqual({ state: 'ok' });
    await next.settled();
    expect(await storedText(factory)).toBeNull();
  });

  it('forgets everything on reset', async () => {
    const factory = new IDBFactory();
    const storage = new MemoryStorage();
    const database = await open(factory, storage);
    const server = makeServer();
    const persistence = createMockPersistence({ server, storage, database });
    persistence.load();
    rename(server, 'Forgotten');
    persistence.flush();
    await persistence.settled();
    storage.data.set(MOCK_STORAGE_KEY, 'left over');

    persistence.dispose();
    persistence.reset();
    await persistence.settled();
    expect(await storedText(factory)).toBeNull();
    expect(storage.getItem(MOCK_STORAGE_KEY)).toBeNull();

    const fresh = makeServer();
    createMockPersistence({ server: fresh, storage, database }).load();
    expect(nameOf(fresh)).toBe('X');
  });
});

describe('without IndexedDB', () => {
  const refusing = (how: 'throw' | 'error'): IDBFactory =>
    ({
      open: () => {
        if (how === 'throw') throw new DOMException('no', 'SecurityError');
        const request = {
          error: new DOMException('no', 'UnknownError'),
        } as { error: DOMException; onerror?: () => void };
        setTimeout(() => request.onerror?.());
        return request;
      },
    }) as unknown as IDBFactory;

  it('falls back to localStorage, then to memory', async () => {
    for (const factory of [null, refusing('throw'), refusing('error')]) {
      const storage = legacySave('In localStorage');
      const database = await openMockDatabase({ indexedDB: factory, storage });
      expect(database).toBeNull();
      // Nothing was moved or removed.
      expect(storage.getItem(MOCK_STORAGE_KEY)).toContain('In localStorage');

      const server = makeServer();
      const persistence = createMockPersistence({ server, storage, database });
      persistence.load();
      expect(nameOf(server)).toBe('In localStorage');
      rename(server, 'Still localStorage');
      expect(persistence.flush()).toBeGreaterThan(0);
      expect(storage.getItem(MOCK_STORAGE_KEY)).toContain('Still localStorage');
    }

    const memory = createMockPersistence({
      server: makeServer(),
      storage: null,
      database: null,
    });
    memory.load();
    expect(getMockStorageStatus()).toMatchObject({ state: 'unavailable' });
    expect(memory.flush()).toBeNull();
    memory.reset();
  });
});

describe('a database that opens after the mock has started', () => {
  const later = () => {
    let release!: (database: MockDatabase | null) => void;
    const opening = new Promise<MockDatabase | null>((resolve) => {
      release = resolve;
    });
    return { opening, release };
  };

  it('is taken up when it opens empty, with what changed meanwhile', async () => {
    const factory = new IDBFactory();
    const { opening, release } = later();
    const server = makeServer();
    const persistence = createMockPersistence({
      server,
      storage: null,
      database: opening,
      debounceMs: 1,
    });
    persistence.load();
    expect(getMockStorageStatus()).toMatchObject({
      state: 'unavailable',
      detail: expect.stringContaining('still opening'),
    });
    rename(server, 'Made while opening');
    expect(persistence.flush()).toBeNull();

    release(await open(factory));
    await opening;
    expect(getMockStorageStatus()).toEqual({ state: 'ok' });
    await vi.waitFor(async () =>
      expect(await storedText(factory)).toContain('Made while opening'),
    );
  });

  it('is left alone, and the banner kept, when it holds a save', async () => {
    const factory = new IDBFactory();
    const saved = legacySave('Saved earlier').getItem(MOCK_STORAGE_KEY)!;
    await (await open(factory)).write(saved);

    const { opening, release } = later();
    const server = makeServer();
    const persistence = createMockPersistence({
      server,
      storage: null,
      database: opening,
    });
    persistence.load();
    rename(server, 'Made while opening');
    release(await open(factory));
    await opening;

    expect(getMockStorageStatus()).toMatchObject({
      state: 'unavailable',
      detail: expect.stringContaining('Reload'),
    });
    expect(persistence.flush()).toBeNull();
    expect(await storedText(factory)).toBe(saved);

    // Reset is the other way out.
    persistence.reset();
    expect(persistence.flush()).toBeGreaterThan(0);
    await persistence.settled();
    expect(await storedText(factory)).toContain('Made while opening');
  });

  it('is cleared once open when the console reset meanwhile', async () => {
    const factory = new IDBFactory();
    await (
      await open(factory)
    ).write(legacySave('Saved earlier').getItem(MOCK_STORAGE_KEY)!);

    const { opening, release } = later();
    const first = createMockPersistence({
      server: makeServer(),
      storage: null,
      database: opening,
    });
    first.load();
    // What the console's Reset does: dispose, reset, start again.
    first.dispose();
    first.reset();
    const server = makeServer();
    const next = createMockPersistence({
      server,
      storage: null,
      database: opening,
    });
    next.load();

    release(await open(factory));
    await opening;
    expect(getMockStorageStatus()).toEqual({ state: 'ok' });
    rename(server, 'After the reset');
    expect(next.flush()).toBeGreaterThan(0);
    await next.settled();
    expect(await storedText(factory)).toContain('After the reset');
  });
});

describe('the page database, opened as persist.ts loads', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('is open, with an older save moved in, before the first load', async () => {
    const storage = legacySave('Restored at start');
    const factory = new IDBFactory();
    vi.stubGlobal('indexedDB', factory);
    vi.stubGlobal('localStorage', storage);
    vi.resetModules();
    const persist = await import('../persist');
    const status = await import('../mockStorageStatus');

    // As handleMockRequest.ts makes it: no database named.
    const server = makeServer();
    const persistence = persist.createMockPersistence({ server, storage });
    persistence.load();
    expect(status.getMockStorageStatus()).toEqual({ state: 'ok' });
    expect(nameOf(server)).toBe('Restored at start');
    expect(storage.getItem(MOCK_STORAGE_KEY)).toBeNull();

    rename(server, 'Saved in IndexedDB');
    persistence.flush();
    await persistence.settled();
    expect(await storedText(factory)).toContain('Saved in IndexedDB');
    expect(storage.writes).toBe(1);
  });
});

/** Store a raw value where the mock keeps its record. */
async function rawPut(factory: IDBFactory, value: unknown) {
  // The store and key persist.ts uses; see STATE_STORE and STATE_KEY there.
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open(MOCK_DATABASE_NAME, 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('state', 'readwrite');
    transaction.objectStore('state').put(value, 'mock');
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error);
  });
  db.close();
}
