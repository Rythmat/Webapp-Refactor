/**
 * Echo's melody contours: the owner's Melody Contour Library (0-based,
 * contourLibrary.json) and the starter set its calls are made from
 * (echoContours.json), and how a contour becomes notes in a key.
 *
 * THE ZERO POINT (the owner's rule)
 * A contour value is a scale position counted from the zero point, and the
 * zero point shifts every value, negatives included: on the 3 (position
 * 2), [-1, 0, 1] is positions 1, 2, 3. So in C major [-1, 0, 1] is B C D on
 * the 1, D E F on the 3, and F G A on the 5. (The library's own notes shift
 * only the positives; the owner overrode that.) Zero points are only the 1,
 * the 3 and the 5.
 *
 * A POSITION IN THE SCALE
 * Position p of a scale of n notes is `scale[p mod n] + 12 × floor(p / n)`
 * semitones above the 1, with the mode's scale (major, or natural minor):
 * −1 is the 7 below, 7 the 1 an octave up.
 *
 * THE PAD WINDOW
 * Every call stays inside one window of scale positions, the 5 below the 1
 * up to the 7 (−3 to 6, ten pads): the starter set is chosen so (its
 * rules are in echoContours.json). A level's calls use only the zero points
 * that keep a contour in the window, so an earlier level's contour, chosen
 * for the 1 alone, still fits at a later level's 3 or 5 or isn't put there.
 *
 * Pure, no React.
 */

import type { LiteracyMode } from '@/content/musicLiteracy/schemas';
import LIBRARY_FILE from '@/curriculum/data/echo/contourLibrary.json';
import CURATED_FILE from '@/curriculum/data/echo/echoContours.json';
import { SCALE_SEMITONES, writtenDegree } from '../musicLiteracy/pitch';
import type { WrittenNote } from '../musicLiteracy/register';
import {
  echoLevel,
  zeroPosition,
  type EchoLevelNumber,
  type EchoTier,
  type EchoZeroPoint,
} from './levels';

export type ContourTag = 'common' | 'uncommon' | 'rare';

/** A contour of the library, as the owner's CMS keeps it. */
export interface LibraryContour {
  /** Its values as the CSV writes them: "0,-1,2". Stable across imports. */
  id: string;
  noteCount: number;
  /** Scale positions from the zero point, 0-based. */
  contour: readonly number[];
  /** The library's name for its motion: "0 up down", "X up up 0". */
  shape: string;
  tier: EchoTier;
  tag: ContourTag;
}

/** How a contour moves, for choosing a varied set. */
export type ContourMotion =
  | 'rising'
  | 'falling'
  | 'arch'
  | 'valley'
  | 'wave'
  | 'repeated';

/** A contour of the starter set: the level it belongs to. */
export interface EchoContour extends LibraryContour {
  level: EchoLevelNumber;
  motion: ContourMotion;
}

/** A range of scale positions, both ends included. */
export interface PositionSpan {
  low: number;
  high: number;
}

/** Every contour of the library, in the CSV's order. */
export const CONTOUR_LIBRARY: readonly LibraryContour[] =
  LIBRARY_FILE.contours.map((c) => ({
    ...c,
    tier: c.tier as EchoTier,
    tag: c.tag as ContourTag,
  }));

const BY_ID = new Map(CONTOUR_LIBRARY.map((c) => [c.id, c]));

/** A library contour by its id. */
export const libraryContour = (id: string): LibraryContour | undefined =>
  BY_ID.get(id);

/** The window every call stays in: the 5 below the 1 (−3) up to the 7 (6). */
export const PAD_WINDOW: PositionSpan = {
  low: CURATED_FILE.padWindow.low,
  high: CURATED_FILE.padWindow.high,
};

/**
 * Rising, falling, an arch (up then down), a valley (down then up), a wave
 * (turning more than once), or, with a note repeated anywhere, repeated.
 */
export function contourMotion(values: readonly number[]): ContourMotion {
  const steps = values.slice(1).map((v, i) => Math.sign(v - values[i]));
  if (steps.includes(0)) return 'repeated';
  const turns = steps.slice(1).filter((s, i) => s !== steps[i]).length;
  if (turns === 0) return steps[0] > 0 ? 'rising' : 'falling';
  if (turns === 1) return steps[0] > 0 ? 'arch' : 'valley';
  return 'wave';
}

/**
 * The starter set, by level, each found in the library (an id the library
 * lacks is left out; the tests catch one).
 */
export const ECHO_CONTOURS: readonly EchoContour[] =
  CURATED_FILE.contours.flatMap((entry) => {
    const found = BY_ID.get(entry.id);
    return found
      ? [
          {
            ...found,
            level: entry.level as EchoLevelNumber,
            motion: contourMotion(found.contour),
          },
        ]
      : [];
  });

/** A contour's scale positions on a zero point: every value shifted. */
export const contourPositions = (
  values: readonly number[],
  zeroPoint: EchoZeroPoint,
): number[] => values.map((value) => value + zeroPosition(zeroPoint));

/** Semitones above the 1 of a scale position (see A POSITION IN THE SCALE). */
export function positionSemitones(
  position: number,
  mode: LiteracyMode,
): number {
  const scale = SCALE_SEMITONES[mode];
  const n = scale.length;
  return scale[((position % n) + n) % n] + 12 * Math.floor(position / n);
}

/** A scale position as a written note: its chromatic degree and octave. */
export const positionNote = (
  position: number,
  mode: LiteracyMode,
): WrittenNote => writtenDegree(positionSemitones(position, mode), mode);

/** Whether every note of a contour on a zero point is inside a window. */
export const fitsWindow = (
  values: readonly number[],
  zeroPoint: EchoZeroPoint,
  window: PositionSpan = PAD_WINDOW,
): boolean =>
  contourPositions(values, zeroPoint).every(
    (p) => p >= window.low && p <= window.high,
  );

/** The level's zero points that keep a contour inside the pad window. */
export const zeroPointsFor = (
  contour: Pick<LibraryContour, 'contour'>,
  level: EchoLevelNumber,
): EchoZeroPoint[] =>
  echoLevel(level).zeroPoints.filter((zp) => fitsWindow(contour.contour, zp));

/** The starter set's contours of one level alone. */
export const contoursOfLevel = (level: EchoLevelNumber): EchoContour[] =>
  ECHO_CONTOURS.filter((c) => c.level === level);

/**
 * The contours a level's calls draw on: its own and every earlier level's,
 * those with a zero point there that keeps them in the window.
 */
export const levelContours = (level: EchoLevelNumber): EchoContour[] =>
  ECHO_CONTOURS.filter(
    (c) => c.level <= level && zeroPointsFor(c, level).length > 0,
  );

/**
 * The positions a level's calls reach, lowest to highest: every contour it
 * draws on at every zero point it may take there. Level 1's is the 5 below
 * the 1 up to the 5 above; Levels 2 and 3 fill the window.
 */
export function levelSpan(level: EchoLevelNumber): PositionSpan {
  const positions = levelContours(level).flatMap((c) =>
    zeroPointsFor(c, level).flatMap((zp) => contourPositions(c.contour, zp)),
  );
  return positions.length
    ? { low: Math.min(...positions), high: Math.max(...positions) }
    : { low: 0, high: 0 };
}
