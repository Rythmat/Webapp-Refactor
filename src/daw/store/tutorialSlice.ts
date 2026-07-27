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

  startTutorial: (id: string) => void;
  goToTutorialStep: (index: number) => void;
  completeTutorialStep: (celebrate?: boolean) => void;
  quitTutorial: () => void;
}

const RESET = {
  tutorialStepIndex: 0,
  tutorialStepStatus: 'waiting' as TutorialStepStatus,
  tutorialStepCelebrate: true,
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
    }),

  completeTutorialStep: (celebrate = true) =>
    set((s) =>
      s.tutorialStepStatus === 'done'
        ? s
        : { tutorialStepStatus: 'done', tutorialStepCelebrate: celebrate },
    ),

  quitTutorial: () => set({ activeTutorialId: null, ...RESET }),
});
