/**
 * Secondary Dominant Detection.
 *
 * Identifies "5 of X" tonicizations based on chord sequence context.
 * A dominant-quality chord resolving down a perfect 5th to a diatonic target
 * is a secondary dominant. Also detects secondary leading-tone diminished
 * chords ("7 of X") where the root is a semitone below the target.
 *
 * Labels use hybrid numbering: "5 of 2" is the dominant of the 2 chord and
 * "7 of 6" the leading-tone chord of the 6 chord. They say "of" rather than
 * using a slash, because a slash names a bass note.
 *
 * Detection rules:
 *   1. Chord has dominant quality (dominant7, dominant9, dominant13, etc.)
 *   2. Root is a perfect 5th above (7 semitones) the next chord's root
 *   3. The target chord is diatonic to the primary key
 *
 * For secondary leading-tone:
 *   1. Chord has diminished7 quality
 *   2. Root is a semitone below the next chord's root
 *   3. The target chord is diatonic to the primary key
 */

import { getScaleDegree } from './diatonicChecker';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SecondaryDominantInfo {
  type: 'secondary-dominant' | 'secondary-leading-tone';
  target: string; // the target's scale degree, e.g. "2", "6", "5"
  label: string; // e.g. "5 of 2", "7 of 5"
  targetDegree: number; // 1-7
  resolved: boolean; // followed by expected target?
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const DOMINANT_QUALITIES = new Set([
  'dominant7',
  'dominant9',
  'dominant11',
  'dominant13',
  'dom7',
  'dom9',
  'dom11',
  'dom13',
  'dominant7sus4',
  'dominant7sus2',
  'dominant7#9',
  'dominant7b9',
  'dominant7#11',
  'dominant7b5',
  'dominant7#5',
]);

const DIMINISHED7_QUALITIES = new Set(['diminished7', 'dim7']);

// ── Core ─────────────────────────────────────────────────────────────────────

/**
 * Analyze a single chord in context: is it a secondary dominant?
 *
 * @param chordRootPc - Pitch class of the chord root (0-11)
 * @param chordQuality - Quality of the chord (e.g., "dominant7")
 * @param nextChordRootPc - Pitch class of the next chord's root, or null
 * @param nextChordQuality - Quality of the next chord, or null
 * @param keyRootPc - Pitch class of the session key root (0-11)
 * @param primaryMode - The primary mode (e.g., "ionian")
 */
export function detectSecondaryDominant(
  chordRootPc: number,
  chordQuality: string,
  nextChordRootPc: number | null,
  _nextChordQuality: string | null,
  keyRootPc: number,
  primaryMode: string,
): SecondaryDominantInfo | null {
  const isDom = DOMINANT_QUALITIES.has(chordQuality);
  const isDim7 = DIMINISHED7_QUALITIES.has(chordQuality);

  if (!isDom && !isDim7) return null;

  if (isDom) {
    return detectDominantOf(
      chordRootPc,
      nextChordRootPc,
      keyRootPc,
      primaryMode,
    );
  }

  return detectLeadingTone(
    chordRootPc,
    nextChordRootPc,
    keyRootPc,
    primaryMode,
  );
}

/** Detect "5 of X" — a dominant chord a P5 above its target. */
function detectDominantOf(
  chordRootPc: number,
  nextChordRootPc: number | null,
  keyRootPc: number,
  primaryMode: string,
): SecondaryDominantInfo | null {
  // The chord is already the key's 5 chord → not a secondary dominant
  const chordDegree = getScaleDegree(chordRootPc, keyRootPc, primaryMode);
  if (chordDegree === 5) return null;

  // Expected target: chord root down a P5 (i.e., target = chordRoot - 7 semitones)
  const expectedTargetPc = (chordRootPc + 5) % 12; // +5 = down P5 = up P4

  // Check if the expected target is a diatonic degree
  const targetDegree = getScaleDegree(expectedTargetPc, keyRootPc, primaryMode);
  if (targetDegree === null) return null;

  // Don't flag 5 of 1 — that's just the regular dominant
  if (targetDegree === 1) return null;

  const target = String(targetDegree);
  const label = `5 of ${target}`;

  // Check if it actually resolves to the expected target
  const resolved =
    nextChordRootPc !== null && nextChordRootPc === expectedTargetPc;

  return { type: 'secondary-dominant', target, label, targetDegree, resolved };
}

/** Detect "7 of X" — a diminished 7th chord a semitone below its target. */
function detectLeadingTone(
  chordRootPc: number,
  nextChordRootPc: number | null,
  keyRootPc: number,
  primaryMode: string,
): SecondaryDominantInfo | null {
  // The chord is already the key's 7 chord → not secondary
  const chordDegree = getScaleDegree(chordRootPc, keyRootPc, primaryMode);
  if (chordDegree === 7) return null;

  // Expected target: chord root up a semitone
  const expectedTargetPc = (chordRootPc + 1) % 12;

  const targetDegree = getScaleDegree(expectedTargetPc, keyRootPc, primaryMode);
  if (targetDegree === null) return null;

  // Don't flag 7 of 1 — that's just the regular leading tone
  if (targetDegree === 1) return null;

  const target = String(targetDegree);
  const label = `7 of ${target}`;

  const resolved =
    nextChordRootPc !== null && nextChordRootPc === expectedTargetPc;

  return {
    type: 'secondary-leading-tone',
    target,
    label,
    targetDegree,
    resolved,
  };
}

// ── Batch ────────────────────────────────────────────────────────────────────

/**
 * Analyze an entire chord sequence for secondary dominants.
 * Returns an array parallel to the input: each entry is a SecondaryDominantInfo
 * or null if the chord is not a secondary dominant.
 */
export function detectSecondaryDominants(
  chords: Array<{ rootPc: number; quality: string }>,
  keyRootPc: number,
  primaryMode: string,
): Array<SecondaryDominantInfo | null> {
  return chords.map((chord, i) => {
    const next = i < chords.length - 1 ? chords[i + 1] : null;
    return detectSecondaryDominant(
      chord.rootPc,
      chord.quality,
      next?.rootPc ?? null,
      next?.quality ?? null,
      keyRootPc,
      primaryMode,
    );
  });
}
