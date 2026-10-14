// ── Freeing audio nothing plays ─────────────────────────────────────────────
// Decoded audio is about 21 MB a stereo minute at 44.1 kHz, and it used to
// stay for the whole page: every project opened, every take deleted, every
// reopen of the same project (audio-core-08, state-reload-27, timeline-26).
// A 4 GB school Chromebook crashes the tab after a few audio projects.
//
// What is still wanted, by reference: every clip and Chops sample of the
// project, of its undo history (undo can bring a deleted take back, and it
// must play: audio-core-07), and the clip on the clipboard. Their assets
// stay. The rest is collected, after a project is opened in place of
// another and when the history lets go of edits:
//
// - Audio the cloud has (an assetId) or a bundled sample (a URL) can be
//   fetched again. The latest of it stays decoded, up to CACHE_BYTES, so a
//   project reopened in this tab plays at once; the rest is let go.
// - Audio that exists nowhere else (a take never uploaded) is let go only
//   once the drafts hold its bytes (pendingMedia.ts), so the project it
//   came from, kept as a draft, restores it from there. Until then it stays.
//
// Never at edit time: a delete, split or overwrite frees nothing.

import { samplerBufferKey } from '@/daw/instruments/samplerChops';
import {
  pendingMediaState,
  releaseStoredMediaBuffers,
} from '@/daw/persistence/drafts/pendingMedia';
import { onSessionGeneration } from '@/daw/session/sessionGeneration';
import { useStore, type Track } from '@/daw/store';
import {
  historyDropCount,
  historyValues,
  subscribeHistory,
} from '@/daw/store/history';
import {
  allAssets,
  allLinks,
  decodedBytes,
  dropAsset,
  type AudioAsset,
} from './assetStore';

/** Decoded audio kept for clips that may come back (a reopen). */
export const CACHE_BYTES = 128 * 1024 * 1024;
/** A local recording this new is never collected (a take landing now). */
const FRESH_MS = 30_000;
/** How long after a project switch the collection waits: the new project
 *  is in by then, and the outgoing one's takes are in its draft. */
const AFTER_SWITCH_MS = 3_000;
/** How long after the history lets go of edits. */
const AFTER_DROP_MS = 5_000;

export interface AudioReferences {
  /** Clip ids and sampler keys. */
  keys: Set<string>;
  assetIds: Set<string>;
  urls: Set<string>;
}

function addTracks(refs: AudioReferences, tracks: readonly Track[]): void {
  for (const track of tracks) {
    for (const clip of track.audioClips) {
      refs.keys.add(clip.id);
      if (clip.assetId) refs.assetIds.add(clip.assetId);
    }
    const sample = track.samplerSample;
    if (sample) {
      refs.keys.add(samplerBufferKey(sample.sampleId));
      if (sample.assetId) refs.assetIds.add(sample.assetId);
      if (sample.sourceUrl) refs.urls.add(sample.sourceUrl);
    }
  }
}

/** Everything that may play audio: the project, its history, the clipboard. */
export function audioReferences(): AudioReferences {
  const state = useStore.getState();
  const refs: AudioReferences = {
    keys: new Set(),
    assetIds: new Set(),
    urls: new Set(),
  };
  addTracks(refs, state.tracks);
  for (const tracks of historyValues('tracks')) addTracks(refs, tracks);
  const copied = state.clipboardAudioClip;
  if (copied) {
    refs.keys.add(copied.bufferId);
    if (copied.clip.assetId) refs.assetIds.add(copied.clip.assetId);
  }
  return refs;
}

/**
 * Frees the audio nothing references (see the top). Returns what it freed,
 * for tests and the dev handle.
 */
export function collectAudioGarbage(
  refs: AudioReferences = audioReferences(),
  at = Date.now(),
): { dropped: number; freedBytes: number } {
  const keysOf = new Map<string, string[]>();
  for (const [key, assetKey] of allLinks()) {
    const keys = keysOf.get(assetKey);
    if (keys) keys.push(key);
    else keysOf.set(assetKey, [key]);
  }

  const cached: AudioAsset[] = [];
  const freed: AudioAsset[] = [];
  for (const asset of allAssets()) {
    const keys = keysOf.get(asset.key) ?? [];
    const wanted =
      keys.some((key) => refs.keys.has(key)) ||
      (asset.assetId !== null && refs.assetIds.has(asset.assetId)) ||
      (asset.url !== null && refs.urls.has(asset.url));
    if (wanted) continue;
    if (asset.assetId !== null || asset.url !== null) {
      if (asset.buffer) cached.push(asset);
      else freed.push(asset);
      continue;
    }
    // Only on this device: free it once the drafts hold it.
    if (at - asset.lastUsed < FRESH_MS) continue;
    if (keys.every((key) => pendingMediaState(key) === 'stored')) {
      freed.push(asset);
    }
  }

  // The latest cloud audio stays decoded, up to the cache's size.
  cached.sort((a, b) => b.lastUsed - a.lastUsed);
  let kept = 0;
  for (const asset of cached) {
    const bytes = decodedBytes(asset.buffer!);
    if (kept + bytes <= CACHE_BYTES) kept += bytes;
    else freed.push(asset);
  }

  let freedBytes = 0;
  const releasedKeys: string[] = [];
  for (const asset of freed) {
    if (asset.buffer) freedBytes += decodedBytes(asset.buffer);
    releasedKeys.push(...(keysOf.get(asset.key) ?? []));
    dropAsset(asset);
  }
  // The drafts' capture holds the audio it stored, too.
  releaseStoredMediaBuffers(releasedKeys);
  return { dropped: freed.length, freedBytes };
}

// ── When ───────────────────────────────────────────────────────────────────

let timer: ReturnType<typeof setTimeout> | null = null;

function schedule(delay: number): void {
  if (timer !== null) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    collectAudioGarbage();
  }, delay);
}

/**
 * Collect after every project switch and whenever the undo history lets go
 * of edits; returns the stop, for the editor's unmount.
 */
export function startAudioGarbageCollection(): () => void {
  let seenDrops = historyDropCount();
  const stopSession = onSessionGeneration(() => schedule(AFTER_SWITCH_MS));
  const stopHistory = subscribeHistory(() => {
    const drops = historyDropCount();
    if (drops === seenDrops) return;
    seenDrops = drops;
    schedule(AFTER_DROP_MS);
  });
  return () => {
    stopSession();
    stopHistory();
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
}
