import { getAudioBuffer, setAudioBuffer } from '@/daw/audio/AudioBufferStore';
import { audioEngine } from '@/daw/audio/AudioEngine';
import { useStore } from '@/daw/store';
import { studioAssetsApi } from './api';

// Clips whose audio bytes are currently being fetched + decoded, keyed by clip
// id. Shared across every entry point (project open AND live collab sync) so two
// callers never download the same asset twice. A clip is removed once its buffer
// lands in the AudioBufferStore (or the attempt fails).
const downloadsInFlight = new Set<string>();

// Lazily-created fallback context used only for decoding when the AudioEngine
// isn't initialised yet (e.g. opening a project before the first play). Once the
// engine is up we decode on its context to avoid spawning extra contexts.
let fallbackDecodeCtx: AudioContext | null = null;

function getDecodeContext(): AudioContext {
  if (audioEngine.getIsInitialized()) return audioEngine.getContext();
  if (!fallbackDecodeCtx) fallbackDecodeCtx = new AudioContext();
  return fallbackDecodeCtx;
}

/**
 * Fetch a signed download URL for one clip's asset, download the bytes, decode
 * into an AudioBuffer, and stash it in the AudioBufferStore keyed by the clip id.
 *
 * Idempotent and self-guarding: returns immediately if the buffer is already
 * present or a download for this clip is already in flight, so it's safe to call
 * on every store change.
 */
async function loadClipAudio(
  token: string,
  clipId: string,
  assetId: string,
): Promise<void> {
  if (getAudioBuffer(clipId) || downloadsInFlight.has(clipId)) return;
  downloadsInFlight.add(clipId);
  try {
    const { url } = await studioAssetsApi.getUrl(token, assetId);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`download ${response.status}`);
    }
    const bytes = await response.arrayBuffer();
    const buffer = await getDecodeContext().decodeAudioData(bytes);
    setAudioBuffer(clipId, buffer);
  } catch (err) {
    console.error(
      `[studio-assets] Failed to load audio for clip ${clipId} (asset ${assetId})`,
      err,
    );
  } finally {
    downloadsInFlight.delete(clipId);
  }
}

/**
 * Walk the current store's tracks and download+decode the audio for every clip
 * that has an `assetId` but no buffer in the store yet. Runs concurrently across
 * clips; per-clip failures are logged and don't block the rest.
 *
 * This is the single incremental loader used both on project open and during a
 * live collab session — when a collaborator's recorded/imported clip syncs in
 * (its `assetId` arrives over Yjs), calling this fetches the bytes so the clip
 * is audible locally instead of stranded as a waveform with no buffer.
 */
export async function loadPendingClipAudio(token: string): Promise<void> {
  const state = useStore.getState();

  const targets: Array<{ clipId: string; assetId: string }> = [];
  for (const track of state.tracks) {
    for (const clip of track.audioClips) {
      if (clip.assetId && !getAudioBuffer(clip.id)) {
        targets.push({ clipId: clip.id, assetId: clip.assetId });
      }
    }
  }

  if (targets.length === 0) return;

  await Promise.all(
    targets.map(({ clipId, assetId }) => loadClipAudio(token, clipId, assetId)),
  );
}

/**
 * Back-compat alias for the original project-open entry point. Identical to
 * loadPendingClipAudio — kept so existing callers (File → Open, boot) read
 * naturally.
 */
export const loadCloudProjectAudio = loadPendingClipAudio;
