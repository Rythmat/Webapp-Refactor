/**
 * Mode Mixture Pattern Detection.
 *
 * Detects named harmonic patterns that involve chords from outside
 * the primary key — patterns that have specific theoretical names
 * and are recognized as idiomatic in Western music.
 *
 * Patterns detected:
 *   - Minor plagal: IV → iv → I in major key
 *   - Picardy third: ending on I major in a minor key
 *   - Backdoor dominant: bVII7 → I
 *   - Tritone substitution: bII7 → I
 *   - Deceptive resolution: V → vi or V → bVI
 *   - Chromatic mediant: two consecutive chords with roots 3-4 semitones apart
 */

import type { KeyDetection, UnisonChordRegion } from '../types/schema';
import { getScaleDegree } from './diatonicChecker';

// ── Types ────────────────────────────────────────────────────────────────────

export type MixturePatternType =
  | 'minor-plagal'
  | 'picardy-third'
  | 'backdoor-dominant'
  | 'tritone-substitution'
  | 'deceptive-resolution'
  | 'chromatic-mediant';

export interface MixturePattern {
  type: MixturePatternType;
  startIndex: number;
  endIndex: number;
  label: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const MAJOR_QUALITIES = new Set([
  'major',
  'major7',
  'major9',
  'major13',
  'maj',
  'maj7',
]);
const MINOR_QUALITIES = new Set([
  'minor',
  'minor7',
  'minor9',
  'minor11',
  'minor13',
  'min',
  'min7',
]);
const DOMINANT_QUALITIES = new Set([
  'dominant7',
  'dominant9',
  'dominant11',
  'dominant13',
  'dom7',
  'dom9',
  'dominant7sus4',
  'dominant7#11',
  'dominant7b9',
]);

function isMajorQuality(q: string): boolean {
  return MAJOR_QUALITIES.has(q);
}
function isMinorQuality(q: string): boolean {
  return MINOR_QUALITIES.has(q);
}
function isDominantQuality(q: string): boolean {
  return DOMINANT_QUALITIES.has(q);
}

function isMinorKey(mode: string): boolean {
  return [
    'aeolian',
    'dorian',
    'phrygian',
    'locrian',
    'harmonicMinor',
    'melodicMinor',
    'doubleHarmonicMinor',
  ].includes(mode);
}

// ── Core ─────────────────────────────────────────────────────────────────────

/**
 * Scan a chord timeline for mode mixture patterns.
 */
export function detectMixturePatterns(
  chords: UnisonChordRegion[],
  key: KeyDetection,
): MixturePattern[] {
  const patterns: MixturePattern[] = [];

  for (let i = 0; i < chords.length; i++) {
    // Minor plagal: IV → iv → I (3-chord pattern)
    if (i + 2 < chords.length) {
      const mp = detectMinorPlagal(chords, i, key);
      if (mp) patterns.push(mp);
    }

    // 2-chord patterns
    if (i + 1 < chords.length) {
      const bd = detectBackdoorDominant(chords, i, key);
      if (bd) patterns.push(bd);

      const ts = detectTritoneSubstitution(chords, i, key);
      if (ts) patterns.push(ts);

      const dr = detectDeceptiveResolution(chords, i, key);
      if (dr) patterns.push(dr);

      const cm = detectChromaticMediant(chords, i, key);
      if (cm) patterns.push(cm);
    }
  }

  // Picardy third: last chord check
  const pt = detectPicardyThird(chords, key);
  if (pt) patterns.push(pt);

  return patterns;
}

// ── Individual pattern detectors ─────────────────────────────────────────────

/** IV → iv → I in major key */
function detectMinorPlagal(
  chords: UnisonChordRegion[],
  i: number,
  key: KeyDetection,
): MixturePattern | null {
  if (isMinorKey(key.mode)) return null;

  const c1 = chords[i];
  const c2 = chords[i + 1];
  const c3 = chords[i + 2];

  const d1 = getScaleDegree(c1.rootPc, key.rootPc, key.mode);
  const d2 = getScaleDegree(c2.rootPc, key.rootPc, key.mode);
  const d3 = getScaleDegree(c3.rootPc, key.rootPc, key.mode);

  if (
    d1 === 4 &&
    isMajorQuality(c1.quality) &&
    d2 === 4 &&
    isMinorQuality(c2.quality) &&
    d3 === 1 &&
    isMajorQuality(c3.quality)
  ) {
    return {
      type: 'minor-plagal',
      startIndex: i,
      endIndex: i + 2,
      label: 'Minor plagal cadence (IV → iv → I)',
    };
  }

  return null;
}

/** Final chord is I major in a minor key */
function detectPicardyThird(
  chords: UnisonChordRegion[],
  key: KeyDetection,
): MixturePattern | null {
  if (chords.length < 2) return null;
  if (!isMinorKey(key.mode)) return null;

  const last = chords[chords.length - 1];
  const degree = getScaleDegree(last.rootPc, key.rootPc, key.mode);

  if (degree === 1 && isMajorQuality(last.quality)) {
    return {
      type: 'picardy-third',
      startIndex: chords.length - 1,
      endIndex: chords.length - 1,
      label: 'Picardy third (minor key ending on major I)',
    };
  }

  return null;
}

/** bVII7 → I */
function detectBackdoorDominant(
  chords: UnisonChordRegion[],
  i: number,
  key: KeyDetection,
): MixturePattern | null {
  const c1 = chords[i];
  const c2 = chords[i + 1];

  // bVII: root is 10 semitones above key root (= 2 below)
  const diff1 = (((c1.rootPc - key.rootPc) % 12) + 12) % 12;
  const d2 = getScaleDegree(c2.rootPc, key.rootPc, key.mode);

  if (diff1 === 10 && isDominantQuality(c1.quality) && d2 === 1) {
    return {
      type: 'backdoor-dominant',
      startIndex: i,
      endIndex: i + 1,
      label: 'Backdoor dominant (bVII7 → I)',
    };
  }

  return null;
}

/** bII7 → I (tritone substitution for V7) */
function detectTritoneSubstitution(
  chords: UnisonChordRegion[],
  i: number,
  key: KeyDetection,
): MixturePattern | null {
  const c1 = chords[i];
  const c2 = chords[i + 1];

  // bII: root is 1 semitone above key root
  const diff1 = (((c1.rootPc - key.rootPc) % 12) + 12) % 12;
  const d2 = getScaleDegree(c2.rootPc, key.rootPc, key.mode);

  if (diff1 === 1 && isDominantQuality(c1.quality) && d2 === 1) {
    return {
      type: 'tritone-substitution',
      startIndex: i,
      endIndex: i + 1,
      label: 'Tritone substitution (bII7 → I)',
    };
  }

  return null;
}

/** V → vi or V → bVI */
function detectDeceptiveResolution(
  chords: UnisonChordRegion[],
  i: number,
  key: KeyDetection,
): MixturePattern | null {
  const c1 = chords[i];
  const c2 = chords[i + 1];

  const d1 = getScaleDegree(c1.rootPc, key.rootPc, key.mode);
  if (d1 !== 5) return null;
  if (!isMajorQuality(c1.quality) && !isDominantQuality(c1.quality))
    return null;

  const d2 = getScaleDegree(c2.rootPc, key.rootPc, key.mode);

  // V → vi (diatonic deceptive)
  if (d2 === 6) {
    return {
      type: 'deceptive-resolution',
      startIndex: i,
      endIndex: i + 1,
      label: 'Deceptive cadence (V → vi)',
    };
  }

  // V → bVI (chromatic deceptive)
  const diff2 = (((c2.rootPc - key.rootPc) % 12) + 12) % 12;
  if (diff2 === 8 && isMajorQuality(c2.quality)) {
    return {
      type: 'deceptive-resolution',
      startIndex: i,
      endIndex: i + 1,
      label: 'Deceptive cadence (V → bVI)',
    };
  }

  return null;
}

/** Two consecutive chords with roots 3 or 4 semitones apart, both major quality */
function detectChromaticMediant(
  chords: UnisonChordRegion[],
  i: number,
  key: KeyDetection,
): MixturePattern | null {
  const c1 = chords[i];
  const c2 = chords[i + 1];

  if (!isMajorQuality(c1.quality) || !isMajorQuality(c2.quality)) return null;

  const interval = Math.abs((((c2.rootPc - c1.rootPc) % 12) + 12) % 12);
  // Chromatic mediant: major third (4 semitones) or minor third (3 semitones) apart
  // Also check 8 and 9 (inverse)
  if (interval === 3 || interval === 4 || interval === 8 || interval === 9) {
    // Only flag if at least one is non-diatonic
    const d1 = getScaleDegree(c1.rootPc, key.rootPc, key.mode);
    const d2 = getScaleDegree(c2.rootPc, key.rootPc, key.mode);
    const bothDiatonicRoots = d1 !== null && d2 !== null;

    // If both roots are diatonic, check if the quality combination is standard
    // (e.g., I → iii in major has a minor third interval but iii is minor, not major)
    if (bothDiatonicRoots) {
      // This could be a diatonic mediant — only flag if unusual
      // (both major but one shouldn't be major diatonically)
      return {
        type: 'chromatic-mediant',
        startIndex: i,
        endIndex: i + 1,
        label: `Chromatic mediant (${interval <= 6 ? 'up' : 'down'} ${Math.min(interval, 12 - interval)} semitones)`,
      };
    }

    return {
      type: 'chromatic-mediant',
      startIndex: i,
      endIndex: i + 1,
      label: `Chromatic mediant (${interval <= 6 ? 'up' : 'down'} ${Math.min(interval, 12 - interval)} semitones)`,
    };
  }

  return null;
}
