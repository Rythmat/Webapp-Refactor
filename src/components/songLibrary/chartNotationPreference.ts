import { useCallback, useSyncExternalStore } from 'react';

/**
 * Letter chord symbols, or the hybrid numbers.
 *
 * A device-level choice for the song library's charts, in the style of the
 * chord-notation switcher in lib/chordNotation. It is deliberately separate
 * from that global Jazz/Roman/Hybrid preference: this is a two-way switch on
 * the chart in front of you (B♭maj7 ↔ 4 maj7), and the numbers come straight
 * from each chord's stored degree, so they stay right after a transposition
 * and through a mid-song key change.
 */

export type ChartNotation = 'letters' | 'numbers';

const KEY = 'musicAtlas:songChartNotation';
const EVENT = 'song-chart-notation-change';

export function getChartNotation(): ChartNotation {
  try {
    return localStorage.getItem(KEY) === 'numbers' ? 'numbers' : 'letters';
  } catch {
    return 'letters';
  }
}

export function setChartNotation(value: ChartNotation): void {
  try {
    localStorage.setItem(KEY, value);
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

export function useChartNotation(): [
  ChartNotation,
  (v: ChartNotation) => void,
] {
  const value = useSyncExternalStore(
    subscribe,
    getChartNotation,
    () => 'letters' as const,
  );
  return [
    value,
    useCallback((next: ChartNotation) => setChartNotation(next), []),
  ];
}
