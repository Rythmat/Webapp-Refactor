// @vitest-environment jsdom
/**
 * The DraftSessionPort (milestone 1.4, E3, E4, E5, E10): what happens to
 * drafts when sessions open and are replaced.
 *
 * Each open is driven the way openSession drives it: claim (and read), then
 * flushOutgoing and retireOutgoing (keeping), resetProjectState and activate
 * (switching), apply or a seed (loading), markDocumentBaseline and begin
 * (baselining). The real editor store, codec and save status; the real draft
 * store over fake-indexeddb; a fake LockManager with Chromium's rules (so
 * another tab can hold a draft's lock). A "reload" forgets the controller
 * (its lock goes, as a closed page's does) and keeps storage.
 *
 * Run: npx vitest run src/daw/persistence/drafts/__tests__/draftSessionPort.test.ts
 */
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { setLastSaved, useCloudSaveStore } from '@/daw/commands/cloudSaveStore';
import { cloudOpenedRecord } from '@/daw/commands/lastSaved';
import { useSynthStore } from '@/daw/oracle-synth/store';
import { resetProjectState } from '@/daw/persistence/projectDocument/initialState';
import {
  documentFingerprint,
  markDocumentBaseline,
  useSaveStatusStore,
} from '@/daw/persistence/saveStatusStore';
import { serializeSession } from '@/daw/persistence/SessionSerializer';
import { getSessionGeneration } from '@/daw/session/sessionGeneration';
import {
  INITIAL_SESSION_STATE,
  useSessionStore,
} from '@/daw/session/sessionStore';
import type { DraftClaim, SessionUser } from '@/daw/session/types';
import { useStore } from '@/daw/store';
import {
  DEVICE_USER_KEY,
  setLocalStoreUser,
} from '@/lib/local-store/userScope';
import {
  ACTIVE_DRAFT_KEY,
  readActiveDraft,
} from '@/lib/studio-projects/drafts/activeDraft';
import {
  DRAFT_LOCK_PREFIX,
  setDefaultLockManager,
} from '@/lib/studio-projects/drafts/draftLock';
import {
  mirrorKey,
  readMirrors,
  reconcileMirror,
  writeMirror,
} from '@/lib/studio-projects/drafts/draftMirror';
import {
  createDraftStore,
  type DraftStore,
} from '@/lib/studio-projects/drafts/draftStore';
import { hashFingerprint } from '@/lib/studio-projects/drafts/fingerprintHash';
import {
  DraftStorageError,
  type DraftBaseline,
  type DraftMeta,
  type DraftWrite,
} from '@/lib/studio-projects/drafts/types';
import { MemoryStorage } from '@/lib/studio-projects/drafts/__tests__/draftTestUtils';
import {
  createFakeLockManager,
  type FakeLockManager,
} from '@/lib/studio-projects/drafts/__tests__/fakeLocks';
import {
  flushDraftNow,
  pageProtectedDraftIds,
  resetDraftAutosaveForTests,
  setDraftStoreForTests,
  startDraftAutosave,
  whenDraftWritesSettled,
} from '../autosave';
import {
  getDraftSessionPort,
  resetDraftSessionPortForTests,
} from '../draftSessionPort';
import { useDraftStatusStore } from '../draftStatusStore';
import { resetPendingMediaForTests } from '../pendingMedia';
import { bodyContent } from '../snapshot';

vi.mock('@/util/toast', () => ({
  showNotice: vi.fn(() => 1),
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

const USER: SessionUser = { userId: 'student-1', userKey: 'student-1' };
const OTHER: SessionUser = { userId: 'student-2', userKey: 'student-2' };
const port = getDraftSessionPort();
const s = () => useStore.getState();

let factory: IDBFactory;
let store: DraftStore;
let locks: FakeLockManager;
let stopController: (() => void) | null = null;

beforeAll(() => {
  (globalThis as { IDBKeyRange?: unknown }).IDBKeyRange = IDBKeyRange;
});

function resetStores(): void {
  useDraftStatusStore.setState(useDraftStatusStore.getInitialState(), true);
  useSessionStore.setState({ ...INITIAL_SESSION_STATE }, true);
  useCloudSaveStore.setState(useCloudSaveStore.getInitialState(), true);
  useSynthStore.setState(useSynthStore.getInitialState(), true);
  useStore.setState(useStore.getInitialState(), true);
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  locks = createFakeLockManager();
  setDefaultLockManager(() => locks);
  resetDraftAutosaveForTests();
  resetDraftSessionPortForTests();
  resetPendingMediaForTests();
  resetStores();
  factory = new IDBFactory();
  store = createDraftStore({
    indexedDB: factory,
    storage: new MemoryStorage(),
  });
  setDraftStoreForTests(store);
  stopController = startDraftAutosave();
});

afterEach(async () => {
  stopController?.();
  stopController = null;
  await whenDraftWritesSettled();
  resetDraftAutosaveForTests();
  setDraftStoreForTests(null);
  setDefaultLockManager(null);
});

// ── Driving opens the way openSession does ─────────────────────────────────

const TEMPLATE: DraftBaseline = {
  source: 'template',
  ref: 'project-pop',
  reopenable: true,
  fingerprint: null,
};
const JAM: DraftBaseline = {
  source: 'jam',
  reopenable: false,
  fingerprint: null,
};
const COLLAB: DraftBaseline = {
  source: 'collab',
  reopenable: false,
  fingerprint: null,
};

interface Opened {
  draftId: string;
  kept: DraftMeta | null;
  begun: DraftMeta | null;
}

/** Keep the outgoing session, then open `claim` (seeded or applied). */
async function switchTo(
  claim: DraftClaim,
  load: () => void,
  baseline: DraftBaseline,
  opts: { keep?: 'auto' | 'discard'; savedComplete?: boolean } = {},
): Promise<Opened> {
  await port.flushOutgoing('test');
  const kept = await port.retireOutgoing(opts.keep ?? 'auto');
  resetProjectState('open:test');
  port.activate(claim);
  load();
  markDocumentBaseline({ savedComplete: opts.savedComplete ?? true });
  const begun = await port.begin(baseline);
  return { draftId: claim.draftId, kept, begun };
}

/** A new session seeded by `seed`. */
async function openNew(
  seed: () => void,
  baseline: DraftBaseline = TEMPLATE,
  opts: { keep?: 'auto' | 'discard' } = {},
): Promise<Opened> {
  const claim = await port.claim(USER, { boot: false });
  return switchTo(claim, seed, baseline, opts);
}

/** Open a stored draft. */
async function openDraft(
  draftId: string,
  opts: { boot?: boolean; user?: SessionUser } = {},
): Promise<Opened & { claim: DraftClaim }> {
  const claim = await port.claim(opts.user ?? USER, {
    draftId,
    boot: opts.boot ?? false,
  });
  const prepared = await port.read(claim);
  const opened = await switchTo(
    claim,
    () => port.apply(prepared),
    { source: 'import', reopenable: false, fingerprint: null },
    { savedComplete: false },
  );
  return { ...opened, claim };
}

const seedTemplate = () => {
  const keys = s().addTrack('midi', 'piano-sampler', 'Keys');
  s().addMidiClip(keys, { id: 'clip-1', startTick: 0, events: [] });
  s().setProjectName('Pop Template');
};

const edit = () => s().setBpm(97);

async function flush(): Promise<void> {
  await flushDraftNow();
  await whenDraftWritesSettled();
}

/** Forget this page (its locks go); storage stays, as after a reload. */
function reload(): void {
  stopController?.();
  resetDraftAutosaveForTests();
  resetDraftSessionPortForTests();
  resetPendingMediaForTests();
  resetStores();
  stopController = startDraftAutosave();
}

/** The live session's text, as a draft body. */
const sessionText = () => JSON.stringify(serializeSession());

/** Store a draft directly (another tab's, an import). */
async function storeDraft(
  draftId: string,
  extra: Partial<DraftWrite['meta']> = {},
  text = sessionText(),
  updatedAt?: number,
): Promise<DraftMeta> {
  return store.write({
    meta: {
      draftId,
      userKey: USER.userKey,
      origin: 'session',
      createdAt: 0,
      schema: 3,
      name: s().projectName,
      trackCount: s().tracks.length,
      chars: text.length,
      docFingerprint: hashFingerprint(documentFingerprint()),
      hasContent: true,
      baseline: { source: 'import', reopenable: false, fingerprint: null },
      media: [],
      mediaMissing: 0,
      ...extra,
    },
    text,
    expectedSeq: null,
    updatedAt,
  });
}

// ── Keeping (the old keptSessions invariants) ──────────────────────────────

describe('keeping the outgoing session', () => {
  it.each([
    {
      name: 'a pristine template is removed',
      baseline: TEMPLATE,
      change: () => {},
      keep: 'auto' as const,
      kept: false,
    },
    {
      name: 'an edited template is kept',
      baseline: TEMPLATE,
      change: edit,
      keep: 'auto' as const,
      kept: true,
    },
    {
      name: 'a jam (not reopenable) is kept',
      baseline: JAM,
      change: () => {},
      keep: 'auto' as const,
      kept: true,
    },
    {
      name: 'a collab session (not reopenable) is kept',
      baseline: COLLAB,
      change: () => {},
      keep: 'auto' as const,
      kept: true,
    },
    {
      name: 'discard removes even edited work',
      baseline: TEMPLATE,
      change: edit,
      keep: 'discard' as const,
      kept: false,
    },
  ])('$name', async ({ baseline, change, keep, kept }) => {
    const first = await openNew(seedTemplate, baseline);
    change();
    const second = await openNew(() => {}, TEMPLATE, { keep });

    const stored = await store.getMeta(first.draftId);
    if (kept) {
      expect(second.kept?.draftId).toBe(first.draftId);
      expect(stored).toMatchObject({ origin: 'kept' });
      expect(stored?.keptAt).toBeTypeOf('number');
    } else {
      expect(second.kept).toBeNull();
      expect(stored).toBeNull();
    }
    // Its lock went with it.
    expect(locks.heldNames()).not.toContain(DRAFT_LOCK_PREFIX + first.draftId);
  });

  it.each([
    { name: 'a complete cloud save makes it a cache: removed', complete: true },
    { name: 'a save that left things out keeps it', complete: false },
  ])('$name', async ({ complete }) => {
    const first = await openNew(seedTemplate);
    edit();
    s().setProjectId('project-1');
    await flush();
    useCloudSaveStore.setState({
      lastSaved: {
        projectId: 'project-1',
        fingerprint: hashFingerprint(documentFingerprint()),
        version: useSaveStatusStore.getState().documentVersion,
        complete,
        updatedAt: '2026-10-08T00:00:00.000Z',
        at: Date.now(),
        generation: getSessionGeneration(),
      },
    });
    await whenDraftWritesSettled();
    const second = await openNew(() => {});

    if (complete) {
      expect(second.kept).toBeNull();
      expect(await store.getMeta(first.draftId)).toBeNull();
    } else {
      expect(second.kept?.draftId).toBe(first.draftId);
    }
  });

  it('keeps a restored kept draft as the only copy', async () => {
    const first = await openNew(seedTemplate);
    edit();
    await openNew(() => {});
    expect((await store.getMeta(first.draftId))?.origin).toBe('kept');

    const restored = await openDraft(first.draftId);

    const all = await store.list(USER.userKey);
    expect(all.map((m) => m.draftId)).toEqual([first.draftId]);
    expect(all[0]).toMatchObject({ origin: 'session' });
    expect(all[0].keptAt).toBeUndefined();
    expect(restored.begun?.writeSeq).toBeGreaterThan(1);
    expect(s().bpm).toBe(97);
  });
});

// ── Opening drafts ─────────────────────────────────────────────────────────

describe('opening a draft', () => {
  it('adopts the claimed draft: same record, origin session, its lock held', async () => {
    seedTemplate();
    s().setProjectId('project-7');
    const stored = await storeDraft('d-adopt', {
      origin: 'migrated',
      projectId: 'project-7',
    });
    resetStores();

    const opened = await openDraft('d-adopt', { boot: true });

    expect(opened.claim.mode).toBe('existing');
    expect(opened.begun).toMatchObject({
      draftId: 'd-adopt',
      origin: 'session',
      writeSeq: stored.writeSeq + 1,
    });
    expect(s().projectName).toBe('Pop Template');
    expect(s().projectId).toBe('project-7');
    expect(locks.heldNames()).toContain(DRAFT_LOCK_PREFIX + 'd-adopt');
    expect(readActiveDraft()).toEqual({
      draftId: 'd-adopt',
      userKey: USER.userKey,
    });
    expect(useSessionStore.getState().draftId).toBe('d-adopt');
  });

  it('claims a draft found on this device when it opens', async () => {
    seedTemplate();
    await storeDraft('d-device', { userKey: DEVICE_USER_KEY });
    resetStores();

    const opened = await openDraft('d-device');

    expect(opened.begun).toMatchObject({
      userKey: USER.userKey,
      claimedFrom: DEVICE_USER_KEY,
    });
    expect(await store.list(DEVICE_USER_KEY)).toEqual([]);
  });

  it('forks a draft another tab holds: a copy named so, with no project', async () => {
    seedTemplate();
    s().setProjectName('Song');
    s().setProjectId('project-3');
    await storeDraft('d-other', {
      projectId: 'project-3',
      cloud: {
        projectId: 'project-3',
        updatedAt: null,
        savedFingerprint: 'h1:x',
        savedComplete: true,
        savedAt: 1,
      },
    });
    resetStores();
    const release = locks.holdElsewhere(DRAFT_LOCK_PREFIX + 'd-other');

    const opened = await openDraft('d-other');

    expect(opened.claim.mode).toBe('fork');
    expect(opened.claim.sourceDraftId).toBe('d-other');
    expect(opened.draftId).not.toBe('d-other');
    expect(s().projectName).toBe('Song (copy)');
    expect(s().projectId).toBeNull();
    const fork = opened.begun!;
    expect(fork).toMatchObject({ origin: 'fork', forkedFrom: 'd-other' });
    expect(fork.projectId).toBeUndefined();
    expect(fork.cloud).toBeUndefined();
    // An untouched copy is a cache: pristine against its own baseline.
    expect(fork.baseline.reopenable).toBe(true);
    expect(fork.baseline.fingerprint).toBe(fork.docFingerprint);
    // The other tab's draft is left as it was.
    expect((await store.getMeta('d-other'))?.writeSeq).toBe(1);
    release();
  });

  it.each([
    {
      name: 'a missing draft',
      setup: async () => {},
      id: 'd-none',
      kind: 'not-found',
    },
    {
      name: 'another user’s draft',
      setup: () => storeDraft('d-theirs', { userKey: OTHER.userKey }),
      id: 'd-theirs',
      kind: 'not-found',
    },
    {
      name: 'a draft a newer build wrote',
      setup: () => storeDraft('d-newer', { schema: 99 }),
      id: 'd-newer',
      kind: 'readonly',
    },
    {
      name: 'a body that is not JSON',
      setup: () => storeDraft('d-junk', {}, 'not json'),
      id: 'd-junk',
      kind: 'corrupt',
    },
    {
      name: 'a body this build can’t load',
      setup: () => storeDraft('d-future', {}, '{"version":9,"data":1}'),
      id: 'd-future',
      kind: 'corrupt',
    },
  ])('refuses $name ($kind)', async ({ setup, id, kind }) => {
    await setup();
    const claim = await port.claim(USER, { draftId: id, boot: false });
    await expect(port.read(claim)).rejects.toMatchObject({ kind });
    port.release(claim);
    if (kind === 'corrupt') {
      // Kept whole in the quarantine, gone from the drafts.
      const quarantined = await store.listQuarantine(USER.userKey);
      expect(quarantined.map((q) => q.draftId)).toEqual([id]);
      expect(await store.getMeta(id)).toBeNull();
    }
    await vi.waitFor(() =>
      expect(locks.heldNames()).not.toContain(DRAFT_LOCK_PREFIX + id),
    );
  });

  // Critique: a refresh whose old page still held the lock at prepareUser.
  it('reconciles the draft’s mirror under the lock its claim waited for', async () => {
    seedTemplate();
    await storeDraft('d-mirror'); // S1 in IndexedDB
    s().setBpm(133); // S2, only in the old page's mirror
    const s2 = sessionText();
    writeMirror({
      v: 1,
      draftId: 'd-mirror',
      userKey: USER.userKey,
      baseSeq: 1,
      writeSeq: 2,
      at: Date.now(),
      writerDoc: 'old-page',
      meta: {
        draftId: 'd-mirror',
        userKey: USER.userKey,
        origin: 'session',
        createdAt: 0,
        schema: 3,
        name: 'Pop Template',
        trackCount: 1,
        chars: s2.length,
        docFingerprint: hashFingerprint(documentFingerprint()),
        hasContent: true,
        baseline: { source: 'import', reopenable: false, fingerprint: null },
        media: [],
        mediaMissing: 0,
      },
      text: s2,
    });
    resetStores();
    sessionStorage.setItem(
      ACTIVE_DRAFT_KEY,
      JSON.stringify({ draftId: 'd-mirror', userKey: USER.userKey }),
    );
    // The old page lets go of the lock a little after the new one prepares.
    const release = locks.holdElsewhere(DRAFT_LOCK_PREFIX + 'd-mirror');
    await port.prepareUser(USER);
    expect(
      localStorage.getItem(mirrorKey(USER.userKey, 'd-mirror')),
    ).not.toBeNull();
    setTimeout(release, 200);

    expect(await port.chooseResume(USER)).toBe('d-mirror');
    const opened = await openDraft('d-mirror', { boot: true });

    expect(opened.claim.mode).toBe('existing');
    expect(s().bpm).toBe(133);
    expect(
      localStorage.getItem(mirrorKey(USER.userKey, 'd-mirror')),
    ).toBeNull();
  });

  // R16 quotaReopenHonest: a reload while storage is full.
  it('opens the mirror’s newer copy when storage can’t take it, and says so', async () => {
    seedTemplate();
    const s1 = await storeDraft('d-full'); // S1 in IndexedDB
    s().setBpm(141); // S2, only in the old page's mirror
    const s2 = sessionText();
    writeMirror({
      v: 1,
      draftId: 'd-full',
      userKey: USER.userKey,
      baseSeq: s1.writeSeq,
      writeSeq: s1.writeSeq + 1,
      at: Date.now(),
      writerDoc: 'old-page',
      meta: {
        ...(s1 as unknown as DraftWrite['meta']),
        chars: s2.length,
      },
      text: s2,
    });
    resetStores();
    let full = true;
    setDraftStoreForTests({
      ...store,
      kind: store.kind,
      write: (w) =>
        full
          ? Promise.reject(new DraftStorageError('quota', 'full'))
          : store.write(w),
    });

    const opened = await openDraft('d-full');

    // The newest edit is open, the stored record is as it was, the mirror
    // stays, and the chip hears the storage error (never "Saved").
    expect(opened.claim.mode).toBe('existing');
    expect(s().bpm).toBe(141);
    expect((await store.getMeta('d-full'))?.writeSeq).toBe(s1.writeSeq);
    expect(
      localStorage.getItem(mirrorKey(USER.userKey, 'd-full')),
    ).not.toBeNull();
    expect(useDraftStatusStore.getState().error).toBe('quota');

    // Room again: the retry writes it over the record, and the mirror goes.
    full = false;
    useDraftStatusStore.getState().retry?.();
    await vi.waitFor(async () =>
      expect((await store.getMeta('d-full'))?.writeSeq).toBe(s1.writeSeq + 1),
    );
    await whenDraftWritesSettled();
    expect(bodyContent((await store.readBody('d-full'))!.text)).toBe(
      bodyContent(sessionText()),
    );
    expect(useDraftStatusStore.getState().error).toBeNull();
    expect(localStorage.getItem(mirrorKey(USER.userKey, 'd-full'))).toBeNull();
  });
});

// ── Choosing what to resume ────────────────────────────────────────────────

describe('choosing what a plain boot resumes', () => {
  it('resumes the last session over newer kept slots (first 1.4 boot)', async () => {
    seedTemplate();
    await storeDraft('L', { origin: 'migrated' }, undefined, 1_000);
    for (const [i, id] of ['k1', 'k2', 'k3'].entries()) {
      await storeDraft(
        id,
        { origin: 'kept', keptAt: 2_000 + i },
        undefined,
        2_000 + i,
      );
    }
    expect(await port.chooseResume(USER)).toBe('L');
  });

  it('follows this tab’s pointer first, for its own user only', async () => {
    seedTemplate();
    await storeDraft('older', { origin: 'migrated' }, undefined, 1_000);
    await storeDraft('newer', { origin: 'migrated' }, undefined, 2_000);
    sessionStorage.setItem(
      ACTIVE_DRAFT_KEY,
      JSON.stringify({ draftId: 'older', userKey: USER.userKey }),
    );
    expect(await port.chooseResume(USER)).toBe('older');
    sessionStorage.setItem(
      ACTIVE_DRAFT_KEY,
      JSON.stringify({ draftId: 'older', userKey: OTHER.userKey }),
    );
    expect(await port.chooseResume(USER)).toBe('newer');
  });

  it('never resumes a draft another tab has open', async () => {
    seedTemplate();
    await storeDraft('busy');
    const release = locks.holdElsewhere(DRAFT_LOCK_PREFIX + 'busy');
    expect(await port.chooseResume(USER)).toBeNull();
    release();
  });

  it('falls back to kept work when there is nothing else', async () => {
    seedTemplate();
    await storeDraft('only-kept', { origin: 'kept', keptAt: 5 });
    expect(await port.chooseResume(USER)).toBe('only-kept');
  });

  it('finds this device’s unsaved changes to a project', async () => {
    seedTemplate();
    const at = (updatedAt: number) => [undefined, updatedAt] as const;
    const migrated = { origin: 'migrated' as const, projectId: 'P' };
    await storeDraft('p-old', migrated, ...at(1_000));
    await storeDraft('p-room', { ...migrated, roomId: 'room-1' }, ...at(3_000));
    await storeDraft('p-new', migrated, ...at(2_000));
    await storeDraft('q', { ...migrated, projectId: 'Q' }, ...at(4_000));
    expect((await port.findProjectDraft(USER, 'P'))?.draftId).toBe('p-new');
    expect(await port.findProjectDraft(USER, 'Z')).toBeNull();
  });
});

// ── Forks after a write conflict, cloud links, deletes ─────────────────────

describe('the live draft', () => {
  it('moves the session, the pointer and the lock when a conflict forks it', async () => {
    const first = await openNew(seedTemplate);
    // Another writer (another tab) writes the same draft.
    const meta: Partial<DraftMeta> = {
      ...(await store.getMeta(first.draftId))!,
    };
    const seq = meta.writeSeq!;
    for (const key of [
      'v',
      'writeSeq',
      'updatedAt',
      'writer',
      'contentHash',
    ] as const)
      delete meta[key];
    // Same database, another writer document.
    await rewriteAs(
      first.draftId,
      'other-tab',
      meta as DraftWrite['meta'],
      seq,
    );

    edit();
    await flush();

    const forkId = useDraftStatusStore.getState().draftId!;
    expect(forkId).not.toBe(first.draftId);
    expect(useSessionStore.getState().draftId).toBe(forkId);
    expect(readActiveDraft()?.draftId).toBe(forkId);
    expect(port.activeDraftId()).toBe(forkId);
    expect(locks.heldNames()).toContain(DRAFT_LOCK_PREFIX + forkId);
    expect(locks.heldNames()).not.toContain(DRAFT_LOCK_PREFIX + first.draftId);
    expect(await port.deleteDraft(forkId)).toBe('refused');
  });

  it('forgets a deleted project: reopened, the draft has no project', async () => {
    const first = await openNew(seedTemplate);
    s().setProjectId('project-x');
    edit();
    await flush();
    expect((await store.getMeta(first.draftId))?.projectId).toBe('project-x');

    // File ▸ Delete: the server copy is gone; the session stays on device.
    s().setProjectId(null);
    await port.patchCloud(first.draftId, { projectId: null, cloud: null });
    expect((await store.getMeta(first.draftId))?.projectId).toBeUndefined();

    reload();
    await openDraft(first.draftId, { boot: true });
    expect(s().projectId).toBeNull();
  });

  it('records a minted project on the outgoing draft (patchCloud)', async () => {
    const first = await openNew(seedTemplate);
    edit();
    await openNew(() => {});
    await port.patchCloud(first.draftId, {
      projectId: 'minted',
      cloud: {
        projectId: 'minted',
        updatedAt: null,
        savedFingerprint: 'h1:0',
        savedComplete: false,
        savedAt: 1,
      },
    });
    expect(await store.getMeta(first.draftId)).toMatchObject({
      projectId: 'minted',
      cloud: { projectId: 'minted' },
      origin: 'kept',
    });
  });

  it('refuses to delete the open draft or one another tab has', async () => {
    const live = await openNew(seedTemplate);
    await storeDraft('elsewhere');
    await storeDraft('loose');
    writeMirror({
      v: 1,
      draftId: 'loose',
      userKey: USER.userKey,
      baseSeq: 1,
      writeSeq: 2,
      at: 1,
      meta: (await store.getMeta('loose'))! as unknown as DraftWrite['meta'],
      text: '{}',
    });
    const release = locks.holdElsewhere(DRAFT_LOCK_PREFIX + 'elsewhere');
    setLocalStoreUser(USER.userId);
    try {
      expect(await port.deleteDraft(live.draftId)).toBe('refused');
      expect(await port.deleteDraft('elsewhere')).toBe('refused');
      expect(await port.deleteDraft('loose')).toBe('deleted');
      expect(await store.getMeta('loose')).toBeNull();
      expect(localStorage.getItem(mirrorKey(USER.userKey, 'loose'))).toBeNull();
    } finally {
      setLocalStoreUser(undefined);
      release();
    }
  });

  it('refuses to delete another user’s draft, a found one, or any while the user is unknown', async () => {
    await storeDraft('mine');
    await storeDraft('theirs', { userKey: OTHER.userKey });
    await storeDraft('found', { userKey: DEVICE_USER_KEY });

    expect(await port.deleteDraft('mine')).toBe('refused');
    setLocalStoreUser(USER.userId);
    try {
      expect(await port.deleteDraft('theirs')).toBe('refused');
      expect(await port.deleteDraft('found')).toBe('refused');
      expect(await port.deleteDraft('mine')).toBe('deleted');
    } finally {
      setLocalStoreUser(undefined);
    }
    expect(await store.getMeta('theirs')).not.toBeNull();
    expect(await store.getMeta('found')).not.toBeNull();
    expect(await store.getMeta('mine')).toBeNull();
  });

  it('turns kept work back into the session’s own (unkeep)', async () => {
    const first = await openNew(seedTemplate);
    edit();
    await openNew(() => {});
    await port.unkeep(first.draftId);
    const meta = await store.getMeta(first.draftId);
    expect(meta?.origin).toBe('session');
    expect(meta?.keptAt).toBeUndefined();
  });

  it('flushOutgoing throws only when the outgoing session has work', async () => {
    await openNew(seedTemplate);
    const write = vi
      .spyOn(store, 'write')
      .mockRejectedValue(new DraftStorageError('unavailable', 'closed'));
    // An untouched template (only the view moved): nothing would be lost,
    // so the failure is swallowed.
    s().setTimelineZoom(3);
    await expect(port.flushOutgoing('test')).resolves.toBeNull();

    // Edited: the open must be refused, and the session goes on writing.
    resetDraftAutosaveForTests();
    stopController = startDraftAutosave();
    write.mockRestore();
    await openNew(seedTemplate);
    edit();
    vi.spyOn(store, 'write').mockRejectedValue(
      new DraftStorageError('unavailable', 'closed'),
    );
    await expect(port.flushOutgoing('test')).rejects.toMatchObject({
      kind: 'unavailable',
    });
    expect(useDraftStatusStore.getState().paused).toBe(false);
  });
});

// ── Review fixes: cloud links at begin, chains across a reload, own claims ─

describe('the open’s links and chains', () => {
  // E11: a project opened from the account starts its draft linked.
  it('keeps the cloud record the open set before begin', async () => {
    const claim = await port.claim(USER, { boot: false });
    await port.flushOutgoing('test');
    await port.retireOutgoing('auto');
    resetProjectState('open:project');
    port.activate(claim);
    seedTemplate();
    s().setProjectId('P');
    markDocumentBaseline({ savedComplete: true });
    const record = cloudOpenedRecord({
      id: 'P',
      updatedAt: '2026-10-01T09:00:00.000Z',
    });
    setLastSaved(record);
    const begun = await port.begin({
      source: 'project',
      ref: 'P',
      reopenable: true,
      fingerprint: null,
    });

    expect(begun?.cloud).toMatchObject({
      projectId: 'P',
      updatedAt: '2026-10-01T09:00:00.000Z',
    });
    // Edited and left: E11 finds the draft, and its link still matches.
    edit();
    await flush();
    reload();
    // (The closed page's lock goes a moment later.)
    await vi.waitFor(async () =>
      expect((await port.findProjectDraft(USER, 'P'))?.draftId).toBe(
        claim.draftId,
      ),
    );
    const found = await port.findProjectDraft(USER, 'P');
    expect(found?.cloud?.updatedAt).toBe(record.updatedAt);
  });

  // A reload adopted a record the previous page wrote; this page's first
  // write was still in flight when it died.
  it('applies the mirror over an adopted record another page wrote', async () => {
    seedTemplate();
    const oldPage = createDraftStore({
      indexedDB: factory,
      storage: new MemoryStorage(),
      writerDoc: 'old-page',
    });
    const text = sessionText();
    await oldPage.write({
      meta: {
        draftId: 'd-chain',
        userKey: USER.userKey,
        origin: 'session',
        createdAt: 0,
        schema: 3,
        name: s().projectName,
        trackCount: s().tracks.length,
        chars: text.length,
        docFingerprint: hashFingerprint(documentFingerprint()),
        hasContent: true,
        baseline: { source: 'import', reopenable: false, fingerprint: null },
        media: [],
        mediaMissing: 0,
      },
      text,
      expectedSeq: null,
    });
    resetStores();

    const claim = await port.claim(USER, { draftId: 'd-chain', boot: true });
    const prepared = await port.read(claim);
    resetProjectState('open:test');
    port.activate(claim);
    port.apply(prepared);
    markDocumentBaseline({ savedComplete: false });
    // begin's adopt write never lands: the page dies.
    vi.spyOn(store, 'write').mockImplementationOnce(
      () => new Promise(() => {}),
    );
    const write = vi.mocked(store.write);
    void port.begin({ source: 'import', reopenable: false, fingerprint: null });
    await vi.waitFor(() => expect(write).toHaveBeenCalled());
    s().setBpm(141);
    window.dispatchEvent(new Event('pagehide'));
    const [mirror] = readMirrors(USER.userKey);
    expect(mirror?.entry?.baseSeq).toBe(2);
    expect(mirror?.entry?.chainFromSeq).toBe(1);

    const result = await reconcileMirror(store, USER.userKey, 'd-chain');
    expect(result.outcome).toBe('applied');
    expect(result.recoveredId).toBeUndefined();
    expect((await store.readBody('d-chain'))!.text).toContain('"bpm":141');
    expect((await store.list(USER.userKey)).map((m) => m.draftId)).toEqual([
      'd-chain',
    ]);
    resetDraftAutosaveForTests();
  });

  it('flushes the live draft before a claim of it is read', async () => {
    const first = await openNew(seedTemplate);
    s().setBpm(88); // not written yet
    const claim = await port.claim(USER, {
      draftId: first.draftId,
      boot: false,
    });
    const prepared = await port.read(claim);
    expect(prepared.body.text).toContain('"bpm":88');
    port.release(claim);
  });

  it('resumes a pointer draft that only has a mirror', async () => {
    seedTemplate();
    s().setBpm(121);
    const text = sessionText();
    sessionStorage.setItem(
      ACTIVE_DRAFT_KEY,
      JSON.stringify({ draftId: 'd-ghost', userKey: USER.userKey }),
    );
    writeMirror({
      v: 1,
      draftId: 'd-ghost',
      userKey: USER.userKey,
      baseSeq: 0,
      writeSeq: 1,
      at: Date.now(),
      writerDoc: 'old-page',
      meta: {
        draftId: 'd-ghost',
        userKey: USER.userKey,
        origin: 'session',
        createdAt: 0,
        schema: 3,
        name: 'Ghost',
        trackCount: s().tracks.length,
        chars: text.length,
        docFingerprint: hashFingerprint(documentFingerprint()),
        hasContent: true,
        baseline: { source: 'new', reopenable: true, fingerprint: null },
        media: [],
        mediaMissing: 0,
      },
      text,
    });
    resetStores();

    expect(await port.chooseResume(USER)).toBe('d-ghost');
    const opened = await openDraft('d-ghost', { boot: true });
    expect(opened.claim.mode).toBe('existing');
    expect(s().bpm).toBe(121);
    expect(localStorage.getItem(mirrorKey(USER.userKey, 'd-ghost'))).toBeNull();
  });

  it('holds the retired draft’s lock until the open switches', async () => {
    const first = await openNew(seedTemplate);
    edit();
    const claim = await port.claim(USER, { boot: false });
    await port.flushOutgoing('test');
    await port.retireOutgoing('auto');
    expect(locks.heldNames()).toContain(DRAFT_LOCK_PREFIX + first.draftId);
    resetProjectState('open:test');
    port.activate(claim);
    await vi.waitFor(() =>
      expect(locks.heldNames()).not.toContain(
        DRAFT_LOCK_PREFIX + first.draftId,
      ),
    );
  });
});

// ── prepareUser and the Projects listing ──────────────────────────────────

describe('preparing a user', () => {
  it('runs once per page and user, and records the visit', async () => {
    const imports = vi.spyOn(store, 'setMetaValue');
    await port.prepareUser(USER);
    await port.prepareUser(USER);
    expect(
      imports.mock.calls.filter(([key]) => key === `user:${USER.userKey}`),
    ).toHaveLength(1);
    expect(await store.getMetaValue(`user:${USER.userKey}`)).toMatchObject({
      lastSeenAt: expect.any(Number),
    });
  });

  it('keeps the draft an open names from the boot prune', async () => {
    seedTemplate();
    // Drafts without work, newest last (and last by id): the boot prune
    // removes all but the newest.
    await storeDraft('a-named', { hasContent: false });
    await storeDraft('b-other', { hasContent: false });
    await storeDraft('c-newest', { hasContent: false });
    await port.prepareUser(USER, undefined, { protect: ['a-named'] });
    expect((await store.list(USER.userKey)).map((m) => m.draftId)).toEqual([
      'c-newest',
      'a-named',
    ]);
    // Only while the prepare runs: the claim protects it from then on.
    expect(pageProtectedDraftIds().has('a-named')).toBe(false);
  });

  it('applies an unlocked draft’s mirror and reports a recovered one', async () => {
    seedTemplate();
    await storeDraft('d-m');
    s().setBpm(150);
    const text = sessionText();
    writeMirror({
      v: 1,
      draftId: 'd-m',
      userKey: USER.userKey,
      baseSeq: 1,
      writeSeq: 2,
      at: 1,
      meta: {
        ...((await store.getMeta('d-m'))! as unknown as DraftWrite['meta']),
      },
      text,
    });
    await port.prepareUser(USER);
    expect((await store.readBody('d-m'))?.text).toBe(text);
    expect(localStorage.getItem(mirrorKey(USER.userKey, 'd-m'))).toBeNull();
  });

  it('lists mine, found on this device, the quarantine and the locks', async () => {
    seedTemplate();
    await storeDraft('mine');
    await storeDraft('dev', { userKey: DEVICE_USER_KEY });
    await storeDraft('theirs', { userKey: OTHER.userKey });
    const release = locks.holdElsewhere(DRAFT_LOCK_PREFIX + 'mine');
    const listed = await port.listDrafts(USER);
    expect(listed.mine.map((m) => m.draftId)).toEqual(['mine']);
    expect(listed.device.map((m) => m.draftId)).toEqual(['dev']);
    expect(listed.locked.has('mine')).toBe(true);
    release();

    const claimed = await port.claimDeviceDraft(USER, 'dev');
    expect(claimed?.userKey).toBe(USER.userKey);
  });
});

/** Write a stored draft again from another writer document (another tab). */
async function rewriteAs(
  draftId: string,
  writerDoc: string,
  meta: DraftWrite['meta'],
  expectedSeq: number,
): Promise<void> {
  const body = await store.readBody(draftId);
  const other = createDraftStore({
    indexedDB: factory,
    storage: new MemoryStorage(),
    writerDoc,
  });
  await other.write({ meta, text: body!.text, expectedSeq });
}
