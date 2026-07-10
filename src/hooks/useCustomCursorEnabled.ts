import { useCallback, useEffect, useState } from 'react';

// Whether the custom hexagon cursor is enabled. Persisted in localStorage and
// OFF by default (absent key → disabled).
const KEY = 'musicAtlas:customCursor';
const EVENT = 'custom-cursor-pref-change';

export function getCustomCursorEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setCustomCursorEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(KEY, enabled ? '1' : '0');
  } catch {
    // Ignore write failures (private mode / quota).
  }
  // Notify same-tab listeners immediately (storage event only fires cross-tab).
  window.dispatchEvent(new CustomEvent(EVENT));
}

/**
 * Reactive accessor for the custom-cursor preference. Re-renders when it changes
 * in this tab (via the custom event) or another tab (via the storage event), so
 * the toggle on the profile page and the cursor itself stay in sync.
 */
export function useCustomCursorEnabled(): [
  boolean,
  (enabled: boolean) => void,
] {
  const [enabled, setEnabled] = useState(getCustomCursorEnabled);

  useEffect(() => {
    const sync = () => setEnabled(getCustomCursorEnabled());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const set = useCallback((next: boolean) => setCustomCursorEnabled(next), []);
  return [enabled, set];
}
