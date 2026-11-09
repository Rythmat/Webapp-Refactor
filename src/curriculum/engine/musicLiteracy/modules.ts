/**
 * A lesson's gate, its modules and their rounds.
 *
 * The gate (Part 2's "Choose a Color") is where the student chooses the key
 * and major or minor, once, before anything else: the lesson's first
 * section, when it holds only choose-key and choose-mode steps
 * (`lessonGateSection`). It is not a module: no goal, no round, no card.
 *
 * A module is any other section of the lesson ("Create a Melody"): its
 * steps, the goal said on its card, and its round, what a student may do
 * once they have passed it. A lesson with no sections is one module
 * (Part 1).
 *
 *   create     a second time through the module's echoes, each as its
 *              create pass: their own call, then their repeat of it.
 *   challenge  a second time through its melodies, each as the challenge:
 *              play ALL the notes along with Atlas.
 *   none       nothing more.
 *
 * The round is offered once every step of the module is passed (an echo
 * played back well enough, a choice made), a replay aside: it is optional,
 * done once heard but never waited for. The module's card shows after its
 * last echo, and its header in the step list offers the round after that.
 * A step that opts out (`passes: { create: false }`) is left out of the
 * round. Each round step's progress is kept under its pass key
 * (`<tag>:create`, `<tag>:challenge`), so the round's own progress is
 * those keys: nothing is keyed by a module's title, which can change.
 */

import {
  isChordFigure,
  isEchoStep,
  lessonGateSection,
  moduleRound,
  stepModuleTitles,
  type LiteracyRound,
  type LiteracyStep,
  type MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';
import { callBars } from './literacy';
import {
  passProgressKey,
  roundPass,
  stepPasses,
  type LiteracyPass,
} from './passes';

/** A round's goal when its module says none, by what the round plays. */
export const MODULE_GOALS = {
  melody: 'Create a melody and play it the same way twice.',
  comping: 'Create a chord comping rhythm and play it the same way twice.',
  progression:
    'Create a chord progression with a rhythm and play it the same way twice.',
  challenge: 'Play ALL the notes!',
} as const;

/** The lesson's goal when it says none, for a lesson with a create round. */
export const DEFAULT_LESSON_GOAL =
  'Your goal: create a melody, a chord comping rhythm, or a chord progression with a rhythm, and play it the same way twice.';

/** A chord call longer than this many bars is a progression, not comping. */
const COMPING_BARS = 2;

export interface LiteracyModule {
  /** Its section's title; the lesson's name when it has no sections. */
  title: string;
  /** Its own goal, else its round's (null: no round and no goal). */
  goal: string | null;
  round: LiteracyRound;
  /** Its steps, in order, and their places in the lesson. */
  steps: LiteracyStep[];
  indices: number[];
}

/** What the modules are read from. */
export type ModuleLesson = Pick<
  MusicLiteracyLesson,
  'name' | 'goal' | 'passes' | 'modules' | 'steps'
>;

/** Saved progress, as much of it as a module reads. */
export type ModuleProgress = Readonly<
  Record<string, { passed: boolean } | undefined>
>;

/** The lesson's gate: where the student chooses the key and the mode. */
export interface LiteracyGate {
  /** Its section's title ("Choose a Color"). */
  title: string;
  /** Its steps, in order, and their places in the lesson. */
  steps: LiteracyStep[];
  indices: number[];
}

/** The lesson's gate, or null when it has none (Part 1 has none). */
export function lessonGate(
  lesson: Pick<MusicLiteracyLesson, 'steps'>,
): LiteracyGate | null {
  const gate = lessonGateSection(lesson.steps);
  return gate
    ? {
        title: gate.title,
        steps: gate.indices.map((i) => lesson.steps[i]),
        indices: gate.indices,
      }
    : null;
}

/** The lesson's modules, in the order a student meets them; not the gate. */
export function lessonModules(lesson: ModuleLesson): LiteracyModule[] {
  const titles = stepModuleTitles(lesson.steps);
  const gate = lessonGateSection(lesson.steps);
  const groups = new Map<string | null, number[]>();
  titles.forEach((title, index) => {
    if (gate && title === gate.title) return;
    const group = groups.get(title);
    if (group) group.push(index);
    else groups.set(title, [index]);
  });
  return [...groups].map(([title, indices]) => {
    const steps = indices.map((i) => lesson.steps[i]);
    const round = moduleRound(lesson, title);
    const own =
      title === null
        ? undefined
        : lesson.modules?.find((module) => module.title === title)?.goal;
    const module: LiteracyModule = {
      title: title ?? lesson.name,
      goal: null,
      round,
      steps,
      indices,
    };
    module.goal = own ?? defaultModuleGoal(module, lesson);
    return module;
  });
}

/**
 * The goal of a round that says none: the challenge's, or a create round's
 * by what its steps play (melodies; one or two bars of chords, comping;
 * longer, a progression). Null when it has no steps to play.
 */
export function defaultModuleGoal(
  module: Pick<LiteracyModule, 'round' | 'steps'>,
  lesson: Pick<MusicLiteracyLesson, 'passes' | 'modules' | 'steps'>,
): string | null {
  // A round with nothing to play is none.
  const steps = roundSteps(module, lesson);
  if (module.round === 'none' || steps.length === 0) return null;
  if (module.round === 'challenge') return MODULE_GOALS.challenge;
  const chordBars = steps.flatMap((step) =>
    isEchoStep(step) && isChordFigure(step.call)
      ? [callBars(lesson, step.call)]
      : [],
  );
  if (chordBars.length === 0) return MODULE_GOALS.melody;
  return chordBars.some((bars) => bars > COMPING_BARS)
    ? MODULE_GOALS.progression
    : MODULE_GOALS.comping;
}

/** The module a step is in, by the step's place in the lesson. */
export const moduleOfStep = (
  modules: readonly LiteracyModule[],
  index: number,
): LiteracyModule | undefined =>
  modules.find((module) => module.indices.includes(index));

/** The pass a module's round runs; null when it has none. */
export const modulePass = (
  module: Pick<LiteracyModule, 'round'>,
): LiteracyPass | null => roundPass(module.round);

/**
 * The round's steps: the module's echoes that have its pass (a challenge,
 * its melodies), less any that opt out. Empty for a module with no round.
 */
export function roundSteps(
  module: Pick<LiteracyModule, 'round' | 'steps'>,
  lesson: Pick<MusicLiteracyLesson, 'passes' | 'modules' | 'steps'>,
): LiteracyStep[] {
  const pass = roundPass(module.round);
  if (!pass) return [];
  return module.steps.filter((step) => {
    const passes = stepPasses(lesson, step);
    return pass === 'create' ? passes.create !== null : passes[pass];
  });
}

/**
 * A step nothing waits for: a replay, there to listen to. Heard, it is
 * done; unheard, it holds up no module, card or round.
 */
export const isOptionalStep = (step: Pick<LiteracyStep, 'kind'>): boolean =>
  step.kind === 'replay';

/**
 * Whether the module is passed, so its round is open: every step of it
 * done as stepDone counts it, an echo's echo passed, a choice made (each
 * saved as a pass of the step's tag). A replay is optional: not needed.
 */
export const moduleEchoPassed = (
  module: Pick<LiteracyModule, 'steps'>,
  progress: ModuleProgress,
): boolean =>
  module.steps.every(
    (step) =>
      isOptionalStep(step) ||
      (progress[passProgressKey(step.tag, 'echo')]?.passed ?? false),
  );

/**
 * The module's last echo: passing it (once the rest is passed) shows the
 * module's card. Undefined for a module without an echo.
 */
export function lastEchoIndex(module: LiteracyModule): number | undefined {
  for (let i = module.steps.length - 1; i >= 0; i--) {
    if (isEchoStep(module.steps[i])) return module.indices[i];
  }
  return undefined;
}

/**
 * Whether passing the echo at `index` finishes the module, so its card
 * shows: the module is passed now, and wasn't before, or this is its last
 * echo (played again, it shows the card again).
 */
export function finishesModule(
  module: LiteracyModule,
  index: number,
  before: ModuleProgress,
  after: ModuleProgress,
): boolean {
  if (!moduleEchoPassed(module, after)) return false;
  return !moduleEchoPassed(module, before) || lastEchoIndex(module) === index;
}

/** The progress keys of the module's round: each round step's pass key. */
export function roundProgressKeys(
  module: Pick<LiteracyModule, 'round' | 'steps'>,
  lesson: Pick<MusicLiteracyLesson, 'passes' | 'modules' | 'steps'>,
): string[] {
  const pass = roundPass(module.round);
  if (!pass) return [];
  return roundSteps(module, lesson).map((step) =>
    passProgressKey(step.tag, pass),
  );
}

/** How a module's round stands: every step passed, any tried, or not yet. */
export type RoundMark = 'passed' | 'tried' | 'todo';

/** Null for a module with no round to play. */
export function roundMark(
  module: Pick<LiteracyModule, 'round' | 'steps'>,
  lesson: Pick<MusicLiteracyLesson, 'passes' | 'modules' | 'steps'>,
  progress: ModuleProgress,
): RoundMark | null {
  const keys = roundProgressKeys(module, lesson);
  if (keys.length === 0) return null;
  if (keys.every((key) => progress[key]?.passed)) return 'passed';
  return keys.some((key) => progress[key] !== undefined) ? 'tried' : 'todo';
}

/**
 * Where a round opens: its first step not yet passed, else its first.
 * Undefined for a module with no round.
 */
export function roundStart(
  module: LiteracyModule,
  lesson: Pick<MusicLiteracyLesson, 'passes' | 'modules' | 'steps'>,
  progress: ModuleProgress,
): number | undefined {
  const pass = roundPass(module.round);
  const steps = roundSteps(module, lesson);
  if (!pass || steps.length === 0) return undefined;
  const open =
    steps.find((step) => !progress[passProgressKey(step.tag, pass)]?.passed) ??
    steps[0];
  return lesson.steps.indexOf(open);
}

/**
 * The lesson's one directive, shown at its start: its own goal, else, for
 * a lesson with a create round, the default; null for none (Part 1).
 */
export function lessonGoal(lesson: ModuleLesson): string | null {
  if (lesson.goal) return lesson.goal;
  return lessonModules(lesson).some(
    (module) =>
      module.round === 'create' && roundSteps(module, lesson).length > 0,
  )
    ? DEFAULT_LESSON_GOAL
    : null;
}
