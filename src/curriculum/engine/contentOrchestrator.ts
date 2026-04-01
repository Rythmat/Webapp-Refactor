/**
 * Phase 10 — Content Orchestrator.
 *
 * Top-level function that combines melody, chord progression, and bass
 * pipelines to generate a complete activity for a given genre+level+key.
 *
 * This produces the raw musical content that Activity Flows render.
 */

import type { CurriculumGenreId } from '../bridge/genreIdMap';
import { getGCMEntry, getSwingValue, getTempoRange } from '../data/gcmHelpers';
import type { CurriculumLevelId } from '../types/curriculum';
import { generateCurriculumBass } from './bassPipeline';
import { generateCurriculumMelody, type MidiNoteEvent } from './melodyPipeline';
import {
  generateCurriculumProgression,
  type VoicedProgressionChord,
} from './progressionPipeline';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GeneratedActivity {
  /** Genre (uppercase ID) */
  genre: CurriculumGenreId;
  /** Level ID (L1, L2, L3) */
  level: CurriculumLevelId;
  /** MIDI note of the key root */
  keyRoot: number;
  /** Tempo in BPM */
  tempo: number;
  /** Swing value (0-10) */
  swing: number;
  /** Generated melody events */
  melody: MidiNoteEvent[];
  /** Voiced chord progression with timing */
  progression: VoicedProgressionChord[];
  /** Bass line events */
  bass: MidiNoteEvent[];
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

/**
 * Generate a complete activity with melody, chords, and bass.
 *
 * @param genre - Curriculum genre ID (e.g., 'JAZZ', 'POP')
 * @param level - Curriculum level (e.g., 'L1', 'L2', 'L3')
 * @param keyRoot - MIDI note of the key root (e.g. 60 for C4)
 * @param tempo - Optional tempo override. If omitted, picks from GCM range.
 * @returns GeneratedActivity with all three musical components
 */
export function generateFullActivity(
  genre: CurriculumGenreId,
  level: CurriculumLevelId,
  keyRoot: number,
  tempo?: number,
): GeneratedActivity {
  const gcmEntry = getGCMEntry(genre, level);

  // Determine tempo
  const tempoRange = getTempoRange(genre, level);
  const resolvedTempo = tempo ?? randomInRange(tempoRange[0], tempoRange[1]);

  // Determine swing
  const swing = getSwingValue(genre, level);

  // Generate melody
  const melody = generateCurriculumMelody(gcmEntry, keyRoot, swing);

  // Generate chord progression
  const progression = generateCurriculumProgression(gcmEntry, keyRoot);

  // Generate bass from progression
  const bass = generateCurriculumBass(progression, gcmEntry, keyRoot);

  return {
    genre,
    level,
    keyRoot,
    tempo: resolvedTempo,
    swing,
    melody,
    progression,
    bass,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Pick a random integer in [min, max] inclusive.
 */
function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
