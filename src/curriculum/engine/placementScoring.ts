/**
 * Phase 26 — Placement Scoring.
 *
 * Scores placement test results to recommend starting genres and levels.
 *
 * Rules:
 * - If skill check passes melody + chords → recommend L2
 * - Otherwise → recommend L1
 * - Genre preferences weighted by selection order (first = highest priority)
 */

import type { CurriculumGenreId } from '../bridge/genreIdMap';
import type { CurriculumLevelId } from '../types/curriculum';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlacementSkillResult {
  /** Whether the melody playback test was passed */
  melodyPassed: boolean;
  /** Whether the chord identification test was passed */
  chordsPassed: boolean;
  /** Overall accuracy on melody test (0-100) */
  melodyAccuracy: number;
  /** Overall accuracy on chord test (0-100) */
  chordsAccuracy: number;
}

export interface PlacementRecommendation {
  genre: CurriculumGenreId;
  level: CurriculumLevelId;
}

export interface PlacementResult {
  /** Recommended starting genre/level combos (highest priority first) */
  recommendations: PlacementRecommendation[];
  /** Determined starting level */
  startingLevel: CurriculumLevelId;
  /** Whether the student showed advanced ability */
  isAdvanced: boolean;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/**
 * Score placement results and generate recommendations.
 *
 * @param genrePrefs - Student's selected genre preferences (ordered by preference)
 * @param skillResult - Results from the skill check tests
 * @returns Placement result with recommendations
 */
export function scorePlacement(
  genrePrefs: CurriculumGenreId[],
  skillResult: PlacementSkillResult,
): PlacementResult {
  // Determine starting level
  const isAdvanced = skillResult.melodyPassed && skillResult.chordsPassed;
  const startingLevel: CurriculumLevelId = isAdvanced ? 'L2' : 'L1';

  // Build recommendations from genre preferences
  const recommendations: PlacementRecommendation[] = genrePrefs.map(
    (genre) => ({
      genre,
      level: startingLevel,
    }),
  );

  return {
    recommendations,
    startingLevel,
    isAdvanced,
  };
}
