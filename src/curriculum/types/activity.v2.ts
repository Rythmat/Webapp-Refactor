import type {
  ActivityStep,
  ActivityFlow,
  ActivityFlowParams,
  ActivitySection,
} from './activity';

// Hand configuration options for Performance section (Section D)
export type HandConfig =
  | 'lh_bass_rh_chords'
  | 'lh_bass_rh_melody'
  | 'lh_chords_rh_melody'
  | 'two_hand_comping'
  | 'two_hand_comping_genre_pop'
  | 'lh_rootless_rh_melody'
  | 'open';

export type StyleSubProfile = 'l1a' | 'l1b' | 'l2a' | 'l2b' | 'l3a' | 'l3b';

export interface InstrumentConfig {
  instrument: 'piano'; // piano only for now
  hand_config: HandConfig;
  lh_role: 'bass' | 'chords' | 'open';
  rh_role: 'chords' | 'melody' | 'open';
  style_ref: StyleSubProfile;
}

export interface BackingParts {
  engine_generates: ('melody' | 'chords' | 'bass' | 'drums')[];
  student_plays: ('melody' | 'chords' | 'bass')[];
}

/**
 * A hand-authored backing for a level's Practice Tracks, overriding what would
 * otherwise be inferred from the section's own play-along step.
 *
 * Worth authoring where a section has no chord symbols of its own: Funk L2's
 * Melody section teaches over a one-chord tonic vamp, which is idiomatic but
 * gives an improvising student nothing to move against. Set `chords` here and
 * all four of that level's Practice Tracks loop it instead.
 */
export interface PracticeTrackParams {
  /** Chord symbols, one per bar, cycled across the loop ('Am9', 'D13'). */
  chords?: string[];
  /** The groove to play; defaults to the section step's own style groove. */
  grooveId?: string;
  /** Tempo to open at; defaults to the middle of `tempoRange`. */
  bpm?: number;
  /** Swing percentage; defaults to the source step's, then the flow's. */
  swing?: number;
}

export interface ActivityFlowParamsV2 extends ActivityFlowParams {
  defaultScale: number[]; // scale intervals for this level e.g. [0,3,5,7,10]
  defaultScaleId: string; // human-readable e.g. 'minor_pentatonic'
  /** Optional authored backing for this level's Practice Tracks. */
  practiceTrack?: PracticeTrackParams;
}

// Extended ActivityStep for v2 content
// Adds optional fields — fully backward compatible with existing ActivityStep
export interface TargetNote {
  midi: number;
  onset: number; // ticks from start (480 = quarter note)
  duration: number; // ticks
  hand?: 'lh' | 'rh'; // explicit stave assignment for grand staff rendering (D section only)
}

export interface ActivityVariant {
  variantId: string;
  description: string;
  targetNotes: TargetNote[];
  chordSymbols?: string[];
  direction?: string;
}

export interface ActivityStepV2 extends ActivityStep {
  scaleIntervals?: number[]; // per-step scale override
  scaleId?: string; // human-readable e.g. 'minor_blues'
  targetNotes?: TargetNote[]; // explicit MIDI note array — renderer uses directly
  instrument_config?: InstrumentConfig; // Performance section only
  backing_parts?: BackingParts; // Play-Along and Performance activities
  style_ref_active?: StyleSubProfile; // which sub-profile this activity uses
  /**
   * Chord symbols per bar for the backing track engine.
   * Standard notation: 'Dm7', 'G7', 'Bbmaj7', 'Am7'.
   * Slash chords: 'Bbmaj7/F', 'C/E' — bass plays the note after the slash.
   * One entry per bar. If shorter than the number of bars, loops from start.
   * If omitted, bass derives from keyRoot.
   */
  chordSymbols?: string[];
  /** Multiple note-set variants for a single step — rotated by attempt count */
  variants?: ActivityVariant[];
  /** Override groove selection — if present, bypasses styleRef→groove lookup */
  grooveId?: string;
  /**
   * 16th-note swing for this step, as a percentage: 50 straight, 66 triplet
   * feel. Overrides the flow's `params.swing`. See engine/genreGeneration/swing.ts.
   */
  swing?: number;
  /**
   * The tempo this step opens at, when it differs from the level's (Hip Hop
   * play-alongs run at 77–90 within one level). Also the step's Practice Track
   * tempo. Steps without one keep whatever tempo is set.
   */
  tempo?: number;
  /** Play-along sound and patterns for this step (Hip Hop). */
  backing_style?: BackingStyle;
}

/**
 * How a step's play-along sounds, where a genre chooses per step rather than
 * per level. Pattern ids are in engine/genreGeneration/hipHop/hipHopPatterns.ts;
 * the drum pattern is the step's `grooveId`.
 */
export interface BackingStyle {
  /** Drum kit: 'natural' (default), '808' or 'house'. */
  kit?: 'natural' | '808' | 'house';
  /** Bass sound; defaults to the genre's (genreBassVoices.ts). */
  bassVoice?: 'electric' | 'finger' | 'fretless' | 'upright' | '808';
  /** Bass pattern id, e.g. 'trap_foundation', 'follow_kick'. */
  bassPattern?: string;
  /** Chord rhythm id, e.g. 'held', 'chunk_eighths_staccato'. */
  comping?: string;
  /** MIDI note the backing chords are voiced up from (default 60 = C4). */
  chordRegister?: number;
  /** Semitones to move the whole bass line (e.g. -12). */
  bassOffset?: number;
}

// Extended ActivityFlow for v2 content
export interface ActivityFlowV2 extends ActivityFlow {
  version: 'v2';
  params: ActivityFlowParamsV2;
  sections: ActivitySectionV2[];
}

export interface ActivitySectionV2 extends ActivitySection {
  steps: ActivityStepV2[];
}
