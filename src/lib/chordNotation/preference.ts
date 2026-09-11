import { useSyncExternalStore } from 'react';
import { CHORD_NOTATIONS, type ChordNotation } from './types';

// ── Chord notation preference ──────────────────────────────────────────────
// Device-level, like the custom cursor: the switcher is off by default, and
// while it's off every chord symbol is written in hybrid numbering whatever
// notation was last picked. Changes reach this tab through a custom event and
// other tabs through the storage event.

const SWITCHER_KEY = 'musicAtlas:chordNotationSwitcher';
const NOTATION_KEY = 'musicAtlas:chordNotation';
const EVENT = 'chord-notation-pref-change';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore write failures (private mode / quota).
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** Whether the user has turned on the chord notation switcher (Settings). */
export function getChordNotationSwitcherEnabled(): boolean {
  return read(SWITCHER_KEY) === '1';
}

export function setChordNotationSwitcherEnabled(enabled: boolean): void {
  write(SWITCHER_KEY, enabled ? '1' : '0');
}

/** The notation picked on the switcher (kept while the switcher is off). */
export function getSelectedChordNotation(): ChordNotation {
  const value = read(NOTATION_KEY);
  return CHORD_NOTATIONS.find((n) => n === value) ?? 'hybrid';
}

export function setChordNotation(notation: ChordNotation): void {
  write(NOTATION_KEY, notation);
}

/** The notation chord symbols are written in right now. */
export function getChordNotation(): ChordNotation {
  return getChordNotationSwitcherEnabled()
    ? getSelectedChordNotation()
    : 'hybrid';
}

/** Call `listener` whenever the preference changes, in this tab or another. */
export function subscribeChordNotation(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (
      event.key === null ||
      event.key === SWITCHER_KEY ||
      event.key === NOTATION_KEY
    ) {
      listener();
    }
  };
  window.addEventListener(EVENT, listener);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** The notation to write chord symbols in; re-renders when it changes. */
export function useChordNotation(): ChordNotation {
  return useSyncExternalStore(
    subscribeChordNotation,
    getChordNotation,
    () => 'hybrid',
  );
}

/** The switcher's state and setters, for the switcher and its setting. */
export function useChordNotationSwitcher(): {
  enabled: boolean;
  notation: ChordNotation;
  setEnabled: (enabled: boolean) => void;
  setNotation: (notation: ChordNotation) => void;
} {
  const enabled = useSyncExternalStore(
    subscribeChordNotation,
    getChordNotationSwitcherEnabled,
    () => false,
  );
  const notation = useSyncExternalStore(
    subscribeChordNotation,
    getSelectedChordNotation,
    () => 'hybrid' as const,
  );
  return {
    enabled,
    notation,
    setEnabled: setChordNotationSwitcherEnabled,
    setNotation: setChordNotation,
  };
}
