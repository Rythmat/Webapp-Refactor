/**
 * Phase 2 — Voicing system types.
 *
 * Models the two-layer voicing architecture:
 * Chord Quality (WHAT notes) × Voicing Algorithm (WHERE in octave) = Final Voicing
 */

/** A voicing algorithm: displacement offsets applied to chord intervals */
export interface VoicingAlgorithm {
  id: string;
  name: string;
  /** Octave displacement array (e.g. [0, 0, 0, -12] = drop the 4th note down one octave) */
  displacements: number[];
  noteCount: number;
  category: string;
}

/** Left-hand assignment for split voicings (jazz/neo-soul contexts) */
export interface LHAssignment {
  /** 'root' | 'root_fifth' | 'root_seventh' | 'none' */
  type: string;
  /** Octave offset for LH notes (typically -1 or -2) */
  octaveOffset: number;
}

/** Voicing tier: 1 = introduced/taught, 2 = practiced/used in progressions */
export type VoicingTier = 1 | 2;

/**
 * A single entry in the Genre Voicing Taxonomy.
 * Maps genre×level to available voicings with their quality and algorithm references.
 */
export interface VoicingTaxonomyEntry {
  genre: string;
  level: number;
  voicingName: string;
  /** Chord quality ID from Chord Quality Library (e.g. 'maj', 'dom7') */
  qualityId: string;
  /** Voicing algorithm ID from Voicing Algorithm Library (e.g. 'va_3n_root_pos') */
  algorithmId: string;
  /** Context description */
  context: string;
  tier: VoicingTier;
  /**
   * Optional RH override — pre-computed interval array that bypasses
   * the quality × algorithm pipeline.
   * e.g. [-1, 4, 7] = 7th one semitone below root, then 3rd, then 5th
   */
  rhOverride?: number[];
  /** Optional LH assignment for split voicings */
  lhAssignment?: LHAssignment;
}

/** Result of applying a voicing algorithm to a chord quality */
export interface VoicedChord {
  /** MIDI note numbers for the right hand */
  rh: number[];
  /** Optional MIDI note number for the left hand (bass note) */
  lh: number | null;
  /** The chord quality ID used */
  qualityId: string;
  /** The voicing algorithm ID used */
  algorithmId: string;
  /** Root MIDI note number */
  root: number;
}
