import type { LiteracyStep } from '@/content/musicLiteracy/schemas';
import {
  passProgressKey,
  stepPasses,
  type LiteracyPass,
  type PassesLesson,
} from '@/curriculum/engine/musicLiteracy/passes';
import type {
  LiteracyProgress,
  LiteracyStepProgress,
} from './useLiteracyProgress';

// ── When a step is done ────────────────────────────────────────────────────
// One rule, read everywhere a step counts: the step list's check, Start
// Here's pips and Continue, the path's "done", the Home card.
//
// THE RULE IS NOT DECIDED YET (the product owner is to choose). For now:
//
//   echo         done once its echo has passed. Its module's round (the
//                create pass, the challenge) isn't needed: a round is
//                offered once the module is done, and has its own marks.
//   choose step  done once its choice is made: the player saves that as a
//                pass of the step's tag.
//   replay       done once heard to the end, saved the same way.
//
// A module is passed when every step of it is done (modules.ts
// moduleEchoPassed reads the same saved passes). To require the create
// pass too, add it here; Start Here and the Home card follow.

/** A pass's saved progress (undefined: never tried). */
export const passProgress = (
  progress: LiteracyProgress,
  tag: string,
  pass: LiteracyPass,
): LiteracyStepProgress | undefined => progress[passProgressKey(tag, pass)];

/** Whether the step counts as done (see the rule above). */
export function literacyStepDone(
  step: Pick<LiteracyStep, 'tag'>,
  progress: LiteracyProgress,
): boolean {
  return passProgress(progress, step.tag, 'echo')?.passed ?? false;
}

/** Whether the step has been tried at all, done or not. */
export function literacyStepTried(
  step: Pick<LiteracyStep, 'tag'>,
  progress: LiteracyProgress,
): boolean {
  return passProgress(progress, step.tag, 'echo') !== undefined;
}

/** How one pass stands: passed, tried, or not yet. */
export type PassMark = 'passed' | 'tried' | 'todo';

const markOf = (saved: LiteracyStepProgress | undefined): PassMark =>
  saved?.passed ? 'passed' : saved ? 'tried' : 'todo';

/**
 * How each of a step's passes stands: the echo always, the create pass
 * and the challenge when its module's round has them.
 */
export function stepPassMarks(
  lesson: PassesLesson,
  step: LiteracyStep,
  progress: LiteracyProgress,
): Partial<Record<LiteracyPass, PassMark>> & { echo: PassMark } {
  const passes = stepPasses(lesson, step);
  return {
    echo: markOf(passProgress(progress, step.tag, 'echo')),
    ...(passes.create
      ? { create: markOf(passProgress(progress, step.tag, 'create')) }
      : {}),
    ...(passes.challenge
      ? { challenge: markOf(passProgress(progress, step.tag, 'challenge')) }
      : {}),
  };
}
