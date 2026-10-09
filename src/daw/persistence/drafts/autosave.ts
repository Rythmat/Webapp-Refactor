import { useEffect } from 'react';
import { shallow } from 'zustand/shallow';
import { registerBeforeSignOut } from '@/auth/beforeSignOut';
import {
  useCloudSaveStore,
  type LastSaved,
} from '@/daw/commands/cloudSaveStore';
import { useSynthStore, type SynthStore } from '@/daw/oracle-synth/store';
import { SYNTH_STATE_KEYS } from '@/daw/oracle-synth/synthPatchKeys';
import { VIEW_KEYS } from '@/daw/persistence/projectDocument/fields';
import {
  attachDocumentObserver,
  noteSynthPatchChange,
  useSaveStatusStore,
} from '@/daw/persistence/saveStatusStore';
import {
  deserializeSession,
  SESSION_SCHEMA_VERSION,
} from '@/daw/persistence/SessionSerializer';
import { getSessionGeneration } from '@/daw/session/sessionGeneration';
import { takesInFlight, whenTakesSettled } from '@/daw/session/takesInFlight';
import { getSessionDeps } from '@/daw/session/sessionDeps';
import { adoptActiveDraft, useSessionStore } from '@/daw/session/sessionStore';
import type { DraftClaim, PreparedDraft } from '@/daw/session/types';
import { useStore, type AllSlices } from '@/daw/store';
import type { UserKey } from '@/lib/local-store/userScope';
import {
  writeActiveDraft,
  readActiveDraft,
} from '@/lib/studio-projects/drafts/activeDraft';
import {
  acquireDraftLock,
  lockedDraftIds,
} from '@/lib/studio-projects/drafts/draftLock';
import {
  removeMirror,
  writeMirror,
} from '@/lib/studio-projects/drafts/draftMirror';
import {
  conflictReason,
  getDraftStore,
  WRITER_DOC,
  setDraftProtection,
  type DraftStore,
} from '@/lib/studio-projects/drafts/draftStore';
import { hashFingerprint } from '@/lib/studio-projects/drafts/fingerprintHash';
import {
  draftHasWork,
  draftIsCloudEqual,
} from '@/lib/studio-projects/drafts/predicates';
import {
  DraftStorageError,
  isDraftStorageError,
  type DraftBaseline,
  type DraftCloudRecord,
  type DraftContext,
  type DraftErrorKind,
  type DraftLock,
  type DraftMeta,
  type DraftOrigin,
  type DraftWrite,
} from '@/lib/studio-projects/drafts/types';
import { showNotice } from '@/util/toast';
import { useDraftStatusStore, type DraftStatus } from './draftStatusStore';
import { claimDeviceDraft } from './legacyImport';
import {
  forgetStoredMedia,
  onManifestChange,
  pendingMediaManifest,
  registerDraftMedia,
  retryMissingMedia,
  startPendingMediaCapture,
  whenMediaWritesSettled,
} from './pendingMedia';
import { cleanupDraftsForSignOut } from './signOutCleanup';
import {
  bodyContent,
  snapshotLiveSession,
  type LiveSnapshot,
} from './snapshot';

// ── The draft autosave (milestone 1.4, decisions E3, E5, E7) ───────────────
//
// One controller per page, at module scope, writes the live session to its
// draft in the draft store (IndexedDB, else the localStorage adapter):
//
// - Triggers are 1.3's registry triggers: the save status's draftVersion
//   (every write to the project document, a track's per-user fields, the
//   loop switch, an Oracle patch edit through noteSynthPatchChange), plus
//   pendingMedia's manifest changes (a take's bytes landing after its edit).
//   A view key alone (playhead, zoom, scroll) only marks the view dirty: it
//   rides the next write or a flush (decision D8).
// - Debounced 1000 ms, at most 5000 ms after the first unwritten change.
// - Flushed on hidden, pagehide and freeze (a synchronous localStorage
//   mirror of the same snapshot, then a strict IndexedDB write), on unmount,
//   before keeping (flushOutgoing) and before sign-out.
// - Paused from an open's switch until its begin(); guarded by the session
//   generation; an unchanged body and meta are not written again.
//
// Writes to the draft run one at a time on one chain, so each write's
// compare-and-set expects the seq the write before it left, and a mirror
// written while writes are queued names the seq the last of them will
// reach (critique: a mirror and an in-flight write must never share a
// writeSeq with different content). A conflict with this page's own record
// is retried on top; one with another writer forks the session into a copy.
//
// The DraftSessionPort (draftSessionPort.ts) drives the active draft's
// lifecycle through the exports at the end of this file; nothing else
// should call them.

export const DRAFT_DEBOUNCE_MS = 1000;
export const DRAFT_MAX_WAIT_MS = 5000;

/** How many quota prune steps a write tries before it reports 'quota'. */
const QUOTA_PRUNE_STEPS = 4;
/** How many times a write retries over a record this page wrote itself. */
const SELF_CONFLICT_RETRIES = 3;
/**
 * How long one job may hold the chain. A transaction that stalls longer
 * (IndexedDB under memory pressure) lets the jobs behind it run; if it
 * lands later, its compare-and-set fails and it is dropped (a newer job of
 * this page committed), so nothing waits on it forever (nothing blocks).
 */
export const DRAFT_CHAIN_STALL_MS = 5000;
/** flushOutgoing's write deadline; past it the snapshot goes to the mirror. */
export const DRAFT_FLUSH_TIMEOUT_MS = 5000;
/** retireOutgoing's deadline; past it the record is left as it is. */
export const DRAFT_RETIRE_TIMEOUT_MS = 3000;
/** How long the unmount flush waits for a take's bytes to be stored. */
const UNMOUNT_MEDIA_WAIT_MS = 3000;

const DEV = import.meta.env.DEV;

// ── State ──────────────────────────────────────────────────────────────────

/** What every write of the active draft carries over from its record. */
interface Carry {
  origin: DraftOrigin;
  createdAt: number;
  baseline: DraftBaseline;
  cloud?: DraftCloudRecord;
  keptAt?: number;
  context?: DraftContext;
  forkedFrom?: string;
  claimedFrom?: UserKey;
  /**
   * A fork made inside a collab room: its '(copy)' name and its lack of a
   * project live only in the draft's meta, because the room's project name
   * and id are shared with every peer.
   */
  nameOverride?: string;
  noProject?: boolean;
}

/** The live session's draft. */
interface LiveDraft {
  draftId: string;
  userKey: UserKey;
  lock: DraftLock | null;
  mode: DraftClaim['mode'];
  sourceDraftId?: string;
  /** What apply() loaded (existing and fork claims). */
  prepared: PreparedDraft | null;
  carry: Carry;
  /** The stored writeSeq; null while no record exists. */
  writeSeq: number | null;
  /** The record as last written or patched. */
  stored: DraftMeta | null;
  /** bodyContent() of the last committed body. */
  committedContent: string | null;
  /** The meta of the last committed write, as JSON (chars left out). */
  committedSignature: string | null;
  /** The session generation begin() ran in; null before begin. */
  generation: number | null;
  /** The mirror written for this draft and not yet covered by a commit. */
  mirror: { writeSeq: number; content: string } | null;
  /** The ordinal of the newest write job that committed. */
  committedOrdinal: number;
  /** begin() has set up its record (writeSeq, carry): hide flushes may run. */
  ready: boolean;
}

/**
 * The draft retireOutgoing let go of, until the open switches (activate)
 * or gives up (release, unkeep): its lock is held until then, and an open
 * that stops between keeping and switching makes it live again.
 */
interface Retired {
  live: LiveDraft;
  kept: DraftMeta | null;
  removed: boolean;
}

interface ControllerState {
  live: LiveDraft | null;
  paused: boolean;
  viewDirty: boolean;
  debounce: ReturnType<typeof setTimeout> | null;
  maxWait: ReturnType<typeof setTimeout> | null;
  scheduledGeneration: number | null;
  /** The write chain. */
  chain: Promise<unknown>;
  /** Writes queued or running on the chain (patches not counted). */
  queuedWrites: number;
  /** Claimed by an open, not yet activated or released. */
  claims: Map<string, DraftLock | null>;
  /** Named by an open before its claim (a boot's draft intent), counted. */
  pendingProtect: Map<string, number>;
  /** See Retired. */
  retired: Retired | null;
  /** retireOutgoing has judged the live draft: no more writes to it. */
  retiring: boolean;
  /** Sign-out cleanup ran: only a real edit is mirrored on the way out. */
  signingOut: boolean;
  /** Write jobs enqueued so far (each job's ordinal). */
  jobOrdinal: number;
  /** The page lifecycle listeners (hidden, pagehide, freeze). */
  lifecycle: (() => void) | null;
  /** The generation a 'moved without an open' warning was logged for. */
  warnedGeneration: number | null;
  /** One toast per failure episode, per kind. */
  toldError: DraftErrorKind | null;
  persistAsked: boolean;
  signOutRegistered: boolean;
  starts: number;
  teardown: (() => void) | null;
  /** The save status's draftVersion when the controller last stopped. */
  versionAtStop: number | null;
  storeOverride: DraftStore | null;
}

const STATE_KEY = Symbol.for('ma-studio.drafts.autosave');

/** Page-wide, on globalThis, so a hot reload of this module keeps it. */
const s: ControllerState = (() => {
  const g = globalThis as unknown as Record<
    symbol,
    ControllerState | undefined
  >;
  const initial: ControllerState = {
    live: null,
    paused: false,
    viewDirty: false,
    debounce: null,
    maxWait: null,
    scheduledGeneration: null,
    chain: Promise.resolve(),
    queuedWrites: 0,
    claims: new Map(),
    pendingProtect: new Map(),
    retired: null,
    retiring: false,
    signingOut: false,
    jobOrdinal: 0,
    lifecycle: null,
    warnedGeneration: null,
    toldError: null,
    persistAsked: false,
    signOutRegistered: false,
    starts: 0,
    teardown: null,
    versionAtStop: null,
    storeOverride: null,
  };
  const existing = g[STATE_KEY];
  if (!existing) return (g[STATE_KEY] = initial);
  // A hot reload from an older version of this module: add the new fields.
  for (const key of Object.keys(initial) as (keyof ControllerState)[]) {
    if (!(key in existing))
      (existing as unknown as Record<string, unknown>)[key] = initial[key];
  }
  return existing;
})();

/** The draft store the autosave and the port use. */
export function draftStore(): DraftStore {
  return s.storeOverride ?? getDraftStore();
}

/** Tests: use `store` instead of the page's (null restores it). */
export function setDraftStoreForTests(store: DraftStore | null): void {
  s.storeOverride = store;
}

const setStatus = (patch: Partial<Omit<DraftStatus, 'media'>>) =>
  useDraftStatusStore.setState(patch);
const status = () => useDraftStatusStore.getState();

function mark(name: string): void {
  if (!DEV) return;
  try {
    performance.mark(name);
  } catch {
    // No performance timeline (tests): nothing to mark.
  }
}

export function newDraftId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      return crypto.randomUUID();
  } catch {
    // Falls through.
  }
  return `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

// ── Triggers ───────────────────────────────────────────────────────────────

/** Whether a store write changed how the project was last seen (VIEW_KEYS). */
function viewChanged(state: AllSlices, prev: AllSlices): boolean {
  for (const key of VIEW_KEYS) {
    if (state[key] !== prev[key]) return true;
  }
  return false;
}

/** The Oracle patch's fields in the synth store (SYNTH_STATE_KEYS). */
const synthPatchFields = (state: SynthStore): unknown[] =>
  SYNTH_STATE_KEYS.map((key) => state[key]);

function clearTimers(): void {
  if (s.debounce !== null) clearTimeout(s.debounce);
  if (s.maxWait !== null) clearTimeout(s.maxWait);
  s.debounce = s.maxWait = null;
  s.scheduledGeneration = null;
}

function armTimers(): void {
  if (s.debounce !== null) clearTimeout(s.debounce);
  s.debounce = setTimeout(fireScheduled, DRAFT_DEBOUNCE_MS);
  s.maxWait ??= setTimeout(fireScheduled, DRAFT_MAX_WAIT_MS);
  s.scheduledGeneration ??= getSessionGeneration();
}

function fireScheduled(): void {
  const generation = s.scheduledGeneration;
  clearTimers();
  // The session the change belonged to is gone: its open flushed it.
  if (generation === null || generation !== getSessionGeneration()) {
    if (s.live) warnIfGenerationMovedWithoutOpen(s.live);
    return;
  }
  void enqueueWrite({ durability: 'relaxed', generation, force: false });
}

/** A change the draft must take: count it and (unless paused) schedule a write. */
function schedule(): void {
  if (!s.live) return;
  // An edit after the sign-out cleanup: the page lives on, so it counts.
  s.signingOut = false;
  setStatus({ pendingSeq: status().pendingSeq + 1 });
  if (s.paused || s.live.generation === null) return;
  armTimers();
}

function onView(): void {
  if (s.live) s.viewDirty = true;
}

/** Whether memory is ahead of the last committed write. */
function memoryAhead(): boolean {
  const st = status();
  return (
    st.pendingSeq > st.committedSeq ||
    s.viewDirty ||
    st.error !== null ||
    s.live?.writeSeq === null ||
    // A change made after the editor closed (nothing listens then): a
    // pagehide from the dashboard still mirrors it.
    (s.versionAtStop !== null &&
      useSaveStatusStore.getState().draftVersion !== s.versionAtStop)
  );
}

// ── Writing ────────────────────────────────────────────────────────────────

/** The meta a write of `snap` stores for `live` (DraftWrite.meta). */
function buildMeta(live: LiveDraft, snap: LiveSnapshot): DraftWrite['meta'] {
  const { refs, missing } = pendingMediaManifest();
  const { carry } = live;
  // A cloud record names the project it saved: once the session's project
  // changed (Save As, Delete), it no longer describes this document.
  const cloud =
    carry.cloud && carry.cloud.projectId === snap.projectId
      ? carry.cloud
      : undefined;
  const meta: DraftWrite['meta'] = {
    draftId: live.draftId,
    userKey: live.userKey,
    origin: carry.origin,
    createdAt: carry.createdAt,
    schema: snap.schema,
    name: carry.nameOverride ?? snap.name,
    trackCount: snap.trackCount,
    chars: snap.text.length,
    docFingerprint: snap.docFingerprint,
    hasContent: snap.hasContent,
    baseline: carry.baseline,
    media: refs,
    mediaMissing: missing,
  };
  if (snap.projectId && !carry.noProject) meta.projectId = snap.projectId;
  if (snap.roomId) meta.roomId = snap.roomId;
  if (cloud && !carry.noProject) meta.cloud = cloud;
  if (carry.keptAt !== undefined) meta.keptAt = carry.keptAt;
  if (carry.context !== undefined) meta.context = carry.context;
  if (carry.forkedFrom !== undefined) meta.forkedFrom = carry.forkedFrom;
  if (carry.claimedFrom !== undefined) meta.claimedFrom = carry.claimedFrom;
  return meta;
}

/** JSON with every object's keys sorted, so key order never matters. */
function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) => {
    if (v === null || typeof v !== 'object' || Array.isArray(v)) return v;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(v).sort())
      sorted[key] = (v as Record<string, unknown>)[key];
    return sorted;
  });
}

/** The meta as compared between writes: everything but its size. */
function signatureOf(meta: Partial<DraftWrite['meta']>): string {
  const rest: Partial<DraftWrite['meta']> = { ...meta };
  delete rest.chars;
  return stableJson(rest);
}

function carryOf(meta: DraftMeta): Carry {
  const carry: Carry = {
    origin: meta.origin,
    createdAt: meta.createdAt,
    baseline: meta.baseline,
  };
  if (meta.cloud) carry.cloud = meta.cloud;
  if (meta.keptAt !== undefined) carry.keptAt = meta.keptAt;
  if (meta.context !== undefined) carry.context = meta.context;
  if (meta.forkedFrom !== undefined) carry.forkedFrom = meta.forkedFrom;
  if (meta.claimedFrom !== undefined) carry.claimedFrom = meta.claimedFrom;
  return carry;
}

/** The last cloud save of this session's project, as a draft cloud record. */
function currentCloudRecord(generation: number): DraftCloudRecord | null {
  const saved = useCloudSaveStore.getState().lastSaved;
  if (!saved || saved.generation !== generation) return null;
  if (saved.projectId !== useStore.getState().projectId) return null;
  return cloudRecordOf(saved);
}

interface WriteJob {
  durability: 'strict' | 'relaxed';
  /** The session generation the job belongs to. */
  generation: number;
  /** Write even while paused (flushOutgoing, begin). */
  force: boolean;
  /** A snapshot taken already (the hide flush's, shared with the mirror). */
  snapshot?: LiveSnapshot;
  /** The pendingSeq that snapshot covers. */
  pendingSeq?: number;
  /** Write even when nothing changed (begin's adopt). */
  always?: boolean;
  /** Set by enqueueWrite: the job's place in the page's order of writes. */
  ordinal?: number;
}

export type WriteOutcome =
  | { status: 'written' | 'unchanged'; meta: DraftMeta | null }
  | { status: 'skipped' | 'dropped' }
  | { status: 'failed'; kind: DraftErrorKind; hasWork: boolean };

const noop = () => undefined;

/**
 * Put `fn` on the draft chain; it runs after every job queued before it,
 * or once the job before it has held the chain DRAFT_CHAIN_STALL_MS.
 */
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = s.chain.then(fn, fn);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stalled = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, DRAFT_CHAIN_STALL_MS);
  });
  s.chain = Promise.race([
    run.finally(() => clearTimeout(timer)),
    stalled,
  ]).then(noop, noop);
  return run;
}

export const TIMED_OUT = Symbol('timed out');

/** `promise`, or TIMED_OUT after `ms`. */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T | typeof TIMED_OUT> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise<typeof TIMED_OUT>((resolve) => {
      timer = setTimeout(() => resolve(TIMED_OUT), Math.max(0, ms));
    }),
  ]);
}

function enqueueWrite(job: WriteJob): Promise<WriteOutcome> {
  s.queuedWrites += 1;
  s.jobOrdinal += 1;
  job.ordinal = s.jobOrdinal;
  return enqueue(async () => {
    try {
      return await runWrite(job);
    } catch (err) {
      console.warn('[drafts] A draft write failed:', err);
      return {
        status: 'failed',
        kind: 'unavailable',
        hasWork: true,
      } satisfies WriteOutcome;
    } finally {
      s.queuedWrites -= 1;
      if (s.queuedWrites === 0) setStatus({ writing: false });
    }
  });
}

function markCommitted(pendingAt: number): void {
  const st = status();
  setStatus({
    committedSeq: Math.max(st.committedSeq, Math.min(pendingAt, st.pendingSeq)),
    committedAt: Date.now(),
  });
}

/** Remove the mirror once IndexedDB holds its seq, or its content. */
function dropMirrorIfCovered(live: LiveDraft): void {
  const mirror = live.mirror;
  if (!mirror) return;
  if (
    (live.writeSeq !== null && live.writeSeq >= mirror.writeSeq) ||
    live.committedContent === mirror.content
  ) {
    removeMirror(live.userKey, live.draftId);
    live.mirror = null;
    if (s.live === live) setStatus({ mirror: 'none' });
  }
}

async function runWrite(job: WriteJob): Promise<WriteOutcome> {
  const live = s.live;
  if (!live || live.generation === null) return { status: 'skipped' };
  // Before begin has adopted or planned the record, a write could only
  // guess its seq.
  if (!live.ready) return { status: 'skipped' };
  if (s.paused && !job.force) return { status: 'skipped' };
  if (
    job.generation !== live.generation ||
    getSessionGeneration() !== job.generation
  ) {
    warnIfGenerationMovedWithoutOpen(live);
    return { status: 'dropped' };
  }
  const pendingAt = job.pendingSeq ?? status().pendingSeq;
  const snap = job.snapshot ?? snapshotLiveSession();
  if (!job.snapshot) s.viewDirty = false;
  const meta = buildMeta(live, snap);
  const content = bodyContent(snap.text);
  const signature = signatureOf(meta);
  if (
    !job.always &&
    live.writeSeq !== null &&
    content === live.committedContent &&
    signature === live.committedSignature
  ) {
    markCommitted(pendingAt);
    dropMirrorIfCovered(live);
    return { status: 'unchanged', meta: live.stored };
  }
  return attemptWrite(
    live,
    meta,
    snap,
    job.durability,
    pendingAt,
    job.ordinal ?? 0,
  );
}

/**
 * The session generation moved while no open was running (a path that
 * resets the store outside openSession): this draft's writes are dropped
 * from now on, so say so once.
 */
function warnIfGenerationMovedWithoutOpen(live: LiveDraft): void {
  const generation = getSessionGeneration();
  if (live.generation === generation || s.warnedGeneration === generation)
    return;
  const phase = useSessionStore.getState().phase;
  if (phase !== 'ready' && phase !== 'idle') return;
  s.warnedGeneration = generation;
  console.warn(
    '[drafts] The session generation moved without an open; draft writes for this session have stopped.',
  );
}

function onCommitted(
  live: LiveDraft,
  stored: DraftMeta,
  content: string,
  signature: string,
  pendingAt: number,
  ordinal: number,
): void {
  live.committedOrdinal = Math.max(live.committedOrdinal, ordinal);
  live.writeSeq = stored.writeSeq;
  live.stored = stored;
  live.committedContent = content;
  live.committedSignature = signature;
  dropMirrorIfCovered(live);
  if (s.live !== live) return;
  markCommitted(pendingAt);
  s.toldError = null;
  setStatus({ error: null, retry: null });
  maybePersist(stored);
}

async function attemptWrite(
  live: LiveDraft,
  meta: DraftWrite['meta'],
  snap: LiveSnapshot,
  durability: 'strict' | 'relaxed',
  pendingAt: number,
  ordinal: number,
): Promise<WriteOutcome> {
  const store = draftStore();
  const content = bodyContent(snap.text);
  const signature = signatureOf(meta);
  let quotaSteps = 0;
  let selfRetries = 0;
  for (;;) {
    if (s.live === live) setStatus({ writing: true });
    mark('ma:draft:write:start');
    try {
      const pending = store.write({
        meta,
        text: snap.text,
        expectedSeq: live.writeSeq,
        durability,
      });
      // The write's synchronous part has run (perf.mjs: the main-thread budget).
      mark('ma:draft:write:issued');
      const stored = await pending;
      mark('ma:draft:write:end');
      onCommitted(live, stored, content, signature, pendingAt, ordinal);
      return { status: 'written', meta: stored };
    } catch (err) {
      mark('ma:draft:write:end');
      const kind: DraftErrorKind = isDraftStorageError(err)
        ? err.kind
        : 'unavailable';
      if (s.live !== live) return { status: 'dropped' };

      if (kind === 'conflict') {
        const reason = conflictReason(err);
        const current = await store.getMeta(live.draftId).catch(() => null);
        if (
          current?.writer?.doc === WRITER_DOC &&
          live.committedOrdinal > ordinal
        ) {
          // A stalled write landing after a newer one of this page: the
          // record holds newer content than this snapshot already.
          return { status: 'dropped' };
        }
        if (!current) {
          // Gone between the check and the write: make it again.
          live.writeSeq = null;
          if (selfRetries++ < SELF_CONFLICT_RETRIES) continue;
        } else if (
          reason !== 'owner' &&
          current.userKey === live.userKey &&
          current.writer?.doc === WRITER_DOC &&
          selfRetries++ < SELF_CONFLICT_RETRIES
        ) {
          // This page's own earlier write (a chain that lost track of a
          // commit): carry on on top of it, never fork from ourselves.
          live.writeSeq = current.writeSeq;
          continue;
        }
        return forkOnConflict(live, pendingAt, ordinal);
      }

      if (kind === 'not-found') {
        // Removed under us (another tab's prune or delete, a sign-out
        // cleanup): make the same draft again, keeping origin and baseline.
        if (selfRetries++ < SELF_CONFLICT_RETRIES) {
          live.writeSeq = null;
          continue;
        }
      }

      if (kind === 'quota' && quotaSteps < QUOTA_PRUNE_STEPS) {
        quotaSteps += 1;
        const freed = await pruneForQuota(live.userKey);
        if (freed) continue;
      }

      reportError(kind === 'quota' ? 'quota' : 'unavailable', err);
      return {
        status: 'failed',
        kind,
        hasWork: draftHasWork(meta as DraftMeta),
      };
    }
  }
}

/** One quota prune step; true when it freed anything. */
async function pruneForQuota(userKey: UserKey): Promise<boolean> {
  try {
    const report = await draftStore().prune({
      userKey,
      protect: await protectSet(),
      reason: 'quota',
      schemaVersion: SESSION_SCHEMA_VERSION,
      protectMedia: new Set(
        pendingMediaManifest().refs.map((ref) => ref.mediaId),
      ),
    });
    if (report.deletedMedia > 0) forgetStoredMedia();
    return report.deletedDrafts.length > 0 || report.deletedMedia > 0;
  } catch (err) {
    console.warn('[drafts] Freeing space failed:', err);
    return false;
  }
}

function reportError(kind: 'quota' | 'unavailable', err: unknown): void {
  console.warn(`[drafts] The draft could not be written (${kind}):`, err);
  setStatus({ error: kind, writing: false, retry: retryNow });
  if (s.toldError === kind) return;
  s.toldError = kind;
  if (kind === 'quota') {
    showNotice(
      'Storage on this device is full, so your latest changes aren’t saved here.',
      {
        action: {
          label: 'Manage',
          onClick: () =>
            getSessionDeps()?.openProjectsDialog({ sortBy: 'size' }),
        },
      },
    );
  } else {
    showNotice(
      'This device couldn’t keep your latest changes. Save to your account to keep them.',
    );
  }
}

/** status.retry: try the failed write again now (pruning first after 'quota'). */
function retryNow(): void {
  const live = s.live;
  if (!live || live.generation === null) return;
  const wasQuota = status().error === 'quota';
  retryMissingMedia();
  void (async () => {
    if (wasQuota) await pruneForQuota(live.userKey);
    if (s.live !== live || live.generation === null) return;
    await enqueueWrite({
      durability: 'strict',
      generation: live.generation,
      force: false,
    });
  })();
}

/**
 * Another writer moved the draft under us: keep this page's memory as a
 * copy (E4), never over the other tab's work.
 */
async function forkOnConflict(
  live: LiveDraft,
  pendingAt: number,
  ordinal: number,
): Promise<WriteOutcome> {
  const draftId = newDraftId();
  let lock: DraftLock | null = null;
  try {
    lock = await acquireDraftLock(draftId, { waitMs: 0 });
  } catch {
    lock = null;
  }
  if (s.live !== live) {
    lock?.release();
    return { status: 'dropped' };
  }
  // A copy: its own name, and never the other tab's cloud project. In a
  // collab room the project's name and id are shared with every peer, so
  // the copy's name and its lack of a project stay in the draft's meta.
  const state = useStore.getState();
  const inRoom = state.roomId !== null;
  const copyName = `${state.projectName} (copy)`;
  if (!inRoom && live.generation === getSessionGeneration()) {
    state.setProjectName(copyName);
    state.setProjectId(null);
  }
  const fork: LiveDraft = {
    draftId,
    userKey: live.userKey,
    lock,
    mode: 'fork',
    sourceDraftId: live.draftId,
    prepared: null,
    carry: {
      origin: 'fork',
      createdAt: Date.now(),
      baseline: live.carry.baseline,
      forkedFrom: live.draftId,
      ...(live.carry.context ? { context: live.carry.context } : {}),
      ...(inRoom ? { nameOverride: copyName, noProject: true } : {}),
    },
    writeSeq: null,
    stored: null,
    committedContent: null,
    committedSignature: null,
    generation: live.generation,
    mirror: null,
    committedOrdinal: 0,
    ready: true,
  };
  s.live = fork;
  writeActiveDraft({ draftId, userKey: fork.userKey });
  adoptActiveDraft(draftId, fork.userKey);
  setStatus({ draftId, userKey: fork.userKey, mirror: 'none' });

  const snap = snapshotLiveSession();
  const meta = buildMeta(fork, snap);
  const outcome = await attemptWrite(
    fork,
    meta,
    snap,
    'strict',
    pendingAt,
    ordinal,
  );
  if (outcome.status === 'written') {
    // The copy holds the newer content now: the old draft's mirror would
    // only come back as a duplicate.
    if (live.mirror) removeMirror(live.userKey, live.draftId);
  } else if (s.live === fork) {
    // The copy couldn't be stored: the page may be dying (a hide write
    // conflicted), so its content goes to a mirror of the copy, which the
    // next boot turns into the draft. The old mirror goes only once the
    // new one holds the edits.
    const written = writeMirrorFor(fork, snap, meta, 0);
    if (written === 'written' && live.mirror)
      removeMirror(live.userKey, live.draftId);
  }
  live.lock?.release();
  showNotice(
    'This project was changed in another tab — your changes here were saved as a copy',
  );
  return outcome;
}

// ── Flushes ────────────────────────────────────────────────────────────────

/**
 * Mirror `snap` to localStorage synchronously, as the write that will take
 * the draft from `baseSeq` to baseSeq + 1. The mirror also names the record
 * this page's queue of unlanded writes starts from (chainFrom), so the
 * next boot recognises that record as an ancestor even when baseSeq counts
 * queued jobs that end up writing nothing.
 */
function writeMirrorFor(
  live: LiveDraft,
  snap: LiveSnapshot,
  meta: DraftWrite['meta'],
  baseSeq: number,
): 'written' | 'too-big' | 'failed' {
  const chainFromHash = live.stored?.contentHash;
  const written = writeMirror({
    v: 1,
    draftId: live.draftId,
    userKey: live.userKey,
    baseSeq,
    writeSeq: baseSeq + 1,
    at: Date.now(),
    writerDoc: WRITER_DOC,
    ...(live.writeSeq !== null && live.writeSeq <= baseSeq
      ? {
          chainFromSeq: live.writeSeq,
          ...(chainFromHash ? { chainFromHash } : {}),
        }
      : {}),
    meta,
    text: snap.text,
  });
  if (written === 'written')
    live.mirror = { writeSeq: baseSeq + 1, content: bodyContent(snap.text) };
  if (s.live === live) setStatus({ mirror: written });
  return written;
}

/**
 * The page may die now (hidden, pagehide, freeze): mirror the snapshot to
 * localStorage synchronously, then queue a strict write of the same
 * snapshot. The mirror names the seq that write will reach: one past the
 * last write already queued. It runs during keeping too (writes paused but
 * the session not yet switched): the snapshot is still the live draft's.
 */
function hideFlush(): void {
  const live = s.live;
  if (!live || !live.ready || live.generation === null || s.retiring) return;
  if (getSessionGeneration() !== live.generation) return;
  if (!memoryAhead()) return;
  // After the sign-out cleanup only a real edit is mirrored, not a scroll.
  if (s.signingOut && status().pendingSeq <= status().committedSeq) return;
  clearTimers();
  const pendingAt = status().pendingSeq;
  const snap = snapshotLiveSession();
  s.viewDirty = false;
  const meta = buildMeta(live, snap);
  const content = bodyContent(snap.text);
  if (
    s.queuedWrites === 0 &&
    live.writeSeq !== null &&
    content === live.committedContent &&
    signatureOf(meta) === live.committedSignature &&
    status().error === null
  ) {
    markCommitted(pendingAt);
    return;
  }
  // A second hide signal for the same snapshot (hidden, then pagehide):
  // the mirror and the write queued with it cover it already.
  if (live.mirror && live.mirror.content === content && s.queuedWrites > 0)
    return;
  writeMirrorFor(live, snap, meta, (live.writeSeq ?? 0) + s.queuedWrites);
  void enqueueWrite({
    durability: 'strict',
    generation: live.generation,
    force: true,
    snapshot: snap,
    pendingSeq: pendingAt,
  });
}

function onVisibilityChange(): void {
  if (document.visibilityState === 'hidden') hideFlush();
}

/**
 * Write the live session now, strictly (unmount, sign-out, a test).
 * Resolves when the write (and every one queued before it) is done.
 */
export function flushDraftNow(
  opts: { force?: boolean } = {},
): Promise<WriteOutcome> {
  clearTimers();
  const live = s.live;
  if (!live || live.generation === null)
    return Promise.resolve({ status: 'skipped' });
  return enqueueWrite({
    durability: 'strict',
    generation: live.generation,
    force: opts.force ?? false,
  });
}

/** Resolves once every queued write and patch has finished. */
export function whenDraftWritesSettled(): Promise<void> {
  return s.chain.then(() => undefined);
}

// ── Cloud saves → the draft's cloud record ─────────────────────────────────

function cloudRecordOf(saved: LastSaved): DraftCloudRecord {
  return {
    projectId: saved.projectId,
    updatedAt: saved.updatedAt,
    savedFingerprint: saved.fingerprint,
    savedComplete: saved.complete,
    savedAt: saved.at,
  };
}

const sameCloud = (a: DraftCloudRecord | undefined, b: DraftCloudRecord) =>
  a !== undefined &&
  a.projectId === b.projectId &&
  a.updatedAt === b.updatedAt &&
  a.savedFingerprint === b.savedFingerprint &&
  a.savedComplete === b.savedComplete;

function onLastSaved(saved: LastSaved | null): void {
  const live = s.live;
  if (!saved || !live) return;
  if (saved.generation !== getSessionGeneration()) return;
  if (saved.projectId !== useStore.getState().projectId) return;
  const cloud = cloudRecordOf(saved);
  if (sameCloud(live.carry.cloud, cloud)) return;
  void patchActiveCloud(live, { projectId: saved.projectId, cloud });
}

/**
 * Patch the active draft's cloud link: in memory at once (so the next write
 * carries it), and in the store on the chain (so a write in flight can't
 * put the old record back after it).
 */
function patchActiveCloud(
  live: LiveDraft,
  patch: { projectId?: string | null; cloud?: DraftCloudRecord | null },
): Promise<void> {
  if (patch.cloud === null) delete live.carry.cloud;
  else if (patch.cloud) live.carry.cloud = patch.cloud;
  return enqueue(async () => {
    if (live.writeSeq === null) return;
    try {
      const stored = await draftStore().patchMeta(live.draftId, patch);
      if (!stored) return;
      live.stored = stored;
      // The record now holds what the next write would: no write for it.
      // (Signatures sort their keys, so a key the patch added compares
      // equal to the same key a write puts elsewhere.)
      if (live.committedSignature !== null) {
        const committed = JSON.parse(live.committedSignature) as Partial<
          DraftWrite['meta']
        >;
        if (patch.cloud === null) delete committed.cloud;
        else if (patch.cloud) committed.cloud = patch.cloud;
        if (patch.projectId === null) delete committed.projectId;
        else if (patch.projectId) committed.projectId = patch.projectId;
        live.committedSignature = signatureOf(committed);
      }
    } catch (err) {
      console.warn(
        '[drafts] Recording the cloud save on the draft failed:',
        err,
      );
    }
  });
}

// ── navigator.storage.persist() ────────────────────────────────────────────

const PERSIST_META_KEY = 'persist';

function isChromium(): boolean {
  try {
    const nav = navigator as Navigator & {
      userAgentData?: { brands?: { brand: string }[] };
    };
    if (nav.userAgentData?.brands?.some((b) => /Chromium/i.test(b.brand)))
      return true;
    const ua = nav.userAgent ?? '';
    return /\bChrom(e|ium)\//.test(ua) && !/Firefox|FxiOS/.test(ua);
  } catch {
    return false;
  }
}

/**
 * After the first committed write of a draft with work: ask for persistent
 * storage once per device, on Chromium only (it never prompts there;
 * Firefox would). The answer is kept in the store's meta.
 */
function maybePersist(stored: DraftMeta): void {
  if (s.persistAsked || !draftHasWork(stored)) return;
  s.persistAsked = true;
  void (async () => {
    try {
      if (!isChromium()) return;
      const storage = navigator.storage as StorageManager | undefined;
      if (typeof storage?.persist !== 'function') return;
      const store = draftStore();
      if (store.kind !== 'indexeddb') return;
      const before = await store.getMetaValue(PERSIST_META_KEY);
      if (before !== null) return;
      const granted = await storage.persist();
      await store.setMetaValue(PERSIST_META_KEY, { granted, at: Date.now() });
    } catch (err) {
      console.warn('[drafts] Asking for persistent storage failed:', err);
    }
  })();
}

// ── Protection ─────────────────────────────────────────────────────────────

/**
 * Draft ids this page must never prune: the active one, claims, the ones an
 * open has named but not claimed yet, the pointer.
 */
export function pageProtectedDraftIds(): Set<string> {
  const ids = new Set<string>(s.claims.keys());
  for (const id of s.pendingProtect.keys()) ids.add(id);
  if (s.live) ids.add(s.live.draftId);
  if (s.retired) ids.add(s.retired.live.draftId);
  const pointer = readActiveDraft();
  if (pointer) ids.add(pointer.draftId);
  return ids;
}

/** Every prune's protect set: locked (any tab) ∪ this page's. */
export async function protectSet(): Promise<Set<string>> {
  const ids = await lockedDraftIds();
  for (const id of pageProtectedDraftIds()) ids.add(id);
  return ids;
}

// ── Start and stop ─────────────────────────────────────────────────────────

/**
 * Start the controller (idempotent; one per page). Returns its stop, which
 * flushes the live session strictly and then unsubscribes once the last
 * starter has stopped.
 */
export function startDraftAutosave(): () => void {
  s.starts += 1;
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    s.starts -= 1;
    if (s.starts > 0) return;
    const live = s.live;
    const flushable =
      live !== null &&
      live.generation !== null &&
      live.generation === getSessionGeneration() &&
      !s.retiring;
    // An audio take still finishing (usePlaybackEngine's unmount stops the
    // recorder; its clip lands when stopRecording resolves) keeps the
    // triggers and the media capture listening until it settles (10 s).
    const finish = () => {
      // Remounted meanwhile: the new start owns the subscriptions.
      if (s.starts > 0) return;
      // Stops the media capture too: a capture still scheduled (a take in
      // the last second) runs at once.
      s.teardown?.();
      s.teardown = null;
      if (!flushable) return;
      // Leaving the editor writes the edit in flight instead of dropping
      // it, once a take's bytes are stored, so the meta names them.
      clearTimers();
      void whenMediaWritesSettled(UNMOUNT_MEDIA_WAIT_MS).then(() => {
        if (s.live !== live) return;
        if (memoryAhead() || manifestDiffers(live))
          void flushDraftNow({ force: true });
      });
    };
    if (takesInFlight() === 0) finish();
    else void whenTakesSettled(10_000).then(finish);
  };
  if (s.teardown) return stop;

  attachDocumentObserver();
  const unsubscribers = [
    useSaveStatusStore.subscribe((st, prev) => {
      if (st.draftVersion !== prev.draftVersion) schedule();
    }),
    useStore.subscribe((st, prev) => {
      if (viewChanged(st, prev)) onView();
    }),
    useSynthStore.subscribe(synthPatchFields, () => noteSynthPatchChange(), {
      equalityFn: shallow,
    }),
    onManifestChange(schedule),
    useCloudSaveStore.subscribe((st, prev) => {
      if (st.lastSaved !== prev.lastSaved) onLastSaved(st.lastSaved);
    }),
  ];
  const stopMedia = startPendingMediaCapture({
    store: () => draftStore(),
    userKey: () => status().userKey,
  });
  installLifecycleListeners();
  setDraftProtection(pageProtectedDraftIds);
  if (!s.signOutRegistered) {
    s.signOutRegistered = true;
    registerBeforeSignOut(runSignOutCleanup);
  }
  s.teardown = () => {
    s.versionAtStop = useSaveStatusStore.getState().draftVersion;
    for (const unsubscribe of unsubscribers) unsubscribe();
    stopMedia();
    // The lifecycle listeners stay: a tab closed from the dashboard still
    // mirrors what the live draft hasn't written yet.
    clearTimers();
  };
  // Back in the editor with a live draft (an SPA return): a change made
  // while the editor was away (nothing listened) goes out with a write.
  if (
    s.versionAtStop !== null &&
    useSaveStatusStore.getState().draftVersion !== s.versionAtStop
  ) {
    schedule();
  } else if (
    s.live?.ready &&
    !s.paused &&
    status().pendingSeq > status().committedSeq
  ) {
    // Changes counted before the last stop and not written yet.
    armTimers();
  }
  s.versionAtStop = null;
  return stop;
}

/**
 * hidden, pagehide and freeze → hideFlush, for the life of the page (they
 * do nothing without a live draft). A hot reload swaps in its own.
 */
function installLifecycleListeners(): void {
  if (typeof window === 'undefined') return;
  s.lifecycle?.();
  const onHide = () => hideFlush();
  window.addEventListener('pagehide', onHide);
  document.addEventListener('visibilitychange', onVisibilityChange);
  document.addEventListener('freeze', onHide);
  s.lifecycle = () => {
    window.removeEventListener('pagehide', onHide);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    document.removeEventListener('freeze', onHide);
  };
}

/** Whether the media manifest differs from what the stored record lists. */
function manifestDiffers(live: LiveDraft): boolean {
  const { refs, missing } = pendingMediaManifest();
  const stored = live.stored;
  if (!stored) return refs.length > 0 || missing > 0;
  return (
    missing !== stored.mediaMissing ||
    stableJson(refs) !== stableJson(stored.media ?? [])
  );
}

/** The editor's draft autosave (DawApp, in today's useAutosave position). */
export function useDraftAutosave(): void {
  useEffect(() => startDraftAutosave(), []);
}

/** E17: before sign-out, flush the open draft and clear what the cloud holds. */
async function runSignOutCleanup(signal: AbortSignal): Promise<void> {
  const live = s.live;
  const flushable =
    live !== null &&
    live.generation !== null &&
    live.generation === getSessionGeneration() &&
    !s.retiring;
  try {
    await cleanupDraftsForSignOut({
      store: draftStore(),
      userKey: live?.userKey ?? status().userKey,
      flush: flushable ? () => flushDraftNow({ force: true }) : null,
      protect: signOutProtectSet,
      signal,
      onMediaDeleted: forgetStoredMedia,
    });
  } finally {
    // The page navigates away next: a scroll since is not mirrored.
    s.signingOut = true;
  }
}

/**
 * The sign-out prune's protect set: every prune's, except the live draft
 * when its stored record is a complete, unchanged cloud copy (a cache, so
 * it shouldn't stay on a shared Chromebook). If the page lives on, the
 * next write makes it again.
 */
async function signOutProtectSet(): Promise<Set<string>> {
  const ids = await protectSet();
  const live = s.live;
  const st = status();
  if (
    live?.stored &&
    s.queuedWrites === 0 &&
    st.pendingSeq === st.committedSeq &&
    !s.viewDirty &&
    st.error === null &&
    draftIsCloudEqual(live.stored)
  ) {
    ids.delete(live.draftId);
  }
  return ids;
}

// ── The active draft's lifecycle (DraftSessionPort only) ───────────────────

/** The live session's draft id (during an open: from activate on). */
export function liveDraftId(): string | null {
  return s.live?.draftId ?? null;
}

/** The live draft's lock and owner, for the port. */
export function liveDraftInfo(): {
  draftId: string;
  userKey: UserKey;
  lock: DraftLock | null;
} | null {
  const live = s.live;
  return live
    ? { draftId: live.draftId, userKey: live.userKey, lock: live.lock }
    : null;
}

/**
 * Protect `draftIds` from prunes until the returned function runs: an open
 * names its draft (a {kind:'draft'} intent) before the boot's prepare,
 * whose prune would otherwise be free to take it.
 */
export function protectPending(draftIds: readonly string[]): () => void {
  for (const id of draftIds)
    s.pendingProtect.set(id, (s.pendingProtect.get(id) ?? 0) + 1);
  let done = false;
  return () => {
    if (done) return;
    done = true;
    for (const id of draftIds) {
      const left = (s.pendingProtect.get(id) ?? 0) - 1;
      if (left > 0) s.pendingProtect.set(id, left);
      else s.pendingProtect.delete(id);
    }
  };
}

/** Remember a claim until activate or release (protected from prunes). */
export function noteClaim(draftId: string, lock: DraftLock | null): void {
  s.claims.set(draftId, lock);
}

/**
 * Forget a claim; releases its lock unless the live draft holds the same
 * one. An open that gives up between keeping and switching releases its
 * claim: the draft it retired becomes live again.
 */
export function dropClaim(draftId: string, lock: DraftLock | null): void {
  s.claims.delete(draftId);
  if (lock && s.live?.lock !== lock && s.retired?.live.lock !== lock)
    lock.release();
  if (!s.live && s.retired) reinstateRetiredDraft();
}

/** Whether `draftId` is claimed by an open in progress. */
export function isClaimed(draftId: string): boolean {
  return s.claims.has(draftId);
}

/** Writes resume on the live draft after an open was refused while keeping. */
function resumeWrites(live: LiveDraft): void {
  if (s.live !== live) return;
  s.paused = false;
  s.retiring = false;
  setStatus({ paused: false });
  if (status().pendingSeq > status().committedSeq || s.viewDirty) armTimers();
}

/**
 * flushOutgoing: pause, let media writes settle (3 s), write strictly.
 * When the write hasn't landed after DRAFT_FLUSH_TIMEOUT_MS (a stalled
 * transaction), the same snapshot goes to the mirror, which the next boot
 * reconciles, and keeping goes on. Throws only when the work could be kept
 * neither way and the live session has work; writes then resume.
 */
export async function flushOutgoingDraft(): Promise<DraftMeta | null> {
  const live = s.live;
  if (!live) return null;
  s.paused = true;
  clearTimers();
  setStatus({ paused: true });
  if (live.generation === null) return live.stored;
  await whenMediaWritesSettled(3000);
  if (s.live !== live) return null;
  if (live.generation !== getSessionGeneration()) return live.stored;
  const pendingAt = status().pendingSeq;
  const snap = snapshotLiveSession();
  s.viewDirty = false;
  const baseSeq = (live.writeSeq ?? 0) + s.queuedWrites;
  const outcome = await withTimeout(
    enqueueWrite({
      durability: 'strict',
      generation: live.generation,
      force: true,
      snapshot: snap,
      pendingSeq: pendingAt,
    }),
    DRAFT_FLUSH_TIMEOUT_MS,
  );
  if (outcome === TIMED_OUT) {
    const meta = buildMeta(live, snap);
    if (writeMirrorFor(live, snap, meta, baseSeq) === 'written')
      return live.stored;
    if (draftHasWork(meta as DraftMeta)) {
      resumeWrites(live);
      throw new DraftStorageError(
        'unavailable',
        'The work on screen could not be kept on this device.',
      );
    }
    return null;
  }
  if (outcome.status === 'written' || outcome.status === 'unchanged')
    return outcome.meta;
  if (outcome.status === 'failed') {
    if (outcome.hasWork) {
      // The open is refused and this session goes on: writes resume.
      resumeWrites(live);
      throw new DraftStorageError(
        outcome.kind === 'quota' ? 'quota' : 'unavailable',
        'The work on screen could not be kept on this device.',
      );
    }
    return null;
  }
  return live.stored;
}

type RetireResult =
  | { kind: 'kept'; meta: DraftMeta | null }
  | { kind: 'removed' }
  | { kind: 'left' };

/**
 * retireOutgoing: the live draft becomes kept work (origin 'kept', keptAt)
 * when it has work, else it is removed with its mirror ('discard' removes it
 * always). An edit made while keeping is written first. Clears the live
 * draft; its lock is released when the open switches (activate), and an
 * open that stops before that (release, unkeep) makes it live again.
 * Resolves the kept meta, or null.
 *
 * Bounded by DRAFT_RETIRE_TIMEOUT_MS: a store that doesn't answer leaves
 * the record as it is (it has work, so prunes keep it) and resolves null.
 * When the store fails, nothing changed: the live draft stays live, writes
 * resume, and it throws (the open is refused).
 */
export async function retireOutgoingDraft(
  policy: 'auto' | 'discard',
): Promise<DraftMeta | null> {
  if (!s.live) return null;
  s.paused = true;
  clearTimers();
  setStatus({ paused: true });
  const deadline = Date.now() + DRAFT_RETIRE_TIMEOUT_MS;
  const left = () => Math.max(0, deadline - Date.now());
  let timedOut =
    (await withTimeout(whenDraftWritesSettled(), left())) === TIMED_OUT;
  // Read after the wait: a write on the chain may have forked the session.
  const live = s.live as LiveDraft | null;
  if (!live) return null;
  const store = draftStore();
  const incoming = s.claims.has(live.draftId);
  const generation =
    live.generation !== null && live.generation === getSessionGeneration()
      ? live.generation
      : null;

  // An edit made since flushOutgoing (keeping takes a while): write it.
  let unwritten: DraftWrite['meta'] | null = null;
  if (!timedOut && !incoming && generation !== null && memoryAhead()) {
    const outcome = await withTimeout(
      enqueueWrite({
        durability: 'strict',
        generation,
        force: true,
      }),
      left(),
    );
    if (outcome === TIMED_OUT || outcome.status === 'failed') {
      const snap = snapshotLiveSession();
      unwritten = buildMeta(live, snap);
      writeMirrorFor(
        live,
        snap,
        unwritten,
        (live.writeSeq ?? 0) + s.queuedWrites,
      );
      if (outcome === TIMED_OUT) timedOut = true;
    }
  }
  s.retiring = true;

  let result: RetireResult = { kind: 'left' };
  if (!incoming && !timedOut && live.writeSeq !== null) {
    const judged = await withTimeout(
      enqueue(async (): Promise<RetireResult> => {
        const stored = (await store.getMeta(live.draftId)) ?? live.stored;
        if (!stored || stored.userKey !== live.userKey) return { kind: 'left' };
        // Another writer's record (no navigator.locks): not this page's to
        // keep or remove.
        if (stored.writer?.doc !== WRITER_DOC && !live.lock?.held)
          return { kind: 'left' };
        const work =
          draftHasWork(stored) ||
          (unwritten !== null && draftHasWork(unwritten as DraftMeta));
        if (policy === 'discard' || !work) {
          await store.remove(live.draftId);
          removeMirror(live.userKey, live.draftId);
          live.mirror = null;
          return { kind: 'removed' };
        }
        const meta = await store.patchMeta(live.draftId, {
          origin: 'kept',
          keptAt: Date.now(),
        });
        return { kind: 'kept', meta };
      }),
      left(),
    ).catch((err: unknown) => {
      // Nothing changed: the draft is still live, its writes resume, and
      // the caller decides. openSession goes on (its flush made the work
      // durable): activate then lets this draft go, and the flushed record
      // stays as the kept work, under origin 'session'.
      resumeWrites(live);
      throw err;
    });
    if (judged !== TIMED_OUT) result = judged;
  }

  const kept = result.kind === 'kept' ? result.meta : null;
  if (s.live === live) {
    s.live = null;
    setStatus({ draftId: null, paused: true, retry: null });
  }
  s.retiring = false;
  if (!incoming) {
    if (s.retired && s.retired.live.lock !== live.lock)
      s.retired.live.lock?.release();
    s.retired = { live, kept, removed: result.kind === 'removed' };
  }
  // Tidy up in the background: nothing waits for it.
  void (async () => {
    try {
      const report = await store.prune({
        userKey: live.userKey,
        protect: await protectSet(),
        reason: 'switch',
        schemaVersion: SESSION_SCHEMA_VERSION,
      });
      if (report.deletedMedia > 0) forgetStoredMedia();
    } catch (err) {
      console.warn('[drafts] Tidying drafts after a switch failed:', err);
    }
  })();
  return kept;
}

/**
 * The open that retired the live draft stopped before switching: the
 * retired draft is the session's again (its lock was never released).
 * Kept work becomes the session's own; a removed record is made again by
 * the next write. Does nothing once the session generation moved.
 */
export function reinstateRetiredDraft(): boolean {
  const retired = s.retired;
  if (!retired || s.live) return false;
  s.retired = null;
  const { live } = retired;
  if (live.generation === null || live.generation !== getSessionGeneration()) {
    live.lock?.release();
    return false;
  }
  s.live = live;
  s.paused = false;
  s.retiring = false;
  if (retired.removed) {
    live.writeSeq = null;
    live.stored = null;
    live.committedSignature = null;
  }
  writeActiveDraft({ draftId: live.draftId, userKey: live.userKey });
  adoptActiveDraft(live.draftId, live.userKey);
  setStatus({
    draftId: live.draftId,
    userKey: live.userKey,
    adapter: draftStore().kind,
    paused: false,
    retry: null,
  });
  if (retired.kept) {
    void enqueue(async () => {
      try {
        const stored = await draftStore().patchMeta(live.draftId, {
          origin: 'session',
          keptAt: null,
        });
        if (stored && s.live === live) live.stored = stored;
      } catch (err) {
        console.warn('[drafts] Unkeeping the draft failed:', err);
      }
    });
  }
  if (memoryAhead()) armTimers();
  return true;
}

/** Whether `draftId` is the draft retireOutgoing let go of (see Retired). */
export function isRetiredDraft(draftId: string): boolean {
  return s.retired?.live.draftId === draftId;
}

/** activate: the claim becomes the live draft (pointer, status), writes paused. */
export function activateDraft(claim: DraftClaim): void {
  const previous = s.live;
  if (previous && previous.draftId !== claim.draftId) {
    // Not retired (an open that skipped keeping): let its lock go.
    if (previous.lock !== claim.lock) previous.lock?.release();
  }
  // The open switches: the retired draft's lock goes now.
  if (s.retired) {
    if (s.retired.live.lock !== claim.lock) s.retired.live.lock?.release();
    s.retired = null;
  }
  s.retiring = false;
  s.claims.delete(claim.draftId);
  s.live = {
    draftId: claim.draftId,
    userKey: claim.userKey,
    lock: claim.lock,
    mode: claim.mode,
    ...(claim.sourceDraftId ? { sourceDraftId: claim.sourceDraftId } : {}),
    prepared: null,
    carry: {
      origin: 'session',
      createdAt: Date.now(),
      baseline: { source: 'empty', reopenable: true, fingerprint: null },
    },
    writeSeq: null,
    stored: null,
    committedContent: null,
    committedSignature: null,
    generation: null,
    mirror: null,
    committedOrdinal: 0,
    ready: false,
  };
  s.paused = true;
  s.viewDirty = false;
  s.toldError = null;
  clearTimers();
  writeActiveDraft({ draftId: claim.draftId, userKey: claim.userKey });
  adoptActiveDraft(claim.draftId, claim.userKey);
  const store = draftStore();
  setStatus({
    draftId: claim.draftId,
    userKey: claim.userKey,
    adapter: store.kind,
    pendingSeq: 0,
    committedSeq: 0,
    committedAt: null,
    writing: false,
    paused: true,
    error: null,
    mirror: 'none',
    retry: null,
  });
}

/**
 * apply: load the prepared draft into the store (after the reset). The
 * meta's projectId wins over the body's; a fork becomes '<name> (copy)'
 * with no project. Seeds pending media from the meta before writes resume.
 * Throws DraftStorageError 'corrupt' (after quarantining) when it can't load.
 */
export function applyPreparedDraft(prepared: PreparedDraft): void {
  const live = s.live;
  let loaded = false;
  try {
    loaded = deserializeSession(prepared.body.text);
  } catch (err) {
    console.warn('[drafts] Loading the draft threw:', err);
  }
  if (!loaded) {
    // A body taken from the mirror leaves the stored record alone.
    void quarantineDraft(
      prepared,
      prepared.claim.mode !== 'fork' && !prepared.fromMirror,
    );
    throw new DraftStorageError('corrupt', 'The draft could not be opened.');
  }
  const state = useStore.getState();
  if (prepared.claim.mode === 'fork') {
    state.setProjectName(`${state.projectName} (copy)`);
    state.setProjectId(null);
  } else {
    state.setProjectId(prepared.meta.projectId ?? null);
  }
  registerDraftMedia(prepared.meta.media ?? [], prepared.meta.userKey);
  if (live && live.draftId === prepared.claim.draftId) live.prepared = prepared;
}

/** Keep an unopenable draft's raw text in the quarantine; remove the draft. */
export async function quarantineDraft(
  prepared: { meta: DraftMeta; body: { text: string } | null },
  remove: boolean,
  reason = 'The draft could not be opened.',
): Promise<void> {
  const store = draftStore();
  const raw = prepared.body?.text ?? '';
  try {
    await store.quarantine({
      userKey: prepared.meta.userKey,
      source: 'draft',
      reason,
      schema: prepared.meta.schema,
      build: prepared.meta.writer?.build ?? 'unknown',
      hash: hashFingerprint(raw),
      raw,
      at: Date.now(),
      draftId: prepared.meta.draftId,
      name: prepared.meta.name,
    });
    if (remove) {
      await store.remove(prepared.meta.draftId);
      removeMirror(prepared.meta.userKey, prepared.meta.draftId);
    }
  } catch (err) {
    console.warn('[drafts] Quarantining a draft failed:', err);
  }
}

/**
 * begin: write the live draft's first record (new, fork) or adopt the
 * claimed one (existing), then resume writes. Resolves the stored meta, or
 * null when it couldn't be written (status error; later writes retry).
 */
export async function beginDraft(
  baseline: DraftBaseline,
  extras: { roomId?: string } = {},
): Promise<DraftMeta | null> {
  const live = s.live;
  if (!live) return null;
  const generation = getSessionGeneration();
  live.generation = generation;
  const now = Date.now();
  const prepared = live.prepared;

  if (live.mode === 'existing' && prepared) {
    const store = draftStore();
    try {
      let meta = prepared.meta;
      if (meta.userKey !== live.userKey) {
        const claimed = await claimDeviceDraft(
          store,
          meta.draftId,
          live.userKey,
        );
        if (claimed) {
          meta = claimed;
          // Its media moved to the new owner's key with it.
          registerDraftMedia(claimed.media ?? [], live.userKey);
        }
      }
      const current = (await store.getMeta(meta.draftId)) ?? meta;
      live.writeSeq =
        current.userKey === live.userKey ? current.writeSeq : null;
      live.stored = current;
      // Opened from the mirror (the record is older): its own fields too.
      live.carry = carryOf(
        prepared.fromMirror && current.writeSeq === meta.writeSeq
          ? meta
          : current,
      );
      if (current.userKey !== live.userKey) live.carry.createdAt = now;
      // The open's own cloud record (E11 sets it from the server's copy).
      const cloud = currentCloudRecord(generation);
      if (cloud) live.carry.cloud = cloud;
    } catch (err) {
      console.warn('[drafts] Adopting the draft failed:', err);
      live.writeSeq = null;
      live.carry = carryOf(prepared.meta);
    }
    // Open again, it is the session's own draft once more.
    live.carry.origin = 'session';
    delete live.carry.keptAt;
    if (prepared.fromMirror) {
      // The record holds older content than memory: nothing is committed
      // yet, and the mirror stays until a write covers it.
      live.committedContent = null;
      live.mirror = {
        writeSeq: prepared.fromMirror.writeSeq,
        content: bodyContent(prepared.body.text),
      };
    } else {
      live.committedContent = bodyContent(prepared.body.text);
    }
    live.committedSignature = null;
  } else if (live.mode === 'fork' && prepared) {
    const source = prepared.meta;
    live.carry = {
      origin: 'fork',
      createdAt: now,
      // An untouched copy of a draft another tab has open is a cache: a
      // pristine baseline lets it be pruned (critique), an edit makes work.
      baseline: {
        source: source.baseline?.source ?? 'import',
        ...(source.baseline?.ref ? { ref: source.baseline.ref } : {}),
        reopenable: true,
        fingerprint: null,
      },
      forkedFrom: source.draftId,
      ...(source.context ? { context: source.context } : {}),
    };
  } else {
    // A project open set its cloud record (setLastSaved) before begin:
    // the draft starts linked to it, so E11 and the chip see the link.
    const cloud = currentCloudRecord(generation) ?? live.carry.cloud;
    live.carry = { origin: 'session', createdAt: now, baseline };
    if (cloud && cloud.projectId === useStore.getState().projectId)
      live.carry.cloud = cloud;
  }

  // A reopenable baseline left unknown is the session as it stands now.
  const snap = snapshotLiveSession();
  if (
    live.carry.baseline.fingerprint === null &&
    live.carry.baseline.reopenable
  )
    live.carry.baseline = {
      ...live.carry.baseline,
      fingerprint: snap.docFingerprint,
    };
  if (extras.roomId) snap.roomId = extras.roomId;

  live.ready = true;
  s.paused = false;
  s.viewDirty = false;
  setStatus({ paused: false });
  if (live.mode === 'existing' && prepared?.fromMirror) {
    // Never "Saved on this device" while only the mirror holds the work:
    // the write below clears this once it lands, or reports its own error.
    setStatus({
      error: prepared.fromMirror.error,
      mirror: 'written',
      retry: retryNow,
    });
  }
  const outcome = await enqueueWrite({
    durability: 'strict',
    generation,
    force: true,
    snapshot: snap,
    pendingSeq: status().pendingSeq,
    always: true,
  });
  if (s.live === live && status().pendingSeq > status().committedSeq)
    armTimers();
  if (outcome.status === 'written' || outcome.status === 'unchanged')
    return outcome.meta;
  return null;
}

/** patchCloud for any draft: the live one through its chain. */
export async function patchDraftCloud(
  draftId: string,
  patch: { projectId?: string | null; cloud?: DraftCloudRecord | null },
): Promise<void> {
  const live = s.live;
  if (live && live.draftId === draftId) {
    await patchActiveCloud(live, patch);
    return;
  }
  try {
    await draftStore().patchMeta(draftId, patch);
  } catch (err) {
    console.warn('[drafts] Recording the cloud link failed:', err);
  }
}

/** Tests: forget everything (stops the controller without flushing). */
export function resetDraftAutosaveForTests(): void {
  s.teardown?.();
  s.teardown = null;
  s.versionAtStop = null;
  s.starts = 0;
  clearTimers();
  s.live?.lock?.release();
  s.live = null;
  s.paused = false;
  s.viewDirty = false;
  s.chain = Promise.resolve();
  s.queuedWrites = 0;
  s.claims.clear();
  s.pendingProtect.clear();
  s.retired?.live.lock?.release();
  s.retired = null;
  s.retiring = false;
  s.signingOut = false;
  s.lifecycle?.();
  s.lifecycle = null;
  s.warnedGeneration = null;
  s.toldError = null;
  s.persistAsked = false;
}
