import { audioEngine } from '@/daw/audio/AudioEngine';
import {
  allAssets,
  assetOf,
  fillAsset,
  linkToAssetId,
  linkToUrl,
  setLoad,
  type AudioAsset,
} from '@/daw/audio/assets/assetStore';
import { samplerBufferKey } from '@/daw/instruments/samplerChops';
import { useStore } from '@/daw/store';
import { studioAssetsApi } from './api';

// ── Loading a project's audio ──────────────────────────────────────────────
//
// Every clip with an assetId plays the audio of that cloud asset; every
// Chops sample plays its uploaded asset or its bundled URL. The loader links
// each to its asset (assets/assetStore.ts) and fetches and decodes what this
// page doesn't hold yet, once per asset however many clips play it (split
// halves used to download the same take twice).
//
// A failed fetch is tried again after 1 s, 4 s and 16 s, then waits for the
// student's Retry (or the browser coming back online). It used to be logged
// and forgotten, so every later edit fetched it again (the loader runs on
// every change of the tracks) while the clip said "Loading…" for good
// (engine-hooks-16, timeline-25, live-input-17).

/** Waits before the automatic retries; after the last, only a Retry. */
export const RETRY_DELAYS_MS: readonly number[] = [1000, 4000, 16000];

// Lazily-created fallback context used only for decoding when the AudioEngine
// isn't initialised yet (e.g. opening a project before the first play). Once the
// engine is up we decode on its context to avoid spawning extra contexts.
let fallbackDecodeCtx: AudioContext | null = null;

/**
 * The context to decode audio bytes on: the engine's once it is up, else one
 * shared fallback. Also used by the draft media restore (pendingMedia), so a
 * restored clip decodes where a cloud one would.
 */
export function getDecodeContext(): AudioContext {
  if (audioEngine.getIsInitialized()) return audioEngine.getContext();
  if (!fallbackDecodeCtx) fallbackDecodeCtx = new AudioContext();
  return fallbackDecodeCtx;
}

/** The token the last load ran with, for the automatic retries. */
let lastToken: string | null = null;
const retryTimers = new Map<string, ReturnType<typeof setTimeout>>();

function clearRetry(asset: AudioAsset): void {
  const timer = retryTimers.get(asset.key);
  if (timer !== undefined) clearTimeout(timer);
  retryTimers.delete(asset.key);
}

/** Whether `asset` should be fetched now. */
function wantsFetch(asset: AudioAsset): boolean {
  if (asset.buffer) return false;
  const load = asset.load;
  if (!load) return true;
  if (load.state === 'loading') return false;
  return load.retryAt !== null && load.retryAt <= Date.now();
}

/** Fetch `url` and decode it into `asset`, recording the outcome. */
async function fetchInto(
  asset: AudioAsset,
  url: () => Promise<string>,
): Promise<void> {
  clearRetry(asset);
  const attempts = asset.load?.state === 'failed' ? asset.load.attempts : 0;
  setLoad(asset, { state: 'loading' });
  try {
    const response = await fetch(await url());
    if (!response.ok) {
      throw new Error(`download ${response.status}`);
    }
    const bytes = await response.arrayBuffer();
    const buffer = await getDecodeContext().decodeAudioData(bytes);
    fillAsset(asset, buffer);
  } catch (err) {
    console.error(
      `[studio-assets] Failed to load audio (${asset.assetId ?? asset.url})`,
      err,
    );
    const delay = RETRY_DELAYS_MS[attempts];
    setLoad(asset, {
      state: 'failed',
      attempts: attempts + 1,
      retryAt: delay === undefined ? null : Date.now() + delay,
    });
    if (delay !== undefined) {
      retryTimers.set(
        asset.key,
        setTimeout(() => {
          retryTimers.delete(asset.key);
          void loadPendingAudio(lastToken);
        }, delay),
      );
    }
  }
}

/** Fetch the cloud asset into `asset` (needs a token). */
function fetchAsset(asset: AudioAsset, token: string): Promise<void> {
  const assetId = asset.assetId!;
  return fetchInto(asset, async () => {
    const { url } = await studioAssetsApi.getUrl(token, assetId);
    return url;
  });
}

/**
 * Link every clip and sample of the project to its audio, and fetch what
 * this page doesn't hold. Cheap when nothing is missing, so it runs on
 * every change of the tracks; a failed asset waits for its retry instead of
 * being fetched again. Without a token, uploaded audio waits for one (the
 * caller runs this again when it changes); bundled samples need none.
 */
export async function loadPendingAudio(token: string | null): Promise<void> {
  if (token) lastToken = token;
  const jobs: Array<Promise<void>> = [];
  const started = new Set<AudioAsset>();
  const fetchOnce = (asset: AudioAsset, start: () => Promise<void>) => {
    if (started.has(asset) || !wantsFetch(asset)) return;
    started.add(asset);
    jobs.push(start());
  };

  for (const track of useStore.getState().tracks) {
    for (const clip of track.audioClips) {
      if (!clip.assetId) continue;
      const asset = linkToAssetId(clip.id, clip.assetId);
      if (token) fetchOnce(asset, () => fetchAsset(asset, token));
    }
    const sample = track.samplerSample;
    if (!sample) continue;
    const key = samplerBufferKey(sample.sampleId);
    if (sample.sourceUrl) {
      const asset = linkToUrl(key, sample.sourceUrl);
      const url = sample.sourceUrl;
      fetchOnce(asset, () => fetchInto(asset, async () => url));
    } else if (sample.assetId) {
      const asset = linkToAssetId(key, sample.assetId);
      if (token) fetchOnce(asset, () => fetchAsset(asset, token));
    }
  }

  if (jobs.length > 0) await Promise.all(jobs);
}

/**
 * Try the asset clip (or sample key) `key` plays again now: the tile's or
 * the sampler's Retry, after the automatic retries ran out.
 */
export function retryAudio(key: string): void {
  const asset = assetOf(key);
  if (asset?.load?.state === 'failed') {
    setLoad(asset, { state: 'failed', attempts: 0, retryAt: Date.now() });
  }
  void loadPendingAudio(lastToken);
}

/** Retry every failed asset now (the browser came back online). */
export function retryFailedAudio(): void {
  for (const asset of allAssets()) {
    if (asset.load?.state === 'failed') {
      setLoad(asset, { state: 'failed', attempts: 0, retryAt: Date.now() });
    }
  }
  void loadPendingAudio(lastToken);
}
