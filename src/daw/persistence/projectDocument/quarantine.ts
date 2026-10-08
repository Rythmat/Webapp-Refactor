import { ISO_LENGTH, userNamespace } from '../storageNamespace';
import { migrateSession, type MigrationResult } from './migrations';

// ── Unreadable drafts, kept aside ──────────────────────────────────────────
//
// A draft this build can't read is never dropped (decision D9), whether it
// is a newer build's (after a rollback), a damaged one or not JSON at all. It
// is copied exactly as storage held it to a key of its own before anything
// can write over it, so a build that can read it, or a person, can bring it
// back. The caller reads the raw string before parsing it: an autosave that
// failed JSON.parse used to read as no autosave at all, and was written over.
//
// Milestone 1.1 began this as a silent set-aside under
// 'musicAtlas:daw:unreadable:<iso>': a new copy on every boot, never
// deduplicated, never capped, outside every budget. Those entries are still
// read and listed, but they recorded no owner, so none is ever adopted on
// its own. New entries use the same prefix, namespaced by user as kept work
// is, since school Chromebooks are shared:
//
//   musicAtlas:daw:unreadable:<encodeURIComponent(userId || 'anon')>:<hash>:<iso>
//
// - The value is the raw string, unchanged.
// - The same content is kept once, found by its hash: another entry already
//   holding it (anyone's, 1.1's included) is enough. A pre-migration backup
//   is not, since backups expire.
// - Each user keeps at most MAX_QUARANTINED_PER_USER entries, and the
//   kept-work budget counts them (quarantinedChars). An entry that is the
//   only copy of its draft never goes to make room, for anything. Only one
//   whose content is kept elsewhere too ever goes: a later copy of another
//   entry (1.1 set one draft aside on every boot), or a copy of a backup of
//   its owner's, which means the draft has been read and migrated since (see
//   below). Such entries go when the user is at the cap, when storage is too
//   full to take a new one, and before any kept work when kept work or the
//   autosave needs the room (draftCopiesThatGiveWay).
// - When one still can't be written (storage full, or the user's entries at
//   the cap), the outcome says so: the caller shows a toast and leaves the
//   source untouched, and tries again on its next write, so room that comes
//   free (an entry restored or let go of) lets the autosave run again.
//
// The pre-migration backup is the other safety net. Before this build first
// writes over a draft it read in another format (a v1 or v2 draft, or a later
// schema it reads as v3), the caller copies that draft, raw, to
//
//   musicAtlas:daw:backup:<encodeURIComponent(userId || 'anon')>:<hash>:<iso>
//
// so a migration that turns out lossy can still be undone. Restoring a draft
// rewrites the autosave in the new format about 1.5 s later, so without it a
// lossy migration would be permanent at once. Each user keeps their newest
// MAX_BACKUPS_PER_USER (the first boot's autosave and a kept session restored
// after it, say), the same content once: decision D9 asks for one, and the
// second covers the draft restored soon after the first. A backup goes
// BACKUP_LIFETIME_DAYS after it was taken: a migration nobody has found
// lossy by then is not going to be undone. The kept-work budget counts
// backups until they go, but a backup is never the only copy of anyone's
// work (the draft it holds has been read and migrated since), so when kept
// work or the autosave needs the room, backups give way first
// (draftCopiesThatGiveWay), before any kept work and any entry that is the
// only copy of its draft.

/** The prefix of every quarantined draft, 1.1's included. */
export const UNREADABLE_PREFIX = 'musicAtlas:daw:unreadable:';
/** The prefix of every pre-migration backup. */
export const MIGRATION_BACKUP_PREFIX = 'musicAtlas:daw:backup:';
/**
 * How many quarantined drafts a user keeps. None goes while it is the only
 * copy of its draft.
 */
export const MAX_QUARANTINED_PER_USER = 3;
/** How many pre-migration backups a user keeps: the newest. */
export const MAX_BACKUPS_PER_USER = 2;
/** How long a pre-migration backup is kept. */
export const BACKUP_LIFETIME_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

// Keys end in the ISO time they were written: 2026-10-07T09:00:00.000Z.
const ISO = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;

/**
 * A short hash of a draft's content (32-bit FNV-1a, as 8 hex digits): equal
 * strings always share it, so it finds a copy without comparing every
 * stored draft whole. Two different drafts may share one too; they are
 * still compared before one is taken for the other.
 */
export function draftContentHash(raw: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/** What the end of a key, `<owner>:<hash>:<iso>`, says. */
interface OwnedKey {
  owner: string;
  hash: string;
  at: string;
}

function parseOwned(rest: string): OwnedKey | null {
  const at = rest.slice(-ISO_LENGTH);
  if (!ISO.test(at) || rest[rest.length - ISO_LENGTH - 1] !== ':') return null;
  const head = rest.slice(0, -ISO_LENGTH - 1);
  const split = head.lastIndexOf(':');
  if (split <= 0) return null;
  return { owner: head.slice(0, split), hash: head.slice(split + 1), at };
}

const byTime = <T extends { at: string; key: string }>(a: T, b: T) =>
  a.at < b.at ? -1 : a.at > b.at ? 1 : a.key < b.key ? -1 : 1;

/** One quarantined draft, as its key describes it. */
export interface QuarantinedDraft {
  key: string;
  /**
   * Whose it is: their storage namespace (encodeURIComponent of the user
   * id, 'anon' signed out), or null for an entry 1.1 or 1.2 set aside, which
   * recorded nobody.
   */
  owner: string | null;
  /** ISO time it was set aside. */
  quarantinedAt: string;
}

/** A quarantined draft's key, read back; the hash is null for 1.1's. */
function describeKey(
  key: string,
): (QuarantinedDraft & { hash: string | null; at: string }) | null {
  if (!key.startsWith(UNREADABLE_PREFIX)) return null;
  const rest = key.slice(UNREADABLE_PREFIX.length);
  if (ISO.test(rest)) {
    return { key, owner: null, quarantinedAt: rest, hash: null, at: rest };
  }
  const owned = parseOwned(rest);
  return owned && { key, quarantinedAt: owned.at, ...owned };
}

/** Every storage key under `prefix`. */
function keysUnder(prefix: string): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix)) keys.push(key);
  }
  return keys;
}

/** Every quarantined draft on this device, oldest first. */
function allQuarantined() {
  return keysUnder(UNREADABLE_PREFIX)
    .flatMap((key) => {
      const draft = describeKey(key);
      return draft ? [draft] : [];
    })
    .sort(byTime);
}

/**
 * The key of a quarantined copy of `raw`, anyone's. Only entries count, as
 * they never expire: a backup holding `raw` will go after a while.
 */
function quarantinedCopyOf(raw: string, hash: string): string | null {
  for (const { key, hash: keyHash } of allQuarantined()) {
    if (keyHash !== null && keyHash !== hash) continue;
    if (localStorage.getItem(key) === raw) return key;
  }
  return null;
}

/** What quarantineDraft did with a draft. */
export type QuarantineOutcome =
  /** Copied to `key`; the source may now be written over. */
  | { status: 'quarantined'; key: string }
  /** `key` already holds the same content; the source may be written over. */
  | { status: 'already'; key: string }
  /**
   * The user has MAX_QUARANTINED_PER_USER others, none kept elsewhere too:
   * nothing was written.
   */
  | { status: 'full' }
  /** Storage refused it (full, or closed to the page): nothing was written. */
  | { status: 'failed' };

/**
 * Keep `raw`, a draft this build can't load, under `userId`'s namespace.
 * Only on 'quarantined' or 'already' may the caller let anything write over
 * the source. On 'full' or 'failed' it must leave the source as it is and
 * tell the student (a toast), since this is then the draft's only copy.
 * Never throws.
 */
export function quarantineDraft(
  raw: string,
  userId?: string | null,
  now: Date = new Date(),
): QuarantineOutcome {
  try {
    const hash = draftContentHash(raw);
    const copy = quarantinedCopyOf(raw, hash);
    if (copy !== null) return { status: 'already', key: copy };

    const owner = userNamespace(userId);
    const own = () => allQuarantined().filter((d) => d.owner === owner);
    if (own().length >= MAX_QUARANTINED_PER_USER) {
      // Room only from the user's entries whose content is kept elsewhere.
      removeKeys(redundantEntries((d) => d.owner === owner));
      if (own().length >= MAX_QUARANTINED_PER_USER) return { status: 'full' };
    }

    const key = freeKey(UNREADABLE_PREFIX, owner, hash, now);
    try {
      localStorage.setItem(key, raw);
    } catch (err) {
      // Storage is full. Entries kept twice over (anyone's) make room, and
      // nothing else: if there are none, the outcome is 'failed'.
      const spare = redundantEntries(() => true);
      if (spare.length === 0) throw err;
      removeKeys(spare);
      localStorage.setItem(key, raw);
    }
    return { status: 'quarantined', key };
  } catch (err) {
    console.warn('[quarantine] Could not keep an unreadable draft', err);
    return { status: 'failed' };
  }
}

/**
 * The keys of the entries `mayGo` accepts whose content is kept elsewhere
 * too, so that removing them loses nothing: a later copy of another entry,
 * or a copy of one of its owner's backups (anyone's backup, for an entry 1.1
 * set aside without an owner). A backup holds a draft that has since been
 * read and migrated: its migrated copy is someone's work now, and the backup
 * covers a lossy migration as long as it does for any draft.
 */
function redundantEntries(
  mayGo: (draft: QuarantinedDraft) => boolean,
): string[] {
  const backups = allBackups();
  /** Each hash's content still kept by an entry, oldest first. */
  const kept = new Map<string, string[]>();
  const redundant: string[] = [];
  for (const draft of allQuarantined()) {
    const raw = localStorage.getItem(draft.key);
    if (raw === null) continue;
    const hash = draft.hash ?? draftContentHash(raw);
    const copies = kept.get(hash) ?? [];
    const inBackup = backups.some(
      (backup) =>
        (draft.owner === null || backup.owner === draft.owner) &&
        backup.hash === hash &&
        localStorage.getItem(backup.key) === raw,
    );
    if ((inBackup || copies.includes(raw)) && mayGo(draft)) {
      redundant.push(draft.key);
      continue;
    }
    copies.push(raw);
    kept.set(hash, copies);
  }
  return redundant;
}

function removeKeys(keys: readonly string[]): void {
  for (const key of keys) localStorage.removeItem(key);
}

/** A key under `prefix` for `owner`'s copy at `now`, or a moment after. */
function freeKey(
  prefix: string,
  owner: string,
  hash: string,
  now: Date,
): string {
  let time = now.getTime();
  const keyAt = (t: number) =>
    `${prefix}${owner}:${hash}:${new Date(t).toISOString()}`;
  let key = keyAt(time);
  while (localStorage.getItem(key) !== null) key = keyAt(++time);
  return key;
}

/**
 * The quarantined drafts `userId` may see, newest first: their own, and the
 * ones 1.1 and 1.2 set aside without an owner (on a shared device, possibly
 * someone else's: offer those, never adopt them on their own). Never throws.
 */
export function listQuarantinedDrafts(
  userId?: string | null,
): QuarantinedDraft[] {
  try {
    const owner = userNamespace(userId);
    return allQuarantined()
      .filter((d) => d.owner === owner || d.owner === null)
      .reverse()
      .map(({ key, owner: who, quarantinedAt }) => ({
        key,
        owner: who,
        quarantinedAt,
      }));
  } catch {
    return [];
  }
}

/** Whether `key` is one this module keeps: an entry or a backup. */
const isKeptKey = (key: string) =>
  describeKey(key) !== null || describeBackupKey(key) !== null;

/**
 * A quarantined draft's or a backup's raw content; null when it is gone.
 * Never throws.
 */
export function readQuarantinedDraft(key: string): string | null {
  if (!isKeptKey(key)) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Remove a quarantined draft (or a backup), once it is restored or the
 * student lets it go. Any other key is left alone.
 */
export function forgetQuarantinedDraft(key: string): void {
  if (!isKeptKey(key)) return;
  try {
    localStorage.removeItem(key);
  } catch {
    // Still there; nothing is lost.
  }
}

/** A quarantined draft this build can load now. */
export interface RecoverableDraft {
  key: string;
  quarantinedAt: string;
  /** The project name it holds, for the toast or the list offering it. */
  projectName: string;
  /** Its migration: hand `result.session` to loadSession, or keep it. */
  result: Extract<MigrationResult, { ok: true }>;
}

/**
 * `userId`'s own quarantined drafts that this build can load: a newer
 * build's draft after a redeploy, say. A kept-work slot that was set aside
 * whole (`{keptAt, projectName, session}`) is read through to its session.
 * Entries without an owner are never offered here. Never throws.
 */
export function recoverableDrafts(userId?: string | null): RecoverableDraft[] {
  const owner = userNamespace(userId);
  const found: RecoverableDraft[] = [];
  for (const draft of listQuarantinedDrafts(userId)) {
    if (draft.owner !== owner) continue;
    const raw = readQuarantinedDraft(draft.key);
    if (raw === null) continue;
    const result = migrateSession(unwrapKept(raw));
    if (!result.ok) continue;
    found.push({
      key: draft.key,
      quarantinedAt: draft.quarantinedAt,
      projectName: result.session.data.projectName || 'Untitled Project',
      result,
    });
  }
  return found;
}

/** A kept-work slot's session, parsed; anything else as it was. */
function unwrapKept(raw: string): unknown {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'session' in parsed &&
      typeof parsed.session === 'object' &&
      parsed.session !== null &&
      'data' in parsed.session
    ) {
      return parsed.session;
    }
  } catch {
    // Not JSON: migrateSession says so.
  }
  return raw;
}

// ── The pre-migration backup ───────────────────────────────────────────────

/** One pre-migration backup, as its key describes it. */
export interface MigrationBackup {
  key: string;
  /** Whose it is: their storage namespace. */
  owner: string;
  /** ISO time it was taken. */
  backedUpAt: string;
}

function describeBackupKey(
  key: string,
): (MigrationBackup & OwnedKey & { key: string }) | null {
  if (!key.startsWith(MIGRATION_BACKUP_PREFIX)) return null;
  const owned = parseOwned(key.slice(MIGRATION_BACKUP_PREFIX.length));
  return owned && { key, backedUpAt: owned.at, ...owned };
}

/** Every backup on this device, oldest first. */
function allBackups() {
  return keysUnder(MIGRATION_BACKUP_PREFIX)
    .flatMap((key) => {
      const backup = describeBackupKey(key);
      return backup ? [backup] : [];
    })
    .sort(byTime);
}

/** What backupBeforeMigration did. */
export type BackupOutcome =
  /** The draft is now one of the user's backups. */
  | 'written'
  /** One of the user's backups holds it already. */
  | 'kept'
  /** Storage refused it. */
  | 'failed';

/**
 * Keep `raw`, a draft this build read in another format (LoadOutcome.from
 * isn't SESSION_SCHEMA_VERSION) and is about to write over, as one of
 * `userId`'s backups. Call it after the draft loads and before the first
 * write over it. It also lets go of backups past their lifetime, and of the
 * user's oldest beyond MAX_BACKUPS_PER_USER once this one is stored. On
 * 'failed' a write of new work may still go ahead: the backup guards against
 * a bug, and blocking the autosave on it would risk more than it saves. A
 * write that would only change the draft's format waits (the autosave's
 * restoredDraft, in localSession). Never throws.
 */
export function backupBeforeMigration(
  raw: string,
  userId?: string | null,
  now: Date = new Date(),
): BackupOutcome {
  try {
    pruneMigrationBackups(now);
    const owner = userNamespace(userId);
    const hash = draftContentHash(raw);
    const own = () => allBackups().filter((b) => b.owner === owner);
    if (
      own().some((b) => b.hash === hash && localStorage.getItem(b.key) === raw)
    ) {
      return 'kept';
    }
    localStorage.setItem(
      freeKey(MIGRATION_BACKUP_PREFIX, owner, hash, now),
      raw,
    );
    const mine = own();
    for (const old of mine.slice(0, mine.length - MAX_BACKUPS_PER_USER)) {
      localStorage.removeItem(old.key);
    }
    return 'written';
  } catch (err) {
    console.warn('[quarantine] Could not back up the draft before v3', err);
    return 'failed';
  }
}

/** `userId`'s backups, newest first. Never throws. */
export function listMigrationBackups(
  userId?: string | null,
): MigrationBackup[] {
  try {
    const owner = userNamespace(userId);
    return allBackups()
      .filter((b) => b.owner === owner)
      .reverse()
      .map(({ key, owner: who, backedUpAt }) => ({
        key,
        owner: who,
        backedUpAt,
      }));
  } catch {
    return [];
  }
}

/** `userId`'s newest backup, raw; null when there is none. Never throws. */
export function readMigrationBackup(userId?: string | null): string | null {
  const [newest] = listMigrationBackups(userId);
  return newest ? readQuarantinedDraft(newest.key) : null;
}

/**
 * Let go of every backup taken more than BACKUP_LIFETIME_DAYS before `now`,
 * anyone's. backupBeforeMigration does it too; the editor's boot calls it so
 * a device that migrates nothing more still lets go of old ones. Never
 * throws.
 */
export function pruneMigrationBackups(now: Date = new Date()): void {
  try {
    const cutoff = new Date(now.getTime() - BACKUP_LIFETIME_DAYS * DAY_MS);
    const oldest = cutoff.toISOString();
    for (const backup of allBackups()) {
      if (backup.at < oldest) localStorage.removeItem(backup.key);
    }
  } catch {
    // Kept a while longer; nothing is lost.
  }
}

// ── Their share of storage ─────────────────────────────────────────────────

/** Every quarantined draft's and every backup's storage key. */
export function quarantineStorageKeys(): string[] {
  try {
    return [
      ...keysUnder(UNREADABLE_PREFIX),
      ...keysUnder(MIGRATION_BACKUP_PREFIX),
    ];
  } catch {
    return [];
  }
}

/**
 * The characters quarantined drafts and backups take up, keys included: the
 * kept-work budget counts them. Only those draftCopiesThatGiveWay lists ever
 * go to make room.
 */
export function quarantinedChars(): number {
  try {
    return quarantineStorageKeys().reduce(
      (sum, key) => sum + key.length + (localStorage.getItem(key)?.length ?? 0),
      0,
    );
  } catch {
    return 0;
  }
}

/**
 * The keys that go before any kept work when the kept-work budget or full
 * storage needs room, in the order they go: entries whose content another
 * entry or a backup holds too (redundantEntries), then every backup, oldest
 * first (anyone's: the oldest is the nearest to its lifetime's end). Kept
 * work is the only copy of what a link replaced, and an entry no other key
 * holds is the only copy of its draft, so neither is ever listed. Never
 * throws.
 */
export function draftCopiesThatGiveWay(): string[] {
  try {
    return [
      ...redundantEntries(() => true),
      ...allBackups().map(({ key }) => key),
    ];
  } catch {
    return [];
  }
}
