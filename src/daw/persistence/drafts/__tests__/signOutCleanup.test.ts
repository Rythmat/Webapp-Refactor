// @vitest-environment jsdom
/**
 * The sign-out cleanup (milestone 1.4, E17): before a shared Chromebook goes
 * to the next student, the outgoing user's cloud-equal drafts and the
 * mirrors IndexedDB already holds are removed. Unsaved work, other users'
 * drafts, drafts another tab has open and the tab's active draft stay.
 *
 * The real draft store over fake-indexeddb, the real lock helpers over a
 * fake LockManager, and the protect set every prune uses (protectSet: the
 * locked drafts plus this page's, the pointer among them).
 *
 * Run: npx vitest run src/daw/persistence/drafts/__tests__/signOutCleanup.test.ts
 */
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { writeActiveDraft } from '@/lib/studio-projects/drafts/activeDraft';
import {
  DRAFT_LOCK_PREFIX,
  setDefaultLockManager,
} from '@/lib/studio-projects/drafts/draftLock';
import {
  mirrorKey,
  writeMirror,
} from '@/lib/studio-projects/drafts/draftMirror';
import {
  createDraftStore,
  type DraftStore,
} from '@/lib/studio-projects/drafts/draftStore';
import type { DraftMeta } from '@/lib/studio-projects/drafts/types';
import {
  createWrite,
  MemoryStorage,
  updateWrite,
  writeMeta,
} from '@/lib/studio-projects/drafts/__tests__/draftTestUtils';
import {
  createFakeLockManager,
  type FakeLockManager,
} from '@/lib/studio-projects/drafts/__tests__/fakeLocks';
import { protectSet, resetDraftAutosaveForTests } from '../autosave';
import { cleanupDraftsForSignOut } from '../signOutCleanup';

const ME = 'student-1';
const OTHER = 'student-2';

let store: DraftStore;
let storage: MemoryStorage;
let locks: FakeLockManager;

beforeAll(() => {
  (globalThis as { IDBKeyRange?: unknown }).IDBKeyRange = IDBKeyRange;
});

beforeEach(() => {
  sessionStorage.clear();
  locks = createFakeLockManager();
  setDefaultLockManager(() => locks);
  resetDraftAutosaveForTests();
  store = createDraftStore({
    indexedDB: new IDBFactory(),
    storage: new MemoryStorage(),
  });
  storage = new MemoryStorage();
});

afterEach(() => {
  resetDraftAutosaveForTests();
  setDefaultLockManager(null);
});

/** Run the cleanup for `userKey` with this test's store, storage and protect set. */
function cleanup(
  userKey: string | null,
  extra: Partial<Parameters<typeof cleanupDraftsForSignOut>[0]> = {},
) {
  return cleanupDraftsForSignOut({
    store,
    userKey,
    flush: null,
    protect: protectSet,
    signal: new AbortController().signal,
    storage,
    ...extra,
  });
}

const ids = async (userKey: string) =>
  (await store.list(userKey)).map((m) => m.draftId).sort();

/** Mirror `meta`'s draft at `writeSeq` with `text` (a page that hid). */
function mirror(meta: DraftMeta, writeSeq: number, text: string): void {
  const written = writeMirror(
    {
      v: 1,
      draftId: meta.draftId,
      userKey: meta.userKey,
      baseSeq: writeSeq - 1,
      writeSeq,
      at: 1,
      meta: writeMeta(meta.draftId, meta.userKey),
      text,
    },
    storage,
  );
  expect(written).toBe('written');
}

const hasMirror = (userKey: string, draftId: string) =>
  storage.getItem(mirrorKey(userKey, draftId)) !== null;

describe('cleanupDraftsForSignOut', () => {
  it('removes only this user’s cloud-equal drafts', async () => {
    await store.write(createWrite('mine-cloud', ME, 'cloud-equal'));
    await store.write(createWrite('mine-work', ME, 'work'));
    await store.write(createWrite('theirs-cloud', OTHER, 'cloud-equal'));
    await store.write(createWrite('theirs-work', OTHER, 'work'));

    await cleanup(ME);

    expect(await ids(ME)).toEqual(['mine-work']);
    expect(await ids(OTHER)).toEqual(['theirs-cloud', 'theirs-work']);
  });

  it('removes the mirrors IndexedDB holds, and keeps the ones it doesn’t', async () => {
    const held = await store.write(createWrite('held', ME, 'work'));
    const past = await store.write(createWrite('past', ME, 'work'));
    await store.write(updateWrite(past, '{"body":"past 2"}'));
    const ahead = await store.write(createWrite('ahead', ME, 'work'));
    const theirs = await store.write(createWrite('theirs', OTHER, 'work'));
    // Same seq, same content: IndexedDB holds it.
    mirror(held, 1, '{"body":"held"}');
    // IndexedDB moved past it.
    mirror(past, 1, '{"body":"past"}');
    // Newer than IndexedDB: the next boot of this user reconciles it.
    mirror(ahead, 2, '{"body":"ahead 2"}');
    // Another user's mirror, held or not, is never touched.
    mirror(theirs, 1, '{"body":"theirs"}');

    await cleanup(ME);

    expect(hasMirror(ME, 'held')).toBe(false);
    expect(hasMirror(ME, 'past')).toBe(false);
    expect(hasMirror(ME, 'ahead')).toBe(true);
    expect(hasMirror(OTHER, 'theirs')).toBe(true);
    // Unsaved drafts stay, under the user's own key.
    expect(await ids(ME)).toEqual(['ahead', 'held', 'past']);
  });

  it('keeps a draft another tab has open, and the tab’s active draft', async () => {
    await store.write(createWrite('locked', ME, 'cloud-equal'));
    await store.write(createWrite('active', ME, 'cloud-equal'));
    await store.write(createWrite('loose', ME, 'cloud-equal'));
    const release = locks.holdElsewhere(DRAFT_LOCK_PREFIX + 'locked');
    writeActiveDraft({ draftId: 'active', userKey: ME });

    try {
      await cleanup(ME);
    } finally {
      release();
    }

    expect(await ids(ME)).toEqual(['active', 'locked']);
  });

  it('flushes first, and tells when the prune deleted media', async () => {
    const order: string[] = [];
    await store.putMedia({
      key: `${ME}:old`,
      mediaId: 'old',
      userKey: ME,
      blob: new Blob(['x']),
      contentType: 'audio/wav',
      size: 1,
      createdAt: 0,
    });
    await store.write(createWrite('mine-cloud', ME, 'cloud-equal'));

    await cleanup(ME, {
      flush: async () => {
        order.push('flush');
        expect(await ids(ME)).toEqual(['mine-cloud']);
      },
      onMediaDeleted: () => order.push('media'),
    });

    expect(order).toEqual(['flush', 'media']);
    expect(await store.hasMedia(ME, ['old'])).toEqual(new Set());
  });

  it('does nothing once its signal aborts, or with no outgoing user', async () => {
    await store.write(createWrite('mine-cloud', ME, 'cloud-equal'));
    const aborted = new AbortController();
    aborted.abort();

    await cleanup(ME, { signal: aborted.signal });
    await cleanup(null);

    expect(await ids(ME)).toEqual(['mine-cloud']);
  });
});
