/**
 * Phase 3 — Canonical degree→MIDI converter.
 *
 * Single function used by voicing engine, melody pipeline, bass pipeline,
 * and progression pipeline to resolve degree notation into absolute MIDI notes.
 *
 * Uses the Chromatic MIDI Mapping table from the Algorithms doc:
 *   1=0, b2=1, 2=2, #2/b3=3, 3=4, 4=5, #4/b5=6, 5=7,
 *   #5/b6=8, 6=9, b7=10, 7=11, 8=12, b9=13, 9=14, #9=15, ...
 */

import { CHORDS } from '@prism/engine';
import { curriculumToEngineChordId } from './chordIdMap';

/**
 * Chromatic MIDI mapping: degree string → semitone offset from root.
 * Covers degrees 1 through compound intervals (b9, 9, #9, 11, #11, b13, 13).
 */
const DEGREE_TO_SEMITONE: Record<string, number> = {
  '1': 0,
  b2: 1,
  '2': 2,
  '#2': 3,
  b3: 3,
  '3': 4,
  '4': 5,
  '#4': 6,
  b5: 6,
  '5': 7,
  '#5': 8,
  b6: 8,
  '6': 9,
  '#6': 10,
  b7: 10,
  '7': 11,
  '8': 12,
  b9: 13,
  '9': 14,
  '#9': 15,
  '10': 16,
  b11: 16,
  '11': 17,
  '#11': 18,
  b12: 19,
  '12': 19,
  b13: 20,
  '13': 21,
};

/**
 * Parse a degree string into its numeric modifier and base degree.
 *
 * Examples:
 * - "1" → { modifier: 0, degree: 1 }
 * - "b3" → { modifier: -1, degree: 3 }
 * - "#4" → { modifier: 1, degree: 4 }
 */
export function parseDegree(degreeStr: string): {
  modifier: -1 | 0 | 1;
  degree: number;
} {
  const trimmed = degreeStr.trim();
  if (trimmed.startsWith('b')) {
    return { modifier: -1, degree: parseInt(trimmed.slice(1), 10) };
  }
  if (trimmed.startsWith('#')) {
    return { modifier: 1, degree: parseInt(trimmed.slice(1), 10) };
  }
  return { modifier: 0, degree: parseInt(trimmed, 10) };
}

/**
 * Convert a degree string to a semitone offset from the root.
 *
 * @param degreeStr - e.g. "1", "b3", "#4", "b7", "b9"
 * @returns semitone offset (0-21), or undefined if unknown
 */
export function degreeToSemitone(degreeStr: string): number | undefined {
  return DEGREE_TO_SEMITONE[degreeStr.trim()];
}

/**
 * Resolve a degree + quality in a given key to absolute MIDI values.
 *
 * This is the canonical resolver used throughout the curriculum module:
 * voicing engine, melody pipeline, bass pipeline, progression pipeline.
 *
 * @param degreeStr - Scale degree: "1", "b3", "#4", "b7", etc.
 * @param quality - Chord quality (curriculum or engine ID): "maj", "major7", "dom7", etc.
 * @param keyRoot - MIDI note number of the key root (e.g. 60 for C4)
 * @returns Object with root MIDI note and interval array, or undefined if quality not found
 *
 * @example
 * resolveInKey("1", "maj", 60)
 * // → { root: 60, intervals: [0, 4, 7] }
 *
 * resolveInKey("b3", "dom7", 60)
 * // → { root: 63, intervals: [0, 4, 7, 10] }
 */
export function resolveInKey(
  degreeStr: string,
  quality: string,
  keyRoot: number,
): { root: number; intervals: number[] } | undefined {
  const semitoneOffset = degreeToSemitone(degreeStr);
  if (semitoneOffset === undefined) return undefined;

  const chordRoot = keyRoot + semitoneOffset;

  // Try engine ID directly first, then translate from curriculum ID
  let intervals = CHORDS[quality];
  if (!intervals) {
    const engineId = curriculumToEngineChordId(quality);
    intervals = CHORDS[engineId];
  }

  if (!intervals) return undefined;

  return { root: chordRoot, intervals };
}

/**
 * Resolve a degree-quality string (e.g. "1 major7", "b3 dominant7")
 * into absolute MIDI note numbers.
 *
 * @param degreeChordStr - Combined string: "1 major7", "b3 minor7"
 * @param keyRoot - MIDI note number of the key root
 * @returns Array of absolute MIDI note numbers, or undefined
 */
export function resolveChordToMidi(
  degreeChordStr: string,
  keyRoot: number,
): number[] | undefined {
  const spaceIdx = degreeChordStr.indexOf(' ');
  if (spaceIdx === -1) return undefined;

  const degreeStr = degreeChordStr.slice(0, spaceIdx);
  const quality = degreeChordStr.slice(spaceIdx + 1);

  const resolved = resolveInKey(degreeStr, quality, keyRoot);
  if (!resolved) return undefined;

  return resolved.intervals.map((interval) => resolved.root + interval);
}

/**
 * Resolve a scale degree to a single MIDI note (no chord quality).
 * Used for melody and bass note resolution.
 *
 * @param degreeStr - Scale degree: "1", "b3", "#4", "b7", etc.
 * @param keyRoot - MIDI note number of the key root
 * @returns Absolute MIDI note number, or undefined
 */
export function resolveDegreeToMidi(
  degreeStr: string,
  keyRoot: number,
): number | undefined {
  const semitoneOffset = degreeToSemitone(degreeStr);
  if (semitoneOffset === undefined) return undefined;
  return keyRoot + semitoneOffset;
}

/**
 * Parse a progression string (dash-separated degree-chord pairs)
 * into an array of resolved chords.
 *
 * @param progressionStr - e.g. "1 major7 - 2 minor7 - 5 dominant7 - 1 major7"
 * @param keyRoot - MIDI note number of the key root
 * @returns Array of { degree, quality, root, intervals, midi }
 */
export function resolveProgression(
  progressionStr: string,
  keyRoot: number,
): Array<{
  degree: string;
  quality: string;
  root: number;
  intervals: number[];
  midi: number[];
}> {
  const chords = progressionStr
    .split('-')
    .map((s) => s.trim())
    .filter(Boolean);

  const results: Array<{
    degree: string;
    quality: string;
    root: number;
    intervals: number[];
    midi: number[];
  }> = [];

  for (const chord of chords) {
    const spaceIdx = chord.indexOf(' ');
    if (spaceIdx === -1) continue;

    const degree = chord.slice(0, spaceIdx);
    const quality = chord.slice(spaceIdx + 1);
    const resolved = resolveInKey(degree, quality, keyRoot);

    if (resolved) {
      results.push({
        degree,
        quality,
        root: resolved.root,
        intervals: resolved.intervals,
        midi: resolved.intervals.map((i) => resolved.root + i),
      });
    }
  }

  return results;
}
