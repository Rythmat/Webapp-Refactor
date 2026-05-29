import { setAudioBuffer } from '@/daw/audio/AudioBufferStore';
import { useStore } from '@/daw/store';
import { studioAssetsApi } from './api';

/**
 * Walk the current store's tracks and, for each audio clip with an assetId,
 * fetch a signed download URL, download the bytes, decode into an AudioBuffer,
 * and stash it in the AudioBufferStore keyed by the clip id.
 *
 * Runs concurrently across clips. Failures are logged per-clip — a missing
 * asset doesn't block the rest of the project from loading.
 */
export async function loadCloudProjectAudio(token: string): Promise<void> {
  const state = useStore.getState();

  const targets: Array<{ clipId: string; assetId: string }> = [];
  for (const track of state.tracks) {
    for (const clip of track.audioClips) {
      if (clip.assetId) {
        targets.push({ clipId: clip.id, assetId: clip.assetId });
      }
    }
  }

  if (targets.length === 0) return;

  // Single AudioContext for all decodes. Created lazily because constructing
  // one in some browsers requires a user gesture; this function only runs
  // post-click via the File → Open menu, so it's safe.
  const ctx = new AudioContext();

  await Promise.all(
    targets.map(async ({ clipId, assetId }) => {
      try {
        const { url } = await studioAssetsApi.getUrl(token, assetId);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`download ${response.status}`);
        }
        const bytes = await response.arrayBuffer();
        const buffer = await ctx.decodeAudioData(bytes);
        setAudioBuffer(clipId, buffer);
      } catch (err) {
        console.error(
          `[studio-assets] Failed to load audio for clip ${clipId} (asset ${assetId})`,
          err,
        );
      }
    }),
  );
}
