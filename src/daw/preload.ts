// ── Loading the editor early (milestone 1.12a) ─────────────────────────────
//
// The editor is its own chunk, fetched when /studio/editor first renders.
// These start that fetch sooner: when the app boots on an editor URL (so it
// downloads beside sign-in instead of after it), when the Studio dashboard
// is idle, and when a student points at, focuses or presses something there.
// The route's lazy() uses preloadDaw too, so every caller shares one fetch.
//
// No static imports of editor code: the app's entry (ClassroomPages) and
// the dashboard load this file, and must not load the editor with it.

/**
 * `load`, run once however often the result is asked for. A load that fails
 * is forgotten, so the next call (a retry, a later click) runs it again:
 * some browsers fetch a module that failed again, and the error boundaries
 * offer a reload for the rest. The editor's lazy parts share it (lazyPart).
 */
export function memoLoad<T>(load: () => Promise<T>): () => Promise<T> {
  let loading: Promise<T> | null = null;
  return () => {
    if (!loading) {
      const attempt = load();
      loading = attempt;
      attempt.catch(() => {
        if (loading === attempt) loading = null;
      });
    }
    return loading;
  };
}

/** The editor's chunk, fetched once (memoLoad). */
export const preloadDaw = memoLoad(() => import('@/daw/DawApp'));

/** True when the browser asks pages to spend less data (Save-Data). */
export function prefersSavingData(): boolean {
  const connection = (
    navigator as Navigator & { connection?: { saveData?: boolean } }
  ).connection;
  return connection?.saveData === true;
}

/** True on an editor URL, where the boot should fetch the editor at once. */
export function isEditorPath(pathname: string): boolean {
  return (
    pathname === '/studio/editor' || pathname.startsWith('/studio/editor/')
  );
}

/**
 * Fetch the editor once the page is idle (the Studio dashboard), unless the
 * student's browser asks to save data. Returns a cancel for an unmount.
 */
export function prefetchDawWhenIdle(timeoutMs = 4000): () => void {
  if (prefersSavingData()) return () => {};
  const warm = () => {
    preloadDaw().catch(() => {});
  };
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(warm, { timeout: timeoutMs });
    return () => window.cancelIdleCallback(id);
  }
  const timer = window.setTimeout(warm, 1500);
  return () => window.clearTimeout(timer);
}

/**
 * Fetch the editor when the student shows they may open it: a pointer over
 * or a focus on something that opens it, skipped when saving data, and a
 * press always (the click comes a moment later). True when it fetched.
 */
export function prefetchDawOnIntent(
  kind: 'hover' | 'focus' | 'press',
): boolean {
  if (kind !== 'press' && prefersSavingData()) return false;
  preloadDaw().catch(() => {});
  return true;
}
