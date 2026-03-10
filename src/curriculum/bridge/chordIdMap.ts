/**
 * Phase 1 — Bidirectional chord ID mapping between curriculum and engine.
 *
 * Curriculum uses short IDs (e.g. 'maj', 'dom7').
 * Engine uses long IDs (e.g. 'major', 'dominant7').
 * Interval arrays are identical — this map avoids duplicating chord data.
 */

/** Curriculum chord ID → engine chord ID */
export const CURRICULUM_TO_ENGINE_CHORD: Record<string, string> = {
  // ── Triads ──────────────────────────────────────────────────
  maj: 'major',
  min: 'minor',
  aug: 'augmented',
  dim: 'diminished',
  sus2: 'sus2',
  sus4: 'sus4',
  quartal: 'quartal',
  maj4: 'major4',
  min4: 'minor4',
  sus_s4: 'sus#4',
  sus_b2: 'susb2',
  sus_b2b5: 'susb2b5',
  sus2_b5: 'sus2b5',
  power: '5',

  // ── Four-note ───────────────────────────────────────────────
  maj6: 'major6',
  min6: 'minor6',
  dim7: 'diminished7',
  min7b5: 'minor7b5',
  dim_maj7: 'diminishedmajor7',
  dom7: 'dominant7',
  maj7: 'major7',
  maj7_s5: 'major7#5',
  maj7_b5: 'major7b5',
  min7: 'minor7',
  min7_s5: 'minor7#5',
  min_maj7: 'minormajor7',
  dom7sus2: 'dominant7sus2',
  dom7sus4: 'dominant7sus4',
  maj7sus2: 'major7sus2',
  maj7sus4: 'major7sus4',
  dom7b5: 'dominant7b5',
  dom7s5: 'dominant7#5',
  add2: 'Add2',
  add4: 'Add4',

  // ── Five-note ───────────────────────────────────────────────
  dom9: 'dominant9',
  dom7b9: 'dominant7b9',
  dom7s9: 'dominant7#9',
  maj9: 'major9',
  min9: 'minor9',
  min69: 'minor6add9',

  // ── Six-note ────────────────────────────────────────────────
  dom7s11: 'dominant7#11',
  maj7s11: 'major7#11',
  dom13: 'dominant13',
  maj13: 'major13',

  // ── Seven-note ──────────────────────────────────────────────
  min13: 'minor13',

  // ── Slash chords (curriculum uses descriptive IDs) ──────────
  maj_over5: 'major/5',
  maj_over4: 'major/4',
  maj_over3: 'major/3',
  maj_over6: 'major/6',
};

/** Engine chord ID → curriculum chord ID (reverse map) */
export const ENGINE_TO_CURRICULUM_CHORD: Record<string, string> =
  Object.fromEntries(
    Object.entries(CURRICULUM_TO_ENGINE_CHORD).map(([k, v]) => [v, k]),
  );

/**
 * Curriculum chord IDs that have NO engine equivalent.
 * These need to be added to chords.ts (Phase 6B) or handled via
 * the curriculum's own Chord Quality Library.
 */
export const CURRICULUM_ONLY_CHORDS = [
  'dom11', // Dominant 11th (omit 3, sus4 implied) [0,5,7,10,14]
  'min11', // Minor 11th [0,3,7,10,14,17]
  'dom13b9', // Dominant 13th (b9, #11) [0,4,10,13,18,21]
  'dom13s9', // Dominant 13th (#9, #11) [0,4,10,15,18,21]
  'dom7b13', // Dominant 7th (9, b13) [0,4,10,14,20]
  'dom7b9b13', // Dominant 7th (b9, #11, b13) [0,4,10,13,18,20]
  'dom7s9b13', // Dominant 7th (#9, #11, b13) [0,4,10,15,18,20]
  'dom7s5_9', // Dominant 7th (#5, 9) [0,4,8,10,14]
  'dom7s5_b9', // Dominant 7th (#5, b9) [0,4,8,10,13]
  'dom7s5_s9', // Dominant 7th (#5, #9) [0,4,8,10,15]
  'dom7b5_9', // Dominant 7th (b5, 9) [0,4,6,10,14]
  'dom7b5_b9', // Dominant 7th (b5, b9) [0,4,6,10,13]
  'dom7b5_s9', // Dominant 7th (b5, #9) [0,4,6,10,15]
] as const;

/**
 * Engine chord IDs that have NO curriculum equivalent.
 * These are engine-specific voicing constructs (mostly slash voicings
 * with specific bass inversions).
 */
export const ENGINE_ONLY_CHORDS = [
  'majorb5',
  'major7diminished',
  'b7dominant7#11',
  'major/1',
  'major/#5',
  'major/7',
  'minor6/5',
  'minor6/b3',
  'minor6/b6',
  'minor7b5/4',
  'minor7b5/5',
  'major7/5',
  'minor7b9',
  'minormajor9',
  'major9#5',
  'diminished7b9',
  'minor7b5b9',
  'major7#9',
  'dominant7#5b9',
  'dominant9#5',
  'minor9b5',
  'dominant7#5#9',
  'major7#5#9',
  'major6add9',
  'sus2b5add6',
] as const;

/**
 * Look up the engine chord ID for a curriculum chord ID.
 * Returns the curriculum ID itself if no mapping exists (for curriculum-only chords).
 */
export function curriculumToEngineChordId(curriculumId: string): string {
  return CURRICULUM_TO_ENGINE_CHORD[curriculumId] ?? curriculumId;
}

/**
 * Look up the curriculum chord ID for an engine chord ID.
 * Returns the engine ID itself if no mapping exists (for engine-only chords).
 */
export function engineToCurriculumChordId(engineId: string): string {
  return ENGINE_TO_CURRICULUM_CHORD[engineId] ?? engineId;
}
