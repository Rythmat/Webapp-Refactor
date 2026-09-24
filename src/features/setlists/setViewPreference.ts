import { useCallback, useSyncExternalStore } from 'react';

/**
 * How a set list reads on the stand: whole pages, or one long scroll.
 *
 * Page view is the default — it is what a player turns with a pedal, and what
 * a tablet swipes. Device-level, like the app's other view preferences.
 */

export type SetViewMode = 'page' | 'scroll';

const KEY = 'musicAtlas:setListView';
const EVENT = 'setlist-view-change';

export function getSetViewMode(): SetViewMode {
  try {
    return localStorage.getItem(KEY) === 'scroll' ? 'scroll' : 'page';
  } catch {
    return 'page';
  }
}

export function setSetViewMode(mode: SetViewMode): void {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    // Private mode or a full quota: the session still switches.
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

function subscribe(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === KEY) listener();
  };
  window.addEventListener(EVENT, listener);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function useSetViewMode(): [SetViewMode, (mode: SetViewMode) => void] {
  const mode = useSyncExternalStore(
    subscribe,
    getSetViewMode,
    () => 'page' as const,
  );
  return [mode, useCallback((next: SetViewMode) => setSetViewMode(next), [])];
}
