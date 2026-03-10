/**
 * Phase 2 — Core curriculum types.
 *
 * Defines the primary domain types for the curriculum module:
 * genres, levels, components, and the Genre Curriculum Map entry.
 */

import type { CurriculumGenreId } from '../bridge/genreIdMap';

/** The 14 curriculum genres (title-case display form) */
export type CurriculumGenre =
  | 'African'
  | 'Blues'
  | 'Electronic'
  | 'Folk'
  | 'Funk'
  | 'Hip-Hop'
  | 'Jam Band'
  | 'Jazz'
  | 'Latin'
  | 'Neo Soul'
  | 'Pop'
  | 'R&B'
  | 'Reggae'
  | 'Rock';

/** Proficiency level (1 = beginner, 2 = intermediate, 3 = advanced) */
export type CurriculumLevel = 1 | 2 | 3;

/** Level string as it appears in GCM CSV */
export type CurriculumLevelId = 'L1' | 'L2' | 'L3';

/** The four musical components tracked per genre×level */
export type CurriculumComponent = 'melody' | 'chords' | 'bass' | 'global';

/** Scale definition: name + interval array */
export interface ScaleDefinition {
  name: string;
  intervals: number[];
}

/** Tempo range [min, max] BPM */
export type TempoRange = [min: number, max: number];

/** Melody parameters from GCM */
export interface MelodyParams {
  scale: ScaleDefinition;
  /** Alternative scales available at this level */
  scaleAlts?: ScaleDefinition[];
  contourNotes: number[];
  contourTiers: number[];
  rhythmTiers: number[];
  zeroPointOptions: number[];
  /** Max number of contours to chain (1 or 2) */
  contourConcat: number;
  phraseRhythmGenre: string;
  /** 1, 2, or [1, 2] meaning either */
  phraseRhythmBars: number | [number, number];
  tags?: string[];
  /** L2/L3 advanced features */
  chromaticPassing?: boolean;
  approachNotes?: boolean;
  digitalPatterns?: boolean;
  pentatonicSuperimposition?: boolean;
  motivicDevelopment?: boolean;
}

/** Chord parameters from GCM */
export interface ChordParams {
  /** Descriptive string of available chord types (heterogeneous across genres) */
  chordTypes: string;
  /** Voicing description (free-form — parsed by voicing pipeline) */
  voicings: string;
  /** Denver Number System progression strings */
  progressions: string[];
  compingPatterns?: string[];
  compingRhythms?: string;
  /** L2/L3 technique descriptions */
  newTechniques?: string;
}

/** Bass parameters from GCM */
export interface BassParams {
  bassScale?: ScaleDefinition;
  bassRhythms: string[];
  bassContours: string[];
  /** Special bass pattern (e.g. "tumbao" for Jazz L3) */
  bassAlt?: string;
}

/** Global parameters from GCM */
export interface GlobalParams {
  defaultKey: string;
  keyUnlockOrder?: string;
  tempoRange: TempoRange;
  /** Single value or [min, max] range (e.g. 0 or [5, 7]) */
  swing: number | [number, number];
  grooves: string[];
}

/**
 * A single Genre Curriculum Map entry, representing all parameters
 * for one genre × level combination.
 */
export interface GenreCurriculumEntry {
  genre: CurriculumGenreId;
  level: CurriculumLevelId;
  melody: MelodyParams;
  chords: ChordParams;
  bass: BassParams;
  global: GlobalParams;
}

/** Composite key for GCM lookup: "POP:L1", "JAZZ:L3", etc. */
export type GCMKey = `${CurriculumGenreId}:${CurriculumLevelId}`;
