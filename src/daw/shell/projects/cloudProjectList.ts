import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getSessionDeps,
  onSessionDepsChanged,
} from '@/daw/session/sessionDeps';
import type { UserKey } from '@/lib/local-store/userScope';
import {
  studioProjectsApi,
  type StudioProjectSummary,
} from '@/lib/studio-projects/projectsClient';

// ── The account's projects, for the Projects dialog (milestone 1.4) ────────
//
// Fetched each time the dialog opens, with the list from the last fetch
// shown at once meanwhile. The cache is keyed by the user's key, so a shared
// device never shows one person the list of the person before. A save or a
// delete elsewhere in the editor ('ma-studio-project-saved' and
// '-deleted') refetches while the dialog is open, and drops the cached copy
// while it is closed. No fetch on editor mount: only an open dialog asks.

export type CloudListStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface CloudProjectList {
  /** null: nothing loaded for this user yet (never proof of deletion). */
  list: StudioProjectSummary[] | null;
  /**
   * 'ready' only after this opening's fetch for the current user answered;
   * a cached list shown meanwhile reads 'loading' (or 'error').
   */
  status: CloudListStatus;
  /** Whether a token is there to ask with (the same read the fetch uses). */
  signedIn: boolean;
  refresh(): void;
}

export const PROJECT_SAVED_EVENT = 'ma-studio-project-saved';
export const PROJECT_DELETED_EVENT = 'ma-studio-project-deleted';

const cache = new Map<UserKey, StudioProjectSummary[]>();

/** The cached list for `userKey`, if any. */
export function cachedCloudProjects(
  userKey: UserKey | null,
): StudioProjectSummary[] | null {
  return userKey === null ? null : (cache.get(userKey) ?? null);
}

/** Forget every cached list (sign-out, tests). */
export function clearCloudProjectCache(): void {
  cache.clear();
}

/** Newest first, as the dashboard lists them. */
function newestFirst(list: StudioProjectSummary[]): StudioProjectSummary[] {
  const time = (p: StudioProjectSummary) => {
    const value = p.updatedAt as Date | string | null | undefined;
    const ms =
      value instanceof Date
        ? value.getTime()
        : typeof value === 'string'
          ? Date.parse(value)
          : NaN;
    return Number.isFinite(ms) ? ms : 0;
  };
  return [...list].sort((a, b) => time(b) - time(a));
}

interface Who {
  userKey: UserKey | null;
  token: string | null;
}

function currentWho(): Who {
  const deps = getSessionDeps();
  return {
    userKey: deps?.user()?.userKey ?? null,
    token: deps?.token() ?? null,
  };
}

/**
 * The signed-in user's cloud projects while `open`: the cached list at
 * once, then a fresh fetch. Signed out (no token), the list stays null and
 * the status 'idle'. Closing resets the status, so 'ready' always means this
 * opening's fetch; the list is checked against the user asking at every
 * render, so a change of user never shows the previous user's list.
 */
export function useCloudProjectList(open: boolean): CloudProjectList {
  const [who, setWho] = useState<Who>(currentWho);
  // The list and status with the user they belong to.
  const [held, setHeld] = useState<{
    userKey: UserKey | null;
    list: StudioProjectSummary[] | null;
    status: CloudListStatus;
  }>(() => ({
    userKey: who.userKey,
    list: cachedCloudProjects(who.userKey),
    status: 'idle',
  }));
  const [nonce, setNonce] = useState(0);
  const latest = useRef(0);

  // Who is asking: read on each opening, and again whenever the editor says
  // the user or the token changed while the dialog is open.
  useEffect(() => {
    if (!open) {
      // A closed dialog's list is a cache: never 'ready' on the next opening.
      latest.current += 1;
      setHeld((prev) =>
        prev.status === 'idle' ? prev : { ...prev, status: 'idle' },
      );
      return;
    }
    const sync = () => {
      const next = currentWho();
      setWho((prev) =>
        prev.userKey === next.userKey && prev.token === next.token
          ? prev
          : next,
      );
    };
    sync();
    return onSessionDepsChanged(sync);
  }, [open, nonce]);

  useEffect(() => {
    if (!open) return;
    const { userKey, token } = who;
    if (userKey === null || token === null) {
      setHeld({ userKey, list: cachedCloudProjects(userKey), status: 'idle' });
      return;
    }
    const request = ++latest.current;
    const controller = new AbortController();
    setHeld({
      userKey,
      list: cachedCloudProjects(userKey),
      status: 'loading',
    });
    studioProjectsApi
      .list(token, { signal: controller.signal })
      .then((result) => {
        if (request !== latest.current) return;
        const sorted = newestFirst(Array.isArray(result) ? result : []);
        cache.set(userKey, sorted);
        setHeld({ userKey, list: sorted, status: 'ready' });
      })
      .catch((err: unknown) => {
        if (request !== latest.current || controller.signal.aborted) return;
        console.warn('[projects] The account list could not load:', err);
        setHeld((prev) =>
          prev.userKey === userKey ? { ...prev, status: 'error' } : prev,
        );
      });
    return () => controller.abort();
  }, [open, who, nonce]);

  // A save or a delete elsewhere: refetch while open, else drop the cache.
  useEffect(() => {
    const onChange = () => {
      if (open) {
        setNonce((n) => n + 1);
        return;
      }
      const { userKey } = currentWho();
      if (userKey !== null) cache.delete(userKey);
    };
    window.addEventListener(PROJECT_SAVED_EVENT, onChange);
    window.addEventListener(PROJECT_DELETED_EVENT, onChange);
    return () => {
      window.removeEventListener(PROJECT_SAVED_EVENT, onChange);
      window.removeEventListener(PROJECT_DELETED_EVENT, onChange);
    };
  }, [open]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);
  // Checked against the user asking now, not the last one the effects saw.
  const asking = currentWho();
  const mine = held.userKey === asking.userKey && held.userKey === who.userKey;
  return {
    list: mine ? held.list : null,
    status: mine ? held.status : open ? 'loading' : 'idle',
    signedIn: asking.userKey !== null && asking.token !== null,
    refresh,
  };
}
