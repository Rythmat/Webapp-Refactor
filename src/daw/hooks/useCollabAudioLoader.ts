// ── useCollabAudioLoader ─────────────────────────────────────────────────────
// Keeps locally-decoded audio in sync with the project's clip metadata.
//
// Recorded/imported audio clips carry only metadata in the synced doc (id,
// position, duration, and a GCS `assetId`) — the decoded AudioBuffer lives in a
// per-user, in-memory store that is NOT synced. On project open we fetch those
// buffers once, but in a live collab session a collaborator's clip can appear at
// ANY time (its `assetId` arrives over Yjs the instant their upload finishes).
//
// This hook watches the store's tracks and, whenever they change, downloads the
// bytes for any clip that has an `assetId` but no buffer yet. Without it a remote
// recording shows up as a waveform that plays back silent, because the receiver
// never had the audio data. The loader is idempotent and self-guarding, so the
// extra calls during normal editing are cheap no-ops.

import { useEffect } from 'react';
import { useStore } from '@/daw/store';
import {
  loadPendingClipAudio,
  loadPendingSamplerSamples,
} from '@/lib/studio-assets/load-audio';

export function useCollabAudioLoader(token: string | null): void {
  const tracks = useStore((s) => s.tracks);

  useEffect(() => {
    // Only walk + download when something is actually missing; the loaders
    // re-check and guard themselves, this just avoids a needless microtask.
    if (token) {
      const hasPending = tracks.some((t) =>
        t.audioClips.some((c) => c.assetId),
      );
      if (hasPending) void loadPendingClipAudio(token);
    }
    // Sampler one-shots: bundled (sourceUrl) samples load without a token,
    // uploaded ones need it — the loader sorts that out per track.
    const hasPendingSample = tracks.some(
      (t) => t.samplerSample && (t.samplerSample.sourceUrl || token),
    );
    if (hasPendingSample) void loadPendingSamplerSamples(token);
  }, [tracks, token]);
}
