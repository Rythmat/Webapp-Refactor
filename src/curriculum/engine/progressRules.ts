/**
 * Phase 19 — Progress Rules.
 *
 * Defines unlock logic for curriculum levels:
 * - L1 is always unlocked for all genres
 * - L2 unlocks when L1 has ≥70% completion
 * - L3 unlocks when L2 has ≥70% completion
 *
 * These thresholds are configurable per genre if needed.
 */

import type { CurriculumGenreId } from '../bridge/genreIdMap';
import type { CurriculumLevelId } from '../types/curriculum';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Default completion threshold to unlock the next level (percentage) */
const DEFAULT_UNLOCK_THRESHOLD = 70;

/** Per-genre threshold overrides (if some genres should be stricter/lenient) */
const GENRE_THRESHOLDS: Partial<Record<CurriculumGenreId, number>> = {
  // All genres use the default for now
};

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

/**
 * Check if a level is unlocked based on the completion of the previous level.
 *
 * @param genre - The genre to check
 * @param level - The level to check unlock status for
 * @param getCompletion - Function returning completion % for a genre/level (0-100)
 * @returns Whether the level is unlocked
 */
export function isLevelUnlocked(
  genre: CurriculumGenreId,
  level: CurriculumLevelId,
  getCompletion: (genre: CurriculumGenreId, level: CurriculumLevelId) => number,
): boolean {
  // L1 is always unlocked
  if (level === 'L1') return true;

  const threshold = GENRE_THRESHOLDS[genre] ?? DEFAULT_UNLOCK_THRESHOLD;

  if (level === 'L2') {
    return getCompletion(genre, 'L1') >= threshold;
  }

  if (level === 'L3') {
    return getCompletion(genre, 'L2') >= threshold;
  }

  return false;
}

/**
 * Get all unlocked levels for a genre.
 */
export function getUnlockedLevels(
  genre: CurriculumGenreId,
  getCompletion: (genre: CurriculumGenreId, level: CurriculumLevelId) => number,
): CurriculumLevelId[] {
  const levels: CurriculumLevelId[] = ['L1'];
  if (isLevelUnlocked(genre, 'L2', getCompletion)) levels.push('L2');
  if (isLevelUnlocked(genre, 'L3', getCompletion)) levels.push('L3');
  return levels;
}

/**
 * Get the next level to unlock for a genre, or null if all unlocked.
 */
export function getNextLockedLevel(
  genre: CurriculumGenreId,
  getCompletion: (genre: CurriculumGenreId, level: CurriculumLevelId) => number,
): CurriculumLevelId | null {
  if (!isLevelUnlocked(genre, 'L2', getCompletion)) return 'L2';
  if (!isLevelUnlocked(genre, 'L3', getCompletion)) return 'L3';
  return null;
}

/**
 * Get the unlock threshold for a genre.
 */
export function getUnlockThreshold(genre: CurriculumGenreId): number {
  return GENRE_THRESHOLDS[genre] ?? DEFAULT_UNLOCK_THRESHOLD;
}
