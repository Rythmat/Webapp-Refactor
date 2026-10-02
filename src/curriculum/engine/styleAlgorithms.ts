/**
 * Phase 12 — Style Algorithms.
 *
 * The 15 styles' reference data (their modes) and a filter over the
 * progression library.
 *
 * The styles, their reference data and the chord rules all live in
 * `progressionRules.ts`. The rules there are the Algorithms tab of the
 * "Every Chord Progression" sheet; they replaced the typical and avoided
 * chord-quality lists this file used to hold, which came from
 * Algorithms_Scales.md and were never run. Gospel joined the styles with
 * those rules. This file keeps its names for the mode lookups that read them.
 */

import type { ChordProgressionEntry } from '../data/chordProgressionLibrary';
import type { StyleTag } from '../types/progression';
import { autoTags, STYLE_INFO, STYLE_TAGS } from './progressionRules';

/** One style's reference data. */
export interface StyleAlgorithmDef {
  genre: StyleTag;
  /** Primary modes/scales for this genre */
  primaryModes: readonly string[];
  /** Secondary modes/scales for this genre */
  secondaryModes: readonly string[];
  /** Whether the Algorithms tab gives the style a rule. */
  hasRule: boolean;
}

/** Every style's reference data, keyed by style. */
export const STYLE_ALGORITHMS: Readonly<Record<StyleTag, StyleAlgorithmDef>> =
  Object.fromEntries(
    STYLE_TAGS.map((tag) => {
      const info = STYLE_INFO[tag];
      return [
        tag,
        {
          genre: tag,
          primaryModes: info.primaryModes,
          secondaryModes: info.secondaryModes,
          hasRule: info.hasRule,
        },
      ];
    }),
  ) as Record<StyleTag, StyleAlgorithmDef>;

/**
 * Progressions that store the style, or whose chords the rules give it. The
 * rules only add to the stored tags here; they never take one away.
 */
export function filterProgressionsByStyle(
  progressions: ChordProgressionEntry[],
  styleTag: StyleTag,
): ChordProgressionEntry[] {
  if (!STYLE_INFO[styleTag].hasRule)
    return progressions.filter((p) => p.styles.includes(styleTag));
  return progressions.filter(
    (p) =>
      p.styles.includes(styleTag) ||
      autoTags(p.chords).styles.includes(styleTag),
  );
}

/**
 * Get all modes (primary + secondary) for a style.
 */
export function getModesForStyle(styleTag: StyleTag): string[] {
  const style = STYLE_INFO[styleTag];
  return [...style.primaryModes, ...style.secondaryModes];
}

/**
 * Get primary modes only for a style.
 */
export function getPrimaryModesForStyle(styleTag: StyleTag): string[] {
  return [...STYLE_INFO[styleTag].primaryModes];
}
