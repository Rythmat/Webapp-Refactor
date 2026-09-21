import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { stopFromSearchParams, stopKey, type AtlasStop } from './atlasStop';

/**
 * The visual history of a globe session: one entry per stop the user has
 * visited, in order, with a cursor at the one on screen.
 *
 * The trail does not keep its own idea of history — it mirrors the browser's.
 * React Router stamps every history entry with an `idx`, and each trail entry
 * is keyed by it. Arriving at an idx the trail already holds (with the same
 * URL) is Back / Forward / a jump, and only moves the cursor; arriving anywhere
 * else is a new step, which drops everything after it — exactly what a browser
 * does to its forward stack when you click a link after going back. So the
 * thumbnail strip, the ◀ ▶ buttons, and the browser's own Back button can
 * never disagree about where you are.
 *
 * Held in sessionStorage for the same lifetime as the tab's history, so a
 * reload keeps the trail.
 */
export interface TrailEntry {
  /** React Router's history index for this entry. */
  idx: number;
  /** The query string that addresses the stop (era filter included). */
  search: string;
  key: string;
  stop: AtlasStop;
}

interface TrailState {
  entries: TrailEntry[];
  cursor: number | null;
}

const STORAGE_KEY = 'atlas-trail-v1';
/** Beyond this the oldest steps fall off; a session this long has moved on. */
const MAX_ENTRIES = 80;

function historyIdx(): number | null {
  const idx = (window.history.state as { idx?: unknown } | null)?.idx;
  return typeof idx === 'number' ? idx : null;
}

function load(): TrailState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { entries: [], cursor: null };
    const parsed = JSON.parse(raw) as TrailState;
    return Array.isArray(parsed.entries)
      ? parsed
      : { entries: [], cursor: null };
  } catch {
    // Private windows and blocked storage throw; the trail just starts empty.
    return { entries: [], cursor: null };
  }
}

function save(state: TrailState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable — the trail still works for this page's lifetime */
  }
}

/** Fold an arrival at (idx, search) into the trail. Pure, for testing. */
export function arrive(
  state: TrailState,
  idx: number,
  search: string,
): TrailState {
  const existing = state.entries.find((e) => e.idx === idx);
  if (existing && existing.search === search) {
    return state.cursor === idx ? state : { ...state, cursor: idx };
  }

  const stop = stopFromSearchParams(new URLSearchParams(search));
  const kept = state.entries.filter((e) => e.idx < idx);
  const entries = [...kept, { idx, search, key: stopKey(stop), stop }].slice(
    -MAX_ENTRIES,
  );
  return { entries, cursor: idx };
}

export function useAtlasTrail() {
  const location = useLocation();
  const navigate = useNavigate();
  const [state, setState] = useState<TrailState>(load);

  useEffect(() => {
    const idx = historyIdx();
    if (idx === null) return;
    setState((prev) => {
      const next = arrive(prev, idx, location.search);
      if (next !== prev) save(next);
      return next;
    });
    // location.key changes on every navigation, including a re-visit of the
    // same URL, which is what lets Back to an identical stop register.
  }, [location.key, location.search]);

  const cursorPos = useMemo(
    () => state.entries.findIndex((e) => e.idx === state.cursor),
    [state],
  );

  const jump = useCallback(
    (entry: TrailEntry) => {
      if (state.cursor === null || entry.idx === state.cursor) return;
      // Travel the real history, so the browser's Back button stays in step.
      navigate(entry.idx - state.cursor);
    },
    [navigate, state.cursor],
  );

  const back = useCallback(() => {
    if (cursorPos > 0) jump(state.entries[cursorPos - 1]);
  }, [cursorPos, jump, state.entries]);

  const forward = useCallback(() => {
    if (cursorPos >= 0 && cursorPos < state.entries.length - 1) {
      jump(state.entries[cursorPos + 1]);
    }
  }, [cursorPos, jump, state.entries]);

  const clear = useCallback(() => {
    const current = cursorPos >= 0 ? [state.entries[cursorPos]] : [];
    const next = { entries: current, cursor: state.cursor };
    save(next);
    setState(next);
  }, [cursorPos, state]);

  return {
    entries: state.entries,
    cursorPos,
    canBack: cursorPos > 0,
    canForward: cursorPos >= 0 && cursorPos < state.entries.length - 1,
    back,
    forward,
    jump,
    clear,
  };
}
