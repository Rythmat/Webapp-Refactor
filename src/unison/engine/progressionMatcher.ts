/**
 * Match detected chord regions against the 589-entry chord progression library.
 *
 * Strategy:
 *   1. Extract hybrid name sequence from UnisonChordRegions, a chord held
 *      across several regions counted once
 *   2. Sliding window comparison against library entries, at least three
 *      chords long (or the whole pattern or song, when shorter)
 *   3. Circular matching (detected progression may start mid-pattern)
 *   4. Score per chord: exact match = 1.0, the same chord with or without its
 *      7th (or another colour) = 0.8, same degree another kind = 0.4; the
 *      window's score is weighed by how much of the pattern or the song it
 *      covers, so a two-chord fragment never reads as a sure match
 *      (2026-10-21: short windows scored 100% and crowded the list)
 *   5. Return the top matches above the threshold, one per progression,
 *      with inherited vibes/styles
 *
 * The library counts every progression from a major key's tonic. A song in a
 * minor or modal key is matched in its parent major (A aeolian's
 * '1 minor - b6 major' is '6 minor - 4 major') and the matches are told back
 * in the song's own degrees, as its chord cards are (owner, 2026-10-25: a
 * minor song matched nothing, its '1 minor' never being a library chord).
 */
import { ionianToModeLabel, modeToIonianLabel } from '@prism/engine';
import CHORD_PROGRESSION_LIBRARY, {
  type ChordProgressionEntry,
} from '@/curriculum/data/chordProgressionLibrary';
import type {
  UnisonChordRegion,
  ProgressionMatchResult,
} from '../types/schema';

// ── Configuration ─────────────────────────────────────────────────────────────

const MIN_SCORE = 0.7;
const MAX_RESULTS = 10;
/** Shorter windows only when the pattern or the song is this short. */
const MIN_WINDOW = 3;
/** A rotated pattern ranks just under the one the song starts on. */
const ROTATION_PENALTY = 0.02;

// ── Core ──────────────────────────────────────────────────────────────────────

/**
 * Match a sequence of analyzed chord regions against the progression library.
 */
export function matchProgressions(
  regions: UnisonChordRegion[],
  mode = 'ionian',
): ProgressionMatchResult[] {
  if (regions.length === 0) return [];

  const detected = collapseRepeats(
    regions.map((r) => modeToIonianLabel(r.hybridName, mode)),
  );
  // One entry per progression as the song reads it: the library lists some
  // under several songs, and some as rotations of each other.
  const byProgression = new Map<string, ProgressionMatchResult>();

  for (const entry of CHORD_PROGRESSION_LIBRARY) {
    const match = bestMatch(detected, entry);
    if (!match || match.score < MIN_SCORE) continue;
    const kept = byProgression.get(match.progression);
    if (!kept || match.score > kept.score) {
      byProgression.set(match.progression, match);
    }
  }

  // Sort by score descending, then by match length descending
  const results = [...byProgression.values()];
  results.sort((a, b) => b.score - a.score || b.matchLength - a.matchLength);
  return results.slice(0, MAX_RESULTS).map((match) => inMode(match, mode));
}

/** A match told in the song's own degrees, from its parent major's. */
function inMode(
  match: ProgressionMatchResult,
  mode: string,
): ProgressionMatchResult {
  const toMode = (label: string) => ionianToModeLabel(label, mode);
  const progression = match.progression.split(' - ').map(toMode).join(' - ');
  if (progression === match.progression) return match;
  return {
    ...match,
    progression,
    matchedChords: match.matchedChords.map(toMode),
  };
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
  let bestRotation = 0;

  // What a window must cover to be sure: the whole pattern, and the song's
  // loop (a song that plays I–V–vi–IV twice is a 4-chord loop).
  const loop = loopLength(detected);
  const whole = Math.max(libChords.length, loop);
  const minWindow = Math.max(
    2,
    Math.min(MIN_WINDOW, libChords.length, detected.length),
  );

  // Try each circular rotation of the library pattern
  for (let rotation = 0; rotation < libChords.length; rotation++) {
    const rotated = rotateArray(libChords, rotation);

    // Sliding window: try every starting position in the detected sequence
    for (let start = 0; start <= detected.length - 1; start++) {
      const windowLen = Math.min(rotated.length, detected.length - start);
      if (windowLen < minWindow) continue;

      let totalScore = 0;
      const matched: string[] = [];

      for (let i = 0; i < windowLen; i++) {
        const chordScore = compareChords(detected[start + i], rotated[i]);
        totalScore += chordScore;
        matched.push(detected[start + i]);
      }

      // How alike the chords are, weighed by how much of the pattern and of
      // the song's loop the window covers; a pattern the song doesn't start
      // its loop on (a rotation, or the loop read from its middle) reads a
      // touch less sure than the one it does.
      const coverage = Math.min(1, windowLen / whole);
      const normalizedScore =
        (totalScore / windowLen) * (0.6 + 0.4 * coverage) -
        (rotation === 0 && start % loop === 0 ? 0 : ROTATION_PENALTY);

      if (normalizedScore > bestScore) {
        bestScore = normalizedScore;
        bestStartIndex = start;
        bestRotation = rotation;
        bestMatchLength = windowLen;
        bestMatchedChords = matched;
      }
    }
  }

  if (bestScore < MIN_SCORE) return null;

  return {
    libraryId: entry.id,
    progression: alignedProgression(entry, bestRotation, bestStartIndex),
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

/**
 * The pattern told from the chord the song starts on, as its chord cards
 * run (owner, 2026-10-25): a match found mid-pattern (the song's I–V–vi–IV
 * against a library vi–IV–I–V) reads I–V–vi–IV, not the library's order.
 */
function alignedProgression(
  entry: ChordProgressionEntry,
  rotation: number,
  start: number,
): string {
  const len = entry.chords.length;
  const turn = (((rotation - start) % len) + len) % len;
  return turn === 0
    ? entry.progression
    : rotateArray(entry.chords, turn).join(' - ');
}

// ── Chord Comparison ──────────────────────────────────────────────────────────

/**
 * Compare two hybrid-name chords.
 *   - Exact match: 1.0
 *   - Same degree, same kind of chord (C and Cmaj7, G and G7): 0.8
 *   - Same degree, another kind (C and Cm): 0.4
 *   - Different degree: 0.0
 */
function compareChords(a: string, b: string): number {
  if (a === b) return 1.0;

  const degreeA = extractDegree(a);
  const degreeB = extractDegree(b);

  if (degreeA !== degreeB) return 0;
  return chordFamily(extractQuality(a)) === chordFamily(extractQuality(b))
    ? 0.8
    : 0.4;
}

/** The quality after the degree ('major7' in '1 major7'). */
function extractQuality(hybridName: string): string {
  const spaceIdx = hybridName.indexOf(' ');
  return spaceIdx > 0 ? hybridName.slice(spaceIdx + 1) : 'major';
}

/**
 * The triad a quality is built on: what a chord sounds like before its
 * 7th, 6th, 9th or other colour.
 */
function chordFamily(quality: string): string {
  const q = quality.toLowerCase();
  if (q.startsWith('half') || q.includes('m7b5') || q.startsWith('dim')) {
    return 'diminished';
  }
  if (q.startsWith('aug') || q.includes('#5')) return 'augmented';
  if (q.startsWith('sus')) return 'sus';
  if (q.startsWith('maj')) return 'major';
  if (q.startsWith('min') || q.startsWith('m')) return 'minor';
  return 'major';
}

/**
 * The shortest run of chords the song repeats (the whole song when it
 * doesn't): I–V–vi–IV–I–V–vi–IV is 4, I–IV–V–I is 4.
 */
function loopLength(names: string[]): number {
  for (let period = 1; period < names.length; period++) {
    // A loop must come round at least once in full.
    if (period * 2 > names.length) break;
    if (names.every((name, i) => name === names[i % period])) return period;
  }
  return names.length;
}

/** A chord held across several regions in a row counts once. */
function collapseRepeats(names: string[]): string[] {
  return names.filter((name, i) => i === 0 || name !== names[i - 1]);
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
