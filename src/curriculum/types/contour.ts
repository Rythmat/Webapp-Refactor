/**
 * Phase 2 — Melody contour types.
 *
 * Models the 690-entry Melody Contour Library (0-based scale indices).
 * Contours define WHICH notes to play, paired with phrase rhythms for WHEN.
 */

/** Contour tier: 1 = simplest/most common, 4 = most complex */
export type ContourTier = 1 | 2 | 3 | 4;

/** Shape descriptor for a contour */
export type ContourShape =
  | 'ascending'
  | 'descending'
  | 'arch'
  | 'valley'
  | 'flat'
  | 'zigzag'
  | 'common';

/**
 * A single melody contour from the Melody Contour Library.
 *
 * Values are 0-based scale indices relative to a zero_point:
 * - 0 = starting scale degree (zero_point)
 * - 1 = next scale degree up
 * - -1 = one scale degree down
 */
export interface CurriculumContour {
  /** Contour as comma-separated string (e.g. "0,1,2", "0,0,-1") */
  contourString: string;
  /** Parsed array of 0-based scale degree offsets */
  intervals: number[];
  /** Number of notes */
  noteCount: number;
  /** Difficulty/complexity tier */
  tier: ContourTier;
  /** Shape classification */
  shape: ContourShape;
  /** Musical context tag */
  musicalTag: string;
}
