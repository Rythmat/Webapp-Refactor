/**
 * A lesson needs Premium when a step of it is in Prism, which is part of
 * Premium (owner decision 8: Prism is not unlocked during lessons): it opens
 * Prism's tab, or spotlights Prism (every anchor in it is `prism-*`). Code
 * lessons say so in their catalog entry, which tutorialCatalog.test.ts holds
 * to this rule; a lesson written in the console is given it.
 */

type StepLike = {
  target?: string | readonly string[];
  requires?: { channelStripTab?: string | null };
};

const PRISM_ANCHOR = (id: string) =>
  id.startsWith('prism-') || id === 'chanstrip-tab-prism';

export const stepUsesPrism = (step: StepLike): boolean =>
  step.requires?.channelStripTab === 'prism' ||
  (step.target === undefined
    ? false
    : (typeof step.target === 'string' ? [step.target] : step.target).some(
        PRISM_ANCHOR,
      ));

export const lessonNeedsPremium = (steps: readonly StepLike[]): boolean =>
  steps.some(stepUsesPrism);
