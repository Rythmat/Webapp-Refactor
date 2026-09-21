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
  /** Chord name in hybrid numbering (e.g., "1 maj7", "4 min7", "♭7 maj") */
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
 * Format degree + quality into a hybrid-numbering chord name
 * (e.g., "4 maj7", "♭7 maj", "5 dom7♭9"), matching `degreeToHybrid`.
 */
function formatDegreeQuality(degree: string, quality: string): string {
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
