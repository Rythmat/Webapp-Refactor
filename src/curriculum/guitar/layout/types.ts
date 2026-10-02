import type { ReactNode, RefObject } from 'react';
import type { GuitarCenterId } from '@/curriculum/data/guitar/types';
import type { AssessmentResult } from '@/curriculum/hooks/useGenreAssessment';
import type {
  NextStepSuggestion,
  SpeedTrainerControlProps,
} from '@/curriculum/practice';
import type { ActivitySectionId } from '@/curriculum/types/activity';
import type {
  ActivityFlowV2,
  ActivityStepV2,
} from '@/curriculum/types/activity.v2';
import type { LearnGuitarInput } from '@/hooks/music/useLearnInput';
import type { GuitarSetupStep } from '@/learn/components/guitar/GuitarInputSetup';
import type {
  GuitarLoopStatusProps,
  GuitarPracticeNotesProps,
} from '../GuitarLoopStatus';
import type { GuitarStepKind } from '../useGuitarLessonEvaluation';

// ── The guitar lesson layout's contract ────────────────────────────────────
// GenreLessonContainerV2 keeps every hook, timer and handler; on guitar it
// hands this layout plain values and callbacks, grouped by the part of the
// screen that shows them. The layout owns only UI state (which sheet is
// open). Piano never reaches it.
//
// Labels students already know stay as they are: "Demo", "Practice",
// "Play Now", "Try Again", "Next" / "Section Complete", and section buttons
// named "A Melody" / "B Chords" / "D Play-Along" for assistive tech (the
// visible text can drop the letter).

// ── Header ─────────────────────────────────────────────────────────────────

export interface Crumb {
  label: string;
  onClick: () => void;
}

export interface HeaderModel {
  /** "Theory", then "Guitar · Ionian (Major)". */
  crumbs: Crumb[];
  /** The key as written for display: "F♯ major". */
  keyLabel: string;
  keyColor: string;
  /** "A1: Major Scale". */
  subsection: string;
  /** The step's full activity line: "A1.1: Major Scale Ascending (Out of Time)". */
  activity: string;
}

// ── Sections and steps ─────────────────────────────────────────────────────

export type GuitarStepStatus = 'passed' | 'selfReported' | 'attempted' | 'todo';

export interface NavSection {
  id: ActivitySectionId;
  /** "Melody". */
  name: string;
  active: boolean;
  /** Every step of the section passed. */
  done: boolean;
}

export interface NavStep {
  /** "A1.1". */
  code: string;
  /** The activity line without its code: "Major Scale Ascending (Out of Time)". */
  title: string;
  /** "A1: Major Scale" — the step list groups by this. */
  subsection: string;
  status: GuitarStepStatus;
}

export interface StepNavModel {
  sections: NavSection[];
  onSection: (id: ActivitySectionId) => void;
  steps: NavStep[];
  index: number;
  /** Stops anything sounding and opens that step at its preview. */
  goToStep: (index: number) => void;
  /** The ♪ Practice Track button, exactly as today; null when not offered. */
  practiceTrack: { onOpen: () => void } | null;
}

// ── Running the step ───────────────────────────────────────────────────────

export type RunState = 'preview' | 'practice' | 'performance' | 'complete';

export interface RunModel {
  state: RunState;
  /** Between two passes of a practice loop (state reads 'preview' briefly). */
  restartingPass: boolean;
  /** currentStep.direction: what to play. */
  instruction: string;
  /** "Wait for me" (out of time) or "Keep time" (in time), and the mark. */
  listen: { mode: 'waitForMe' | 'keepTime'; passMarkPct: number };
  /** Instruments are loading: Play Now waits. */
  loading: boolean;
  demo: { playing: boolean; play: () => void; stop: () => void };
  /** Practice (checks the guitar setup gate first). */
  practise: () => void;
  /** Play Now / Perform (checks the guitar setup gate first). */
  playNow: () => void;
  /** Leave practice (ends any loop). */
  back: () => void;
  /** Stop a take part-way and return to the preview. */
  stopTake: () => void;
  /** After a missed strum: one thing to try (display only). */
  hint: string | null;
}

export interface TempoModel {
  /** The step's tempo, as set by the student. */
  bpm: number;
  onChange: (bpm: number) => void;
  /** What is playing now (the speed trainer's tempo while it runs). */
  effectiveBpm: number;
  trainer: SpeedTrainerControlProps;
}

export interface PracticePreset {
  id: string;
  label: string;
  start: () => void;
}

export interface PracticeModel {
  loopStatus: GuitarLoopStatusProps;
  notes: GuitarPracticeNotesProps;
  /** Music Map loop presets ("Loop one pass of the map", "Loop bars 1–2"…). */
  presets: PracticePreset[];
}

// ── Guitar input ───────────────────────────────────────────────────────────

export interface InputModel {
  /** The mic / interface handle; null when the input provider has none. */
  handle: LearnGuitarInput | null;
  listening: boolean;
  openSetup: (step?: GuitarSetupStep) => void;
  /** Wait-for-me, nothing heard for 20 s. */
  silence: { checkSetup?: () => void; countItMyself: () => void } | null;
  monitor: boolean;
  onMonitorChange: (on: boolean) => void;
  /** A tone preview strum is about to sound (the mic ignores it). */
  onTonePreview: () => void;
  outputLatencyMs: number;
  openAudioTiming: () => void;
}

// ── After a take ───────────────────────────────────────────────────────────

export interface ResultModel {
  result: AssessmentResult;
  stepKind: GuitarStepKind;
  /** e.g. "Couldn't hear that clearly", "✓ Counted by you"; null = score. */
  headingOverride: string | null;
  feedback: string;
  /** Loop the weakest bars at a slower tempo; null when nothing to suggest. */
  suggestion: NextStepSuggestion | null;
  onSuggestion: () => void;
  /** Some targets were missed, wrong, early or late (markers are on the TAB). */
  hasMistakes: boolean;
  canCountItMyself: boolean;
  onCountItMyself: () => void;
  onOpenSetup?: (step: GuitarSetupStep) => void;
  retry: () => void;
  next: () => void;
  /** "Next" or "Section Complete". */
  nextLabel: string;
}

/** The section-complete offer, copy unchanged from today. */
export interface SectionCompleteModel {
  heading: string;
  blurb: string;
  enterPracticeTrack: () => void;
  continueLabel: string;
  onContinue: () => void;
}

// ── Theory (About this step) ───────────────────────────────────────────────

export interface TheoryModel {
  flow: ActivityFlowV2;
  /** The step as the flow has it. */
  step: ActivityStepV2;
  /** The step as shown (a practice loop's chords). */
  displayStep: ActivityStepV2;
  keyCenter: GuitarCenterId;
  keyColor: string;
  sectionId: ActivitySectionId;
  onHearShape: (frets: string) => void;
  /** Roman numerals are a teacher's setting. */
  canShowRoman: boolean;
  /** Practice tips join the notes while practising. */
  practising: boolean;
}

// ── Slots the container builds ─────────────────────────────────────────────

export interface LayoutSlots {
  /**
   * The TAB box, the slim band under the visuals: the container measures it
   * through this; never remount it.
   */
  tabViewportRef: RefObject<HTMLDivElement>;
  /** GenrePianoRoll (TAB / notation), with the guitar TAB overlays. */
  tab: ReactNode;
  /**
   * GuitarLessonVisuals (chord strip or scale box, fretboard), in the big
   * area above the TAB.
   */
  visuals: ReactNode;
  /** The guitar input setup dialog (lazy), when open. */
  setupModal: ReactNode;
}

export interface GuitarLessonLayoutProps {
  header: HeaderModel;
  nav: StepNavModel;
  run: RunModel;
  /** In-time steps only. */
  tempo: TempoModel | null;
  practice: PracticeModel;
  input: InputModel;
  /** Set once a take is scored. */
  result: ResultModel | null;
  /** The section-complete offer (wins over the result). */
  offer: SectionCompleteModel | null;
  theory: TheoryModel;
  slots: LayoutSlots;
}

/**
 * What the action bar (and the visuals area above the TAB) show, in
 * precedence order.
 */
export type BarState =
  | 'sectionComplete'
  | 'result'
  | 'performance'
  | 'practice'
  | 'preview';
