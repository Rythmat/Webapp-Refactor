// ── What a clip's audio is doing ───────────────────────────────────────────
// The tile a clip draws, and the Chops sampler's panel, say where its audio
// stands, honestly: a clip without audio used to draw a made-up waveform
// over silence, and a download that failed said "Loading…" for good
// (timeline-25, engine-hooks-16, live-input-17).

import {
  pendingMediaState,
  retryMissingMedia,
} from '@/daw/persistence/drafts/pendingMedia';
import { retryAudio } from '@/lib/studio-assets/load-audio';
import { assetByAssetId, assetOf } from './assetStore';

export type ClipAudioStatus =
  /** Decoded and playing. */
  | 'ready'
  /** Downloading, decoding, or coming back from the device's drafts. */
  | 'loading'
  /** The download (or the drafts' copy) failed: Retry. */
  | 'failed'
  /** Never uploaded, and not on this device either: it can't come back. */
  | 'missing';

/**
 * Where the audio of clip (or sampler key) `key` stands. `assetId` is the
 * clip's, `url` a bundled sample's: with either, the audio is in the cloud
 * and loads; with neither it lives on this device or nowhere.
 */
export function clipAudioStatus(
  key: string,
  assetId: string | null | undefined,
  url?: string | null,
): ClipAudioStatus {
  const asset = assetOf(key) ?? (assetId ? assetByAssetId(assetId) : undefined);
  if (asset?.buffer) return 'ready';
  if (asset?.load?.state === 'failed') return 'failed';
  if (assetId || url || asset?.load?.state === 'loading') return 'loading';
  switch (pendingMediaState(key)) {
    // On this device's drafts: a restore brings it back.
    case 'stored':
    case 'restoring':
      return 'loading';
    case 'unrestored':
      return 'failed';
    default:
      return 'missing';
  }
}

/** Retry: the download, or the restore from the device's drafts. */
export function retryClipAudio(key: string): void {
  if (pendingMediaState(key) === 'unrestored') retryMissingMedia();
  else retryAudio(key);
}
