/**
 * Phase 10 — Chord Progression Pipeline.
 *
 * Generates a voiced chord progression for a given genre+level+key:
 *   GCM → filter progressions by style + complexity → select one
 *     → parse chords → voice each chord → apply voice leading → VoicedChord[]
 */

import { genreToSlug } from '../bridge/genreBridge';
import { degreeToSemitone } from '../bridge/resolveInKey';
import {
  getProgressionsByStyle,
  getProgressionsByComplexity,
  type ChordProgressionEntry,
} from '../data/chordProgressionLibrary';
import { getVoicingsForGenreLevel } from '../data/genreVoicingTaxonomy';
import type { GenreCurriculumEntry } from '../types/curriculum';
import { voiceLeadSequence } from './voiceLeading';
import { getVoicingForContext, type VoicedChord } from './voicingEngine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VoicedProgressionChord extends VoicedChord {
  /** Start time in ticks (PPQ=480) */
  onset: number;
  /** Duration in ticks */
  duration: number;
  /** Scale degree string (e.g., '1', 'b3', '5') */
  degree: string;
  /** Chord quality ID (e.g., 'maj7', 'dom7') */
  qualityId: string;
  /** Absolute MIDI chord root */
  chordRoot: number;
}

/** Maps GCM level to complexity tier */
const LEVEL_TO_COMPLEXITY: Record<string, string> = {
  L1: 'triad',
  L2: '7th',
  L3: 'extended',
};

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

/**
 * Generate a voiced chord progression for a genre+level.
 *
 * @param gcmEntry - Genre Curriculum Map entry
 * @param keyRoot - MIDI note of the key root (e.g. 60 for C4)
 * @param useVoiceLeading - Whether to apply voice leading (default true)
 * @returns Array of VoicedProgressionChord with timing
 */
export function generateCurriculumProgression(
  gcmEntry: GenreCurriculumEntry,
  keyRoot: number,
  useVoiceLeading: boolean = true,
): VoicedProgressionChord[] {
  const genre = gcmEntry.genre;
  const level = gcmEntry.level;
  const genreSlug = genreToSlug(genre);

  // Select a progression from the library
  const progression = selectProgression(genreSlug, level);
  if (!progression) return [];

  // Parse chord strings into degree + quality pairs
  const parsedChords = parseChordStrings(progression.chords);

  // Resolve each chord's absolute root from degree + key
  const levelNum = parseInt(level.slice(1), 10);
  const chordsWithRoots = parsedChords.map((c) => ({
    ...c,
    chordRoot: keyRoot + (degreeToSemitone(c.degree) ?? 0),
  }));

  // Voice each chord using the voicing engine
  const voicedChords = chordsWithRoots.map((c) =>
    getVoicingForContext(
      genreSlug,
      levelNum,
      c.qualityId,
      c.chordRoot,
      c.degree,
    ),
  );

  // Apply voice leading if requested
  let finalChords = voicedChords;
  if (useVoiceLeading && voicedChords.length > 1) {
    // Get the semitone offsets for voice leading computation
    const taxonomy = getVoicingsForGenreLevel(genreSlug, levelNum);
    const offsets = chordsWithRoots.map((c, idx) => {
      const entry = taxonomy.find((t) => t.qualityId === c.qualityId);
      if (entry?.rhOverride) return entry.rhOverride;
      // Fallback: use the RH notes relative to chord root
      return voicedChords[idx].rh.map((n) => n - c.chordRoot);
    });
    finalChords = voiceLeadSequence(voicedChords, offsets);
  }

  // Assign timing: equal duration per chord
  const beatsPerChord = Math.max(1, Math.floor(4 / parsedChords.length));
  const ticksPerChord = beatsPerChord * 480; // 480 ticks per beat

  return finalChords.map((chord, i) => ({
    ...chord,
    onset: i * ticksPerChord,
    duration: ticksPerChord,
    degree: chordsWithRoots[i].degree,
    qualityId: chordsWithRoots[i].qualityId,
    chordRoot: chordsWithRoots[i].chordRoot,
  }));
}

// ---------------------------------------------------------------------------
// Progression selection
// ---------------------------------------------------------------------------

/**
 * Select a progression from the library filtered by style and complexity.
 * Uses a multi-tier fallback:
 * 1. Match style + complexity
 * 2. Match style only
 * 3. Match complexity only
 * 4. Fallback to I-IV-V-I
 */
function selectProgression(
  genreSlug: string,
  level: string,
): ChordProgressionEntry | undefined {
  const complexity = LEVEL_TO_COMPLEXITY[level] ?? '7th';

  // Tier 1: style + complexity
  const byStyle = getProgressionsByStyle(genreSlug);
  const byBoth = byStyle.filter((p) => p.complexity === complexity);
  if (byBoth.length > 0) return pickRandom(byBoth);

  // Tier 2: style only
  if (byStyle.length > 0) return pickRandom(byStyle);

  // Tier 3: complexity only
  const byComplexity = getProgressionsByComplexity(complexity);
  if (byComplexity.length > 0) return pickRandom(byComplexity);

  // Tier 4: fallback
  return {
    id: 0,
    progression: '1 major - 4 major - 5 major - 1 major',
    chords: ['1 major', '4 major', '5 major', '1 major'],
    chordCount: 4,
    startingChord: '1 major',
    startingDegree: '1',
    complexity: 'triad',
    vibes: [],
    styles: [],
    artist: '',
    song: '',
  };
}

// ---------------------------------------------------------------------------
// Chord parsing
// ---------------------------------------------------------------------------

/**
 * Parse a chord string like "1 major7" into { degree, qualityId }.
 * Handles Denver Number System notation.
 */
function parseChordString(chordStr: string): {
  degree: string;
  qualityId: string;
} {
  const trimmed = chordStr.trim();
  const spaceIdx = trimmed.indexOf(' ');
  if (spaceIdx === -1) {
    return { degree: trimmed, qualityId: 'maj' };
  }
  return {
    degree: trimmed.slice(0, spaceIdx),
    qualityId: normalizeQualityId(trimmed.slice(spaceIdx + 1).trim()),
  };
}

/**
 * Parse an array of chord strings.
 */
function parseChordStrings(
  chords: string[],
): Array<{ degree: string; qualityId: string }> {
  return chords.map(parseChordString);
}

/**
 * Normalize engine-style quality names to curriculum IDs.
 * e.g., "major7" → "maj7", "dominant7" → "dom7", "minor" → "min"
 */
function normalizeQualityId(quality: string): string {
  const q = quality.toLowerCase().replace(/\s/g, '');

  // Map long-form engine names to short curriculum IDs
  const map: Record<string, string> = {
    major: 'maj',
    minor: 'min',
    augmented: 'aug',
    diminished: 'dim',
    major7: 'maj7',
    minor7: 'min7',
    dominant7: 'dom7',
    'major7#5': 'maj7_s5',
    major7b5: 'maj7_b5',
    minor7b5: 'min7b5',
    'minor7#5': 'min7_s5',
    minormajor7: 'min_maj7',
    dominant7b9: 'dom7b9',
    'dominant7#9': 'dom7s9',
    dominant7b5: 'dom7b5',
    'dominant7#5': 'dom7s5',
    'dominant7#11': 'dom7s11',
    dominant9: 'dom9',
    major9: 'maj9',
    minor9: 'min9',
    dominant11: 'dom11',
    minor11: 'min11',
    dominant13: 'dom13',
    minor13: 'min13',
    major13: 'maj13',
  };

  return map[q] ?? q;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
