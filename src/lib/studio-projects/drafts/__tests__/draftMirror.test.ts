import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { DRAFT_LOCK_PREFIX } from '../draftLock';
import {
  MIRROR_MAX_CHARS,
  MIRROR_PREFIX,
  mirrorKey,
  readMirrors,
  reconcileMirror,
  reconcileMirrors,
  removeMirror,
  writeMirror,
  type MirrorInput,
} from '../draftMirror';
import { createDraftStore, type DraftStore } from '../draftStore';
import { hashFingerprint } from '../fingerprintHash';
import type { DraftMeta } from '../types';
import {
  createWrite,
  MemoryStorage,
  updateWrite,
  writeMeta,
} from './draftTestUtils';
import { createFakeLockManager } from './fakeLocks';

// ── The per-draft mirror (milestone 1.4, E5) ───────────────────────────────
// Run: npx vitest run src/lib/studio-projects/drafts/__tests__/draftMirror.test.ts

beforeAll(() => {
  (globalThis as { IDBKeyRange?: unknown }).IDBKeyRange = IDBKeyRange;
});

const USER = 'alice';
const PAGE = 'page-A';

/** An IndexedDB store (fake) whose writes are stamped by `writerDoc`. */
function idbStore(writerDoc = PAGE): {
  store: DraftStore;
  factory: IDBFactory;
} {
  const factory = new IDBFactory();
  return {
    factory,
    store: createDraftStore({ indexedDB: factory, storage: null, writerDoc }),
  };
}

/** The same database, as another page (another writer doc). */
const otherPage = (factory: IDBFactory, writerDoc = 'page-B') =>
  createDraftStore({ indexedDB: factory, storage: null, writerDoc });

/** A session text, pretty-printed so a re-serialization would differ. */
const session = (label: string) =>
  JSON.stringify({ version: 2, schema: 3, data: { label } }, null, 2);

function mirror(
  draftId: string,
  baseSeq: number,
  text: string,
  extra: Partial<MirrorInput> = {},
): MirrorInput {
  return {
    v: 1,
    draftId,
    userKey: USER,
    baseSeq,
    writeSeq: baseSeq + 1,
    at: 1_700_000_000_000,
    writerDoc: PAGE,
    meta: writeMeta(draftId, USER, 'work', { name: `Mirror of ${draftId}` }),
    text,
    ...extra,
  };
}

/** Write `draftId` `times` times (seq 1..times), the last with `lastText`. */
async function seed(
  store: DraftStore,
  draftId: string,
  times: number,
  lastText = session(`${draftId}-${times}`),
): Promise<DraftMeta> {
  let meta = await store.write(
    createWrite(
      draftId,
      USER,
      'work',
      {},
      times === 1 ? lastText : session(`${draftId}-1`),
    ),
  );
  for (let i = 2; i <= times; i++) {
    meta = await store.write(
      updateWrite(meta, i === times ? lastText : session(`${draftId}-${i}`)),
    );
  }
  return meta;
}

describe('writeMirror / readMirrors', () => {
  it('stores the session text unescaped and reads it back verbatim', () => {
    const storage = new MemoryStorage();
    const text = session('hello "quoted" é');
    expect(writeMirror(mirror('d1', 3, text), storage)).toBe('written');
    const raw = storage.getItem(mirrorKey(USER, 'd1'))!;
    expect(raw.startsWith('{"v":1,"draftId":"d1"')).toBe(true);
    expect(raw.endsWith(`,"session":${text}}`)).toBe(true);
    // The whole value is JSON.
    expect(JSON.parse(raw).session.data.label).toBe('hello "quoted" é');
    const [read] = readMirrors(USER, storage);
    expect(read.key).toBe(`${MIRROR_PREFIX}${USER}:d1`);
    expect(read.entry).toMatchObject({
      draftId: 'd1',
      userKey: USER,
      baseSeq: 3,
      writeSeq: 4,
      writerDoc: PAGE,
      contentHash: hashFingerprint(text),
    });
    expect(read.entry!.text).toBe(text);
    expect(read.entry!.meta.name).toBe('Mirror of d1');
  });

  it('reads only the user’s own mirrors; junk reads as a null entry', () => {
    const storage = new MemoryStorage();
    writeMirror(mirror('d1', 0, session('a')), storage);
    writeMirror(
      {
        ...mirror('d2', 0, session('b')),
        userKey: 'bob',
        meta: writeMeta('d2', 'bob'),
      },
      storage,
    );
    storage.setItem(mirrorKey(USER, 'junk'), '{"v":1,"draftId":');
    storage.setItem(
      mirrorKey(USER, 'wrong-id'),
      storage.getItem(mirrorKey(USER, 'd1'))!,
    );
    const mine = readMirrors(USER, storage);
    expect(mine.map((m) => m.key.slice(MIRROR_PREFIX.length))).toEqual([
      'alice:d1',
      'alice:junk',
      'alice:wrong-id',
    ]);
    expect(mine.map((m) => m.entry?.draftId ?? null)).toEqual([
      'd1',
      null,
      null,
    ]);
    expect(readMirrors('bob', storage)).toHaveLength(1);
  });

  it('a value whose head was rewritten still reads, its session re-serialized', () => {
    const storage = new MemoryStorage();
    const text = session('x');
    writeMirror(mirror('d1', 0, text), storage);
    const key = mirrorKey(USER, 'd1');
    const reformatted = JSON.stringify(
      JSON.parse(storage.getItem(key)!),
      null,
      1,
    );
    storage.setItem(key, reformatted);
    const [read] = readMirrors(USER, storage);
    expect(read.entry!.text).toBe(JSON.stringify(JSON.parse(text)));
    // The hash stays the one written: the content IndexedDB would have.
    expect(read.entry!.contentHash).toBe(hashFingerprint(text));
  });

  it("refuses a value above MIRROR_MAX_CHARS ('too-big') and keeps the earlier mirror", () => {
    const storage = new MemoryStorage();
    writeMirror(mirror('d1', 0, session('small')), storage);
    const huge = JSON.stringify({ pad: 'x'.repeat(MIRROR_MAX_CHARS) });
    expect(writeMirror(mirror('d1', 1, huge), storage)).toBe('too-big');
    expect(readMirrors(USER, storage)[0].entry!.baseSeq).toBe(0);
  });

  it("reports a full storage as 'failed' and keeps the earlier mirror", () => {
    const storage = new MemoryStorage();
    writeMirror(mirror('d1', 0, session('small')), storage);
    storage.setBudget(storage.used() + 10);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(
      writeMirror(mirror('d1', 1, session('a longer session')), storage),
    ).toBe('failed');
    expect(warn).not.toHaveBeenCalled(); // quota is expected, not logged
    expect(readMirrors(USER, storage)[0].entry!.baseSeq).toBe(0);
    expect(writeMirror(mirror('d1', 1, 'x'), null)).toBe('failed');
    warn.mockRestore();
  });

  it('removeMirror removes only that draft’s mirror', () => {
    const storage = new MemoryStorage();
    writeMirror(mirror('d1', 0, session('a')), storage);
    writeMirror(mirror('d2', 0, session('b')), storage);
    removeMirror(USER, 'd1', storage);
    expect(readMirrors(USER, storage).map((m) => m.entry?.draftId)).toEqual([
      'd2',
    ]);
  });
});

describe('reconcileMirrors', () => {
  it('unparseable: quarantined raw, then removed', async () => {
    const { store } = idbStore();
    const storage = new MemoryStorage();
    storage.setItem(mirrorKey(USER, 'd1'), 'garbage{');
    const result = await reconcileMirrors(store, USER, {
      locked: new Set(),
      locks: null,
      storage,
    });
    expect(result.quarantined).toEqual(['d1']);
    expect(storage.length).toBe(0);
    const [q] = await store.listQuarantine(USER);
    expect(q).toMatchObject({
      source: 'mirror',
      raw: 'garbage{',
      draftId: 'd1',
    });
  });

  it('locked by another tab: skipped, mirror kept', async () => {
    const { store } = idbStore();
    const storage = new MemoryStorage();
    writeMirror(mirror('d1', 0, session('a')), storage);
    const result = await reconcileMirrors(store, USER, {
      locked: new Set(['d1']),
      locks: null,
      storage,
    });
    expect(result.skipped).toEqual(['d1']);
    expect(await store.getMeta('d1')).toBeNull();
    expect(storage.length).toBe(1);
  });

  it('no IndexedDB record: created from the mirror', async () => {
    const { store } = idbStore();
    const storage = new MemoryStorage();
    const text = session('fresh');
    writeMirror(mirror('d1', 0, text), storage);
    const result = await reconcileMirrors(store, USER, {
      locked: new Set(),
      locks: null,
      storage,
    });
    expect(result.applied).toEqual(['d1']);
    expect((await store.readBody('d1'))!.text).toBe(text);
    expect((await store.getMeta('d1'))!.name).toBe('Mirror of d1');
    expect(storage.length).toBe(0);
  });

  it('IndexedDB at baseSeq (the write never landed): the mirror is written over it', async () => {
    const { store } = idbStore();
    const storage = new MemoryStorage();
    await seed(store, 'd1', 2);
    const text = session('newest');
    writeMirror(mirror('d1', 2, text), storage);
    const result = await reconcileMirrors(store, USER, {
      locked: new Set(),
      locks: null,
      storage,
    });
    expect(result.applied).toEqual(['d1']);
    expect(await store.readBody('d1')).toMatchObject({ writeSeq: 3, text });
    expect((await store.list(USER)).map((m) => m.draftId)).toEqual(['d1']);
    expect(storage.length).toBe(0);
  });

  it('IndexedDB past the mirror: dropped', async () => {
    const { store } = idbStore();
    const storage = new MemoryStorage();
    const stored = await seed(store, 'd1', 3);
    writeMirror(mirror('d1', 1, session('stale')), storage);
    const result = await reconcileMirrors(store, USER, {
      locked: new Set(),
      locks: null,
      storage,
    });
    expect(result.dropped).toEqual(['d1']);
    expect(await store.readBody('d1')).toMatchObject({ writeSeq: 3 });
    expect((await store.getMeta('d1'))!.contentHash).toBe(stored.contentHash);
    expect(storage.length).toBe(0);
  });

  it('IndexedDB at the mirror’s writeSeq with the same content: dropped', async () => {
    const { store } = idbStore();
    const storage = new MemoryStorage();
    const text = session('same');
    await seed(store, 'd1', 2, text);
    writeMirror(mirror('d1', 1, text), storage);
    const result = await reconcileMirrors(store, USER, {
      locked: new Set(),
      locks: null,
      storage,
    });
    expect(result.dropped).toEqual(['d1']);
    expect((await store.list(USER)).map((m) => m.draftId)).toEqual(['d1']);
  });

  it('IndexedDB at the mirror’s writeSeq with OTHER content: a recovered copy, nothing overwritten', async () => {
    const { store } = idbStore();
    const storage = new MemoryStorage();
    const idbText = session('S1');
    await seed(store, 'd1', 2, idbText);
    const mirrorText = session('S2');
    writeMirror(mirror('d1', 1, mirrorText), storage);
    const result = await reconcileMirrors(store, USER, {
      locked: new Set(),
      locks: null,
      storage,
    });
    expect(result.recovered).toHaveLength(1);
    const copyId = result.recovered[0];
    expect(copyId).not.toBe('d1');
    expect((await store.readBody('d1'))!.text).toBe(idbText);
    expect((await store.readBody(copyId))!.text).toBe(mirrorText);
    expect(await store.getMeta(copyId)).toMatchObject({
      origin: 'recovered',
      forkedFrom: 'd1',
      userKey: USER,
      updatedAt: 1_700_000_000_000,
    });
    expect(storage.length).toBe(0);
  });

  it('IndexedDB moved by another writer below the mirror: a recovered copy', async () => {
    const { store, factory } = idbStore();
    const storage = new MemoryStorage();
    // Another page wrote seq 1; the mirror claims base 3 from page A.
    await seed(otherPage(factory), 'd1', 1);
    writeMirror(mirror('d1', 3, session('mine')), storage);
    const result = await reconcileMirrors(store, USER, {
      locked: new Set(),
      locks: null,
      storage,
    });
    expect(result.recovered).toHaveLength(1);
    expect(await store.readBody('d1')).toMatchObject({ writeSeq: 1 });
  });

  it('a chain of queued writes that never landed (IndexedDB behind base, same page): applied', async () => {
    // The critique's case: W1 (S1, 1→2) was still in flight when the tab was
    // hidden; hideFlush queued W2 behind it and mirrored {base 2, seq 3, S2}.
    // The page died before either committed.
    const { factory } = idbStore();
    const before = createDraftStore({
      indexedDB: factory,
      storage: null,
      writerDoc: PAGE,
    });
    await seed(before, 'd1', 1);
    const storage = new MemoryStorage();
    const s2 = session('S2');
    writeMirror(mirror('d1', 2, s2), storage);
    const after = createDraftStore({
      indexedDB: factory,
      storage: null,
      writerDoc: 'page-reloaded',
    });
    const result = await reconcileMirrors(after, USER, {
      locked: new Set(),
      locks: null,
      storage,
    });
    expect(result.applied).toEqual(['d1']);
    expect((await after.readBody('d1'))!.text).toBe(s2);
    expect(await after.list(USER)).toHaveLength(1);
  });

  it('W1 landed, W2 did not: the mirror (chained on W1) wins, no fork', async () => {
    const { factory } = idbStore();
    const page = createDraftStore({
      indexedDB: factory,
      storage: null,
      writerDoc: PAGE,
    });
    const stored = await seed(page, 'd1', 1);
    // W1 commits after the mirror was written.
    const storage = new MemoryStorage();
    const s2 = session('S2');
    writeMirror(mirror('d1', 2, s2), storage);
    await page.write(updateWrite(stored, session('S1')));
    const reloaded = createDraftStore({
      indexedDB: factory,
      storage: null,
      writerDoc: 'page-2',
    });
    const result = await reconcileMirrors(reloaded, USER, {
      locked: new Set(),
      locks: null,
      storage,
    });
    expect(result.applied).toEqual(['d1']);
    expect(await reloaded.readBody('d1')).toMatchObject({
      writeSeq: 3,
      text: s2,
    });
    expect(await reloaded.list(USER)).toHaveLength(1);
  });

  it('a store failure keeps the mirror for the next boot', async () => {
    const { store } = idbStore();
    const storage = new MemoryStorage();
    writeMirror(mirror('d1', 0, session('a')), storage);
    vi.spyOn(store, 'getMeta').mockRejectedValueOnce(new Error('disk gone'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await reconcileMirrors(store, USER, {
      locked: new Set(),
      locks: null,
      storage,
    });
    expect(result.failed).toEqual(['d1']);
    expect(storage.length).toBe(1);
    warn.mockRestore();
  });

  it('never touches another user’s mirrors', async () => {
    const { store } = idbStore();
    const storage = new MemoryStorage();
    writeMirror(
      {
        ...mirror('d2', 0, session('b')),
        userKey: 'bob',
        meta: writeMeta('d2', 'bob'),
      },
      storage,
    );
    await reconcileMirrors(store, USER, {
      locked: new Set(),
      storage,
      locks: null,
    });
    expect(storage.length).toBe(1);
    expect(await store.getMeta('d2')).toBeNull();
  });
});

describe('reconcileMirrors: the chain a page queued', () => {
  // The page adopted record N written by ANOTHER page (a reload), then
  // queued writes that never landed; its mirror names where the chain began.
  async function adopted() {
    const { factory } = idbStore();
    const previous = createDraftStore({
      indexedDB: factory,
      storage: null,
      writerDoc: 'page-O',
    });
    const stored = await seed(previous, 'd1', 3, session('O-3'));
    const later = createDraftStore({
      indexedDB: factory,
      storage: null,
      writerDoc: 'page-next-boot',
    });
    return { factory, stored, later, storage: new MemoryStorage() };
  }

  it('IndexedDB at the chain’s start (written by the previous page): applied, no copy', async () => {
    const { stored, later, storage } = await adopted();
    const text = session('P-5');
    writeMirror(
      mirror('d1', 4, text, {
        chainFromSeq: 3,
        chainFromHash: stored.contentHash,
      }),
      storage,
    );
    const result = await reconcileMirrors(later, USER, {
      locked: new Set(),
      storage,
      locks: null,
    });
    expect(result.applied).toEqual(['d1']);
    expect(result.recovered).toEqual([]);
    expect((await later.readBody('d1'))!.text).toBe(text);
    expect(await later.list(USER)).toHaveLength(1);
  });

  it('the chain’s start with other content (another writer): a recovered copy', async () => {
    const { later, storage } = await adopted();
    writeMirror(
      mirror('d1', 4, session('P-5'), {
        chainFromSeq: 3,
        chainFromHash: hashFingerprint('something else'),
      }),
      storage,
    );
    const result = await reconcileMirrors(later, USER, {
      locked: new Set(),
      storage,
      locks: null,
    });
    expect(result.recovered).toHaveLength(1);
    expect((await later.readBody('d1'))!.text).toBe(session('O-3'));
  });

  it('earlier writes of the chain landed (same page): applied', async () => {
    const { factory, stored, storage } = await adopted();
    const page = createDraftStore({
      indexedDB: factory,
      storage: null,
      writerDoc: PAGE,
    });
    // W1 (3→4) landed; W2 (4→5) did not; the mirror is {base 5, seq 6}.
    await page.write(updateWrite(stored, session('P-4')));
    const text = session('P-6');
    writeMirror(
      mirror('d1', 5, text, {
        chainFromSeq: 3,
        chainFromHash: stored.contentHash,
      }),
      storage,
    );
    const result = await reconcileMirrors(page, USER, {
      locked: new Set(),
      storage,
      locks: null,
    });
    expect(result.applied).toEqual(['d1']);
    expect(await page.readBody('d1')).toMatchObject({ writeSeq: 5, text });
  });

  it('IndexedDB already holding the same content at a lower seq: dropped', async () => {
    const { stored, later, storage } = await adopted();
    writeMirror(
      mirror('d1', 7, session('O-3'), {
        writerDoc: 'someone',
        chainFromSeq: 6,
        chainFromHash: 'x',
      }),
      storage,
    );
    const result = await reconcileMirrors(later, USER, {
      locked: new Set(),
      storage,
      locks: null,
    });
    expect(result.dropped).toEqual(['d1']);
    expect((await later.getMeta('d1'))!.writeSeq).toBe(stored.writeSeq);
    expect(await later.list(USER)).toHaveLength(1);
  });
});

describe('reconcileMirrors: tabs and later builds', () => {
  it('two tabs reconciling at once (crash restore) apply a mirror once', async () => {
    const factory = new IDBFactory();
    const storage = new MemoryStorage();
    writeMirror(mirror('d1', 0, session('only')), storage);
    const locks = createFakeLockManager();
    const tab = (doc: string) =>
      createDraftStore({ indexedDB: factory, storage: null, writerDoc: doc });
    const [a, b] = await Promise.all([
      reconcileMirrors(tab('A'), USER, { locked: new Set(), storage, locks }),
      reconcileMirrors(tab('B'), USER, { locked: new Set(), storage, locks }),
    ]);
    expect([...a.applied, ...b.applied]).toEqual(['d1']);
    expect([...a.recovered, ...b.recovered]).toEqual([]);
    expect(await tab('C').list(USER)).toHaveLength(1);
    expect(storage.length).toBe(0);
    expect(locks.heldNames()).toEqual([]);
  });

  it('even without locks, a racing create resolves to one draft (conflict re-read)', async () => {
    const factory = new IDBFactory();
    const storage = new MemoryStorage();
    writeMirror(mirror('d1', 0, session('only')), storage);
    const tab = (doc: string) =>
      createDraftStore({ indexedDB: factory, storage: null, writerDoc: doc });
    const [a, b] = await Promise.all([
      reconcileMirrors(tab('A'), USER, {
        locked: new Set(),
        storage,
        locks: null,
      }),
      reconcileMirrors(tab('B'), USER, {
        locked: new Set(),
        storage,
        locks: null,
      }),
    ]);
    expect([...a.recovered, ...b.recovered]).toEqual([]);
    expect(await tab('C').list(USER)).toHaveLength(1);
  });

  it('a draft locked after the snapshot was taken is skipped, mirror kept', async () => {
    const { store } = idbStore();
    const storage = new MemoryStorage();
    writeMirror(mirror('d1', 0, session('a')), storage);
    const locks = createFakeLockManager();
    const release = locks.holdElsewhere(`${DRAFT_LOCK_PREFIX}d1`);
    const result = await reconcileMirrors(store, USER, {
      locked: new Set(),
      storage,
      locks,
    });
    expect(result.skipped).toEqual(['d1']);
    expect(storage.length).toBe(1);
    release();
  });

  it('a later build’s mirror (v 2) is left byte-identical', async () => {
    const { store } = idbStore();
    const storage = new MemoryStorage();
    const key = mirrorKey(USER, 'd1');
    const value = JSON.stringify({ v: 2, draftId: 'd1', whatever: [1, 2] });
    storage.setItem(key, value);
    const result = await reconcileMirrors(store, USER, {
      locked: new Set(),
      storage,
      locks: null,
    });
    expect(result.skipped).toEqual(['d1']);
    expect(await reconcileMirror(store, USER, 'd1', { storage })).toEqual({
      outcome: 'skipped',
    });
    expect(storage.getItem(key)).toBe(value);
    expect(await store.listQuarantine(USER)).toHaveLength(0);
  });
});

describe('reconcileMirror (under the claim’s lock)', () => {
  it('reconciles one draft’s mirror whatever the lock says', async () => {
    const { store } = idbStore();
    const storage = new MemoryStorage();
    await seed(store, 'd1', 1);
    const text = session('mine');
    writeMirror(mirror('d1', 1, text), storage);
    writeMirror(mirror('d2', 0, session('other')), storage);
    expect(await reconcileMirror(store, USER, 'd1', { storage })).toEqual({
      outcome: 'applied',
    });
    expect((await store.readBody('d1'))!.text).toBe(text);
    // d2's mirror is left for its own claim or the next boot.
    expect(readMirrors(USER, storage).map((m) => m.entry?.draftId)).toEqual([
      'd2',
    ]);
    expect(await reconcileMirror(store, USER, 'd3', { storage })).toEqual({
      outcome: 'none',
    });
  });
});
