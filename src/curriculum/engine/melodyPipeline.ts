/**
 * Phase 10 — Melody Generation Pipeline.
 *
 * Generates a curriculum melody for a given genre+level+key:
 *   GCM → scale → contour selection (by note_count + tier)
 *     → phrase rhythm selection (by genre + note_count)
 *       → resolve through scale → zip with rhythm → MidiNoteEvent[]
 *
 * Contour concatenation: when GCM specifies 2× contours, chains them
 * with bar offset (+1920 ticks for bar 2).
 *
 * Swing application: if GCM specifies a swing value, applies swing
 * displacement to generated tick onsets.
 */

import {
  getContours,
  type MelodyContourEntry,
} from '../data/melodyContourLibrary';
import {
  getPhraseRhythms,
  type PhraseRhythmEntry,
} from '../data/melodyPhraseRhythmLibrary';
import type {
  GenreCurriculumEntry,
  ScaleDefinition,
} from '../types/curriculum';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MidiNoteEvent {
  /** MIDI note number (0-127) */
  note: number;
  /** Start time in ticks (PPQ=480) */
  onset: number;
  /** Duration in ticks */
  duration: number;
}

/** PPQ = 480 ticks per quarter note, bar = 1920 ticks */
const TICKS_PER_BAR = 1920;

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

/**
 * Generate a curriculum melody for a given genre+level combination.
 *
 * @param gcmEntry - The Genre Curriculum Map entry
 * @param keyRoot - MIDI note number of the key root (e.g. 60 for C4)
 * @param swingAmount - Swing value (0-10, 0 = straight). Auto-derived from GCM if not provided.
 * @returns Array of MidiNoteEvent objects
 */
export function generateCurriculumMelody(
  gcmEntry: GenreCurriculumEntry,
  keyRoot: number,
  swingAmount?: number,
): MidiNoteEvent[] {
  const mel = gcmEntry.melody;
  const scale = mel.scale;

  // Pick a random note count from GCM options
  const noteCount = pickRandom(mel.contourNotes);
  if (noteCount === undefined) return [];

  // Select a contour matching note_count and tier constraints
  const contour = selectContour(noteCount, mel.contourTiers);
  if (!contour) return [];

  // Determine phrase rhythm bars
  const bars = resolvePhraseBars(mel.phraseRhythmBars);

  // Select a phrase rhythm matching genre, note_count, bars
  const rhythm = selectPhraseRhythm(mel.phraseRhythmGenre, noteCount, bars);
  if (!rhythm) return [];

  // Pick a zero point from GCM options
  const zeroPoint = pickRandom(mel.zeroPointOptions) ?? 0;

  // Resolve contour through scale → MIDI notes
  const midiNotes = resolveContourThroughScale(
    contour.contour,
    scale,
    keyRoot,
    zeroPoint,
  );

  // Zip melody notes with rhythm timing
  let events = zipMelody(midiNotes, rhythm.computerArray);

  // Handle contour concatenation (2-bar phrases)
  if (mel.contourConcat >= 2 && bars === 1) {
    const contour2 = selectContour(noteCount, mel.contourTiers);
    if (contour2) {
      const rhythm2 = selectPhraseRhythm(mel.phraseRhythmGenre, noteCount, 1);
      if (rhythm2) {
        const midiNotes2 = resolveContourThroughScale(
          contour2.contour,
          scale,
          keyRoot,
          zeroPoint,
        );
        const events2 = zipMelody(midiNotes2, rhythm2.computerArray);
        // Offset bar 2 events
        const bar2Events = events2.map((e) => ({
          ...e,
          onset: e.onset + TICKS_PER_BAR,
        }));
        events = [...events, ...bar2Events];
      }
    }
  }

  // Apply swing if specified
  const swing = swingAmount ?? resolveSwing(gcmEntry.global.swing);
  if (swing > 0) {
    events = applySwing(events, swing);
  }

  return events;
}

// ---------------------------------------------------------------------------
// Contour selection
// ---------------------------------------------------------------------------

/**
 * Select a contour from the library matching note count and tier constraints.
 */
function selectContour(
  noteCount: number,
  tiers: number[],
): MelodyContourEntry | undefined {
  const candidates = getContours(noteCount, tiers);
  if (candidates.length === 0) return undefined;
  return pickRandom(candidates)!;
}

// ---------------------------------------------------------------------------
// Phrase rhythm selection
// ---------------------------------------------------------------------------

/**
 * Select a phrase rhythm from the library matching genre, note count, and bars.
 */
function selectPhraseRhythm(
  genre: string,
  noteCount: number,
  bars: number,
): PhraseRhythmEntry | undefined {
  let candidates = getPhraseRhythms(genre, noteCount, bars);

  // Fallback: try without bars constraint
  if (candidates.length === 0) {
    candidates = getPhraseRhythms(genre, noteCount);
  }

  // Fallback: try 'pop' as a generic genre
  if (candidates.length === 0) {
    candidates = getPhraseRhythms('pop', noteCount, bars);
  }

  if (candidates.length === 0) return undefined;
  return pickRandom(candidates)!;
}

// ---------------------------------------------------------------------------
// Scale resolution
// ---------------------------------------------------------------------------

/**
 * Resolve contour intervals through a scale to produce MIDI note numbers.
 *
 * Each contour value is a scale-degree offset from the zero point.
 * We index into the scale array, wrapping at octave boundaries.
 *
 * @param contour - Array of 0-based scale degree offsets
 * @param scale - Scale definition with intervals array
 * @param keyRoot - MIDI root note
 * @param zeroPoint - Starting index in the scale (0-based)
 */
function resolveContourThroughScale(
  contour: number[],
  scale: ScaleDefinition,
  keyRoot: number,
  zeroPoint: number,
): number[] {
  const intervals = scale.intervals;
  const len = intervals.length;

  return contour.map((offset) => {
    let idx = zeroPoint + offset;
    let octaveShift = 0;

    // Wrap index within scale bounds, tracking octave shifts
    while (idx >= len) {
      idx -= len;
      octaveShift += 12;
    }
    while (idx < 0) {
      idx += len;
      octaveShift -= 12;
    }

    return keyRoot + intervals[idx] + octaveShift;
  });
}

// ---------------------------------------------------------------------------
// Zip melody + rhythm
// ---------------------------------------------------------------------------

/**
 * Pair resolved MIDI notes with rhythm timing events.
 * Uses the shorter of the two arrays.
 */
function zipMelody(
  midiNotes: number[],
  rhythmEvents: [number, number][],
): MidiNoteEvent[] {
  const len = Math.min(midiNotes.length, rhythmEvents.length);
  const events: MidiNoteEvent[] = [];

  for (let i = 0; i < len; i++) {
    events.push({
      note: midiNotes[i],
      onset: rhythmEvents[i][0],
      duration: rhythmEvents[i][1],
    });
  }

  return events;
}

// ---------------------------------------------------------------------------
// Swing
// ---------------------------------------------------------------------------

/**
 * Apply swing displacement to note onsets.
 * Shifts even-numbered eighth notes forward by a swing ratio.
 *
 * Swing amount 0-10: 0 = straight, 5 = medium swing, 10 = hard swing
 * At swing=5, the 2nd eighth note shifts ~33% (triplet feel).
 */
function applySwing(events: MidiNoteEvent[], swing: number): MidiNoteEvent[] {
  if (swing <= 0) return events;

  // Maximum displacement at swing=10: 80 ticks (1/6 of a quarter = triplet feel)
  const maxDisplacement = 80;
  const displacement = Math.round((swing / 10) * maxDisplacement);

  return events.map((e) => {
    // Check if this note falls on an "off" eighth-note position
    // Off eighth notes are at tick positions: 240, 720, 1200, 1680 (within a bar)
    const posInBar = e.onset % TICKS_PER_BAR;
    const posInBeat = posInBar % 480; // position within a quarter note

    if (posInBeat >= 220 && posInBeat <= 260) {
      // This is an off-eighth: push it forward
      return {
        ...e,
        onset: e.onset + displacement,
        duration: Math.max(e.duration - displacement, 60), // shrink slightly
      };
    }

    return e;
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Pick a random element from an array. Returns undefined if empty. */
function pickRandom<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Resolve phraseRhythmBars: number or [number, number] → pick one. */
function resolvePhraseBars(bars: number | [number, number]): number {
  if (Array.isArray(bars)) {
    return pickRandom(bars) ?? bars[0];
  }
  return bars;
}

/** Resolve swing value from GCM: number or [min, max] → midpoint. */
function resolveSwing(swing: number | [number, number]): number {
  if (Array.isArray(swing)) {
    return Math.round((swing[0] + swing[1]) / 2);
  }
  return swing;
}
