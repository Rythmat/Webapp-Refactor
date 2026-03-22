/**
 * UNISON Schema — Universal music intelligence JSON format.
 *
 * Three additive layers:
 *   1. Pitch & Rhythm (Phase 1) — always present
 *   2. Timbre (Phase 5) — null until populated
 *   3. Mix (Phase 6) — null until populated
 */

// ── Top-Level Document ─────────────────────────────────────────────────────

export interface UnisonDocument {
  version: '1.0.0';
  metadata: UnisonMetadata;
  tracks: UnisonTrack[];
  analysis: UnisonAnalysis;
  rhythm: RhythmAnalysis;
  melody: MelodyAnalysis | null;
  form: FormAnalysis | null;
  timbre: TimbreAnalysis | null;
  mix: MixAnalysis | null;
}

// ── Metadata ───────────────────────────────────────────────────────────────

export interface UnisonMetadata {
  title: string;
  source:
    | 'midi-import'
    | 'daw-session'
    | 'lead-sheet'
    | 'audio'
    | 'sheet-music'
    | 'manual';
  createdAt: string;
  sourceFilename?: string;
  durationTicks: number;
  ticksPerQuarterNote: number;
}

// ── Track Layer ────────────────────────────────────────────────────────────

export type TrackRole =
  | 'chords'
  | 'melody'
  | 'bass'
  | 'drums'
  | 'pad'
  | 'unknown';

export interface UnisonTrack {
  id: string;
  name: string;
  channel: number;
  role: TrackRole;
  events: UnisonNoteEvent[];
  ccEvents: UnisonCCEvent[];
  lyrics?: UnisonLyricEvent[];
}

export interface UnisonNoteEvent {
  pitch: number;
  velocity: number;
  startTick: number;
  durationTicks: number;
  channel: number;
  scaleDegree?: string;
  chordTone?: boolean;
}

export interface UnisonCCEvent {
  tick: number;
  controller: number;
  value: number;
  channel: number;
}

export interface UnisonLyricEvent {
  text: string;
  startTick: number;
  syllabic: 'single' | 'begin' | 'middle' | 'end';
}

// ── Harmonic Analysis ──────────────────────────────────────────────────────

export interface UnisonAnalysis {
  key: KeyDetection;
  chordTimeline: UnisonChordRegion[];
  progressionMatches: ProgressionMatchResult[];
  vibes: string[];
  styles: string[];
  tonalRegions?: TonalRegion[];
  modalInterchangeSummary?: ModalInterchangeSummary;
  voiceLeading?: VoiceLeadingSummary;
}

export interface KeyDetection {
  rootPc: number;
  rootName: string;
  mode: string;
  modeDisplay: string;
  confidence: number;
  alternateKeys: AlternateKey[];
}

export interface AlternateKey {
  rootPc: number;
  rootName: string;
  mode: string;
  modeDisplay: string;
  confidence: number;
}

export interface UnisonChordRegion {
  id: string;
  startTick: number;
  endTick: number;
  rootPc: number;
  quality: string;
  noteName: string;
  degree: string;
  hybridName: string;
  romanNumeral: string;
  color: [number, number, number];
  inversion: number;
  bassNote?: number;
  confidence: number;
  isDiatonic?: boolean;
  modalInterchange?: ModalInterchangeAnnotation | null;
  sourceMode?: string;
}

// ── Modal Interchange ────────────────────────────────────────────────────────

export interface ModalInterchangeAnnotation {
  type:
    | 'borrowed'
    | 'secondary-dominant'
    | 'secondary-leading-tone'
    | 'mode-mixture';
  sourceMode?: string;
  sourceModeDisplay?: string;
  sourceModeFamily?: string;
  secondaryTarget?: string;
  resolved?: boolean;
  confidence: number;
}

export interface TonalRegion {
  startTick: number;
  endTick: number;
  startChordIndex: number;
  endChordIndex: number;
  key: KeyDetection;
  type: 'primary' | 'modulation' | 'tonicization';
  pivotChordIndex?: number;
}

export interface ModalInterchangeSummary {
  borrowedChordCount: number;
  secondaryDominantCount: number;
  sourceModes: string[];
  dominantTonalCenter: string;
  modulatesTo: string[];
}

export interface ProgressionMatchResult {
  libraryId: number;
  progression: string;
  matchedChords: string[];
  matchStartIndex: number;
  matchLength: number;
  score: number;
  vibes: string[];
  styles: string[];
  complexity: string;
  artist: string;
  song: string;
}

// ── Rhythm Analysis ────────────────────────────────────────────────────────

export type Subdivision = 'straight' | 'triplet' | 'mixed';

export interface RhythmAnalysis {
  bpm: number;
  bpmConfidence: number;
  timeSignatureNumerator: number;
  timeSignatureDenominator: number;
  subdivision: Subdivision;
  swingAmount: number;
}

// ── Melody Analysis ────────────────────────────────────────────────────────

export type MelodyContour =
  | 'ascending'
  | 'descending'
  | 'arch'
  | 'inverted-arch'
  | 'static'
  | 'mixed';

export interface MelodyAnalysis {
  trackId: string;
  pitchRange: { low: number; high: number };
  scaleDegrees: Array<{ tick: number; degree: string }>;
  contour: MelodyContour;
  intervalHistogram: Record<number, number>;
}

// ── Voice Leading Analysis ──────────────────────────────────────────────────

export interface VoiceLeadingTransition {
  fromChordId: string;
  toChordId: string;
  totalSemitoneMotion: number;
  maxVoiceMovement: number;
  commonTones: number;
  contraryMotion: boolean;
  parallelFifths: boolean;
  smoothness: number;
}

export interface VoiceLeadingSummary {
  transitions: VoiceLeadingTransition[];
  avgSmoothness: number;
  commonTonePercentage: number;
  parallelFifthCount: number;
}

// ── Form Analysis (Phase 4) ────────────────────────────────────────────────

export type SectionType =
  | 'intro'
  | 'verse'
  | 'chorus'
  | 'bridge'
  | 'pre-chorus'
  | 'outro'
  | 'solo'
  | 'interlude'
  | 'coda'
  | 'custom';

export interface FormSection {
  label: string;
  type: SectionType;
  startTick: number;
  endTick: number;
  startMeasure: number;
  endMeasure: number;
  key?: KeyDetection;
}

export interface FormRepeat {
  startMeasure: number;
  endMeasure: number;
}

export interface FormAnalysis {
  sections: FormSection[];
  repeats: FormRepeat[];
  formLabel: string;
  totalMeasures: number;
}

// ── Timbre Analysis (Phase 5) ──────────────────────────────────────────────

export interface SpectralFingerprint {
  brightness: number;
  warmth: number;
  spectralCentroidHz: number;
  spectralRolloffHz: number;
  attackTransient: 'sharp' | 'soft' | 'moderate';
  harmonicDecay: 'fast' | 'gradual' | 'sustained';
}

export interface EnvelopeEstimate {
  attackMs: number;
  decayMs: number;
  sustainLevel: number;
  releaseMs: number;
}

export interface InstrumentGuess {
  trackId: string;
  instrument: string;
  family: string;
  confidence: number;
}

export interface TimbreAnalysis {
  instrumentGuesses: InstrumentGuess[];
  spectralFingerprint?: SpectralFingerprint;
  amplitudeEnvelope?: EnvelopeEstimate;
}

// ── Mix Analysis (Phase 6) ────────────────────────────────────────────────

export interface StereoFieldAnalysis {
  pan: number; // -1 (full L) to +1 (full R), 0 = center
  stereoWidth: number; // 0 (mono) to 1 (full stereo)
  correlation: number; // -1 (out of phase) to +1 (mono-identical)
  monoCompatibility: number; // 0–1, how well the mix survives mono fold-down
}

export interface DynamicRangeAnalysis {
  peakDb: number;
  rmsDb: number;
  crestFactorDb: number; // peak − rms (higher = more dynamic)
  headroomDb: number; // 0 − peakDb (distance to clipping)
}

export type FrequencyBand = 'sub' | 'low' | 'mid' | 'highMid' | 'high' | 'air';

export interface SpectralBalanceAnalysis {
  bands: Record<FrequencyBand, number>; // energy ratio (0–1) per band, sums to ~1
  tilt: number; // negative = dark, positive = bright
}

export interface LoudnessPoint {
  timeSec: number;
  rmsDb: number;
}

export interface LoudnessProfile {
  contour: LoudnessPoint[];
  dynamicVariation: number; // std deviation of contour rmsDb
  loudestTimeSec: number;
  quietestTimeSec: number; // excluding silence
}

export interface MixAnalysis {
  stereoField: StereoFieldAnalysis;
  dynamicRange: DynamicRangeAnalysis;
  spectralBalance: SpectralBalanceAnalysis;
  loudnessProfile: LoudnessProfile;
}
