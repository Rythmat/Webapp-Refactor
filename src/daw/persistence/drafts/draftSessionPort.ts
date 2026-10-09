import {
  isLoadableSession,
  SESSION_SCHEMA_VERSION,
} from '@/daw/persistence/SessionSerializer';
import type {
  BootNotice,
  DraftClaim,
  DraftSessionPort,
  PreparedDraft,
  SessionUser,
} from '@/daw/session/types';
import {
  DEVICE_USER_KEY,
  getLocalStoreUserKey,
  type UserKey,
} from '@/lib/local-store/userScope';
import { readActiveDraft } from '@/lib/studio-projects/drafts/activeDraft';
import {
  acquireDraftLock,
  BOOT_LOCK_WAIT_MS,
  lockedDraftIds,
} from '@/lib/studio-projects/drafts/draftLock';
import {
  DRAFT_BUILD,
  mirrorAheadOf,
  mirrorKey,
  reconcileMirror,
  reconcileMirrors,
  removeMirror,
} from '@/lib/studio-projects/drafts/draftMirror';
import {
  WRITER_DOC,
  type DraftStore,
} from '@/lib/studio-projects/drafts/draftStore';
import { createLocalStorageDrafts } from '@/lib/studio-projects/drafts/localStorageDrafts';
import {
  draftHasWork,
  draftIsReadOnly,
  draftTouchedAt,
} from '@/lib/studio-projects/drafts/predicates';
import {
  DEVICE_DRAFT_MAX_AGE_MS,
  userSeenKey,
  type UserSeenRecord,
} from '@/lib/studio-projects/drafts/prune';
import {
  DraftStorageError,
  type DraftMeta,
  type DraftOrigin,
  type DraftWrite,
} from '@/lib/studio-projects/drafts/types';
import {
  activateDraft,
  applyPreparedDraft,
  beginDraft,
  draftStore,
  dropClaim,
  flushDraftNow,
  flushOutgoingDraft,
  isClaimed,
  isRetiredDraft,
  liveDraftId,
  liveDraftInfo,
  newDraftId,
  noteClaim,
  patchDraftCloud,
  protectPending,
  protectSet,
  quarantineDraft,
  reinstateRetiredDraft,
  retireOutgoingDraft,
  TIMED_OUT,
  whenDraftWritesSettled,
  withTimeout,
} from './autosave';
import {
  claimDeviceDraft as claimDeviceDraftIn,
  importLegacySessions,
} from './legacyImport';
import {
  forgetStoredMedia,
  pendingMediaManifest,
  restoreDraftMedia,
} from './pendingMedia';

// ── The drafts side of openSession (milestone 1.4, E3, E4, E5) ─────────────
//
// openSession reaches drafts only through this port (SessionDeps.drafts):
//
//   prepare:   prepareUser (once per page and user), chooseResume,
//              findProjectDraft, claim (lock, or plan a fork), read
//   keeping:   flushOutgoing, retireOutgoing
//   switching: activate
//   loading:   apply
//   baselining: begin; then restoreMedia after ready
//
// Every opened session gets its record at once (begin). Keeping re-marks the
// same record 'kept' when it has work and removes it when it doesn't, so
// kept work is never a copy. A draft locked by another tab is never opened
// for writing: the claim plans a fork (new id, '<name> (copy)', no project).
// A mirror is reconciled under the lock that claims its draft (read), so a
// refresh whose old document still held the lock at prepareUser never opens
// the stale IndexedDB body (critique).

/** Origins a plain boot resumes; kept and recovered work only when nothing else exists. */
const RESUME_ORIGINS: ReadonlySet<DraftOrigin> = new Set([
  'session',
  'migrated',
  'fork',
]);
const FALLBACK_RESUME_ORIGINS: ReadonlySet<DraftOrigin> = new Set([
  'kept',
  'recovered',
]);

/** How long a boot's legacy import waits for another tab's import. */
const BOOT_IMPORT_LOCK_WAIT_MS = 2000;
/** How long a boot waits for the legacy import at all. */
const BOOT_IMPORT_TIMEOUT_MS = 3000;

const PREPARED_KEY = Symbol.for('ma-studio.drafts.preparedUsers');

/** prepareUser's runs, per user key, for the life of the page. */
const preparedUsers: Map<UserKey, Promise<BootNotice[]>> = (() => {
  const g = globalThis as unknown as Record<
    symbol,
    Map<UserKey, Promise<BootNotice[]>> | undefined
  >;
  return (g[PREPARED_KEY] ??= new Map());
})();

/** Resolve `promise`, or reject with the signal's reason once it aborts. */
function withSignal<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted)
    return Promise.reject(
      signal.reason ?? new DOMException('Aborted', 'AbortError'),
    );
  return new Promise<T>((resolve, reject) => {
    const onAbort = () =>
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (err: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(err);
      },
    );
  });
}

const usable = (m: DraftMeta) =>
  m.v === 1 && !draftIsReadOnly(m, SESSION_SCHEMA_VERSION);

function localStorageOrNull(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** A stored meta as the meta of a write (the store's own fields left out). */
function writableMeta(meta: DraftMeta): DraftWrite['meta'] {
  const rest: Partial<DraftMeta> = { ...meta };
  delete rest.v;
  delete rest.writeSeq;
  delete rest.updatedAt;
  delete rest.writer;
  delete rest.contentHash;
  return rest as DraftWrite['meta'];
}

/**
 * Drafts the localStorage adapter kept on an earlier page that couldn't use
 * IndexedDB: brought into IndexedDB under the mirror's rules (created when
 * missing; dropped when IndexedDB holds them; a 'recovered' copy when
 * IndexedDB moved on otherwise), then removed from localStorage. Locked
 * drafts (a tab still in fallback mode) are left alone. Resolves the ids
 * of the recovered copies.
 */
async function importFallbackDrafts(
  store: DraftStore,
  userKey: UserKey,
  locked: ReadonlySet<string>,
): Promise<string[]> {
  const storage = localStorageOrNull();
  if (!storage) return [];
  const fallback = createLocalStorageDrafts({
    storage,
    now: Date.now,
    writer: { build: DRAFT_BUILD, doc: WRITER_DOC },
  });
  const recovered: string[] = [];
  for (const meta of await fallback.list(userKey)) {
    if (locked.has(meta.draftId)) continue;
    const body = await fallback.readBody(meta.draftId);
    if (!body) continue;
    const existing = await store.getMeta(meta.draftId);
    if (!existing) {
      await store.write({
        meta: writableMeta(meta),
        text: body.text,
        expectedSeq: null,
        durability: 'strict',
      });
    } else if (
      existing.userKey !== meta.userKey ||
      existing.writeSeq < meta.writeSeq ||
      (existing.writeSeq === meta.writeSeq &&
        existing.contentHash !== meta.contentHash)
    ) {
      const draftId = newDraftId();
      const copy: DraftWrite['meta'] = {
        ...writableMeta(meta),
        draftId,
        origin: 'recovered',
        forkedFrom: meta.draftId,
      };
      delete copy.roomId;
      await store.write({
        meta: copy,
        text: body.text,
        expectedSeq: null,
        durability: 'strict',
        updatedAt: meta.updatedAt,
      });
      recovered.push(draftId);
    }
    await fallback.remove(meta.draftId);
  }
  return recovered;
}

async function runPrepare(user: SessionUser): Promise<BootNotice[]> {
  const store = draftStore();
  const notices: BootNotice[] = [];
  const recoveredIds: string[] = [];
  let quarantined = 0;

  const ready = (await store.ready?.()) ?? {
    kind: store.kind,
    reason: null,
  };
  if (ready.kind === 'localstorage' && ready.reason !== 'no-indexeddb')
    notices.push({ kind: 'storage-unavailable' });

  try {
    await store.setMetaValue<UserSeenRecord>(userSeenKey(user.userKey), {
      lastSeenAt: Date.now(),
    });
  } catch (err) {
    console.warn('[drafts] Recording this visit failed:', err);
  }

  let locked = await lockedDraftIds();
  if (ready.kind === 'indexeddb') {
    try {
      recoveredIds.push(
        ...(await importFallbackDrafts(store, user.userKey, locked)),
      );
    } catch (err) {
      console.warn('[drafts] Bringing fallback drafts back failed:', err);
    }
  }

  try {
    // A short wait for another tab's import: the opening waits on this, and
    // the import is idempotent (it runs again at the next boot or Projects
    // open).
    const result = await withTimeout(
      importLegacySessions(store, user, {
        lockWaitMs: BOOT_IMPORT_LOCK_WAIT_MS,
      }),
      BOOT_IMPORT_TIMEOUT_MS,
    );
    if (result === TIMED_OUT) {
      console.warn(
        '[drafts] Importing earlier sessions is taking long; opening without waiting.',
      );
    } else {
      quarantined += result.quarantined;
      for (const meta of result.imported) {
        if (meta.origin === 'recovered') recoveredIds.push(meta.draftId);
      }
    }
  } catch (err) {
    console.warn('[drafts] Importing earlier sessions failed:', err);
  }

  // Mirrors of drafts no tab holds. A locked draft's mirror waits for the
  // claim that takes its lock (read), whose reconcile runs under it.
  locked = await lockedDraftIds();
  try {
    const mirrors = await reconcileMirrors(store, user.userKey, { locked });
    recoveredIds.push(...mirrors.recovered);
    quarantined += mirrors.quarantined.length;
  } catch (err) {
    console.warn('[drafts] Reconciling mirrors failed:', err);
  }

  try {
    const report = await store.prune({
      userKey: user.userKey,
      protect: await protectSet(),
      reason: 'boot',
      schemaVersion: SESSION_SCHEMA_VERSION,
      protectMedia: new Set(
        pendingMediaManifest().refs.map((ref) => ref.mediaId),
      ),
    });
    if (report.deletedMedia > 0) forgetStoredMedia();
  } catch (err) {
    console.warn('[drafts] Tidying drafts at boot failed:', err);
  }

  for (const draftId of recoveredIds) {
    const meta = await store.getMeta(draftId).catch(() => null);
    if (meta) notices.push({ kind: 'recovered', name: meta.name, draftId });
  }
  if (quarantined > 0)
    notices.push({ kind: 'quarantined', count: quarantined });
  if (user.userKey !== DEVICE_USER_KEY) {
    const found = await deviceDrafts(store).catch(() => []);
    const count = found.filter(draftHasWork).length;
    if (count > 0) notices.push({ kind: 'device-found', count });
  }
  return notices;
}

/** '~device' drafts younger than 30 days ('Found on this device'). */
async function deviceDrafts(store: DraftStore): Promise<DraftMeta[]> {
  const now = Date.now();
  return (await store.list(DEVICE_USER_KEY)).filter(
    (m) => now - draftTouchedAt(m) < DEVICE_DRAFT_MAX_AGE_MS,
  );
}

/** Whether localStorage holds a mirror of the user's draft. */
function hasMirror(userKey: UserKey, draftId: string): boolean {
  try {
    return localStorageOrNull()?.getItem(mirrorKey(userKey, draftId)) != null;
  } catch {
    return false;
  }
}

/** Whether `text` is a session this build can load. */
function loadableText(text: string): boolean {
  try {
    JSON.parse(text);
    return isLoadableSession(text);
  } catch {
    return false;
  }
}

function notFound(): DraftStorageError {
  return new DraftStorageError('not-found', 'The draft is not on this device.');
}

const port: DraftSessionPort = {
  activeDraftId: liveDraftId,

  prepareUser(user, signal, opts) {
    // The open's own draft is safe from the boot prune until it claims it.
    const unprotect = opts?.protect?.length
      ? protectPending(opts.protect)
      : null;
    let run = preparedUsers.get(user.userKey);
    if (!run) {
      run = runPrepare(user);
      preparedUsers.set(user.userKey, run);
      // A failed run is tried again by the next open.
      run.catch(() => preparedUsers.delete(user.userKey));
    }
    if (unprotect) void run.then(unprotect, unprotect);
    return withSignal(run, signal);
  },

  async chooseResume(user) {
    const store = draftStore();
    const pointer = readActiveDraft();
    if (pointer && pointer.userKey === user.userKey) {
      const meta = await store.getMeta(pointer.draftId);
      if (meta && meta.userKey === user.userKey && usable(meta))
        return meta.draftId;
      // Its first record never landed (the page died with the create in
      // flight) but its mirror did: read() makes the record from it.
      if (!meta && hasMirror(user.userKey, pointer.draftId))
        return pointer.draftId;
    }
    const [mine, locked] = await Promise.all([
      store.list(user.userKey),
      lockedDraftIds(),
    ]);
    // Newest content first (list's order); never a draft another tab has.
    const open = mine.filter(
      (m) => usable(m) && !locked.has(m.draftId) && m.draftId !== liveDraftId(),
    );
    const pick =
      open.find((m) => RESUME_ORIGINS.has(m.origin)) ??
      open.find((m) => FALLBACK_RESUME_ORIGINS.has(m.origin));
    return pick?.draftId ?? null;
  },

  async findProjectDraft(user, projectId) {
    const store = draftStore();
    const [mine, locked] = await Promise.all([
      store.list(user.userKey),
      lockedDraftIds(),
    ]);
    const live = liveDraftId();
    return (
      mine.find(
        (m) =>
          m.projectId === projectId &&
          !m.roomId &&
          usable(m) &&
          draftHasWork(m) &&
          !locked.has(m.draftId) &&
          m.draftId !== live,
      ) ?? null
    );
  },

  async claim(user, target, signal) {
    if (!target.draftId) {
      const draftId = newDraftId();
      const lock = await acquireDraftLock(draftId, { waitMs: 0, signal });
      noteClaim(draftId, lock);
      return { draftId, userKey: user.userKey, mode: 'new', lock };
    }
    const live = liveDraftInfo();
    if (live && live.draftId === target.draftId) {
      // This tab holds it already (the session reopens its own draft):
      // the lock passes on; keeping won't remove or keep it. Its newest
      // memory is written first, so the read that follows sees it.
      await flushDraftNow({ force: true });
      await whenDraftWritesSettled();
      noteClaim(live.draftId, live.lock);
      return {
        draftId: live.draftId,
        userKey: user.userKey,
        mode: 'existing',
        lock: live.lock,
      };
    }
    const lock = await acquireDraftLock(target.draftId, {
      waitMs: target.boot ? BOOT_LOCK_WAIT_MS : 0,
      signal,
    });
    if (lock) {
      noteClaim(target.draftId, lock);
      return {
        draftId: target.draftId,
        userKey: user.userKey,
        mode: 'existing',
        lock,
      };
    }
    // Open in another tab: this tab gets a copy, never that tab's draft.
    const draftId = newDraftId();
    const forkLock = await acquireDraftLock(draftId, { waitMs: 0, signal });
    noteClaim(draftId, forkLock);
    return {
      draftId,
      userKey: user.userKey,
      mode: 'fork',
      sourceDraftId: target.draftId,
      lock: forkLock,
    };
  },

  async read(claim): Promise<PreparedDraft> {
    const store = draftStore();
    const sourceId =
      claim.mode === 'fork' ? (claim.sourceDraftId ?? '') : claim.draftId;
    if (claim.mode === 'new' || sourceId === '') throw notFound();
    let meta = await store.getMeta(sourceId);
    if (!meta && claim.mode === 'existing') {
      // Only a mirror (the record's create never landed): make the record
      // from it, under the lock.
      await reconcileMirror(store, claim.userKey, sourceId);
      meta = await store.getMeta(sourceId);
    }
    if (!meta) throw notFound();
    if (meta.userKey !== claim.userKey && meta.userKey !== DEVICE_USER_KEY)
      throw notFound();
    let fromMirror: PreparedDraft['fromMirror'];
    let mirrorText: string | null = null;
    if (claim.mode === 'existing') {
      // Under the lock: the last page's mirror of this draft, if it left
      // one, before its body is read. A fork's source belongs to the tab
      // holding it, which reconciles its own.
      const result = await reconcileMirror(store, meta.userKey, sourceId);
      if (result.outcome === 'applied') {
        meta = (await store.getMeta(sourceId)) ?? meta;
      } else if (result.outcome === 'failed') {
        // Storage couldn't take the mirror (full): it is still the newest
        // copy, so the page opens it, never the older record as if saved.
        // begin writes it over the record and the status shows the error
        // until a write lands (R16 quotaReopenHonest).
        const entry = mirrorAheadOf(meta.userKey, sourceId, meta);
        if (entry && loadableText(entry.text)) {
          mirrorText = entry.text;
          meta = {
            ...meta,
            ...entry.meta,
            draftId: meta.draftId,
            userKey: meta.userKey,
          };
          fromMirror = {
            writeSeq: entry.writeSeq,
            error: result.failure ?? 'unavailable',
          };
        }
      }
    }
    if (!usable(meta))
      throw new DraftStorageError(
        'readonly',
        'A newer version of the Studio made this draft.',
      );
    if (mirrorText !== null && fromMirror) {
      return {
        claim,
        meta,
        body: { draftId: sourceId, writeSeq: meta.writeSeq, text: mirrorText },
        fromMirror,
      };
    }
    const remove = claim.mode === 'existing';
    const body = await store.readBody(sourceId);
    if (!body) {
      await quarantineDraft(
        { meta, body: null },
        remove,
        'Its body is missing.',
      );
      throw new DraftStorageError('corrupt', 'The draft could not be read.');
    }
    let reason: string | null = null;
    try {
      JSON.parse(body.text);
      if (!isLoadableSession(body.text))
        reason = 'This version of the Studio can’t load it.';
    } catch {
      reason = 'Its text is not JSON.';
    }
    if (reason !== null) {
      await quarantineDraft({ meta, body }, remove, reason);
      throw new DraftStorageError('corrupt', 'The draft could not be read.');
    }
    return { claim, meta, body };
  },

  release(claim: DraftClaim) {
    dropClaim(claim.draftId, claim.lock);
  },

  flushOutgoing: () => flushOutgoingDraft(),

  retireOutgoing: (policy) => retireOutgoingDraft(policy),

  activate: (claim) => activateDraft(claim),

  apply: (prepared) => applyPreparedDraft(prepared),

  begin: (baseline, extras) => beginDraft(baseline, extras),

  async restoreMedia(meta, generation) {
    try {
      await restoreDraftMedia(meta, { generation, store: draftStore() });
    } catch (err) {
      console.warn('[drafts] Restoring the draft’s audio failed:', err);
    }
  },

  async unkeep(draftId) {
    // The open that kept it stopped before switching: it is live again.
    if (isRetiredDraft(draftId) && liveDraftId() === null) {
      reinstateRetiredDraft();
      await whenDraftWritesSettled();
      return;
    }
    try {
      await draftStore().patchMeta(draftId, {
        origin: 'session',
        keptAt: null,
      });
    } catch (err) {
      console.warn('[drafts] Unkeeping a draft failed:', err);
    }
  },

  patchCloud: (draftId, patch) => patchDraftCloud(draftId, patch),

  async listDrafts(user) {
    const store = draftStore();
    try {
      await importLegacySessions(store, user);
    } catch (err) {
      console.warn('[drafts] Importing earlier sessions failed:', err);
    }
    const [mine, device, quarantined, locked] = await Promise.all([
      store.list(user.userKey),
      user.userKey === DEVICE_USER_KEY
        ? Promise.resolve([])
        : deviceDrafts(store),
      store.listQuarantine(user.userKey),
      lockedDraftIds(),
    ]);
    return { mine, device, quarantined, locked };
  },

  async deleteDraft(draftId) {
    if (
      draftId === liveDraftId() ||
      isClaimed(draftId) ||
      isRetiredDraft(draftId)
    )
      return 'refused';
    const locked = await lockedDraftIds();
    if (locked.has(draftId)) return 'refused';
    const store = draftStore();
    const meta = await store.getMeta(draftId);
    if (!meta) return 'deleted';
    // Only the signed-in user's own drafts ('~device' ones are claimed, not
    // deleted; the dialog offers neither).
    const me = getLocalStoreUserKey();
    if (me === null || meta.userKey !== me) return 'refused';
    await store.remove(draftId);
    removeMirror(meta.userKey, draftId);
    void store.gcMedia(meta.userKey).then(
      (count) => {
        // Media the capture may still trust as stored has gone.
        if (count > 0) forgetStoredMedia();
      },
      (err: unknown) => {
        console.warn('[drafts] Collecting unused audio failed:', err);
      },
    );
    return 'deleted';
  },

  claimDeviceDraft: (user, draftId) =>
    claimDeviceDraftIn(draftStore(), draftId, user.userKey),
};

/** The page's DraftSessionPort (SessionDeps.drafts). */
export function getDraftSessionPort(): DraftSessionPort {
  return port;
}

/** Tests: forget which users this page has prepared. */
export function resetDraftSessionPortForTests(): void {
  preparedUsers.clear();
}
