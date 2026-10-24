import { useSyncExternalStore } from 'react';
import { CHORD_NOTATIONS, type ChordNotation } from './types';

// ── Chord notation preference ──────────────────────────────────────────────
// Device-level, like the custom cursor. Chord symbols are written in hybrid
// numbering until a notation is chosen — on the top-rail switcher, or on a
// lesson's Hybrid | Jazz switch — and then in that one wherever chords are
// written. The top-rail switcher only shows once it's turned on in Settings:
// a lesson's choice applies everywhere without putting it there (owner,
// 2026-10-24; it used to turn the switcher on, so one click in a lesson left
// Hybrid · Jazz · Roman in the top rail for good). Changes reach this tab
// through a custom event and other tabs through the storage event.

/** The top-rail switcher is shown (Settings ▸ Look & Feel). */
const SWITCHER_KEY = 'musicAtlas:chordNotationSwitcherShown';
/**
 * A notation was chosen, so it's the one chords are written in. The key the
 * switcher used to share with this, so a choice made before still holds.
 */
const CHOSEN_KEY = 'musicAtlas:chordNotationSwitcher';
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

/**
 * Show or hide the top-rail switcher. Turning it on writes chords in its
 * notation; turning it off goes back to hybrid, a lesson's choice included.
 */
export function setChordNotationSwitcherEnabled(enabled: boolean): void {
  write(CHOSEN_KEY, enabled ? '1' : '0');
  write(SWITCHER_KEY, enabled ? '1' : '0');
}

/** Whether a chosen notation is in effect (the switcher, or a lesson's). */
export function getChordNotationChosen(): boolean {
  return getChordNotationSwitcherEnabled() || read(CHOSEN_KEY) === '1';
}

/**
 * A lesson's Hybrid | Jazz switch: write chords in `notation` everywhere,
 * leaving the top-rail switcher as it is.
 */
export function chooseChordNotation(notation: ChordNotation): void {
  write(NOTATION_KEY, notation);
  write(CHOSEN_KEY, '1');
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
  return getChordNotationChosen() ? getSelectedChordNotation() : 'hybrid';
}

/** Call `listener` whenever the preference changes, in this tab or another. */
export function subscribeChordNotation(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (
      event.key === null ||
      event.key === SWITCHER_KEY ||
      event.key === CHOSEN_KEY ||
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
  /** The top-rail switcher is shown. */
  enabled: boolean;
  /** A chosen notation is in effect (the switcher's, or a lesson's). */
  chosen: boolean;
  notation: ChordNotation;
  setEnabled: (enabled: boolean) => void;
  setNotation: (notation: ChordNotation) => void;
} {
  const enabled = useSyncExternalStore(
    subscribeChordNotation,
    getChordNotationSwitcherEnabled,
    () => false,
  );
  const chosen = useSyncExternalStore(
    subscribeChordNotation,
    getChordNotationChosen,
    () => false,
  );
  const notation = useSyncExternalStore(
    subscribeChordNotation,
    getSelectedChordNotation,
    () => 'hybrid' as const,
  );
  return {
    enabled,
    chosen,
    notation,
    setEnabled: setChordNotationSwitcherEnabled,
    setNotation: setChordNotation,
  };
}
