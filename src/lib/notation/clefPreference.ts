import { useCallback, useSyncExternalStore } from 'react';

// ── Which clef the chords are written in ───────────────────────────────────
// Device-level, like the roll/notation preference next door. It changes only
// how the notes are drawn, never the notes themselves — the same keys read in
// either clef, which is the point: reading fluency in both is worth practising
// regardless of which hand happens to play them.

export type ChordClef = 'treble' | 'bass';

const KEY = 'musicAtlas:chordClef';
const EVENT = 'chord-clef-pref-change';

export function getChordClef(): ChordClef {
  try {
    return localStorage.getItem(KEY) === 'bass' ? 'bass' : 'treble';
  } catch {
    return 'treble';
  }
}

export function setChordClef(clef: ChordClef): void {
  try {
    localStorage.setItem(KEY, clef);
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

/** The chord clef and its setter; re-renders when it changes. */
export function useChordClef(): [ChordClef, (clef: ChordClef) => void] {
  const clef = useSyncExternalStore(
    subscribe,
    getChordClef,
    () => 'treble' as const,
  );
  return [clef, useCallback((next: ChordClef) => setChordClef(next), [])];
}
