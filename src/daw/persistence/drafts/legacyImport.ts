import {
  DEVICE_USER_KEY,
  otherUserNamespaces,
  type UserKey,
} from '@/lib/local-store/userScope';
import {
  lockedDraftIds,
  withImportLock,
} from '@/lib/studio-projects/drafts/draftLock';
import { DRAFT_BUILD } from '@/lib/studio-projects/drafts/draftMirror';
import type { DraftStore } from '@/lib/studio-projects/drafts/draftStore';
import { hashFingerprint } from '@/lib/studio-projects/drafts/fingerprintHash';
import type {
  DraftMeta,
  DraftWrite,
  QuarantineSource,
} from '@/lib/studio-projects/drafts/types';
import {
  SESSION_ENVELOPE_VERSION,
  SESSION_SCHEMA_VERSION,
} from '../projectDocument/codec';
import { migrateSession } from '../projectDocument/migrations';
import {
  BACKUP_LIFETIME_DAYS,
  MIGRATION_BACKUP_PREFIX,
  UNREADABLE_PREFIX,
} from '../projectDocument/quarantine';

// ── Bringing pre-1.4 sessions into drafts (milestone 1.4, decision E6) ─────
//
// Before 1.4 the Studio kept its session in localStorage: the device-wide
// autosave ('musicAtlas:daw:autosave', L below), kept work
// ('musicAtlas:daw:kept:<user>:<iso>'), drafts it couldn't read
// ('musicAtlas:daw:unreadable:*') and 1.3's pre-migration backups
// ('musicAtlas:daw:backup:<user>:*'). 1.4 keeps sessions in drafts, and
// brings these in at every editor boot and whenever the Projects dialog
// opens, because an old tab, or a build rolled back to, can write L again
// at any time.
//
// The import NEVER writes, rewrites or deletes any of those keys. They stay
// frozen until the sunset (Stage A exit + 30 days, a later milestone), so a
// build rolled back to still finds its pre-1.4 copy.
//
// It is repeatable, and imports each content once: a ledger in the draft
// store's meta (LEGACY_IMPORT_LEDGER) lists the hashes of what has been
// imported (of `data`, so the per-write timestamp doesn't count), at most
// LEDGER_MAX_HASHES, oldest out first, and to whom (`owned`), so a kept
// slot is skipped only when its owner already has that content. The draft
// is written BEFORE its ledger entry, so the worst case is a duplicate
// draft, never a lost import. Two tabs booting together import once:
// everything runs under the IMPORT_LOCK Web Lock (waiting at most
// `lockWaitMs`, then importing anyway), and calls in one page queue behind
// each other. A key whose raw value is unchanged since the last run (length
// and FNV hash, `seen`) is skipped without being parsed or hashed.
//
// What becomes what:
// - L, readable: a draft, 'migrated' the first time L is imported, then
//   'recovered' (an old tab's newer autosave). Another 'recovered' import
//   updates the last one in place while nobody has opened it since (same
//   writeSeq, not locked) AND the new L continues the same project (the same
//   projectId; without one, every track of the recovered draft still in
//   L), so a long-lived old tab doesn't fill Projects with near-duplicates
//   yet an old tab that moved on to another project never overwrites the
//   only copy of the previous one. The first, 'migrated' import is never
//   updated.
// - A future schema (or envelope): a read-only draft with its schema.
// - Anything else (not JSON, not a session this build can read): the
//   quarantine, raw.
// - The booting user's kept slots, and 'anon' ones (to '~device'): drafts,
//   origin 'kept', with their keptAt, and always counted as content (1.3
//   kept only sessions with work). Other users' slots are left for them. A
//   slot whose content went to '~device' as L is claimed from there.
// - unreadable entries and 1.3's backups: the quarantine (deduped by the
//   store, on the raw text's hash). 1.1's entries name nobody: '~device'.
//   Backups older than 1.3's BACKUP_LIFETIME_DAYS are skipped (1.3 would
//   have expired them).
//
// Who owns L, which names nobody: the booting user when no OTHER person has
// Studio data on this device (otherUserNamespaces: 'anon' and '~device'
// don't count), else '~device' ('Found on this device'), which every user
// of the device sees for 30 days and claims by opening it
// (claimDeviceDraft) or when its project is in their account
// (claimDeviceDraftsInAccount). Note: a device that only ever ran pre-1.3
// builds has no namespaced keys at all, so on it the first user to boot 1.4
// gets L (the owner's default (a) in that case).
//
// Imported meta: name from the session, its trackCount, schema
// (parsed.schema, else 2), projectId, hasContent from the data, no
// fingerprint (null: unknown, counts as work), baseline 'import' (not
// reopenable), no stored media and mediaMissing = audio clips that never
// reached the cloud. DraftWrite.updatedAt carries the content's own time
// (the session's timestamp, the slot's keptAt), so resume ranks imports by
// when the work was done, not when it was imported.

export const LEGACY_AUTOSAVE_KEY = 'musicAtlas:daw:autosave';
export const LEGACY_KEPT_PREFIX = 'musicAtlas:daw:kept:';
/** The draft store meta key of the import ledger. */
export const LEGACY_IMPORT_LEDGER = 'import:ledger';
/** How many content hashes the ledger remembers. */
export const LEDGER_MAX_HASHES = 200;

/** The import ledger, as stored. */
export interface ImportLedger {
  v: 1;
  /** Hashes of what has been imported, oldest first (device-wide). */
  hashes: string[];
  /** `${ownerKey}|${hash}`: who got each import, oldest first. */
  owned?: string[];
  /** L's last import: the draft it made, the writeSeq it left it at, its owner. */
  autosave?: {
    draftId: string;
    writeSeq: number;
    hash: string;
    owner?: UserKey;
  };
  /** Legacy key → `${length}:${hashFingerprint(raw)}` of its value when last processed. */
  seen?: Record<string, string>;
}

export interface LegacyImportResult {
  /** Drafts made (or updated) for the booting user. */
  imported: DraftMeta[];
  /** Drafts made for '~device' ('Found on this device'). */
  toDevice: DraftMeta[];
  /**
   * Entries newly stored in the quarantine that failed to open. 1.3's
   * migration backups are stored too but not counted: they are kept copies,
   * not failures, so they raise no "couldn't be opened" notice.
   */
  quarantined: number;
  /** Sources skipped because their content was imported before. */
  alreadyImported: number;
}

const ISO_LENGTH = 24;
const ISO = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function tryParse(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

function hex(bytes: ArrayBuffer): string {
  let out = '';
  for (const byte of new Uint8Array(bytes))
    out += byte.toString(16).padStart(2, '0');
  return out;
}

/** SHA-256 of `text` as hex ('h1:' + hashFingerprint where SubtleCrypto is missing). */
async function sha256(text: string): Promise<string> {
  try {
    const subtle = globalThis.crypto?.subtle;
    if (subtle) {
      return hex(
        await subtle.digest('SHA-256', new TextEncoder().encode(text)),
      );
    }
  } catch {
    // Falls back below.
  }
  return hashFingerprint(text);
}

/**
 * The hash a legacy session is deduped by: SHA-256 of
 * JSON.stringify(parsed.data), so the per-write timestamp doesn't count.
 * Null when `raw` isn't JSON or has no data.
 */
export async function legacyDataHash(raw: string): Promise<string | null> {
  return dataHash(tryParse(raw));
}

/** A raw text's ledger hash, for entries that can't be parsed. */
const rawHash = async (raw: string) => `raw:${await sha256(raw)}`;

// ── Reading a session ──────────────────────────────────────────────────────

type Classified =
  | { kind: 'draft'; session: Record<string, unknown>; schema: number }
  | { kind: 'junk'; reason: string; schema?: number };

/**
 * What a legacy session is: a draft (loadable, or a future schema kept
 * read-only), or junk for the quarantine.
 */
function classify(parsed: unknown): Classified {
  if (!isRecord(parsed)) return { kind: 'junk', reason: 'Not a session.' };
  const { version, schema } = parsed;
  if (!isRecord(parsed.data))
    return { kind: 'junk', reason: 'No session data.' };
  const future =
    (typeof schema === 'number' && schema > SESSION_SCHEMA_VERSION) ||
    (typeof version === 'number' && version > SESSION_ENVELOPE_VERSION);
  if (future) {
    return {
      kind: 'draft',
      session: parsed,
      schema:
        typeof schema === 'number' && schema > SESSION_SCHEMA_VERSION
          ? schema
          : SESSION_SCHEMA_VERSION + 1,
    };
  }
  if (version !== 1 && version !== 2) {
    return {
      kind: 'junk',
      reason: `Unknown session version ${String(version)}.`,
    };
  }
  const migrated = migrateSession(parsed);
  if (!migrated.ok) {
    return {
      kind: 'junk',
      reason: `${migrated.reason}: ${migrated.detail}`,
      schema: typeof schema === 'number' ? schema : undefined,
    };
  }
  return {
    kind: 'draft',
    session: parsed,
    schema: typeof schema === 'number' ? schema : 2,
  };
}

/** The dedupe hash of a parsed session (see legacyDataHash). */
async function dataHash(parsed: unknown): Promise<string | null> {
  if (!isRecord(parsed) || parsed.data === undefined) return null;
  return sha256(JSON.stringify(parsed.data));
}

const nonEmpty = (value: unknown): boolean =>
  Array.isArray(value)
    ? value.length > 0
    : isRecord(value)
      ? Object.keys(value).length > 0
      : false;

const DEFAULT_NAME = 'Untitled Project';
const DEFAULT_BPM = 120;

/** A field that is set and differs from `fallback` (absent counts as unset). */
const differs = (value: unknown, fallback: unknown): boolean =>
  value !== undefined && value !== null && value !== fallback;

/**
 * Whether the data holds anything, read as widely as 1.3's isDocumentEmpty
 * (which can't run here without decoding into the store): tracks, chord
 * regions, markers, notation, a Prism progression, key or mode, a name or
 * composer, a tempo or metre, mastering, master automation. True when it
 * can't tell: an import wrongly called empty is pruned at once.
 */
function dataHasContent(data: Record<string, unknown>): boolean {
  try {
    if (!Array.isArray(data.tracks)) return true;
    if (data.tracks.length > 0) return true;
    if (nonEmpty(data.chordRegions) || nonEmpty(data.markers)) return true;
    if (nonEmpty(data.masterAutomation)) return true;
    if (
      typeof data.projectName === 'string' &&
      data.projectName.trim() !== '' &&
      data.projectName !== DEFAULT_NAME
    ) {
      return true;
    }
    if (typeof data.composerName === 'string' && data.composerName !== '')
      return true;
    const transport = data.transport;
    if (transport !== undefined) {
      if (!isRecord(transport)) return true;
      if (differs(transport.bpm, DEFAULT_BPM)) return true;
      if (differs(transport.timeSignatureNumerator, 4)) return true;
      if (differs(transport.timeSignatureDenominator, 4)) return true;
    }
    const prism = data.prism;
    if (prism !== undefined) {
      if (!isRecord(prism)) return true;
      if (
        nonEmpty(prism.chordRegions) ||
        nonEmpty(prism.chordSeq) ||
        nonEmpty(prism.stringSeq)
      ) {
        return true;
      }
      if (differs(prism.rootNote, null)) return true;
      if (differs(prism.mode, 'ionian')) return true;
    }
    const mixer = data.mixer;
    if (mixer !== undefined) {
      if (!isRecord(mixer)) return true;
      if (nonEmpty(mixer.masteringFxChain)) return true;
    }
    const notation = data.notation;
    if (notation !== undefined) {
      if (!isRecord(notation)) return true;
      if (Object.values(notation).some(nonEmpty)) return true;
    }
    return false;
  } catch {
    return true;
  }
}

/** The track ids of a session's data (empty when it has none it can read). */
function trackIds(data: unknown): string[] {
  if (!isRecord(data) || !Array.isArray(data.tracks)) return [];
  const ids: string[] = [];
  for (const track of data.tracks) {
    if (isRecord(track) && typeof track.id === 'string') ids.push(track.id);
  }
  return ids;
}

const projectIdOf = (data: unknown): string | null =>
  isRecord(data) && typeof data.projectId === 'string' && data.projectId !== ''
    ? data.projectId
    : null;

/** Audio clips whose bytes never reached the cloud (no assetId, no sourceUrl). */
function assetlessClips(data: Record<string, unknown>): number {
  if (!Array.isArray(data.tracks)) return 0;
  let count = 0;
  for (const track of data.tracks) {
    if (!isRecord(track) || !Array.isArray(track.audioClips)) continue;
    for (const clip of track.audioClips) {
      if (!isRecord(clip)) continue;
      if (clip.assetId == null && !clip.sourceUrl) count += 1;
    }
  }
  return count;
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

/** The meta of an imported session. */
function importedMeta(
  draftId: string,
  owner: UserKey,
  origin: DraftMeta['origin'],
  session: Record<string, unknown>,
  schema: number,
  now: number,
  extra: { name?: string; keptAt?: number; hasContent?: boolean } = {},
): DraftWrite['meta'] {
  const data = session.data as Record<string, unknown>;
  const projectName =
    typeof data.projectName === 'string' && data.projectName.trim() !== ''
      ? data.projectName
      : null;
  const meta: DraftWrite['meta'] = {
    draftId,
    userKey: owner,
    origin,
    createdAt: now,
    schema,
    name: extra.name || projectName || 'Untitled Project',
    trackCount: Array.isArray(data.tracks) ? data.tracks.length : 0,
    chars: 0,
    docFingerprint: null,
    hasContent: extra.hasContent ?? dataHasContent(data),
    baseline: { source: 'import', reopenable: false, fingerprint: null },
    media: [],
    mediaMissing: assetlessClips(data),
  };
  if (typeof data.projectId === 'string' && data.projectId !== '')
    meta.projectId = data.projectId;
  if (extra.keptAt !== undefined) meta.keptAt = extra.keptAt;
  return meta;
}

/** The content's own time: the session's timestamp, when it is one. */
function sessionTime(session: Record<string, unknown>): number | undefined {
  const t = session.timestamp;
  return typeof t === 'number' && Number.isFinite(t) && t > 0 ? t : undefined;
}

// ── The ledger ─────────────────────────────────────────────────────────────

async function readLedger(store: DraftStore): Promise<ImportLedger> {
  const stored = await store.getMetaValue<ImportLedger>(LEGACY_IMPORT_LEDGER);
  const hashes = Array.isArray(stored?.hashes)
    ? stored.hashes.filter((h): h is string => typeof h === 'string')
    : [];
  const owned = Array.isArray(stored?.owned)
    ? stored.owned.filter((h): h is string => typeof h === 'string')
    : [];
  const ledger: ImportLedger = { v: 1, hashes, owned };
  const autosave = stored?.autosave;
  if (
    isRecord(autosave) &&
    typeof autosave.draftId === 'string' &&
    typeof autosave.writeSeq === 'number' &&
    typeof autosave.hash === 'string'
  ) {
    ledger.autosave = {
      draftId: autosave.draftId,
      writeSeq: autosave.writeSeq,
      hash: autosave.hash,
      ...(typeof autosave.owner === 'string' ? { owner: autosave.owner } : {}),
    };
  }
  const seen: Record<string, string> = {};
  if (isRecord(stored?.seen)) {
    for (const [key, value] of Object.entries(stored.seen))
      if (typeof value === 'string') seen[key] = value;
  }
  ledger.seen = seen;
  return ledger;
}

function pushCapped(list: string[], value: string): void {
  if (list.includes(value)) return;
  list.push(value);
  if (list.length > LEDGER_MAX_HASHES)
    list.splice(0, list.length - LEDGER_MAX_HASHES);
}

/** Note that `hash` was imported, to `owner`. */
function remember(ledger: ImportLedger, hash: string, owner: UserKey): void {
  pushCapped(ledger.hashes, hash);
  pushCapped((ledger.owned ??= []), `${owner}|${hash}`);
}

/** The owners `hash` was imported to (none for a pre-owner ledger entry). */
function ownersOf(ledger: ImportLedger, hash: string): UserKey[] {
  const suffix = `|${hash}`;
  return (ledger.owned ?? [])
    .filter((entry) => entry.endsWith(suffix))
    .map((entry) => entry.slice(0, -suffix.length));
}

/** A raw value's fingerprint for the `seen` fast path. */
const rawStamp = (raw: string): string =>
  `${raw.length}:${hashFingerprint(raw)}`;

// ── Storage ────────────────────────────────────────────────────────────────

function localStore(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function getItem(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function keysUnder(storage: Storage, prefix: string): string[] {
  const keys: string[] = [];
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith(prefix)) keys.push(key);
    }
  } catch {
    // Unreadable storage: nothing to import.
  }
  return keys.sort();
}

/** `<owner>:<…>:<iso>` → owner and ISO time; null for anything else. */
function ownedKey(rest: string): { owner: string; iso: string } | null {
  const iso = rest.slice(-ISO_LENGTH);
  if (!ISO.test(iso) || rest[rest.length - ISO_LENGTH - 1] !== ':') return null;
  const head = rest.slice(0, -ISO_LENGTH - 1);
  const split = head.indexOf(':');
  const owner = split < 0 ? head : head.slice(0, split);
  return owner === '' ? null : { owner, iso };
}

// ── The import ─────────────────────────────────────────────────────────────

/**
 * Calls on one store (one page) run one after another, even without
 * navigator.locks; the lock covers other tabs.
 */
const pageQueues = new WeakMap<DraftStore, Promise<unknown>>();

/** Options of importLegacySessions. */
export interface LegacyImportEnv {
  storage?: Storage | null;
  now?: () => number;
  locks?: LockManager | null;
  /**
   * How long to wait for another tab's import before importing anyway
   * (IMPORT_LOCK_WAIT_MS, 10 s, by default). A boot passes a short wait: the
   * import is idempotent and runs again at the next boot or Projects open.
   */
  lockWaitMs?: number;
}

/**
 * Import the pre-1.4 sessions on this device into `store` (see above).
 * Idempotent; never writes or deletes a legacy key. Rejects only when the
 * store fails (the caller carries on: the next boot tries again).
 */
export function importLegacySessions(
  store: DraftStore,
  user: { userId: string | null; userKey: UserKey },
  env: LegacyImportEnv = {},
): Promise<LegacyImportResult> {
  const queued = pageQueues.get(store) ?? Promise.resolve();
  const run = queued.then(() =>
    withImportLock(() => runImport(store, user, env), {
      locks: env.locks,
      ...(env.lockWaitMs !== undefined ? { waitMs: env.lockWaitMs } : {}),
    }),
  );
  pageQueues.set(
    store,
    run.catch(() => undefined),
  );
  return run;
}

async function runImport(
  store: DraftStore,
  user: { userId: string | null; userKey: UserKey },
  env: LegacyImportEnv,
): Promise<LegacyImportResult> {
  const result: LegacyImportResult = {
    imported: [],
    toDevice: [],
    quarantined: 0,
    alreadyImported: 0,
  };
  const storage = env.storage === undefined ? localStore() : env.storage;
  if (!storage) return result;
  const now = env.now ?? Date.now;
  const ledger = await readLedger(store);
  const seenBefore = ledger.seen ?? {};
  // The stamps of keys still stored (whoever processed them: another user's
  // stay for them), updated by what this run processes; gone keys drop out.
  const seen: Record<string, string> = {};
  ledger.seen = seen;
  let ledgerChanged = false;
  for (const [key, stamp] of Object.entries(seenBefore)) {
    if (getItem(storage, key) !== null) seen[key] = stamp;
    else ledgerChanged = true;
  }
  const saveLedger = async () => {
    if (!ledgerChanged) return;
    await store.setMetaValue<ImportLedger>(LEGACY_IMPORT_LEDGER, ledger);
    ledgerChanged = false;
  };
  /** Whether `key` holds what it held when last processed (and keep that). */
  const unchanged = (key: string, raw: string): boolean => {
    const before = seenBefore[key];
    if (before === undefined || !before.startsWith(`${raw.length}:`))
      return false;
    return before === rawStamp(raw);
  };
  const markSeen = (key: string, raw: string) => {
    seen[key] = rawStamp(raw);
    ledgerChanged = true;
  };
  const record = (meta: DraftMeta) => {
    if (meta.userKey === DEVICE_USER_KEY) result.toDevice.push(meta);
    else result.imported.push(meta);
  };
  const toQuarantine = async (
    owner: UserKey,
    source: QuarantineSource,
    raw: string,
    reason: string,
    extra: { at?: number; schema?: number; name?: string } = {},
  ) => {
    const outcome = await store.quarantine({
      userKey: owner,
      source,
      reason,
      build: DRAFT_BUILD,
      hash: hashFingerprint(raw),
      raw,
      at: extra.at ?? now(),
      ...(extra.schema !== undefined ? { schema: extra.schema } : {}),
      ...(extra.name ? { name: extra.name } : {}),
    });
    if (outcome === 'stored' && source !== 'legacy-backup')
      result.quarantined += 1;
  };

  // ── L, the device-wide autosave ──
  const autosaveRaw = getItem(storage, LEGACY_AUTOSAVE_KEY);
  if (autosaveRaw !== null && unchanged(LEGACY_AUTOSAVE_KEY, autosaveRaw)) {
    result.alreadyImported += 1;
  } else if (autosaveRaw !== null) {
    const parsed = tryParse(autosaveRaw);
    const hash = (await dataHash(parsed)) ?? (await rawHash(autosaveRaw));
    if (ledger.hashes.includes(hash)) {
      result.alreadyImported += 1;
    } else {
      const others = await otherUserNamespaces(user.userKey, {
        store,
        storage,
      });
      const owner = others.size === 0 ? user.userKey : DEVICE_USER_KEY;
      const classified: Classified =
        parsed === undefined
          ? { kind: 'junk', reason: 'Not JSON.' }
          : classify(parsed);
      if (classified.kind === 'junk') {
        await toQuarantine(
          owner,
          'legacy-autosave',
          autosaveRaw,
          classified.reason,
          { schema: classified.schema },
        );
      } else {
        const meta = await importAutosave(
          store,
          ledger,
          owner,
          classified,
          autosaveRaw,
          now(),
          env.locks,
        );
        record(meta);
        ledger.autosave = {
          draftId: meta.draftId,
          writeSeq: meta.writeSeq,
          hash,
          owner,
        };
      }
      remember(ledger, hash, owner);
      ledgerChanged = true;
    }
    markSeen(LEGACY_AUTOSAVE_KEY, autosaveRaw);
    await saveLedger();
  }

  // ── Kept slots: this user's, and 'anon' ones (to '~device') ──
  for (const key of keysUnder(storage, LEGACY_KEPT_PREFIX)) {
    const slot = ownedKey(key.slice(LEGACY_KEPT_PREFIX.length));
    if (!slot) continue;
    const { owner: namespace, iso } = slot;
    let owner: UserKey;
    if (namespace === 'anon') owner = DEVICE_USER_KEY;
    else if (namespace === user.userKey) owner = user.userKey;
    else continue;
    const raw = getItem(storage, key);
    if (raw === null) continue;
    if (unchanged(key, raw)) {
      result.alreadyImported += 1;
      continue;
    }
    const parsed = tryParse(raw);
    const kept = isRecord(parsed) && isRecord(parsed.session) ? parsed : null;
    const session = kept?.session as Record<string, unknown> | undefined;
    const hash = (session && (await dataHash(session))) ?? (await rawHash(raw));
    const keptAtText = typeof kept?.keptAt === 'string' ? kept.keptAt : iso;
    const keptAt = Date.parse(keptAtText) || Date.parse(iso) || now();
    const owners = ownersOf(ledger, hash);
    const already =
      owners.includes(owner) ||
      // A pre-owner ledger entry: imported, to whom unknown.
      (owners.length === 0 && ledger.hashes.includes(hash));
    if (already) {
      result.alreadyImported += 1;
      markSeen(key, raw);
      await saveLedger();
      continue;
    }
    // The same content went to '~device' as L: it is this user's, claim it.
    const claimed =
      owner !== DEVICE_USER_KEY && owners.includes(DEVICE_USER_KEY)
        ? await claimImportedAutosave(store, ledger, hash, owner, keptAt)
        : null;
    if (claimed) {
      record(claimed);
      remember(ledger, hash, owner);
      markSeen(key, raw);
      await saveLedger();
      continue;
    }
    const name =
      typeof kept?.projectName === 'string' && kept.projectName.trim() !== ''
        ? kept.projectName
        : undefined;
    const classified = session ? classify(session) : null;
    if (!classified || classified.kind === 'junk') {
      await toQuarantine(
        owner,
        'legacy-kept',
        raw,
        classified?.reason ?? 'Not a kept session.',
        { at: keptAt, name, schema: classified?.schema },
      );
    } else {
      const meta = await store.write({
        meta: importedMeta(
          newDraftId(),
          owner,
          'kept',
          classified.session,
          classified.schema,
          now(),
          // 1.3 kept a session only when it held work.
          { name, keptAt, hasContent: true },
        ),
        text: JSON.stringify(classified.session),
        expectedSeq: null,
        durability: 'strict',
        updatedAt: keptAt,
      });
      record(meta);
    }
    remember(ledger, hash, owner);
    markSeen(key, raw);
    ledgerChanged = true;
    await saveLedger();
  }

  // ── Unreadable entries and 1.3's backups: the quarantine ──
  const backupCutoff = now() - BACKUP_LIFETIME_DAYS * 86_400_000;
  const quarantineAll = async (prefix: string, source: QuarantineSource) => {
    for (const key of keysUnder(storage, prefix)) {
      const rest = key.slice(prefix.length);
      let owner: UserKey;
      let at: number;
      if (ISO.test(rest)) {
        // 1.1's entries name nobody.
        owner = DEVICE_USER_KEY;
        at = Date.parse(rest);
      } else {
        const named = ownedKey(rest);
        if (!named) continue;
        if (named.owner === 'anon') owner = DEVICE_USER_KEY;
        else if (named.owner === user.userKey) owner = user.userKey;
        else continue;
        at = Date.parse(named.iso);
      }
      // 1.3 expires its backups; one past that would be gone by now.
      if (
        source === 'legacy-backup' &&
        Number.isFinite(at) &&
        at < backupCutoff
      )
        continue;
      const raw = getItem(storage, key);
      if (raw === null || unchanged(key, raw)) continue;
      await toQuarantine(
        owner,
        source,
        raw,
        source === 'legacy-backup'
          ? 'A copy kept before an earlier update.'
          : 'An earlier version could not read it.',
        { at: Number.isFinite(at) ? at : undefined },
      );
      markSeen(key, raw);
    }
  };
  await quarantineAll(UNREADABLE_PREFIX, 'legacy-unreadable');
  await quarantineAll(MIGRATION_BACKUP_PREFIX, 'legacy-backup');

  await saveLedger();
  return result;
}

/**
 * Give the '~device' draft L's content went to (the ledger's last L import,
 * of `hash`) to `owner`, as their kept work: their slot holds the same
 * content. Null when that draft is gone, claimed by someone, or not it.
 */
async function claimImportedAutosave(
  store: DraftStore,
  ledger: ImportLedger,
  hash: string,
  owner: UserKey,
  keptAt: number,
): Promise<DraftMeta | null> {
  const autosave = ledger.autosave;
  if (!autosave || autosave.hash !== hash) return null;
  if (autosave.owner !== undefined && autosave.owner !== DEVICE_USER_KEY)
    return null;
  const meta = await store.getMeta(autosave.draftId);
  if (!meta || meta.userKey !== DEVICE_USER_KEY) return null;
  try {
    return await store.patchMeta(meta.draftId, {
      userKey: owner,
      claimedFrom: DEVICE_USER_KEY,
      origin: 'kept',
      keptAt,
    });
  } catch (caught) {
    console.warn(
      '[drafts] Claiming a device draft for a kept slot failed:',
      caught,
    );
    return null;
  }
}

/**
 * Whether L, now `session`, continues the project `stored` (the last
 * 'recovered' import) holds: the same projectId; or, neither having one,
 * every track of the stored draft still there. An old tab that moved on to
 * another project, New or a demo doesn't continue it.
 */
async function continuesStored(
  store: DraftStore,
  stored: DraftMeta,
  session: Record<string, unknown>,
): Promise<boolean> {
  const nextProject = projectIdOf(session.data);
  if (nextProject !== null || stored.projectId)
    return nextProject === (stored.projectId ?? null);
  const body = await store.readBody(stored.draftId);
  if (!body) return false;
  const before = trackIds(
    (tryParse(body.text) as { data?: unknown } | undefined)?.data,
  );
  if (before.length === 0) return false;
  const after = new Set(trackIds(session.data));
  return before.every((id) => after.has(id));
}

/**
 * Write L as a draft: a new one ('migrated' the first time, else
 * 'recovered'), or the last 'recovered' import updated in place while
 * nobody has opened it since and L still continues its project.
 */
async function importAutosave(
  store: DraftStore,
  ledger: ImportLedger,
  owner: UserKey,
  classified: Extract<Classified, { kind: 'draft' }>,
  raw: string,
  now: number,
  locks: LockManager | null | undefined,
): Promise<DraftMeta> {
  const previous = ledger.autosave;
  if (previous) {
    const stored = await store.getMeta(previous.draftId);
    if (
      stored &&
      stored.origin === 'recovered' &&
      stored.writeSeq === previous.writeSeq &&
      stored.userKey === owner &&
      !(await lockedDraftIds({ locks })).has(stored.draftId) &&
      (await continuesStored(store, stored, classified.session))
    ) {
      const meta = importedMeta(
        stored.draftId,
        owner,
        'recovered',
        classified.session,
        classified.schema,
        now,
      );
      if (stored.forkedFrom) meta.forkedFrom = stored.forkedFrom;
      try {
        return await store.write({
          meta,
          text: raw,
          expectedSeq: stored.writeSeq,
          durability: 'strict',
        });
      } catch (caught) {
        // Opened or changed meanwhile: make a new one instead.
        console.warn(
          '[drafts] Updating the last recovered import failed:',
          caught,
        );
      }
    }
  }
  return store.write({
    meta: importedMeta(
      newDraftId(),
      owner,
      previous ? 'recovered' : 'migrated',
      classified.session,
      classified.schema,
      now,
    ),
    text: raw,
    expectedSeq: null,
    durability: 'strict',
    updatedAt: sessionTime(classified.session),
  });
}

/**
 * Give a '~device' draft to `userKey` (opened from 'Found on this device',
 * or its project is in their account): its owner becomes theirs, with
 * claimedFrom '~device'. Resolves the claimed meta; the draft unchanged when
 * it is theirs already; null when it is gone or someone else's.
 */
export async function claimDeviceDraft(
  store: DraftStore,
  draftId: string,
  userKey: UserKey,
): Promise<DraftMeta | null> {
  const meta = await store.getMeta(draftId);
  if (!meta) return null;
  if (meta.userKey === userKey) return meta;
  if (meta.userKey !== DEVICE_USER_KEY || userKey === DEVICE_USER_KEY)
    return null;
  return store.patchMeta(draftId, {
    userKey,
    claimedFrom: DEVICE_USER_KEY,
  });
}

/**
 * Claim every '~device' draft whose project is in `userKey`'s account
 * (`projectIds`, the cloud list): E6's second way to claim found work. For
 * the Projects dialog once its cloud list loads (or a boot that has it).
 * Resolves the claimed metas. A failed claim is skipped (logged).
 */
export async function claimDeviceDraftsInAccount(
  store: DraftStore,
  userKey: UserKey,
  projectIds: Iterable<string>,
): Promise<DraftMeta[]> {
  if (userKey === DEVICE_USER_KEY) return [];
  const mine = new Set(projectIds);
  if (mine.size === 0) return [];
  const claimed: DraftMeta[] = [];
  for (const meta of await store.list(DEVICE_USER_KEY)) {
    if (!meta.projectId || !mine.has(meta.projectId)) continue;
    try {
      const done = await claimDeviceDraft(store, meta.draftId, userKey);
      if (done && done.userKey === userKey) claimed.push(done);
    } catch (caught) {
      console.warn('[drafts] Claiming a device draft failed:', caught);
    }
  }
  return claimed;
}
