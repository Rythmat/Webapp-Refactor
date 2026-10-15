// ── Song chords: building a chord box ──────────────────────────────────────

import {
  GUITAR_STRINGS_LOW_TO_HIGH,
  defaultDiagramStart,
  formatShape,
} from '@/lib/guitar/fretboard';
import { barreFromFingering } from '@/lib/guitar/theory/grips';
import type {
  FingerNumber,
  GuitarFingerPlacement,
  GuitarShapeDiagram,
} from '@/lib/guitar/types';

/** One string of a grip: its fret (null = muted) and finger (null = none). */
export type GripString = readonly [number | null, FingerNumber | null];

/** Frets and fingers, string 6 first, as a diagram with its barre. */
export function shapeFromGrip(
  frets: readonly (number | null)[],
  fingers: readonly (FingerNumber | null)[],
): GuitarShapeDiagram {
  const shape = formatShape(frets);
  const fingering: GuitarFingerPlacement[] = [];
  GUITAR_STRINGS_LOW_TO_HIGH.forEach((string, i) => {
    const fret = frets[i];
    const finger = fingers[i];
    if (fret !== null && fret > 0 && finger !== null) {
      fingering.push({ finger, string, fret });
    }
  });
  const barre = barreFromFingering(fingering);
  return {
    frets: shape,
    diagramStartFret: defaultDiagramStart(shape),
    fingering,
    ...(barre ? { barre } : {}),
  };
}

/**
 * A grip written the way chord books print it, string 6 first: frets
 * 'X-3-2-0-1-0' and fingers 'X-3-2-0-1-0' (0 = open, no finger).
 */
export function shapeFromText(
  frets: string,
  fingers: string,
): GuitarShapeDiagram {
  const read = (text: string) =>
    text.split('-').map((t) => (t === 'X' ? null : Number(t)));
  return shapeFromGrip(
    read(frets),
    read(fingers).map((f) => (f ? (f as FingerNumber) : null)),
  );
}
