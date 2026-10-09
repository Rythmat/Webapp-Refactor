import type { CollabPort, DraftSessionPort, SessionUser } from './types';

// ── What openSession reaches through (milestone 1.4) ───────────────────────
//
// openSession never imports drafts, collab, auth or the router. DawApp
// registers them here when it mounts and unregisters them when it unmounts,
// so tests drive openSession with fakes and the tracks build apart. Only one
// registration is live: a newer one replaces the one before it, whose
// unregister then does nothing (a StrictMode remount, an editor mounted
// again before the old one's cleanup ran).

export interface SessionDeps {
  /** Who is signed in; null until auth knows. */
  user(): SessionUser | null;
  token(): string | null;
  /** Whether the student may open this lesson now. */
  lessonAccess(tutorialId: string): 'open' | 'wait' | 'upgrade';
  collab: CollabPort;
  drafts: DraftSessionPort;
  /**
   * Replace or push the editor's search (on /studio/editor). A no-op unless
   * the page is on /studio/editor.
   */
  navigate(search: string, opts: { replace: boolean }): void;
  openProjectsDialog(opts?: {
    sortBy?: 'recent' | 'size';
    focusDraftId?: string;
  }): void;
}

let current: { deps: SessionDeps } | null = null;
const listeners = new Set<() => void>();

/**
 * Make `deps` the ones openSession uses. Returns the unregister, which does
 * nothing once a newer registration has replaced this one. Listeners hear
 * of both.
 */
export function registerSessionDeps(deps: SessionDeps): () => void {
  const entry = { deps };
  current = entry;
  notifySessionDepsChanged();
  return () => {
    if (current !== entry) return;
    current = null;
    notifySessionDepsChanged();
  };
}

/** The registered deps; null while no editor is mounted. */
export function getSessionDeps(): SessionDeps | null {
  return current?.deps ?? null;
}

/**
 * Tell listeners something the deps answer changed (the user or the token
 * resolved), so a waiting open checks again. A listener that throws is
 * logged and the rest still run.
 */
export function notifySessionDepsChanged(): void {
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch (err) {
      console.error('[session] a deps listener failed:', err);
    }
  }
}

/** Call `listener` on every change, until the returned function runs. */
export function onSessionDepsChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
