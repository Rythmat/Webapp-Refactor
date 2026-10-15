import type { UserKey } from '@/lib/local-store/userScope';
import type { DraftStore } from './draftStore';
import { hashFingerprint } from './fingerprintHash';
import { draftHasWork } from './predicates';
import {
  runPrune,
  sameDraftState,
  type PruneOps,
  type PrunePolicy,
} from './prune';
import {
  DraftStorageError,
  type DraftBody,
  type DraftMeta,
  type DraftMetaPatch,
  type DraftMediaRecord,
  type DraftWrite,
  type DraftWriter,
  type QuarantineRecord,
} from './types';

// ── Drafts in localStorage: the fallback adapter (milestone 1.4, E1) ──────
//
// Where IndexedDB is missing or broken (two failed opens, a SecurityError),
// the page keeps drafts here behind the same DraftStore interface, smaller:
//
// - a draft is one key, 'musicAtlas:daw:draft:<userKey>:<draftId>' =
//   {meta, text}; meta values are 'musicAtlas:daw:draftmeta:<key>';
// - at most LS_MAX_DRAFTS_PER_USER drafts per user and LS_MAX_CHARS
//   characters of drafts in all; a write over either cap first trims the
//   oldest unprotected drafts without work (other than itself: the per-user
//   cap trims only the writing user's, the character cap anyone's), and is
//   refused 'quota' if that isn't enough;
// - when localStorage itself is full, the write drops the oldest
//   unprotected drafts without work, but only when a probe shows that makes
//   room (the same probe-and-drop as 1.3's setItemMakingRoom, in the
//   localSession.ts 1.4 removed), else it is refused 'quota' with nothing
//   dropped;
// - "unprotected": not in the protect set the page supplies (the active
//   draft, drafts locked by other tabs, the pointer), and not written by
//   another page in the last LS_LIVE_ELSEWHERE_MS (likely live in a tab
//   that can't tell us);
// - no media (putMedia rejects 'unavailable'): the chip says 'Audio not
//   saved yet';
// - the quarantine is this adapter's own: 'musicAtlas:daw:draftq:<userKey>:
//   <hash>:<n>' holding the whole record as JSON (raw text included). It
//   never writes under 1.3's 'musicAtlas:daw:unreadable:' prefix, which 1.4
//   must not write (E6) and which legacyImport reads as legacy input.
//
// Compare-and-set is by re-reading before the write (localStorage is
// synchronous; another tab can still interleave, which the next CAS sees).
// Parsed entries are cached per key and reused while the stored string is
// the same, so an autosave doesn't re-parse every draft on each write.
//
// If localStorage throws too, the adapter is 'unavailable': writes reject
// with kind 'unavailable' and reads find nothing.
//
// This module also holds the record rules both adapters share (what a write
// stores, how a patch merges). Imports: types, predicates, fingerprintHash,
// userScope, prune.

export const LS_DRAFT_PREFIX = 'musicAtlas:daw:draft:';
export const LS_META_PREFIX = 'musicAtlas:daw:draftmeta:';
/** This adapter's quarantine (never 1.3's unreadable prefix: E6). */
export const LS_QUARANTINE_PREFIX = 'musicAtlas:daw:draftq:';
export const LS_MAX_DRAFTS_PER_USER = 5;
export const LS_MAX_CHARS = 1_000_000;
/** A draft another page wrote this recently is treated as live there. */
export const LS_LIVE_ELSEWHERE_MS = 10 * 60 * 1000;
const PROBE_KEY = 'musicAtlas:daw:storage-probe';
const NO_PROTECTION: ReadonlySet<string> = new Set();

// ── Record rules (both adapters) ───────────────────────────────────────────

/** Origins whose create may carry the content's own time (DraftWrite.updatedAt). */
const IMPORT_ORIGINS: ReadonlySet<DraftMeta['origin']> = new Set([
  'migrated',
  'kept',
  'recovered',
]);

/** Optional meta fields stored only when set (null and undefined are left out). */
const OPTIONAL_FIELDS = [
  'keptAt',
  'cloud',
  'context',
  'forkedFrom',
  'claimedFrom',
] as const;

/** Newest updatedAt first (ties: draftId descending, as the IDB index reversed). */
export const newestFirst = (a: DraftMeta, b: DraftMeta): number =>
  b.updatedAt - a.updatedAt ||
  (a.draftId < b.draftId ? 1 : a.draftId > b.draftId ? -1 : 0);

/**
 * Why a 'conflict' was refused (DraftStorageError.cause):
 * - 'seq': the stored writeSeq isn't expectedSeq (another writer, or this
 *   page's own earlier write: compare `writer.doc` with WRITER_DOC);
 * - 'owner': the stored draft belongs to `userKey` now (a '~device' draft
 *   claimed through patchMeta): adopt that key and write again, never fork;
 * - 'exists': a create over a stored draft.
 */
export type DraftConflictCause =
  | { reason: 'seq'; writeSeq: number; writer: DraftWriter | null }
  | { reason: 'owner'; userKey: UserKey }
  | { reason: 'exists'; writeSeq: number };

/** A 'conflict' error's reason, or null for any other error. */
export function conflictReason(
  error: unknown,
): DraftConflictCause['reason'] | null {
  if (!(error instanceof DraftStorageError) || error.kind !== 'conflict')
    return null;
  const reason = (error.cause as { reason?: unknown } | undefined)?.reason;
  return reason === 'seq' || reason === 'owner' || reason === 'exists'
    ? reason
    : null;
}

/** Why a write can't go ahead over `existing`, or null when it can. */
export function writeRefusal(
  existing: DraftMeta | null | undefined,
  w: DraftWrite,
): DraftStorageError | null {
  const id = w.meta.draftId;
  const conflict = (message: string, cause: DraftConflictCause) =>
    new DraftStorageError('conflict', message, { cause });
  if (w.expectedSeq === null) {
    return existing
      ? conflict(`Draft ${id} already exists.`, {
          reason: 'exists',
          writeSeq: existing.writeSeq,
        })
      : null;
  }
  if (!existing)
    return new DraftStorageError('not-found', `Draft ${id} is not stored.`);
  if (existing.writeSeq !== w.expectedSeq)
    return conflict(
      `Draft ${id} is at write ${existing.writeSeq}, not ${w.expectedSeq}.`,
      {
        reason: 'seq',
        writeSeq: existing.writeSeq,
        writer: existing.writer ?? null,
      },
    );
  if (existing.userKey !== w.meta.userKey)
    return conflict(`Draft ${id} belongs to another user now.`, {
      reason: 'owner',
      userKey: existing.userKey,
    });
  return null;
}

/** Whether `w` is well formed enough to store. */
export function invalidWrite(w: DraftWrite): DraftStorageError | null {
  const m = w?.meta;
  if (
    !m ||
    typeof m.draftId !== 'string' ||
    m.draftId === '' ||
    typeof m.userKey !== 'string' ||
    m.userKey === '' ||
    typeof w.text !== 'string' ||
    (w.expectedSeq !== null && !Number.isInteger(w.expectedSeq))
  ) {
    return new DraftStorageError('corrupt', 'The draft write is malformed.');
  }
  return null;
}

/**
 * The meta a write stores: the writer's meta, with v, writeSeq, updatedAt,
 * writer, contentHash and chars set by the store, createdAt the store's own
 * (now on create, whatever the caller passed; the stored value after), and
 * projectId and roomId (and other optional fields) left out when null.
 */
export function buildStoredMeta(
  w: DraftWrite,
  existing: DraftMeta | null | undefined,
  now: number,
  writer: DraftWriter,
): DraftMeta {
  const { projectId, roomId, ...rest } = w.meta;
  const importTime =
    w.expectedSeq === null &&
    IMPORT_ORIGINS.has(w.meta.origin) &&
    typeof w.updatedAt === 'number' &&
    Number.isFinite(w.updatedAt)
      ? w.updatedAt
      : null;
  const meta: DraftMeta = {
    ...rest,
    v: 1,
    writeSeq: (w.expectedSeq ?? 0) + 1,
    updatedAt: importTime ?? now,
    writer: { build: writer.build, doc: writer.doc },
    contentHash: hashFingerprint(w.text),
    chars: w.text.length,
    // Never the caller's: every age rule measures from createdAt, so an
    // import passing its content's old time would be pruned on arrival.
    createdAt: existing?.createdAt ?? now,
  };
  if (projectId) meta.projectId = projectId;
  if (roomId) meta.roomId = roomId;
  for (const field of OPTIONAL_FIELDS) {
    if (meta[field] === null || meta[field] === undefined) delete meta[field];
  }
  return meta;
}

/**
 * `stored` with `patch` merged: null clears a field. Never touches
 * writeSeq, writer, contentHash or the body; updatedAt moves (to `now`) only
 * when the patch sets origin, keptAt or name.
 */
export function applyMetaPatch(
  stored: DraftMeta,
  patch: DraftMetaPatch,
  now: number,
): DraftMeta {
  const next: DraftMeta = { ...stored };
  const clearable = ['keptAt', 'projectId', 'roomId', 'cloud'] as const;
  for (const field of clearable) {
    const value = patch[field];
    if (value === undefined) continue;
    if (value === null || value === '') delete next[field];
    else (next as unknown as Record<string, unknown>)[field] = value;
  }
  if (patch.origin !== undefined) next.origin = patch.origin;
  if (patch.name !== undefined) next.name = patch.name;
  if (patch.userKey !== undefined && patch.userKey !== '')
    next.userKey = patch.userKey;
  if (patch.claimedFrom !== undefined) {
    if (patch.claimedFrom === null || patch.claimedFrom === '')
      delete next.claimedFrom;
    else next.claimedFrom = patch.claimedFrom;
  }
  if (
    patch.origin !== undefined ||
    patch.keptAt !== undefined ||
    patch.name !== undefined
  ) {
    next.updatedAt = now;
  }
  return next;
}

// ── Storage access ─────────────────────────────────────────────────────────

const isQuota = (caught: unknown): boolean => {
  const { name, code } = (caught ?? {}) as { name?: unknown; code?: unknown };
  return (
    name === 'QuotaExceededError' ||
    name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    code === 22 ||
    code === 1014
  );
};

const storageError = (caught: unknown, what: string) =>
  new DraftStorageError(
    isQuota(caught) ? 'quota' : 'unavailable',
    `${what}: ${caught instanceof Error ? caught.message || caught.name : String(caught)}`,
    { cause: caught },
  );

const unavailable = (what: string) =>
  new DraftStorageError(
    'unavailable',
    `${what}: this browser gives the Studio no storage.`,
  );

interface StoredEntry {
  meta: DraftMeta;
  text: string;
}

interface ScannedDraft {
  key: string;
  userKey: UserKey;
  draftId: string;
}

/** A draft on the device, parsed, with its stored size. */
interface DeviceDraft {
  key: string;
  meta: DraftMeta;
  text: string;
  size: number;
}

/** Where a localStorage draft key points, or null for any other key. */
function parseDraftKey(key: string): ScannedDraft | null {
  if (!key.startsWith(LS_DRAFT_PREFIX)) return null;
  const rest = key.slice(LS_DRAFT_PREFIX.length);
  const split = rest.indexOf(':');
  if (split <= 0 || split === rest.length - 1) return null;
  return { key, userKey: rest.slice(0, split), draftId: rest.slice(split + 1) };
}

export const lsDraftKey = (userKey: UserKey, draftId: string): string =>
  `${LS_DRAFT_PREFIX}${userKey}:${draftId}`;

/** A quarantine key's owner and hash, or null for another key. */
function parseQuarantineKey(key: string): { owner: UserKey } | null {
  if (!key.startsWith(LS_QUARANTINE_PREFIX)) return null;
  const rest = key.slice(LS_QUARANTINE_PREFIX.length);
  const split = rest.indexOf(':');
  if (split <= 0) return null;
  return { owner: rest.slice(0, split) };
}

/** Everything the localStorage adapter is, beyond DraftStore. */
export type LocalStorageDraftStore = DraftStore & PruneOps;

/**
 * The localStorage adapter over `storage` (null, or a storage that throws:
 * the 'unavailable' adapter). `protect` gives the draft ids no cap trim may
 * drop (the page's active draft, locked drafts, the pointer).
 */
export function createLocalStorageDrafts(env: {
  storage: Storage | null;
  now: () => number;
  writer: DraftWriter;
  protect?: () => ReadonlySet<string>;
}): LocalStorageDraftStore {
  const { now, writer } = env;
  let storage: Storage | null = env.storage;
  try {
    void storage?.length;
  } catch {
    storage = null;
  }

  const keys = (): string[] => {
    if (!storage) return [];
    const out: string[] = [];
    try {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key !== null) out.push(key);
      }
    } catch {
      // Unreadable storage holds nothing we can use.
    }
    return out;
  };

  const getItem = (key: string): string | null => {
    try {
      return storage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  };

  const removeItem = (key: string) => {
    try {
      storage?.removeItem(key);
    } catch {
      // Nothing that could be removed.
    }
  };

  /**
   * Parsed entries by key, valid while the stored string is the same one
   * (comparing strings is far cheaper than parsing up to 1M characters).
   */
  const parsed = new Map<string, { raw: string; entry: StoredEntry | null }>();

  const parseEntry = (raw: string): StoredEntry | null => {
    try {
      const value = JSON.parse(raw) as Partial<StoredEntry> | null;
      if (
        !value ||
        typeof value.text !== 'string' ||
        !value.meta ||
        typeof value.meta.draftId !== 'string'
      )
        return null;
      return value as StoredEntry;
    } catch {
      return null;
    }
  };

  /** The entry under `key` with its raw string, or null. */
  const readRaw = (
    key: string,
  ): { raw: string; entry: StoredEntry | null } | null => {
    const raw = getItem(key);
    if (raw === null) {
      parsed.delete(key);
      return null;
    }
    const cached = parsed.get(key);
    if (cached && cached.raw === raw) return cached;
    const fresh = { raw, entry: parseEntry(raw) };
    parsed.set(key, fresh);
    return fresh;
  };

  const readEntry = (key: string): StoredEntry | null =>
    readRaw(key)?.entry ?? null;

  /** Store `value` under `key` and remember its parse. */
  const remember = (key: string, raw: string, entry: StoredEntry) => {
    parsed.set(key, { raw, entry });
  };

  const scanDrafts = (userKey?: UserKey): ScannedDraft[] =>
    keys().flatMap((key) => {
      const scanned = parseDraftKey(key);
      if (!scanned) return [];
      if (userKey !== undefined && scanned.userKey !== userKey) return [];
      return [scanned];
    });

  /** Every draft on the device, parsed once, oldest first. */
  const allDrafts = (): DeviceDraft[] => {
    const live = new Set<string>();
    const out: DeviceDraft[] = [];
    for (const { key } of scanDrafts()) {
      live.add(key);
      const read = readRaw(key);
      if (read?.entry)
        out.push({
          key,
          meta: read.entry.meta,
          text: read.entry.text,
          size: key.length + read.raw.length,
        });
    }
    for (const key of parsed.keys()) if (!live.has(key)) parsed.delete(key);
    return out.sort((a, b) => a.meta.updatedAt - b.meta.updatedAt);
  };

  const find = (
    draftId: string,
  ): { key: string; entry: StoredEntry } | null => {
    for (const scanned of scanDrafts()) {
      if (scanned.draftId !== draftId) continue;
      const entry = readEntry(scanned.key);
      if (entry && entry.meta.draftId === draftId)
        return { key: scanned.key, entry };
    }
    return null;
  };

  /**
   * Whether a cap trim or a full storage may drop `d`: no work, not
   * protected, and not written by another page in the last
   * LS_LIVE_ELSEWHERE_MS (probably open in that tab).
   */
  const trimmableNow = (): ((d: DeviceDraft) => boolean) => {
    let protect: ReadonlySet<string> = NO_PROTECTION;
    try {
      protect = env.protect?.() ?? NO_PROTECTION;
    } catch {
      protect = NO_PROTECTION;
    }
    const at = now();
    return (d) =>
      !draftHasWork(d.meta) &&
      !protect.has(d.meta.draftId) &&
      !(
        d.meta.writer?.doc !== writer.doc &&
        at - d.meta.updatedAt < LS_LIVE_ELSEWHERE_MS
      );
  };

  // ── Making room (as 1.3's hasRoomFor / setItemMakingRoom did) ──

  const hasRoomFor = (chars: number, wide: boolean): boolean => {
    if (!storage) return false;
    const filler = wide ? 'Ā' : 'x';
    try {
      storage.removeItem(PROBE_KEY);
      storage.setItem(
        PROBE_KEY,
        filler.repeat(Math.max(0, chars - PROBE_KEY.length)),
      );
      return true;
    } catch {
      return false;
    } finally {
      try {
        storage.removeItem(PROBE_KEY);
      } catch {
        // Nothing was written.
      }
    }
  };

  /**
   * Write `value` under `key`, dropping the first of `droppable` (oldest
   * first) only when a probe shows that makes room; what was dropped goes
   * back if the write still fails. Throws the last storage error.
   */
  const setItemMakingRoom = (
    key: string,
    value: string,
    droppable: readonly string[],
  ): void => {
    const s = storage;
    if (!s) throw unavailable('Writing a draft');
    let firstError: unknown;
    try {
      s.setItem(key, value);
      return;
    } catch (caught) {
      firstError = caught;
      if (!isQuota(caught)) throw caught;
    }
    const current = getItem(key);
    const needed =
      current === null
        ? key.length + value.length
        : value.length - current.length;
    const wide = /[Ā-￿]/.test(value);
    let freed = 0;
    for (let count = 1; count <= droppable.length; count++) {
      const candidate = droppable[count - 1];
      freed += candidate.length + (getItem(candidate)?.length ?? 0);
      if (!hasRoomFor(needed - freed, wide)) continue;
      const dropped: [string, string][] = [];
      for (const old of droppable.slice(0, count)) {
        const oldValue = getItem(old);
        if (oldValue === null) continue;
        dropped.push([old, oldValue]);
        removeItem(old);
      }
      try {
        s.setItem(key, value);
        return;
      } catch (caught) {
        for (const [old, oldValue] of dropped) {
          try {
            s.setItem(old, oldValue);
          } catch (err) {
            console.warn('[drafts] Could not put back', old, err);
          }
        }
        throw caught;
      }
    }
    throw firstError;
  };

  /** Drop `keysToDrop`, returning what to put back on failure. */
  const dropAll = (keysToDrop: string[]): [string, string][] => {
    const dropped: [string, string][] = [];
    for (const key of keysToDrop) {
      const value = getItem(key);
      if (value === null) continue;
      dropped.push([key, value]);
      removeItem(key);
    }
    return dropped;
  };

  const putBack = (dropped: [string, string][]) => {
    for (const [key, value] of dropped) {
      try {
        storage?.setItem(key, value);
      } catch (err) {
        console.warn('[drafts] Could not put back', key, err);
      }
    }
  };

  // ── The adapter ──────────────────────────────────────────────────────────

  const write = async (w: DraftWrite): Promise<DraftMeta> => {
    const bad = invalidWrite(w);
    if (bad) throw bad;
    if (!storage) throw unavailable('Writing a draft');
    // One scan and parse for the whole write (the hot path in fallback).
    const all = allDrafts();
    const found = all.find((d) => d.meta.draftId === w.meta.draftId) ?? null;
    const refusal = writeRefusal(found?.meta, w);
    if (refusal) throw refusal;
    const meta = buildStoredMeta(w, found?.meta, now(), writer);
    const key = lsDraftKey(meta.userKey, meta.draftId);
    const entry: StoredEntry = { meta, text: w.text };
    const value = JSON.stringify(entry);

    // The caps: count and characters after this write.
    const others = all.filter((d) => d.meta.draftId !== meta.draftId);
    const trimmable = others.filter(trimmableNow());
    const toTrim: string[] = [];
    let userCount =
      others.filter((d) => d.meta.userKey === meta.userKey).length + 1;
    let total =
      others.reduce((sum, d) => sum + d.size, 0) + key.length + value.length;
    for (const d of trimmable) {
      if (userCount <= LS_MAX_DRAFTS_PER_USER && total <= LS_MAX_CHARS) break;
      const helpsCount =
        userCount > LS_MAX_DRAFTS_PER_USER && d.meta.userKey === meta.userKey;
      const helpsChars = total > LS_MAX_CHARS;
      if (!helpsCount && !helpsChars) continue;
      toTrim.push(d.key);
      total -= d.size;
      if (d.meta.userKey === meta.userKey) userCount -= 1;
    }
    if (userCount > LS_MAX_DRAFTS_PER_USER || total > LS_MAX_CHARS) {
      throw new DraftStorageError(
        'quota',
        'Drafts on this device are at their limit (no storage for drafts but this browser).',
      );
    }
    const trimmed = dropAll(toTrim);
    try {
      setItemMakingRoom(
        key,
        value,
        trimmable.map((d) => d.key).filter((k) => !toTrim.includes(k)),
      );
    } catch (caught) {
      putBack(trimmed);
      throw storageError(caught, 'Writing a draft');
    }
    remember(key, value, entry);
    if (found && found.key !== key) removeItem(found.key);
    return meta;
  };

  const patchMeta = async (
    draftId: string,
    patch: DraftMetaPatch,
  ): Promise<DraftMeta | null> => {
    if (!storage) throw unavailable('Updating a draft');
    const found = find(draftId);
    if (!found) return null;
    const meta = applyMetaPatch(found.entry.meta, patch, now());
    const key = lsDraftKey(meta.userKey, draftId);
    const entry: StoredEntry = { meta, text: found.entry.text };
    const value = JSON.stringify(entry);
    try {
      storage.setItem(key, value);
    } catch (caught) {
      throw storageError(caught, 'Updating a draft');
    }
    remember(key, value, entry);
    if (key !== found.key) removeItem(found.key);
    return meta;
  };

  const list = async (userKey: UserKey): Promise<DraftMeta[]> =>
    scanDrafts(userKey)
      .flatMap(({ key }) => {
        const entry = readEntry(key);
        return entry && entry.meta.userKey === userKey ? [entry.meta] : [];
      })
      .sort(newestFirst);

  const remove = async (draftId: string): Promise<void> => {
    for (const scanned of scanDrafts()) {
      if (scanned.draftId === draftId) removeItem(scanned.key);
    }
  };

  const removeIfUnchanged = async (planned: DraftMeta): Promise<boolean> => {
    const found = find(planned.draftId);
    if (!found || !sameDraftState(found.entry.meta, planned)) return false;
    removeItem(found.key);
    return true;
  };

  // ── Quarantine ('musicAtlas:daw:draftq:<userKey>:<hash>:<n>' = record) ──

  const quarantineEntries = (userKey: UserKey) =>
    keys().flatMap((key) => {
      const owner = parseQuarantineKey(key)?.owner;
      if (owner !== userKey) return [];
      const raw = getItem(key);
      if (raw === null) return [];
      try {
        const record = JSON.parse(raw) as QuarantineRecord | null;
        return record &&
          typeof record.raw === 'string' &&
          typeof record.hash === 'string'
          ? [{ key, record }]
          : [];
      } catch {
        return [];
      }
    });

  const quarantine = async (
    record: Omit<QuarantineRecord, 'id'>,
  ): Promise<'stored' | 'duplicate'> => {
    if (!storage) throw unavailable('Keeping an unreadable draft');
    const mine = quarantineEntries(record.userKey);
    // The same content once per user: the hash finds it, the raw text
    // confirms it (a hash collision is stored, never dropped).
    if (
      mine.some(
        (e) => e.record.hash === record.hash && e.record.raw === record.raw,
      )
    )
      return 'duplicate';
    const base = `${LS_QUARANTINE_PREFIX}${record.userKey}:${encodeURIComponent(record.hash)}:`;
    let n = 0;
    while (getItem(base + n) !== null) n++;
    const { id: _id, ...clean } = record as QuarantineRecord;
    void _id;
    try {
      storage.setItem(base + n, JSON.stringify(clean));
    } catch (caught) {
      throw storageError(caught, 'Keeping an unreadable draft');
    }
    return 'stored';
  };

  const listQuarantine = async (
    userKey: UserKey,
  ): Promise<QuarantineRecord[]> =>
    quarantineEntries(userKey)
      .map(({ record }) => ({ ...record, userKey }))
      .sort((a, b) => b.at - a.at);

  const getMetaValue = async <T>(key: string): Promise<T | null> => {
    const raw = getItem(LS_META_PREFIX + key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  };

  const setMetaValue = async <T>(key: string, value: T): Promise<void> => {
    if (!storage) throw unavailable('Saving a draft setting');
    try {
      storage.setItem(LS_META_PREFIX + key, JSON.stringify(value));
    } catch (caught) {
      throw storageError(caught, 'Saving a draft setting');
    }
  };

  const knownUserKeys = async (): Promise<Set<UserKey>> =>
    new Set(scanDrafts().map((d) => d.userKey));

  const gcMedia = async (): Promise<number> => 0;

  const adapter: LocalStorageDraftStore = {
    kind: 'localstorage',
    ready: async () => ({
      kind: 'localstorage',
      reason: storage ? 'no-indexeddb' : 'no-storage',
    }),
    list,
    getMeta: async (draftId) => find(draftId)?.entry.meta ?? null,
    readBody: async (draftId): Promise<DraftBody | null> => {
      const found = find(draftId);
      return found
        ? {
            draftId,
            writeSeq: found.entry.meta.writeSeq,
            text: found.entry.text,
          }
        : null;
    },
    write,
    patchMeta,
    remove,
    removeIfUnchanged,
    hasMedia: async () => new Set<string>(),
    putMedia: async (_record: DraftMediaRecord) => {
      void _record;
      throw new DraftStorageError(
        'unavailable',
        'Audio is not kept on this device in this browser.',
      );
    },
    getMedia: async () => null,
    gcMedia,
    quarantine,
    listQuarantine,
    getMetaValue,
    setMetaValue,
    knownUserKeys,
    prune: (policy: PrunePolicy) => runPrune(adapter, policy),
    usage: async (userKey) => {
      const mine = await list(userKey);
      return {
        drafts: mine.length,
        chars: mine.reduce((sum, m) => sum + m.chars, 0),
        mediaBytes: 0,
      };
    },
  };
  return adapter;
}
