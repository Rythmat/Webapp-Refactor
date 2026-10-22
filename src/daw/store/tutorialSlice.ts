import type { StateCreator } from 'zustand';
import type { AllSlices } from './index';

// ── Tutorial Slice ─────────────────────────────────────────────────────────
// Runtime state for the step-by-step Studio tutorials. Content-agnostic on
// purpose: the actual lessons live in the Tutorial component layer
// (components/Tutorial/tutorials.ts). This slice only tracks which lesson is
// running, which step, and whether the current step's action has been detected.
// The TutorialLayer component reads these fields, resolves the step from the
// lesson data, applies step preconditions, and drives detection.

export type TutorialStepStatus = 'waiting' | 'done';

/**
 * A step with a "watch me" demo (TutorialStep.demo) plays it first: 'watch'
 * while it plays, then 'turn', the student's go, when its check is armed.
 * A step without a demo is always 'turn'.
 */
export type TutorialDemoPhase = 'watch' | 'turn';

export interface TutorialSlice {
  /** Id of the running tutorial, or null when no lesson is active. */
  activeTutorialId: string | null;
  /** Index of the current step within the active tutorial. */
  tutorialStepIndex: number;
  /** 'waiting' until the step's action is detected (or Next on free-form). */
  tutorialStepStatus: TutorialStepStatus;
  /** Whether the last completion should celebrate (confetti). False when a
   *  step's precondition was already satisfied on arrival, so we advance
   *  quietly instead of firing confetti for something the user didn't do. */
  tutorialStepCelebrate: boolean;
  /** Whether the current step's preconditions (its view, panel, tab) are in
   *  place: the layer applies them once, as the step arrives. A remounted
   *  layer, or a lesson resumed with its draft (milestone 1.15), finds them
   *  there and leaves the student's view as it is. */
  tutorialStepPrepared: boolean;
  /** Whether the step's demo is playing ('watch') or it is the student's go. */
  tutorialDemoPhase: TutorialDemoPhase;
  /** Counts the demo's plays, so "Show me again" replays it from the top. */
  tutorialDemoRun: number;
  /**
   * A course lesson just finished: its end card (Next: <title>) shows over
   * the Studio until the student moves on. Null otherwise. The lesson itself
   * is no longer running (activeTutorialId is null).
   */
  finishedTutorialId: string | null;

  /**
   * Run lesson `id` from its first step on the project that is open: no
   * reset, no navigation. A lesson's "in place" start (the next lesson of a
   * course, Learn the Studio with this song); the editor's ?tutorial= boot
   * opens a project for it first and then calls this.
   */
  startTutorial: (id: string) => void;
  goToTutorialStep: (index: number) => void;
  completeTutorialStep: (celebrate?: boolean) => void;
  markTutorialStepPrepared: () => void;
  /** Carry on with a lesson where its draft left it: at `stepIndex`, its
   *  preconditions already in place (the draft's view holds them). */
  resumeTutorial: (id: string, stepIndex: number) => void;
  quitTutorial: () => void;
  /** The step's demo starts playing (again, after "Show me again"). */
  beginTutorialDemo: () => void;
  /** The demo is over, or skipped: the student's turn. */
  endTutorialDemo: () => void;
  /** A course lesson is done: stop it and show its end card. */
  finishTutorial: () => void;
  /** Close a finished lesson's end card. */
  dismissFinishedTutorial: () => void;
}

const RESET = {
  tutorialStepIndex: 0,
  tutorialStepStatus: 'waiting' as TutorialStepStatus,
  tutorialStepCelebrate: true,
  tutorialStepPrepared: false,
  tutorialDemoPhase: 'turn' as TutorialDemoPhase,
};

export const createTutorialSlice: StateCreator<
  AllSlices,
  [['zustand/subscribeWithSelector', never]],
  [],
  TutorialSlice
> = (set) => ({
  activeTutorialId: null,
  ...RESET,
  tutorialDemoRun: 0,
  finishedTutorialId: null,

  startTutorial: (id) =>
    set({ activeTutorialId: id, finishedTutorialId: null, ...RESET }),

  goToTutorialStep: (index) =>
    set({
      tutorialStepIndex: Math.max(0, index),
      tutorialStepStatus: 'waiting',
      tutorialStepCelebrate: true,
      tutorialStepPrepared: false,
      tutorialDemoPhase: 'turn',
    }),

  completeTutorialStep: (celebrate = true) =>
    set((s) =>
      s.tutorialStepStatus === 'done'
        ? s
        : { tutorialStepStatus: 'done', tutorialStepCelebrate: celebrate },
    ),

  markTutorialStepPrepared: () =>
    set((s) => (s.tutorialStepPrepared ? s : { tutorialStepPrepared: true })),

  resumeTutorial: (id, stepIndex) =>
    set({
      activeTutorialId: id,
      finishedTutorialId: null,
      ...RESET,
      tutorialStepIndex: Math.max(0, stepIndex),
      tutorialStepPrepared: true,
    }),

  quitTutorial: () =>
    set({ activeTutorialId: null, finishedTutorialId: null, ...RESET }),

  beginTutorialDemo: () =>
    set((s) =>
      s.activeTutorialId === null
        ? s
        : {
            tutorialDemoPhase: 'watch',
            tutorialDemoRun: s.tutorialDemoRun + 1,
          },
    ),

  endTutorialDemo: () =>
    set((s) =>
      s.tutorialDemoPhase === 'turn' ? s : { tutorialDemoPhase: 'turn' },
    ),

  finishTutorial: () =>
    set((s) => ({
      activeTutorialId: null,
      finishedTutorialId: s.activeTutorialId,
      ...RESET,
    })),

  dismissFinishedTutorial: () =>
    set((s) =>
      s.finishedTutorialId === null ? s : { finishedTutorialId: null },
    ),
});
