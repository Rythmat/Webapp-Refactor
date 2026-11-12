/**
 * The class does an activity together, at the teacher's pace (owner,
 * 2026-11-10). A Group Project's Studio tutorial, Globe tour or Learn lesson
 * opens in its own tab, which has no session socket of its own. So:
 *
 *   - IN: the tab reads the class's step from the session mirror in
 *     localStorage, which the student's (or teacher's) open class tab keeps
 *     current from the socket (`applySocketMessageForUser`).
 *   - OUT: the tab writes to a small outbox in localStorage ("I finished step
 *     3", or the teacher's "the class is on step 4"); the class tab, which has
 *     the socket, sends it on (`useFollowOutbox`).
 *
 * Launch params: `follow=1&session=<id>` and, for the teacher leading from
 * inside the activity, `lead=1`; for the room's screen, `watch=1`. Stashed
 * per tab, because the Studio rewrites its own URL as it boots (not in a
 * frame, which keeps its address).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  STORAGE_KEY as SESSIONS_KEY,
  type ActivityDone,
  type SessionActivity,
  type SessionState,
} from '../live/sessionsStore';

export interface FollowLaunch {
  sessionId: string;
  /**
   * The activity the tab was launched for (the launch's `activityRef`), so a
   * player that can't name its own ref in the slide's grammar still knows
   * which activity it is following.
   */
  ref?: string;
  /** The teacher, leading the class from inside the activity. */
  lead: boolean;
  /**
   * The room's screen, showing the class's step (the Group Practice slide's
   * Studio on the projector): it follows, and never reports or leads.
   */
  watch?: boolean;
}

const STASH_KEY = 'class-follow:launch:v1';
const OUTBOX_KEY = 'ma-teacher:class-follow:v1';
const isBrowser = typeof window !== 'undefined';

/** Add the follow params to an activity's href, keeping its query. */
export const appendFollowParams = (
  href: string,
  sessionId: string,
  lead = false,
  /** The activity's ref, when the href carries no launch params. */
  ref?: string,
): string => {
  const [path, existing = ''] = href.split('?');
  const search = new URLSearchParams(existing);
  search.set('follow', '1');
  search.set('session', sessionId);
  if (lead) search.set('lead', '1');
  if (ref && !search.has('activityRef')) search.set('activityRef', ref);
  return `${path}?${search.toString()}`;
};

export const readFollowParams = (search: string): FollowLaunch | null => {
  const q = new URLSearchParams(search);
  const sessionId = q.get('session');
  if (q.get('follow') !== '1' || !sessionId) return null;
  const ref = q.get('activityRef');
  const watch = q.get('watch') === '1';
  return {
    sessionId,
    lead: !watch && q.get('lead') === '1',
    ...(watch ? { watch } : {}),
    ...(ref ? { ref } : {}),
  };
};

/**
 * Framed in a page (a lesson slide's Studio): a frame shares its page's
 * sessionStorage, so it never stashes its launch there, or the teacher's own
 * tab would open its next Studio leading the class. A frame keeps its own
 * address, so it needs no stash.
 */
const isFramed = (): boolean => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

/** This tab's follow launch: from its URL on first load, then its stash. */
export const followLaunchForTab = (): FollowLaunch | null => {
  if (!isBrowser) return null;
  const fromUrl = readFollowParams(window.location.search);
  if (isFramed()) return fromUrl;
  try {
    if (fromUrl) {
      window.sessionStorage.setItem(STASH_KEY, JSON.stringify(fromUrl));
      return fromUrl;
    }
    const raw = window.sessionStorage.getItem(STASH_KEY);
    return raw ? (JSON.parse(raw) as FollowLaunch) : null;
  } catch {
    return fromUrl;
  }
};

// ── The outbox: activity tab → class tab ─────────────────────────────────

export type FollowNote =
  /** A student finished the class's step. */
  | { kind: 'done'; ref: string; step: number }
  /** The teacher, leading from inside the activity, moved the class. */
  | { kind: 'step'; ref: string; step: number; total?: number; title?: string };

interface OutboxEntry {
  id: string;
  sessionId: string;
  note: FollowNote;
}

const outboxKey = (sessionId: string) => `${OUTBOX_KEY}:${sessionId}`;

export const writeFollowNote = (sessionId: string, note: FollowNote): void => {
  if (!isBrowser) return;
  const entry: OutboxEntry = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    sessionId,
    note,
  };
  try {
    // Another tab hears this through the `storage` event.
    window.localStorage.setItem(outboxKey(sessionId), JSON.stringify(entry));
  } catch {
    // Storage full or blocked: the class tab simply doesn't hear it.
  }
};

/**
 * In the class tab (the one with the socket): pass on what the session's
 * activity tabs write. Each note is handled once.
 */
export const useFollowOutbox = (
  sessionId: string | undefined,
  onNote: (note: FollowNote) => void,
): void => {
  const handler = useRef(onNote);
  handler.current = onNote;
  useEffect(() => {
    if (!isBrowser || !sessionId) return;
    let last: string | null = null;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== outboxKey(sessionId) || !e.newValue) return;
      try {
        const entry = JSON.parse(e.newValue) as OutboxEntry;
        if (entry.id === last || entry.sessionId !== sessionId) return;
        last = entry.id;
        handler.current(entry.note);
      } catch {
        // Ignore a malformed note.
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [sessionId]);
};

// ── In the activity's tab ────────────────────────────────────────────────

interface FollowedSession {
  state: SessionState | undefined;
  done: Record<string, ActivityDone>;
}

/**
 * The session from the localStorage mirror, found by its id. Each user's
 * sessions sit under their own key, and this tab does not need to know whose:
 * the session id is enough, and no account lookup has to load first (so the
 * Studio opened on its own pulls in nothing new).
 */
const readFollowedSession = (sessionId: string): FollowedSession => {
  if (!isBrowser) return { state: undefined, done: {} };
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key?.startsWith(`${SESSIONS_KEY}:`) || key.endsWith('.bak'))
        continue;
      const raw = window.localStorage.getItem(key);
      if (!raw || !raw.includes(sessionId)) continue;
      const parsed = JSON.parse(raw) as {
        sessions?: Record<string, SessionState>;
        activityDone?: Record<string, Record<string, ActivityDone>>;
      };
      const state = parsed.sessions?.[sessionId];
      if (state) return { state, done: parsed.activityDone?.[sessionId] ?? {} };
    }
  } catch {
    // Unreadable storage: not following.
  }
  return { state: undefined, done: {} };
};

const useFollowedSession = (sessionId: string | undefined): FollowedSession => {
  const [found, setFound] = useState<FollowedSession>(() =>
    sessionId ? readFollowedSession(sessionId) : { state: undefined, done: {} },
  );
  useEffect(() => {
    if (!isBrowser || !sessionId) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith(`${SESSIONS_KEY}:`))
        setFound(readFollowedSession(sessionId));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [sessionId]);
  return found;
};

export interface ClassFollow {
  /** This tab was opened to do the activity with the class. */
  following: boolean;
  /** The teacher, leading from here. */
  leading: boolean;
  /** The class's step in THIS activity, once the teacher has set one. */
  step: number | undefined;
  activity: SessionActivity | undefined;
  /** Students finished the class's step (the teacher's tab only). */
  doneCount: number;
  /** A student finished the class's step. */
  reportDone: (step: number) => void;
  /** The teacher moved the class (leading). */
  lead: (step: number, total?: number, title?: string) => void;
}

/**
 * The class's step for the activity `ref` this tab runs. Not following (or a
 * different activity) → `following: false`, and the tab behaves as it always
 * did.
 */
export const useClassFollow = (
  /** The activity this tab runs; the launch's own by default. */
  ownRef?: string,
): ClassFollow => {
  const [launch] = useState(followLaunchForTab);
  const ref = ownRef ?? launch?.ref;
  const { state: session, done: doneMap } = useFollowedSession(
    launch?.sessionId,
  );
  const live = session && session.status !== 'ended';
  const activity =
    live && ref && session.activity?.ref === ref ? session.activity : undefined;
  const sessionId = launch?.sessionId;

  const doneCount = useMemo(() => {
    if (!sessionId || !activity) return 0;
    return Object.values(doneMap).filter(
      (d) => d.slideId === activity.slideId && d.step >= activity.step,
    ).length;
  }, [doneMap, sessionId, activity]);

  // The room's screen only watches: it never finishes or moves a step.
  const watching = Boolean(launch?.watch);
  const reportDone = useCallback(
    (step: number) => {
      if (sessionId && ref && !watching)
        writeFollowNote(sessionId, { kind: 'done', ref, step });
    },
    [sessionId, ref, watching],
  );
  const lead = useCallback(
    (step: number, total?: number, title?: string) => {
      if (!sessionId || !ref || watching) return;
      writeFollowNote(sessionId, {
        kind: 'step',
        ref,
        step,
        ...(total !== undefined ? { total } : {}),
        ...(title ? { title: title.slice(0, 120) } : {}),
      });
    },
    [sessionId, ref, watching],
  );

  return {
    following: Boolean(launch && live && ref),
    leading: Boolean(launch?.lead),
    step: activity?.step,
    activity,
    doneCount,
    reportDone,
    lead,
  };
};
