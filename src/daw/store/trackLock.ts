import type { AllSlices } from './index';

// ── Collab track lock ───────────────────────────────────────────────────
// A module of its own, so prismSlice can share the lock rule without loading
// tracksSlice, for the sake of load order. Pages outside the Studio load
// prismSlice first, for its chord helpers (Learn's practice tracks, the song
// export, the UNISON converters). Through tracksSlice they would also load
// first everything that slice imports, and a store import anywhere in there
// would have the store built before tracksSlice had finished loading: the
// store, and those pages, would fail ('createTracksSlice is not a
// function'). The split saves no download: the build puts prismSlice,
// tracksSlice and the project registry in one chunk.

/**
 * True when a remote collaborator currently has `trackId` selected. Such a
 * track is fully read-only for the local user — every control and every
 * midi/audio edit is blocked. Outside a collab session `remoteUsers` is empty,
 * so this never restricts anything.
 */
export function isTrackLockedByRemote(
  remoteUsers: AllSlices['remoteUsers'],
  trackId: string,
): boolean {
  for (const u of remoteUsers.values()) {
    if (u.selectedTrackId === trackId) return true;
  }
  return false;
}
