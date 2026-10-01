import { useCallback, useSyncExternalStore } from 'react';

// ── Guitar lessons: TAB or notation ────────────────────────────────────────
// Device-level, like the roll/notation preference next door, but its own
// setting: guitar reads from TAB by default and has no piano roll, so sharing
// RollView would hand a guitar lesson the roll a piano student last chose.

export type GuitarView = 'tab' | 'notation';

const KEY = 'musicAtlas:guitarView';
const EVENT = 'guitar-view-pref-change';

export function getGuitarView(): GuitarView {
  try {
    return localStorage.getItem(KEY) === 'notation' ? 'notation' : 'tab';
  } catch {
    return 'tab';
  }
}

export function setGuitarView(view: GuitarView): void {
  try {
    localStorage.setItem(KEY, view);
  } catch {
    // Ignore write failures (private mode / quota).
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

/** The guitar view and its setter; re-renders when it changes. */
export function useGuitarView(): [GuitarView, (view: GuitarView) => void] {
  const view = useSyncExternalStore(
    subscribe,
    getGuitarView,
    () => 'tab' as const,
  );
  return [view, useCallback((next: GuitarView) => setGuitarView(next), [])];
}
