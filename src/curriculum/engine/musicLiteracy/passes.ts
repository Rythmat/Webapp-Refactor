/**
 * The passes of a Music Literacy echo step: the runs a student may make of
 * it.
 *
 *   echo       every echo step, the module's first time through: Atlas
 *              calls, the student plays it back exactly (call and response,
 *              as Part 1 has always been).
 *   challenge  a challenge round's (modules.ts): "Go again and play ALL the
 *              notes!" The same run, but the student plays every note along
 *              with Atlas, the words and the call too, then the response;
 *              every note is graded (grading.ts gradeChallenge). Melodic
 *              calls only. Part 1's round.
 *   create     a create round's: "Now go again and create your own." The
 *              student plays their own call on the step's material, Atlas
 *              transcribes it, and they repeat it exactly (createPass.ts).
 *              Part 2's round.
 *
 * Which round a step's module has is the module's (`modules`), else the
 * lesson's default (`passes`). A step's own `passes` opts it out: a
 * `false` leaves it out of the round. Choose steps and replays have no
 * passes: nothing is graded.
 */

import {
  isChordFigure,
  isEchoStep,
  stepRound,
  type LiteracyRound,
  type LiteracyStep,
  type MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';
import { callBars } from './literacy';

export const LITERACY_PASSES = ['echo', 'challenge', 'create'] as const;
export type LiteracyPass = (typeof LITERACY_PASSES)[number];

/** What a step offers. */
export interface StepPasses {
  /** The echo: every echo step. */
  echo: boolean;
  /** The play-every-note challenge: a challenge round's melodies. */
  challenge: boolean;
  /** The create pass and its call's length in bars (its repeat's too); null: none. */
  create: { bars: number } | null;
}

const NONE: StepPasses = { echo: false, challenge: false, create: null };

/** The lesson a step's passes are read from. */
export type PassesLesson = Pick<
  MusicLiteracyLesson,
  'passes' | 'modules' | 'steps'
>;

/** The passes a step offers: its module's round, unless it opts out. */
export function stepPasses(
  lesson: PassesLesson,
  step: LiteracyStep,
): StepPasses {
  if (!isEchoStep(step)) return NONE;
  const round = stepRound(lesson, step);
  const chords = isChordFigure(step.call);
  const challenge =
    round === 'challenge' && !chords && step.passes?.challenge !== false;
  const create = round === 'create' && step.passes?.create !== false;
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

/** The pass a round runs on each of its steps; null for none. */
export const roundPass = (round: LiteracyRound): LiteracyPass | null =>
  round === 'none' ? null : round;

/**
 * A pass's key in the lesson's saved progress: the step's tag for the echo,
 * so Part 1's progress, Start Here and the Home card read as they always
 * have, and `<tag>:challenge` / `<tag>:create` for the others.
 */
export const passProgressKey = (tag: string, pass: LiteracyPass): string =>
  pass === 'echo' ? tag : `${tag}:${pass}`;
