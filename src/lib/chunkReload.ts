import { reloadAfterSaving } from './beforeReload';

// ── A part of the app that fails to load: save, then reload once ───────────
//
// After a deploy the previous build's chunks are gone, so a tab opened before
// it gets a 404 for the next part it loads lazily (a Studio view, a route).
// Vite announces it with `vite:preloadError`. The tab then reloads onto the
// new build, after the registered work is saved (beforeReload: the Studio's
// draft), once: sessionStorage remembers the reload for a minute, so a part
// that still fails after it reaches the error boundary instead of reloading
// in a loop. Offline, nothing reloads (it would show the browser's offline
// page); the boundary says what happened. Milestone 1.12a, bundle-load-16.

const GUARD_KEY = 'musicAtlas:chunkReloadAt';
const GUARD_MS = 60_000;

let pending = false;

/** True once a reload for a failed chunk is under way. */
export function chunkReloadPending(): boolean {
  return pending;
}

/**
 * Whether this tab may reload for a failed chunk now, and if so, notes it.
 * False when it already did in the last minute, or can't remember that it
 * did (no sessionStorage), so a reload can never loop.
 */
function claimReload(now: number): boolean {
  try {
    const last = Number(sessionStorage.getItem(GUARD_KEY));
    if (last > 0 && now - last < GUARD_MS) return false;
    sessionStorage.setItem(GUARD_KEY, String(now));
    return true;
  } catch {
    return false;
  }
}

/**
 * The `vite:preloadError` listener. Cancelling the event makes the failed
 * import resolve to nothing instead of throwing, so it is cancelled only
 * when the reload goes ahead; otherwise the error reaches the boundary.
 */
export function onPreloadError(event: Event): void {
  if (pending) {
    event.preventDefault();
    return;
  }
  if (navigator.onLine === false) return;
  if (!claimReload(Date.now())) return;
  pending = true;
  event.preventDefault();
  void reloadAfterSaving();
}

/** Listen for failed chunk loads for the life of the page. */
export function installChunkReload(): void {
  window.addEventListener('vite:preloadError', onPreloadError);
}

/**
 * True for an error from a lazy part that failed to load (its chunk or its
 * CSS), as browsers word it, or from an import a pending reload cancelled.
 */
export function isChunkLoadError(error: unknown): boolean {
  if (pending) return true;
  const message = error instanceof Error ? error.message : String(error);
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported|Unable to preload CSS|Failed to load module script/i.test(
    message,
  );
}
