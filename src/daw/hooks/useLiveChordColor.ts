import { useMemo } from 'react';
import { useStore } from '@/daw/store';
import {
  detectChordWithInversion,
  getChordColor,
  resolveDegreeKey,
} from '@prism/engine';

const toHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

/**
 * Given a set of active MIDI notes, detects the chord being played
 * and returns its mode-based color from the Prism color system.
 * Falls back to rootTrackColor when no chord is recognized.
 * Returns null if no root key is set.
 */
export function useLiveChordColor(activeNotes: Set<number>): string | null {
  const rootNote = useStore((s) => s.rootNote);
  const mode = useStore((s) => s.mode);
  const rootTrackColor = useStore((s) => s.rootTrackColor);
  const audioActiveNotes = useStore((s) => s.audioActiveNotes);

  // Prefer audio-detected notes when available
  const effectiveNotes = useMemo(() => {
    if (audioActiveNotes.length > 0) return new Set(audioActiveNotes);
    return activeNotes;
  }, [audioActiveNotes, activeNotes]);

  const liveColor = useMemo(() => {
    if (effectiveNotes.size < 2 || rootNote === null) return null;

    const sorted = [...effectiveNotes].sort((a, b) => a - b);
    const match = detectChordWithInversion(sorted);
    if (!match) return null;

    const degreeKey = resolveDegreeKey(match.rootPc, match.quality, rootNote);
    if (!degreeKey) return null;

    const [r, g, b] = getChordColor(degreeKey, rootNote + 48, mode);

    // White = unrecognized in CHORD_COLORS → fall back to rootTrackColor
    if (r === 255 && g === 255 && b === 255) return null;

    return toHex(r, g, b);
  }, [effectiveNotes, rootNote, mode]);

  return liveColor ?? rootTrackColor ?? null;
}
