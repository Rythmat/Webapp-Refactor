/**
 * Phase 2 — Activity flow types.
 *
 * Models the 46 structured learning sequences (14 genres × ~3 levels).
 * Each activity flow has sections A (Melody), B (Chords), C (Bass), D (Play-Along).
 */

/**
 * Assessment type — escalating difficulty of student evaluation.
 * Each type adds a new dimension to the evaluation criteria.
 */
export type AssessmentType =
  | 'pitch_only'
  | 'pitch_order'
  | 'pitch_order_timing'
  | 'pitch_order_timing_duration';

/** Section identifiers within an activity flow */
export type ActivitySectionId = 'A' | 'B' | 'C' | 'D';

/** A single step within an activity section */
export interface ActivityStep {
  /** Step number within the section (1-based) */
  stepNumber: number;
  /** The learning module/category */
  module: string;
  /** Section letter (A/B/C/D) */
  section: ActivitySectionId;
  /** Subsection name (e.g. "Listen & Learn", "Play Along") */
  subsection: string;
  /** Specific activity name */
  activity: string;
  /** Instruction text for the student */
  direction?: string;
  /** Assessment type for this step (null if no assessment) */
  assessment: AssessmentType | null;
  /** Tag for categorization */
  tag: string;
  /** Style reference (artist or style DNA reference) */
  styleRef: string;
  /** Feedback text shown on successful completion */
  successFeedback: string;
  /**
   * Content generation instruction — human-readable query description
   * that gets parsed into pipeline calls by contentGenerationParser.
   * e.g. "Query Melody_Phrase_Rhythm_Library.csv (genre='reggae', note_count=3)"
   */
  contentGeneration?: string;
}

/** A section (A/B/C/D) containing ordered steps */
export interface ActivitySection {
  id: ActivitySectionId;
  /** Display name: "Melody", "Chords", "Bass", "Play-Along" */
  name: string;
  steps: ActivityStep[];
}

/** Technical parameters for an activity flow */
export interface ActivityFlowParams {
  defaultKey: string;
  tempoRange: [min: number, max: number];
  swing: number;
  grooves: string[];
}

/**
 * A complete activity flow for one genre × level combination.
 * Contains all sections and their steps.
 */
export interface ActivityFlow {
  /** Genre identifier */
  genre: string;
  /** Level (1, 2, or 3) */
  level: number;
  /** Display title (e.g. "Afrobeat Foundations") */
  title: string;
  /** Technical parameters */
  params: ActivityFlowParams;
  /** Ordered sections */
  sections: ActivitySection[];
}

/** Result of evaluating student performance on a step */
export interface AssessmentResult {
  /** Whether the student passed */
  passed: boolean;
  /** Overall score 0-100 */
  score: number;
  /** Per-note accuracy details */
  noteResults: NoteResult[];
  /** Grade: A (≥90), B (≥80), C (≥70), or retry (<70) */
  grade: 'A' | 'B' | 'C' | 'retry';
  /** Assessment type used */
  assessmentType: AssessmentType;
}

/** Result for a single note in an assessment */
export interface NoteResult {
  /** Expected MIDI note */
  expected: number;
  /** Received MIDI note (null if missed) */
  received: number | null;
  /** Whether pitch was correct */
  pitchCorrect: boolean;
  /** Timing deviation in ms (null if timing not assessed) */
  timingDeviationMs: number | null;
  /** Duration deviation in ms (null if duration not assessed) */
  durationDeviationMs: number | null;
}
