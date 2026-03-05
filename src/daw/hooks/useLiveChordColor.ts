import { useMemo } from 'react';
import { useStore } from '@/daw/store';
import {
  detectChordWithInversion,
  MODES,
  getChordColor,
  CHORD_COLORS,
} from '@prism/engine';

const toHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

function resolveDegreeAndModifier(diff: number, quality: string) {
  const ionian = MODES.ionian;
  const directIndex = ionian.indexOf(diff);
  if (directIndex >= 0) {
    return { degree: directIndex + 1, modifier: 0 as const };
  }

  const flatDegree = ionian.indexOf(diff + 1);
  const sharpDegree = ionian.indexOf(diff - 1);
  const candidates = [
    flatDegree >= 0
      ? {
          degree: flatDegree + 1,
          modifier: -1 as const,
          chordKey: `b${flatDegree + 1} ${quality}`,
        }
      : null,
    sharpDegree >= 0
      ? {
          degree: sharpDegree + 1,
          modifier: 1 as const,
          chordKey: `#${sharpDegree + 1} ${quality}`,
        }
      : null,
  ].filter(
    (
      candidate,
    ): candidate is { degree: number; modifier: -1 | 1; chordKey: string } =>
      candidate !== null,
  );

  if (candidates.length === 0) return null;
  return (
    candidates.find(
      (candidate) => CHORD_COLORS[candidate.chordKey] !== undefined,
    ) ?? candidates[0]
  );
}

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
    const resolved = resolveDegreeAndModifier(diff, quality);
    if (!resolved) return null;

    const pre =
      resolved.modifier === -1 ? 'b' : resolved.modifier === 1 ? '#' : '';
    const [r, g, b] = getChordColor(
      `${pre}${resolved.degree} ${quality}`,
      rootNote + 48,
    );

    // White = unrecognized in CHORD_COLORS → fall back to rootTrackColor
    if (r === 255 && g === 255 && b === 255) return null;

    return toHex(r, g, b);
  }, [activeNotes, rootNote]);

  return liveColor ?? rootTrackColor ?? null;
}
