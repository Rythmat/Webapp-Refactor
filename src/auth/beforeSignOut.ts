// ── Work to finish before signing out ──────────────────────────────────────
//
// Signing out hands the device to the next person (a shared Chromebook), so a
// module holding that person's unsaved state gets a moment to settle it
// first: the Studio flushes its open draft and clears what the cloud already
// holds (milestone 1.4, E17). AuthContext runs these before signOut and
// hardLogout. Every task runs at once, side by side; the whole run is capped
// (1 s by default), after which the signal aborts and sign-out goes ahead
// whatever is still running. Sign-out never waits longer and never fails for
// a task's sake.
//
// No imports: AuthContext loads this.

/** A task to run before sign-out; it should stop when `signal` aborts. */
export type BeforeSignOutTask = (signal: AbortSignal) => void | Promise<void>;

const tasks = new Set<BeforeSignOutTask>();

/**
 * Run `task` before every sign-out, until the returned function is called.
 * Registering the same function twice keeps one.
 */
export function registerBeforeSignOut(task: BeforeSignOutTask): () => void {
  tasks.add(task);
  return () => {
    tasks.delete(task);
  };
}

/** The run in progress: a second sign-out meanwhile waits for the same one. */
let running: Promise<void> | null = null;

/**
 * Run every registered task in parallel and resolve when all have finished,
 * or at `timeoutMs` (1000) with their signal aborted, whichever comes first.
 * A task that throws or rejects is logged. Never throws. Called again while
 * a run is still going (a burst of 401s each asking for a hard logout), it
 * returns that run rather than starting another.
 */
export function runBeforeSignOut(timeoutMs = 1000): Promise<void> {
  if (running !== null) return running;
  const controller = new AbortController();
  const settled = [...tasks].map(async (task) => {
    try {
      await task(controller.signal);
    } catch (err) {
      console.error('[sign-out] a task before sign-out failed:', err);
    }
  });
  const run = new Promise<void>((resolve) => {
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
  }).finally(() => {
    if (running === run) running = null;
  });
  running = run;
  return run;
}
