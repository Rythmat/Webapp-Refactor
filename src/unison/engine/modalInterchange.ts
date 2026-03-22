/**
 * Modal Interchange Source Finder.
 *
 * Given a non-diatonic chord and the current key, identifies which parallel
 * mode(s) it could be borrowed from. A "parallel mode" shares the same tonic
 * but uses a different scale — e.g., C Aeolian is the parallel minor of C Ionian.
 *
 * Rankings:
 *   1. Exact quality match > partial match
 *   2. Same family as primary mode preferred
 *   3. Diatonic family preferred over exotic families
 *   4. Simpler/brighter mode preferred (earlier in brightness order)
 */

import {
  ALL_MODES,
  MODE_DISPLAY,
  MODE_GROUPS,
  MODE_FAMILY_INFO,
} from '@/daw/prism-engine/data/modes';
import {
  isDiatonic,
  getScaleDegree,
  getExpectedQualities,
} from './diatonicChecker';

// ── Types ────────────────────────────────────────────────────────────────────

export interface BorrowedChordInfo {
  sourceMode: string;
  sourceModeDisplay: string;
  sourceModeFamily: string;
  degreeInSourceMode: number;
  expectedQuality: string;
  confidence: number;
}

// ── Brightness ordering (used for ranking) ──────────────────────────────────

/** Flat list of modes in brightness order (brightest first) within each family. */
const BRIGHTNESS_ORDER: string[] = MODE_GROUPS.flatMap((g) => g.modes);

function brightnessRank(mode: string): number {
  const idx = BRIGHTNESS_ORDER.indexOf(mode);
  return idx >= 0 ? idx : 999;
}

/** Family priority: Diatonic > Harmonic Minor > Melodic Minor > Harmonic Major > Double Harmonic */
const FAMILY_PRIORITY: Record<string, number> = {
  Diatonic: 0,
  'Harmonic Minor': 1,
  'Melodic Minor': 2,
  'Harmonic Major': 3,
  'Double Harmonic': 4,
};

function familyPriority(familyLabel: string): number {
  return FAMILY_PRIORITY[familyLabel] ?? 5;
}

// ── Core ─────────────────────────────────────────────────────────────────────

/**
 * Find all parallel modes from which a non-diatonic chord could be borrowed.
 * Returns an array sorted by confidence/priority (best first).
 *
 * Skips the primary mode itself (the chord is already non-diatonic there).
 */
export function findBorrowedSources(
  chordRootPc: number,
  chordQuality: string,
  keyRootPc: number,
  primaryMode: string,
): BorrowedChordInfo[] {
  const results: BorrowedChordInfo[] = [];
  const primaryFamily =
    MODE_FAMILY_INFO[primaryMode]?.familyLabel ?? 'Diatonic';

  for (const mode of Object.keys(ALL_MODES)) {
    // Skip the primary mode
    if (mode === primaryMode) continue;

    // Check if this chord is diatonic to the parallel mode
    if (!isDiatonic(chordRootPc, chordQuality, keyRootPc, mode)) continue;

    const degree = getScaleDegree(chordRootPc, keyRootPc, mode);
    if (degree === null) continue;

    const expected = getExpectedQualities(degree, mode);
    const display = MODE_DISPLAY[mode] ?? mode;
    const info = MODE_FAMILY_INFO[mode];
    const family = info?.familyLabel ?? 'Unknown';

    // Determine confidence based on quality match type
    const triadMatch = expected.triad === chordQuality;
    const tetradMatch = expected.tetrad === chordQuality;
    let confidence: number;

    if (triadMatch || tetradMatch) {
      confidence = 1.0;
    } else {
      // Partial match (e.g., extended chord matched against base)
      confidence = 0.8;
    }

    // Boost confidence for same-family modes
    if (family === primaryFamily) {
      confidence += 0.05;
    }

    results.push({
      sourceMode: mode,
      sourceModeDisplay: display,
      sourceModeFamily: family,
      degreeInSourceMode: degree,
      expectedQuality: tetradMatch
        ? expected.tetrad!
        : (expected.triad ?? chordQuality),
      confidence: Math.min(1, confidence),
    });
  }

  // Sort: confidence desc, then family priority asc, then brightness rank asc
  results.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    const famA = familyPriority(a.sourceModeFamily);
    const famB = familyPriority(b.sourceModeFamily);
    if (famA !== famB) return famA - famB;
    return brightnessRank(a.sourceMode) - brightnessRank(b.sourceMode);
  });

  return results;
}

/**
 * Return the single best source mode for a borrowed chord, or null if
 * no parallel mode contains this chord.
 */
export function getBestBorrowedSource(
  chordRootPc: number,
  chordQuality: string,
  keyRootPc: number,
  primaryMode: string,
): BorrowedChordInfo | null {
  const sources = findBorrowedSources(
    chordRootPc,
    chordQuality,
    keyRootPc,
    primaryMode,
  );
  return sources.length > 0 ? sources[0] : null;
}
