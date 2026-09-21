import { useCallback, useSyncExternalStore } from 'react';

// ── Piano roll / notation view preference ──────────────────────────────────
// Device-level, like the chord notation switcher. Learn and Studio remember
// their own choice: Studio's notation view is read-only, so turning notation
// on for lessons shouldn't take away the note editor.

export type RollView = 'roll' | 'notation';
export type RollViewScope = 'learn' | 'studio';

const KEY_PREFIX = 'musicAtlas:rollView:';
const EVENT = 'roll-view-pref-change';

export function getRollView(scope: RollViewScope): RollView {
  try {
    return localStorage.getItem(KEY_PREFIX + scope) === 'notation'
      ? 'notation'
      : 'roll';
  } catch {
    return 'roll';
  }
}

export function setRollView(scope: RollViewScope, view: RollView): void {
  try {
    localStorage.setItem(KEY_PREFIX + scope, view);
  } catch {
    // Ignore write failures (private mode / quota).
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

function subscribe(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith(KEY_PREFIX)) listener();
  };
  window.addEventListener(EVENT, listener);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** The view for `scope` and its setter; re-renders when it changes. */
export function useRollView(
  scope: RollViewScope,
): [RollView, (view: RollView) => void] {
  const view = useSyncExternalStore(
    subscribe,
    () => getRollView(scope),
    () => 'roll' as const,
  );
  const set = useCallback(
    (next: RollView) => setRollView(scope, next),
    [scope],
  );
  return [view, set];
}
