/**
 * Phase 3 — Chord bridge utilities.
 *
 * Runtime functions that translate between curriculum and engine chord IDs,
 * and delegate interval lookups to the engine's CHORDS dictionary.
 */

import { CHORDS } from '@prism/engine';
import {
  CURRICULUM_TO_ENGINE_CHORD,
  ENGINE_TO_CURRICULUM_CHORD,
  curriculumToEngineChordId,
  engineToCurriculumChordId,
} from './chordIdMap';

// Re-export the ID translation functions
export { curriculumToEngineChordId, engineToCurriculumChordId };

/**
 * Get the interval array for a curriculum chord ID.
 * Translates to engine ID first, then looks up in CHORDS.
 *
 * @returns interval array or undefined if not found in engine
 */
export function getChordIntervals(curriculumId: string): number[] | undefined {
  const engineId = curriculumToEngineChordId(curriculumId);
  return CHORDS[engineId];
}

/**
 * Check whether a curriculum chord ID has an engine equivalent.
 */
export function hasEngineEquivalent(curriculumId: string): boolean {
  return curriculumId in CURRICULUM_TO_ENGINE_CHORD;
}

/**
 * Check whether an engine chord ID has a curriculum equivalent.
 */
export function hasCurriculumEquivalent(engineId: string): boolean {
  return engineId in ENGINE_TO_CURRICULUM_CHORD;
}

/**
 * Get all curriculum chord IDs that map to engine chords.
 */
export function getOverlappingChordIds(): string[] {
  return Object.keys(CURRICULUM_TO_ENGINE_CHORD);
}
