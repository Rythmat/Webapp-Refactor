// ── Guitar modes: the seven positions of the major scale ──────────────────
// The seven six-string shapes of the major scale, one rooted on each degree
// with that root on string 6: the owner's reference sheet ("Major Scale":
// Ionian, Dorian … Locrian), finger for finger. A lesson's Overview numbers
// them from its tonic (Position 1 … 7); the Relative Modes page names them
// by mode.
//
// Each position sits as low on the neck as it can, finger 1 on fret 1 or
// above: in C, Positions 5-7 (G, A, B) are at frets 2, 4 and 7, below
// Position 1 at 7.

import { midiAt } from '@/lib/guitar/fretboard';
import { GUITAR, GUITAR_TUNING } from '@/lib/guitar/instrument';
import type { FingerNumber, GuitarStringNumber } from '@/lib/guitar/types';
import type { GuitarMode } from '../types';
import { GUITAR_MODES } from './modeNames';
import { MODE_INDEX, MODE_STEPS } from './modeTables';

/** [cell, finger]: cell 1 is the position's first fret. */
type ShapeCell = readonly [cell: number, finger: FingerNumber];

interface ModalShape {
  /** Strings 1 (high e) … 6 (low E), each low fret first. */
  strings: readonly (readonly ShapeCell[])[];
  /** The cell of the shape's root on string 6. */
  rootCell: number;
}

/** As the reference draws them: rows high e to low E. */
const SHAPES: Readonly<Record<GuitarMode, ModalShape>> = {
  ionian: {
    rootCell: 2,
    strings: [
      [
        [1, 1],
        [2, 2],
      ],
      [
        [2, 2],
        [4, 4],
      ],
      [
        [1, 1],
        [3, 3],
        [4, 4],
      ],
      [
        [1, 1],
        [3, 3],
        [4, 4],
      ],
      [
        [1, 1],
        [2, 2],
        [4, 4],
      ],
      [
        [2, 2],
        [4, 4],
      ],
    ],
  },
  dorian: {
    rootCell: 2,
    strings: [
      [[2, 1]],
      [
        [2, 1],
        [4, 3],
        [5, 4],
      ],
      [
        [1, 1],
        [2, 2],
        [4, 4],
      ],
      [
        [1, 1],
        [2, 2],
        [4, 4],
      ],
      [
        [2, 1],
        [4, 3],
      ],
      [
        [2, 2],
        [4, 3],
        [5, 4],
      ],
    ],
  },
  phrygian: {
    rootCell: 1,
    strings: [
      [[1, 1]],
      [
        [1, 1],
        [2, 2],
        [4, 4],
      ],
      [
        [1, 1],
        [3, 3],
      ],
      [
        [1, 1],
        [3, 3],
        [4, 4],
      ],
      [
        [1, 1],
        [3, 3],
        [4, 4],
      ],
      [
        [1, 1],
        [2, 2],
        [4, 4],
      ],
    ],
  },
  lydian: {
    rootCell: 2,
    strings: [
      [
        [1, 1],
        [2, 2],
      ],
      [
        [1, 1],
        [2, 2],
        [4, 4],
      ],
      [
        [1, 1],
        [3, 3],
      ],
      [
        [1, 1],
        [3, 3],
        [4, 4],
      ],
      [
        [1, 1],
        [3, 3],
        [4, 4],
      ],
      [
        [2, 2],
        [4, 4],
      ],
    ],
  },
  mixolydian: {
    rootCell: 2,
    strings: [
      [[2, 1]],
      [
        [2, 1],
        [4, 3],
        [5, 4],
      ],
      [
        [1, 1],
        [3, 3],
        [4, 4],
      ],
      [
        [1, 1],
        [2, 2],
        [4, 4],
      ],
      [
        [1, 1],
        [2, 2],
        [4, 4],
      ],
      [
        [2, 2],
        [4, 4],
      ],
    ],
  },
  aeolian: {
    rootCell: 2,
    strings: [
      [[2, 1]],
      [
        [2, 1],
        [3, 2],
        [5, 4],
      ],
      [
        [1, 1],
        [2, 2],
        [4, 4],
      ],
      [
        [2, 1],
        [4, 3],
      ],
      [
        [2, 1],
        [4, 3],
        [5, 4],
      ],
      [
        [2, 1],
        [4, 3],
        [5, 4],
      ],
    ],
  },
  locrian: {
    rootCell: 1,
    strings: [
      [[1, 1]],
      [
        [2, 2],
        [4, 4],
      ],
      [
        [1, 1],
        [3, 3],
        [4, 4],
      ],
      [
        [1, 1],
        [3, 3],
        [4, 4],
      ],
      [
        [1, 1],
        [2, 2],
        [4, 4],
      ],
      [
        [1, 1],
        [2, 2],
        [4, 4],
      ],
    ],
  },
};

/** The highest fret a position may reach: the lesson neck's last. */
export const POSITIONS_LAST_FRET = GUITAR.maxFret;

const mod12 = (n: number) => ((n % 12) + 12) % 12;
const LOW_E_PC = mod12(GUITAR_TUNING[6]);

export interface ModalPositionNote {
  string: GuitarStringNumber;
  fret: number;
  finger: FingerNumber;
  midi: number;
  /** Its degree in the scale, 1-7 from the tonic. */
  degree: number;
  /** As the scale spells it, ASCII accidentals ('Bb'). */
  name: string;
  /** The scale's tonic. */
  isTonic: boolean;
  /** The root of the shape's own mode (the reference's hollow dots). */
  isShapeRoot: boolean;
}

export interface ModalPosition {
  /** 1-7, numbered from the scale's tonic. */
  number: number;
  /** The mode whose shape it is: Position 2 of C Ionian is D Dorian's. */
  shapeMode: GuitarMode;
  /** The shape's root, spelled (ASCII). */
  rootName: string;
  /** Where finger 1 sits (cell 1). */
  firstFret: number;
  lastFret: number;
  /** String 1 first, each string low fret first. */
  notes: readonly ModalPositionNote[];
}

export interface ModalScale {
  tonicPc: number;
  mode: GuitarMode;
  /** The scale spelled from its tonic, ASCII accidentals. */
  spelling: readonly string[];
}

function lastCell(shape: ModalShape): number {
  return Math.max(...shape.strings.flat().map(([cell]) => cell));
}

/**
 * The seven positions of a diatonic scale: Position n is the shape rooted
 * on degree n of `mode`, its root on string 6. Each sits as close to the
 * nut as finger 1 can (fret 1 up, never the open strings), so every
 * position is in the first twelve frets or just past them.
 */
export function modalPositions(scale: ModalScale): ModalPosition[] {
  const steps = MODE_STEPS[scale.mode];
  const out: ModalPosition[] = [];
  for (let n = 0; n < 7; n++) {
    const shapeMode = GUITAR_MODES[(MODE_INDEX[scale.mode] + n) % 7];
    const shape = SHAPES[shapeMode];
    const rootPc = mod12(scale.tonicPc + steps[n]);
    let rootFret = mod12(rootPc - LOW_E_PC);
    if (rootFret - (shape.rootCell - 1) < 1) rootFret += 12;
    const firstFret = rootFret - (shape.rootCell - 1);

    const notes: ModalPositionNote[] = [];
    shape.strings.forEach((cells, i) => {
      const string = (i + 1) as GuitarStringNumber;
      for (const [cell, finger] of cells) {
        const fret = firstFret + cell - 1;
        const midi = midiAt(string, fret);
        const degree = steps.indexOf(mod12(midi - scale.tonicPc));
        notes.push({
          string,
          fret,
          finger,
          midi,
          degree: degree + 1,
          name: scale.spelling[degree] ?? '',
          isTonic: degree === 0,
          isShapeRoot: mod12(midi) === rootPc,
        });
      }
    });
    out.push({
      number: n + 1,
      shapeMode,
      rootName: scale.spelling[n],
      firstFret,
      lastFret: firstFret + lastCell(shape) - 1,
      notes,
    });
  }
  return out;
}

export interface FretboardScaleNote {
  string: GuitarStringNumber;
  fret: number;
  midi: number;
  degree: number;
  name: string;
}

/** Every note of the scale on the neck, open strings to the last fret. */
export function fretboardScaleNotes(scale: ModalScale): FretboardScaleNote[] {
  const steps = MODE_STEPS[scale.mode];
  const out: FretboardScaleNote[] = [];
  for (const string of [1, 2, 3, 4, 5, 6] as const) {
    for (let fret = 0; fret <= POSITIONS_LAST_FRET; fret++) {
      const midi = midiAt(string, fret);
      const degree = steps.indexOf(mod12(midi - scale.tonicPc));
      if (degree < 0) continue;
      out.push({
        string,
        fret,
        midi,
        degree: degree + 1,
        name: scale.spelling[degree],
      });
    }
  }
  return out;
}
