/**
 * Phase 9 — Voicing Engine.
 *
 * Core voicing computation: applies displacement algorithms to root-position
 * intervals, producing genre-appropriate, level-appropriate chord voicings.
 *
 * Pipeline: Quality (WHAT notes) × Algorithm (WHERE in octave) = Final Voicing
 */

import { CHORD_QUALITY_BY_ID } from '../data/chordQualityLibrary';
import {
  getVoicingsForGenreLevel,
  type VoicingTaxonomyEntry,
} from '../data/genreVoicingTaxonomy';
import { resolveVoicing } from './voicingResolver';
import { applyVoicingRules } from './voicingRules';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VoicedChord {
  /** Right-hand MIDI notes (the main voicing) */
  rh: number[];
  /** Left-hand bass MIDI note, or null if no LH assignment */
  lh: number | null;
  /** Display name of the voicing */
  name: string;
  /** Original chord degree + quality string */
  chord: string;
}

// ---------------------------------------------------------------------------
// Core voicing computation
// ---------------------------------------------------------------------------

/**
 * Apply a voicing algorithm to root-position intervals.
 *
 * Combines each interval with its corresponding displacement, then sorts
 * the result to produce the final voicing offsets.
 *
 * @param rootPosition - Interval array from Chord Quality Library (e.g., [0, 4, 7])
 * @param displacements - Displacement array from Voicing Algorithm Library (e.g., [0, -12, -12])
 * @returns Sorted array of semitone offsets relative to chord root
 */
export function applyVoicing(
  rootPosition: number[],
  displacements: number[],
): number[] {
  const len = Math.min(rootPosition.length, displacements.length);
  const result: number[] = [];
  for (let i = 0; i < len; i++) {
    result.push(rootPosition[i] + displacements[i]);
  }
  return result.sort((a, b) => a - b);
}

/**
 * Get a voiced chord for a given context (genre, level, degree, quality, key).
 *
 * This is the main entry point for the voicing system. It:
 * 1. Looks up the Genre Voicing Taxonomy for matching entries
 * 2. Resolves the voicing (rh_override path or quality×algorithm path)
 * 3. Applies practical voicing rules
 * 4. Transposes to the chord root in the given key
 *
 * @param genre - Genre slug (e.g., 'jazz', 'pop', 'funk')
 * @param level - Complexity level (1, 2, or 3)
 * @param qualityId - Chord quality ID (e.g., 'maj7', 'dom7', 'min7')
 * @param chordRoot - MIDI note number of the chord root (e.g., 60 for C4)
 * @param degree - Chord degree string for display (e.g., '1', 'b3', '5')
 * @returns VoicedChord with RH notes, LH bass, name, and chord label
 */
export function getVoicingForContext(
  genre: string,
  level: number,
  qualityId: string,
  chordRoot: number,
  degree: string = '1',
): VoicedChord {
  // Find matching taxonomy entry
  const taxonomyEntry = findBestTaxonomyMatch(genre, level, qualityId);

  if (!taxonomyEntry) {
    // Fallback: root-position voicing from quality library
    return buildFallbackVoicing(qualityId, chordRoot, degree);
  }

  // Resolve RH notes using the resolver
  const rhOffsets = resolveVoicing(taxonomyEntry, genre);

  // Transpose to absolute MIDI notes
  const rh = rhOffsets.map((offset) => chordRoot + offset);

  // LH assignment
  const lh = taxonomyEntry.lhAssignment === 'root_bass' ? chordRoot - 12 : null;

  return {
    rh,
    lh,
    name: taxonomyEntry.voicingDisplayName,
    chord: `${degree} ${qualityId}`,
  };
}

// ---------------------------------------------------------------------------
// Taxonomy matching
// ---------------------------------------------------------------------------

/**
 * Find the best matching taxonomy entry using a 3-tier fallback strategy:
 * 1. Exact quality match
 * 2. Partial match (prefix)
 * 3. Family match (major→maj, minor→min, dominant→dom)
 */
function findBestTaxonomyMatch(
  genre: string,
  level: number,
  qualityId: string,
): VoicingTaxonomyEntry | undefined {
  const candidates = getVoicingsForGenreLevel(genre, level);
  if (candidates.length === 0) return undefined;

  const qLower = qualityId.toLowerCase().replace(/\s/g, '');

  // Tier 1: Exact match
  const exact = candidates.find((t) => t.qualityId === qLower);
  if (exact) return exact;

  // Tier 2: Partial match (quality starts with candidate ID or vice versa)
  const partial = candidates.find((t) => {
    const tId = t.qualityId;
    return qLower.startsWith(tId) || tId.startsWith(qLower);
  });
  if (partial) return partial;

  // Tier 3: Family match
  const family =
    qLower.startsWith('major') || qLower.startsWith('maj')
      ? 'maj'
      : qLower.startsWith('minor') || qLower.startsWith('min')
        ? 'min'
        : qLower.startsWith('dominant') || qLower.startsWith('dom')
          ? 'dom'
          : '';

  if (family) {
    const familyMatch = candidates.find((t) => t.qualityId.startsWith(family));
    if (familyMatch) return familyMatch;
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Fallback
// ---------------------------------------------------------------------------

/**
 * Build a simple root-position voicing when no taxonomy entry is found.
 */
function buildFallbackVoicing(
  qualityId: string,
  chordRoot: number,
  degree: string,
): VoicedChord {
  const quality = CHORD_QUALITY_BY_ID[qualityId];

  if (quality) {
    const { intervals } = applyVoicingRules(qualityId, quality.rootPosition);
    const rh = intervals.map((i) => chordRoot + i);
    return {
      rh,
      lh: chordRoot - 12,
      name: `${quality.name} (root position fallback)`,
      chord: `${degree} ${qualityId}`,
    };
  }

  // Ultimate fallback: major triad
  return {
    rh: [chordRoot, chordRoot + 4, chordRoot + 7],
    lh: chordRoot - 12,
    name: 'Major triad (default fallback)',
    chord: `${degree} ${qualityId}`,
  };
}

// ---------------------------------------------------------------------------
// Batch voicing
// ---------------------------------------------------------------------------

/**
 * Voice a sequence of chords for a given genre/level/key.
 * Does NOT apply voice leading — use voiceLeadSequence() for that.
 *
 * @param chords - Array of { degree, qualityId } objects
 * @param genre - Genre slug
 * @param level - Complexity level
 * @param keyRoot - MIDI note of the key root
 * @returns Array of VoicedChord objects
 */
export function voiceChordSequence(
  chords: Array<{ degree: string; qualityId: string; chordRoot: number }>,
  genre: string,
  level: number,
): VoicedChord[] {
  return chords.map((c) =>
    getVoicingForContext(genre, level, c.qualityId, c.chordRoot, c.degree),
  );
}
