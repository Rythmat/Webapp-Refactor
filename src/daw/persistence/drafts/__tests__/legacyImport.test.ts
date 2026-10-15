import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  DRAFT_LOCK_PREFIX,
  IMPORT_LOCK,
} from '@/lib/studio-projects/drafts/draftLock';
import {
  createDraftStore,
  type DraftStore,
} from '@/lib/studio-projects/drafts/draftStore';
import {
  draftHasWork,
  draftIsReadOnly,
} from '@/lib/studio-projects/drafts/predicates';
import { createFakeLockManager } from '@/lib/studio-projects/drafts/__tests__/fakeLocks';
import { MemoryStorage } from '@/lib/studio-projects/drafts/__tests__/draftTestUtils';
import { SESSION_SCHEMA_VERSION } from '../../projectDocument/codec';
import {
  LEGACY_AUTOSAVE_KEY,
  LEGACY_IMPORT_LEDGER,
  LEGACY_KEPT_PREFIX,
  claimDeviceDraft,
  claimDeviceDraftsInAccount,
  importLegacySessions,
  legacyDataHash,
  type ImportLedger,
} from '../legacyImport';

// ── Importing pre-1.4 sessions (milestone 1.4, E6) ─────────────────────────
// Run: npx vitest run src/daw/persistence/drafts/__tests__/legacyImport.test.ts
//
// The fixtures are 1.2's and prod's real autosaves, read only.

beforeAll(() => {
  (globalThis as { IDBKeyRange?: unknown }).IDBKeyRange = IDBKeyRange;
});

afterEach(() => {
  vi.restoreAllMocks();
});

const FIXTURES = join(__dirname, '../../__tests__/fixtures');
/** A fixture as storage held it (compact JSON). */
const fixture = (path: string): string =>
  JSON.stringify(JSON.parse(readFileSync(join(FIXTURES, path), 'utf8')));

const USER = 'dev-bypass-user';
const user = { userId: USER, userKey: USER };
const NOW = 1_800_000_000_000;

function setup() {
  const store = createDraftStore({
    indexedDB: new IDBFactory(),
    storage: null,
    now: () => NOW,
  });
  const storage = new MemoryStorage();
  const run = (
    u: { userId: string | null; userKey: string } = user,
    locks: LockManager | null = null,
  ) => importLegacySessions(store, u, { storage, now: () => NOW, locks });
  return { store, storage, run };
}

/** Every key and value in `storage`. */
const snapshot = (storage: Storage) => {
  const out: Record<string, string> = {};
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)!;
    out[key] = storage.getItem(key)!;
  }
  return out;
};

/** A fixture with its data changed by `patch`, as storage would hold it. */
const variant = (
  path: string,
  patch: (data: Record<string, unknown>) => void,
): string => {
  const session = JSON.parse(fixture(path)) as {
    data: Record<string, unknown>;
  };
  patch(session.data);
  return JSON.stringify(session);
};

const keptSlot = (
  namespace: string,
  iso: string,
  session: string,
  projectName = 'Kept Thing',
) => ({
  key: `${LEGACY_KEPT_PREFIX}${namespace}:${iso}`,
  value: JSON.stringify({
    keptAt: iso,
    projectName,
    session: JSON.parse(session),
  }),
});

async function allDrafts(store: DraftStore, ...users: string[]) {
  return (await Promise.all(users.map((u) => store.list(u)))).flat();
}

describe('the device-wide autosave (L)', () => {
  it('imports once as a migrated draft, verbatim, with meta from the data', async () => {
    const { store, storage, run } = setup();
    const raw = fixture('v2/kitchen-sink.json');
    storage.setItem(LEGACY_AUTOSAVE_KEY, raw);
    const first = await run();
    expect(first.imported).toHaveLength(1);
    expect(first.toDevice).toHaveLength(0);
    const meta = first.imported[0];
    const parsed = JSON.parse(raw);
    expect(meta).toMatchObject({
      userKey: USER,
      origin: 'migrated',
      name: 'Kitchen Sink',
      trackCount: 9,
      schema: 2,
      docFingerprint: null,
      hasContent: true,
      baseline: { source: 'import', reopenable: false, fingerprint: null },
      media: [],
      mediaMissing: 1,
      updatedAt: parsed.timestamp,
      createdAt: NOW,
      writeSeq: 1,
    });
    expect(meta).not.toHaveProperty('projectId');
    expect(draftHasWork(meta)).toBe(true);
    expect((await store.readBody(meta.draftId))!.text).toBe(raw);

    const second = await run();
    expect(second).toMatchObject({
      imported: [],
      toDevice: [],
      alreadyImported: 1,
    });
    expect(await store.list(USER)).toHaveLength(1);
  });

  it('dedupes by data, not by the per-write timestamp', async () => {
    const raw = fixture('v2/demo-sunset-keys.json');
    const retimed = JSON.stringify({ ...JSON.parse(raw), timestamp: 1 });
    expect(await legacyDataHash(raw)).toBe(await legacyDataHash(retimed));
    expect(await legacyDataHash('nope')).toBeNull();
    expect(await legacyDataHash('{"version":2}')).toBeNull();
    const { store, storage, run } = setup();
    storage.setItem(LEGACY_AUTOSAVE_KEY, raw);
    await run();
    storage.setItem(LEGACY_AUTOSAVE_KEY, retimed);
    expect((await run()).alreadyImported).toBe(1);
    expect(await store.list(USER)).toHaveLength(1);
  });

  it('an old tab’s rewrite becomes recovered; rewrites of the same project update it while nobody opened it', async () => {
    const { store, storage, run } = setup();
    storage.setItem(LEGACY_AUTOSAVE_KEY, fixture('v2/kitchen-sink.json'));
    const [migrated] = (await run()).imported;

    const second = variant('v2-1.2/demo-first-light.json', (d) => {
      d.projectId = 'proj-A';
    });
    storage.setItem(LEGACY_AUTOSAVE_KEY, second);
    const [recovered] = (await run()).imported;
    expect(recovered.origin).toBe('recovered');
    expect(recovered.projectId).toBe('proj-A');
    expect(recovered.draftId).not.toBe(migrated.draftId);

    // The same project, edited further: updated in place.
    const third = variant('v2-1.2/demo-first-light.json', (d) => {
      d.projectId = 'proj-A';
      (d.transport as { bpm: number }).bpm = 99;
    });
    storage.setItem(LEGACY_AUTOSAVE_KEY, third);
    const [rolled] = (await run()).imported;
    expect(rolled.draftId).toBe(recovered.draftId);
    expect(rolled.writeSeq).toBe(2);
    expect((await store.readBody(rolled.draftId))!.text).toBe(third);
    expect(await store.list(USER)).toHaveLength(2);
    // The migrated draft is never touched.
    expect((await store.getMeta(migrated.draftId))!.writeSeq).toBe(1);

    // Once opened (a later write), the next rewrite makes a new draft.
    await store.patchMeta(rolled.draftId, { name: 'opened' });
    await store.write({
      meta: { ...(await store.getMeta(rolled.draftId))!, origin: 'recovered' },
      text: third,
      expectedSeq: 2,
    });
    storage.setItem(
      LEGACY_AUTOSAVE_KEY,
      variant('v2-1.2/demo-first-light.json', (d) => {
        d.projectId = 'proj-A';
        (d.transport as { bpm: number }).bpm = 98;
      }),
    );
    const [fresh] = (await run()).imported;
    expect(fresh.draftId).not.toBe(rolled.draftId);
    expect(await store.list(USER)).toHaveLength(3);
  });

  it('an old tab that moved on to another project never overwrites the recovered copy', async () => {
    const { store, storage, run } = setup();
    storage.setItem(LEGACY_AUTOSAVE_KEY, fixture('v2/kitchen-sink.json'));
    await run();
    // A2: the old tab's further edits of A, imported as R.
    const a2 = variant('v2-1.2/demo-first-light.json', (d) => {
      d.projectId = 'proj-A';
    });
    storage.setItem(LEGACY_AUTOSAVE_KEY, a2);
    const [r] = (await run()).imported;
    // The old tab opened project B: L is B now.
    storage.setItem(
      LEGACY_AUTOSAVE_KEY,
      variant('v2-1.2/demo-midnight-groove.json', (d) => {
        d.projectId = 'proj-B';
      }),
    );
    const [b] = (await run()).imported;
    expect(b.draftId).not.toBe(r.draftId);
    expect((await store.readBody(r.draftId))!.text).toBe(a2);
    expect((await store.getMeta(r.draftId))!.writeSeq).toBe(1);
    // Or a project without an id (New, a demo): not a continuation either.
    storage.setItem(LEGACY_AUTOSAVE_KEY, fixture('v2/demo-sunset-keys.json'));
    const [c] = (await run()).imported;
    expect(c.draftId).not.toBe(b.draftId);
    expect(await store.list(USER)).toHaveLength(4);
  });

  it('an untitled project rolls only while every track of the recovered copy is still there', async () => {
    const { store, storage, run } = setup();
    storage.setItem(LEGACY_AUTOSAVE_KEY, fixture('v2/kitchen-sink.json'));
    await run();
    storage.setItem(LEGACY_AUTOSAVE_KEY, fixture('v2/demo-first-light.json'));
    const [r] = (await run()).imported;
    // Edited further, a track added: the same work, rolled in place.
    const grown = variant('v2/demo-first-light.json', (d) => {
      const tracks = d.tracks as { id: string }[];
      tracks.push({ ...tracks[0], id: 'a-new-track' });
    });
    storage.setItem(LEGACY_AUTOSAVE_KEY, grown);
    const [rolled] = (await run()).imported;
    expect(rolled.draftId).toBe(r.draftId);
    // A track of the copy gone: another project, a new draft.
    const other = variant('v2/demo-first-light.json', (d) => {
      (d.tracks as unknown[]).shift();
    });
    storage.setItem(LEGACY_AUTOSAVE_KEY, other);
    const [next] = (await run()).imported;
    expect(next.draftId).not.toBe(r.draftId);
    expect((await store.readBody(r.draftId))!.text).toBe(grown);
  });

  it('a recovered draft open in another tab (locked) is not updated in place', async () => {
    const { store, storage, run } = setup();
    const locks = createFakeLockManager();
    storage.setItem(LEGACY_AUTOSAVE_KEY, fixture('v2/kitchen-sink.json'));
    await run(user, locks);
    storage.setItem(LEGACY_AUTOSAVE_KEY, fixture('v2/demo-first-light.json'));
    const [recovered] = (await run(user, locks)).imported;
    locks.holdElsewhere(DRAFT_LOCK_PREFIX + recovered.draftId);
    storage.setItem(LEGACY_AUTOSAVE_KEY, fixture('v2/demo-sunset-keys.json'));
    const [next] = (await run(user, locks)).imported;
    expect(next.draftId).not.toBe(recovered.draftId);
    expect((await store.getMeta(recovered.draftId))!.writeSeq).toBe(1);
  });

  it('a v1 autosave imports (schema 2); a new project has no content', async () => {
    const { store, storage, run } = setup();
    storage.setItem(LEGACY_AUTOSAVE_KEY, fixture('v1/legacy-v1.json'));
    const [v1] = (await run()).imported;
    expect(v1).toMatchObject({
      schema: 2,
      trackCount: 3,
      name: 'Untitled Project',
      hasContent: true,
    });
    // v1 clips have neither assetId nor sourceUrl: both count as missing.
    expect(v1.mediaMissing).toBe(2);

    storage.setItem(LEGACY_AUTOSAVE_KEY, fixture('v2/new-project.json'));
    const [empty] = (await run()).imported;
    expect(empty).toMatchObject({
      hasContent: false,
      trackCount: 0,
      origin: 'recovered',
    });
    expect(draftHasWork(empty)).toBe(false);
    expect(await store.list(USER)).toHaveLength(2);
  });

  it('a 1.3 (v3) autosave imports with its schema and data', async () => {
    const { storage, run } = setup();
    const raw = fixture('v3-all-fields/all-fields.json');
    storage.setItem(LEGACY_AUTOSAVE_KEY, raw);
    const [meta] = (await run()).imported;
    expect(meta.schema).toBe(3);
    expect(meta.hasContent).toBe(true);
  });

  it('a future schema becomes a read-only draft with its schema', async () => {
    const { storage, run } = setup();
    const future = JSON.parse(fixture('v2-1.2/kitchen-sink.json'));
    future.schema = SESSION_SCHEMA_VERSION + 2;
    future.compat = SESSION_SCHEMA_VERSION + 2;
    storage.setItem(LEGACY_AUTOSAVE_KEY, JSON.stringify(future));
    const [meta] = (await run()).imported;
    expect(meta.schema).toBe(SESSION_SCHEMA_VERSION + 2);
    expect(draftIsReadOnly(meta, SESSION_SCHEMA_VERSION)).toBe(true);
  });

  it('junk goes to the quarantine (raw), once', async () => {
    const { store, storage, run } = setup();
    storage.setItem(LEGACY_AUTOSAVE_KEY, '{"version":2,"data":');
    const first = await run();
    expect(first).toMatchObject({ imported: [], quarantined: 1 });
    const [q] = await store.listQuarantine(USER);
    expect(q).toMatchObject({
      source: 'legacy-autosave',
      raw: '{"version":2,"data":',
    });
    expect((await run()).alreadyImported).toBe(1);
    // A readable but malformed session too.
    storage.setItem(
      LEGACY_AUTOSAVE_KEY,
      '{"version":2,"timestamp":1,"data":{"tracks":"no"}}',
    );
    expect((await run()).quarantined).toBe(1);
    expect(await store.list(USER)).toHaveLength(0);
  });
});

describe('who owns L', () => {
  it('the booting user when nobody else has Studio data here (anon and ~device don’t count)', async () => {
    const { storage, run } = setup();
    storage.setItem('musicAtlas:daw:prefs:anon', '{}');
    storage.setItem(`musicAtlas:daw:prefs:${USER}`, '{}');
    storage.setItem(LEGACY_AUTOSAVE_KEY, fixture('v2/kitchen-sink.json'));
    const result = await run();
    expect(result.imported).toHaveLength(1);
    expect(result.toDevice).toHaveLength(0);
  });

  it("'~device' when another person's namespace is in localStorage", async () => {
    const { store, storage, run } = setup();
    storage.setItem('oracle-synth-presets:someone-else', '[]');
    storage.setItem(LEGACY_AUTOSAVE_KEY, fixture('v2/kitchen-sink.json'));
    const result = await run();
    expect(result.imported).toHaveLength(0);
    expect(result.toDevice).toHaveLength(1);
    expect(await store.list('~device')).toHaveLength(1);
    expect(await store.list(USER)).toHaveLength(0);
  });

  it("'~device' when another person has drafts on this device", async () => {
    const { store, storage, run } = setup();
    await store.write({
      meta: {
        draftId: 'theirs',
        userKey: 'someone-else',
        origin: 'session',
        createdAt: 0,
        schema: 3,
        name: 'Theirs',
        trackCount: 0,
        chars: 0,
        docFingerprint: null,
        hasContent: true,
        baseline: { source: 'new', reopenable: true, fingerprint: null },
        media: [],
        mediaMissing: 0,
      },
      text: '{}',
      expectedSeq: null,
    });
    storage.setItem(LEGACY_AUTOSAVE_KEY, fixture('v2/kitchen-sink.json'));
    expect((await run()).toDevice).toHaveLength(1);
  });

  it('a second user booting later does not get L again', async () => {
    const { store, storage, run } = setup();
    storage.setItem(LEGACY_AUTOSAVE_KEY, fixture('v2/kitchen-sink.json'));
    await run();
    const bob = await run({ userId: 'bob', userKey: 'bob' });
    expect(bob).toMatchObject({
      imported: [],
      toDevice: [],
      alreadyImported: 1,
    });
    expect(await store.list('bob')).toHaveLength(0);
  });
});

describe('kept slots', () => {
  it('imports the user’s slots with keptAt, anon ones to ~device, and leaves others’', async () => {
    const { store, storage, run } = setup();
    const mine = keptSlot(
      USER,
      '2026-09-01T10:00:00.000Z',
      fixture('v2/demo-sunset-keys.json'),
      'My Keys',
    );
    const anon = keptSlot(
      'anon',
      '2026-09-02T10:00:00.000Z',
      fixture('v2/demo-first-light.json'),
    );
    const theirs = keptSlot(
      'bob',
      '2026-09-03T10:00:00.000Z',
      fixture('v2/demo-midnight-groove.json'),
    );
    for (const s of [mine, anon, theirs]) storage.setItem(s.key, s.value);
    const result = await run();
    expect(result.imported).toHaveLength(1);
    expect(result.imported[0]).toMatchObject({
      origin: 'kept',
      name: 'My Keys',
      keptAt: Date.parse('2026-09-01T10:00:00.000Z'),
      updatedAt: Date.parse('2026-09-01T10:00:00.000Z'),
      userKey: USER,
    });
    expect(
      JSON.parse((await store.readBody(result.imported[0].draftId))!.text),
    ).toEqual(JSON.parse(fixture('v2/demo-sunset-keys.json')));
    expect(result.toDevice).toHaveLength(1);
    expect(result.toDevice[0]).toMatchObject({
      origin: 'kept',
      userKey: '~device',
    });
    expect(await store.list('bob')).toHaveLength(0);
    // Again: nothing new.
    const again = await run();
    expect(again).toMatchObject({
      imported: [],
      toDevice: [],
      alreadyImported: 2,
    });
  });

  it('a slot holding the same work as L is imported once', async () => {
    const { store, storage, run } = setup();
    const raw = fixture('v2/kitchen-sink.json');
    storage.setItem(LEGACY_AUTOSAVE_KEY, raw);
    const slot = keptSlot(USER, '2026-09-01T10:00:00.000Z', raw);
    storage.setItem(slot.key, slot.value);
    const result = await run();
    expect(result.imported).toHaveLength(1);
    expect(result.alreadyImported).toBe(1);
    expect(await store.list(USER)).toHaveLength(1);
  });

  it('a malformed slot goes to the quarantine, once', async () => {
    const { store, storage, run } = setup();
    storage.setItem(
      `${LEGACY_KEPT_PREFIX}${USER}:2026-09-01T10:00:00.000Z`,
      'not json',
    );
    storage.setItem(
      `${LEGACY_KEPT_PREFIX}${USER}:2026-09-02T10:00:00.000Z`,
      JSON.stringify({
        keptAt: 'x',
        projectName: 'Broken',
        session: { version: 9 },
      }),
    );
    const first = await run();
    expect(first.quarantined).toBe(2);
    const sources = (await store.listQuarantine(USER)).map((q) => q.source);
    expect(sources).toEqual(['legacy-kept', 'legacy-kept']);
    expect((await run()).quarantined).toBe(0);
  });

  it('a future-schema slot imports read-only', async () => {
    const { storage, run } = setup();
    const future = JSON.parse(fixture('v2/kitchen-sink.json'));
    future.schema = SESSION_SCHEMA_VERSION + 1;
    future.compat = SESSION_SCHEMA_VERSION;
    const slot = keptSlot(
      USER,
      '2026-09-01T10:00:00.000Z',
      JSON.stringify(future),
    );
    storage.setItem(slot.key, slot.value);
    const [meta] = (await run()).imported;
    expect(draftIsReadOnly(meta, SESSION_SCHEMA_VERSION)).toBe(true);
    expect(meta.origin).toBe('kept');
  });
});

describe('unreadable entries and backups', () => {
  it('go to the quarantine under their owner, deduped', async () => {
    const { store, storage, run } = setup();
    storage.setItem(
      'musicAtlas:daw:unreadable:2026-08-01T00:00:00.000Z',
      'v1.1 junk',
    );
    storage.setItem(
      `musicAtlas:daw:unreadable:${USER}:abcd1234:2026-09-01T00:00:00.000Z`,
      'mine junk',
    );
    storage.setItem(
      'musicAtlas:daw:unreadable:bob:abcd1234:2026-09-01T00:00:00.000Z',
      'bob junk',
    );
    storage.setItem(
      `musicAtlas:daw:backup:${USER}:ffff0000:2027-01-10T00:00:00.000Z`,
      'backup',
    );
    // Past 1.3's backup lifetime (30 days before NOW): 1.3 would have expired it.
    storage.setItem(
      `musicAtlas:daw:backup:${USER}:eeee0000:2026-09-05T00:00:00.000Z`,
      'old backup',
    );
    const first = await run();
    // The backup is stored but not counted: it raises no boot notice.
    expect(first.quarantined).toBe(2);
    const mine = await store.listQuarantine(USER);
    expect(mine.map((q) => [q.source, q.raw]).sort()).toEqual([
      ['legacy-backup', 'backup'],
      ['legacy-unreadable', 'mine junk'],
    ]);
    const device = await store.listQuarantine('~device');
    expect(device.map((q) => q.raw)).toEqual(['v1.1 junk']);
    expect(device[0].at).toBe(Date.parse('2026-08-01T00:00:00.000Z'));
    expect(await store.listQuarantine('bob')).toHaveLength(0);
    expect((await run()).quarantined).toBe(0);
  });
});

describe('the legacy keys', () => {
  it('stay byte-identical, whatever is imported', async () => {
    const { storage, run } = setup();
    storage.setItem(LEGACY_AUTOSAVE_KEY, fixture('v2-1.2/kitchen-sink.json'));
    const slot = keptSlot(
      USER,
      '2026-09-01T10:00:00.000Z',
      fixture('v2/practice-dorian-d.json'),
    );
    storage.setItem(slot.key, slot.value);
    storage.setItem(
      `${LEGACY_KEPT_PREFIX}${USER}:2026-09-02T10:00:00.000Z`,
      'junk',
    );
    storage.setItem(
      'musicAtlas:daw:unreadable:2026-08-01T00:00:00.000Z',
      'v1.1 junk',
    );
    storage.setItem(
      `musicAtlas:daw:backup:${USER}:ffff0000:2026-09-05T00:00:00.000Z`,
      'backup',
    );
    const before = snapshot(storage);
    await run();
    await run();
    expect(snapshot(storage)).toEqual(before);
  });
});

describe('two imports at once', () => {
  it('import once across tabs (the import lock)', async () => {
    const { store, storage } = setup();
    storage.setItem(LEGACY_AUTOSAVE_KEY, fixture('v2/kitchen-sink.json'));
    const locks = createFakeLockManager();
    // Two "tabs": each its own store over the same database, so only the
    // import lock keeps them apart (the in-page queue is per store).
    const factory = new IDBFactory();
    const tabA = createDraftStore({ indexedDB: factory, storage: null });
    const tabB = createDraftStore({ indexedDB: factory, storage: null });
    const [a, b] = await Promise.all([
      importLegacySessions(tabA, user, { storage, locks }),
      importLegacySessions(tabB, user, { storage, locks }),
    ]);
    expect(a.imported.length + b.imported.length).toBe(1);
    expect(a.alreadyImported + b.alreadyImported).toBe(1);
    expect(await tabA.list(USER)).toHaveLength(1);
    void store;
  });

  it('(control) without the lock, two tabs would both import', async () => {
    const { storage } = setup();
    storage.setItem(LEGACY_AUTOSAVE_KEY, fixture('v2/kitchen-sink.json'));
    const factory = new IDBFactory();
    const tabA = createDraftStore({ indexedDB: factory, storage: null });
    const tabB = createDraftStore({ indexedDB: factory, storage: null });
    await Promise.all([
      importLegacySessions(tabA, user, { storage, locks: null }),
      importLegacySessions(tabB, user, { storage, locks: null }),
    ]);
    expect((await tabA.list(USER)).length).toBe(2);
  });

  it('import once in one page without navigator.locks', async () => {
    const { store, storage, run } = setup();
    storage.setItem(LEGACY_AUTOSAVE_KEY, fixture('v2/kitchen-sink.json'));
    const [a, b] = await Promise.all([run(user, null), run(user, null)]);
    expect(a.imported.length + b.imported.length).toBe(1);
    expect(await store.list(USER)).toHaveLength(1);
  });

  it('writes the draft before the ledger: a failed ledger write costs a duplicate, never the import', async () => {
    const { store, storage, run } = setup();
    storage.setItem(LEGACY_AUTOSAVE_KEY, fixture('v2/kitchen-sink.json'));
    vi.spyOn(store, 'setMetaValue').mockRejectedValueOnce(
      new Error('ledger lost'),
    );
    await expect(run()).rejects.toThrow('ledger lost');
    expect(await store.list(USER)).toHaveLength(1);
    await run();
    const ledger = await store.getMetaValue<ImportLedger>(LEGACY_IMPORT_LEDGER);
    expect(ledger?.hashes).toHaveLength(1);
    expect((await allDrafts(store, USER)).length).toBeLessThanOrEqual(2);
  });
});

describe('the ledger', () => {
  it('keeps at most 200 hashes, oldest out first', async () => {
    const { store, storage, run } = setup();
    const hashes = Array.from({ length: 200 }, (_, i) => `old-${i}`);
    await store.setMetaValue<ImportLedger>(LEGACY_IMPORT_LEDGER, {
      v: 1,
      hashes,
    });
    storage.setItem(LEGACY_AUTOSAVE_KEY, fixture('v2/kitchen-sink.json'));
    await run();
    const ledger = await store.getMetaValue<ImportLedger>(LEGACY_IMPORT_LEDGER);
    expect(ledger!.hashes).toHaveLength(200);
    expect(ledger!.hashes[0]).toBe('old-1');
    expect(ledger!.autosave?.writeSeq).toBe(1);
  });
});

describe('claimDeviceDraft', () => {
  it("re-homes a '~device' draft to the user, once; refuses anyone else's", async () => {
    const { store, storage, run } = setup();
    storage.setItem('musicAtlas:daw:prefs:someone-else', '{}');
    storage.setItem(LEGACY_AUTOSAVE_KEY, fixture('v2/kitchen-sink.json'));
    const [found] = (await run()).toDevice;
    const claimed = await claimDeviceDraft(store, found.draftId, USER);
    expect(claimed).toMatchObject({
      userKey: USER,
      claimedFrom: '~device',
      writeSeq: 1,
    });
    expect(await store.list('~device')).toHaveLength(0);
    expect(await store.list(USER)).toHaveLength(1);
    // Theirs already: unchanged. Someone else's: refused.
    expect((await claimDeviceDraft(store, found.draftId, USER))?.userKey).toBe(
      USER,
    );
    expect(await claimDeviceDraft(store, found.draftId, 'bob')).toBeNull();
    expect(await claimDeviceDraft(store, 'missing', USER)).toBeNull();
  });
});

describe('what counts as content', () => {
  const emptyWith = (patch: (data: Record<string, unknown>) => void) =>
    variant('v2/new-project.json', patch);

  it('L without tracks but with a Prism progression, a name, a tempo or mastering has content', async () => {
    const cases: ((d: Record<string, unknown>) => void)[] = [
      (d) => {
        (d.prism as Record<string, unknown>).chordSeq = [[60, 64, 67]];
      },
      (d) => {
        d.projectName = 'My Song';
      },
      (d) => {
        (d.transport as Record<string, unknown>).bpm = 90;
      },
      (d) => {
        (d.transport as Record<string, unknown>).timeSignatureNumerator = 3;
      },
      (d) => {
        d.mixer = { masteringFxChain: ['compressor'] };
      },
      (d) => {
        (d.prism as Record<string, unknown>).mode = 'dorian';
      },
    ];
    for (const patch of cases) {
      const { storage, run } = setup();
      storage.setItem(LEGACY_AUTOSAVE_KEY, emptyWith(patch));
      const [meta] = (await run()).imported;
      expect(meta.hasContent).toBe(true);
      expect(draftHasWork(meta)).toBe(true);
    }
  });

  it('a kept slot always has content, and the boot prune keeps it', async () => {
    const { store, storage, run } = setup();
    const v3 = JSON.parse(fixture('v3-all-fields/all-fields.json'));
    v3.data.tracks = [];
    v3.data.chordRegions = [];
    v3.data.markers = [];
    v3.data.notation = {};
    const slot = keptSlot(USER, '2027-01-10T10:00:00.000Z', JSON.stringify(v3));
    storage.setItem(slot.key, slot.value);
    // A second, newer no-work draft, so the kept one isn't the newest.
    storage.setItem(LEGACY_AUTOSAVE_KEY, fixture('v2/new-project.json'));
    const result = await run();
    const kept = result.imported.find((m) => m.origin === 'kept')!;
    expect(kept.hasContent).toBe(true);
    await store.prune({
      userKey: USER,
      protect: new Set(),
      reason: 'boot',
      schemaVersion: SESSION_SCHEMA_VERSION,
      now: NOW,
    });
    expect(await store.getMeta(kept.draftId)).not.toBeNull();
  });
});

describe('kept slots and the owner of a hash', () => {
  it('a slot whose content went to ~device as L claims that draft as kept work', async () => {
    const { store, storage, run } = setup();
    storage.setItem('oracle-synth-presets:someone-else', '[]');
    const raw = fixture('v2/kitchen-sink.json');
    storage.setItem(LEGACY_AUTOSAVE_KEY, raw);
    const [found] = (await run()).toDevice;
    // 1.3, in the old tab, then kept the same session for this user.
    const slot = keptSlot(USER, '2027-01-10T10:00:00.000Z', raw);
    storage.setItem(slot.key, slot.value);
    const result = await run();
    expect(result.imported).toHaveLength(1);
    expect(result.imported[0]).toMatchObject({
      draftId: found.draftId,
      userKey: USER,
      claimedFrom: '~device',
      origin: 'kept',
      keptAt: Date.parse('2027-01-10T10:00:00.000Z'),
    });
    expect(await store.list('~device')).toHaveLength(0);
    expect((await run()).imported).toHaveLength(0);
  });

  it('a slot with content another user got as L is still imported for its owner', async () => {
    const { store, storage, run } = setup();
    const raw = fixture('v2/kitchen-sink.json');
    storage.setItem(LEGACY_AUTOSAVE_KEY, raw);
    // Bob boots first on a device with nobody else: L is his.
    const bob = await run({ userId: 'bob', userKey: 'bob' });
    expect(bob.imported).toHaveLength(1);
    const slot = keptSlot(USER, '2027-01-10T10:00:00.000Z', raw);
    storage.setItem(slot.key, slot.value);
    const mine = await run();
    expect(mine.imported).toHaveLength(1);
    expect(mine.imported[0]).toMatchObject({ userKey: USER, origin: 'kept' });
    expect(await store.list('bob')).toHaveLength(1);
  });
});

describe('the unchanged-key fast path', () => {
  it('a second run neither hashes nor quarantines what it saw unchanged', async () => {
    const { store, storage, run } = setup();
    storage.setItem(LEGACY_AUTOSAVE_KEY, fixture('v2/kitchen-sink.json'));
    const slot = keptSlot(
      USER,
      '2027-01-10T10:00:00.000Z',
      fixture('v2/demo-sunset-keys.json'),
    );
    storage.setItem(slot.key, slot.value);
    storage.setItem(
      `musicAtlas:daw:unreadable:${USER}:abcd1234:2027-01-01T00:00:00.000Z`,
      'mine junk',
    );
    await run();
    const digest = vi.spyOn(globalThis.crypto.subtle, 'digest');
    const quarantine = vi.spyOn(store, 'quarantine');
    const again = await run();
    expect(again).toMatchObject({
      imported: [],
      toDevice: [],
      quarantined: 0,
      alreadyImported: 2,
    });
    expect(digest).not.toHaveBeenCalled();
    expect(quarantine).not.toHaveBeenCalled();
    // A changed L is looked at again.
    storage.setItem(LEGACY_AUTOSAVE_KEY, fixture('v2/demo-first-light.json'));
    expect((await run()).imported).toHaveLength(1);
    expect(digest).toHaveBeenCalled();
  });

  it('keeps other users’ stamps and forgets keys that are gone', async () => {
    const { store, storage, run } = setup();
    storage.setItem(
      'musicAtlas:daw:unreadable:bob:abcd1234:2027-01-01T00:00:00.000Z',
      'bob junk',
    );
    await run({ userId: 'bob', userKey: 'bob' });
    storage.setItem(LEGACY_AUTOSAVE_KEY, fixture('v2/kitchen-sink.json'));
    await run();
    let ledger = await store.getMetaValue<ImportLedger>(LEGACY_IMPORT_LEDGER);
    expect(Object.keys(ledger!.seen!).sort()).toEqual([
      LEGACY_AUTOSAVE_KEY,
      'musicAtlas:daw:unreadable:bob:abcd1234:2027-01-01T00:00:00.000Z',
    ]);
    storage.removeItem(
      'musicAtlas:daw:unreadable:bob:abcd1234:2027-01-01T00:00:00.000Z',
    );
    await run();
    ledger = await store.getMetaValue<ImportLedger>(LEGACY_IMPORT_LEDGER);
    expect(Object.keys(ledger!.seen!)).toEqual([LEGACY_AUTOSAVE_KEY]);
  });
});

describe('the import lock wait', () => {
  it('imports anyway after lockWaitMs when another tab holds the lock', async () => {
    const { store, storage } = setup();
    storage.setItem(LEGACY_AUTOSAVE_KEY, fixture('v2/kitchen-sink.json'));
    const locks = createFakeLockManager();
    const release = locks.holdElsewhere(IMPORT_LOCK);
    const started = Date.now();
    const result = await importLegacySessions(store, user, {
      storage,
      now: () => NOW,
      locks,
      lockWaitMs: 50,
    });
    expect(Date.now() - started).toBeLessThan(2000);
    expect(result.imported).toHaveLength(1);
    release();
  });
});

describe('claimDeviceDraftsInAccount', () => {
  it("claims the '~device' drafts whose project is in the user's account", async () => {
    const { store, storage, run } = setup();
    storage.setItem('oracle-synth-presets:someone-else', '[]');
    storage.setItem(
      LEGACY_AUTOSAVE_KEY,
      variant('v2/kitchen-sink.json', (d) => {
        d.projectId = 'proj-mine';
      }),
    );
    const [found] = (await run()).toDevice;
    expect(found.projectId).toBe('proj-mine');
    expect(
      await claimDeviceDraftsInAccount(store, USER, ['proj-other']),
    ).toEqual([]);
    const claimed = await claimDeviceDraftsInAccount(store, USER, [
      'proj-mine',
    ]);
    expect(claimed.map((m) => [m.draftId, m.userKey])).toEqual([
      [found.draftId, USER],
    ]);
    expect(await store.list('~device')).toHaveLength(0);
    expect(await claimDeviceDraftsInAccount(store, '~device', ['x'])).toEqual(
      [],
    );
  });
});
