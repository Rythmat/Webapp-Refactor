import type { UserKey } from '@/lib/local-store/userScope';

// ── Studio drafts: the shared shapes (milestone 1.4) ───────────────────────
//
// A draft is one Studio session kept on this device: its body (1.3's v3-in-v2
// envelope JSON, verbatim) and a small meta record describing it, owned by
// one user (UserKey, fixed when the draft is created). They live in the
// IndexedDB database DRAFT_DB_NAME, opened without a version so a reverted
// build still opens it; upgrades only ever add stores. Media bytes of
// clips and samples that never reached the cloud live beside them, keyed by
// `${userKey}:${mediaId}`.
//
// Types, constants and the error class only. Nothing here imports the DAW
// store, the codec or React: the Studio dashboard loads this module.

export type { UserKey } from '@/lib/local-store/userScope';

/** The IndexedDB database holding drafts (opened without a version). */
export const DRAFT_DB_NAME = 'ma-studio';

/** Its object stores. 'takes' and 'assets' are reserved for later ones. */
export const DRAFT_STORES = [
  'drafts',
  'bodies',
  'media',
  'quarantine',
  'meta',
] as const;
export type DraftStoreName = (typeof DRAFT_STORES)[number];

/** Store names no milestone may use for anything else. */
export const RESERVED_DRAFT_STORES = ['takes', 'assets'] as const;

/**
 * How a draft came to be:
 * - 'session': the live session's own draft;
 * - 'kept': work set aside when another session replaced it (the same
 *   record, re-marked; never a copy);
 * - 'fork': a copy made because the draft was open in another tab;
 * - 'migrated': imported from a pre-1.4 localStorage slot the first time;
 * - 'recovered': imported again later (an old tab's newer autosave), or a
 *   mirror that couldn't be applied over its draft.
 */
export type DraftOrigin =
  | 'session'
  | 'kept'
  | 'fork'
  | 'migrated'
  | 'recovered';

/** What the session started from. */
export type DraftSourceKind =
  | 'empty'
  | 'new'
  | 'template'
  | 'demo'
  | 'tutorial'
  | 'song'
  | 'practiceMode'
  | 'practiceGenre'
  | 'jam'
  | 'collab'
  | 'project'
  | 'import';

/** The session as it opened, to tell an untouched draft (a cache) from work. */
export interface DraftBaseline {
  source: DraftSourceKind;
  /** What it named: a template id, a project id, a song id, … */
  ref?: string;
  /** Whether that source can be opened again as it was. */
  reopenable: boolean;
  /** hashFingerprint of the document as it opened; null = unknown. */
  fingerprint: string | null;
}

/** The draft's last cloud save (or the cloud copy it opened from). */
export interface DraftCloudRecord {
  projectId: string;
  /** The server's ISO updatedAt; compared only with server values. */
  updatedAt: string | null;
  /** hashFingerprint of the document as that save sent it. */
  savedFingerprint: string;
  /** Whether that save held the whole document (no cloudSaveGaps). */
  savedComplete: boolean;
  /** Date.now() on this device when the save finished. */
  savedAt: number;
  /** 1.5's project revision. */
  revision?: number;
  /** 1.5's cloud document schema. */
  documentSchema?: number;
}

/** One stored media item a draft's clips or sampler samples use. */
export interface DraftMediaRef {
  /** SHA-256 of the bytes, lowercase hex. */
  mediaId: string;
  contentType: string;
  size: number;
  clipIds: string[];
  samplerSampleIds: string[];
}

/** Where a lesson or practice screen stood (milestone 1.15). */
export interface DraftContext {
  tutorial?: { id: string; stepIndex: number };
  practiceSession?: unknown;
  studentTrackId?: string;
}

/** What a writer stamps on each write: its build and its writer document. */
export interface DraftWriter {
  /** The build (__COMMIT_SHA__, 'dev' locally). */
  build: string;
  /** The writing page (WRITER_DOC): one id per page load. */
  doc: string;
}

/** The record describing one draft (the 'drafts' store, keyPath draftId). */
export interface DraftMeta {
  v: 1;
  draftId: string;
  /** The owner, fixed at creation (claimDeviceDraft re-homes '~device' work). */
  userKey: UserKey;
  origin: DraftOrigin;
  /**
   * When the record entered this store: set by the store to now() on create
   * (the caller's value is ignored) and kept on every later write.
   */
  createdAt: number;
  /**
   * The content's time: set by the store to now() on every write, or an
   * import's source time (DraftWrite.updatedAt). Ranks resume and sorts
   * Projects; never ages a draft on its own (see draftTouchedAt).
   */
  updatedAt: number;
  /** When 1.4 kept it, or a legacy kept slot's own time. */
  keptAt?: number;
  /** Compare-and-set counter: +1 on every write, never on patchMeta. */
  writeSeq: number;
  writer: DraftWriter;
  /** The body's "schema" (2 when absent); above SESSION_SCHEMA_VERSION = read-only. */
  schema: number;
  /** Wins over the body's data.projectId on open. Omitted when null. */
  projectId?: string;
  /** The collab room the session was in. Omitted when null. */
  roomId?: string;
  name: string;
  trackCount: number;
  /** The body's length in characters. */
  chars: number;
  /**
   * hashFingerprint of the body text, set by the store on every write. A
   * mirror with the same writeSeq but another contentHash holds other
   * content (draftMirror's reconcile).
   */
  contentHash: string;
  /** hashFingerprint(documentFingerprint()); null = unknown (counts as work). */
  docFingerprint: string | null;
  /** Whether the document differs from an empty project's. */
  hasContent: boolean;
  baseline: DraftBaseline;
  cloud?: DraftCloudRecord;
  /** Stored media only. */
  media: DraftMediaRef[];
  /** Pending clips and samples whose bytes aren't stored. */
  mediaMissing: number;
  context?: DraftContext;
  /** The draft this one was forked from. */
  forkedFrom?: string;
  /** The key it belonged to before it was claimed ('~device'). */
  claimedFrom?: UserKey;
}

/** A draft's body (the 'bodies' store, keyPath draftId). */
export interface DraftBody {
  draftId: string;
  writeSeq: number;
  /** 1.3's v3-in-v2 envelope JSON, verbatim. */
  text: string;
}

/** Stored media bytes (the 'media' store, keyPath key). */
export interface DraftMediaRecord {
  /** `${userKey}:${mediaId}` */
  key: string;
  mediaId: string;
  userKey: UserKey;
  blob: Blob;
  contentType: string;
  size: number;
  createdAt: number;
  durationSeconds?: number;
  sampleRate?: number;
  channels?: number;
}

/** Where a quarantined entry came from. */
export type QuarantineSource =
  | 'draft'
  | 'mirror'
  | 'legacy-autosave'
  | 'legacy-kept'
  | 'legacy-unreadable'
  | 'legacy-backup';

/** Something this build can't open, kept whole (the 'quarantine' store). */
export interface QuarantineRecord {
  id?: number;
  userKey: UserKey;
  source: QuarantineSource;
  reason: string;
  schema?: number;
  build: string;
  /** Hash of `raw`, to keep the same content once. */
  hash: string;
  /** Captured before any parse. */
  raw: string;
  at: number;
  draftId?: string;
  name?: string;
}

/** Why a draft operation failed. */
export type DraftErrorKind =
  | 'quota'
  | 'unavailable'
  | 'conflict'
  | 'not-found'
  | 'corrupt'
  | 'readonly'
  | 'blocked';

/**
 * Every draft-store failure, typed. Kind 'conflict' carries a cause
 * {reason: 'seq' | 'owner' | 'exists', …}; read it with conflictReason()
 * from draftStore.ts.
 */
export class DraftStorageError extends Error {
  readonly kind: DraftErrorKind;
  // `declare`: no class-field define, so an error without a cause has no
  // own `cause` at all (the app's lib is ES2020, without Error options).
  declare readonly cause?: unknown;

  constructor(
    kind: DraftErrorKind,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message);
    this.name = 'DraftStorageError';
    this.kind = kind;
    if (options?.cause !== undefined) {
      // As ES2022's Error options set it: own, writable, not enumerable.
      Object.defineProperty(this, 'cause', {
        value: options.cause,
        writable: true,
        configurable: true,
        enumerable: false,
      });
    }
  }
}

/** Whether `error` is a DraftStorageError, of `kind` when given. */
export function isDraftStorageError(
  error: unknown,
  kind?: DraftErrorKind,
): error is DraftStorageError {
  return (
    error instanceof DraftStorageError &&
    (kind === undefined || error.kind === kind)
  );
}

/**
 * One write of a draft, meta and body in one transaction.
 *
 * The store sets v, writeSeq (stored + 1, or 1 on create), updatedAt (now),
 * writer and contentHash. createdAt is the store's too: now() on create
 * (meta.createdAt is ignored), the stored value on every later write.
 */
export interface DraftWrite {
  meta: Omit<
    DraftMeta,
    'v' | 'writeSeq' | 'updatedAt' | 'writer' | 'contentHash'
  >;
  text: string;
  /** The stored writeSeq this write replaces; null = create (none stored). */
  expectedSeq: number | null;
  /** 'strict' for flushes. */
  durability?: 'strict' | 'relaxed';
  /**
   * The content's own time, for an import: honoured only when expectedSeq is
   * null and origin is 'migrated', 'kept' or 'recovered' (the legacy
   * session's timestamp, a kept slot's keptAt), so resume ranks imports by
   * when their work was done, not when they were imported. Ignored otherwise.
   * Ranking only: an import still gets its full grace from createdAt (now),
   * because every age-based prune rule measures from draftTouchedAt.
   */
  updatedAt?: number;
}

/**
 * A change to a draft's meta alone. patchMeta never changes writeSeq, writer,
 * contentHash or the body, so a writer's next compare-and-set still matches;
 * it moves updatedAt only for origin, keptAt or name.
 *
 * null DELETES the property: a stored meta never holds null for an optional
 * field (projectId and roomId must be absent so their indexes skip the
 * record; predicates read cloud as absent-or-a-record).
 *
 * A new userKey re-homes the draft's media too: every meta.media record is
 * re-keyed to `${newUserKey}:${mediaId}` in the same transaction (or the
 * patch rejects DraftStorageError 'conflict'); media is never left under the
 * old key, where gcMedia would delete it as unreferenced.
 */
export interface DraftMetaPatch {
  origin?: DraftOrigin;
  keptAt?: number | null;
  projectId?: string | null;
  roomId?: string | null;
  cloud?: DraftCloudRecord | null;
  userKey?: UserKey;
  claimedFrom?: UserKey;
  name?: string;
}

/**
 * A held draft lock (draftLock.ts implements it). `held` is false when the
 * page has no navigator.locks: the tab proceeds, and writeSeq's
 * compare-and-set turns a second writer into a fork.
 */
export interface DraftLock {
  readonly draftId: string;
  readonly held: boolean;
  release(): void;
}
