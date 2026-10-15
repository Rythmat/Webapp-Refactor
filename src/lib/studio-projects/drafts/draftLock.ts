import type { DraftLock } from './types';

export type { DraftLock } from './types';

// ── One tab per draft (milestone 1.4, decision E4) ─────────────────────────
//
// A tab that opens a draft holds the Web Lock 'ma-studio-draft:<id>' for as
// long as the draft is its session. A second tab that wants the same draft
// doesn't get the lock and forks a copy instead; nothing ever steals one.
// The browser releases a tab's locks when it closes, reloads or crashes.
//
// At boot a tab waits a little (1500 ms) for the lock, because a reload's
// old document can still hold it for a few milliseconds after the new one
// starts; later opens ask once (ifAvailable). Without navigator.locks (old
// Safari) the handle says held: false and the tab proceeds: writeSeq's
// compare-and-set then turns a second writer into a fork.
//
// Two browser rules shape the code (checked in Chromium, critic2's
// locks-probe):
// - `ifAvailable` and `signal` can't be used together (NotSupportedError),
//   so an ifAvailable request checks the caller's signal first and passes
//   none;
// - a request whose signal aborts rejects with the signal's reason, so the
//   boot wait's own timeout is told apart from the caller's abort (an open
//   superseded or cancelled) by which one fired, never by the error's name.
//   A timeout means "held elsewhere" (null: fork); the caller's abort
//   rethrows, so the open resolves 'cancelled' or 'superseded' and doesn't
//   fork.
//
// The lock manager is resolved through an injectable getter: Node 24 (the
// tests' default environment) has a real, process-wide navigator.locks, and
// a lock leaked by one test file would stall the next in the same worker.
// Tests pass `locks` (a fake, or null for none) or set the default getter.
//
// No store, codec or React imports: the Studio dashboard loads this.

/** Every draft lock's name: this, then the draft id. */
export const DRAFT_LOCK_PREFIX = 'ma-studio-draft:';
/** The lock legacy imports run under, so two tabs booting together import once. */
export const IMPORT_LOCK = 'ma-studio:import';
/** How long a boot waits for a draft's lock before forking. */
export const BOOT_LOCK_WAIT_MS = 1500;
/** How long an import waits for IMPORT_LOCK before running anyway. */
export const IMPORT_LOCK_WAIT_MS = 10_000;

/** The page's navigator.locks, or null where there is none. */
function navigatorLocks(): LockManager | null {
  try {
    if (typeof navigator === 'undefined') return null;
    const locks = (navigator as { locks?: LockManager }).locks;
    return locks && typeof locks.request === 'function' ? locks : null;
  } catch {
    return null;
  }
}

let defaultLocks: () => LockManager | null = navigatorLocks;

/**
 * Replace the lock manager used when a call passes no `locks` (tests; null
 * restores navigator.locks). Returns a function that puts the previous one
 * back.
 */
export function setDefaultLockManager(
  getter: (() => LockManager | null) | null,
): () => void {
  const previous = defaultLocks;
  defaultLocks = getter ?? navigatorLocks;
  return () => {
    defaultLocks = previous;
  };
}

/** `locks` when given (null = none), else the default getter's. */
function resolveLocks(
  locks: LockManager | null | undefined,
): LockManager | null {
  if (locks !== undefined) return locks;
  try {
    return defaultLocks();
  } catch {
    return null;
  }
}

/** The error an aborted signal stands for (its reason, else an AbortError). */
function abortReason(signal: AbortSignal): unknown {
  return (
    signal.reason ?? new DOMException('The open was aborted.', 'AbortError')
  );
}

/** A handle for a draft opened without a lock manager. */
function unlockedHandle(draftId: string): DraftLock {
  return { draftId, held: false, release: () => {} };
}

/**
 * Take the draft's lock. `waitMs` 0 asks once (ifAvailable); above 0 waits
 * up to that long. Resolves the held lock, null when another tab holds it
 * (or still held it when the wait ran out), or a held:false handle without
 * navigator.locks or when the lock manager fails otherwise (SecurityError,
 * InvalidStateError: the tab proceeds, as E4 says, on compare-and-set).
 * Rejects with the signal's reason when the caller's `signal` aborts (before
 * or during the wait); never forks on an abort.
 */
export function acquireDraftLock(
  draftId: string,
  opts: { waitMs: number; signal?: AbortSignal; locks?: LockManager | null },
): Promise<DraftLock | null> {
  const manager = resolveLocks(opts.locks);
  if (!manager) return Promise.resolve(unlockedHandle(draftId));
  const { signal } = opts;
  if (signal?.aborted) return Promise.reject(abortReason(signal));
  const name = DRAFT_LOCK_PREFIX + draftId;

  return new Promise<DraftLock | null>((resolve, reject) => {
    let releaseHeld: () => void = () => {};
    const held = new Promise<void>((done) => {
      releaseHeld = done;
    });
    let settled = false;
    let cleanup = () => {};
    const settle = (outcome: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      outcome();
    };

    const granted = (lock: Lock | null): Promise<void> | void => {
      if (!lock) {
        settle(() => resolve(null));
        return;
      }
      let released = false;
      const handle: DraftLock = {
        draftId,
        held: true,
        release: () => {
          if (released) return;
          released = true;
          releaseHeld();
        },
      };
      if (settled) {
        // Granted after the caller gave up (cannot happen with a signal,
        // which aborts the request; kept as a guard): don't hold it.
        handle.release();
      } else {
        settle(() => resolve(handle));
      }
      return held;
    };

    const failed = (caught: unknown, timedOut: () => boolean) => {
      if (signal?.aborted) settle(() => reject(abortReason(signal)));
      else if (timedOut()) settle(() => resolve(null));
      else {
        // The lock API is there but unusable (an opaque or sandboxed origin,
        // a document no longer fully active): proceed as without
        // navigator.locks, and let writeSeq's compare-and-set guard it.
        console.warn(
          '[drafts] The draft lock is unavailable; going on without it:',
          caught,
        );
        settle(() => resolve(unlockedHandle(draftId)));
      }
    };

    if (opts.waitMs <= 0) {
      // ifAvailable can't carry a signal; the caller's was checked above.
      manager
        .request(name, { ifAvailable: true }, granted)
        .catch((caught: unknown) => failed(caught, () => false));
      return;
    }

    // The wait: our own timeout plus the caller's abort, on one signal.
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort(
        new DOMException('The draft is open in another tab.', 'TimeoutError'),
      );
    }, opts.waitMs);
    const onAbort = () =>
      controller.abort(signal ? abortReason(signal) : undefined);
    signal?.addEventListener('abort', onAbort, { once: true });
    cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    };
    manager
      .request(name, { signal: controller.signal }, granted)
      .catch((caught: unknown) => failed(caught, () => timedOut));
  });
}

/** The draft ids whose lock is held now, by any tab of this origin (this one included). */
export async function lockedDraftIds(
  opts: { locks?: LockManager | null } = {},
): Promise<Set<string>> {
  const manager = resolveLocks(opts.locks);
  const ids = new Set<string>();
  if (!manager || typeof manager.query !== 'function') return ids;
  try {
    const snapshot = await manager.query();
    for (const lock of snapshot.held ?? []) {
      const name = lock.name;
      if (typeof name === 'string' && name.startsWith(DRAFT_LOCK_PREFIX)) {
        const id = name.slice(DRAFT_LOCK_PREFIX.length);
        if (id !== '') ids.add(id);
      }
    }
  } catch (err) {
    console.warn('[drafts] Listing draft locks failed:', err);
  }
  return ids;
}

/**
 * Run `fn` holding IMPORT_LOCK, so two tabs booting together import once.
 * After IMPORT_LOCK_WAIT_MS (a tab stuck holding it), or without
 * navigator.locks, or when the lock can't be asked for at all, `fn` runs
 * anyway: the import ledger and the store's compare-and-set keep that safe
 * (the worst case is a duplicate draft). `fn`'s own rejection passes
 * through.
 */
export async function withImportLock<T>(
  fn: () => Promise<T>,
  opts: { locks?: LockManager | null; waitMs?: number } = {},
): Promise<T> {
  const manager = resolveLocks(opts.locks);
  if (!manager) return fn();
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort(
      new DOMException('The import lock is held too long.', 'TimeoutError'),
    );
  }, opts.waitMs ?? IMPORT_LOCK_WAIT_MS);
  let ran = false;
  try {
    return await manager.request(
      IMPORT_LOCK,
      { signal: controller.signal },
      () => {
        ran = true;
        clearTimeout(timer);
        return fn();
      },
    );
  } catch (caught) {
    if (ran) throw caught;
    if (!timedOut) {
      console.warn(
        '[drafts] The import lock is unavailable; importing anyway:',
        caught,
      );
    }
    return fn();
  } finally {
    clearTimeout(timer);
  }
}
