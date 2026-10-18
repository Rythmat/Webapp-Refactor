// ── Opening a track's menu from the keys (milestone 2.15) ──────────────────
//
// ⇧F10, the menu key or ⌥Return with focus on a track's name opens its ⋯
// menu, as they open a clip's or a section's (the 'tracks' scope's
// tracks.menu). The row owns its menu's open state, so the list's keys ask
// it here, as they ask it to rename (useTrackRename).

const menuRequests = new EventTarget();

/** Asks the row of `trackId` to open its ⋯ menu. */
export function requestTrackMenu(trackId: string): void {
  menuRequests.dispatchEvent(new CustomEvent(trackId));
}

/** Calls `open` when the row of `trackId` is asked; returns the unsubscribe. */
export function onTrackMenuRequest(
  trackId: string,
  open: () => void,
): () => void {
  menuRequests.addEventListener(trackId, open);
  return () => menuRequests.removeEventListener(trackId, open);
}
