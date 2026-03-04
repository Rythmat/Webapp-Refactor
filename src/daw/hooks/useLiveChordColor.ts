import { useMemo } from 'react';
import { useStore } from '@/daw/store';
import { detectChordWithInversion, MODES, getChordColor, CHORD_COLORS } from '@prism/engine';

const toHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');

/**
 * Given a set of active MIDI notes, detects the chord being played
 * and returns its mode-based color from the Prism color system.
 * Falls back to rootTrackColor when no chord is recognized.
 * Returns null if no root key is set.
 */
export function useLiveChordColor(activeNotes: Set<number>): string | null {
  const rootNote = useStore((s) => s.rootNote);
  const rootTrackColor = useStore((s) => s.rootTrackColor);

  const liveColor = useMemo(() => {
    if (activeNotes.size < 2 || rootNote === null) return null;

    const sorted = [...activeNotes].sort((a, b) => a - b);
    const match = detectChordWithInversion(sorted);
    if (!match) return null;

    const { quality, rootPc } = match;

    // Degree detection using chord root pitch class
    const diff = (rootPc - rootNote + 12) % 12;
    const ionian = MODES.ionian;
    let degree = -1;
    let modifier = 0;

    for (let i = 0; i < ionian.length; i++) {
      if (ionian[i] === diff) { degree = i + 1; break; }
    }
    if (degree < 0) {
      let flatDeg = -1, sharpDeg = -1;
      for (let i = 0; i < ionian.length; i++) {
        if (ionian[i] === diff + 1 && flatDeg < 0) flatDeg = i + 1;
        if (ionian[i] === diff - 1 && sharpDeg < 0) sharpDeg = i + 1;
      }
      const flatKey = flatDeg > 0 ? `b${flatDeg} ${quality}` : '';
      const sharpKey = sharpDeg > 0 ? `#${sharpDeg} ${quality}` : '';
      if (flatKey && CHORD_COLORS[flatKey] !== undefined) {
        degree = flatDeg; modifier = -1;
      } else if (sharpKey && CHORD_COLORS[sharpKey] !== undefined) {
        degree = sharpDeg; modifier = 1;
      } else if (flatDeg > 0) {
        degree = flatDeg; modifier = -1;
      } else if (sharpDeg > 0) {
        degree = sharpDeg; modifier = 1;
      }
    }
    if (degree < 0) return null;

    const pre = modifier === -1 ? 'b' : modifier === 1 ? '#' : '';
    const [r, g, b] = getChordColor(`${pre}${degree} ${quality}`, rootNote + 48);

    // White = unrecognized in CHORD_COLORS → fall back to rootTrackColor
    if (r === 255 && g === 255 && b === 255) return null;

    return toHex(r, g, b);
  }, [activeNotes, rootNote]);

  return liveColor ?? rootTrackColor ?? null;
}
