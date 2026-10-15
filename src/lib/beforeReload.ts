// ── Work to finish before the page reloads ─────────────────────────────────
//
// A reload the app asks for itself (a part of the app that failed to load
// after a deploy, a "Reload editor" button) gives a module holding unsaved
// work a moment to write it first: the Studio flushes its open draft
// (milestone 1.12a). The same shape as beforeSignOut: every task runs at
// once, the run is capped (1.5 s by default), and the reload goes ahead
// whatever is still running. A reload never waits longer for a task.
//
// No imports: the app's entry loads this.

/** A task to run before a reload; it should stop when `signal` aborts. */
export type BeforeReloadTask = (signal: AbortSignal) => void | Promise<void>;

const tasks = new Set<BeforeReloadTask>();

/**
 * Run `task` before every reload the app asks for, until the returned
 * function is called. Registering the same function twice keeps one.
 */
export function registerBeforeReload(task: BeforeReloadTask): () => void {
  tasks.add(task);
  return () => {
    tasks.delete(task);
  };
}

/**
 * Run every registered task in parallel and resolve when all have finished,
 * or at `timeoutMs` with their signal aborted, whichever comes first. A task
 * that throws or rejects is logged. Never throws.
 */
export function runBeforeReload(timeoutMs = 1500): Promise<void> {
  const controller = new AbortController();
  const settled = [...tasks].map(async (task) => {
    try {
      await task(controller.signal);
    } catch (err) {
      console.error('[reload] a task before reload failed:', err);
    }
  });
  return new Promise<void>((resolve) => {
    const timer = setTimeout(
      () => {
        controller.abort();
        resolve();
      },
      Math.max(0, timeoutMs),
    );
    void Promise.all(settled).then(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}

/** Finish the registered work, then reload the page. */
export async function reloadAfterSaving(): Promise<void> {
  await runBeforeReload();
  window.location.reload();
}
