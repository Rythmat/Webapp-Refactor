import {
  DRAFT_DB_NAME,
  DRAFT_STORES,
  DraftStorageError,
  type DraftErrorKind,
  type DraftStoreName,
} from './types';

// ── The 'ma-studio' IndexedDB database: opening it, and transactions ──────
//
// Modelled on the console mock's persist.ts (writeRecord, openMockDatabase),
// not on local-store/idbKeyValue.ts, which resolves on request success (not
// when the data has landed) and caches a failed open for the life of the
// page:
//
// - The database is opened WITHOUT a version, so a build that is reverted
//   after a later one upgraded it still opens it. When it lacks a store or an
//   index this build needs (the first time, or a database an older build
//   made), it is reopened at version + 1 and only what is missing is added.
//   Nothing is ever deleted: a later build's extra stores stay.
// - A connection closes itself on versionchange (another tab upgrading, or
//   "Clear site data"), and the next call opens a new one.
// - A write settles on the transaction's complete, after commit(): a put
//   that succeeded can still be lost by an abort (quota is often only
//   checked at commit time). An abort rejects with a typed DraftStorageError.
//
// No store, codec or React imports: the Studio dashboard loads this.

/** How long an open waits on another connection that blocks its upgrade. */
export const OPEN_BLOCKED_MS = 2000;

/** One index this build reads. */
interface IndexSpec {
  name: string;
  keyPath: string | string[];
}

/** One store this build reads, and how it is made. */
interface StoreSpec {
  options: IDBObjectStoreParameters;
  indexes: IndexSpec[];
}

/** The schema this build needs. Upgrades only ever add to it. */
export const DRAFT_SCHEMA: Readonly<Record<DraftStoreName, StoreSpec>> = {
  drafts: {
    options: { keyPath: 'draftId' },
    indexes: [
      { name: 'byUser', keyPath: ['userKey', 'updatedAt'] },
      { name: 'byUserProject', keyPath: ['userKey', 'projectId'] },
    ],
  },
  bodies: { options: { keyPath: 'draftId' }, indexes: [] },
  media: {
    options: { keyPath: 'key' },
    indexes: [{ name: 'byUser', keyPath: 'userKey' }],
  },
  quarantine: {
    options: { keyPath: 'id', autoIncrement: true },
    indexes: [{ name: 'byUserHash', keyPath: ['userKey', 'hash'] }],
  },
  meta: { options: { keyPath: 'key' }, indexes: [] },
};

// ── Errors ─────────────────────────────────────────────────────────────────

const errorName = (caught: unknown): string | null => {
  const name = (caught as { name?: unknown } | null)?.name;
  return typeof name === 'string' ? name : null;
};

/** Whether `caught` is the browser running out of room. */
export function isQuotaError(caught: unknown): boolean {
  const name = errorName(caught);
  const code = (caught as { code?: unknown } | null)?.code;
  return (
    name === 'QuotaExceededError' ||
    name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    (typeof DOMException !== 'undefined' &&
      caught instanceof DOMException &&
      (code === 22 || code === 1014))
  );
}

/** The DraftErrorKind for a browser error (QuotaExceeded → 'quota', …). */
export function draftErrorKindOf(caught: unknown): DraftErrorKind {
  if (caught instanceof DraftStorageError) return caught.kind;
  if (isQuotaError(caught)) return 'quota';
  switch (errorName(caught)) {
    case 'ConstraintError':
      return 'conflict';
    case 'DataError':
    case 'DataCloneError':
      return 'corrupt';
    // UnknownError, InvalidStateError, VersionError, AbortError,
    // SecurityError, TransactionInactiveError and anything else: storage the
    // page can't use right now.
    default:
      return 'unavailable';
  }
}

/** `caught` as a DraftStorageError (itself when it already is one). */
export function toDraftError(caught: unknown, what: string): DraftStorageError {
  if (caught instanceof DraftStorageError) return caught;
  const detail =
    caught instanceof Error
      ? caught.message || caught.name
      : caught === null || caught === undefined
        ? 'aborted'
        : String(caught);
  return new DraftStorageError(draftErrorKindOf(caught), `${what}: ${detail}`, {
    cause: caught,
  });
}

// ── Opening ────────────────────────────────────────────────────────────────

/** What the open database is missing: stores, and indexes of existing ones. */
function missingSchema(db: IDBDatabase, tx: IDBTransaction | null) {
  const stores: DraftStoreName[] = [];
  const indexes: { store: DraftStoreName; index: IndexSpec }[] = [];
  for (const name of DRAFT_STORES) {
    if (!db.objectStoreNames.contains(name)) {
      stores.push(name);
      continue;
    }
    const spec = DRAFT_SCHEMA[name];
    if (spec.indexes.length === 0) continue;
    // Index names are only readable through a transaction.
    let have: DOMStringList | null = null;
    try {
      have = (tx ?? db.transaction(name, 'readonly')).objectStore(
        name,
      ).indexNames;
    } catch {
      have = null;
    }
    for (const index of spec.indexes) {
      if (!have?.contains(index.name)) indexes.push({ store: name, index });
    }
  }
  return { stores, indexes };
}

/** In an upgrade: add whatever this build needs and the database lacks. */
function addMissing(db: IDBDatabase, tx: IDBTransaction | null) {
  for (const name of DRAFT_STORES) {
    const spec = DRAFT_SCHEMA[name];
    let store: IDBObjectStore;
    if (!db.objectStoreNames.contains(name)) {
      store = db.createObjectStore(name, spec.options);
    } else if (tx) {
      store = tx.objectStore(name);
    } else {
      continue;
    }
    for (const index of spec.indexes) {
      if (!store.indexNames.contains(index.name))
        store.createIndex(index.name, index.keyPath);
    }
  }
}

function openOnce(
  factory: IDBFactory,
  name: string,
  version: number | undefined,
  blockedMs: number,
): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    let settled = false;
    let blockedTimer: ReturnType<typeof setTimeout> | null = null;
    const finish = () => {
      settled = true;
      if (blockedTimer !== null) clearTimeout(blockedTimer);
    };
    // open() itself throws where storage is refused (a sandboxed frame).
    const request =
      version === undefined ? factory.open(name) : factory.open(name, version);
    request.onupgradeneeded = () => {
      try {
        addMissing(request.result, request.transaction);
      } catch (caught) {
        // Aborting the upgrade fails the open; the error says why.
        try {
          request.transaction?.abort();
        } catch {
          // Already finished.
        }
        if (!settled) {
          finish();
          reject(toDraftError(caught, 'Upgrading the drafts database failed'));
        }
      }
    };
    request.onsuccess = () => {
      if (settled) {
        // Too late (blocked past the wait): never leave it open.
        request.result.close();
        return;
      }
      finish();
      resolve(request.result);
    };
    request.onerror = (event) => {
      // Handled here; don't let it surface as an uncaught error.
      event.preventDefault?.();
      if (settled) return;
      finish();
      reject(request.error ?? new DOMException('open failed', 'UnknownError'));
    };
    request.onblocked = () => {
      if (settled || blockedTimer !== null) return;
      blockedTimer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(
          new DraftStorageError(
            'blocked',
            'Another tab is holding the drafts database open on an older version.',
          ),
        );
      }, blockedMs);
    };
  });
}

/**
 * Open the drafts database, adding missing stores and indexes through one
 * version + 1 upgrade. Rejects with the browser's error (SecurityError, …)
 * or a DraftStorageError 'blocked' after `blockedMs`.
 */
export async function openDraftDatabase(
  factory: IDBFactory,
  opts: { name?: string; blockedMs?: number } = {},
): Promise<IDBDatabase> {
  const name = opts.name ?? DRAFT_DB_NAME;
  const blockedMs = opts.blockedMs ?? OPEN_BLOCKED_MS;
  // Two rounds: another tab may upgrade between our open and our upgrade
  // (a VersionError), after which a plain open has everything.
  for (let round = 0; ; round++) {
    const db = await openOnce(factory, name, undefined, blockedMs);
    const missing = missingSchema(db, null);
    if (missing.stores.length === 0 && missing.indexes.length === 0) return db;
    const version = db.version;
    db.close();
    try {
      return await openOnce(factory, name, version + 1, blockedMs);
    } catch (caught) {
      if (errorName(caught) === 'VersionError' && round === 0) continue;
      throw caught;
    }
  }
}

// ── Requests and transactions ──────────────────────────────────────────────

/** A request's result, as a promise. */
export function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    // No preventDefault: an error left alone aborts the transaction, which
    // is what a failed write must do.
    request.onerror = () => reject(request.error);
  });
}

/**
 * Open a transaction, passing durability where the browser takes it (older
 * ones ignore the third argument).
 */
export function openTransaction(
  db: IDBDatabase,
  stores: DraftStoreName | DraftStoreName[],
  mode: IDBTransactionMode,
  durability?: IDBTransactionDurability,
): IDBTransaction {
  return durability
    ? db.transaction(stores, mode, { durability })
    : db.transaction(stores, mode);
}

/**
 * Run `body` in a transaction and settle when the transaction does: resolve
 * with what `body` produced on complete, reject on abort. `body` may call
 * `fail(error)` to abort the transaction with that error (a compare-and-set
 * that doesn't match, say); a throw inside it does the same. A write's
 * transaction is committed explicitly once `body`'s requests are queued —
 * pass `commitAfter` for that (on pagehide there may be no later).
 */
export function runTransaction<T>(
  db: IDBDatabase,
  stores: DraftStoreName | DraftStoreName[],
  mode: IDBTransactionMode,
  what: string,
  body: (
    tx: IDBTransaction,
    fail: (error: DraftStorageError) => void,
    done: (value: T) => void,
  ) => void,
  opts: { durability?: IDBTransactionDurability } = {},
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let tx: IDBTransaction;
    try {
      tx = openTransaction(db, stores, mode, opts.durability);
    } catch (caught) {
      reject(toDraftError(caught, what));
      return;
    }
    let failure: DraftStorageError | null = null;
    let value: T | undefined;
    const fail = (error: DraftStorageError) => {
      if (failure !== null) return;
      failure = error;
      try {
        tx.abort();
      } catch {
        // Already finished: oncomplete or onabort still decides.
      }
    };
    const done = (result: T) => {
      value = result;
    };
    tx.oncomplete = () => {
      if (failure !== null) reject(failure);
      else resolve(value as T);
    };
    tx.onabort = () => {
      reject(
        failure ??
          toDraftError(
            tx.error ??
              new DOMException('The transaction was aborted.', 'AbortError'),
            what,
          ),
      );
    };
    try {
      body(tx, fail, done);
    } catch (caught) {
      fail(toDraftError(caught, what));
    }
  });
}

/** Commit a readwrite transaction now (where the browser can). */
export function commitNow(tx: IDBTransaction): void {
  try {
    tx.commit?.();
  } catch {
    // Already committing or finished.
  }
}

/**
 * Call `fn` in a request's success handler, turning a throw (a put that
 * throws QuotaExceededError or DataCloneError at once) into the
 * transaction's failure.
 */
export function guarded(
  fail: (error: DraftStorageError) => void,
  what: string,
  fn: () => void,
): () => void {
  return () => {
    try {
      fn();
    } catch (caught) {
      fail(toDraftError(caught, what));
    }
  };
}
