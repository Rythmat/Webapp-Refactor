import type { UserKey } from '@/lib/local-store/userScope';
import {
  commitNow,
  guarded,
  openDraftDatabase,
  runTransaction,
  toDraftError,
} from './idb';
import {
  applyMetaPatch,
  buildStoredMeta,
  createLocalStorageDrafts,
  invalidWrite,
  newestFirst,
  writeRefusal,
} from './localStorageDrafts';
import {
  MEDIA_GC_GRACE_MS,
  runPrune,
  sameDraftState,
  type PruneOps,
  type PrunePolicy,
  type PruneReport,
} from './prune';
import {
  DraftStorageError,
  type DraftBody,
  type DraftMediaRecord,
  type DraftMeta,
  type DraftMetaPatch,
  type DraftWrite,
  type DraftWriter,
  type QuarantineRecord,
} from './types';

export type { PrunePolicy, PruneReport } from './prune';
export { conflictReason, type DraftConflictCause } from './localStorageDrafts';

// ── The draft store (milestone 1.4, decisions E1 and E3) ───────────────────
//
// Every Studio draft on this device: one IndexedDB database, 'ma-studio'
// (idb.ts opens it), with the stores drafts (meta), bodies, media,
// quarantine and meta. Where IndexedDB is missing or broken, the page keeps
// drafts in localStorage instead (localStorageDrafts.ts), behind the same
// interface.
//
// Which one a page uses is decided once, at its first call: IndexedDB if it
// opens (an open that fails is tried once more after OPEN_RETRY_MS, since a
// busy Chromebook can fail a first open transiently), else localStorage (two
// failed opens, a SecurityError, no indexedDB at all). The decision stands
// for the life of the page; ready() says which it is and why. Once IndexedDB has opened, a later
// failure (the connection lost, the disk full) rejects that call with a
// typed DraftStorageError and the next call opens a new connection; the
// page never switches adapter mid-session, which would leave the active
// draft in the other one. A 'blocked' open (another tab holding an older
// version open past 2 s) rejects without deciding.
//
// write() is a compare-and-set over drafts and bodies in ONE readwrite
// transaction, resolved on complete (after commit()), so a write that
// resolved has landed and a write that rejected changed nothing. patchMeta
// never changes writeSeq, writer, contentHash or the body, so a writer's
// next compare-and-set still matches after a patch (the cloud record after
// a save, say).
//
// No store, codec or React imports: the Studio dashboard loads this.

declare const __COMMIT_SHA__: string | undefined;

/**
 * The build that writes (vite's define), 'dev' outside a build: stamped on
 * records' writers and on quarantine records.
 */
export const DRAFT_BUILD: string =
  typeof __COMMIT_SHA__ === 'string' && __COMMIT_SHA__ !== ''
    ? __COMMIT_SHA__
    : 'dev';

const PAGE_KEY = Symbol.for('ma-studio.drafts.page');

interface PageGlobals {
  writerDoc?: string;
  store?: DraftStore;
  protect?: (() => ReadonlySet<string>) | null;
}

/** Page-wide state, on globalThis so a hot reload of this module keeps it. */
function pageGlobals(): PageGlobals {
  const g = globalThis as unknown as Record<symbol, PageGlobals | undefined>;
  return (g[PAGE_KEY] ??= {});
}

function newWriterDoc(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      return crypto.randomUUID();
  } catch {
    // Falls through to a random string.
  }
  return `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * This page's writer id, stamped on every write (meta.writer.doc). One per
 * page load, kept across hot reloads: a compare-and-set conflict against a
 * record this same page wrote is not another tab.
 */
export const WRITER_DOC: string = (pageGlobals().writerDoc ??= newWriterDoc());

/** How long the second IndexedDB open waits after a failed first one. */
export const OPEN_RETRY_MS = 300;

/** Which adapter a store settled on, and why it isn't IndexedDB. */
export interface DraftStoreReady {
  kind: 'indexeddb' | 'localstorage';
  /**
   * null on IndexedDB. 'no-indexeddb': the browser has none (no IndexedDB
   * drafts can exist); 'open-failed' / 'security': IndexedDB is there but
   * this page can't use it, so drafts may exist there that this page can't
   * see (prepareUser's 'storage-unavailable' notice); 'no-storage': neither
   * works, writes reject 'unavailable'.
   */
  reason: null | 'no-indexeddb' | 'open-failed' | 'security' | 'no-storage';
}

/**
 * The page's protect set for the localStorage adapter's cap trims (the
 * active draft, drafts locked by other tabs, the pointer): draft-autosave
 * registers it. IndexedDB never trims on write, so it ignores this.
 */
export function setDraftProtection(
  provider: (() => ReadonlySet<string>) | null,
): void {
  pageGlobals().protect = provider;
}

export interface DraftStore {
  /** Reliable once ready() (or any call) has settled; 'indexeddb' before. */
  readonly kind: 'indexeddb' | 'localstorage';
  /** Decide the adapter (no-op once decided) and say which, and why. */
  ready?(): Promise<DraftStoreReady>;
  /** The user's drafts, newest updatedAt first; never another user's. */
  list(userKey: UserKey): Promise<DraftMeta[]>;
  getMeta(draftId: string): Promise<DraftMeta | null>;
  readBody(draftId: string): Promise<DraftBody | null>;
  /**
   * Compare-and-set: the stored writeSeq must equal expectedSeq (none stored
   * when null). Resolves with the stored meta once the transaction has
   * completed; rejects DraftStorageError ('conflict', 'not-found', 'quota',
   * 'unavailable', 'corrupt', 'blocked') with nothing changed.
   */
  write(w: DraftWrite): Promise<DraftMeta>;
  /** Merge `patch` (null clears); never changes writeSeq. Null when missing. */
  patchMeta(draftId: string, patch: DraftMetaPatch): Promise<DraftMeta | null>;
  remove(draftId: string): Promise<void>;
  hasMedia(userKey: UserKey, mediaIds: readonly string[]): Promise<Set<string>>;
  /** Idempotent; the localStorage adapter rejects 'unavailable'. */
  putMedia(record: DraftMediaRecord): Promise<void>;
  getMedia(userKey: UserKey, mediaId: string): Promise<DraftMediaRecord | null>;
  /**
   * Delete the user's media no draft of theirs references, older than the
   * grace (10 minutes), except `protect`. Resolves with how many went, and
   * deletes nothing when one of the user's records was written by a later
   * build (meta.v other than 1): it can't tell what that draft uses.
   */
  gcMedia(
    userKey: UserKey,
    opts?: { graceMs?: number; protect?: ReadonlySet<string> },
  ): Promise<number>;
  /** Deduped by (userKey, hash) when the raw text is the same too. */
  quarantine(
    record: Omit<QuarantineRecord, 'id'>,
  ): Promise<'stored' | 'duplicate'>;
  listQuarantine(userKey: UserKey): Promise<QuarantineRecord[]>;
  getMetaValue<T>(key: string): Promise<T | null>;
  setMetaValue<T>(key: string, value: T): Promise<void>;
  /** Every user key with a draft on this device ('~device' included). */
  knownUserKeys(): Promise<Set<UserKey>>;
  prune(policy: PrunePolicy): Promise<PruneReport>;
  usage(
    userKey: UserKey,
  ): Promise<{ drafts: number; chars: number; mediaBytes: number }>;
}

// ── The IndexedDB adapter ──────────────────────────────────────────────────

const userRange = (userKey: UserKey) =>
  IDBKeyRange.bound([userKey, -Infinity], [userKey, Infinity]);

const mediaKey = (userKey: UserKey, mediaId: string) => `${userKey}:${mediaId}`;

const errorName = (caught: unknown) =>
  (caught as { cause?: { name?: unknown }; name?: unknown } | null)?.cause
    ?.name ?? (caught as { name?: unknown } | null)?.name;

/** The IndexedDB adapter, plus its connection for the facade. */
interface IndexedDbDraftStore extends DraftStore, PruneOps {
  connect(): Promise<IDBDatabase>;
}

function createIndexedDbDrafts(
  factory: IDBFactory,
  env: { now: () => number; writer: DraftWriter },
): IndexedDbDraftStore {
  const { now, writer } = env;
  let opening: Promise<IDBDatabase> | null = null;

  /** The open connection (opening it if needed); a failed open isn't kept. */
  const connect = (): Promise<IDBDatabase> => {
    if (opening) return opening;
    const attempt: Promise<IDBDatabase> = openDraftDatabase(factory).then(
      (db) => {
        const drop = () => {
          if (opening === attempt) opening = null;
        };
        // Never hold up another tab's upgrade (or "Clear site data").
        db.onversionchange = () => {
          db.close();
          drop();
        };
        // Closed under us (storage cleared, the disk gone): reopen next call.
        db.onclose = drop;
        return db;
      },
    );
    opening = attempt;
    attempt.catch(() => {
      if (opening === attempt) opening = null;
    });
    return attempt;
  };

  /**
   * Run `fn` on the connection. A connection found closing (InvalidState
   * when the transaction is made) is dropped and `fn` tried once more on a
   * new one.
   */
  const withDb = async <T>(
    what: string,
    fn: (db: IDBDatabase) => Promise<T>,
  ): Promise<T> => {
    for (let round = 0; ; round++) {
      let db: IDBDatabase;
      try {
        db = await connect();
      } catch (caught) {
        const error = toDraftError(caught, what);
        throw error.kind === 'blocked'
          ? error
          : new DraftStorageError('unavailable', error.message, {
              cause: caught,
            });
      }
      try {
        return await fn(db);
      } catch (caught) {
        if (round === 0 && errorName(caught) === 'InvalidStateError') {
          try {
            db.close();
          } catch {
            // Already closed.
          }
          opening = null;
          continue;
        }
        throw toDraftError(caught, what);
      }
    }
  };

  const read = <T>(
    store: 'drafts' | 'bodies' | 'media' | 'meta',
    key: IDBValidKey,
    what: string,
  ) =>
    withDb(what, (db) =>
      runTransaction<T | null>(
        db,
        store,
        'readonly',
        what,
        (tx, fail, done) => {
          const request = tx.objectStore(store).get(key);
          request.onsuccess = guarded(fail, what, () => {
            done((request.result as T | undefined) ?? null);
          });
        },
      ),
    );

  const write = (w: DraftWrite): Promise<DraftMeta> => {
    const bad = invalidWrite(w);
    if (bad) return Promise.reject(bad);
    const what = 'Writing a draft';
    return withDb(what, (db) =>
      runTransaction<DraftMeta>(
        db,
        ['drafts', 'bodies'],
        'readwrite',
        what,
        (tx, fail, done) => {
          const drafts = tx.objectStore('drafts');
          const get = drafts.get(w.meta.draftId);
          get.onsuccess = guarded(fail, what, () => {
            const existing = get.result as DraftMeta | undefined;
            const refusal = writeRefusal(existing, w);
            if (refusal) {
              fail(refusal);
              return;
            }
            const meta = buildStoredMeta(w, existing, now(), writer);
            drafts.put(meta);
            tx.objectStore('bodies').put({
              draftId: meta.draftId,
              writeSeq: meta.writeSeq,
              text: w.text,
            } satisfies DraftBody);
            done(meta);
            commitNow(tx);
          });
        },
        { durability: w.durability },
      ),
    );
  };

  const patchMeta = (
    draftId: string,
    patch: DraftMetaPatch,
  ): Promise<DraftMeta | null> => {
    const what = 'Updating a draft';
    return withDb(what, (db) =>
      runTransaction<DraftMeta | null>(
        db,
        ['drafts', 'media'],
        'readwrite',
        what,
        (tx, fail, done) => {
          const drafts = tx.objectStore('drafts');
          const get = drafts.get(draftId);
          get.onsuccess = guarded(fail, what, () => {
            const existing = get.result as DraftMeta | undefined;
            if (!existing) {
              done(null);
              return;
            }
            const next = applyMetaPatch(existing, patch, now());
            drafts.put(next);
            done(next);
            // A draft that changes owner ('~device' claimed) takes its media
            // along: media is keyed by owner. Each stored record is copied to
            // the new key, and the old one is deleted when no other draft of
            // the old owner uses it (else that owner's gcMedia takes it
            // later). A record that was never stored is skipped: the draft
            // already counts it as missing audio.
            if (next.userKey !== existing.userKey && existing.media?.length) {
              const media = tx.objectStore('media');
              const oldOwner = existing.userKey;
              const others = drafts.index('byUser').getAll(userRange(oldOwner));
              others.onsuccess = guarded(fail, what, () => {
                const stillUsed = new Set<string>();
                let unknown = false;
                for (const m of others.result as DraftMeta[]) {
                  if (m.draftId === draftId) continue;
                  if (m.v !== 1 || !Array.isArray(m.media)) unknown = true;
                  else for (const r of m.media) stillUsed.add(r.mediaId);
                }
                for (const ref of existing.media) {
                  const fromKey = mediaKey(oldOwner, ref.mediaId);
                  const from = media.get(fromKey);
                  from.onsuccess = guarded(fail, what, () => {
                    const record = from.result as DraftMediaRecord | undefined;
                    if (!record) return;
                    const toKey = mediaKey(next.userKey, ref.mediaId);
                    const there = media.count(toKey);
                    there.onsuccess = guarded(fail, what, () => {
                      if (there.result === 0)
                        media.put({
                          ...record,
                          key: toKey,
                          userKey: next.userKey,
                        } satisfies DraftMediaRecord);
                      if (!unknown && !stillUsed.has(ref.mediaId))
                        media.delete(fromKey);
                    });
                  });
                }
              });
            }
          });
        },
      ),
    );
  };

  const list = (userKey: UserKey): Promise<DraftMeta[]> => {
    const what = 'Listing drafts';
    return withDb(what, (db) =>
      runTransaction<DraftMeta[]>(
        db,
        'drafts',
        'readonly',
        what,
        (tx, fail, done) => {
          const request = tx
            .objectStore('drafts')
            .index('byUser')
            .getAll(userRange(userKey));
          request.onsuccess = guarded(fail, what, () => {
            done((request.result as DraftMeta[]).sort(newestFirst));
          });
        },
      ),
    );
  };

  const remove = (draftId: string): Promise<void> => {
    const what = 'Deleting a draft';
    return withDb(what, (db) =>
      runTransaction<void>(
        db,
        ['drafts', 'bodies'],
        'readwrite',
        what,
        (tx) => {
          tx.objectStore('drafts').delete(draftId);
          tx.objectStore('bodies').delete(draftId);
          commitNow(tx);
        },
      ),
    );
  };

  const removeIfUnchanged = (planned: DraftMeta): Promise<boolean> => {
    const { draftId } = planned;
    const what = 'Pruning a draft';
    return withDb(what, (db) =>
      runTransaction<boolean>(
        db,
        ['drafts', 'bodies'],
        'readwrite',
        what,
        (tx, fail, done) => {
          const drafts = tx.objectStore('drafts');
          const get = drafts.get(draftId);
          done(false);
          get.onsuccess = guarded(fail, what, () => {
            const existing = get.result as DraftMeta | undefined;
            if (!existing || !sameDraftState(existing, planned)) return;
            drafts.delete(draftId);
            tx.objectStore('bodies').delete(draftId);
            done(true);
            commitNow(tx);
          });
        },
      ),
    );
  };

  const hasMedia = (
    userKey: UserKey,
    mediaIds: readonly string[],
  ): Promise<Set<string>> => {
    const what = 'Checking stored audio';
    if (mediaIds.length === 0) return Promise.resolve(new Set());
    return withDb(what, (db) =>
      runTransaction<Set<string>>(
        db,
        'media',
        'readonly',
        what,
        (tx, fail, done) => {
          const found = new Set<string>();
          done(found);
          const store = tx.objectStore('media');
          for (const mediaId of new Set(mediaIds)) {
            const request = store.count(mediaKey(userKey, mediaId));
            request.onsuccess = guarded(fail, what, () => {
              if (request.result > 0) found.add(mediaId);
            });
          }
        },
      ),
    );
  };

  const putMedia = (record: DraftMediaRecord): Promise<void> => {
    const what = 'Storing audio';
    if (
      !record ||
      typeof record.mediaId !== 'string' ||
      record.mediaId === '' ||
      typeof record.userKey !== 'string' ||
      record.userKey === '' ||
      !record.blob
    ) {
      return Promise.reject(
        new DraftStorageError('corrupt', 'The audio record is malformed.'),
      );
    }
    const key = mediaKey(record.userKey, record.mediaId);
    return withDb(what, (db) =>
      runTransaction<void>(db, 'media', 'readwrite', what, (tx, fail) => {
        const store = tx.objectStore('media');
        const there = store.get(key);
        there.onsuccess = guarded(fail, what, () => {
          const existing = there.result as DraftMediaRecord | undefined;
          if (!existing) {
            store.put({ ...record, key });
          } else {
            // The same bytes under the same id: keep them, but restart
            // their grace, so bytes needed again (an undo, the same sample
            // re-imported) aren't collected before a draft references them.
            const createdAt = Math.max(
              Number.isFinite(existing.createdAt) ? existing.createdAt : 0,
              now(),
            );
            if (createdAt !== existing.createdAt)
              store.put({ ...existing, createdAt });
          }
          commitNow(tx);
        });
      }),
    );
  };

  const gcMedia = (
    userKey: UserKey,
    opts: { graceMs?: number; protect?: ReadonlySet<string> } = {},
  ): Promise<number> => {
    const what = 'Collecting unused audio';
    const graceMs = opts.graceMs ?? MEDIA_GC_GRACE_MS;
    const at = now();
    return withDb(what, (db) =>
      runTransaction<number>(
        db,
        ['drafts', 'media'],
        'readwrite',
        what,
        (tx, fail, done) => {
          // One transaction: no draft can start referencing an item between
          // reading the references and deleting it.
          const metas = tx
            .objectStore('drafts')
            .index('byUser')
            .getAll(userRange(userKey));
          done(0);
          metas.onsuccess = guarded(fail, what, () => {
            const referenced = new Set<string>();
            for (const m of metas.result as DraftMeta[]) {
              // A later build's record (after a revert): its media may be
              // referenced in a shape this build can't read. Delete nothing.
              if (m.v !== 1 || !Array.isArray(m.media)) {
                done(0);
                return;
              }
              for (const ref of m.media) referenced.add(ref.mediaId);
            }
            let deleted = 0;
            const cursor = tx
              .objectStore('media')
              .index('byUser')
              .openCursor(userKey);
            cursor.onsuccess = guarded(fail, what, () => {
              const c = cursor.result;
              if (!c) {
                done(deleted);
                commitNow(tx);
                return;
              }
              const record = c.value as DraftMediaRecord;
              const createdAt = Number.isFinite(record.createdAt)
                ? record.createdAt
                : 0;
              if (
                !referenced.has(record.mediaId) &&
                !opts.protect?.has(record.mediaId) &&
                at - createdAt >= graceMs
              ) {
                c.delete();
                deleted += 1;
              }
              c.continue();
            });
          });
        },
      ),
    );
  };

  const quarantine = (
    record: Omit<QuarantineRecord, 'id'>,
  ): Promise<'stored' | 'duplicate'> => {
    const what = 'Keeping an unreadable draft';
    const { id: _id, ...clean } = record as QuarantineRecord;
    void _id;
    return withDb(what, (db) =>
      runTransaction<'stored' | 'duplicate'>(
        db,
        'quarantine',
        'readwrite',
        what,
        (tx, fail, done) => {
          const store = tx.objectStore('quarantine');
          const there = store
            .index('byUserHash')
            .getAll([record.userKey, record.hash]);
          there.onsuccess = guarded(fail, what, () => {
            // The hash finds it, the raw text confirms it: a collision (or a
            // caller's weak hash) is stored, never dropped.
            if (
              (there.result as QuarantineRecord[]).some(
                (q) => q.raw === record.raw,
              )
            ) {
              done('duplicate');
              return;
            }
            store.add(clean);
            done('stored');
            commitNow(tx);
          });
        },
      ),
    );
  };

  const listQuarantine = (userKey: UserKey): Promise<QuarantineRecord[]> => {
    const what = 'Listing unreadable drafts';
    return withDb(what, (db) =>
      runTransaction<QuarantineRecord[]>(
        db,
        'quarantine',
        'readonly',
        what,
        (tx, fail, done) => {
          const request = tx
            .objectStore('quarantine')
            .index('byUserHash')
            .getAll(IDBKeyRange.bound([userKey], [userKey, []]));
          request.onsuccess = guarded(fail, what, () => {
            done(
              (request.result as QuarantineRecord[]).sort(
                (a, b) => b.at - a.at,
              ),
            );
          });
        },
      ),
    );
  };

  const getMetaValue = async <T>(key: string): Promise<T | null> => {
    const record = await read<{ key: string; value: T }>(
      'meta',
      key,
      'Reading a draft setting',
    );
    return record ? record.value : null;
  };

  const setMetaValue = <T>(key: string, value: T): Promise<void> => {
    const what = 'Saving a draft setting';
    return withDb(what, (db) =>
      runTransaction<void>(db, 'meta', 'readwrite', what, (tx) => {
        tx.objectStore('meta').put({ key, value });
        commitNow(tx);
      }),
    );
  };

  const knownUserKeys = (): Promise<Set<UserKey>> => {
    const what = 'Listing draft owners';
    return withDb(what, (db) =>
      runTransaction<Set<UserKey>>(
        db,
        'drafts',
        'readonly',
        what,
        (tx, fail, done) => {
          const found = new Set<UserKey>();
          done(found);
          const cursor = tx
            .objectStore('drafts')
            .index('byUser')
            .openKeyCursor();
          cursor.onsuccess = guarded(fail, what, () => {
            const c = cursor.result;
            if (!c) return;
            const userKey = (c.key as [UserKey, number])[0];
            found.add(userKey);
            // Skip the rest of this user's entries: [user, []] sorts after
            // every [user, number].
            c.continue([userKey, []]);
          });
        },
      ),
    );
  };

  const usage = (
    userKey: UserKey,
  ): Promise<{ drafts: number; chars: number; mediaBytes: number }> => {
    const what = 'Measuring drafts';
    return withDb(what, (db) =>
      runTransaction<{ drafts: number; chars: number; mediaBytes: number }>(
        db,
        ['drafts', 'media'],
        'readonly',
        what,
        (tx, fail, done) => {
          const total = { drafts: 0, chars: 0, mediaBytes: 0 };
          done(total);
          const metas = tx
            .objectStore('drafts')
            .index('byUser')
            .getAll(userRange(userKey));
          metas.onsuccess = guarded(fail, what, () => {
            for (const m of metas.result as DraftMeta[]) {
              total.drafts += 1;
              total.chars += Number.isFinite(m.chars) ? m.chars : 0;
            }
          });
          const cursor = tx
            .objectStore('media')
            .index('byUser')
            .openCursor(userKey);
          cursor.onsuccess = guarded(fail, what, () => {
            const c = cursor.result;
            if (!c) return;
            const size = (c.value as DraftMediaRecord).size;
            total.mediaBytes += Number.isFinite(size) ? size : 0;
            c.continue();
          });
        },
      ),
    );
  };

  const adapter: IndexedDbDraftStore = {
    kind: 'indexeddb',
    ready: async () => ({ kind: 'indexeddb', reason: null }),
    connect,
    list,
    getMeta: (draftId) => read<DraftMeta>('drafts', draftId, 'Reading a draft'),
    readBody: (draftId) =>
      read<DraftBody>('bodies', draftId, 'Reading a draft'),
    write,
    patchMeta,
    remove,
    removeIfUnchanged,
    hasMedia,
    putMedia,
    getMedia: (userKey, mediaId) =>
      read<DraftMediaRecord>(
        'media',
        mediaKey(userKey, mediaId),
        'Reading audio',
      ),
    gcMedia,
    quarantine,
    listQuarantine,
    getMetaValue,
    setMetaValue,
    knownUserKeys,
    prune: (policy) => runPrune(adapter, policy),
    usage,
  };
  return adapter;
}

// ── Choosing the adapter ───────────────────────────────────────────────────

function globalIndexedDB(): IDBFactory | null {
  try {
    return typeof indexedDB === 'undefined' ? null : indexedDB;
  } catch {
    // Reading it throws where storage is refused (a sandboxed frame).
    return null;
  }
}

function globalLocalStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/**
 * A draft store over `env` (the page's globals for what is left out; null
 * means none). IndexedDB when it opens, else localStorage, else an adapter
 * whose writes reject 'unavailable' — decided at the first call, once.
 * `protect` feeds the localStorage adapter's cap trims (default: the page's
 * setDraftProtection provider); `openRetryMs` is for tests.
 */
export function createDraftStore(
  env: {
    indexedDB?: IDBFactory | null;
    storage?: Storage | null;
    now?: () => number;
    build?: string;
    writerDoc?: string;
    protect?: () => ReadonlySet<string>;
    openRetryMs?: number;
  } = {},
): DraftStore {
  const now = env.now ?? Date.now;
  const writer: DraftWriter = {
    build: env.build ?? DRAFT_BUILD,
    doc: env.writerDoc ?? WRITER_DOC,
  };
  const factory =
    env.indexedDB === undefined ? globalIndexedDB() : env.indexedDB;
  const storage =
    env.storage === undefined ? globalLocalStorage() : env.storage;
  const protect =
    env.protect ?? (() => pageGlobals().protect?.() ?? new Set<string>());
  const retryMs = env.openRetryMs ?? OPEN_RETRY_MS;

  let fallback: DraftStore | null = null;
  const local = (): DraftStore =>
    (fallback ??= createLocalStorageDrafts({ storage, now, writer, protect }));
  if (!factory) return local();

  const idb = createIndexedDbDrafts(factory, { now, writer });
  let chosen: DraftStore | null = null;
  let readyState: DraftStoreReady | null = null;
  let deciding: Promise<DraftStore> | null = null;

  const decide = async (): Promise<DraftStore> => {
    let reason: DraftStoreReady['reason'] = 'open-failed';
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0 && retryMs > 0)
        await new Promise((resolve) => setTimeout(resolve, retryMs));
      try {
        await idb.connect();
        chosen = idb;
        readyState = { kind: 'indexeddb', reason: null };
        return idb;
      } catch (caught) {
        // Another tab holds the database on an older version: undecided, so
        // the next call tries again.
        if (caught instanceof DraftStorageError && caught.kind === 'blocked')
          throw caught;
        console.warn('[drafts] Opening IndexedDB failed:', caught);
        if (errorName(caught) === 'SecurityError') {
          reason = 'security';
          break;
        }
      }
    }
    console.warn('[drafts] Keeping drafts in localStorage on this page.');
    chosen = local();
    readyState = {
      kind: 'localstorage',
      reason: storage ? reason : 'no-storage',
    };
    return chosen;
  };

  const target = (): Promise<DraftStore> => {
    if (chosen) return Promise.resolve(chosen);
    if (!deciding) {
      const run = decide();
      deciding = run;
      const clear = () => {
        if (deciding === run) deciding = null;
      };
      run.then(clear, clear);
    }
    return deciding;
  };

  return {
    get kind() {
      return chosen?.kind ?? 'indexeddb';
    },
    ready: async () => {
      await target();
      return readyState ?? { kind: 'indexeddb', reason: null };
    },
    list: async (userKey) => (await target()).list(userKey),
    getMeta: async (draftId) => (await target()).getMeta(draftId),
    readBody: async (draftId) => (await target()).readBody(draftId),
    write: async (w) => (await target()).write(w),
    patchMeta: async (draftId, patch) =>
      (await target()).patchMeta(draftId, patch),
    remove: async (draftId) => (await target()).remove(draftId),
    hasMedia: async (userKey, mediaIds) =>
      (await target()).hasMedia(userKey, mediaIds),
    putMedia: async (record) => (await target()).putMedia(record),
    getMedia: async (userKey, mediaId) =>
      (await target()).getMedia(userKey, mediaId),
    gcMedia: async (userKey, opts) => (await target()).gcMedia(userKey, opts),
    quarantine: async (record) => (await target()).quarantine(record),
    listQuarantine: async (userKey) => (await target()).listQuarantine(userKey),
    getMetaValue: async <T>(key: string) =>
      (await target()).getMetaValue<T>(key),
    setMetaValue: async <T>(key: string, value: T) =>
      (await target()).setMetaValue<T>(key, value),
    // A read-only probe (the tutorial store's first load can be the page's
    // first call) never decides the adapter: a passing IndexedDB failure
    // here must not settle localStorage for the whole page.
    knownUserKeys: async () => {
      if (chosen) return chosen.knownUserKeys();
      if (deciding) return (await deciding).knownUserKeys();
      return idb.connect().then(
        () => idb.knownUserKeys(),
        () => local().knownUserKeys(),
      );
    },
    prune: async (policy) => (await target()).prune(policy),
    usage: async (userKey) => (await target()).usage(userKey),
  };
}

/**
 * The page's draft store (one per page, kept across hot reloads):
 * IndexedDB, else the localStorage adapter. Never throws.
 */
export function getDraftStore(): DraftStore {
  const page = pageGlobals();
  if (page.store) return page.store;
  try {
    page.store = createDraftStore();
  } catch (caught) {
    console.warn('[drafts] The draft store could not start:', caught);
    page.store = createLocalStorageDrafts({
      storage: null,
      now: Date.now,
      writer: { build: DRAFT_BUILD, doc: WRITER_DOC },
    });
  }
  return page.store;
}

/** Tests only: forget the page's store (the next getDraftStore makes one). */
export function resetDraftStoreForTests(): void {
  pageGlobals().store = undefined;
}
