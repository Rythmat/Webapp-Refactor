import type { UserKey } from '@/lib/local-store/userScope';
import { acquireDraftLock } from './draftLock';
import { DRAFT_BUILD, type DraftStore } from './draftStore';
import { hashFingerprint } from './fingerprintHash';
import { isDraftStorageError, type DraftMeta, type DraftWrite } from './types';

// ── The synchronous mirror (milestone 1.4, decision E5) ────────────────────
//
// IndexedDB writes are asynchronous, so a tab that is hidden, closed or
// frozen may die before its last draft write commits. At that moment, and
// only when memory is ahead of the last commit, the autosave also writes the
// same snapshot synchronously to localStorage under
//
//   musicAtlas:daw:mirror:<userKey>:<draftId>
//
// with the writeSeq of the IndexedDB write it starts at the same moment
// (baseSeq is the seq that write replaces). Once IndexedDB holds that
// writeSeq the mirror is removed. A mirror still there at the next boot is
// reconciled against IndexedDB by sequence numbers and content hashes, never
// by clocks:
//
// - unparseable: quarantined (raw), then removed;
// - a later build's format (v > 1): left in place for that build, untouched;
// - its draft locked by another tab: skipped (that tab owns it; the claim
//   reconciles it under the lock, reconcileMirror). reconcileMirrors takes
//   each draft's lock itself (ifAvailable) while it reconciles it, so two
//   tabs restored together after a crash reconcile each mirror once;
// - no IndexedDB record: created from the mirror;
// - IndexedDB already holding the same content (same contentHash), or past
//   the mirror's writeSeq: the mirror is stale and dropped;
// - IndexedDB at an ancestor of the mirror (the writes queued before it
//   never landed): the mirror is written over it (compare-and-set). An
//   ancestor is
//   - the record at baseSeq (the simultaneous write never landed);
//   - the record the writing page's queued chain started from (chainFromSeq
//     with chainFromHash: the record it adopted or last saw committed, even
//     when another page wrote it, as after a reload);
//   - a record between the chain's start and baseSeq written by the same
//     page (writerDoc): earlier writes of the chain that landed;
// - anything else (another writer moved it, or the same seq with other
//   content): the mirror becomes a 'recovered' copy under a new id; nothing
//   is written over.
//
// The value is the session text unescaped, inside a small JSON envelope:
// '{"v":1,…,"meta":{…},"session":' + text + '}', so a 1M-character session
// costs 1M characters, not the 1.1M+ of a JSON string. The read gives back
// the text verbatim (sliced, then checked), so its content hash matches the
// one IndexedDB computed from the same text.
//
// No editor store, codec or React imports (the draft store only for its
// build stamp): the Studio dashboard loads this.

/** Every mirror key's prefix: then `<userKey>:<draftId>`. */
export const MIRROR_PREFIX = 'musicAtlas:daw:mirror:';
/** The largest mirror written, in characters (the whole stored value). */
export const MIRROR_MAX_CHARS = 1_000_000;

/** A mirror as stored (and read back). */
export interface MirrorEntry {
  v: 1;
  draftId: string;
  userKey: UserKey;
  /** The IndexedDB writeSeq the simultaneous write replaces (0 = none stored). */
  baseSeq: number;
  /** The writeSeq that write gives the draft: baseSeq + 1. */
  writeSeq: number;
  /** Date.now() when written. */
  at: number;
  /** hashFingerprint(text): tells two snapshots at one writeSeq apart. */
  contentHash: string;
  /** The writing page (WRITER_DOC), when the writer gave it. */
  writerDoc?: string;
  /**
   * The writeSeq of the record the page's queue of unlanded writes started
   * from: the last seq it saw committed, or adopted on open (written by
   * another page after a reload). With chainFromHash, lets reconcile
   * recognise that record as an ancestor. Absent in older mirrors.
   */
  chainFromSeq?: number;
  /** That record's contentHash. */
  chainFromHash?: string;
  meta: DraftWrite['meta'];
  text: string;
}

/** What writeMirror takes: contentHash is computed when left out. */
export type MirrorInput = Omit<MirrorEntry, 'contentHash'> & {
  contentHash?: string;
};

/** The build stamped on quarantine records (vite's define; 'dev' outside a build). */
export { DRAFT_BUILD };

function localStore(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** The mirror key of a user's draft. */
export function mirrorKey(userKey: UserKey, draftId: string): string {
  return `${MIRROR_PREFIX}${userKey}:${draftId}`;
}

const isQuota = (caught: unknown): boolean => {
  const { name, code } = (caught ?? {}) as { name?: unknown; code?: unknown };
  return (
    name === 'QuotaExceededError' ||
    name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    code === 22 ||
    code === 1014
  );
};

/** The envelope's head: every field but the session, as JSON, without its '}'. */
function headOf(entry: Omit<MirrorEntry, 'text'>): string {
  const head = JSON.stringify({
    v: 1,
    draftId: entry.draftId,
    userKey: entry.userKey,
    baseSeq: entry.baseSeq,
    writeSeq: entry.writeSeq,
    at: entry.at,
    contentHash: entry.contentHash,
    ...(entry.writerDoc ? { writerDoc: entry.writerDoc } : {}),
    ...(entry.chainFromSeq !== undefined
      ? { chainFromSeq: entry.chainFromSeq }
      : {}),
    ...(entry.chainFromHash !== undefined
      ? { chainFromHash: entry.chainFromHash }
      : {}),
    meta: entry.meta,
  });
  return head.slice(0, -1);
}

const SESSION_FIELD = ',"session":';

/**
 * Write a draft's mirror, synchronously. 'too-big' above MIRROR_MAX_CHARS
 * and 'failed' when storage refuses it (full, closed): in both cases any
 * earlier mirror of the draft is left as it was (it may be the newest copy
 * that reached storage). Never throws.
 */
export function writeMirror(
  entry: MirrorInput,
  storage: Storage | null = localStore(),
): 'written' | 'too-big' | 'failed' {
  if (!storage) return 'failed';
  try {
    const contentHash = entry.contentHash ?? hashFingerprint(entry.text);
    const value =
      headOf({ ...entry, contentHash }) + SESSION_FIELD + entry.text + '}';
    if (value.length > MIRROR_MAX_CHARS) return 'too-big';
    storage.setItem(mirrorKey(entry.userKey, entry.draftId), value);
    return 'written';
  } catch (caught) {
    if (!isQuota(caught))
      console.warn('[drafts] Writing the mirror failed:', caught);
    return 'failed';
  }
}

/** Remove a draft's mirror (once IndexedDB holds its writeSeq). Never throws. */
export function removeMirror(
  userKey: UserKey,
  draftId: string,
  storage: Storage | null = localStore(),
): void {
  try {
    storage?.removeItem(mirrorKey(userKey, draftId));
  } catch {
    // Nothing that could be removed.
  }
}

const isSeq = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

/** A stored value as a mirror of `userKey`'s `draftId`, or null when it isn't one. */
function parseMirror(
  raw: string,
  userKey: UserKey,
  draftId: string,
): MirrorEntry | null {
  let parsed: Record<string, unknown>;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null || Array.isArray(value))
      return null;
    parsed = value as Record<string, unknown>;
  } catch {
    return null;
  }
  const meta = parsed.meta as DraftWrite['meta'] | null | undefined;
  if (
    parsed.v !== 1 ||
    parsed.draftId !== draftId ||
    parsed.userKey !== userKey ||
    !isSeq(parsed.baseSeq) ||
    !isSeq(parsed.writeSeq) ||
    parsed.writeSeq <= parsed.baseSeq ||
    !('session' in parsed) ||
    typeof meta !== 'object' ||
    meta === null ||
    Array.isArray(meta) ||
    meta.draftId !== draftId ||
    meta.userKey !== userKey
  ) {
    return null;
  }
  const at =
    typeof parsed.at === 'number' && Number.isFinite(parsed.at) ? parsed.at : 0;
  const writerDoc =
    typeof parsed.writerDoc === 'string' && parsed.writerDoc !== ''
      ? parsed.writerDoc
      : undefined;
  const stored =
    typeof parsed.contentHash === 'string' ? parsed.contentHash : null;
  const chainFromSeq =
    isSeq(parsed.chainFromSeq) && parsed.chainFromSeq <= parsed.baseSeq
      ? parsed.chainFromSeq
      : undefined;
  const chainFromHash =
    chainFromSeq !== undefined && typeof parsed.chainFromHash === 'string'
      ? parsed.chainFromHash
      : undefined;
  const base = {
    v: 1 as const,
    draftId,
    userKey,
    baseSeq: parsed.baseSeq,
    writeSeq: parsed.writeSeq,
    at,
    contentHash: stored ?? '',
    ...(writerDoc ? { writerDoc } : {}),
    ...(chainFromSeq !== undefined ? { chainFromSeq } : {}),
    ...(chainFromHash !== undefined ? { chainFromHash } : {}),
    meta,
  };
  // The text verbatim: everything between the head and the closing brace,
  // when the head re-serializes to what is stored (it does for anything
  // writeMirror wrote). Otherwise the session re-serialized.
  let text: string | null = null;
  if (stored !== null) {
    const head = headOf(base) + SESSION_FIELD;
    if (raw.startsWith(head) && raw.endsWith('}')) {
      text = raw.slice(head.length, -1);
    }
  }
  if (text === null) text = JSON.stringify(parsed.session);
  if (typeof text !== 'string') return null;
  return { ...base, contentHash: stored ?? hashFingerprint(text), text };
}

/**
 * `userKey`'s mirrors on this device, each with its key, its raw value, and
 * the entry it holds (null when it isn't a readable mirror). Never throws.
 */
export function readMirrors(
  userKey: UserKey,
  storage: Storage | null = localStore(),
): { key: string; entry: MirrorEntry | null; raw: string }[] {
  if (!storage) return [];
  const prefix = `${MIRROR_PREFIX}${userKey}:`;
  const keys: string[] = [];
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key !== null && key.startsWith(prefix) && key.length > prefix.length)
        keys.push(key);
    }
  } catch {
    return [];
  }
  const out: { key: string; entry: MirrorEntry | null; raw: string }[] = [];
  for (const key of keys.sort()) {
    let raw: string | null;
    try {
      raw = storage.getItem(key);
    } catch {
      continue;
    }
    if (raw === null) continue;
    out.push({
      key,
      raw,
      entry: parseMirror(raw, userKey, key.slice(prefix.length)),
    });
  }
  return out;
}

/** What reconciling one mirror did. */
export type MirrorOutcome =
  /** No mirror for the draft. */
  | 'none'
  /** Written to IndexedDB (created, or over the record it was based on). */
  | 'applied'
  /** IndexedDB already holds it, or something newer: removed. */
  | 'dropped'
  /** Saved as a new 'recovered' draft (its id in `recoveredId`). */
  | 'recovered'
  /** Unreadable: kept in the quarantine, then removed. */
  | 'quarantined'
  /** Another tab holds the draft, or a later build wrote it: left as is. */
  | 'skipped'
  /** Storage failed: the mirror stays, for the next boot. */
  | 'failed';

export interface MirrorReconcileResult {
  applied: string[];
  dropped: string[];
  /** The new drafts' ids. */
  recovered: string[];
  quarantined: string[];
  skipped: string[];
  failed: string[];
}

function newDraftId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      return crypto.randomUUID();
  } catch {
    // Falls through.
  }
  return `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** The mirror's meta, held to its own draft and owner. */
function ownMeta(entry: MirrorEntry): DraftWrite['meta'] {
  return { ...entry.meta, draftId: entry.draftId, userKey: entry.userKey };
}

async function quarantineRaw(
  store: DraftStore,
  userKey: UserKey,
  raw: string,
  draftId: string,
): Promise<void> {
  await store.quarantine({
    userKey,
    source: 'mirror',
    reason: 'The mirror could not be read.',
    build: DRAFT_BUILD,
    hash: hashFingerprint(raw),
    raw,
    at: Date.now(),
    draftId,
  });
}

/** Save the mirror as a new draft, origin 'recovered'. Resolves its id. */
async function saveRecovered(
  store: DraftStore,
  entry: MirrorEntry,
): Promise<string> {
  const draftId = newDraftId();
  const meta: DraftWrite['meta'] = {
    ...ownMeta(entry),
    draftId,
    origin: 'recovered',
    forkedFrom: entry.draftId,
    roomId: undefined,
  };
  delete meta.roomId;
  await store.write({
    meta,
    text: entry.text,
    expectedSeq: null,
    durability: 'strict',
    updatedAt: entry.at || undefined,
  });
  return draftId;
}

/** Whether `existing` is a record the mirror's writes descend from. */
function isAncestor(existing: DraftMeta, entry: MirrorEntry): boolean {
  if (existing.writeSeq === entry.baseSeq) return true;
  if (existing.writeSeq > entry.baseSeq) return false;
  const { chainFromSeq, chainFromHash } = entry;
  if (chainFromSeq !== undefined) {
    // The record the page's queue started from (any writer: after a reload
    // the page adopted a record the previous page wrote).
    if (
      existing.writeSeq === chainFromSeq &&
      chainFromHash !== undefined &&
      existing.contentHash === chainFromHash
    ) {
      return true;
    }
    // Earlier writes of the same chain that landed.
    return (
      existing.writeSeq > chainFromSeq &&
      entry.writerDoc !== undefined &&
      existing.writer?.doc === entry.writerDoc
    );
  }
  // An older mirror without the chain's start: a record this page wrote.
  return (
    entry.writerDoc !== undefined && existing.writer?.doc === entry.writerDoc
  );
}

/** Whether the store now holds the mirror's content, or something newer. */
function storeHasIt(existing: DraftMeta | null, entry: MirrorEntry): boolean {
  if (!existing || existing.userKey !== entry.userKey) return false;
  return (
    existing.contentHash === entry.contentHash ||
    existing.writeSeq > entry.writeSeq
  );
}

/** Reconcile one readable mirror against the store (see the rules above). */
async function reconcileEntry(
  store: DraftStore,
  entry: MirrorEntry,
): Promise<{ outcome: MirrorOutcome; recoveredId?: string }> {
  const existing: DraftMeta | null = await store.getMeta(entry.draftId);
  if (storeHasIt(existing, entry)) return { outcome: 'dropped' };
  if (
    !existing ||
    (existing.userKey === entry.userKey && isAncestor(existing, entry))
  ) {
    try {
      await store.write({
        meta: ownMeta(entry),
        text: entry.text,
        expectedSeq: existing ? existing.writeSeq : null,
        durability: 'strict',
      });
      return { outcome: 'applied' };
    } catch (caught) {
      // Moved under us (another tab): it may hold this very content now.
      if (!isDraftStorageError(caught, 'conflict')) throw caught;
      if (storeHasIt(await store.getMeta(entry.draftId), entry))
        return { outcome: 'dropped' };
    }
  }
  return {
    outcome: 'recovered',
    recoveredId: await saveRecovered(store, entry),
  };
}

/** What reconcileMirror did, with the cause when storage failed. */
export interface MirrorReconcileOne {
  outcome: MirrorOutcome;
  recoveredId?: string;
  /** Outcome 'failed': whether storage was full or failed otherwise. */
  failure?: 'quota' | 'unavailable';
}

/**
 * Reconcile the mirror of one draft, if there is one. For the tab that has
 * just taken the draft's lock (the claim): it runs whether or not the draft
 * is locked, since the caller holds that lock. The mirror is removed after
 * it is applied, dropped, recovered or quarantined, and kept when storage
 * fails. Never throws.
 */
export async function reconcileMirror(
  store: DraftStore,
  userKey: UserKey,
  draftId: string,
  opts: { storage?: Storage | null } = {},
): Promise<MirrorReconcileOne> {
  const storage = opts.storage === undefined ? localStore() : opts.storage;
  if (!storage) return { outcome: 'none' };
  const key = mirrorKey(userKey, draftId);
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    return { outcome: 'none' };
  }
  if (raw === null) return { outcome: 'none' };
  return reconcileRaw(store, userKey, draftId, raw, storage);
}

/** Whether `raw` is a mirror in a format a later build writes (v > 1). */
function isLaterFormat(raw: string): boolean {
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null || Array.isArray(value))
      return false;
    const { v } = value as { v?: unknown };
    return typeof v === 'number' && v > 1;
  } catch {
    return false;
  }
}

async function reconcileRaw(
  store: DraftStore,
  userKey: UserKey,
  draftId: string,
  raw: string,
  storage: Storage,
): Promise<MirrorReconcileOne> {
  const entry = parseMirror(raw, userKey, draftId);
  if (!entry && isLaterFormat(raw)) {
    // A later build's mirror (a revert happened): leave it for that build.
    return { outcome: 'skipped' };
  }
  try {
    if (!entry) {
      await quarantineRaw(store, userKey, raw, draftId);
      removeMirror(userKey, draftId, storage);
      return { outcome: 'quarantined' };
    }
    const result = await reconcileEntry(store, entry);
    removeMirror(userKey, draftId, storage);
    return result;
  } catch (caught) {
    console.warn('[drafts] Reconciling a mirror failed; keeping it:', caught);
    const quota = isDraftStorageError(caught, 'quota') || isQuota(caught);
    return { outcome: 'failed', failure: quota ? 'quota' : 'unavailable' };
  }
}

/**
 * The mirror of `userKey`'s `draftId` when it is newer than `existing` and
 * descends from it (or there is no record): the one a reconcile writes over
 * the record. For a claim whose reconcile failed (storage full): the page
 * opens this copy, not the older record. Null when there is none, it isn't
 * readable, or the store holds it already. Never throws.
 */
export function mirrorAheadOf(
  userKey: UserKey,
  draftId: string,
  existing: DraftMeta | null,
  storage: Storage | null = localStore(),
): MirrorEntry | null {
  if (!storage) return null;
  let raw: string | null;
  try {
    raw = storage.getItem(mirrorKey(userKey, draftId));
  } catch {
    return null;
  }
  if (raw === null) return null;
  const entry = parseMirror(raw, userKey, draftId);
  if (!entry || storeHasIt(existing, entry)) return null;
  if (
    existing &&
    (existing.userKey !== entry.userKey || !isAncestor(existing, entry))
  )
    return null;
  return entry;
}

/**
 * Reconcile every mirror of `userKey` on this device (boot, once per page
 * and user), except those of drafts in `locked` (another tab's, or one this
 * tab is about to claim: reconcileMirror runs under its lock). Each draft's
 * lock is taken (ifAvailable) while its mirror is reconciled, and the mirror
 * re-read under it, so tabs reconciling at once (a crash restore) never both
 * apply one mirror; a draft whose lock is taken meanwhile is skipped.
 * Never throws.
 */
export async function reconcileMirrors(
  store: DraftStore,
  userKey: UserKey,
  opts: {
    locked: ReadonlySet<string>;
    storage?: Storage | null;
    locks?: LockManager | null;
  },
): Promise<MirrorReconcileResult> {
  const result: MirrorReconcileResult = {
    applied: [],
    dropped: [],
    recovered: [],
    quarantined: [],
    skipped: [],
    failed: [],
  };
  const storage = opts.storage === undefined ? localStore() : opts.storage;
  if (!storage) return result;
  const prefix = `${MIRROR_PREFIX}${userKey}:`;
  for (const { key } of readMirrors(userKey, storage)) {
    const draftId = key.slice(prefix.length);
    if (opts.locked.has(draftId)) {
      result.skipped.push(draftId);
      continue;
    }
    let lock: Awaited<ReturnType<typeof acquireDraftLock>>;
    try {
      lock = await acquireDraftLock(draftId, {
        waitMs: 0,
        ...(opts.locks !== undefined ? { locks: opts.locks } : {}),
      });
    } catch {
      lock = null;
    }
    if (!lock) {
      result.skipped.push(draftId);
      continue;
    }
    try {
      const { outcome, recoveredId } = await reconcileMirror(
        store,
        userKey,
        draftId,
        { storage },
      );
      if (outcome === 'applied') result.applied.push(draftId);
      else if (outcome === 'dropped') result.dropped.push(draftId);
      else if (outcome === 'recovered' && recoveredId)
        result.recovered.push(recoveredId);
      else if (outcome === 'quarantined') result.quarantined.push(draftId);
      else if (outcome === 'skipped') result.skipped.push(draftId);
      else if (outcome === 'failed') result.failed.push(draftId);
    } finally {
      lock.release();
    }
  }
  return result;
}
