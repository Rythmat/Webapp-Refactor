/**
 * The passes of a Music Literacy echo step: the runs a student may make of
 * it, one after another.
 *
 *   echo       Pass 1, every echo step: Atlas calls, the student plays it
 *              back exactly (call and response, as Part 1 has always been).
 *   challenge  "Want a challenge just for fun? Go again and play ALL the
 *              notes!" The same run, but the student plays every note along
 *              with Atlas, the words and the call too, then the response;
 *              every note is graded (grading.ts gradeChallenge). Melodic
 *              calls only. On by default: Part 1 has it without a field.
 *   create     Pass 2, "Now Create Your Own Rhythms!": the student plays
 *              their own call on the step's material, Atlas transcribes it,
 *              and they repeat it exactly (createPass.ts). Off unless the
 *              lesson or the step turns it on (Part 2 does, lesson-wide).
 *
 * The lesson's `passes` set the defaults, a step's own `passes` override
 * them. Choose steps and replays have no passes: nothing is graded.
 */

import {
  isChordFigure,
  isEchoStep,
  type LiteracyStep,
  type MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';
import { callBars } from './literacy';

export const LITERACY_PASSES = ['echo', 'challenge', 'create'] as const;
export type LiteracyPass = (typeof LITERACY_PASSES)[number];

/** What a step offers. */
export interface StepPasses {
  /** Pass 1: every echo step. */
  echo: boolean;
  /** The play-every-note challenge, offered after the echo. */
  challenge: boolean;
  /** Pass 2 and its call's length in bars (its repeat's too); null: none. */
  create: { bars: number } | null;
}

const NONE: StepPasses = { echo: false, challenge: false, create: null };

/** The passes a step offers, by its own settings over its lesson's. */
export function stepPasses(
  lesson: Pick<MusicLiteracyLesson, 'passes' | 'steps'>,
  step: LiteracyStep,
): StepPasses {
  if (!isEchoStep(step)) return NONE;
  const chords = isChordFigure(step.call);
  const challenge =
    !chords && (step.passes?.challenge ?? lesson.passes?.challenge ?? true);
  const create = step.passes?.create ?? lesson.passes?.create ?? false;
  const bars = chords
    ? callBars(lesson, step.call)
    : (step.passes?.createBars ?? callBars(lesson, step.call));
  return { echo: true, challenge, create: create ? { bars } : null };
}

/** The passes a step offers, in the order a student meets them. */
export function passOrder(passes: StepPasses): LiteracyPass[] {
  return LITERACY_PASSES.filter((pass) =>
    pass === 'create' ? passes.create !== null : passes[pass],
  );
}

/**
 * A pass's key in the lesson's saved progress: the step's tag for the echo,
 * so Part 1's progress, Start Here and the Home card read as they always
 * have, and `<tag>:challenge` / `<tag>:create` for the others.
 */
export const passProgressKey = (tag: string, pass: LiteracyPass): string =>
  pass === 'echo' ? tag : `${tag}:${pass}`;
