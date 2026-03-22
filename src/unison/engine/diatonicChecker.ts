/**
 * Diatonic membership checker.
 *
 * Given a chord (root pitch class + quality) and a key (root pitch class + mode),
 * determines whether the chord is diatonic to that key. Also provides scale degree
 * lookup and expected triad/tetrad quality at each degree.
 *
 * Reuses TRIADS/TETRADS for the 11 parent modes and derives qualities for the
 * remaining 24 rotational modes via interval analysis.
 */

import {
  ALL_MODES,
  TRIADS,
  TETRADS,
  FAMILY_DEGREE_ORDER,
} from '@/daw/prism-engine/data/modes';
import type { ModeName } from '@/daw/prism-engine/types';

// ── Quality derivation from intervals ────────────────────────────────────────

/** Classify a triad quality from its two intervals (in semitones from root). */
function classifyTriad(i1: number, i2: number): string {
  if (i1 === 4 && i2 === 7) return 'major';
  if (i1 === 3 && i2 === 7) return 'minor';
  if (i1 === 3 && i2 === 6) return 'diminished';
  if (i1 === 4 && i2 === 8) return 'augmented';
  if (i1 === 2 && i2 === 7) return 'sus2';
  if (i1 === 5 && i2 === 7) return 'sus4';
  // Exotic triads — return interval description
  return `triad_${i1}_${i2}`;
}

/** Classify a tetrad quality from its three intervals (in semitones from root). */
function classifyTetrad(i1: number, i2: number, i3: number): string {
  // Major 7th chords
  if (i1 === 4 && i2 === 7 && i3 === 11) return 'major7';
  if (i1 === 4 && i2 === 8 && i3 === 11) return 'major7#5';
  // Minor 7th chords
  if (i1 === 3 && i2 === 7 && i3 === 10) return 'minor7';
  if (i1 === 3 && i2 === 6 && i3 === 10) return 'minor7b5';
  // Dominant 7th chords
  if (i1 === 4 && i2 === 7 && i3 === 10) return 'dominant7';
  if (i1 === 4 && i2 === 6 && i3 === 10) return 'dominant7b5';
  // Minor-major 7th
  if (i1 === 3 && i2 === 7 && i3 === 11) return 'minormajor7';
  // Diminished 7th
  if (i1 === 3 && i2 === 6 && i3 === 9) return 'diminished7';
  // Augmented major 7th
  if (i1 === 4 && i2 === 8 && i3 === 10) return 'dominant7#5';
  // Exotic — return interval description
  return `tetrad_${i1}_${i2}_${i3}`;
}

// ── Build complete triad/tetrad tables for all 35 modes ─────────────────────

/** Parent mode for each family (the mode that has TRIADS/TETRADS entries). */
const PARENT_MODES: Record<string, ModeName> = {
  Diatonic: 'ionian',
  'Harmonic Minor': 'harmonicMinor',
  'Melodic Minor': 'melodicMinor',
  'Harmonic Major': 'harmonicMajor',
  'Double Harmonic': 'doubleHarmonicMajor',
};

interface ModeQualities {
  triads: string[];
  tetrads: string[];
}

/** Lazily computed lookup: mode name → { triads, tetrads } arrays (7 entries each). */
const qualitiesCache = new Map<string, ModeQualities>();

function getQualities(mode: string): ModeQualities {
  const cached = qualitiesCache.get(mode);
  if (cached) return cached;

  // Check if this mode has direct TRIADS/TETRADS entries
  if (mode in TRIADS) {
    const result: ModeQualities = {
      triads: TRIADS[mode as ModeName],
      tetrads: TETRADS[mode as ModeName],
    };
    qualitiesCache.set(mode, result);
    return result;
  }

  // Find which family this mode belongs to and its rotation offset
  for (const group of FAMILY_DEGREE_ORDER) {
    const idx = group.modes.indexOf(mode);
    if (idx < 0) continue;

    const parentMode = PARENT_MODES[group.label];
    if (parentMode && parentMode in TRIADS) {
      // Rotate the parent's triads/tetrads by the mode's position
      const parentTriads = TRIADS[parentMode];
      const parentTetrads = TETRADS[parentMode];
      const result: ModeQualities = {
        triads: rotateArray(parentTriads, idx),
        tetrads: rotateArray(parentTetrads, idx),
      };
      qualitiesCache.set(mode, result);
      return result;
    }

    // Parent not in TRIADS — derive from intervals
    break;
  }

  // Derive from interval structure
  const intervals = ALL_MODES[mode];
  if (!intervals) {
    const fallback: ModeQualities = { triads: [], tetrads: [] };
    qualitiesCache.set(mode, fallback);
    return fallback;
  }

  const triads: string[] = [];
  const tetrads: string[] = [];

  for (let deg = 0; deg < 7; deg++) {
    const root = intervals[deg];
    const third = intervals[(deg + 2) % 7];
    const fifth = intervals[(deg + 4) % 7];
    const seventh = intervals[(deg + 6) % 7];

    const i1 = (third - root + 12) % 12;
    const i2 = (fifth - root + 12) % 12;
    const i3 = (seventh - root + 12) % 12;

    triads.push(classifyTriad(i1, i2));
    tetrads.push(classifyTetrad(i1, i2, i3));
  }

  const result: ModeQualities = { triads, tetrads };
  qualitiesCache.set(mode, result);
  return result;
}

function rotateArray<T>(arr: T[], offset: number): T[] {
  const n = arr.length;
  const o = ((offset % n) + n) % n;
  return [...arr.slice(o), ...arr.slice(0, o)];
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the 1-based scale degree (1-7) of a pitch class within a key+mode,
 * or null if the pitch class is chromatic (not in the scale).
 */
export function getScaleDegree(
  pitchClass: number,
  keyRootPc: number,
  mode: string,
): number | null {
  const intervals = ALL_MODES[mode];
  if (!intervals) return null;

  const diff = (((pitchClass - keyRootPc) % 12) + 12) % 12;
  const idx = intervals.indexOf(diff);
  return idx >= 0 ? idx + 1 : null;
}

/**
 * Returns the expected triad and tetrad quality at a given scale degree (1-7)
 * for a mode. Returns undefined qualities if the mode or degree is invalid.
 */
export function getExpectedQualities(
  degree: number,
  mode: string,
): { triad: string | undefined; tetrad: string | undefined } {
  if (degree < 1 || degree > 7) return { triad: undefined, tetrad: undefined };
  const q = getQualities(mode);
  return {
    triad: q.triads[degree - 1],
    tetrad: q.tetrads[degree - 1],
  };
}

/**
 * Returns true if the given chord (rootPc + quality) is diatonic to key+mode.
 *
 * A chord is diatonic when:
 *   1. Its root pitch class falls on a scale degree of the key+mode
 *   2. Its quality matches the expected triad or tetrad at that degree
 *
 * Extended qualities (e.g., dominant9) are matched against their base form
 * (e.g., dominant7) for flexibility.
 */
export function isDiatonic(
  chordRootPc: number,
  chordQuality: string,
  keyRootPc: number,
  mode: string,
): boolean {
  const degree = getScaleDegree(chordRootPc, keyRootPc, mode);
  if (degree === null) return false;

  const expected = getExpectedQualities(degree, mode);
  const normalized = normalizeQuality(chordQuality);

  // Check triad match
  if (expected.triad && normalizeQuality(expected.triad) === normalized)
    return true;

  // Check tetrad match
  if (expected.tetrad && normalizeQuality(expected.tetrad) === normalized)
    return true;

  // For extended chords (9ths, 11ths, 13ths), check if the base quality matches
  const base = baseQuality(chordQuality);
  if (base !== chordQuality) {
    const baseNorm = normalizeQuality(base);
    if (expected.triad && normalizeQuality(expected.triad) === baseNorm)
      return true;
    if (expected.tetrad && normalizeQuality(expected.tetrad) === baseNorm)
      return true;
  }

  return false;
}

// ── Quality normalization ────────────────────────────────────────────────────

/** Normalize quality strings to handle abbreviation variants. */
function normalizeQuality(q: string): string {
  // Handle common abbreviations
  const map: Record<string, string> = {
    maj: 'major',
    min: 'minor',
    dim: 'diminished',
    aug: 'augmented',
    dom: 'dominant',
    maj7: 'major7',
    min7: 'minor7',
    dom7: 'dominant7',
    dim7: 'diminished7',
    min7b5: 'minor7b5',
  };
  return map[q] ?? q;
}

/** Reduce extended qualities to their base 7th chord form. */
function baseQuality(q: string): string {
  const map: Record<string, string> = {
    dominant9: 'dominant7',
    dominant11: 'dominant7',
    dominant13: 'dominant7',
    major9: 'major7',
    major13: 'major7',
    minor9: 'minor7',
    minor11: 'minor7',
    minor13: 'minor7',
    dominant7sus2: 'dominant7',
    dominant7sus4: 'dominant7',
    major7sus2: 'major7',
    major7sus4: 'major7',
    'dominant7#11': 'dominant7',
    dominant7b9: 'dominant7',
    'dominant7#9': 'dominant7',
    'major7#11': 'major7',
    major7b5: 'major7',
    'minor7#5': 'minor7',
  };
  return map[q] ?? q;
}
