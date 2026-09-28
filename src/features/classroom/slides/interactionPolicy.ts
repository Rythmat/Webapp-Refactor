/**
 * Who may see a revealed interaction, by slide variant and surface.
 *
 * This is Rule 2 expressed once, as data. Before the zone stage the same three
 * rules were spread across `CheckInSlide`, `ExitPollSlide` and `QuestionSlide`
 * as hand-written per-surface JSX branches; the stage renders all three through
 * one path, so the gating has to live somewhere it can still be read and
 * tested. Losing it in the move is exactly how a check-in ends up projected.
 *
 * `interaction`, `check-in` and `exit-poll` are NOT slide kinds — there is one
 * `kind: 'interaction'`, and the variant is decided at runtime by the predicate
 * below. Keep that fan-out here so both the renderer and the tests agree on it.
 *
 * The variant narrows what a PROJECTED surface may show; it never widens it.
 * The per-interaction refusals (check-in, showcase, not shareable) apply
 * whatever the variant says, because a mixed slide has no single variant that
 * describes every interaction on it.
 */
import type { Interaction } from '../types';
import type {
  InteractionSlide as InteractionSlideModel,
  SlideSurface,
} from './types';

export type InteractionVariant = 'check-in' | 'exit-poll' | 'question';

/**
 * The runtime fan-out `SlideRenderer` has always used, extracted verbatim:
 * all-check-in slides are check-ins, a reflect-phase slide with more than one
 * interaction is the exit poll, everything else is a question.
 */
export const interactionVariant = (
  slide: InteractionSlideModel,
  interactions: Interaction[],
): InteractionVariant => {
  if (
    interactions.length > 0 &&
    interactions.every((i) => i.type === 'check-in')
  ) {
    return 'check-in';
  }
  if (slide.phase === 'respondReflectReset' && interactions.length > 1) {
    return 'exit-poll';
  }
  return 'question';
};

/**
 * May this surface mount the reveal slot for this interaction?
 *
 * `present` is treated exactly as `projector`: in a single-screen classroom the
 * teacher's Present view IS what the class sees, so it must never be the looser
 * of the two. A student never sees anyone else's responses.
 */
export const mayRevealOn = (
  variant: InteractionVariant,
  surface: SlideSurface,
  interaction: Interaction,
): boolean => {
  if (surface === 'student') return false;
  // The teacher's own panel shows the identified aggregate for every variant;
  // it is already gated upstream by the slot the teacher surface injects.
  if (surface === 'teacher') return true;

  // ── Projected surfaces ──────────────────────────────────────────────────
  // These three refusals mirror `buildProjectorView` EXACTLY (live/buildProjectorView.ts:
  // check-in, showcase, and `shareable === false` are hard-refused there).
  //
  // They are repeated here on purpose. Gating only by VARIANT was wrong: a
  // slide with a text question AND a feelings check-in outside the reflect
  // phase is variant `question`, so the check-in passed this function and the
  // reveal slot was CALLED for it. `buildProjectorView` then returned null, so
  // nothing leaked — but "the slot runs and the aggregate is built, then
  // discarded" is one careless provider away from a leak, and this file's own
  // promise ("check-in responses never reach the class, whatever the surface's
  // slot returns") was false as written.
  //
  // Keyed on the INTERACTION, not the slide's variant, because that is what
  // the rule is actually about.
  if (interaction.type === 'check-in' || interaction.type === 'showcase') {
    return false;
  }
  if (!interaction.shareable) return false;

  switch (variant) {
    case 'check-in':
      return false;
    // The closing knowledge wall projects TEXT: a choice poll stacked on an
    // exit poll is the teacher's own temperature check, not the class wall.
    case 'exit-poll':
      return interaction.type === 'text';
    case 'question':
      return true;
  }
};
