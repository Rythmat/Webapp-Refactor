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

/**
 * How many staves a page holds.
 *
 * A page is a fixed number of systems, not a fixed number of pixels: the
 * chart is zoomed so that the fullest page fills the stand. Eight reads
 * comfortably on a laptop and ten is closer to a printed page; four is for a
 * beginner following along, or for eyes that want the staff big.
 *
 * A value that is no longer offered falls back to the default, so a stand
 * that remembers an old choice still opens on something readable.
 */

export const STAVES_PER_PAGE = [4, 6, 8, 10] as const;
export type StavesPerPage = (typeof STAVES_PER_PAGE)[number];

const STAVES_KEY = 'musicAtlas:setListStaves';
const STAVES_EVENT = 'setlist-staves-change';
const DEFAULT_STAVES: StavesPerPage = 8;

const asStaves = (raw: string | null): StavesPerPage => {
  const value = Number(raw);
  return (STAVES_PER_PAGE as readonly number[]).includes(value)
    ? (value as StavesPerPage)
    : DEFAULT_STAVES;
};

export function getStavesPerPage(): StavesPerPage {
  try {
    return asStaves(localStorage.getItem(STAVES_KEY));
  } catch {
    return DEFAULT_STAVES;
  }
}

export function setStavesPerPage(value: StavesPerPage): void {
  try {
    localStorage.setItem(STAVES_KEY, String(value));
  } catch {
    // Private mode or a full quota: the session still changes.
  }
  window.dispatchEvent(new CustomEvent(STAVES_EVENT));
}

function subscribeStaves(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === STAVES_KEY) listener();
  };
  window.addEventListener(STAVES_EVENT, listener);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(STAVES_EVENT, listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function useStavesPerPage(): [
  StavesPerPage,
  (value: StavesPerPage) => void,
] {
  const value = useSyncExternalStore(
    subscribeStaves,
    getStavesPerPage,
    () => DEFAULT_STAVES,
  );
  return [
    value,
    useCallback((next: StavesPerPage) => setStavesPerPage(next), []),
  ];
}
