// ── useCollabAudioLoader ─────────────────────────────────────────────────────
// Keeps locally-decoded audio in sync with the project's clip metadata.
//
// Recorded/imported audio clips carry only metadata in the synced doc (id,
// position, duration, and a GCS `assetId`) — the decoded audio lives in a
// per-user, in-memory store that is NOT synced (audio/assets/assetStore.ts).
// On project open we fetch it once, but in a live collab session a
// collaborator's clip can appear at ANY time (its `assetId` arrives over Yjs
// the instant their upload finishes).
//
// This hook watches the store's tracks and, whenever they change, links each
// clip and Chops sample to its audio and fetches what isn't here yet
// (lib/studio-assets/load-audio.ts). Audio that is here, loading, or waiting
// for its retry after a failure costs a walk of the clips and no request,
// so an edit or a fader drag never fetches anything again (engine-hooks-16).
// A failed load is tried again when the browser comes back online.

import { useEffect } from 'react';
import { useStore } from '@/daw/store';
import {
  loadPendingAudio,
  retryFailedAudio,
} from '@/lib/studio-assets/load-audio';

export function useCollabAudioLoader(token: string | null): void {
  useEffect(() => {
    const load = () => void loadPendingAudio(token);
    load();
    // Follows the tracks without re-rendering the editor on every edit.
    const stop = useStore.subscribe((s) => s.tracks, load);
    window.addEventListener('online', retryFailedAudio);
    return () => {
      stop();
      window.removeEventListener('online', retryFailedAudio);
    };
  }, [token]);
}
