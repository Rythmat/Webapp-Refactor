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

import { getChordColor } from '../../daw/prism-engine/engine/colorSystem';
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
  const rootNote = activity.keyRoot % 12; // MIDI → chromatic pitch class
  const chordRegions = progressionToChordRegions(
    activity.progression,
    rootNote,
  );

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
  rootNote: number,
): DawChordRegion[] {
  return progression.map((chord) => {
    const name = formatChordName(chord.degree, chord.qualityId);
    const noteName = name; // Display name matches chord name
    const prismQuality =
      CURRICULUM_TO_PRISM_QUALITY[chord.qualityId] ?? chord.qualityId;
    const prismChord = `${chord.degree} ${prismQuality}`;

    return {
      id: nextRegionId(),
      startTick: chord.onset,
      endTick: chord.onset + chord.duration,
      name,
      noteName,
      color: getChordColor(prismChord, rootNote),
      degreeKey: `${chord.degree} ${chord.qualityId}`,
    };
  });
}

/**
 * Format a hybrid-numbering chord name from degree + quality
 * (e.g., "4 maj7", "♭7 maj", "5 dom7♭9"), matching `degreeToHybrid`.
 */
function formatChordName(degree: string, quality: string): string {
  const match = /^(b|\u266D|#|s)?(\d+)$/.exec(degree);
  const accidental = match?.[1];
  const prefix = !accidental
    ? ''
    : accidental === '#' || accidental === 's'
      ? '#'
      : '\u266D';
  const degreeLabel = match ? `${prefix}${match[2]}` : degree;

  const qualityLabel =
    quality === 'min_maj7'
      ? 'min(maj7)'
      : quality
          .replace(/dominant/g, 'dom')
          .replace(/diminished/g, 'dim')
          .replace(/minor/g, 'min')
          .replace(/major/g, 'maj')
          .replace(/_/g, '')
          .replace(/(\d)s(?=\d)/g, '$1#')
          .replace(/(\d)b(?=\d)/g, '$1\u266D');

  return `${degreeLabel} ${qualityLabel}`;
}

/**
 * Maps curriculum short quality IDs to Prism engine quality names
 * used by CHORD_COLORS in keyColors.ts.
 */
const CURRICULUM_TO_PRISM_QUALITY: Record<string, string> = {
  maj: 'major',
  min: 'minor',
  aug: 'augmented',
  dim: 'diminished',
  maj7: 'major7',
  min7: 'minor7',
  dom7: 'dominant7',
  dom9: 'dominant9',
  maj9: 'major9',
  min9: 'minor9',
  dom11: 'dominant11',
  min11: 'minor11',
  dom13: 'dominant13',
  min13: 'minor13',
  maj13: 'major13',
  min7b5: 'minor7b5',
  dim7: 'diminished7',
  sus2: 'sus2',
  sus4: 'sus4',
  min_maj7: 'minormajor7',
  dom7b9: 'dominant7b9',
  dom7s9: 'dominant7#9',
  dom7b5: 'dominant7b5',
  dom7s5: 'dominant7#5',
  dom7s11: 'dominant7#11',
  maj7_s5: 'major7#5',
  maj7_b5: 'major7b5',
  min7_s5: 'minor7#5',
};

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
