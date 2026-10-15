// ── Guitar modes: chord shapes ────────────────────────────────────────────
// A mode's chords are its parent major key's chords, starting from another
// degree: D Dorian plays C major's Dm, Em, F, G, Am, B° and C. So a modal
// center takes Book One's shapes from the parent key, renumbered from its own
// tonic. Book One never prints the diminished triad (the parent's 7), so that
// one shape is generated: the movable root-on-string-5 diminished triad.

import { defaultDiagramStart } from '@/lib/guitar/fretboard';
import type { GuitarFingerPlacement } from '@/lib/guitar/types';
import { GUITAR_KEY_ORDER, MAJOR_SCALE_STEPS, keyPitchClass } from '../bookOne';
import type {
  GuitarChordShape,
  GuitarKeyCenter,
  GuitarKeyName,
  GuitarMode,
  ScaleDegree,
} from '../types';
import { MODE_INDEX } from './modeTables';

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** The Book One key whose notes a mode on `tonicPc` uses (D Dorian → C). */
export function parentKeyOf(tonicPc: number, mode: GuitarMode): GuitarKeyName {
  const pc = mod12(tonicPc - MAJOR_SCALE_STEPS[MODE_INDEX[mode]]);
  const key = GUITAR_KEY_ORDER.find((k) => keyPitchClass(k) === pc);
  if (!key) throw new Error(`No book key on pitch class ${pc}`);
  return key;
}

/** The parent key's degree for a mode degree (Dorian 1 → 2, 7 → 1). */
export function parentDegreeOf(mode: GuitarMode, degree: number): ScaleDegree {
  return (((MODE_INDEX[mode] + degree - 1) % 7) + 1) as ScaleDegree;
}

/**
 * The diminished triad on `rootPc`, root on string 5: X-f-(f+1)-(f+2)-(f+1)-X
 * (B° is X-2-3-4-3-X), or X-0-1-2-1-X for A°.
 */
export function diminishedTriadShape(
  rootPc: number,
  degree: ScaleDegree,
): GuitarChordShape {
  const f = mod12(rootPc - 9); // open string 5 is A, pitch class 9
  const frets = `X-${f}-${f + 1}-${f + 2}-${f + 1}-X`;
  const fingering: GuitarFingerPlacement[] =
    f === 0
      ? [
          { finger: 1, string: 4, fret: 1 },
          { finger: 3, string: 3, fret: 2 },
          { finger: 2, string: 2, fret: 1 },
        ]
      : [
          { finger: 1, string: 5, fret: f },
          { finger: 2, string: 4, fret: f + 1 },
          { finger: 4, string: 3, fret: f + 2 },
          { finger: 3, string: 2, fret: f + 1 },
        ];
  return {
    degree,
    quality: 'dim',
    frets,
    diagramStartFret: defaultDiagramStart(frets),
    fingering,
  };
}

/** A parent shape as the mode's chord on `degree`; errata stay with the book. */
function borrow(
  shape: GuitarChordShape,
  degree: ScaleDegree,
  sourceShapeId: string,
): GuitarChordShape {
  return {
    degree,
    quality: shape.quality,
    frets: shape.frets,
    diagramStartFret: shape.diagramStartFret,
    fingering: shape.fingering,
    ...(shape.barre ? { barre: shape.barre } : {}),
    sourceShapeId,
  };
}

const DEGREES: readonly ScaleDegree[] = [1, 2, 3, 4, 5, 6, 7];

/** The mode's triads 1-7: the parent's 1-6, and a generated diminished. */
export function modeTriads(
  parent: GuitarKeyCenter,
  mode: GuitarMode,
): GuitarChordShape[] {
  return DEGREES.map((degree) => {
    const from = parentDegreeOf(mode, degree);
    if (from === 7) {
      const rootPc = mod12(keyPitchClass(parent.key) + MAJOR_SCALE_STEPS[6]);
      return diminishedTriadShape(rootPc, degree);
    }
    return borrow(
      parent.triads[from - 1],
      degree,
      `${parent.key}/triad/${from}`,
    );
  });
}

/**
 * The mode's 7th-chord page: the parent's boxes 1-7 renumbered, then box 1
 * again, so the page ends where the mode is at home.
 */
export function modeSevenths(
  parent: GuitarKeyCenter,
  mode: GuitarMode,
): GuitarChordShape[] {
  const boxes = DEGREES.map((degree) => {
    const from = parentDegreeOf(mode, degree);
    return borrow(
      parent.sevenths[from - 1],
      degree,
      `${parent.key}/seventh/${from}`,
    );
  });
  return [...boxes, boxes[0]];
}
