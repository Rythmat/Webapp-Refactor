// ── The project's audio assets ─────────────────────────────────────────────
// Decoded audio, held once per recording, and the clips that play it.
//
// An asset is one recording or imported file: its decoded AudioBuffer, the
// bytes it arrived as (uploaded as they are, rather than re-encoded) and,
// once it is in the cloud, its assetId. A clip, or a Chops sample (keyed
// samplerBufferKey(sampleId)), plays an asset through a link from its id.
// Clips cut from one take (split halves, record-over remainders), pastes and
// duplicates link to the same asset, so a take is decoded, held, uploaded
// and drawn once, whatever its clips do.
//
// Assets are found three ways: by a clip's link, by assetId (a project
// reopened in this tab finds its decoded audio again instead of downloading
// it, audio-core-08, state-reload-27), and by buffer (the drafts' media
// restore, pendingMedia.ts, gives every clip of one recording the same
// AudioBuffer, which links them all to one asset).
//
// Nothing here frees audio when a clip is deleted, split or overwritten:
// undo can bring the clip back, and it must still play (audio-core-07,
// state-reload-23). What is freed, and when, is assetGc.ts's: audio no
// clip of the project or its undo history plays any more. A recording in
// the cloud (or a bundled sample) stays decoded in a small cache in case
// the project comes back; one that exists nowhere else stays until the
// drafts hold its bytes.
//
// Load status lives here too, per asset: loading, failed (with its retry),
// or nothing to load. The loader (lib/studio-assets/load-audio.ts) sets it;
// assetStatus.ts says what a clip shows.
//
// Plain module state, no store: AudioBufferStore.ts is its face for the
// rest of the editor, and it loads on pages outside the Studio too.

export type AudioAssetLoad =
  /** Being downloaded and decoded. */
  | { state: 'loading' }
  /** The last attempt failed; `retryAt` is the next automatic try (null:
   *  only a manual Retry). */
  | { state: 'failed'; attempts: number; retryAt: number | null };

export interface AudioAsset {
  readonly key: string;
  /** The cloud asset, once uploaded or when loaded from the cloud. */
  assetId: string | null;
  /** A bundled sample's public URL: it can be fetched again. */
  url: string | null;
  buffer: AudioBuffer | null;
  original: { bytes: ArrayBuffer; contentType: string } | null;
  /** Null when nothing is loading and nothing failed. */
  load: AudioAssetLoad | null;
  /** When a clip last asked for it (the cache keeps the latest). */
  lastUsed: number;
}

const assets = new Map<string, AudioAsset>();
/** Clip id (or sampler key) → the key of the asset it plays. */
const links = new Map<string, string>();
const byAssetId = new Map<string, string>();
const byUrl = new Map<string, string>();
const byBuffer = new WeakMap<AudioBuffer, string>();

let nextLocal = 0;
const now = () => Date.now();

// ── Change notifications ───────────────────────────────────────────────────
// The timeline redraws when audio lands, and the drafts' capture looks for
// new takes. Changes are batched: a project opening with many takes decodes
// them one after another, and each used to notify (and redraw the timeline)
// on its own. Every change in a frame now makes one notification. The frame
// is backed by a short timer, because a hidden tab runs no frames and the
// draft capture must still see audio that lands there.

const subscribers = new Set<() => void>();
const NOTIFY_FALLBACK_MS = 100;
let notifyFrame = 0;
let notifyTimer: ReturnType<typeof setTimeout> | null = null;

function flushChange(): void {
  if (notifyFrame) cancelAnimationFrame(notifyFrame);
  if (notifyTimer !== null) clearTimeout(notifyTimer);
  notifyFrame = 0;
  notifyTimer = null;
  for (const cb of subscribers) cb();
}

/** Tells the subscribers, once a frame, that audio or its status changed. */
export function emitAssetChange(): void {
  if (notifyTimer !== null) return;
  notifyTimer = setTimeout(flushChange, NOTIFY_FALLBACK_MS);
  if (typeof requestAnimationFrame === 'function') {
    notifyFrame = requestAnimationFrame(flushChange);
  }
}

/** Sends a batched change now, for tests that read the subscribers. */
export function flushAssetChanges(): void {
  if (notifyTimer !== null) flushChange();
}

export function subscribeAssetChanges(cb: () => void): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

// ── Assets ─────────────────────────────────────────────────────────────────

function createAsset(key: string): AudioAsset {
  const asset: AudioAsset = {
    key,
    assetId: null,
    url: null,
    buffer: null,
    original: null,
    load: null,
    lastUsed: now(),
  };
  assets.set(key, asset);
  return asset;
}

/** The asset clip (or sample key) `key` plays, if any. */
export function assetOf(key: string): AudioAsset | undefined {
  const assetKey = links.get(key);
  return assetKey === undefined ? undefined : assets.get(assetKey);
}

/** The asset of cloud asset `assetId`, if this page holds it. */
export function assetByAssetId(assetId: string): AudioAsset | undefined {
  const key = byAssetId.get(assetId);
  return key === undefined ? undefined : assets.get(key);
}

/** The asset of bundled sample `url`, if this page holds it. */
function assetByUrl(url: string): AudioAsset | undefined {
  const key = byUrl.get(url);
  return key === undefined ? undefined : assets.get(key);
}

function link(key: string, asset: AudioAsset): void {
  asset.lastUsed = now();
  if (links.get(key) === asset.key) return;
  links.set(key, asset.key);
  emitAssetChange();
}

/**
 * Links `key` to the asset of cloud asset `assetId`, made (empty, for the
 * loader to fill) when this page doesn't hold it. A clip keeps a linked
 * asset that has its audio and no assetId yet: a take whose upload stamped
 * the clip before the asset heard of it (the stamp adopts it, adoptAssetId).
 */
export function linkToAssetId(key: string, assetId: string): AudioAsset {
  const linked = assetOf(key);
  if (linked?.assetId === assetId) {
    linked.lastUsed = now();
    return linked;
  }
  if (linked && linked.assetId === null && linked.buffer) {
    adoptAssetId(key, assetId);
    return linked;
  }
  const asset =
    assetByAssetId(assetId) ??
    (() => {
      const made = createAsset(`asset:${assetId}`);
      made.assetId = assetId;
      byAssetId.set(assetId, made.key);
      return made;
    })();
  link(key, asset);
  return asset;
}

/**
 * Links `key` to the bundled sample at `url` (made empty when new). A key
 * whose asset already has the sample's audio (just dropped) keeps it, and
 * the asset learns its URL.
 */
export function linkToUrl(key: string, url: string): AudioAsset {
  const linked = assetOf(key);
  if (
    linked &&
    (linked.url === url ||
      (linked.url === null && linked.buffer && !linked.assetId))
  ) {
    linked.url = url;
    if (!byUrl.has(url)) byUrl.set(url, linked.key);
    linked.lastUsed = now();
    return linked;
  }
  const asset =
    assetByUrl(url) ??
    (() => {
      const made = createAsset(`url:${url}`);
      made.url = url;
      byUrl.set(url, made.key);
      return made;
    })();
  link(key, asset);
  return asset;
}

/**
 * Records that the asset `key` plays is cloud asset `assetId` (an upload
 * stamped it), or no longer is (null: a Save As that failed took the stamp
 * back, so the bytes are this page's alone again).
 */
export function adoptAssetId(key: string, assetId: string | null): void {
  const asset = assetOf(key);
  if (!asset || asset.assetId === assetId) return;
  if (assetId === null) {
    if (asset.assetId && byAssetId.get(asset.assetId) === asset.key) {
      byAssetId.delete(asset.assetId);
    }
    asset.assetId = null;
    return;
  }
  const other = assetByAssetId(assetId);
  if (other && other !== asset && !other.buffer) {
    // An empty asset made for the same cloud asset (a download waiting to
    // start) gives way to the one that has the audio.
    for (const [k, target] of links)
      if (target === other.key) links.set(k, asset.key);
    assets.delete(other.key);
  }
  asset.assetId = assetId;
  if (!other || !other.buffer || other === asset)
    byAssetId.set(assetId, asset.key);
}

// ── Audio ──────────────────────────────────────────────────────────────────

export function bufferOf(key: string): AudioBuffer | undefined {
  return assetOf(key)?.buffer ?? undefined;
}

/**
 * Gives `key` the decoded audio `buffer`. A buffer some asset holds
 * already (a restored recording, a paste) links `key` to that asset; one
 * landing for an asset waiting on it (a download) fills that asset; any
 * other buffer is a new recording, and `key` moves to an asset of its own
 * (the clips sharing the old one keep it).
 */
export function setBuffer(key: string, buffer: AudioBuffer): void {
  const holder = byBuffer.get(buffer);
  const owner = holder === undefined ? undefined : assets.get(holder);
  if (owner) {
    // Its asset, or the asset it was freed from coming back.
    if (owner.buffer !== buffer) {
      owner.buffer = buffer;
      owner.load = null;
      emitAssetChange();
    }
    link(key, owner);
    return;
  }
  const linked = assetOf(key);
  const asset =
    linked && !linked.buffer
      ? linked
      : createAsset(`local:${(nextLocal += 1)}`);
  asset.buffer = buffer;
  asset.load = null;
  asset.lastUsed = now();
  byBuffer.set(buffer, asset.key);
  link(key, asset);
  emitAssetChange();
}

export function originalOf(
  key: string,
): { bytes: ArrayBuffer; contentType: string } | undefined {
  return assetOf(key)?.original ?? undefined;
}

export function setOriginal(
  key: string,
  bytes: ArrayBuffer,
  contentType: string,
): void {
  const asset = assetOf(key) ?? createAsset(`local:${(nextLocal += 1)}`);
  if (!links.has(key)) link(key, asset);
  asset.original = { bytes, contentType };
  emitAssetChange();
}

/**
 * Lets `toKey` play what `fromKey` plays: the same asset. False when
 * `fromKey` plays nothing yet.
 */
export function share(fromKey: string, toKey: string): boolean {
  const asset = assetOf(fromKey);
  if (!asset || (!asset.buffer && !asset.original && !asset.assetId)) {
    return false;
  }
  link(toKey, asset);
  return true;
}

/** `key` stops playing its asset; the asset itself goes in a collection. */
export function unlink(key: string): void {
  if (links.delete(key)) emitAssetChange();
}

// ── Load status ────────────────────────────────────────────────────────────

export function setLoad(asset: AudioAsset, load: AudioAssetLoad | null): void {
  asset.load = load;
  emitAssetChange();
}

/** Fills a loading asset with its downloaded audio. */
export function fillAsset(asset: AudioAsset, buffer: AudioBuffer): void {
  if (!assets.has(asset.key)) return; // collected while it downloaded
  const holder = byBuffer.get(buffer);
  if (holder !== undefined && holder !== asset.key) return;
  asset.buffer = buffer;
  asset.load = null;
  byBuffer.set(buffer, asset.key);
  emitAssetChange();
}

/** Every asset this page holds (the loader's retries, the collection). */
export function allAssets(): IterableIterator<AudioAsset> {
  return assets.values();
}

/** Every link, clip key → asset. */
export function allLinks(): IterableIterator<[string, string]> {
  return links.entries();
}

// ── Freeing ────────────────────────────────────────────────────────────────

/** Bytes an AudioBuffer holds decoded (32-bit float per channel). */
export function decodedBytes(buffer: AudioBuffer): number {
  return buffer.length * buffer.numberOfChannels * 4;
}

/**
 * Drops `asset` altogether: its audio, its links and its indices. For an
 * asset nothing plays and nothing needs (assetGc.ts decides).
 */
export function dropAsset(asset: AudioAsset): void {
  if (!assets.delete(asset.key)) return;
  if (asset.assetId && byAssetId.get(asset.assetId) === asset.key) {
    byAssetId.delete(asset.assetId);
  }
  if (asset.url && byUrl.get(asset.url) === asset.key) byUrl.delete(asset.url);
  for (const [key, target] of links) {
    if (target === asset.key) links.delete(key);
  }
  asset.buffer = null;
  asset.original = null;
  emitAssetChange();
}

/**
 * Lets go of `asset`'s decoded audio but keeps knowing it (its assetId or
 * URL, and the links of any clip that could come back): the next clip that
 * plays it loads it again.
 */
export function releaseAudio(asset: AudioAsset): void {
  if (!asset.buffer && !asset.original) return;
  asset.buffer = null;
  asset.original = null;
  asset.load = null;
  emitAssetChange();
}

/** Forgets every asset and link (tests, and the page's own reset). */
export function clearAssets(): void {
  assets.clear();
  links.clear();
  byAssetId.clear();
  byUrl.clear();
  emitAssetChange();
}
