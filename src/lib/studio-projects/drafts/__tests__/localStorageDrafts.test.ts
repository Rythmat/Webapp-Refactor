import { describe, expect, it } from 'vitest';
import {
  createLocalStorageDrafts,
  LS_MAX_CHARS,
  LS_MAX_DRAFTS_PER_USER,
  LS_QUARANTINE_PREFIX,
} from '../localStorageDrafts';
import { DraftStorageError, type DraftMeta } from '../types';
import {
  createWrite,
  manualClock,
  MemoryStorage,
  throwingStorage,
  updateWrite,
} from './draftTestUtils';

// ── The localStorage fallback adapter (milestone 1.4, E1) ──────────────────
// Run: npx vitest run src/lib/studio-projects/drafts/__tests__/localStorageDrafts.test.ts
// Its CRUD, CAS, list and prune behaviour is the shared suite in
// draftStore.test.ts; here are its caps, a full Storage, and its formats.

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

function make(storage: Storage | null = new MemoryStorage()) {
  const clock = manualClock();
  const store = createLocalStorageDrafts({
    storage,
    now: clock,
    writer: { build: 'b', doc: 'd' },
  });
  return { store, clock };
}

describe('localStorage drafts', () => {
  it('stores {meta, text} under musicAtlas:daw:draft:<userKey>:<draftId>', async () => {
    const storage = new MemoryStorage();
    const { store } = make(storage);
    await store.write(createWrite('d1', 'u%40x', 'work', {}, 'BODY'));
    const raw = storage.getItem('musicAtlas:daw:draft:u%40x:d1');
    expect(JSON.parse(raw as string)).toMatchObject({
      meta: { draftId: 'd1', userKey: 'u%40x', writeSeq: 1 },
      text: 'BODY',
    });
    await store.setMetaValue('import:ledger', { a: 1 });
    expect(storage.getItem('musicAtlas:daw:draftmeta:import:ledger')).toBe(
      '{"a":1}',
    );
  });

  it('keeps at most 5 drafts per user, trimming the oldest without work', async () => {
    const { store, clock } = make();
    await store.write(createWrite('old-cache', 'u1', 'pristine'));
    for (let i = 0; i < LS_MAX_DRAFTS_PER_USER - 1; i++) {
      clock.advance(1);
      await store.write(createWrite(`w${i}`, 'u1', 'work'));
    }
    clock.advance(1);
    await store.write(createWrite('other-user', 'u2', 'pristine'));
    clock.advance(1);
    await store.write(createWrite('sixth', 'u1', 'work'));
    const ids = (await store.list('u1')).map((m) => m.draftId);
    expect(ids).toHaveLength(LS_MAX_DRAFTS_PER_USER);
    expect(ids).not.toContain('old-cache');
    expect(ids).toContain('sixth');
    // Another user's cache isn't trimmed for this user's count.
    expect(await store.getMeta('other-user')).not.toBeNull();
    // Five drafts with work: a sixth is refused, nothing dropped.
    const error = await rejection(
      store.write(createWrite('seventh', 'u1', 'work')),
    );
    expect(error.kind).toBe('quota');
    expect(await store.list('u1')).toHaveLength(LS_MAX_DRAFTS_PER_USER);
  });

  it('keeps drafts to 1,000,000 characters in all', async () => {
    const { store, clock } = make();
    const big = 'x'.repeat(400_000);
    await store.write(createWrite('cache', 'u2', 'cloud-equal', {}, big));
    clock.advance(1);
    await store.write(createWrite('work1', 'u1', 'work', {}, big));
    clock.advance(1);
    // Over the total: the other user's cache goes (it has no work).
    await store.write(createWrite('work2', 'u1', 'work', {}, big));
    expect(await store.getMeta('cache')).toBeNull();
    // Over again, with only work left: refused, nothing changed.
    const error = await rejection(
      store.write(
        createWrite('work3', 'u1', 'work', {}, 'y'.repeat(LS_MAX_CHARS / 2)),
      ),
    );
    expect(error.kind).toBe('quota');
    expect((await store.list('u1')).map((m) => m.draftId)).toEqual([
      'work2',
      'work1',
    ]);
  });

  it('when storage is full, drops drafts without work only if that makes room', async () => {
    const storage = new MemoryStorage(20_000);
    const { store, clock } = make(storage);
    await store.write(
      createWrite('cache', 'u1', 'pristine', {}, 'c'.repeat(6_000)),
    );
    clock.advance(1);
    await store.write(createWrite('work', 'u1', 'work', {}, 'w'.repeat(6_000)));
    clock.advance(1);
    // 9K more does not fit in 20K beside 12K+; dropping the cache makes room.
    await store.write(createWrite('new', 'u1', 'work', {}, 'n'.repeat(9_000)));
    expect(await store.getMeta('cache')).toBeNull();
    expect((await store.readBody('new'))?.text).toHaveLength(9_000);
    // Nothing more can go: refused 'quota', and the work is intact.
    const error = await rejection(
      store.write(createWrite('huge', 'u1', 'work', {}, 'h'.repeat(8_000))),
    );
    expect(error.kind).toBe('quota');
    expect((await store.readBody('work'))?.text).toHaveLength(6_000);
    expect((await store.readBody('new'))?.text).toHaveLength(9_000);
  });

  it('a failed update leaves the previous record', async () => {
    const storage = new MemoryStorage(2_000);
    const { store } = make(storage);
    const first = await store.write(
      createWrite('d1', 'u1', 'work', {}, 'small'),
    );
    const error = await rejection(
      store.write(updateWrite(first, 'z'.repeat(3_000))),
    );
    expect(error.kind).toBe('quota');
    expect((await store.readBody('d1'))?.text).toBe('small');
    expect((await store.getMeta('d1'))?.writeSeq).toBe(1);
  });

  it('keeps no media', async () => {
    const { store } = make();
    const error = await rejection(
      store.putMedia({
        key: 'u1:m',
        mediaId: 'm',
        userKey: 'u1',
        blob: new Blob(['x']),
        contentType: 'audio/wav',
        size: 1,
        createdAt: 0,
      }),
    );
    expect(error.kind).toBe('unavailable');
    expect(await store.hasMedia('u1', ['m'])).toEqual(new Set());
    expect(await store.getMedia('u1', 'm')).toBeNull();
    expect(await store.gcMedia('u1', { graceMs: 0 })).toBe(0);
  });

  it("quarantines under its own prefix, never 1.3's unreadable keys (E6)", async () => {
    const storage = new MemoryStorage();
    const { store } = make(storage);
    // An entry 1.3 set aside: legacy input for legacyImport, not ours.
    const legacy =
      'musicAtlas:daw:unreadable:u1:abcd1234:2026-10-01T00:00:00.000Z';
    storage.setItem(legacy, 'OLD RAW');
    const base = {
      userKey: 'u1',
      source: 'legacy-autosave' as const,
      reason: 'unparseable',
      build: 'b',
      at: Date.parse('2026-10-08T00:00:00.000Z'),
    };
    expect(
      await store.quarantine({ ...base, hash: 'h1:y', raw: 'NEW RAW' }),
    ).toBe('stored');
    expect(
      await store.quarantine({ ...base, hash: 'h1:y', raw: 'NEW RAW', at: 1 }),
    ).toBe('duplicate');
    // Same raw text as 1.3's entry: still stored here (legacyImport dedupes).
    expect(
      await store.quarantine({ ...base, hash: 'h1:x', raw: 'OLD RAW' }),
    ).toBe('stored');
    const key = `${LS_QUARANTINE_PREFIX}u1:h1%3Ay:0`;
    expect(LS_QUARANTINE_PREFIX).toBe('musicAtlas:daw:draftq:');
    expect(JSON.parse(storage.getItem(key) as string)).toMatchObject({
      raw: 'NEW RAW',
      source: 'legacy-autosave',
      hash: 'h1:y',
    });
    const unreadable = Array.from({ length: storage.length }, (_, i) =>
      storage.key(i),
    ).filter((k) => k?.startsWith('musicAtlas:daw:unreadable:'));
    expect(unreadable).toEqual([legacy]);
    expect(storage.getItem(legacy)).toBe('OLD RAW');
    const listed = await store.listQuarantine('u1');
    expect(listed.map((r) => [r.raw, r.hash]).sort()).toEqual([
      ['NEW RAW', 'h1:y'],
      ['OLD RAW', 'h1:x'],
    ]);
    expect(await store.listQuarantine('u2')).toEqual([]);
  });

  it('never trims a protected draft, or one another page wrote recently', async () => {
    const storage = new MemoryStorage();
    const clock = manualClock();
    const protect = new Set<string>(['protected-cache']);
    const other = createLocalStorageDrafts({
      storage,
      now: clock,
      writer: { build: 'b', doc: 'other-tab' },
    });
    const store = createLocalStorageDrafts({
      storage,
      now: clock,
      writer: { build: 'b', doc: 'this-tab' },
      protect: () => protect,
    });
    await other.write(createWrite('their-live-cache', 'u1', 'pristine'));
    clock.advance(1);
    await store.write(createWrite('protected-cache', 'u1', 'pristine'));
    for (let i = 0; i < 3; i++) {
      clock.advance(1);
      await store.write(createWrite(`w${i}`, 'u1', 'work'));
    }
    clock.advance(1);
    expect(
      (await rejection(store.write(createWrite('sixth', 'u1', 'work')))).kind,
    ).toBe('quota');
    expect(await store.list('u1')).toHaveLength(LS_MAX_DRAFTS_PER_USER);
    // Ten minutes on, the other page's cache is no longer presumed live.
    clock.advance(10 * 60 * 1000);
    await store.write(createWrite('sixth', 'u1', 'work'));
    expect(await store.getMeta('their-live-cache')).toBeNull();
    expect(await store.getMeta('protected-cache')).not.toBeNull();
  });

  it('re-reads an entry another tab changed (the parse cache follows the stored text)', async () => {
    const storage = new MemoryStorage();
    const a = make(storage).store;
    const b = make(storage).store;
    const first = await a.write(createWrite('d1', 'u1', 'work', {}, 'one'));
    expect((await a.readBody('d1'))?.text).toBe('one');
    await b.write(updateWrite(first, 'two'));
    expect((await a.readBody('d1'))?.text).toBe('two');
    expect((await rejection(a.write(updateWrite(first, 'x')))).kind).toBe(
      'conflict',
    );
  });

  it('skips entries it cannot parse and never deletes them', async () => {
    const storage = new MemoryStorage();
    storage.setItem('musicAtlas:daw:draft:u1:bad', '{not json');
    const { store } = make(storage);
    expect(await store.list('u1')).toEqual([]);
    await store.prune({
      userKey: 'u1',
      protect: new Set(),
      reason: 'boot',
      schemaVersion: 3,
    });
    expect(storage.getItem('musicAtlas:daw:draft:u1:bad')).toBe('{not json');
  });

  it('moves the key when patchMeta re-homes a draft', async () => {
    const storage = new MemoryStorage();
    const { store } = make(storage);
    await store.write(createWrite('d1', '~device'));
    const claimed = (await store.patchMeta('d1', {
      userKey: 'u1',
    })) as DraftMeta;
    expect(claimed.userKey).toBe('u1');
    expect(storage.getItem('musicAtlas:daw:draft:~device:d1')).toBeNull();
    expect(storage.getItem('musicAtlas:daw:draft:u1:d1')).not.toBeNull();
    const next = await store.write(updateWrite(claimed, 'mine now'));
    expect(next.writeSeq).toBe(2);
  });

  it.each([
    ['null', null],
    ['throwing', throwingStorage()],
  ])(
    "without storage (%s): writes reject 'unavailable', reads find nothing",
    async (_n, s) => {
      const { store } = make(s);
      expect(store.kind).toBe('localstorage');
      expect(await store.list('u1')).toEqual([]);
      expect(await store.getMeta('d1')).toBeNull();
      expect(await store.listQuarantine('u1')).toEqual([]);
      expect(await store.knownUserKeys()).toEqual(new Set());
      for (const attempt of [
        store.write(createWrite('d1', 'u1')),
        store.setMetaValue('k', 1),
        store.patchMeta('d1', { name: 'x' }),
        store.quarantine({
          userKey: 'u1',
          source: 'draft',
          reason: 'r',
          build: 'b',
          hash: 'h',
          raw: 'r',
          at: 0,
        }),
      ]) {
        expect((await rejection(attempt)).kind).toBe('unavailable');
      }
      expect(
        await store.prune({
          userKey: 'u1',
          protect: new Set(),
          reason: 'boot',
          schemaVersion: 3,
        }),
      ).toEqual({ deletedDrafts: [], deletedMedia: 0, freedChars: 0 });
    },
  );
});
