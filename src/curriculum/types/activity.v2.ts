import type {
  GuitarCenterId,
  GuitarScaleSlot,
} from '@/curriculum/data/guitar/types';
import type { FretPosition } from '@/lib/guitar/types';
import type {
  ActivityStep,
  ActivityFlow,
  ActivityFlowParams,
  ActivitySection,
} from './activity';

/** The instrument a flow is played on. A flow without one is piano. */
export type LessonInstrument = 'piano' | 'guitar';

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
  /**
   * The Chords track's keyboard voicings, one switch option each, in the order
   * the switch shows them. Each is read from the Chords activity named, as the
   * student played it there. Without this, one "Stylistic Voicings" option is
   * read from the section's last activity.
   */
  voicings?: PracticeVoicingSource[];
  /** Which of `voicings` the keyboard opens on; defaults to the first. */
  defaultVoicing?: string;
  /**
   * A section's Practice Track direction, where the source activity's own
   * doesn't fit a loop — Funk L3's capstone talks about its five-bar phrase,
   * and the loop is four. Leads the track's "Things to try".
   */
  directions?: Partial<Record<'A' | 'B' | 'C' | 'D', string>>;
}

export interface PracticeVoicingSource {
  id: string;
  /** As the switch reads: 'Triads', 'Power Chords'. */
  label: string;
  /** The activity's number, as its `activity` title starts: 'B5.4'. */
  activity: string;
}

export interface ActivityFlowParamsV2 extends ActivityFlowParams {
  defaultScale: number[]; // scale intervals for this level e.g. [0,3,5,7,10]
  defaultScaleId: string; // human-readable e.g. 'minor_pentatonic'
  /** Omitted for piano; 'guitar' switches the lesson to guitar input and views. */
  instrument?: LessonInstrument;
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
  /** Guitar only: where the note is played. `midi` is its sounding pitch. */
  fretPosition?: FretPosition;
}

/**
 * Chord qualities the Studio chord detector (AudioChordDetector) reports for
 * the chords guitar lessons use — keys of @prism/engine's CHORDS table.
 */
export type DetectorChordQuality =
  | 'major'
  | 'minor'
  | 'diminished'
  | 'major7'
  | 'minor7'
  | 'dominant7'
  | 'minor7b5';

/**
 * One chord the student is asked to play, on the same tick timeline as the
 * step's targetNotes. Guitar chords are judged by identity (pitch classes),
 * not by exact MIDI, so this carries what that needs.
 */
export interface ChordTarget {
  rootPc: number;
  quality: DetectorChordQuality;
  pitchClasses: number[];
  bassPc: number;
  onsetTick: number;
  durationTicks: number;
  /** Parser-friendly symbol, e.g. 'Dm7'. */
  symbol: string;
  /** Book shape id, e.g. 'C/triad/2' (see data/guitar/bookOne). */
  shapeId: string;
  /** Strummed as one chord, or picked string by string. */
  attack: 'strum' | 'arpeggio';
}

/** Guitar step metadata: which book material the step plays. Ids only. */
export interface GuitarStepMeta {
  /** 'C' (Book One's C, Ionian) or 'D:dorian' — see data/guitar/centers. */
  keyCenter: GuitarCenterId;
  scalePosition?: GuitarScaleSlot;
  shapeIds?: string[];
  musicMap?: { example: 1 | 2 | 3 | 4 | 5; passes: number };
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
  /** Guitar only: the chords to play, for chord-identity scoring and views. */
  chordTargets?: ChordTarget[];
  /** Guitar only: the book material this step plays. */
  guitar?: GuitarStepMeta;
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
