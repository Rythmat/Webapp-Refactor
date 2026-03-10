/**
 * Phase 10 — Bass Generation Pipeline.
 *
 * Generates a bass line for a given progression + genre + level:
 *   Voiced chords → extract bass roots → apply bass contour pattern
 *     → apply bass rhythm pattern → MidiNoteEvent[]
 *
 * Bass notes are derived from chord roots (LH assignment) and shaped
 * by genre-specific contour and rhythm patterns from the curriculum.
 */

import { genreToSlug } from '../bridge/genreBridge';
import {
  getBassContour,
  getBassRhythm,
  getBassRhythmsForGenre,
  BASS_CONTOUR_PATTERNS,
  BASS_RHYTHM_PATTERNS,
  type BassContourEntry,
  type BassRhythmEntry,
} from '../data/bassPatterns';
import type { GenreCurriculumEntry } from '../types/curriculum';
import type { MidiNoteEvent } from './melodyPipeline';
import type { VoicedProgressionChord } from './progressionPipeline';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Bass contour degree → semitone offset from root */
const BASS_DEGREE_MAP: Record<string, number> = {
  R: 0,
  '8': 12,
  b2: 1,
  '2': 2,
  b3: 3,
  '3': 4,
  '4': 5,
  '#4': 6,
  b5: 6,
  P5: 7,
  '5': 7,
  '#5': 8,
  b6: 8,
  '6': 9,
  b7: 10,
  '7': 11,
  // Compound intervals (for extended contours)
  b9: 13,
  '9': 14,
  '#9': 15,
  '11': 17,
  '#11': 18,
  b13: 20,
  '13': 21,
};

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

/**
 * Generate a curriculum bass line from a voiced progression.
 *
 * @param progression - Voiced chord progression with timing
 * @param gcmEntry - Genre Curriculum Map entry
 * @param keyRoot - MIDI note of the key root
 * @returns Array of MidiNoteEvent objects for bass
 */
export function generateCurriculumBass(
  progression: VoicedProgressionChord[],
  gcmEntry: GenreCurriculumEntry,
  _keyRoot: number,
): MidiNoteEvent[] {
  const genreSlug = genreToSlug(gcmEntry.genre);
  const bass = gcmEntry.bass;

  // Select a bass contour pattern
  const contour = selectBassContour(bass.bassContours);

  // Select a bass rhythm pattern for this genre
  const rhythm = selectBassRhythm(genreSlug, bass.bassRhythms);

  if (!contour && !rhythm) {
    // Simple fallback: play chord roots with chord timing
    return generateSimpleBass(progression);
  }

  const events: MidiNoteEvent[] = [];

  for (const chord of progression) {
    const bassRoot = chord.lh ?? chord.chordRoot - 12;

    if (contour && rhythm) {
      // Full pattern: contour degrees + rhythm timing
      const chordEvents = applyBassPattern(
        bassRoot,
        contour,
        rhythm,
        chord.onset,
      );
      events.push(...chordEvents);
    } else if (rhythm) {
      // Rhythm only: play root on each rhythm hit
      const chordEvents = rhythm.computerArray.map(([onset, dur]) => ({
        note: bassRoot,
        onset: chord.onset + onset,
        duration: dur,
      }));
      events.push(...chordEvents);
    } else if (contour) {
      // Contour only: play contour degrees with even spacing
      const noteCount = contour.contour.length;
      const ticksPerNote = Math.floor(chord.duration / noteCount);
      contour.contour.forEach((degree, i) => {
        const semitones = BASS_DEGREE_MAP[degree] ?? 0;
        events.push({
          note: bassRoot + semitones,
          onset: chord.onset + i * ticksPerNote,
          duration: ticksPerNote,
        });
      });
    }
  }

  return events;
}

// ---------------------------------------------------------------------------
// Pattern application
// ---------------------------------------------------------------------------

/**
 * Apply a bass contour + rhythm pattern over a single chord.
 * Pairs contour degrees with rhythm timing events.
 */
function applyBassPattern(
  bassRoot: number,
  contour: BassContourEntry,
  rhythm: BassRhythmEntry,
  chordOnset: number,
): MidiNoteEvent[] {
  const degrees = contour.contour;
  const timings = rhythm.computerArray;
  const len = Math.min(degrees.length, timings.length);

  const events: MidiNoteEvent[] = [];
  for (let i = 0; i < len; i++) {
    const semitones = BASS_DEGREE_MAP[degrees[i]] ?? 0;
    events.push({
      note: bassRoot + semitones,
      onset: chordOnset + timings[i][0],
      duration: timings[i][1],
    });
  }

  return events;
}

// ---------------------------------------------------------------------------
// Pattern selection
// ---------------------------------------------------------------------------

/**
 * Select a bass contour pattern from GCM-specified IDs or random fallback.
 */
function selectBassContour(contourIds: string[]): BassContourEntry | undefined {
  if (contourIds.length > 0) {
    // Try GCM-specified contour IDs
    const id = pickRandom(contourIds)!;
    const found = getBassContour(id);
    if (found) return found;
  }

  // Random fallback from all contours
  if (BASS_CONTOUR_PATTERNS.length > 0) {
    return pickRandom(BASS_CONTOUR_PATTERNS)!;
  }

  return undefined;
}

/**
 * Select a bass rhythm pattern for a genre.
 */
function selectBassRhythm(
  genreSlug: string,
  rhythmIds: string[],
): BassRhythmEntry | undefined {
  if (rhythmIds.length > 0) {
    // Try GCM-specified rhythm IDs
    const id = pickRandom(rhythmIds)!;
    const found = getBassRhythm(id);
    if (found) return found;
  }

  // Fallback: genre-specific rhythms
  const genreRhythms = getBassRhythmsForGenre(genreSlug);
  if (genreRhythms.length > 0) {
    return pickRandom(genreRhythms)!;
  }

  // Ultimate fallback: any rhythm
  if (BASS_RHYTHM_PATTERNS.length > 0) {
    return pickRandom(BASS_RHYTHM_PATTERNS)!;
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Fallback
// ---------------------------------------------------------------------------

/**
 * Simple bass: play chord roots with chord timing.
 * Used when no bass patterns are available.
 */
function generateSimpleBass(
  progression: VoicedProgressionChord[],
): MidiNoteEvent[] {
  return progression.map((chord) => ({
    note: chord.lh ?? chord.chordRoot - 12,
    onset: chord.onset,
    duration: chord.duration,
  }));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pickRandom<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}
