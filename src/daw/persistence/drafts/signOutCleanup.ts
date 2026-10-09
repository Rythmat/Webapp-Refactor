import { SESSION_SCHEMA_VERSION } from '@/daw/persistence/projectDocument/codec';
import type { UserKey } from '@/lib/local-store/userScope';
import {
  readMirrors,
  removeMirror,
} from '@/lib/studio-projects/drafts/draftMirror';
import type { DraftStore } from '@/lib/studio-projects/drafts/draftStore';

// ── Before sign-out (milestone 1.4, decision E17) ──────────────────────────
//
// A shared Chromebook goes to the next student after sign-out, so the
// outgoing user's Studio storage is tidied first (AuthContext runs every
// registered task through runBeforeSignOut, capped at 1 s):
//
// 1. the open draft is flushed (a strict write of the live session);
// 2. this user's mirrors that IndexedDB already holds are removed (its
//    writeSeq is past the mirror's, or equal with the same content);
// 3. a 'sign-out' prune removes their cloud-equal drafts (and the
//    no-work drafts the prune rules allow).
//
// Unsaved drafts stay, under the user's own key, hidden from everyone
// else. A mirror IndexedDB doesn't hold yet stays too: the next boot of
// this user reconciles it. Every step stops when the signal aborts. Never
// throws. Pending owner sign-off (plan: shared-device policy).

export interface SignOutCleanupEnv {
  store: DraftStore;
  /** The outgoing user (the live draft's owner); null: nothing to tidy. */
  userKey: UserKey | null;
  /** Flush the live draft, when one is being written. */
  flush: (() => Promise<unknown>) | null;
  /** Draft ids no prune may remove: locked (any tab), active, pointer. */
  protect: () => Promise<ReadonlySet<string>>;
  signal: AbortSignal;
  storage?: Storage | null;
  /** Called when the prune deleted media (pendingMedia's forgetStoredMedia). */
  onMediaDeleted?: () => void;
}

/** Resolve with `promise`, or undefined once `signal` aborts. */
function untilAborted<T>(
  promise: Promise<T>,
  signal: AbortSignal,
): Promise<T | undefined> {
  if (signal.aborted) return Promise.resolve(undefined);
  return new Promise<T | undefined>((resolve) => {
    const onAbort = () => resolve(undefined);
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (err: unknown) => {
        console.warn('[drafts] A sign-out step failed:', err);
        signal.removeEventListener('abort', onAbort);
        resolve(undefined);
      },
    );
  });
}

/** Flush, drop the mirrors IndexedDB holds, prune cloud-equal drafts. */
export async function cleanupDraftsForSignOut(
  env: SignOutCleanupEnv,
): Promise<void> {
  const { store, userKey, flush, signal } = env;
  try {
    if (flush) await untilAborted(flush(), signal);
    if (!userKey || signal.aborted) return;

    const storage = env.storage === undefined ? undefined : env.storage;
    for (const { entry } of readMirrors(userKey, storage)) {
      if (signal.aborted) return;
      // Unreadable mirrors are the next boot's (quarantined there).
      if (!entry) continue;
      const meta = await untilAborted(store.getMeta(entry.draftId), signal);
      if (signal.aborted) return;
      if (!meta || meta.userKey !== userKey) continue;
      const held =
        meta.writeSeq > entry.writeSeq ||
        (meta.writeSeq === entry.writeSeq &&
          meta.contentHash === entry.contentHash);
      if (held) removeMirror(userKey, entry.draftId, storage);
    }

    const protect = await untilAborted(env.protect(), signal);
    if (!protect || signal.aborted) return;
    const report = await untilAborted(
      store.prune({
        userKey,
        protect,
        reason: 'sign-out',
        schemaVersion: SESSION_SCHEMA_VERSION,
      }),
      signal,
    );
    if (report && report.deletedMedia > 0) env.onMediaDeleted?.();
  } catch (err) {
    console.warn('[drafts] Tidying drafts before sign-out failed:', err);
  }
}
