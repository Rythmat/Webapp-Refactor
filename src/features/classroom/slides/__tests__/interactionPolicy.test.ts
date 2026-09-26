/**
 * Rule 2, as a table.
 *
 * These branches used to live as hand-written per-surface JSX inside
 * `CheckInSlide` / `ExitPollSlide` / `QuestionSlide` — three files, no tests.
 * Moving every slide kind onto one stage meant moving them; this pins what
 * they said so the move is verifiable rather than asserted.
 */
import { describe, expect, it } from 'vitest';
import type { Interaction } from '../../types';
import { interactionVariant, mayRevealOn } from '../interactionPolicy';
import type { InteractionSlide, SlideSurface } from '../types';

const interaction = (over: Partial<Interaction> = {}): Interaction => ({
  id: 'i1',
  type: 'choice',
  question: { en: 'Q', es: 'P' },
  shareable: true,
  ...over,
});

const slide = (over: Partial<InteractionSlide> = {}): InteractionSlide => ({
  id: 's1',
  kind: 'interaction',
  phase: 'connectRegulate',
  title: { en: 'T', es: 'T' },
  interactionIds: ['i1'],
  ...over,
});

const PROJECTED: SlideSurface[] = ['projector', 'present'];

describe('interactionVariant', () => {
  it('is check-in only when EVERY interaction is a check-in', () => {
    const checkIn = interaction({ id: 'c1', type: 'check-in' });
    expect(interactionVariant(slide(), [checkIn])).toBe('check-in');
    expect(interactionVariant(slide(), [checkIn, interaction()])).not.toBe(
      'check-in',
    );
  });

  it('is exit-poll for a reflect-phase slide with more than one interaction', () => {
    const s = slide({ phase: 'respondReflectReset' });
    expect(
      interactionVariant(s, [interaction(), interaction({ id: 'i2' })]),
    ).toBe('exit-poll');
    // One interaction in the same phase is an ordinary question.
    expect(interactionVariant(s, [interaction()])).toBe('question');
  });

  it('treats an empty interaction list as a question, not a check-in', () => {
    // `every` is vacuously true on an empty array — the guard that stops a
    // slide whose interactions have not resolved yet being classed teacher-only.
    expect(interactionVariant(slide(), [])).toBe('question');
  });
});

describe('mayRevealOn', () => {
  it('never reveals anything to a student', () => {
    for (const variant of ['check-in', 'exit-poll', 'question'] as const) {
      expect(mayRevealOn(variant, 'student', interaction())).toBe(false);
    }
  });

  it('never projects a check-in', () => {
    for (const surface of PROJECTED) {
      expect(
        mayRevealOn('check-in', surface, interaction({ type: 'check-in' })),
      ).toBe(false);
    }
  });

  it('treats present exactly as projector', () => {
    // Present IS the projected surface in a single-screen room. If these ever
    // diverge, the teacher's own screen is the leak.
    const cases: [Parameters<typeof mayRevealOn>[0], Interaction][] = [
      ['check-in', interaction({ type: 'check-in' })],
      ['exit-poll', interaction({ type: 'text' })],
      ['exit-poll', interaction({ type: 'check-in' })],
      ['exit-poll', interaction({ type: 'text', shareable: false })],
      ['question', interaction()],
    ];
    for (const [variant, i] of cases) {
      expect(mayRevealOn(variant, 'present', i)).toBe(
        mayRevealOn(variant, 'projector', i),
      );
    }
  });

  it('projects only shareable text from an exit poll', () => {
    for (const surface of PROJECTED) {
      expect(
        mayRevealOn('exit-poll', surface, interaction({ type: 'text' })),
      ).toBe(true);
      expect(
        mayRevealOn(
          'exit-poll',
          surface,
          interaction({ type: 'text', shareable: false }),
        ),
      ).toBe(false);
      expect(
        mayRevealOn('exit-poll', surface, interaction({ type: 'check-in' })),
      ).toBe(false);
      // A choice question stacked on an exit poll does not project either:
      // the closing wall is the text wall.
      expect(
        mayRevealOn('exit-poll', surface, interaction({ type: 'choice' })),
      ).toBe(false);
    }
  });

  /**
   * The hole the variant-only gating had.
   *
   * A slide outside the reflect phase carrying a text question AND a feelings
   * check-in is variant `question` — so the check-in passed this function and
   * the reveal slot was CALLED for it. `buildProjectorView` refused it
   * downstream, so nothing leaked; but the refusal has to be here too, or the
   * promise this file makes is only true by luck of who provides the slot.
   */
  it.each(PROJECTED)(
    'refuses a check-in on %s even when the slide is not the check-in variant',
    (surface) => {
      const checkIn = interaction({ type: 'check-in' });
      expect(interactionVariant(slide(), [interaction(), checkIn])).toBe(
        'question',
      );
      expect(mayRevealOn('question', surface, checkIn)).toBe(false);
    },
  );

  it.each(PROJECTED)('refuses a showcase offer on %s', (surface) => {
    expect(
      mayRevealOn('question', surface, interaction({ type: 'showcase' })),
    ).toBe(false);
  });

  it.each(PROJECTED)('refuses a non-shareable interaction on %s', (surface) => {
    expect(
      mayRevealOn('question', surface, interaction({ shareable: false })),
    ).toBe(false);
  });

  it('mirrors buildProjectorView exactly for the three hard refusals', () => {
    // If these two ever disagree, the slot runs and builds an aggregate that
    // is then thrown away — the precondition for a leak.
    for (const variant of ['check-in', 'exit-poll', 'question'] as const) {
      for (const i of [
        interaction({ type: 'check-in' }),
        interaction({ type: 'showcase' }),
        interaction({ shareable: false }),
      ]) {
        expect(mayRevealOn(variant, 'projector', i)).toBe(false);
        expect(mayRevealOn(variant, 'present', i)).toBe(false);
      }
    }
  });

  it('gives the teacher every variant, including the check-in aggregate', () => {
    for (const variant of ['check-in', 'exit-poll', 'question'] as const) {
      expect(mayRevealOn(variant, 'teacher', interaction())).toBe(true);
    }
  });
});
