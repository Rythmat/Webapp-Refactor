// ── Scale positions ────────────────────────────────────────────────────────
// Derived layers for the A1 major-scale and A4 pentatonic diagrams: whole and
// half steps, the two roots, a suggested finger per dot, and where the notes
// the pentatonic leaves out would sit.

import type {
  GuitarCenter,
  GuitarScalePosition,
} from '@/curriculum/data/guitar/types';
import { GUITAR_STRINGS_LOW_TO_HIGH, fretToMidi } from '@/lib/guitar/fretboard';
import type { FingerNumber, FretPosition } from '@/lib/guitar/types';

export interface ScaleStep {
  from: FretPosition;
  to: FretPosition;
  semitones: number;
  /** W = 2 frets, H = 1 fret; null for other gaps (the pentatonic's 3-fret steps). */
  size: 'W' | 'H' | null;
}

/** The step between each pair of neighbouring notes, in play order. */
export function stepSizes(playOrder: readonly FretPosition[]): ScaleStep[] {
  return playOrder.slice(1).map((to, i) => {
    const from = playOrder[i];
    const semitones = fretToMidi(to) - fretToMidi(from);
    const size = semitones === 2 ? 'W' : semitones === 1 ? 'H' : null;
    return { from, to, semitones, size };
  });
}

/** The low and high tonic: a position runs tonic to tonic. */
export function octavePairs(position: GuitarScalePosition): {
  low: FretPosition;
  high: FretPosition;
} {
  const low = position.playOrder[0];
  const high = position.playOrder[position.playOrder.length - 1];
  if (fretToMidi(high) - fretToMidi(low) !== 12) {
    throw new Error(`Position ${position.id} does not span an octave`);
  }
  return { low, high };
}

/**
 * One finger per fret. The hand's first finger sits on fret 1 when the
 * position uses an open string (so G pentatonic keeps fingers 2-3 on frets
 * 2-3), otherwise on the lowest fretted fret. Open strings get no finger, and
 * so does a fret the hand cannot reach from the anchor.
 *
 * A position five frets wide that leaves one inside fret unused (the Dorian
 * scale: frets 9, 10, 12 and 13) is played with a stretch: one finger for
 * each fret it uses, 1-4 from the lowest.
 */
export function suggestedFingers(position: GuitarScalePosition): {
  anchor: number;
  fingers: (FingerNumber | null)[];
} {
  const fretted = position.playOrder
    .filter((p) => p.fret > 0)
    .map((p) => p.fret);
  const usesOpen = fretted.length < position.playOrder.length;
  const lowest = Math.min(...fretted);
  const used = [...new Set(fretted)].sort((a, b) => a - b);
  if (!usesOpen && Math.max(...fretted) - lowest === 4 && used.length <= 4) {
    return {
      anchor: lowest,
      fingers: position.playOrder.map(
        (p) => (used.indexOf(p.fret) + 1) as FingerNumber,
      ),
    };
  }
  const anchor = usesOpen ? 1 : lowest;
  const fingers = position.playOrder.map((p) => {
    const finger = p.fret - anchor + 1;
    return p.fret > 0 && finger >= 1 && finger <= 4
      ? (finger as FingerNumber)
      : null;
  });
  return { anchor, fingers };
}

/**
 * Where the scale's other notes sit on the position's strings inside its
 * fret window (degrees 4 and 7 of the major pentatonic): the notes the
 * pentatonic skips, drawn as outlines.
 */
export function pentatonicGhosts(
  center: GuitarCenter,
  position: GuitarScalePosition,
): FretPosition[] {
  const pentatonic =
    center.pentatonics[position.id === 'pentatonic2' ? 1 : 0] ??
    center.pentatonics[0];
  const ghostPcs = center.steps
    .filter((_, i) => !pentatonic.degrees.includes((i + 1) as never))
    .map((s) => (center.tonicPc + s) % 12);
  const ghosts: FretPosition[] = [];
  for (const string of GUITAR_STRINGS_LOW_TO_HIGH) {
    if (position.unusedStrings.includes(string)) continue;
    for (let fret = position.fretStart; fret <= position.fretEnd; fret++) {
      if (ghostPcs.includes(fretToMidi({ string, fret }) % 12)) {
        ghosts.push({ string, fret });
      }
    }
  }
  return ghosts;
}
