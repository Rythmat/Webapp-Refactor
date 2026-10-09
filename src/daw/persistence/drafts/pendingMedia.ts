import {
  getAudioBuffer,
  getOriginalAudio,
  setAudioBuffer,
  setOriginalAudio,
  subscribeAudioBufferChanges,
} from '@/daw/audio/AudioBufferStore';
import { samplerBufferKey } from '@/daw/instruments/samplerChops';
import { getSessionGeneration } from '@/daw/session/sessionGeneration';
import { useStore } from '@/daw/store';
import type { UserKey } from '@/lib/local-store/userScope';
import { audioBufferToWav } from '@/lib/studio-assets/encode-wav';
import { getDecodeContext } from '@/lib/studio-assets/load-audio';
import type { DraftStore } from '@/lib/studio-projects/drafts/draftStore';
import {
  DraftStorageError,
  isDraftStorageError,
  type DraftErrorKind,
  type DraftMediaRef,
  type DraftMeta,
} from '@/lib/studio-projects/drafts/types';
import {
  useDraftStatusStore,
  type PendingMediaStatus,
} from './draftStatusStore';

// ── Pending audio in drafts (milestone 1.4, decision E8) ───────────────────
//
// Audio that never reached the cloud (a take in a never-saved project, a
// Library sample drop, a Chops one-shot, a pasted clip) lives only in the
// in-memory AudioBufferStore, so a refresh or a crash loses it. This module
// copies those bytes into the draft store's media as soon as they appear,
// content-addressed by SHA-256, and restores them when a draft opens.
//
// An item is a pending audio clip (no assetId; keyed by its clip id) or a
// Chops sample with neither an assetId nor a sourceUrl (keyed by
// samplerBufferKey(sampleId)), exactly the items upload-pending.ts uploads
// at Save. Their bytes come from, in order: the item's own original; the
// mediaId already known for the same AudioBuffer (split halves, pastes and
// duplicates share the buffer); another item's original for that buffer;
// otherwise the buffer encoded once (Opus, else WAV).
//
// The draft's meta lists only stored media (pendingMediaManifest); the
// autosave writes it, and onManifestChange tells it when a store, failure or
// restore changed that list. A restore decodes each media once and gives
// every clip and sample of it the same AudioBuffer object, which the upload
// dedupe and stamping rely on.
//
// Data safety: a reference leaves the manifest only when its item is gone,
// plays other audio, or its media is confirmed gone from the store. Anything
// else (a transient read or decode failure) keeps the reference, so gcMedia
// never collects bytes that may still be the only copy. What this page
// believes is stored is re-checked whenever an item comes back (an undo
// after a prune), and every new use of stored bytes restarts their grace.
//
// Not covered: takes still recording (1.11d), and a replaced Chops sample's
// freed buffer (1.10).

/** Media storage limits: per user, and per device (min of the two). */
export const MEDIA_BUDGET: {
  perUserBytes: number;
  deviceMaxBytes: number;
  deviceQuotaShare: number;
} = Object.freeze({
  perUserBytes: 256 * 1024 * 1024,
  deviceMaxBytes: 1024 * 1024 * 1024,
  deviceQuotaShare: 0.2,
});

/** Writes never take the origin's usage past this share of its quota. */
const QUOTA_HEADROOM_SHARE = 0.9;
/** The capture's debounce after a change of tracks or buffers. */
const CAPTURE_DEBOUNCE_MS = 200;
/** Steady changes postpone the capture by at most this long. */
const CAPTURE_MAX_WAIT_MS = 600;
/**
 * requestIdleCallback's timeout for the debounced capture. Max wait plus
 * this stays under the chip's 1 s grace before 'Audio not saved yet'.
 */
const CAPTURE_IDLE_TIMEOUT_MS = 300;
/** An item that couldn't be stored is tried again after this long. */
const FAILED_RETRY_MS = 30_000;
/**
 * Stored bytes this page put or touched this recently exist for sure: the
 * store's 10-minute gc grace runs from that moment, so no second touch.
 */
const TOUCH_FRESH_MS = 60_000;

export interface PendingMediaEnv {
  /** The draft store to write to; null pauses the capture. */
  store: () => DraftStore | null;
  /** The active draft's owner; null pauses the capture. */
  userKey: () => UserKey | null;
  /** Tests: smaller limits. */
  budget?: Partial<typeof MEDIA_BUDGET>;
  /** Tests: navigator.storage.estimate() stand-in (null = unknown). */
  estimate?: () => Promise<{ usage?: number; quota?: number } | null>;
  now?: () => number;
}

interface StoredInfo {
  mediaId: string;
  userKey: UserKey;
  contentType: string;
  size: number;
}

/** What this page knows about one item key. */
type Entry =
  | { status: 'writing'; buffer: AudioBuffer; userKey: UserKey }
  /** Stored in the draft store; `buffer` is the audio it was taken from. */
  | (StoredInfo & { status: 'stored'; buffer: AudioBuffer | null })
  /** Listed by an opening draft's meta; its buffer isn't back yet. */
  | (StoredInfo & { status: 'restoring' })
  /**
   * Listed by the draft's meta, but reading or decoding its bytes failed
   * for a reason that doesn't prove them gone. The reference stays in the
   * manifest (the bytes stay protected); the chip counts it as missing.
   */
  | (StoredInfo & {
      status: 'unrestored';
      reason: DraftErrorKind;
      at: number;
      ref: DraftMediaRef;
    })
  | {
      status: 'failed';
      buffer: AudioBuffer | null;
      reason: DraftErrorKind;
      at: number;
    };

interface PendingItem {
  key: string;
  clipId?: string;
  sampleId?: string;
}

interface Payload {
  bytes: ArrayBuffer;
  contentType: string;
}

type ItemState =
  | 'stored'
  | 'restoring'
  | 'unrestored'
  | 'writing'
  | 'memory'
  | 'missing'
  /** A collab peer's audio this tab never had: its uploader's to keep. */
  | 'remote';

// ── Page state ─────────────────────────────────────────────────────────────

const entries = new Map<string, Entry>();
/** The media each decoded buffer was stored as (pastes, split halves). */
const bufferMedia = new WeakMap<AudioBuffer, StoredInfo>();
/** Encodes of buffers with no original anywhere: once per buffer. */
const encodes = new WeakMap<AudioBuffer, Promise<Payload>>();
/** SHA-256 per byte buffer (shared originals hash once). */
const hashes = new WeakMap<ArrayBuffer, Promise<string>>();
/** When this page last put or touched `${userKey}:${mediaId}`. */
const touchedAt = new Map<string, number>();
/** Puts running, by `${userKey}:${mediaId}`. */
const putsInFlight = new Map<string, Promise<void>>();
/** Captures running (one per item). */
const capturesInFlight = new Set<Promise<void>>();
const manifestListeners = new Set<() => void>();
/** Pending keys as of the last look (to see items come back). */
let pendingSeen = new Set<string>();
/** Stored keys to re-check against the store before trusting them. */
const needsVerify = new Set<string>();

let capture: { env: PendingMediaEnv; unsubscribe: () => void } | null = null;
let scanTimer: ReturnType<typeof setTimeout> | null = null;
let idleHandle: { cancel: () => void } | null = null;
let firstChangeAt: number | null = null;
let scanScheduled = false;
let scanRunning: Promise<void> | null = null;
let rescan = false;
let statusQueued = false;
let activeRestores = 0;
let lastError: DraftErrorKind | null = null;
let lastManifestSignature = '';
let lastRestore: { generation: number; store: DraftStore } | null = null;
let insecureLogged = false;

interface BudgetState {
  userKey: UserKey;
  userBytes: number;
  deviceBytes: number;
}
let budget: Promise<BudgetState> | null = null;
let budgetUserKey: UserKey | null = null;

const now = (): number => capture?.env.now?.() ?? Date.now();
const fullMediaKey = (userKey: UserKey, mediaId: string) =>
  `${userKey}:${mediaId}`;

// ── Items ──────────────────────────────────────────────────────────────────

/** Every clip and Chops sample whose bytes aren't in the cloud. */
function pendingItems(): PendingItem[] {
  const items: PendingItem[] = [];
  const seen = new Set<string>();
  for (const track of useStore.getState().tracks) {
    for (const clip of track.audioClips) {
      if (clip.assetId || seen.has(clip.id)) continue;
      seen.add(clip.id);
      items.push({ key: clip.id, clipId: clip.id });
    }
    const sample = track.samplerSample;
    if (sample && !sample.assetId && !sample.sourceUrl) {
      const key = samplerBufferKey(sample.sampleId);
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({ key, sampleId: sample.sampleId });
    }
  }
  return items;
}

/**
 * Note which items are pending now. A stored item that comes back (an undo,
 * a re-added clip) is re-checked before it is trusted: its bytes may have
 * been collected while no draft referenced them.
 */
function notePendingKeys(items: readonly PendingItem[]): void {
  const next = new Set<string>();
  for (const { key } of items) {
    next.add(key);
    if (!pendingSeen.has(key) && entries.get(key)?.status === 'stored') {
      needsVerify.add(key);
    }
  }
  for (const key of needsVerify) {
    if (!next.has(key)) needsVerify.delete(key);
  }
  pendingSeen = next;
}

/** Every key whose audio may sit in the AudioBufferStore (any clip, sample). */
function allAudioKeys(): string[] {
  const keys: string[] = [];
  for (const track of useStore.getState().tracks) {
    for (const clip of track.audioClips) keys.push(clip.id);
    if (track.samplerSample) {
      keys.push(samplerBufferKey(track.samplerSample.sampleId));
    }
  }
  for (const key of entries.keys()) keys.push(key);
  return keys;
}

/**
 * The stored media an item maps to for `userKey` (any owner when null):
 * stored from the audio it plays now, still restoring, or listed by the
 * draft but not readable right now.
 */
function storedFor(key: string, userKey: UserKey | null): StoredInfo | null {
  const entry = entries.get(key);
  if (
    !entry ||
    (entry.status !== 'stored' &&
      entry.status !== 'restoring' &&
      entry.status !== 'unrestored')
  ) {
    return null;
  }
  if (userKey !== null && entry.userKey !== userKey) return null;
  if (entry.status === 'stored' && entry.buffer) {
    const live = getAudioBuffer(key);
    // The item plays other audio now: what was stored is not its audio.
    if (live && live !== entry.buffer) return null;
  }
  return entry;
}

const currentUserKey = (): UserKey | null => capture?.env.userKey() ?? null;

function classify(
  key: string,
  userKey: UserKey | null,
  room: boolean,
): ItemState {
  const entry = entries.get(key);
  if (storedFor(key, userKey)) {
    if (entry?.status === 'restoring') return 'restoring';
    if (entry?.status === 'unrestored') return 'unrestored';
    return 'stored';
  }
  if (entry?.status === 'writing') return 'writing';
  const live = getAudioBuffer(key);
  if (
    entry?.status === 'failed' &&
    (entry.buffer === null || entry.buffer === live)
  ) {
    return 'missing';
  }
  if (live) return 'memory';
  // No bytes anywhere: an imported draft's clip, a restore whose media is
  // gone. In a room it is a peer's take not uploaded yet: theirs to keep.
  return room ? 'remote' : 'missing';
}

const inRoom = (): boolean => Boolean(useStore.getState().roomId);

// ── Status and manifest ────────────────────────────────────────────────────

function computeStatus(): PendingMediaStatus {
  const userKey = currentUserKey();
  const room = inRoom();
  const items = pendingItems();
  notePendingKeys(items);
  let pendingInMemory = 0;
  let stored = 0;
  let missing = 0;
  let restoring = 0;
  for (const { key } of items) {
    switch (classify(key, userKey, room)) {
      case 'stored':
        stored += 1;
        break;
      case 'restoring':
        stored += 1;
        restoring += 1;
        break;
      case 'unrestored':
      case 'missing':
        missing += 1;
        break;
      case 'memory':
        pendingInMemory += 1;
        break;
      case 'writing': // counted in `writing`
      case 'remote':
        break;
    }
  }
  return {
    pendingInMemory,
    stored,
    missing,
    writing: capturesInFlight.size,
    restoring,
    lastError,
  };
}

function sameStatus(a: PendingMediaStatus, b: PendingMediaStatus): boolean {
  return (
    a.pendingInMemory === b.pendingInMemory &&
    a.stored === b.stored &&
    a.missing === b.missing &&
    a.writing === b.writing &&
    a.restoring === b.restoring &&
    a.lastError === b.lastError
  );
}

function updateStatus(): void {
  statusQueued = false;
  const next = computeStatus();
  if (sameStatus(useDraftStatusStore.getState().media, next)) return;
  useDraftStatusStore.setState({ media: next });
}

function queueStatus(): void {
  if (statusQueued) return;
  statusQueued = true;
  queueMicrotask(updateStatus);
}

/**
 * The media the live session's pending items have in the draft store, by
 * mediaId, for the draft's meta: stored items, those still restoring and
 * those whose restore failed for a passing reason (their bytes are stored;
 * dropping them from the meta would let gcMedia delete the only copy).
 * `missing` counts the pending items without stored media (only in memory,
 * being written, or with no bytes at all); a collab peer's audio this tab
 * never had is not counted.
 */
export function pendingMediaManifest(): {
  refs: DraftMediaRef[];
  missing: number;
} {
  const userKey = currentUserKey();
  const room = inRoom();
  const refs = new Map<string, DraftMediaRef>();
  let missing = 0;
  for (const item of pendingItems()) {
    const stored = storedFor(item.key, userKey);
    if (!stored) {
      if (classify(item.key, userKey, room) !== 'remote') missing += 1;
      continue;
    }
    let ref = refs.get(stored.mediaId);
    if (!ref) {
      ref = {
        mediaId: stored.mediaId,
        contentType: stored.contentType,
        size: stored.size,
        clipIds: [],
        samplerSampleIds: [],
      };
      refs.set(stored.mediaId, ref);
    }
    if (item.clipId !== undefined) ref.clipIds.push(item.clipId);
    if (item.sampleId !== undefined) ref.samplerSampleIds.push(item.sampleId);
  }
  return { refs: [...refs.values()], missing };
}

/**
 * Call `listener` whenever a store, a failure or a restore changed what
 * pendingMediaManifest() returns, so the autosave writes the new list (a
 * take's bytes usually land after the edit's own write). Changes of the
 * tracks themselves are the autosave's own triggers and don't fire it, and
 * neither does registerDraftMedia (its refs come from the committed meta).
 */
export function onManifestChange(listener: () => void): () => void {
  manifestListeners.add(listener);
  return () => {
    manifestListeners.delete(listener);
  };
}

function manifestSignature(): string {
  const { refs, missing } = pendingMediaManifest();
  return JSON.stringify([
    missing,
    refs.map((r) => [r.mediaId, r.clipIds, r.samplerSampleIds]),
  ]);
}

/** Refresh the status now, and tell listeners if the manifest moved. */
function manifestMayHaveChanged(): void {
  updateStatus();
  const signature = manifestSignature();
  if (signature === lastManifestSignature) return;
  lastManifestSignature = signature;
  for (const listener of [...manifestListeners]) {
    try {
      listener();
    } catch (err) {
      console.error('[drafts] media manifest listener failed', err);
    }
  }
}

// ── Bytes ──────────────────────────────────────────────────────────────────

const hasSubtleCrypto = (): boolean =>
  typeof globalThis.crypto?.subtle?.digest === 'function';

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  let hex = '';
  for (const byte of new Uint8Array(digest)) {
    hex += byte.toString(16).padStart(2, '0');
  }
  return hex;
}

function hashOnce(bytes: ArrayBuffer): Promise<string> {
  let hash = hashes.get(bytes);
  if (!hash) {
    hash = sha256Hex(bytes);
    hashes.set(bytes, hash);
    hash.catch(() => hashes.delete(bytes));
  }
  return hash;
}

function encodeOnce(buffer: AudioBuffer): Promise<Payload> {
  let encoded = encodes.get(buffer);
  if (!encoded) {
    encoded = (async (): Promise<Payload> => {
      try {
        // Loaded on the first encode: the muxer stays out of the editor's
        // boot chunk.
        const opus = await import('@/lib/studio-assets/encode-opus');
        if (opus.isOpusEncodingSupported()) {
          return {
            bytes: await opus.audioBufferToOpusWebm(buffer),
            contentType: 'audio/webm;codecs=opus',
          };
        }
      } catch (err) {
        console.warn(
          '[drafts] Opus encoding failed for pending audio; storing WAV',
          err,
        );
      }
      return { bytes: audioBufferToWav(buffer), contentType: 'audio/wav' };
    })();
    encodes.set(buffer, encoded);
    encoded.catch(() => encodes.delete(buffer));
  }
  return encoded;
}

/** The bytes for an item from its original, a sibling's, or an encode. */
async function resolvePayload(
  key: string,
  buffer: AudioBuffer,
): Promise<Payload> {
  const own = getOriginalAudio(key);
  if (own) return own;
  for (const other of allAudioKeys()) {
    if (other === key || getAudioBuffer(other) !== buffer) continue;
    const original = getOriginalAudio(other);
    if (original) return original;
  }
  return encodeOnce(buffer);
}

/**
 * Make sure the store still holds `mediaId` and restart its gc grace (the
 * store's putMedia does that for an existing record). Skipped when this
 * page put or touched it within TOUCH_FRESH_MS. False when it is gone.
 */
async function touchMedia(
  store: DraftStore,
  userKey: UserKey,
  mediaId: string,
): Promise<boolean> {
  const key = fullMediaKey(userKey, mediaId);
  const last = touchedAt.get(key);
  if (last !== undefined && now() - last < TOUCH_FRESH_MS) return true;
  const record = await store.getMedia(userKey, mediaId);
  if (!record) {
    touchedAt.delete(key);
    return false;
  }
  await store.putMedia(record);
  touchedAt.set(key, now());
  return true;
}

// ── Budget ─────────────────────────────────────────────────────────────────

async function measureBudget(
  store: DraftStore,
  userKey: UserKey,
): Promise<BudgetState> {
  const mediaBytes = (key: UserKey) =>
    store.usage(key).then(
      (u) => u.mediaBytes,
      () => 0,
    );
  const userBytes = await mediaBytes(userKey);
  let deviceBytes = userBytes;
  const others = await store.knownUserKeys().catch(() => new Set<UserKey>());
  for (const other of others) {
    if (other !== userKey) deviceBytes += await mediaBytes(other);
  }
  return { userKey, userBytes, deviceBytes };
}

async function storageEstimate(): Promise<{
  usage?: number;
  quota?: number;
} | null> {
  const custom = capture?.env.estimate;
  if (custom) return custom();
  try {
    const storage = (globalThis.navigator as Navigator | undefined)?.storage;
    if (!storage?.estimate) return null;
    return await storage.estimate();
  } catch {
    return null;
  }
}

/**
 * Reserve `size` bytes of the budget, or reject 'quota'. The counts are
 * cached per page and grow with each put; before refusing, they are measured
 * again once, since prunes and deletes (here or in another tab) free space.
 */
async function reserve(
  store: DraftStore,
  userKey: UserKey,
  size: number,
): Promise<BudgetState> {
  let fresh = false;
  if (!budget || budgetUserKey !== userKey) {
    budgetUserKey = userKey;
    budget = measureBudget(store, userKey);
    fresh = true;
  }
  const limits = { ...MEDIA_BUDGET, ...capture?.env.budget };
  const estimate = await storageEstimate();
  const quota = estimate?.quota && estimate.quota > 0 ? estimate.quota : null;
  const deviceMax =
    quota === null
      ? limits.deviceMaxBytes
      : Math.min(limits.deviceMaxBytes, limits.deviceQuotaShare * quota);
  const refusal = (state: BudgetState): DraftStorageError | null => {
    if (state.userBytes + size > limits.perUserBytes) {
      return new DraftStorageError(
        'quota',
        'This account has used its audio space on this device.',
      );
    }
    if (state.deviceBytes + size > deviceMax) {
      return new DraftStorageError(
        'quota',
        'This device has used its audio space for drafts.',
      );
    }
    return null;
  };
  let state = await budget;
  let error = refusal(state);
  if (error && !fresh) {
    budget = measureBudget(store, userKey);
    state = await budget;
    error = refusal(state);
  }
  if (error) throw error;
  if (
    quota !== null &&
    (estimate?.usage ?? 0) + size > QUOTA_HEADROOM_SHARE * quota
  ) {
    throw new DraftStorageError('quota', 'Storage on this device is full.');
  }
  state.userBytes += size;
  state.deviceBytes += size;
  return state;
}

/**
 * Put the bytes under `${userKey}:${mediaId}`. When the store already has
 * them, their gc grace restarts instead (the item references them anew).
 */
function putOnce(
  store: DraftStore,
  userKey: UserKey,
  mediaId: string,
  payload: Payload,
  buffer: AudioBuffer,
): Promise<void> {
  const key = fullMediaKey(userKey, mediaId);
  const running = putsInFlight.get(key);
  if (running) return running;
  const put = (async () => {
    if (await touchMedia(store, userKey, mediaId)) return;
    const size = payload.bytes.byteLength;
    const reserved = await reserve(store, userKey, size);
    try {
      await store.putMedia({
        key,
        mediaId,
        userKey,
        blob: new Blob([payload.bytes], { type: payload.contentType }),
        contentType: payload.contentType,
        size,
        createdAt: now(),
        durationSeconds: buffer.duration,
        sampleRate: buffer.sampleRate,
        channels: buffer.numberOfChannels,
      });
    } catch (err) {
      reserved.userBytes -= size;
      reserved.deviceBytes -= size;
      throw err;
    }
    touchedAt.set(key, now());
  })();
  putsInFlight.set(key, put);
  const forget = () => {
    if (putsInFlight.get(key) === put) putsInFlight.delete(key);
  };
  put.then(forget, forget);
  return put;
}

// ── Capture ────────────────────────────────────────────────────────────────

function errorKindOf(err: unknown): DraftErrorKind {
  if (isDraftStorageError(err)) return err.kind;
  const name = (err as { name?: unknown } | null)?.name;
  return name === 'QuotaExceededError' ? 'quota' : 'unavailable';
}

/** Store one item's bytes; the entry ends 'stored' or 'failed'. */
async function captureItem(
  key: string,
  buffer: AudioBuffer,
  userKey: UserKey,
  store: DraftStore,
): Promise<void> {
  const writing: Entry = { status: 'writing', buffer, userKey };
  entries.set(key, writing);
  const stillOurs = () => entries.get(key) === writing;
  let result: Entry;
  let quiet = false;
  try {
    if (store.kind !== 'indexeddb') {
      // The localStorage adapter keeps no media (E1).
      quiet = true;
      throw new DraftStorageError('unavailable', 'No audio storage here.');
    }
    if (!hasSubtleCrypto()) {
      // crypto.subtle exists only on secure pages (https, localhost).
      quiet = true;
      if (!insecureLogged) {
        insecureLogged = true;
        console.info('[drafts] Pending audio isn’t kept on an insecure page');
      }
      throw new DraftStorageError(
        'unavailable',
        'Audio storage needs a secure page.',
      );
    }
    let info: StoredInfo | null = null;
    // The media this buffer is already stored as (a paste, a split half),
    // trusted only once the store confirms it still holds the bytes.
    const known = bufferMedia.get(buffer);
    if (known && known.userKey === userKey) {
      if (await touchMedia(store, userKey, known.mediaId)) {
        info = known;
      } else {
        bufferMedia.delete(buffer);
      }
    }
    if (!info) {
      const payload = await resolvePayload(key, buffer);
      const mediaId = await hashOnce(payload.bytes);
      await putOnce(store, userKey, mediaId, payload, buffer);
      info = {
        mediaId,
        userKey,
        contentType: payload.contentType,
        size: payload.bytes.byteLength,
      };
      // Its bytes are stored: later items playing it map through the buffer.
      encodes.delete(buffer);
    }
    if (bufferMedia.get(buffer)?.userKey !== userKey) {
      bufferMedia.set(buffer, info);
    }
    result = { ...info, status: 'stored', buffer };
    lastError = null;
  } catch (err) {
    const reason = errorKindOf(err);
    if (!quiet) {
      console.warn(`[drafts] Couldn't store pending audio (${reason})`, err);
    }
    lastError = reason;
    result = { status: 'failed', buffer, reason, at: now() };
  }
  if (stillOurs()) entries.set(key, result);
}

function trackCapture(task: Promise<void>): Promise<void> {
  capturesInFlight.add(task);
  queueStatus();
  const done = () => {
    capturesInFlight.delete(task);
    manifestMayHaveChanged();
  };
  task.then(done, done);
  return task;
}

/** One pass: store every pending item that has bytes and no stored media. */
async function scan(env: PendingMediaEnv): Promise<void> {
  const userKey = env.userKey();
  const store = env.store();
  if (!userKey || !store) return;
  const generation = getSessionGeneration();
  // Forget buffers no item plays any more (removed clips, replaced samples).
  for (const [key, entry] of entries) {
    if (
      entry.status === 'stored' &&
      entry.buffer &&
      getAudioBuffer(key) !== entry.buffer
    ) {
      entries.delete(key);
    }
  }
  notePendingKeys(pendingItems());
  for (const item of pendingItems()) {
    // A session switch (or a new owner) mid-scan: the remaining items
    // belong to another session. Stop; the switch's changes scan again.
    if (
      getSessionGeneration() !== generation ||
      env.userKey() !== userKey ||
      env.store() !== store
    ) {
      rescan = true;
      return;
    }
    if (!pendingItems().some((p) => p.key === item.key)) continue;
    const buffer = getAudioBuffer(item.key);
    if (!buffer) continue;
    const entry = entries.get(item.key);
    if (storedFor(item.key, userKey) && !needsVerify.has(item.key)) continue;
    if (needsVerify.delete(item.key) && entry?.status === 'stored') {
      // Re-checked against the store itself: a cleanup without grace (a
      // sign-out, a Projects delete) may have removed bytes touched lately.
      touchedAt.delete(fullMediaKey(entry.userKey, entry.mediaId));
    }
    if (
      entry?.status === 'writing' ||
      entry?.status === 'restoring' ||
      entry?.status === 'unrestored'
    ) {
      continue;
    }
    if (
      entry?.status === 'failed' &&
      entry.buffer === buffer &&
      now() - entry.at < FAILED_RETRY_MS
    ) {
      continue;
    }
    // One at a time: encodes and hashes of long takes are heavy.
    await trackCapture(captureItem(item.key, buffer, userKey, store));
  }
}

function cancelScheduledScan(): void {
  if (scanTimer !== null) clearTimeout(scanTimer);
  scanTimer = null;
  idleHandle?.cancel();
  idleHandle = null;
  firstChangeAt = null;
}

function whenIdle(run: () => void): { cancel: () => void } {
  const g = globalThis as typeof globalThis & {
    requestIdleCallback?: (
      cb: () => void,
      opts?: { timeout: number },
    ) => number;
    cancelIdleCallback?: (handle: number) => void;
  };
  if (typeof g.requestIdleCallback === 'function') {
    const handle = g.requestIdleCallback(run, {
      timeout: CAPTURE_IDLE_TIMEOUT_MS,
    });
    return { cancel: () => g.cancelIdleCallback?.(handle) };
  }
  const handle = setTimeout(run, 0);
  return { cancel: () => clearTimeout(handle) };
}

/**
 * Debounce the capture 200 ms, but never past CAPTURE_MAX_WAIT_MS after the
 * first change (steady track churn would starve it), and never cancel an
 * idle callback already queued: that scan reads the latest state anyway.
 */
function scheduleScan(): void {
  if (!capture) return;
  if (idleHandle) return;
  const t = Date.now();
  if (!scanScheduled || firstChangeAt === null) firstChangeAt = t;
  scanScheduled = true;
  const delay = Math.max(
    0,
    Math.min(CAPTURE_DEBOUNCE_MS, firstChangeAt + CAPTURE_MAX_WAIT_MS - t),
  );
  if (scanTimer !== null) clearTimeout(scanTimer);
  scanTimer = setTimeout(() => {
    scanTimer = null;
    idleHandle = whenIdle(() => {
      idleHandle = null;
      void runScanNow();
    });
  }, delay);
}

function runScanNow(env = capture?.env): Promise<void> {
  cancelScheduledScan();
  scanScheduled = false;
  if (scanRunning) {
    rescan = true;
    return scanRunning;
  }
  if (!env) return Promise.resolve();
  const running = scan(env)
    .catch((err) => console.error('[drafts] pending media scan failed', err))
    .finally(() => {
      scanRunning = null;
      if (rescan) {
        rescan = false;
        void runScanNow();
      }
    });
  scanRunning = running;
  return running;
}

function onAudioChange(): void {
  queueStatus();
  scheduleScan();
}

/**
 * Start copying pending audio into the draft store (DawApp, once). It
 * watches the AudioBufferStore and the tracks and stores what appears,
 * debounced 200 ms (at most 600 ms) and run when idle. One capture per
 * page: a second call swaps in its env and returns the same stop.
 */
export function startPendingMediaCapture(env: PendingMediaEnv): () => void {
  if (capture) {
    capture.env = env;
    onAudioChange();
    return stopPendingMediaCapture;
  }
  const unsubscribeBuffers = subscribeAudioBufferChanges(onAudioChange);
  const unsubscribeTracks = useStore.subscribe((state, prev) => {
    if (state.tracks !== prev.tracks || state.roomId !== prev.roomId) {
      onAudioChange();
    }
  });
  capture = {
    env,
    unsubscribe: () => {
      unsubscribeBuffers();
      unsubscribeTracks();
    },
  };
  onAudioChange();
  return stopPendingMediaCapture;
}

function detachCapture(): PendingMediaEnv | null {
  if (!capture) return null;
  const { env } = capture;
  capture.unsubscribe();
  capture = null;
  return env;
}

/**
 * Stop watching. A capture that was scheduled but hadn't run yet (a take
 * within the last second) runs now, so whenMediaWritesSettled, in the
 * unmount or sign-out flush, still waits for it.
 */
function stopPendingMediaCapture(): void {
  const env = detachCapture();
  if (!env) return;
  const scheduled = scanScheduled;
  cancelScheduledScan();
  scanScheduled = false;
  if (scheduled) void runScanNow(env);
}

/**
 * Run the capture now instead of after its debounce and idle wait (a flush
 * before keeping, the draft's writes on hide). Resolves when that pass ends.
 */
export function flushPendingMediaCapture(): Promise<void> {
  if (!capture) return scanRunning ?? Promise.resolve();
  return runScanNow();
}

/**
 * Wait for this page's media writes: runs a scheduled capture at once, then
 * waits for it and every write in flight. False when `timeoutMs` passed
 * first (flushOutgoing goes on without them).
 */
export async function whenMediaWritesSettled(
  timeoutMs: number,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (scanScheduled && capture) void runScanNow();
    const pending: Promise<unknown>[] = [...capturesInFlight];
    if (scanRunning) pending.push(scanRunning);
    if (pending.length === 0) return true;
    const remaining = deadline - Date.now();
    if (remaining <= 0) return false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = await Promise.race([
      Promise.allSettled(pending).then(() => false),
      new Promise<boolean>((resolve) => {
        timer = setTimeout(() => resolve(true), remaining);
      }),
    ]);
    clearTimeout(timer);
    if (timedOut) return false;
  }
}

/**
 * Stop trusting what this page believes the store holds: after a prune or
 * a draft delete that removed media (here or, when known, in another tab).
 * Stored items are re-checked by the next capture, and the budget is
 * measured again.
 */
export function forgetStoredMedia(): void {
  touchedAt.clear();
  budget = null;
  for (const [key, entry] of entries) {
    if (entry.status === 'stored') needsVerify.add(key);
  }
  if (capture) scheduleScan();
}

/**
 * Try the items that couldn't be stored or restored again now (the chip's
 * device Retry): failed captures are captured again, and restores that
 * failed for a passing reason are run again in the same session.
 */
export function retryMissingMedia(): void {
  const again = new Map<string, DraftMediaRef>();
  let againUser: UserKey | null = null;
  for (const [key, entry] of entries) {
    if (entry.status === 'failed') entries.delete(key);
    if (entry.status === 'unrestored') {
      again.set(entry.mediaId, entry.ref);
      againUser = entry.userKey;
    }
  }
  lastError = null;
  forgetStoredMedia();
  queueStatus();
  if (capture) void runScanNow();
  const context = lastRestore;
  if (
    again.size > 0 &&
    againUser !== null &&
    context &&
    getSessionGeneration() === context.generation
  ) {
    const refs = [...again.values()];
    registerDraftMedia(refs, againUser);
    void restoreRefs(refs, againUser, context.generation, context.store);
  }
}

// ── Restore ────────────────────────────────────────────────────────────────

const refKeys = (ref: DraftMediaRef): string[] => [
  ...ref.clipIds,
  ...ref.samplerSampleIds.map(samplerBufferKey),
];

const infoOf = (ref: DraftMediaRef, userKey: UserKey): StoredInfo => ({
  mediaId: ref.mediaId,
  userKey,
  contentType: ref.contentType,
  size: ref.size,
});

/**
 * Seed the map from an opening draft's meta, synchronously and before its
 * writes resume (DraftSessionPort.apply and begin): every clip and sample
 * the meta lists maps to its media, 'restoring' until restoreDraftMedia
 * brings its buffer back. The manifest keeps listing them meanwhile, so an
 * edit made while a slow restore decodes doesn't drop the only reference to
 * the bytes. Keys whose buffer is already in memory (reopened in the same
 * page) count as stored at once. Listeners aren't told: these refs come
 * from the committed meta, so there is nothing new to write.
 */
export function registerDraftMedia(
  refs: readonly DraftMediaRef[],
  userKey: UserKey,
): void {
  for (const ref of refs) {
    const info = infoOf(ref, userKey);
    for (const key of refKeys(ref)) {
      const current = entries.get(key);
      if (
        current?.status === 'stored' &&
        current.mediaId === ref.mediaId &&
        current.userKey === userKey
      ) {
        continue;
      }
      const live = getAudioBuffer(key);
      if (live) {
        entries.set(key, { ...info, status: 'stored', buffer: live });
        if (!bufferMedia.has(live)) bufferMedia.set(live, info);
      } else {
        entries.set(key, { ...info, status: 'restoring' });
      }
    }
  }
  updateStatus();
  lastManifestSignature = manifestSignature();
}

/** True while restoreDraftMedia runs (the harness waits for it). */
export function draftMediaRestoring(): boolean {
  return activeRestores > 0;
}

async function restoreRefs(
  refs: readonly DraftMediaRef[],
  userKey: UserKey,
  generation: number,
  store: DraftStore,
): Promise<{ restored: number; missing: number }> {
  const current = () => getSessionGeneration() === generation;
  let restored = 0;
  let missing = 0;
  activeRestores += 1;
  queueStatus();
  try {
    for (const ref of refs) {
      if (!current()) break;
      const info = infoOf(ref, userKey);
      const keys = refKeys(ref);
      const needed = keys.filter((key) => !getAudioBuffer(key));
      if (needed.length === 0) continue;

      // A key of this media already playing it (reopened in this page):
      // share that buffer instead of decoding another.
      const sibling = keys.find((key) => {
        const entry = entries.get(key);
        return (
          getAudioBuffer(key) &&
          entry?.status === 'stored' &&
          entry.mediaId === ref.mediaId
        );
      });

      let buffer: AudioBuffer;
      let original: Payload | undefined;
      try {
        if (sibling) {
          buffer = getAudioBuffer(sibling)!;
          original = getOriginalAudio(sibling);
        } else {
          const record = await store.getMedia(userKey, ref.mediaId);
          if (!record) {
            throw new DraftStorageError(
              'not-found',
              'The audio is no longer stored.',
            );
          }
          const bytes = await record.blob.arrayBuffer();
          if (!current()) break;
          // decodeAudioData detaches its input: keep the bytes for uploads.
          buffer = await getDecodeContext().decodeAudioData(bytes.slice(0));
          original = {
            bytes,
            contentType: record.contentType || ref.contentType,
          };
        }
      } catch (err) {
        if (!current()) break;
        // Only a confirmed absence drops the reference. Any other failure
        // (a busy database, a decode under memory pressure) keeps it, so
        // the bytes stay protected and Retry can restore them later.
        const gone = isDraftStorageError(err) && err.kind === 'not-found';
        console.warn('[drafts] Couldn’t restore pending audio', err);
        const reason: DraftErrorKind = gone
          ? 'not-found'
          : isDraftStorageError(err)
            ? err.kind
            : 'corrupt';
        for (const key of needed) {
          const entry = entries.get(key);
          if (entry?.status === 'restoring' && entry.mediaId === ref.mediaId) {
            entries.set(
              key,
              gone
                ? { status: 'failed', buffer: null, reason, at: now() }
                : { ...info, status: 'unrestored', reason, at: now(), ref },
            );
          }
          missing += 1;
        }
        manifestMayHaveChanged();
        continue;
      }

      if (!current()) break;
      if (!bufferMedia.has(buffer)) bufferMedia.set(buffer, info);
      for (const key of needed) {
        if (getAudioBuffer(key)) continue;
        // The entry first, so the capture finds the key stored.
        entries.set(key, { ...info, status: 'stored', buffer });
        if (original)
          setOriginalAudio(key, original.bytes, original.contentType);
        setAudioBuffer(key, buffer);
        restored += 1;
      }
      manifestMayHaveChanged();
    }
  } finally {
    activeRestores -= 1;
    queueStatus();
  }
  return { restored, missing };
}

/**
 * Bring an opened draft's pending audio back: each media read and decoded
 * ONCE, and that one AudioBuffer (plus the original bytes, for the first
 * Save's upload) set on every clip and sample of it. Keys that already
 * have a buffer are left alone. Nothing is set once the session generation
 * has moved on. Counts are items (clips and samples): restored, and
 * missing (media gone, or not readable right now: those keep their
 * reference and retryMissingMedia tries them again).
 */
export async function restoreDraftMedia(
  meta: DraftMeta,
  opts: { generation: number; store: DraftStore },
): Promise<{ restored: number; missing: number }> {
  const { generation, store } = opts;
  if (getSessionGeneration() !== generation || meta.media.length === 0) {
    return { restored: 0, missing: 0 };
  }
  lastRestore = { generation, store };
  registerDraftMedia(meta.media, meta.userKey);
  return restoreRefs(meta.media, meta.userKey, generation, store);
}

// ── Tests ──────────────────────────────────────────────────────────────────

/** Forget everything this page knows (tests). */
export function resetPendingMediaForTests(): void {
  detachCapture();
  cancelScheduledScan();
  scanScheduled = false;
  entries.clear();
  touchedAt.clear();
  putsInFlight.clear();
  capturesInFlight.clear();
  manifestListeners.clear();
  pendingSeen = new Set();
  needsVerify.clear();
  scanRunning = null;
  rescan = false;
  statusQueued = false;
  activeRestores = 0;
  lastError = null;
  lastManifestSignature = '';
  lastRestore = null;
  insecureLogged = false;
  budget = null;
  budgetUserKey = null;
}
