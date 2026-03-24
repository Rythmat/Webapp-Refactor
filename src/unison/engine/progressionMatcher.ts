/**
 * Match detected chord regions against the 589-entry chord progression library.
 *
 * Strategy:
 *   1. Extract hybrid name sequence from UnisonChordRegions
 *   2. Sliding window comparison against library entries
 *   3. Circular matching (detected progression may start mid-pattern)
 *   4. Score: exact match = 1.0, same-degree different-quality = 0.5
 *   5. Return top matches above threshold with inherited vibes/styles
 */

import CHORD_PROGRESSION_LIBRARY, {
  type ChordProgressionEntry,
} from '@/curriculum/data/chordProgressionLibrary';
import type {
  UnisonChordRegion,
  ProgressionMatchResult,
} from '../types/schema';

// ── Configuration ─────────────────────────────────────────────────────────────

const MIN_SCORE = 0.6;
const MAX_RESULTS = 10;

// ── Core ──────────────────────────────────────────────────────────────────────

/**
 * Match a sequence of analyzed chord regions against the progression library.
 */
export function matchProgressions(
  regions: UnisonChordRegion[],
): ProgressionMatchResult[] {
  if (regions.length === 0) return [];

  const detected = regions.map((r) => r.hybridName);
  const results: ProgressionMatchResult[] = [];

  for (const entry of CHORD_PROGRESSION_LIBRARY) {
    const match = bestMatch(detected, entry);
    if (match && match.score >= MIN_SCORE) {
      results.push(match);
    }
  }

  // Sort by score descending, then by match length descending
  results.sort((a, b) => b.score - a.score || b.matchLength - a.matchLength);
  return results.slice(0, MAX_RESULTS);
}

// ── Matching ──────────────────────────────────────────────────────────────────

/**
 * Find the best alignment of a library entry against the detected sequence.
 * Tries all circular rotations of the library pattern (the detected progression
 * may start mid-pattern, e.g., starting on the IV of a I-IV-V-I).
 */
function bestMatch(
  detected: string[],
  entry: ChordProgressionEntry,
): ProgressionMatchResult | null {
  const libChords = entry.chords;
  if (libChords.length === 0) return null;

  let bestScore = 0;
  let bestStartIndex = 0;
  let bestMatchLength = 0;
  let bestMatchedChords: string[] = [];

  // Try each circular rotation of the library pattern
  for (let rotation = 0; rotation < libChords.length; rotation++) {
    const rotated = rotateArray(libChords, rotation);

    // Sliding window: try every starting position in the detected sequence
    for (let start = 0; start <= detected.length - 1; start++) {
      const windowLen = Math.min(rotated.length, detected.length - start);
      if (windowLen < 2) continue; // need at least 2 chords to match

      let totalScore = 0;
      const matched: string[] = [];

      for (let i = 0; i < windowLen; i++) {
        const chordScore = compareChords(detected[start + i], rotated[i]);
        totalScore += chordScore;
        matched.push(detected[start + i]);
      }

      const normalizedScore = totalScore / windowLen;

      if (normalizedScore > bestScore) {
        bestScore = normalizedScore;
        bestStartIndex = start;
        bestMatchLength = windowLen;
        bestMatchedChords = matched;
      }
    }
  }

  if (bestScore < MIN_SCORE) return null;

  return {
    libraryId: entry.id,
    progression: entry.progression,
    matchedChords: bestMatchedChords,
    matchStartIndex: bestStartIndex,
    matchLength: bestMatchLength,
    score: Math.round(bestScore * 1000) / 1000,
    vibes: entry.vibes,
    styles: entry.styles,
    complexity: entry.complexity,
    artist: entry.artist,
    song: entry.song,
  };
}

// ── Chord Comparison ──────────────────────────────────────────────────────────

/**
 * Compare two hybrid-name chords.
 *   - Exact match: 1.0
 *   - Same degree, different quality: 0.5
 *   - Different degree: 0.0
 */
function compareChords(a: string, b: string): number {
  if (a === b) return 1.0;

  const degreeA = extractDegree(a);
  const degreeB = extractDegree(b);

  if (degreeA === degreeB) return 0.5;
  return 0;
}

/** Extract the degree portion from a hybrid name (e.g., "b3" from "b3 major7") */
function extractDegree(hybridName: string): string {
  const spaceIdx = hybridName.indexOf(' ');
  return spaceIdx > 0 ? hybridName.slice(0, spaceIdx) : hybridName;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function rotateArray<T>(arr: T[], n: number): T[] {
  if (n === 0) return arr;
  const len = arr.length;
  const offset = n % len;
  return [...arr.slice(offset), ...arr.slice(0, offset)];
}
