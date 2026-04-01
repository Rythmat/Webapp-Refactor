/**
 * Phase 17 — Play-Along Generator.
 *
 * Generates a complete backing track by combining drum groove, bass line,
 * and chord voicings into separate MidiNoteEvent[] tracks for playback.
 *
 * The generator loops the content for a configurable number of bars,
 * creating a practice-ready backing track that students play along with.
 */

import type { CurriculumGenreId } from '../bridge/genreIdMap';
import {
  getDrumGroove,
  getDrumGroovesForGenre,
  type DrumGrooveEntry,
} from '../data/drumGrooveLibrary';
import { getGrooves } from '../data/gcmHelpers';
import type { CurriculumLevelId } from '../types/curriculum';
import type { GeneratedActivity } from './contentOrchestrator';
import type { MidiNoteEvent } from './melodyPipeline';
import type { VoicedProgressionChord } from './progressionPipeline';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlayAlongTrack {
  /** Drum track — note numbers use GM drum map */
  drums: MidiNoteEvent[];
  /** Bass track */
  bass: MidiNoteEvent[];
  /** Chord track — each event is a single note within a voicing */
  chords: MidiNoteEvent[];
  /** Melody track (reference) */
  melody: MidiNoteEvent[];
  /** Total duration in ticks */
  totalTicks: number;
  /** Number of bars */
  bars: number;
}

/** GM drum MIDI note mapping for curriculum instrument names */
const INSTRUMENT_MIDI_MAP: Record<string, number> = {
  Kick: 36,
  Snare: 38,
  'Hi-Hat': 42,
  'Hi-Hat (O/H)': 46,
  'Hi-Hat Open': 46,
  Ride: 51,
  Crash: 49,
  'Cross Stick': 37,
  'High Tom': 48,
  'Low Tom': 41,
  'Mid Tom': 45,
  Shaker: 70,
  Tambourine: 54,
  'Clap/Snare': 39,
  'Conga High': 62,
  'Conga Low': 63,
};

/** PPQ = 480, bar = 1920 ticks */
const TICKS_PER_BAR = 1920;

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

/**
 * Generate a play-along backing track from a GeneratedActivity.
 *
 * @param activity - Generated activity with melody, progression, bass
 * @param loopBars - Number of bars to loop (default: 4)
 * @returns PlayAlongTrack with separate instrument tracks
 */
export function generatePlayAlongTrack(
  activity: GeneratedActivity,
  loopBars: number = 4,
): PlayAlongTrack {
  const { genre, level, melody, progression, bass } = activity;

  // Determine the content length in bars
  const contentTicks = getContentLength(melody, progression, bass);
  const contentBars = Math.max(1, Math.ceil(contentTicks / TICKS_PER_BAR));

  // Generate drum track from groove library
  const drumGroove = selectDrumGroove(genre, level);
  const drums = drumGroove ? generateDrumTrack(drumGroove, loopBars) : [];

  // Loop bass and chord tracks to fill the requested bars
  const loopedBass = loopEvents(bass, contentBars, loopBars);
  const chordEvents = progressionToChordEvents(progression);
  const loopedChords = loopEvents(chordEvents, contentBars, loopBars);
  const loopedMelody = loopEvents(melody, contentBars, loopBars);

  const totalTicks = loopBars * TICKS_PER_BAR;

  return {
    drums,
    bass: loopedBass,
    chords: loopedChords,
    melody: loopedMelody,
    totalTicks,
    bars: loopBars,
  };
}

// ---------------------------------------------------------------------------
// Drum track generation
// ---------------------------------------------------------------------------

/**
 * Select a drum groove for the given genre and level.
 */
function selectDrumGroove(
  genre: CurriculumGenreId,
  level: CurriculumLevelId,
): DrumGrooveEntry | undefined {
  // Try GCM-specified groove IDs first
  const grooveIds = getGrooves(genre, level);
  for (const id of grooveIds) {
    const groove = getDrumGroove(id);
    if (groove) return groove;
  }

  // Fallback: genre-based lookup
  const genreSlug = genre.toLowerCase().replace(/\s+/g, '');
  const candidates = getDrumGroovesForGenre(genreSlug);
  if (candidates.length > 0) {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  return undefined;
}

/**
 * Convert a drum groove entry into MidiNoteEvents for the requested bar count.
 * Grid positions are converted to tick offsets based on the groove's grid type.
 */
function generateDrumTrack(
  groove: DrumGrooveEntry,
  bars: number,
): MidiNoteEvent[] {
  const events: MidiNoteEvent[] = [];
  const isTriplet = groove.grid.toLowerCase().includes('triplet');
  const ticksPerSlot = isTriplet ? 80 : 60; // Triplet=24 slots, Straight=32 slots per bar
  const slotsPerBar = isTriplet ? 24 : 32;

  // Generate one bar of the groove pattern
  const oneBarEvents: MidiNoteEvent[] = [];

  for (const hit of groove.instruments) {
    const midiNote = INSTRUMENT_MIDI_MAP[hit.instrument];
    if (midiNote === undefined) continue;

    for (const pos of hit.positions) {
      // Only include positions within one bar
      if (pos >= slotsPerBar) continue;

      oneBarEvents.push({
        note: midiNote,
        onset: pos * ticksPerSlot,
        duration: ticksPerSlot, // Each hit lasts one slot
      });
    }
  }

  // Loop the bar pattern for the requested number of bars
  for (let bar = 0; bar < bars; bar++) {
    const barOffset = bar * TICKS_PER_BAR;
    for (const e of oneBarEvents) {
      events.push({
        note: e.note,
        onset: e.onset + barOffset,
        duration: e.duration,
      });
    }
  }

  return events;
}

// ---------------------------------------------------------------------------
// Chord events
// ---------------------------------------------------------------------------

/**
 * Convert a voiced chord progression into individual note events.
 * Each chord becomes multiple simultaneous note events (one per voice).
 */
function progressionToChordEvents(
  progression: VoicedProgressionChord[],
): MidiNoteEvent[] {
  const events: MidiNoteEvent[] = [];

  for (const chord of progression) {
    // RH notes
    for (const note of chord.rh) {
      events.push({
        note,
        onset: chord.onset,
        duration: chord.duration,
      });
    }
    // LH note (bass root)
    if (chord.lh !== null) {
      events.push({
        note: chord.lh,
        onset: chord.onset,
        duration: chord.duration,
      });
    }
  }

  return events;
}

// ---------------------------------------------------------------------------
// Looping
// ---------------------------------------------------------------------------

/**
 * Loop events to fill the target number of bars.
 * If content is shorter than target, it repeats.
 * Events beyond totalTicks are trimmed.
 */
function loopEvents(
  events: MidiNoteEvent[],
  contentBars: number,
  targetBars: number,
): MidiNoteEvent[] {
  if (events.length === 0) return [];

  const contentTicks = contentBars * TICKS_PER_BAR;
  const totalTicks = targetBars * TICKS_PER_BAR;
  const looped: MidiNoteEvent[] = [];

  const repeats = Math.ceil(targetBars / contentBars);

  for (let r = 0; r < repeats; r++) {
    const offset = r * contentTicks;
    for (const e of events) {
      const onset = e.onset + offset;
      if (onset >= totalTicks) continue;
      const duration = Math.min(e.duration, totalTicks - onset);
      looped.push({ note: e.note, onset, duration });
    }
  }

  return looped;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get the total content length in ticks from all event arrays.
 */
function getContentLength(
  melody: MidiNoteEvent[],
  progression: VoicedProgressionChord[],
  bass: MidiNoteEvent[],
): number {
  let maxTick = 0;

  for (const e of melody) {
    maxTick = Math.max(maxTick, e.onset + e.duration);
  }
  for (const e of progression) {
    maxTick = Math.max(maxTick, e.onset + e.duration);
  }
  for (const e of bass) {
    maxTick = Math.max(maxTick, e.onset + e.duration);
  }

  return maxTick;
}
