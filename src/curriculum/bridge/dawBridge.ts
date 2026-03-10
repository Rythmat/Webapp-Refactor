/**
 * Phase 21 — DAW ↔ Curriculum Bridge.
 *
 * Converts curriculum-generated content into DAW-compatible state
 * (ChordRegions, root note, tempo, genre) so students can take
 * curriculum activities into the DAW as editable projects.
 *
 * Also provides reverse mapping: pulling DAW state into curriculum
 * format for "practice what you just wrote" workflows.
 */

import type { GeneratedActivity } from '../engine/contentOrchestrator';
import type { MidiNoteEvent } from '../engine/melodyPipeline';
import type { VoicedProgressionChord } from '../engine/progressionPipeline';
import {
  curriculumToEngineGenre,
  engineToCurriculumGenre,
  type CurriculumGenreId,
} from './genreIdMap';

// ---------------------------------------------------------------------------
// Types (mirrors DAW store types to avoid circular imports)
// ---------------------------------------------------------------------------

/** Matches ChordRegion from prismSlice */
export interface DawChordRegion {
  id: string;
  startTick: number;
  endTick: number;
  name: string;
  noteName: string;
  color: [number, number, number];
  degreeKey?: string;
}

/** Complete DAW state bundle for loading curriculum content */
export interface DawLoadPayload {
  /** Chord regions for the lead sheet */
  chordRegions: DawChordRegion[];
  /** Root note (0-11, C=0) */
  rootNote: number;
  /** Tempo in BPM */
  bpm: number;
  /** Engine genre name */
  genre: string;
  /** Swing value (0-10) */
  swing: number;
  /** Melody MIDI events (for optional MIDI clip creation) */
  melodyEvents: MidiNoteEvent[];
  /** Bass MIDI events */
  bassEvents: MidiNoteEvent[];
}

// ---------------------------------------------------------------------------
// Curriculum → DAW
// ---------------------------------------------------------------------------

let _regionIdCounter = 0;
function nextRegionId(): string {
  return `cur-${++_regionIdCounter}`;
}

/**
 * Convert a GeneratedActivity into a DawLoadPayload.
 *
 * Chord progression → ChordRegions with timing and colors.
 * Key root MIDI → root note (0-11).
 * Genre → engine genre name.
 */
export function curriculumToDaw(activity: GeneratedActivity): DawLoadPayload {
  const chordRegions = progressionToChordRegions(activity.progression);
  const rootNote = activity.keyRoot % 12; // MIDI → chromatic pitch class

  return {
    chordRegions,
    rootNote,
    bpm: activity.tempo,
    genre: curriculumToEngineGenre(activity.genre),
    swing: activity.swing,
    melodyEvents: activity.melody,
    bassEvents: activity.bass,
  };
}

/**
 * Convert voiced progression chords into DAW chord regions.
 */
function progressionToChordRegions(
  progression: VoicedProgressionChord[],
): DawChordRegion[] {
  return progression.map((chord) => {
    const name = formatChordName(chord.degree, chord.qualityId);
    const noteName = name; // Display name matches chord name

    return {
      id: nextRegionId(),
      startTick: chord.onset,
      endTick: chord.onset + chord.duration,
      name,
      noteName,
      color: getQualityColor(chord.qualityId),
      degreeKey: `${chord.degree} ${chord.qualityId}`,
    };
  });
}

/**
 * Format a human-readable chord name from degree + quality.
 */
function formatChordName(degree: string, qualityId: string): string {
  const degreeLabels: Record<string, string> = {
    '1': 'I',
    '2': 'II',
    '3': 'III',
    '4': 'IV',
    '5': 'V',
    '6': 'VI',
    '7': 'VII',
    b2: 'bII',
    b3: 'bIII',
    b5: 'bV',
    b6: 'bVI',
    b7: 'bVII',
    s4: '#IV',
    s5: '#V',
  };

  const qualityLabels: Record<string, string> = {
    maj: '',
    min: 'm',
    dom7: '7',
    maj7: 'maj7',
    min7: 'm7',
    dim: 'dim',
    aug: 'aug',
    dom9: '9',
    maj9: 'maj9',
    min9: 'm9',
    dom11: '11',
    min11: 'm11',
    dom13: '13',
    min13: 'm13',
    maj13: 'maj13',
    min7b5: 'm7b5',
    dim7: 'dim7',
    sus2: 'sus2',
    sus4: 'sus4',
  };

  const dLabel = degreeLabels[degree] ?? degree;
  const qLabel = qualityLabels[qualityId] ?? qualityId;
  return `${dLabel}${qLabel}`;
}

/**
 * Get a color for a chord quality (basic color coding).
 */
function getQualityColor(qualityId: string): [number, number, number] {
  const COLORS: Record<string, [number, number, number]> = {
    maj: [59, 130, 246], // blue
    min: [139, 92, 246], // purple
    dom7: [245, 158, 11], // amber
    maj7: [96, 165, 250], // light blue
    min7: [168, 85, 247], // violet
    dim: [100, 116, 139], // slate
    aug: [236, 72, 153], // pink
  };
  return COLORS[qualityId] ?? [148, 163, 184]; // default: gray
}

// ---------------------------------------------------------------------------
// DAW → Curriculum
// ---------------------------------------------------------------------------

/**
 * Extract curriculum-relevant context from DAW state.
 * Used for "practice what you just wrote" workflows.
 */
export interface DawContext {
  /** Key root as MIDI note (octave 4) */
  keyRoot: number;
  /** Tempo */
  tempo: number;
  /** Genre (curriculum ID) */
  genre: CurriculumGenreId | null;
  /** Number of chord regions */
  chordCount: number;
}

/**
 * Pull relevant context from DAW state values.
 * This is a pure function — the component calling it reads
 * the DAW store and passes values in.
 */
export function dawToCurriculumContext(
  rootNote: number | null,
  bpm: number,
  genre: string,
  chordRegionCount: number,
): DawContext {
  // Reverse-map engine genre to curriculum ID
  const curriculumGenre =
    rootNote !== null ? (engineToCurriculumGenre(genre as any) ?? null) : null;

  return {
    keyRoot: rootNote !== null ? rootNote + 60 : 60, // pitch class → MIDI C4+
    tempo: bpm,
    genre: curriculumGenre,
    chordCount: chordRegionCount,
  };
}
