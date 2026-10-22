import type { TutorialStep } from '../../tutorials';

/**
 * One free-form card, until a lesson's steps are written, pointing at where
 * the lesson will start.
 */
export const comingSoon = (stage: string, target: string): TutorialStep[] => [
  {
    id: 'coming-soon',
    stage,
    instruction:
      'This lesson is coming soon. Press **Finish** to go on to the next one.',
    target,
  },
];
