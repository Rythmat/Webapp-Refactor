/**
 * Phase 2 — Barrel export for all curriculum types.
 */

// Core curriculum types
export type {
  CurriculumGenre,
  CurriculumLevel,
  CurriculumLevelId,
  CurriculumComponent,
  ScaleDefinition,
  TempoRange,
  MelodyParams,
  ChordParams,
  BassParams,
  GlobalParams,
  GenreCurriculumEntry,
  GCMKey,
} from './curriculum';

// Voicing system types
export type {
  VoicingAlgorithm,
  LHAssignment,
  VoicingTier,
  VoicingTaxonomyEntry,
  VoicedChord,
} from './voicing';

// Progression types
export type {
  VibeTag,
  StyleTag,
  ProgressionChord,
  CurriculumProgression,
  VibeAlgorithm,
  VibeRule,
  StyleAlgorithm,
  StyleRule,
} from './progression';

// Activity flow types
export type {
  AssessmentType,
  ActivitySectionId,
  ActivityStep,
  ActivitySection,
  ActivityFlowParams,
  ActivityFlow,
  AssessmentResult,
  NoteResult,
} from './activity';

// Style DNA types
export type {
  ArtistReference,
  MusicalVocabulary,
  StyleDnaEntry,
} from './styleDna';

// Contour types
export type { ContourTier, ContourShape, CurriculumContour } from './contour';

// Rhythm types
export type {
  MasterRhythmEntry,
  PhraseRhythm,
  CompingPattern,
  BassContourPattern,
  BassRhythmPattern,
} from './rhythm';

// Re-export bridge types for convenience
export type { CurriculumGenreId } from '../bridge/genreIdMap';
