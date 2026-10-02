import type {
  ContentMockServer,
  MockStoreSnapshot,
  ReleaseEntry,
  StoredItem,
  StoredRelease,
  StoredRevision,
} from './contentMockServer';
import { decodeStoredDecisions, type StoredDecision } from './decisions';
import type { Body } from './mockKinds';
import {
  getMockStorageStatus,
  setMockStorageStatus,
} from './mockStorageStatus';
import {
  applyPatch,
  diffJson,
  jsonEqual,
  jsonHash,
  type PatchOp,
} from './patch';

/**
 * Keeps the offline mock's changes across reloads, in IndexedDB.
 *
 * What is stored is a structural patch per changed item against its seed body
 * (separately for `body` and `pendingBody`), never whole bodies: the song
 * corpus alone is 3.3 MB, while a batch that links every song to its artist
 * is one small patch per song. Releases are stored the same way, as the
 * difference from the seed's release of the kind. Items and releases the seed
 * already describes are not stored at all.
 *
 * Where it is stored: one text record in the IndexedDB database
 * `ma-console-mock-db`. Stage 1's bulk accepts (about 1,700 items, each with
 * revisions and a place in up to four release snapshots) and the imported
 * suggestions outgrow localStorage's 5 MB, which is where this used to live
 * (`ma-console-mock-v1`). A save from there is moved over once, when the
 * database first opens, and the old key is then removed (a later save found
 * there is kept: see `openMockDatabase`). Where IndexedDB is
 * refused, the mock falls back to localStorage as before, and where that is
 * refused too, it runs in memory (status `unavailable`).
 *
 * IndexedDB only reads asynchronously, while the rest of the mock loads and
 * saves synchronously. So this module opens the database and reads the record
 * once, as it is imported (a top-level await; the mock is only ever reached
 * through a dynamic import, so the await delays the mock's start and nothing
 * else), and keeps that text in memory. `load()` restores from the copy,
 * `flush()` encodes at once and hands the text to IndexedDB, which lands it a
 * moment later (`settled()` waits for it), and a save still pending when the
 * tab is hidden or closed is flushed then.
 *
 * A failed write never corrupts: a transaction either stores the whole value
 * or aborts, as localStorage.setItem either stores it or throws, and on a
 * failure the previous save stays as it was while mockStorageStatus tells the
 * console to show a banner.
 *
 * A patch only means something against the body it was computed from, and
 * the seed is the repo's content, which changes in code. So each patch is
 * saved with a fingerprint of its seed body, and one whose seed has since
 * changed is left out on load (status `stale`) rather than replayed onto the
 * wrong fields.
 */

/** The localStorage key: the fallback, and where older saves are moved from. */
export const MOCK_STORAGE_KEY = 'ma-console-mock-v1';

/** The IndexedDB database the mock's changes live in. */
export const MOCK_DATABASE_NAME = 'ma-console-mock-db';

/** Snapshots kept per kind besides the live one, so rollback has somewhere to go. */
const KEPT_SNAPSHOTS = 3;

// ── The stored shape ────────────────────────────────────────────────────────

type IsoDate = string;

interface PersistedItem {
  id: string;
  kind: StoredItem['kind'];
  slug: string;
  status: StoredItem['status'];
  /**
   * Absent: the seed body, or no body at all for an item the seed lacks (a
   * new proposal). Else a patch against the seed body, or against {}.
   */
  body?: PatchOp[];
  /** Absent: no proposal. Else a patch against the same base as `body`. */
  pendingBody?: PatchOp[];
  /**
   * Fingerprint of the base both patches were computed against (seedHash).
   * Absent in saves from before it existed, which are replayed as they are.
   */
  seed?: string;
  overrides?: Body;
  pendingOverrides?: Body;
  pendingNote?: string;
  pendingAt?: IsoDate;
  pendingById?: string;
  editState?: 'pending' | 'rejected';
  reviewNote?: string;
  reviewedAt?: IsoDate;
  derivedFromId?: string;
  derivedFromSlug?: string;
  createdAt: IsoDate;
  updatedAt: IsoDate;
  updatedById?: string;
  deleted?: true;
  /** Revisions beyond the seed's first. */
  revisions?: (Omit<StoredRevision, 'createdAt'> & { createdAt: IsoDate })[];
  /**
   * The item's revision (contract 5b). Absent in saves from before it
   * existed, which start again at 1: a tab reloaded reads every item anew.
   */
  revision?: number;
}

interface PersistedRelease {
  id: string;
  kind: StoredRelease['kind'];
  status: StoredRelease['status'];
  /** Everything below is absent for the seed's own release. */
  version?: number;
  itemCount?: number;
  totalBytes?: number;
  objectKeys?: string[];
  error?: string;
  startedAt?: IsoDate;
  publishedAt?: IsoDate;
  parts?: number[];
  partsDone?: number[];
  /**
   * The release's items as a difference from the seed's release of its kind:
   * seed members it leaves out, and members that differ or are new (a patch
   * against the item's seed body, or against {} when it has none), each with
   * the fingerprint of that base. Absent when the snapshot has been pruned.
   */
  entries?: { drop: string[]; put: PutEntry[] };
}

/** [itemId, slug, patch, seed fingerprint (absent in older saves)] */
type PutEntry = [string, string, PatchOp[], string?];

export interface PersistedMockState {
  v: 1;
  seq: number;
  items: PersistedItem[];
  releases: PersistedRelease[];
  users?: Record<string, string>;
  /**
   * The suggestion decisions log (decisions.ts), whole: small, and not
   * relative to the seed, so it is never stale. Absent while empty.
   */
  decisions?: StoredDecision[];
}

// ── Encoding ────────────────────────────────────────────────────────────────

const iso = (date: Date | null) => (date ? date.toISOString() : undefined);

// ── Decoding guards ─────────────────────────────────────────────────────────
//
// A stored value that decodes into something the server cannot hold (an
// Invalid Date, an item with no slug) would restore fine and then make every
// later save throw. So decode checks what it restores, and a bad value fails
// the whole load, which takes the `unreadable` path.

const bad = (what: string): never => {
  throw new Error(`Saved mock state has ${what}.`);
};

const requiredDate = (value: unknown, what: string): Date => {
  const parsed = typeof value === 'string' ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return bad(`a bad ${what}`);
  return parsed;
};

const date = (value: unknown, what: string): Date | null =>
  value === undefined || value === null ? null : requiredDate(value, what);

const text = (value: unknown, what: string): string =>
  typeof value === 'string' && value !== '' ? value : bad(`no ${what}`);

const oneOf = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  what: string,
): T =>
  allowed.includes(value as T) ? (value as T) : bad(`an unknown ${what}`);

const patchOrNothing = (value: unknown, what: string) => {
  if (value !== undefined && !Array.isArray(value)) bad(`a bad ${what} patch`);
  return value as PatchOp[] | undefined;
};

const ITEM_STATUSES = ['draft', 'published', 'archived'] as const;
const RELEASE_STATUSES = [
  'building',
  'live',
  'failed',
  'superseded',
  'rolled_back',
] as const;

/** Drop absent fields so an unchanged flag costs no bytes. */
const compact = <T extends object>(value: T): T => {
  const out: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(value))
    if (field !== undefined && field !== null && field !== false)
      out[key] = field;
  return out as T;
};

export function createMockStateCodec(server: ContentMockServer) {
  /** Fingerprint of the base an item's patches are computed against. */
  const seedHash = (itemId: string) =>
    jsonHash(server.seedBodyOf(itemId) ?? {});

  /** Saved changes left out on decode because their seed moved. */
  let stale: string[] = [];

  // A body object is never mutated, and belongs to one item, so its patch
  // against that item's seed is fixed. Without this every save would re-diff
  // every changed song.
  const patches = new WeakMap<object, PatchOp[]>();
  const patchFor = (itemId: string, body: Body): PatchOp[] => {
    let patch = patches.get(body);
    if (!patch) {
      patch = diffJson(server.seedBodyOf(itemId) ?? {}, body);
      patches.set(body, patch);
    }
    return patch;
  };

  const encodeItem = (item: StoredItem): PersistedItem => {
    const seedBody = server.seedBodyOf(item.id);
    const body =
      item.body && item.body !== seedBody
        ? patchFor(item.id, item.body)
        : undefined;
    return compact({
      id: item.id,
      kind: item.kind,
      slug: item.slug,
      status: item.status,
      body,
      pendingBody: item.pendingBody
        ? patchFor(item.id, item.pendingBody)
        : undefined,
      seed: body || item.pendingBody ? seedHash(item.id) : undefined,
      overrides: item.overrides ?? undefined,
      pendingOverrides: item.pendingOverrides ?? undefined,
      pendingNote: item.pendingNote ?? undefined,
      pendingAt: iso(item.pendingAt),
      pendingById: item.pendingById ?? undefined,
      editState: item.editState ?? undefined,
      reviewNote: item.reviewNote ?? undefined,
      reviewedAt: iso(item.reviewedAt),
      derivedFromId: item.derivedFromId ?? undefined,
      derivedFromSlug: item.derivedFromSlug ?? undefined,
      createdAt: iso(item.createdAt)!,
      updatedAt: iso(item.updatedAt)!,
      updatedById: item.updatedById ?? undefined,
      deleted: item.deleted ? true : undefined,
      revisions: (() => {
        const extra = item.revisions
          .filter((revision) => !(seedBody && revision.revision === 1))
          .map((revision) => ({
            ...revision,
            createdAt: iso(revision.createdAt)!,
          }));
        return extra.length ? extra : undefined;
      })(),
      revision: item.revision,
    });
  };

  const encodeEntries = (release: StoredRelease) => {
    if (!release.entries) return undefined;
    const seedEntries = server.seedReleaseEntriesOf(release.kind);
    const members = new Map(
      release.entries.map((entry) => [entry.itemId, entry]),
    );
    const drop = seedEntries
      .filter((entry) => !members.has(entry.itemId))
      .map((entry) => entry.itemId);
    const seedById = new Map(seedEntries.map((entry) => [entry.itemId, entry]));
    const put: PutEntry[] = [];
    for (const entry of release.entries) {
      const seeded = seedById.get(entry.itemId);
      if (
        seeded &&
        seeded.slug === entry.slug &&
        (seeded.body === entry.body || jsonEqual(seeded.body, entry.body))
      )
        continue;
      put.push([
        entry.itemId,
        entry.slug,
        patchFor(entry.itemId, entry.body),
        seedHash(entry.itemId),
      ]);
    }
    return { drop, put };
  };

  const encode = (snapshot: MockStoreSnapshot): PersistedMockState => {
    // Keep the live snapshot and the newest few others per kind; older ones
    // are listed but can no longer be rolled back to.
    const keep = new Set<string>();
    const byKind = new Map<string, StoredRelease[]>();
    for (const release of snapshot.releases) {
      if (release.status === 'live' || release.status === 'building')
        keep.add(release.id);
      else
        byKind.set(release.kind, [
          ...(byKind.get(release.kind) ?? []),
          release,
        ]);
    }
    for (const list of byKind.values()) {
      list
        .filter((release) => release.entries)
        .sort((a, b) => b.version - a.version)
        .slice(0, KEPT_SNAPSHOTS)
        .forEach((release) => keep.add(release.id));
    }

    return {
      v: 1,
      seq: snapshot.seq,
      users: snapshot.users,
      ...(snapshot.decisions.length ? { decisions: snapshot.decisions } : {}),
      items: snapshot.items.map(encodeItem),
      releases: snapshot.releases
        // The seed's live release needs saving only once its status moves.
        .filter((release) => !(release.seeded && release.status === 'live'))
        .map(
          (release): PersistedRelease =>
            release.seeded
              ? { id: release.id, kind: release.kind, status: release.status }
              : compact({
                  id: release.id,
                  kind: release.kind,
                  status: release.status,
                  version: release.version,
                  itemCount: release.itemCount,
                  totalBytes: release.totalBytes,
                  objectKeys: release.objectKeys,
                  error: release.error ?? undefined,
                  startedAt: iso(release.startedAt),
                  publishedAt: iso(release.publishedAt),
                  parts: release.parts,
                  partsDone: release.partsDone,
                  entries: keep.has(release.id)
                    ? encodeEntries(release)
                    : undefined,
                }),
        ),
    };
  };

  /** Null when the item's patches were made against a seed that moved. */
  const decodeItem = (stored: PersistedItem): StoredItem | null => {
    if (!stored || typeof stored !== 'object')
      return bad('an item that is not an object');
    const id = text(stored.id, 'item id');
    const kind = text(stored.kind, `kind on item ${id}`) as StoredItem['kind'];
    const slug = text(stored.slug, `slug on item ${id}`);
    const bodyPatch = patchOrNothing(stored.body, `body on ${slug}`);
    const pendingPatch = patchOrNothing(
      stored.pendingBody,
      `proposal on ${slug}`,
    );
    const createdAt = requiredDate(stored.createdAt, `createdAt on ${slug}`);
    const updatedAt = requiredDate(stored.updatedAt, `updatedAt on ${slug}`);
    const revisions = (stored.revisions ?? []).map((revision) => ({
      ...revision,
      createdAt: requiredDate(revision?.createdAt, `revision date on ${slug}`),
    }));
    if (
      (bodyPatch || pendingPatch) &&
      stored.seed !== undefined &&
      stored.seed !== seedHash(id)
    ) {
      stale.push(`${kind} ${slug}`);
      return null;
    }

    const seedBody = server.seedBodyOf(id);
    const base = seedBody ?? {};
    const body = bodyPatch ? applyPatch<Body>(base, bodyPatch) : seedBody;
    const seedRevision = seedBody ? server.seedRevisionOf(id) : undefined;
    return {
      id,
      kind,
      slug,
      status: oneOf(stored.status, ITEM_STATUSES, `status on ${slug}`),
      body,
      overrides: stored.overrides ?? null,
      pendingBody: pendingPatch ? applyPatch<Body>(base, pendingPatch) : null,
      pendingOverrides: stored.pendingOverrides ?? null,
      pendingNote: stored.pendingNote ?? null,
      pendingAt: date(stored.pendingAt, `pendingAt on ${slug}`),
      pendingById: stored.pendingById ?? null,
      editState: stored.editState ?? null,
      reviewNote: stored.reviewNote ?? null,
      reviewedAt: date(stored.reviewedAt, `reviewedAt on ${slug}`),
      derivedFromId: stored.derivedFromId ?? null,
      derivedFromSlug: stored.derivedFromSlug ?? null,
      createdAt,
      updatedAt,
      updatedById: stored.updatedById ?? null,
      deleted: stored.deleted === true,
      revisions: [...(seedRevision ? [seedRevision] : []), ...revisions],
      touched: true,
      revision:
        typeof stored.revision === 'number' &&
        Number.isInteger(stored.revision) &&
        stored.revision >= 0
          ? stored.revision
          : 1,
    };
  };

  const decodeRelease = (stored: PersistedRelease): StoredRelease | null => {
    if (!stored || typeof stored !== 'object')
      return bad('a release that is not an object');
    const id = text(stored.id, 'release id');
    const kind = text(
      stored.kind,
      `kind on release ${id}`,
    ) as StoredRelease['kind'];
    const status = oneOf(stored.status, RELEASE_STATUSES, `status on ${id}`);
    const seedEntries = server.seedReleaseEntriesOf(kind);
    if (stored.version === undefined) {
      // The seed's own release: only its status was saved.
      const release = server.seedRelease(kind);
      return release ? { ...release, status } : null;
    }
    if (typeof stored.version !== 'number') bad(`a bad version on ${id}`);
    let entries: ReleaseEntry[] | null = null;
    if (stored.entries) {
      if (
        !Array.isArray(stored.entries.drop) ||
        !Array.isArray(stored.entries.put)
      )
        bad(`bad entries on ${id}`);
      const dropped = new Set(stored.entries.drop);
      const put = new Map<string, { slug: string; patch: PatchOp[] }>();
      for (const [itemId, slug, patch, hash] of stored.entries.put) {
        if (!Array.isArray(patch)) bad(`a bad entry on ${id}`);
        // A moved seed: the entry falls back to the seed's own body for the
        // item, so the release stays whole, and the loss is reported.
        if (hash !== undefined && hash !== seedHash(itemId)) {
          stale.push(`${kind} v${stored.version} ${slug}`);
          continue;
        }
        put.set(itemId, { slug, patch });
      }
      entries = seedEntries
        .filter((entry) => !dropped.has(entry.itemId) && !put.has(entry.itemId))
        .concat(
          [...put].map(([itemId, { slug, patch }]) => ({
            itemId,
            slug,
            body: applyPatch<Body>(server.seedBodyOf(itemId) ?? {}, patch),
          })),
        )
        .sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
    }
    return {
      id,
      kind,
      version: stored.version,
      status,
      itemCount: stored.itemCount ?? entries?.length ?? 0,
      totalBytes: stored.totalBytes ?? 0,
      objectKeys: stored.objectKeys ?? [],
      error: stored.error ?? null,
      startedAt: date(stored.startedAt, `startedAt on ${id}`) ?? new Date(0),
      publishedAt: date(stored.publishedAt, `publishedAt on ${id}`),
      parts: stored.parts ?? [],
      partsDone: stored.partsDone ?? [],
      entries,
      seeded: false,
    };
  };

  const decode = (raw: unknown): MockStoreSnapshot => {
    const state = raw as PersistedMockState;
    if (
      !state ||
      state.v !== 1 ||
      !Array.isArray(state.items) ||
      !Array.isArray(state.releases)
    )
      throw new Error('Not a v1 mock state.');
    stale = [];
    return {
      seq: Number(state.seq) || 0,
      users: state.users ?? {},
      decisions: decodeStoredDecisions(state.decisions, bad),
      items: state.items
        .map(decodeItem)
        .filter((item): item is StoredItem => item !== null),
      releases: state.releases
        .map(decodeRelease)
        .filter((release): release is StoredRelease => release !== null),
    };
  };

  return {
    encode,
    decode,
    /** What the last decode left out because its seed had moved. */
    staleFromLastDecode: () => [...stale],
  };
}

// ── Storage ─────────────────────────────────────────────────────────────────

const isQuotaError = (caught: unknown) => {
  const { name, code } = (caught ?? {}) as { name?: unknown; code?: unknown };
  return (
    name === 'QuotaExceededError' ||
    name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    (caught instanceof DOMException && (code === 22 || code === 1014))
  );
};

const describe = (caught: unknown) =>
  caught instanceof Error ? caught.message || caught.name : String(caught);

const FULL_DETAIL =
  'Mock storage is full: changes from here on last only until reload. Reset the mock to clear it.';

const NO_STORAGE_DETAIL =
  'This browser gives the mock no storage; changes last until reload.';

const OPENING_DETAIL =
  "The mock's storage was still opening when the console started, so saved changes were not restored, and changes made now last until reload. Reload the page to restore them.";

const readLegacy = (storage: Storage | null, key: string) => {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
};

const removeLegacy = (storage: Storage | null, key: string) => {
  try {
    storage?.removeItem(key);
  } catch {
    // Nothing stored that could be removed.
  }
};

// ── IndexedDB ───────────────────────────────────────────────────────────────

const DATABASE_VERSION = 1;
const STATE_STORE = 'state';
/** The one record: the encoded state, as the same JSON text localStorage held. */
const STATE_KEY = 'mock';
/**
 * Beside it, the fingerprint of the localStorage save the record was moved
 * in from: that save, still in localStorage later, is known to be a copy.
 */
const MOVED_KEY = 'movedFrom';

/** A save's fingerprint: its length and two hashes of its text. */
const fingerprintOf = (text: string) => `${text.length}:${jsonHash(text)}`;

const requestResult = (request: IDBRequest) =>
  new Promise<unknown>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const openDatabase = (factory: IDBFactory, name: string) =>
  new Promise<IDBDatabase>((resolve, reject) => {
    // open() itself throws where storage is refused (a sandboxed frame); the
    // executor turns that into a rejection like any other.
    const request = factory.open(name, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STATE_STORE))
        request.result.createObjectStore(STATE_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    // `blocked` needs no handler: every connection here closes itself on a
    // version change (below), so the open simply waits for it.
  });

/**
 * Store `text`, or delete the record for null. Settles when it has landed.
 * `movedFrom`, for the move from localStorage, is stored in the same
 * transaction: both land, or neither.
 */
const writeRecord = (
  db: IDBDatabase,
  text: string | null,
  movedFrom?: string,
) => {
  const transaction = db.transaction(STATE_STORE, 'readwrite');
  const store = transaction.objectStore(STATE_STORE);
  if (text === null) {
    store.delete(STATE_KEY);
    store.delete(MOVED_KEY);
  } else store.put(text, STATE_KEY);
  if (movedFrom !== undefined) store.put(movedFrom, MOVED_KEY);
  const landed = new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    // A failed put (the quota, most often) aborts the whole transaction, so
    // the previous record stays as it was.
    transaction.onabort = () =>
      reject(
        transaction.error ??
          new DOMException('The save was cancelled.', 'AbortError'),
      );
  });
  // Commit now rather than when this task ends: on pagehide there may be no
  // later.
  transaction.commit?.();
  return landed;
};

/**
 * The mock's IndexedDB database, open, with the saved state kept in memory so
 * the mock can read it synchronously.
 */
export interface MockDatabase {
  /** What is saved: as read when the database opened, then as last written. */
  text(): string | null;
  /**
   * Why the saved record could not be read when the database opened, until
   * a write or removal replaces it; null when it could.
   */
  readError(): string | null;
  /** Save `text`. Settles once it has landed, or with the browser's error. */
  write(text: string): Promise<void>;
  /** Delete what is saved. */
  remove(): Promise<void>;
  /** Settles once every write and removal started so far has. */
  settled(): Promise<void>;
  close(): void;
}

interface HeldRecord {
  text: string | null;
  readError: string | null;
}

function databaseHandle(db: IDBDatabase, initial: HeldRecord): MockDatabase {
  // `landed` is what IndexedDB holds as far as this page knows, and `latest`
  // what it will hold once the queued writes land. IndexedDB runs them in
  // the order they were made, so a failed one rolls `latest` back to what
  // has landed unless a newer write has been queued since.
  let landed = initial;
  let latest = initial;
  let queued = 0;
  const inFlight = new Set<Promise<void>>();

  const run = (text: string | null): Promise<void> => {
    queued += 1;
    const ticket = queued;
    const next: HeldRecord = { text, readError: null };
    latest = next;
    let write: Promise<void>;
    try {
      write = writeRecord(db, text);
    } catch (caught) {
      // A closed connection (site data cleared) throws on transaction().
      write = Promise.reject(caught);
    }
    const tracked = write.then(
      () => {
        landed = next;
      },
      (caught: unknown) => {
        if (ticket === queued) latest = landed;
        throw caught;
      },
    );
    inFlight.add(tracked);
    const forget = () => {
      inFlight.delete(tracked);
    };
    tracked.then(forget, forget);
    return tracked;
  };

  return {
    text: () => latest.text,
    readError: () => latest.readError,
    write: (text) => run(text),
    remove: () => run(null),
    settled: async () => {
      await Promise.allSettled([...inFlight]);
    },
    close: () => db.close(),
  };
}

/**
 * Open the mock's database and read what it holds. The first time, a save
 * still in localStorage from before is moved in and the old key removed; if
 * that move fails, the database is left alone and this resolves null, so the
 * mock carries on in localStorage with nothing lost.
 *
 * A localStorage save found beside a record already here is removed only
 * when it is known to be a copy: the record itself, or the very save that
 * was moved in (a move interrupted before the key went). Anything else was
 * written since — by a session where IndexedDB was refused and the mock fell
 * back to localStorage, or by an older build — and is left where it is,
 * never deleted unseen; the database's record stays the one restored.
 *
 * Resolves null where IndexedDB is missing or refused. Never rejects.
 */
export async function openMockDatabase({
  indexedDB: factory,
  storage,
  key = MOCK_STORAGE_KEY,
  name = MOCK_DATABASE_NAME,
}: {
  indexedDB: IDBFactory | null;
  /** Where an older save may still be. */
  storage: Storage | null;
  key?: string;
  name?: string;
}): Promise<MockDatabase | null> {
  if (!factory) return null;
  let db: IDBDatabase;
  try {
    db = await openDatabase(factory, name);
  } catch {
    return null;
  }
  // Never hold up another tab's upgrade (or a "Clear site data").
  db.onversionchange = () => db.close();

  let text: string | null = null;
  let readError: string | null = null;
  let movedFrom: unknown;
  try {
    const store = db
      .transaction(STATE_STORE, 'readonly')
      .objectStore(STATE_STORE);
    const [stored, moved] = await Promise.all([
      requestResult(store.get(STATE_KEY)),
      requestResult(store.get(MOVED_KEY)),
    ]);
    if (typeof stored === 'string') text = stored;
    else if (stored !== undefined) readError = 'the saved record is not text';
    movedFrom = moved;
  } catch (caught) {
    readError = describe(caught);
  }

  // What cannot be read is never replaced, so an older save is only moved in
  // beside a readable record (or none).
  if (readError === null) {
    const legacy = readLegacy(storage, key);
    if (legacy !== null) {
      if (text === null) {
        try {
          await writeRecord(db, legacy, fingerprintOf(legacy));
        } catch {
          db.close();
          return null;
        }
        text = legacy;
        removeLegacy(storage, key);
      } else if (
        legacy === text ||
        (typeof movedFrom === 'string' && movedFrom === fingerprintOf(legacy))
      ) {
        // A copy: what an interrupted move left behind.
        removeLegacy(storage, key);
      }
    }
  }
  return databaseHandle(db, { text, readError });
}

// ── The mock's persistence ──────────────────────────────────────────────────

/** Where to hear that the page is being hidden or left. */
export interface MockPageEvents {
  window: Pick<EventTarget, 'addEventListener' | 'removeEventListener'> | null;
  document:
    | (Pick<EventTarget, 'addEventListener' | 'removeEventListener'> & {
        readonly visibilityState: string;
      })
    | null;
}

const browserPageEvents = (): MockPageEvents | null =>
  typeof window === 'undefined'
    ? null
    : {
        window,
        document: typeof document === 'undefined' ? null : document,
      };

export interface MockPersistence {
  /** Read what was saved and lay it over the server's seed. */
  load(): void;
  /** Save soon; many changes in a burst cost one write. */
  schedule(): void;
  /**
   * Save now. Returns the size of the saved state in characters (0 when
   * nothing has been saved and nothing changed), or null when it could not be
   * saved. IndexedDB lands the write a moment later and reports the outcome
   * through mockStorageStatus; `settled()` waits for it.
   */
  flush(): number | null;
  /** Forget everything saved. The caller rebuilds the server from the seed. */
  reset(): void;
  /** Stop: drops a pending save and the page listeners. */
  dispose(): void;
  /** Settles once every save and reset started so far has landed or failed. */
  settled(): Promise<void>;
}

export function createMockPersistence({
  server,
  storage,
  key = MOCK_STORAGE_KEY,
  debounceMs = 250,
  database,
  pageEvents = browserPageEvents(),
}: {
  server: ContentMockServer;
  /**
   * localStorage: the fallback where IndexedDB is refused. Null when the
   * browser refuses it too: the mock then runs in memory.
   */
  storage: Storage | null;
  key?: string;
  debounceMs?: number;
  /**
   * The database to save in. Left out: the one this module opened as it
   * loaded (none outside a browser). Null: `storage` only. A promise: one
   * still opening, so nothing is restored or saved until it has, and a save
   * it turns out to hold is left for a reload to restore.
   */
  database?: MockDatabase | null | Promise<MockDatabase | null>;
  /** Left out: the browser's window and document. */
  pageEvents?: MockPageEvents | null;
}): MockPersistence {
  const codec = createMockStateCodec(server);
  let timer: ReturnType<typeof setTimeout> | null = null;
  // Set when what is stored could not be read: writing would destroy it, so
  // nothing is written until the user resets.
  let blocked = false;
  let disposed = false;
  // Bumped by reset, so a write made before it reports nothing after it.
  let epoch = 0;
  // What storage holds, or will once IndexedDB lands it, and the server
  // generation that text stands for. An unchanged server is not encoded
  // again and an unchanged text is not written again, which matters on
  // pagehide: the page's own handler (handleMockRequest.ts) flushes right
  // after this module's.
  let savedText: string | null = null;
  let savedGeneration: number | null = null;

  // Where saves go. While `opening` is set, the database is still opening
  // (past the startup wait, for the page's own), and nothing is read or
  // written.
  const chosen =
    database === undefined ? (pageDatabaseOpening ?? pageDatabase) : database;
  let db = chosen instanceof Promise ? null : chosen;
  let opening = chosen instanceof Promise ? chosen : null;
  // A reset while the database was still opening: clear it once it opens.
  let wipeOnOpen = false;

  const reportSaved = () => {
    // A stale notice stays up until Reset; it is about what the load left
    // out, which a later save does not bring back.
    if (getMockStorageStatus().state !== 'stale')
      setMockStorageStatus({ state: 'ok' });
  };

  const reportFailed = (caught: unknown) =>
    setMockStorageStatus(
      isQuotaError(caught)
        ? { state: 'full', detail: FULL_DETAIL }
        : { state: 'unavailable', detail: describe(caught) },
    );

  const restore = (text: string | null) => {
    savedText = text;
    if (text === null) {
      savedGeneration = server.generation();
      setMockStorageStatus({ state: 'ok' });
      return;
    }
    try {
      server.restore(codec.decode(JSON.parse(text)));
    } catch (caught) {
      blocked = true;
      setMockStorageStatus({
        state: 'unreadable',
        detail: `Saved mock data could not be read (${describe(caught)}). Reset to start over.`,
      });
      return;
    }
    const stale = codec.staleFromLastDecode();
    if (stale.length === 0) {
      // The server now holds exactly what is saved.
      savedGeneration = server.generation();
      setMockStorageStatus({ state: 'ok' });
      return;
    }
    setMockStorageStatus({
      state: 'stale',
      detail: `${stale.length} saved change${
        stale.length === 1 ? ' was' : 's were'
      } made against an older copy of the repo's content and ${
        stale.length === 1 ? 'was' : 'were'
      } not restored: ${stale.slice(0, 5).join(', ')}${
        stale.length > 5 ? `, and ${stale.length - 5} more` : ''
      }. The next save drops ${stale.length === 1 ? 'it' : 'them'}.`,
    });
  };

  const load = () => {
    if (opening) {
      savedGeneration = server.generation();
      setMockStorageStatus({ state: 'unavailable', detail: OPENING_DETAIL });
      return;
    }
    if (db) {
      const readError = db.readError();
      if (readError !== null) {
        blocked = true;
        setMockStorageStatus({
          state: 'unreadable',
          detail: `Saved mock data could not be read (${readError}). Reset to start over.`,
        });
        return;
      }
      restore(db.text());
      return;
    }
    if (!storage) {
      setMockStorageStatus({ state: 'unavailable', detail: NO_STORAGE_DETAIL });
      return;
    }
    let text: string | null;
    try {
      text = storage.getItem(key);
    } catch (caught) {
      setMockStorageStatus({ state: 'unavailable', detail: describe(caught) });
      return;
    }
    restore(text);
  };

  const flush = (): number | null => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (opening || blocked || (!db && !storage)) return null;
    const generation = server.generation();
    if (generation === savedGeneration) return savedText?.length ?? 0;
    // Encoding runs from a timer and from pagehide, where a throw would go
    // unseen; a failure is reported like any other failed save.
    let text: string;
    try {
      text = JSON.stringify(codec.encode(server.snapshot()));
    } catch (caught) {
      setMockStorageStatus({
        state: 'unavailable',
        detail: `The mock's changes could not be saved (${describe(caught)}); they last until reload.`,
      });
      return null;
    }
    if (text === savedText) {
      savedGeneration = generation;
      reportSaved();
      return text.length;
    }
    if (db) {
      const target = db;
      const mine = epoch;
      target.write(text).then(
        () => {
          if (mine === epoch && !disposed) reportSaved();
        },
        (caught: unknown) => {
          if (mine !== epoch || disposed) return;
          // Whatever changes next, the next flush writes again.
          if (savedText === text) {
            savedText = target.text();
            savedGeneration = null;
          }
          reportFailed(caught);
        },
      );
    } else if (storage) {
      try {
        storage.setItem(key, text);
      } catch (caught) {
        reportFailed(caught);
        return null;
      }
      reportSaved();
    }
    savedText = text;
    savedGeneration = generation;
    return text.length;
  };

  const schedule = () => {
    if (timer || disposed) return;
    timer = setTimeout(() => {
      timer = null;
      flush();
    }, debounceMs);
  };

  const reset = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    blocked = false;
    epoch += 1;
    const mine = epoch;
    savedText = null;
    savedGeneration = null;
    db?.remove().catch((caught: unknown) => {
      if (mine === epoch)
        setMockStorageStatus({
          state: 'unavailable',
          detail: `Saved mock data could not be cleared (${describe(caught)}), so it may come back on reload.`,
        });
    });
    if (opening) wipeOnOpen = true;
    removeLegacy(storage, key);
    setMockStorageStatus({ state: 'ok' });
  };

  // The database opened only after the mock had started. What it holds was
  // not restored, so it is left alone and the banner asks for a reload; an
  // empty one is simply taken up.
  void opening?.then((opened) => {
    // Before the disposed check: the console's Reset disposes first. This
    // runs ahead of the next persistence's own handler, so that one finds
    // the database empty.
    if (wipeOnOpen) {
      opened?.remove().catch(() => undefined);
      removeLegacy(storage, key);
    }
    if (disposed) return;
    opening = null;
    db = opened;
    const holdsSave = opened
      ? opened.text() !== null || opened.readError() !== null
      : readLegacy(storage, key) !== null;
    if (holdsSave) {
      blocked = true;
      return;
    }
    if (!opened && !storage) {
      setMockStorageStatus({ state: 'unavailable', detail: NO_STORAGE_DETAIL });
      return;
    }
    setMockStorageStatus({ state: 'ok' });
    if (server.generation() !== savedGeneration) schedule();
  });

  // A save still waiting on the debounce when the tab is hidden or closed
  // would be lost: hidden is the last moment a mobile browser promises.
  const flushIfChanged = () => {
    if (server.generation() !== savedGeneration) flush();
  };
  const onVisibilityChange = () => {
    if (pageEvents?.document?.visibilityState === 'hidden') flushIfChanged();
  };
  pageEvents?.window?.addEventListener('pagehide', flushIfChanged);
  pageEvents?.document?.addEventListener(
    'visibilitychange',
    onVisibilityChange,
  );

  return {
    load,
    schedule,
    flush,
    reset,
    dispose: () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      timer = null;
      pageEvents?.window?.removeEventListener('pagehide', flushIfChanged);
      pageEvents?.document?.removeEventListener(
        'visibilitychange',
        onVisibilityChange,
      );
    },
    settled: () => db?.settled() ?? Promise.resolve(),
  };
}

// ── The page's database ─────────────────────────────────────────────────────
//
// Opened once, as this module loads, so the first load() can read it
// synchronously. The await holds up only the mock's own dynamic import. If
// the database takes longer than OPEN_TIMEOUT_MS the mock starts without it
// (the `opening` path above) rather than hang.

const OPEN_TIMEOUT_MS = 3000;

const browserIndexedDB = (): IDBFactory | null => {
  try {
    return typeof indexedDB === 'undefined' ? null : indexedDB;
  } catch {
    return null;
  }
};

const browserLocalStorage = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

let pageDatabase: MockDatabase | null = null;
let pageDatabaseOpening: Promise<MockDatabase | null> | null = null;

const pageFactory = browserIndexedDB();
if (pageFactory) {
  // openMockDatabase never rejects; the catch keeps a surprise from failing
  // the mock's import.
  const opening = openMockDatabase({
    indexedDB: pageFactory,
    storage: browserLocalStorage(),
  }).catch(() => null);
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const opened = await Promise.race([
    opening.then((database) => ({ database })),
    new Promise<null>((resolve) => {
      timeout = setTimeout(() => resolve(null), OPEN_TIMEOUT_MS);
    }),
  ]);
  clearTimeout(timeout);
  if (opened) {
    pageDatabase = opened.database;
  } else {
    pageDatabaseOpening = opening;
    void opening.then((database) => {
      pageDatabase = database;
      pageDatabaseOpening = null;
    });
  }
}
