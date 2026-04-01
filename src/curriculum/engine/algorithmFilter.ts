/**
 * Phase 12 — Algorithm Filter.
 *
 * Combined filtering: filter progressions by vibe AND/OR style.
 * When both are specified, returns the intersection.
 */

import type { ChordProgressionEntry } from '../data/chordProgressionLibrary';
import type { VibeTag, StyleTag } from '../types/progression';
import { filterProgressionsByStyle, getModesForStyle } from './styleAlgorithms';
import { filterProgressionsByVibe, getModesForVibe } from './vibeAlgorithms';

// ---------------------------------------------------------------------------
// Combined filtering
// ---------------------------------------------------------------------------

/**
 * Filter progressions by both vibe and style.
 * Returns the intersection of both filters.
 *
 * @param progressions - Pool of progressions to filter
 * @param vibeTag - Vibe to filter by (optional)
 * @param styleTag - Style/genre to filter by (optional)
 * @returns Filtered progressions matching both criteria
 */
export function filterByVibeAndStyle(
  progressions: ChordProgressionEntry[],
  vibeTag?: VibeTag,
  styleTag?: StyleTag,
): ChordProgressionEntry[] {
  let filtered = progressions;

  if (styleTag) {
    filtered = filterProgressionsByStyle(filtered, styleTag);
  }

  if (vibeTag) {
    filtered = filterProgressionsByVibe(filtered, vibeTag);
  }

  return filtered;
}

// ---------------------------------------------------------------------------
// Mode associations
// ---------------------------------------------------------------------------

/**
 * Get scales appropriate for a context (genre and/or vibe).
 * Returns the intersection of genre and vibe modes when both specified,
 * or the union if only one is specified.
 *
 * @param genre - Style/genre tag (optional)
 * @param vibe - Vibe tag (optional)
 * @returns Array of mode/scale names
 */
export function getScalesForContext(
  genre?: StyleTag,
  vibe?: VibeTag,
): string[] {
  if (genre && vibe) {
    const genreModes = new Set(getModesForStyle(genre));
    const vibeModes = getModesForVibe(vibe);
    // Intersection: modes that appear in both
    const intersection = vibeModes.filter((m) => genreModes.has(m));
    // If intersection is empty, return union (don't be too restrictive)
    if (intersection.length > 0) return intersection;
    return [...new Set([...getModesForStyle(genre), ...vibeModes])];
  }

  if (genre) return getModesForStyle(genre);
  if (vibe) return getModesForVibe(vibe);

  // No context: return common modes
  return ['ionian', 'dorian', 'aeolian', 'mixolydian'];
}
