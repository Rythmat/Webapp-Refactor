/**
 * Phase 28 — Lead Sheet Bridge.
 *
 * Converts curriculum-generated content into the format expected
 * by the Lead Sheet view for printing and export.
 */

import type { GeneratedActivity } from '../engine/contentOrchestrator';
import type { MidiNoteEvent } from '../engine/melodyPipeline';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LeadSheetChord {
  /** Chord name (e.g., "Imaj7", "IVm7") */
  name: string;
  /** Start position in ticks */
  startTick: number;
  /** End position in ticks */
  endTick: number;
}

export interface LeadSheetSection {
  /** Section label (A, B, C, D) */
  label: string;
  /** Chords in this section */
  chords: LeadSheetChord[];
  /** Melody notes in this section */
  melody: MidiNoteEvent[];
}

export interface LeadSheetData {
  /** Title */
  title: string;
  /** Key name (e.g., "C Major") */
  keyName: string;
  /** Tempo in BPM */
  tempo: number;
  /** Time signature */
  timeSignature: string;
  /** Sections with chord and melody data */
  sections: LeadSheetSection[];
  /** Total duration in ticks */
  totalTicks: number;
}

// ---------------------------------------------------------------------------
// Conversion
// ---------------------------------------------------------------------------

const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];

/**
 * Convert a GeneratedActivity to LeadSheetData for rendering/export.
 */
export function curriculumToLeadSheet(
  activity: GeneratedActivity,
): LeadSheetData {
  const rootName = NOTE_NAMES[activity.keyRoot % 12];

  // Determine total duration
  const maxTick = Math.max(
    ...activity.melody.map((e) => e.onset + e.duration),
    ...activity.progression.map((c) => c.onset + c.duration),
    1920,
  );

  // Create a single section with all content
  const chords: LeadSheetChord[] = activity.progression.map((chord) => ({
    name: formatDegreeQuality(chord.degree, chord.qualityId),
    startTick: chord.onset,
    endTick: chord.onset + chord.duration,
  }));

  const sections: LeadSheetSection[] = [
    {
      label: 'A',
      chords,
      melody: activity.melody,
    },
  ];

  return {
    title: `${activity.genre} ${activity.level}`,
    keyName: `${rootName} Major`,
    tempo: activity.tempo,
    timeSignature: '4/4',
    sections,
    totalTicks: maxTick,
  };
}

/**
 * Format degree + quality into a chord symbol.
 */
function formatDegreeQuality(degree: string, quality: string): string {
  const degreeMap: Record<string, string> = {
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
  };
  const qualityMap: Record<string, string> = {
    maj: '',
    min: 'm',
    dom7: '7',
    maj7: 'maj7',
    min7: 'm7',
    dim: 'dim',
    aug: 'aug',
    dim7: 'dim7',
    min7b5: 'm7b5',
    dom9: '9',
    maj9: 'maj9',
    min9: 'm9',
  };

  const d = degreeMap[degree] ?? degree;
  const q = qualityMap[quality] ?? quality;
  return `${d}${q}`;
}
