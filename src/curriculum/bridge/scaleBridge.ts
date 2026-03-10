/**
 * Phase 3 — Scale bridge utilities.
 *
 * Parses curriculum scale strings (e.g. "major_pentatonic = [0, 2, 4, 7, 9]")
 * into typed objects, and validates against the engine's ALL_MODES.
 */

import { ALL_MODES } from '@prism/engine';
import type { ScaleDefinition } from '../types/curriculum';

/**
 * Known curriculum scale names → engine mode names.
 * Curriculum uses snake_case, engine uses camelCase.
 */
const CURRICULUM_TO_ENGINE_SCALE: Record<string, string> = {
  // Direct matches (curriculum snake_case → engine camelCase)
  ionian: 'ionian',
  dorian: 'dorian',
  phrygian: 'phrygian',
  lydian: 'lydian',
  mixolydian: 'mixolydian',
  aeolian: 'aeolian',
  locrian: 'locrian',
  melodic_minor: 'melodicMinor',
  harmonic_minor: 'harmonicMinor',
  harmonic_major: 'harmonicMajor',
  double_harmonic_major: 'doubleHarmonicMajor',

  // Scales to be added in Phase 6C
  major_pentatonic: 'pentatonicMajor',
  minor_pentatonic: 'pentatonicMinor',
  blues: 'blues',
  minor_blues: 'blues', // alias — same scale
  major_blues: 'majorBlues',
  altered_dominant: 'alteredDominant',
  lydian_dominant: 'lydianDominant',
  bebop_dominant: 'bebopDominant',
  whole_tone: 'wholeTone',
  half_whole_diminished: 'halfWholeDiminished',
  half_whole_dim: 'halfWholeDiminished', // alias used in GCM
  whole_half_diminished: 'wholeHalfDiminished',
  phrygian_dominant: 'phrygianDominant',
};

/**
 * Parse a curriculum scale string into a ScaleDefinition.
 *
 * Accepts formats:
 * - "major_pentatonic = [0, 2, 4, 7, 9]"
 * - "dorian"  (name only — looks up intervals from engine)
 * - "[0, 2, 4, 7, 9]"  (intervals only — name defaults to 'custom')
 */
export function parseScaleString(scaleStr: string): ScaleDefinition {
  const trimmed = scaleStr.trim();

  // Format: "name = [intervals]"
  const eqMatch = trimmed.match(/^(\w+)\s*=\s*\[([^\]]+)\]$/);
  if (eqMatch) {
    const name = eqMatch[1];
    const intervals = eqMatch[2].split(',').map((s) => parseInt(s.trim(), 10));
    return { name, intervals };
  }

  // Format: "[intervals]" only
  const arrMatch = trimmed.match(/^\[([^\]]+)\]$/);
  if (arrMatch) {
    const intervals = arrMatch[1].split(',').map((s) => parseInt(s.trim(), 10));
    return { name: 'custom', intervals };
  }

  // Format: "name" only — look up from engine
  const intervals = lookupScaleIntervals(trimmed);
  if (intervals) {
    return { name: trimmed, intervals };
  }

  throw new Error(`Cannot parse scale string: "${scaleStr}"`);
}

/**
 * Look up interval array for a curriculum scale name.
 * Translates curriculum name → engine name, then checks ALL_MODES.
 */
export function lookupScaleIntervals(
  curriculumName: string,
): number[] | undefined {
  const engineName = CURRICULUM_TO_ENGINE_SCALE[curriculumName];
  if (engineName && engineName in ALL_MODES) {
    return ALL_MODES[engineName as keyof typeof ALL_MODES];
  }
  // Try direct lookup (already engine name)
  if (curriculumName in ALL_MODES) {
    return ALL_MODES[curriculumName as keyof typeof ALL_MODES];
  }
  return undefined;
}

/**
 * Get the engine mode name for a curriculum scale name.
 */
export function curriculumToEngineScale(
  curriculumName: string,
): string | undefined {
  return CURRICULUM_TO_ENGINE_SCALE[curriculumName];
}

/**
 * Validate that a scale's intervals match the engine's definition.
 * Returns true if intervals match or if scale isn't in the engine.
 */
export function validateScaleIntervals(
  name: string,
  intervals: number[],
): boolean {
  const engineIntervals = lookupScaleIntervals(name);
  if (!engineIntervals) return true; // Not in engine — can't validate
  if (engineIntervals.length !== intervals.length) return false;
  return engineIntervals.every((v, i) => v === intervals[i]);
}

/**
 * Check if a scale is diatonic (7 notes).
 * Non-diatonic scales (pentatonic, blues, bebop) have different note counts
 * and don't support standard TRIADS/TETRADS degree analysis.
 */
export function isDiatonic(intervals: number[]): boolean {
  return intervals.length === 7;
}
