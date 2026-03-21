/**
 * Secondary Dominant Detection.
 *
 * Identifies V7/X tonicizations based on chord sequence context.
 * A dominant-quality chord resolving down a perfect 5th to a diatonic target
 * is a secondary dominant. Also detects secondary leading-tone diminished
 * chords (viidim7/X) where the root is a semitone below the target.
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
  target: string; // e.g., "ii", "vi", "V"
  label: string; // e.g., "V7/ii", "viidim7/V"
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

const DEGREE_LABELS: Record<number, string> = {
  1: 'I',
  2: 'ii',
  3: 'iii',
  4: 'IV',
  5: 'V',
  6: 'vi',
  7: 'vii',
};

function degreeLabel(degree: number): string {
  return DEGREE_LABELS[degree] ?? `${degree}`;
}

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
    return detectV7(chordRootPc, nextChordRootPc, keyRootPc, primaryMode);
  }

  return detectLeadingTone(
    chordRootPc,
    nextChordRootPc,
    keyRootPc,
    primaryMode,
  );
}

/** Detect V7/X — dominant chord a P5 above target. */
function detectV7(
  chordRootPc: number,
  nextChordRootPc: number | null,
  keyRootPc: number,
  primaryMode: string,
): SecondaryDominantInfo | null {
  // The chord is already V (degree 5) in the key → not a secondary dominant
  const chordDegree = getScaleDegree(chordRootPc, keyRootPc, primaryMode);
  if (chordDegree === 5) return null;

  // Expected target: chord root down a P5 (i.e., target = chordRoot - 7 semitones)
  const expectedTargetPc = (chordRootPc + 5) % 12; // +5 = down P5 = up P4

  // Check if the expected target is a diatonic degree
  const targetDegree = getScaleDegree(expectedTargetPc, keyRootPc, primaryMode);
  if (targetDegree === null) return null;

  // Don't flag V7/I — that's just the regular dominant
  if (targetDegree === 1) return null;

  const target = degreeLabel(targetDegree);
  const label = `V7/${target}`;

  // Check if it actually resolves to the expected target
  const resolved =
    nextChordRootPc !== null && nextChordRootPc === expectedTargetPc;

  return { type: 'secondary-dominant', target, label, targetDegree, resolved };
}

/** Detect viidim7/X — diminished 7th chord a semitone below target. */
function detectLeadingTone(
  chordRootPc: number,
  nextChordRootPc: number | null,
  keyRootPc: number,
  primaryMode: string,
): SecondaryDominantInfo | null {
  // The chord is already vii (degree 7) in the key → not secondary
  const chordDegree = getScaleDegree(chordRootPc, keyRootPc, primaryMode);
  if (chordDegree === 7) return null;

  // Expected target: chord root up a semitone
  const expectedTargetPc = (chordRootPc + 1) % 12;

  const targetDegree = getScaleDegree(expectedTargetPc, keyRootPc, primaryMode);
  if (targetDegree === null) return null;

  // Don't flag viidim7/I — that's just the regular leading tone
  if (targetDegree === 1) return null;

  const target = degreeLabel(targetDegree);
  const label = `viidim7/${target}`;

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
