import {
  IDBFactory,
  IDBKeyRange,
  IDBObjectStore,
  IDBTransaction,
} from 'fake-indexeddb';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  conflictReason,
  createDraftStore,
  getDraftStore,
  resetDraftStoreForTests,
  WRITER_DOC,
  type DraftStore,
} from '../draftStore';
import { hashFingerprint } from '../fingerprintHash';
import { openDraftDatabase } from '../idb';
import {
  DRAFT_DB_NAME,
  DRAFT_STORES,
  DraftStorageError,
  type DraftMediaRecord,
  type DraftMeta,
} from '../types';
import {
  createWrite,
  DAY,
  manualClock,
  MemoryStorage,
  updateWrite,
} from './draftTestUtils';

// ── The draft store (milestone 1.4, E1/E3) ─────────────────────────────────
// Run: npx vitest run src/lib/studio-projects/drafts/__tests__/draftStore.test.ts
//
// The shared suite runs against both adapters (IndexedDB over fake-indexeddb,
// a fresh IDBFactory per test; localStorage over an in-memory Storage). The
// IndexedDB-only cases (schema upgrades, versionchange, aborts, media,
// choosing the adapter) follow.

// Node has no IndexedDB globals; the store builds key ranges from the
// page's IDBKeyRange, so give it fake-indexeddb's (the factory's realm).
beforeAll(() => {
  (globalThis as { IDBKeyRange?: unknown }).IDBKeyRange = IDBKeyRange;
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function rejection(
  promise: Promise<unknown>,
): Promise<DraftStorageError> {
  try {
    await promise;
  } catch (caught) {
    expect(caught).toBeInstanceOf(DraftStorageError);
    return caught as DraftStorageError;
  }
  throw new Error('expected a rejection');
}

interface Harness {
  store: DraftStore;
  clock: ReturnType<typeof manualClock>;
  storage: MemoryStorage;
  factory: IDBFactory | null;
}

const ADAPTERS: [string, () => Harness][] = [
  [
    'indexeddb',
    () => {
      const clock = manualClock();
      const storage = new MemoryStorage();
      const factory = new IDBFactory();
      const store = createDraftStore({
        indexedDB: factory,
        storage,
        now: clock,
        build: 'b-test',
        writerDoc: 'doc-test',
      });
      return { store, clock, storage, factory };
    },
  ],
  [
    'localstorage',
    () => {
      const clock = manualClock();
      const storage = new MemoryStorage();
      const store = createDraftStore({
        indexedDB: null,
        storage,
        now: clock,
        build: 'b-test',
        writerDoc: 'doc-test',
      });
      return { store, clock, storage, factory: null };
    },
  ],
];

describe.each(ADAPTERS)('DraftStore (%s)', (kind, make) => {
  it('creates, reads and stamps a draft', async () => {
    const { store, clock } = make();
    const meta = await store.write(
      createWrite('d1', 'u1', 'work', { chars: 1 }, '{"x":1}'),
    );
    expect(store.kind).toBe(kind);
    expect(meta).toMatchObject({
      v: 1,
      draftId: 'd1',
      userKey: 'u1',
      writeSeq: 1,
      updatedAt: clock(),
      writer: { build: 'b-test', doc: 'doc-test' },
      contentHash: hashFingerprint('{"x":1}'),
      chars: 7,
    });
    expect(await store.getMeta('d1')).toEqual(meta);
    expect(await store.readBody('d1')).toEqual({
      draftId: 'd1',
      writeSeq: 1,
      text: '{"x":1}',
    });
    expect(await store.getMeta('nope')).toBeNull();
    expect(await store.readBody('nope')).toBeNull();
  });

  it('compare-and-sets: conflict on a stale or duplicate create, not-found on a missing update', async () => {
    const { store } = make();
    const first = await store.write(createWrite('d1', 'u1'));
    expect((await rejection(store.write(createWrite('d1', 'u1')))).kind).toBe(
      'conflict',
    );
    const second = await store.write(updateWrite(first, 'two'));
    expect(second.writeSeq).toBe(2);
    // A writer still at seq 1 is refused, and the stored record is intact.
    const stale = await rejection(store.write(updateWrite(first, 'stale')));
    expect(stale.kind).toBe('conflict');
    expect((await store.readBody('d1'))?.text).toBe('two');
    expect((await store.getMeta('d1'))?.writeSeq).toBe(2);
    const missing = await rejection(
      store.write({
        ...updateWrite(first, 'x'),
        meta: { ...first, draftId: 'gone' },
      }),
    );
    expect(missing.kind).toBe('not-found');
    // Another user's write over this draft is a conflict, not a takeover.
    const other = await rejection(
      store.write(updateWrite(second, 'theirs', { userKey: 'u2' })),
    );
    expect(other.kind).toBe('conflict');
  });

  it("tells a seq conflict from an owner change (a claimed '~device' draft)", async () => {
    const { store } = make();
    const first = await store.write(createWrite('d1', '~device'));
    const dup = await rejection(store.write(createWrite('d1', '~device')));
    expect(conflictReason(dup)).toBe('exists');
    const second = await store.write(updateWrite(first, 'two'));
    const seq = await rejection(store.write(updateWrite(first, 'stale')));
    expect(conflictReason(seq)).toBe('seq');
    expect(seq.cause).toMatchObject({
      reason: 'seq',
      writeSeq: 2,
      writer: { doc: 'doc-test' },
    });
    // Claimed by u1 while this writer still writes as '~device'.
    await store.patchMeta('d1', { userKey: 'u1', claimedFrom: '~device' });
    const owner = await rejection(store.write(updateWrite(second, 'three')));
    expect(conflictReason(owner)).toBe('owner');
    expect(owner.cause).toMatchObject({ reason: 'owner', userKey: 'u1' });
    // Adopting the stored key and writing again lands.
    const adopted = await store.write(
      updateWrite(second, 'three', { userKey: 'u1' }),
    );
    expect(adopted).toMatchObject({ userKey: 'u1', writeSeq: 3 });
    expect(conflictReason(new Error('x'))).toBeNull();
  });

  it("sets createdAt itself (never the caller's) and follows the injected clock", async () => {
    const { store, clock } = make();
    const created = await store.write(
      createWrite('d1', 'u1', 'work', { createdAt: 500 }),
    );
    expect(created.createdAt).toBe(clock());
    const createdAt = clock();
    clock.advance(1234);
    const updated = await store.write(
      updateWrite(created, 'b', { createdAt: 99_999 }),
    );
    expect(updated.createdAt).toBe(createdAt);
    expect(updated.updatedAt).toBe(created.updatedAt + 1234);
  });

  it("honours an import's own time only on create of migrated, kept or recovered", async () => {
    const { store, clock } = make();
    const migrated = await store.write({
      ...createWrite('m', 'u1', 'work', { origin: 'migrated' }),
      updatedAt: 42,
    });
    expect(migrated.updatedAt).toBe(42);
    const session = await store.write({
      ...createWrite('s', 'u1', 'work', { origin: 'session' }),
      updatedAt: 42,
    });
    expect(session.updatedAt).toBe(clock());
    const updated = await store.write({
      ...updateWrite(migrated, 'x'),
      updatedAt: 7,
    });
    expect(updated.updatedAt).toBe(clock());
  });

  it('lists newest first, one user at a time', async () => {
    const { store, clock } = make();
    await store.write(createWrite('a', 'u1'));
    clock.advance(10);
    await store.write(createWrite('b', 'u1'));
    clock.advance(10);
    await store.write(createWrite('c', 'u2'));
    clock.advance(10);
    const a = (await store.getMeta('a')) as DraftMeta;
    await store.write(updateWrite(a, 'newer'));
    expect((await store.list('u1')).map((m) => m.draftId)).toEqual(['a', 'b']);
    expect((await store.list('u2')).map((m) => m.draftId)).toEqual(['c']);
    expect(await store.list('u3')).toEqual([]);
    expect(await store.knownUserKeys()).toEqual(new Set(['u1', 'u2']));
  });

  it('leaves null projectId and roomId out of the record', async () => {
    const { store } = make();
    const meta = await store.write(
      createWrite('d1', 'u1', 'work', {
        projectId: null as unknown as string,
        roomId: null as unknown as string,
        cloud: null as unknown as undefined,
      }),
    );
    expect('projectId' in meta).toBe(false);
    expect('roomId' in meta).toBe(false);
    expect('cloud' in meta).toBe(false);
    const stored = (await store.getMeta('d1')) as DraftMeta;
    expect('projectId' in stored).toBe(false);
  });

  it('patches meta without moving writeSeq, so the next CAS still matches', async () => {
    const { store, clock } = make();
    const created = await store.write(createWrite('d1', 'u1'));
    clock.advance(100);
    const cloud = {
      projectId: 'p1',
      updatedAt: '2026-10-01T00:00:00.000Z',
      savedFingerprint: 'h1:x',
      savedComplete: true,
      savedAt: 5,
    };
    const patched = await store.patchMeta('d1', { cloud, projectId: 'p1' });
    expect(patched).toMatchObject({ cloud, projectId: 'p1', writeSeq: 1 });
    expect(patched?.updatedAt).toBe(created.updatedAt);
    expect(patched?.contentHash).toBe(created.contentHash);
    expect(patched?.writer).toEqual(created.writer);
    // The writer's next write, at its old expectedSeq, lands.
    const next = await store.write(updateWrite(created, 'after the save'));
    expect(next.writeSeq).toBe(2);
    // null clears; origin, keptAt and name move updatedAt.
    clock.advance(100);
    const cleared = await store.patchMeta('d1', {
      cloud: null,
      projectId: null,
    });
    expect(cleared && 'cloud' in cleared).toBe(false);
    expect(cleared && 'projectId' in cleared).toBe(false);
    expect(cleared?.updatedAt).toBe(next.updatedAt);
    clock.advance(100);
    const kept = await store.patchMeta('d1', {
      origin: 'kept',
      keptAt: clock(),
    });
    expect(kept).toMatchObject({
      origin: 'kept',
      keptAt: clock(),
      updatedAt: clock(),
    });
    const unkept = await store.patchMeta('d1', {
      origin: 'session',
      keptAt: null,
    });
    expect(unkept && 'keptAt' in unkept).toBe(false);
    expect(await store.patchMeta('missing', { name: 'x' })).toBeNull();
    // The body is untouched by patches.
    expect((await store.readBody('d1'))?.text).toBe('after the save');
  });

  it('re-homes a draft through patchMeta({userKey})', async () => {
    const { store } = make();
    await store.write(createWrite('d1', '~device'));
    const claimed = await store.patchMeta('d1', {
      userKey: 'u1',
      claimedFrom: '~device',
    });
    expect(claimed).toMatchObject({ userKey: 'u1', claimedFrom: '~device' });
    expect((await store.list('u1')).map((m) => m.draftId)).toEqual(['d1']);
    expect(await store.list('~device')).toEqual([]);
    expect((await store.readBody('d1'))?.text).toContain('d1');
  });

  it('removes a draft and its body', async () => {
    const { store } = make();
    await store.write(createWrite('d1', 'u1'));
    await store.remove('d1');
    expect(await store.getMeta('d1')).toBeNull();
    expect(await store.readBody('d1')).toBeNull();
    expect(await store.list('u1')).toEqual([]);
    await store.remove('d1');
  });

  it('dedupes the quarantine by (userKey, hash) and lists it per user', async () => {
    const { store } = make();
    const record = {
      userKey: 'u1',
      source: 'legacy-autosave' as const,
      reason: 'future schema',
      build: 'b',
      hash: 'h1:aaaa',
      raw: '{"schema":9}',
      at: 10,
    };
    expect(await store.quarantine(record)).toBe('stored');
    expect(await store.quarantine({ ...record, at: 11 })).toBe('duplicate');
    expect(
      await store.quarantine({ ...record, userKey: 'u2', raw: 'other' }),
    ).toBe('stored');
    // The same raw text for another user is theirs to see.
    expect(await store.quarantine({ ...record, userKey: 'u3' })).toBe('stored');
    const mine = await store.listQuarantine('u1');
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({
      userKey: 'u1',
      source: 'legacy-autosave',
      hash: 'h1:aaaa',
      raw: '{"schema":9}',
      reason: 'future schema',
    });
    expect(await store.listQuarantine('u4')).toEqual([]);
  });

  it('stores a hash collision instead of dropping it', async () => {
    const { store } = make();
    const record = {
      userKey: 'u1',
      source: 'mirror' as const,
      reason: 'unparseable',
      build: 'b',
      hash: 'weak',
      raw: 'first',
      at: 10,
    };
    expect(await store.quarantine(record)).toBe('stored');
    expect(await store.quarantine({ ...record, raw: 'second', at: 11 })).toBe(
      'stored',
    );
    expect(await store.quarantine({ ...record, raw: 'second', at: 12 })).toBe(
      'duplicate',
    );
    expect((await store.listQuarantine('u1')).map((r) => r.raw).sort()).toEqual(
      ['first', 'second'],
    );
  });

  it('keeps meta values', async () => {
    const { store } = make();
    expect(await store.getMetaValue('user:u1')).toBeNull();
    await store.setMetaValue('user:u1', { lastSeenAt: 5 });
    expect(await store.getMetaValue('user:u1')).toEqual({ lastSeenAt: 5 });
  });

  it('measures usage', async () => {
    const { store } = make();
    await store.write(createWrite('a', 'u1', 'work', {}, 'x'.repeat(10)));
    await store.write(createWrite('b', 'u1', 'work', {}, 'y'.repeat(5)));
    await store.write(createWrite('c', 'u2', 'work', {}, 'z'));
    expect(await store.usage('u1')).toEqual({
      drafts: 2,
      chars: 15,
      mediaBytes: 0,
    });
  });

  it('prunes caches at boot but never work, the protected set or read-only drafts', async () => {
    const { store, clock } = make();
    await store.write(createWrite('old-pristine', 'u1', 'pristine'));
    clock.advance(1);
    await store.write(createWrite('cloud', 'u1', 'cloud-equal'));
    clock.advance(1);
    await store.write(createWrite('work', 'u1', 'work'));
    clock.advance(1);
    await store.write(createWrite('future', 'u1', 'empty', { schema: 99 }));
    clock.advance(1);
    // Five drafts: the localStorage adapter's per-user cap.
    await store.write(createWrite('protected', 'u1', 'empty'));
    const report = await store.prune({
      userKey: 'u1',
      protect: new Set(['protected']),
      reason: 'boot',
      schemaVersion: 3,
      now: clock(),
    });
    expect(report.deletedDrafts.sort()).toEqual(['cloud', 'old-pristine']);
    expect(report.freedChars).toBeGreaterThan(0);
    expect((await store.list('u1')).map((m) => m.draftId).sort()).toEqual([
      'future',
      'protected',
      'work',
    ]);
  });
});

// ── IndexedDB only ─────────────────────────────────────────────────────────

const requestDone = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

function rawOpen(
  factory: IDBFactory,
  version?: number,
  upgrade?: (db: IDBDatabase, tx: IDBTransaction) => void,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request =
      version === undefined
        ? factory.open(DRAFT_DB_NAME)
        : factory.open(DRAFT_DB_NAME, version);
    request.onupgradeneeded = () =>
      upgrade?.(request.result, request.transaction as IDBTransaction);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbStore(factory: IDBFactory, clock = manualClock()) {
  return createDraftStore({
    indexedDB: factory,
    storage: new MemoryStorage(),
    now: clock,
    build: 'b-test',
    writerDoc: 'doc-test',
  });
}

function mediaRecord(
  userKey: string,
  mediaId: string,
  createdAt: number,
  size = 4,
): DraftMediaRecord {
  return {
    key: `${userKey}:${mediaId}`,
    mediaId,
    userKey,
    blob: new Blob([new Uint8Array(size)], { type: 'audio/wav' }),
    contentType: 'audio/wav',
    size,
    createdAt,
  };
}

describe('DraftStore over IndexedDB', () => {
  it('creates ma-studio with the five stores and their indexes', async () => {
    const factory = new IDBFactory();
    const store = idbStore(factory);
    await store.write(createWrite('d1', 'u1'));
    const dbs = await factory.databases();
    expect(dbs.map((d) => d.name)).toEqual([DRAFT_DB_NAME]);
    const db = await rawOpen(factory);
    expect([...db.objectStoreNames].sort()).toEqual([...DRAFT_STORES].sort());
    const tx = db.transaction([...DRAFT_STORES], 'readonly');
    expect([...tx.objectStore('drafts').indexNames].sort()).toEqual([
      'byUser',
      'byUserProject',
    ]);
    expect([...tx.objectStore('media').indexNames]).toEqual(['byUser']);
    expect([...tx.objectStore('quarantine').indexNames]).toEqual([
      'byUserHash',
    ]);
    expect(tx.objectStore('quarantine').autoIncrement).toBe(true);
    db.close();
  });

  it('leaves drafts without a projectId out of the byUserProject index', async () => {
    const factory = new IDBFactory();
    const store = idbStore(factory);
    await store.write(createWrite('with', 'u1', 'work', { projectId: 'p1' }));
    await store.write(
      createWrite('without', 'u1', 'work', {
        projectId: null as unknown as string,
      }),
    );
    const db = await rawOpen(factory);
    const index = db
      .transaction('drafts', 'readonly')
      .objectStore('drafts')
      .index('byUserProject');
    expect(await requestDone(index.count())).toBe(1);
    expect(
      await requestDone(index.getAllKeys(IDBKeyRange.only(['u1', 'p1']))),
    ).toEqual(['with']);
    db.close();
  });

  it("opens a later build's database (version 3, an extra store) and keeps it", async () => {
    const factory = new IDBFactory();
    const later = await rawOpen(factory, 3, (db) => {
      for (const name of DRAFT_STORES) {
        const s = db.createObjectStore(
          name,
          name === 'quarantine'
            ? { keyPath: 'id', autoIncrement: true }
            : {
                keyPath:
                  name === 'media' || name === 'meta' ? 'key' : 'draftId',
              },
        );
        if (name === 'drafts') {
          s.createIndex('byUser', ['userKey', 'updatedAt']);
          s.createIndex('byUserProject', ['userKey', 'projectId']);
        }
        if (name === 'media') s.createIndex('byUser', 'userKey');
        if (name === 'quarantine')
          s.createIndex('byUserHash', ['userKey', 'hash']);
      }
      db.createObjectStore('takes', { keyPath: 'id' });
    });
    later.close();
    const store = idbStore(factory);
    await store.write(createWrite('d1', 'u1'));
    expect(store.kind).toBe('indexeddb');
    const db = await rawOpen(factory);
    expect(db.version).toBe(3);
    expect(db.objectStoreNames.contains('takes')).toBe(true);
    db.close();
  });

  it("adds a missing store through a +1 upgrade and keeps what's there", async () => {
    const factory = new IDBFactory();
    const old = await rawOpen(factory, 1, (db) => {
      const drafts = db.createObjectStore('drafts', { keyPath: 'draftId' });
      drafts.createIndex('byUser', ['userKey', 'updatedAt']);
      drafts.createIndex('byUserProject', ['userKey', 'projectId']);
      db.createObjectStore('bodies', { keyPath: 'draftId' });
      db.createObjectStore('quarantine', {
        keyPath: 'id',
        autoIncrement: true,
      }).createIndex('byUserHash', ['userKey', 'hash']);
      db.createObjectStore('meta', { keyPath: 'key' });
    });
    await requestDone(
      old
        .transaction('meta', 'readwrite')
        .objectStore('meta')
        .put({ key: 'k', value: 'kept' }),
    );
    old.close();
    const store = idbStore(factory);
    expect(await store.getMetaValue('k')).toBe('kept');
    await store.putMedia(mediaRecord('u1', 'm1', 0));
    const db = await rawOpen(factory);
    expect(db.version).toBe(2);
    expect([...db.objectStoreNames].sort()).toEqual([...DRAFT_STORES].sort());
    db.close();
  });

  it('closes on versionchange from another connection and reopens on the next call', async () => {
    const factory = new IDBFactory();
    const store = idbStore(factory);
    await store.write(createWrite('d1', 'u1'));
    const current = await rawOpen(factory);
    const version = current.version;
    current.close();
    // Another tab upgrades: ours must close, or this open would block.
    const other = await rawOpen(factory, version + 1, (db) => {
      db.createObjectStore('assets', { keyPath: 'id' });
    });
    other.close();
    expect((await store.list('u1')).map((m) => m.draftId)).toEqual(['d1']);
    const db = await rawOpen(factory);
    expect(db.objectStoreNames.contains('assets')).toBe(true);
    db.close();
  });

  it("rejects 'blocked' when an older connection won't let the upgrade through", async () => {
    const factory = new IDBFactory();
    const stubborn = await rawOpen(factory, 1, (db) => {
      db.createObjectStore('drafts', { keyPath: 'draftId' });
    });
    stubborn.onversionchange = null; // never closes
    const error = await rejection(
      openDraftDatabase(factory, { blockedMs: 30 }),
    );
    expect(error.kind).toBe('blocked');
    stubborn.close();
    const db = await openDraftDatabase(factory, { blockedMs: 30 });
    expect([...db.objectStoreNames].sort()).toEqual([...DRAFT_STORES].sort());
    db.close();
  });

  it("rejects 'quota' when the transaction aborts with QuotaExceededError, leaving the record", async () => {
    const factory = new IDBFactory();
    const store = idbStore(factory);
    const first = await store.write(
      createWrite('d1', 'u1', 'work', {}, 'first'),
    );
    const commit = vi
      .spyOn(IDBTransaction.prototype, 'commit')
      .mockImplementationOnce(function (this: IDBTransaction) {
        (this as unknown as { _abort(name: string): void })._abort(
          'QuotaExceededError',
        );
      });
    const error = await rejection(
      store.write(updateWrite(first, 'x'.repeat(512))),
    );
    expect(commit).toHaveBeenCalled();
    expect(error.kind).toBe('quota');
    expect((await store.readBody('d1'))?.text).toBe('first');
    expect((await store.getMeta('d1'))?.writeSeq).toBe(1);
  });

  it("rejects 'quota' when a put throws QuotaExceededError at once", async () => {
    const factory = new IDBFactory();
    const store = idbStore(factory);
    await store.write(createWrite('d0', 'u1'));
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementationOnce(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    const error = await rejection(store.write(createWrite('d1', 'u1')));
    expect(error.kind).toBe('quota');
    expect(await store.getMeta('d1')).toBeNull();
    expect(await store.readBody('d1')).toBeNull();
  });

  it('stores media idempotently and reads it back', async () => {
    const factory = new IDBFactory();
    const store = idbStore(factory);
    await store.putMedia(mediaRecord('u1', 'm1', 100, 8));
    await store.putMedia({ ...mediaRecord('u1', 'm1', 999, 8), key: 'wrong' });
    const got = await store.getMedia('u1', 'm1');
    // Stored once; a second put only restarts its grace (createdAt = now).
    expect(got).toMatchObject({ key: 'u1:m1', createdAt: 1_000_000, size: 8 });
    expect(got?.blob.size).toBe(8);
    expect(await store.getMedia('u2', 'm1')).toBeNull();
    expect(await store.hasMedia('u1', ['m1', 'm2'])).toEqual(new Set(['m1']));
    expect(await store.hasMedia('u2', ['m1'])).toEqual(new Set());
    expect((await store.usage('u1')).mediaBytes).toBe(8);
    const bad = await rejection(
      store.putMedia({ ...mediaRecord('u1', '', 0) }),
    );
    expect(bad.kind).toBe('corrupt');
  });

  it('collects unreferenced media after the grace, never referenced or protected media', async () => {
    const clock = manualClock(10 * DAY);
    const factory = new IDBFactory();
    const store = idbStore(factory, clock);
    const t = clock();
    await store.putMedia(mediaRecord('u1', 'referenced', t - DAY));
    await store.putMedia(mediaRecord('u1', 'orphan-old', t - DAY));
    await store.putMedia(mediaRecord('u1', 'orphan-new', t - 60_000));
    await store.putMedia(mediaRecord('u1', 'protected', t - DAY));
    await store.putMedia(mediaRecord('u2', 'theirs', t - DAY));
    await store.write(
      createWrite('d1', 'u1', 'work', {
        media: [
          {
            mediaId: 'referenced',
            contentType: 'audio/wav',
            size: 4,
            clipIds: ['c1'],
            samplerSampleIds: [],
          },
        ],
      }),
    );
    expect(await store.gcMedia('u1', { protect: new Set(['protected']) })).toBe(
      1,
    );
    expect(
      await store.hasMedia('u1', [
        'referenced',
        'orphan-old',
        'orphan-new',
        'protected',
      ]),
    ).toEqual(new Set(['referenced', 'orphan-new', 'protected']));
    expect(await store.gcMedia('u1', { graceMs: 0 })).toBe(2);
    expect(await store.hasMedia('u1', ['referenced'])).toEqual(
      new Set(['referenced']),
    );
    expect(await store.hasMedia('u2', ['theirs'])).toEqual(new Set(['theirs']));
  });

  it("carries a claimed draft's media to its new owner", async () => {
    const factory = new IDBFactory();
    const store = idbStore(factory);
    await store.putMedia(mediaRecord('~device', 'm1', 0));
    await store.write(
      createWrite('d1', '~device', 'work', {
        media: [
          {
            mediaId: 'm1',
            contentType: 'audio/wav',
            size: 4,
            clipIds: ['c'],
            samplerSampleIds: [],
          },
        ],
      }),
    );
    await store.patchMeta('d1', { userKey: 'u1', claimedFrom: '~device' });
    expect((await store.getMedia('u1', 'm1'))?.userKey).toBe('u1');
    // Nothing else of '~device' used it: the old copy went in the same patch.
    expect(await store.getMedia('~device', 'm1')).toBeNull();
    expect(await store.gcMedia('u1', { graceMs: 0 })).toBe(0);
  });

  it("keeps a claimed draft's '~device' media another '~device' draft still uses", async () => {
    const factory = new IDBFactory();
    const store = idbStore(factory);
    await store.putMedia(mediaRecord('~device', 'm1', 0));
    const ref = {
      mediaId: 'm1',
      contentType: 'audio/wav',
      size: 4,
      clipIds: ['c'],
      samplerSampleIds: [],
    };
    await store.write(createWrite('d1', '~device', 'work', { media: [ref] }));
    await store.write(createWrite('d2', '~device', 'work', { media: [ref] }));
    await store.patchMeta('d1', { userKey: 'u1', claimedFrom: '~device' });
    expect(await store.getMedia('u1', 'm1')).not.toBeNull();
    expect(await store.getMedia('~device', 'm1')).not.toBeNull();
  });

  it("restarts a stored item's grace when it is put again", async () => {
    const clock = manualClock(10 * DAY);
    const store = idbStore(new IDBFactory(), clock);
    await store.putMedia(mediaRecord('u1', 'm1', clock()));
    clock.advance(60 * 60 * 1000);
    await store.putMedia(mediaRecord('u1', 'm1', 0));
    expect(await store.gcMedia('u1', { graceMs: 10 * 60 * 1000 })).toBe(0);
    expect(await store.hasMedia('u1', ['m1'])).toEqual(new Set(['m1']));
  });

  it("collects nothing for a user with a later build's record (a revert)", async () => {
    const factory = new IDBFactory();
    const store = idbStore(factory, manualClock(10 * DAY));
    await store.putMedia(mediaRecord('u1', 'm-later', 0));
    await store.write(createWrite('d1', 'u1'));
    // A later build rewrote the record: v 2, media kept elsewhere.
    const db = await rawOpen(factory);
    const meta = (await requestDone(
      db.transaction('drafts', 'readonly').objectStore('drafts').get('d1'),
    )) as DraftMeta;
    const later = {
      ...meta,
      v: 2,
      media: undefined,
      assets: [{ id: 'm-later' }],
    };
    await requestDone(
      db.transaction('drafts', 'readwrite').objectStore('drafts').put(later),
    );
    db.close();
    expect(await store.gcMedia('u1', { graceMs: 0 })).toBe(0);
    expect(await store.hasMedia('u1', ['m-later'])).toEqual(
      new Set(['m-later']),
    );
    const report = await store.prune({
      userKey: 'u1',
      protect: new Set(),
      reason: 'quota',
      schemaVersion: 3,
      now: 400 * DAY,
    });
    expect(report.deletedDrafts).toEqual([]);
    expect(await store.getMeta('d1')).not.toBeNull();
  });

  it('a later connection failure rejects unavailable without switching adapter', async () => {
    const factory = new IDBFactory();
    const store = idbStore(factory);
    await store.write(createWrite('d1', 'u1'));
    const open = vi.spyOn(factory, 'open');
    // Lose the connection: the next call must reopen, and that fails once.
    const current = await rawOpen(factory);
    const v = current.version;
    current.close();
    const other = await rawOpen(factory, v + 1);
    other.close();
    open.mockImplementationOnce(() => {
      throw new DOMException('disk gone', 'UnknownError');
    });
    const error = await rejection(store.list('u1'));
    expect(error.kind).toBe('unavailable');
    expect(store.kind).toBe('indexeddb');
    expect((await store.list('u1')).map((m) => m.draftId)).toEqual(['d1']);
  });
});

describe('choosing the adapter', () => {
  const failingFactory = (name: string, failures: number) => {
    const real = new IDBFactory();
    let left = failures;
    const open = vi.fn((dbName: string, version?: number) => {
      if (left > 0) {
        left -= 1;
        throw new DOMException('nope', name);
      }
      return version === undefined
        ? real.open(dbName)
        : real.open(dbName, version);
    });
    return { factory: { ...real, open } as unknown as IDBFactory, open };
  };

  it('uses localStorage when there is no indexedDB at all', async () => {
    expect(typeof (globalThis as { indexedDB?: unknown }).indexedDB).toBe(
      'undefined',
    );
    const storage = new MemoryStorage();
    const store = createDraftStore({ storage });
    expect(store.kind).toBe('localstorage');
    expect(await store.ready?.()).toEqual({
      kind: 'localstorage',
      reason: 'no-indexeddb',
    });
    await store.write(createWrite('d1', 'u1'));
    expect(storage.getItem('musicAtlas:daw:draft:u1:d1')).not.toBeNull();
  });

  it('uses localStorage after two failed opens, the second after a pause, decided once', async () => {
    const { factory, open } = failingFactory('UnknownError', 2);
    const storage = new MemoryStorage();
    const store = createDraftStore({
      indexedDB: factory,
      storage,
      openRetryMs: 40,
    });
    const started = Date.now();
    await store.write(createWrite('d1', 'u1'));
    expect(Date.now() - started).toBeGreaterThanOrEqual(35);
    expect(store.kind).toBe('localstorage');
    expect(await store.ready?.()).toEqual({
      kind: 'localstorage',
      reason: 'open-failed',
    });
    expect(open).toHaveBeenCalledTimes(2);
    await store.list('u1');
    expect(open).toHaveBeenCalledTimes(2);
  });

  it('uses IndexedDB when the second open succeeds', async () => {
    const { factory } = failingFactory('UnknownError', 1);
    const store = createDraftStore({
      indexedDB: factory,
      storage: new MemoryStorage(),
      openRetryMs: 0,
    });
    expect(await store.ready?.()).toEqual({ kind: 'indexeddb', reason: null });
    await store.write(createWrite('d1', 'u1'));
    expect(store.kind).toBe('indexeddb');
  });

  it('uses localStorage at once on a SecurityError', async () => {
    const { factory, open } = failingFactory('SecurityError', 5);
    const store = createDraftStore({
      indexedDB: factory,
      storage: new MemoryStorage(),
    });
    await store.list('u1');
    expect(store.kind).toBe('localstorage');
    expect((await store.ready?.())?.reason).toBe('security');
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('passes the page protect set to the fallback adapter', async () => {
    const storage = new MemoryStorage();
    const protect = new Set<string>();
    const clock = manualClock();
    const store = createDraftStore({
      indexedDB: null,
      storage,
      now: clock,
      writerDoc: 'me',
      protect: () => protect,
    });
    await store.write(createWrite('live-cache', 'u1', 'pristine'));
    protect.add('live-cache');
    for (let i = 0; i < 4; i++) {
      clock.advance(1);
      await store.write(createWrite(`w${i}`, 'u1', 'work'));
    }
    clock.advance(1);
    // A sixth: the only draft without work is protected, so it's refused.
    expect(
      (await rejection(store.write(createWrite('sixth', 'u1', 'work')))).kind,
    ).toBe('quota');
    expect(await store.getMeta('live-cache')).not.toBeNull();
  });

  it("falls to an adapter that rejects 'unavailable' when localStorage is gone too", async () => {
    const store = createDraftStore({ indexedDB: null, storage: null });
    expect((await store.ready?.())?.reason).toBe('no-storage');
    expect(await store.list('u1')).toEqual([]);
    expect((await rejection(store.write(createWrite('d1', 'u1')))).kind).toBe(
      'unavailable',
    );
  });

  it('gives one page store, and a stable WRITER_DOC', () => {
    resetDraftStoreForTests();
    const a = getDraftStore();
    expect(getDraftStore()).toBe(a);
    expect(typeof WRITER_DOC).toBe('string');
    expect(WRITER_DOC.length).toBeGreaterThan(8);
    resetDraftStoreForTests();
  });
});
