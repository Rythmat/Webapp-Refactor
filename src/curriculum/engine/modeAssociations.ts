/**
 * Phase 12 — Mode Associations.
 *
 * Provides scale/mode lookup by genre and/or vibe context.
 * Re-exports getScalesForContext from algorithmFilter for convenience.
 */

import type { VibeTag, StyleTag } from '../types/progression';
import { getScalesForContext } from './algorithmFilter';
import { STYLE_ALGORITHMS } from './styleAlgorithms';
import { VIBE_ALGORITHMS } from './vibeAlgorithms';

// Re-export main function
export { getScalesForContext };

/**
 * Get all genre+mode associations across the curriculum.
 * Useful for building a "which genres use this mode?" lookup.
 */
export function getGenresForMode(modeName: string): StyleTag[] {
  const genres: StyleTag[] = [];
  for (const [genre, algo] of Object.entries(STYLE_ALGORITHMS)) {
    const allModes = [...algo.primaryModes, ...algo.secondaryModes];
    if (allModes.includes(modeName)) {
      genres.push(genre as StyleTag);
    }
  }
  return genres;
}

/**
 * Get all vibes that list a given mode as applicable.
 */
export function getVibesForMode(modeName: string): VibeTag[] {
  const vibes: VibeTag[] = [];
  for (const [vibe, algo] of Object.entries(VIBE_ALGORITHMS)) {
    if (algo.applicableModes.includes(modeName)) {
      vibes.push(vibe as VibeTag);
    }
  }
  return vibes;
}
