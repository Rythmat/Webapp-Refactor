/**
 * Phase 2 — Chord progression types.
 *
 * Models the 589-entry Chord Progression Library with vibe/style filtering.
 */

/**
 * 16 vibe tags used for progression filtering.
 * Each vibe has associated rules (required chords, forbidden chords, tempo, modes).
 */
export type VibeTag =
  | 'cool'
  | 'sexy'
  | 'intriguing'
  | 'dark'
  | 'emotional'
  | 'sophisticated'
  | 'fun'
  | 'happy'
  | 'melancholic'
  | 'aggressive'
  | 'dreamy'
  | 'hypnotic'
  | 'triumphant'
  | 'spiritual'
  | 'rebellious'
  | 'romantic';

/** Genre-based style tag for progression filtering */
export type StyleTag =
  | 'pop'
  | 'rock'
  | 'hip-hop'
  | 'jam-band'
  | 'funk'
  | 'neo-soul'
  | 'jazz'
  | 'r&b'
  | 'reggae'
  | 'latin'
  | 'blues'
  | 'folk'
  | 'electronic'
  | 'african';

/**
 * A single chord in a progression, specified by degree and quality.
 * Uses the notation system: "1 major7", "b3 minor7", "#4 diminished"
 */
export interface ProgressionChord {
  /** Scale degree string: '1', 'b2', '#4', 'b7', etc. */
  degree: string;
  /** Chord quality: 'major', 'minor7', 'dominant7', etc. */
  quality: string;
}

/**
 * A curriculum chord progression entry from the Chord Progression Library.
 */
export interface CurriculumProgression {
  id: string;
  /** Human-readable name */
  name: string;
  /** Degree-quality notation: "1 major - 4 major - 5 dominant7 - 1 major" */
  progression: string;
  /** Parsed chord sequence */
  chords: ProgressionChord[];
  /** Number of chords in the progression */
  chordCount: number;
  /** Vibe tags (parsed from comma-separated CSV column) */
  vibes: VibeTag[];
  /** Style/genre tags (parsed from comma-separated CSV column) */
  styles: StyleTag[];
  /** Complexity rating (correlates roughly with level) */
  complexity: number;
  /** Optional mode association */
  mode?: string;
}

/** Rules for a single vibe algorithm */
export interface VibeAlgorithm {
  tag: VibeTag;
  synonyms: string[];
  tempoRange: [min: number, max: number];
  /** Rule constraints: required chord types, forbidden chord types, etc. */
  rules: VibeRule[];
  /** Applicable modes/scales */
  applicableModes: string[];
}

/** A single vibe rule (e.g. "1st Chord = major7 OR minor7") */
export interface VibeRule {
  /** Human-readable rule description */
  description: string;
  /** Rule type: 'required_chord', 'forbidden_chord', 'required_position', etc. */
  type: 'required_chord' | 'forbidden_chord' | 'required_position' | 'custom';
  /** Chord qualities or positions referenced */
  values: string[];
  /** Position constraint (e.g. 'first', 'any', 'last') */
  position?: 'first' | 'any' | 'last';
  /** AND/OR logic for multiple values */
  logic: 'and' | 'or';
}

/** Rules for a style algorithm (genre-specific) */
export interface StyleAlgorithm {
  genre: StyleTag;
  /** Required musical characteristics */
  rules: StyleRule[];
}

/** A single style rule */
export interface StyleRule {
  description: string;
  type: string;
  values: string[];
}
