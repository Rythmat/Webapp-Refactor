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

export interface ActivityFlowParamsV2 extends ActivityFlowParams {
  defaultScale: number[]; // scale intervals for this level e.g. [0,3,5,7,10]
  defaultScaleId: string; // human-readable e.g. 'minor_pentatonic'
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
