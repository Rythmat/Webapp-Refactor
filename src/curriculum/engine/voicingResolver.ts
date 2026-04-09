/**
 * Phase 9 — Voicing Resolver.
 *
 * Implements the critical branch in the voicing pipeline:
 *   - If rh_override exists → use directly (semitone offsets from chord root)
 *   - Else → cross-reference Chord Quality Library × Voicing Algorithm Library
 *
 * The rh_override path handles special voicings like:
 *   [-1, 4, 7]  → "7-3-5 area code" (7th one semitone below root, then 3rd, 5th)
 *   [3, 10, 14]  → "3-7-9 rootless" voicing
 *   [4, -2, 15] → Hendrix #9 layout
 */

import { CHORD_QUALITY_BY_ID } from '../data/chordQualityLibrary';
import type { VoicingTaxonomyEntry } from '../data/genreVoicingTaxonomy';
import {
  VOICING_ALGORITHM_LIBRARY,
  getVoicingAlgorithm,
  type VoicingAlgorithmEntry,
} from '../data/voicingAlgorithmLibrary';
import { applyVoicing } from './voicingEngine';
import { applyVoicingRules } from './voicingRules';

/**
 * Resolve a taxonomy entry into semitone offsets from chord root.
 *
 * Two paths:
 * 1. **rh_override** (direct): The taxonomy entry specifies exact semitone
 *    offsets. Used for area codes, rootless voicings, shells, Hendrix, etc.
 *
 * 2. **quality × algorithm** (computed): Cross-reference the Chord Quality
 *    Library (root-position intervals) with the Voicing Algorithm Library
 *    (displacement array). Combine and sort.
 *
 * @param entry - Genre Voicing Taxonomy entry
 * @param genre - Genre slug (passed to voicing rules for genre-specific behavior)
 * @returns Array of semitone offsets from chord root
 */
export function resolveVoicing(
  entry: VoicingTaxonomyEntry,
  genre?: string,
): number[] {
  // ── Path A: Direct override ──
  if (entry.rhOverride && entry.rhOverride.length > 0) {
    return entry.rhOverride;
  }

  // ── Path B: Quality × Algorithm cross-reference ──
  const quality = CHORD_QUALITY_BY_ID[entry.qualityId];
  const algorithm = getVoicingAlgorithm(
    entry.algorithmId,
    getCategoryForQuality(entry.qualityId),
  );

  if (quality && algorithm) {
    // Apply practical voicing rules (omit 11th from 13ths, etc.)
    const { intervals } = applyVoicingRules(
      entry.qualityId,
      quality.rootPosition,
      genre,
    );
    return applyVoicing(intervals, algorithm.displacements);
  }

  // If algorithm lookup by category fails, try by ID only
  if (quality) {
    const algByIdOnly = findAlgorithmById(entry.algorithmId);
    if (algByIdOnly) {
      const { intervals } = applyVoicingRules(
        entry.qualityId,
        quality.rootPosition,
        genre,
      );
      return applyVoicing(intervals, algByIdOnly.displacements);
    }
  }

  // Fallback: return root-position intervals from quality library
  if (quality) {
    const { intervals } = applyVoicingRules(
      entry.qualityId,
      quality.rootPosition,
      genre,
    );
    return intervals;
  }

  // Ultimate fallback: major triad
  return [0, 4, 7];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Find an algorithm entry by ID only (ignoring category).
 * Used as fallback when category-specific lookup fails.
 */
function findAlgorithmById(id: string): VoicingAlgorithmEntry | undefined {
  return VOICING_ALGORITHM_LIBRARY.find((a) => a.id === id);
}

/**
 * Infer the voicing algorithm category from a chord quality ID.
 * Maps quality families to their expected algorithm categories.
 */
function getCategoryForQuality(qualityId: string): string {
  const id = qualityId.toLowerCase();

  // Triads
  if (
    ['maj', 'min', 'aug', 'dim', 'sus2', 'sus4', 'quartal', 'power'].includes(
      id,
    ) ||
    id === 'sus_s4' ||
    id === 'sus_b2' ||
    id === 'sus_b2b5' ||
    id === 'sus2_b5' ||
    id === 'maj4' ||
    id === 'min4'
  ) {
    return 'triad';
  }

  // Sus4 sevenths
  if (id.includes('sus4') || id === 'dom7sus4' || id === 'maj7sus4') {
    return 'seventh_sus4';
  }

  // Sus2 chords
  if (id.includes('sus2') || id === 'dom7sus2' || id === 'maj7sus2') {
    return 'sus2';
  }

  // Add2/Add4
  if (id === 'add2') return 'add2';
  if (id === 'add4') return 'add4';

  // Thirteenths (7 notes)
  if (id.includes('13')) return 'thirteenth';

  // Elevenths (6 notes)
  if (id.includes('11')) return 'eleventh';

  // Ninths (5 notes)
  if (id.includes('9')) return 'ninth';

  // Sevenths (4 notes) — default for most 4-note chords
  return 'seventh';
}
