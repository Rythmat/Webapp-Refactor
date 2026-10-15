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

  startTutorial: (id: string) => void;
  goToTutorialStep: (index: number) => void;
  completeTutorialStep: (celebrate?: boolean) => void;
  markTutorialStepPrepared: () => void;
  /** Carry on with a lesson where its draft left it: at `stepIndex`, its
   *  preconditions already in place (the draft's view holds them). */
  resumeTutorial: (id: string, stepIndex: number) => void;
  quitTutorial: () => void;
}

const RESET = {
  tutorialStepIndex: 0,
  tutorialStepStatus: 'waiting' as TutorialStepStatus,
  tutorialStepCelebrate: true,
  tutorialStepPrepared: false,
};

export const createTutorialSlice: StateCreator<
  AllSlices,
  [['zustand/subscribeWithSelector', never]],
  [],
  TutorialSlice
> = (set) => ({
  activeTutorialId: null,
  ...RESET,

  startTutorial: (id) => set({ activeTutorialId: id, ...RESET }),

  goToTutorialStep: (index) =>
    set({
      tutorialStepIndex: Math.max(0, index),
      tutorialStepStatus: 'waiting',
      tutorialStepCelebrate: true,
      tutorialStepPrepared: false,
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
      ...RESET,
      tutorialStepIndex: Math.max(0, stepIndex),
      tutorialStepPrepared: true,
    }),

  quitTutorial: () => set({ activeTutorialId: null, ...RESET }),
});
