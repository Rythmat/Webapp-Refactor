/**
 * Phase 12 — Vibe Algorithms.
 *
 * The 16 vibes' reference data (synonyms, tempo range, modes) and a filter
 * over the progression library.
 *
 * The vibes, their reference data and the chord rules all live in
 * `progressionRules.ts`. The rules there are the Algorithms tab of the
 * "Every Chord Progression" sheet; they replaced the chord-quality lists this
 * file used to hold, which came from Algorithms_Scales.md and disagreed with
 * the sheet. This file keeps its names for the code that reads them: the
 * vocabulary lists, UNISON's vibe synonyms and the mode lookups.
 */

import type { ChordProgressionEntry } from '../data/chordProgressionLibrary';
import type { VibeTag } from '../types/progression';
import { autoTags, VIBE_INFO, type VibeInfo } from './progressionRules';

/**
 * One vibe's reference data: `tag`, `synonyms`, `tempoRange`,
 * `applicableModes`, and `hasRule` (whether the Algorithms tab gives it a
 * rule).
 */
export type VibeAlgorithmDef = VibeInfo;

/** Every vibe's reference data, keyed by vibe. */
export const VIBE_ALGORITHMS: Readonly<Record<VibeTag, VibeAlgorithmDef>> =
  VIBE_INFO;

/**
 * Progressions that store the vibe, or whose chords the rules give it. The
 * rules only add to the stored tags here; they never take one away.
 */
export function filterProgressionsByVibe(
  progressions: ChordProgressionEntry[],
  vibeTag: VibeTag,
): ChordProgressionEntry[] {
  if (!VIBE_INFO[vibeTag].hasRule)
    return progressions.filter((p) => p.vibes.includes(vibeTag));
  return progressions.filter(
    (p) =>
      p.vibes.includes(vibeTag) || autoTags(p.chords).vibes.includes(vibeTag),
  );
}

/** The modes and scales that suit a vibe. */
export function getModesForVibe(vibeTag: VibeTag): string[] {
  return [...VIBE_INFO[vibeTag].applicableModes];
}

/** A vibe's tempo range in beats per minute, low and high. */
export function getTempoRangeForVibe(vibeTag: VibeTag): [number, number] {
  const [low, high] = VIBE_INFO[vibeTag].tempoRange;
  return [low, high];
}
