// @vitest-environment jsdom
/**
 * The firewall at the render boundary.
 *
 * `interactionPolicy` says what may be revealed; this asserts `SlideRenderer`
 * actually asks. The strong form is that the reveal slot is never CALLED for a
 * forbidden interaction — a slot that runs has already built the aggregate, so
 * "called but discarded" is a leak waiting for one careless render.
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Interaction } from '../../types';
import { SlideRenderer } from '../SlideRenderer';
import type { InteractionSlide, SlideSurface } from '../types';

// The project runs vitest WITHOUT `globals: true`, so testing-library's
// automatic afterEach-cleanup never registers itself and every render in a
// file piles up in the same document. That silently turns "appears once" into
// "appears five times" — register it explicitly.
afterEach(cleanup);

const lt = (en: string) => ({ en });

const interaction = (over: Partial<Interaction> = {}): Interaction => ({
  id: 'i1',
  type: 'choice',
  question: { en: 'Which one?', es: '¿Cuál?' },
  shareable: true,
  choice: { options: [{ en: 'A', es: 'A' }], multi: false },
  ...over,
});

const slide = (over: Partial<InteractionSlide> = {}): InteractionSlide => ({
  id: 's1',
  kind: 'interaction',
  phase: 'connectRegulate',
  title: { en: 'Title', es: 'Título' },
  interactionIds: ['i1'],
  ...over,
});

const renderSlide = (
  s: InteractionSlide,
  surface: SlideSurface,
  interactions: Interaction[],
) => {
  const reveal = vi.fn(() => <div data-testid="reveal">REVEALED</div>);
  render(
    <SlideRenderer
      slide={s}
      surface={surface}
      language="en"
      interactions={interactions}
      slots={{ reveal }}
    />,
  );
  return reveal;
};

describe('SlideRenderer — Rule 2 at the render boundary', () => {
  it.each(['projector', 'present'] as const)(
    'never builds a check-in reveal on %s',
    (surface) => {
      const checkIn = interaction({ type: 'check-in', id: 'c1' });
      const reveal = renderSlide(slide({ interactionIds: ['c1'] }), surface, [
        checkIn,
      ]);
      expect(reveal).not.toHaveBeenCalled();
      expect(screen.queryByTestId('reveal')).toBeNull();
    },
  );

  it('does build the check-in aggregate for the teacher', () => {
    const checkIn = interaction({ type: 'check-in', id: 'c1' });
    const reveal = renderSlide(slide({ interactionIds: ['c1'] }), 'teacher', [
      checkIn,
    ]);
    expect(reveal).toHaveBeenCalledWith(checkIn);
  });

  it('projects only the shareable text half of an exit poll', () => {
    const text = interaction({ id: 't1', type: 'text', shareable: true });
    const feelings = interaction({ id: 'c1', type: 'check-in' });
    const reveal = renderSlide(
      slide({ phase: 'respondReflectReset', interactionIds: ['t1', 'c1'] }),
      'projector',
      [text, feelings],
    );
    expect(reveal).toHaveBeenCalledWith(text);
    expect(reveal).not.toHaveBeenCalledWith(feelings);
  });

  it('never builds a reveal on a student device', () => {
    const reveal = renderSlide(slide(), 'student', [interaction()]);
    expect(reveal).not.toHaveBeenCalled();
  });

  it('shows the question pre-reveal instead of a blank band', () => {
    // The regression this guards: Rule 9 puts the interaction ELEMENT in the
    // 68px footer strip, so routing interaction slides through the stage
    // without a band layer left a projected question unreadable from the back
    // of a room.
    render(
      <SlideRenderer
        slide={slide()}
        surface="projector"
        language="en"
        interactions={[interaction()]}
      />,
    );
    expect(screen.getByText('Which one?')).toBeTruthy();
  });

  it('shows the question exactly once when the band carries it', () => {
    render(
      <SlideRenderer
        slide={slide()}
        surface="projector"
        language="en"
        interactions={[interaction()]}
      />,
    );
    expect(screen.getAllByText('Which one?')).toHaveLength(1);
  });
});

describe('SlideRenderer — one affordance per interaction', () => {
  /**
   * `app-route` and `showcase` slides carry their interaction in the BAND (the
   * launch affordance / the offer input, from `SlideLiveLayer`), and
   * `migrateSlideV1` ALSO derives a footer interaction element for them —
   * `interactionIdsOf` returns `[slide.interactionId]` for both kinds. Suppress
   * the footer only for `kind: 'interaction'` and the student gets two
   * controls for one question.
   */
  it.each([
    ['app-route', { kind: 'app-route', interactionId: 'i1' }],
    ['showcase', { kind: 'showcase', interactionId: 'i1' }],
  ])('%s renders the student exactly one input affordance', (_k, extra) => {
    const s = {
      id: 's1',
      phase: 'connectRegulate',
      title: lt('Title'),
      ...extra,
    } as unknown as InteractionSlide;
    render(
      <SlideRenderer
        slide={s}
        surface="student"
        language="en"
        interactions={[interaction({ id: 'i1', type: 'atlas' })]}
        slots={{
          input: () => <div data-testid="aff">INPUT</div>,
          launch: () => <div data-testid="aff">LAUNCH</div>,
        }}
      />,
    );
    expect(screen.getAllByTestId('aff')).toHaveLength(1);
  });
});

describe('SlideRenderer — the band is suppressed, the interaction is not', () => {
  it('still shows the student the question and input when the slide carries media', () => {
    // The band only paints over a FREE middle band (SlideStage `hasBandContent`),
    // but the footer element was suppressed unconditionally for every
    // interaction the band *would* have carried. Put a video on a question
    // slide and both paths bow out: no band, no footer element, and the
    // student has no way to answer at all.
    const withMedia = slide({ media: { type: 'youtube', videoId: 'abc' } });
    render(
      <SlideRenderer
        slide={withMedia}
        surface="student"
        language="en"
        interactions={[interaction()]}
        slots={{ input: () => <div data-testid="input">INPUT</div> }}
      />,
    );
    expect(screen.getByTestId('input')).toBeTruthy();
    expect(screen.getByText('Which one?')).toBeTruthy();
  });

  it('shows a projected question slide with media its question', () => {
    const withMedia = slide({ media: { type: 'youtube', videoId: 'abc' } });
    render(
      <SlideRenderer
        slide={withMedia}
        surface="projector"
        language="en"
        interactions={[interaction()]}
      />,
    );
    expect(screen.getAllByText('Which one?').length).toBeGreaterThan(0);
  });
});

describe('SlideRenderer — Present and the projector agree zone for zone', () => {
  const zones = (root: HTMLElement) =>
    [...root.querySelectorAll('[data-zone]')]
      .map((el) => {
        const s = (el as HTMLElement).style;
        return `${el.getAttribute('data-zone')}@${s.left},${s.top},${s.width},${s.height}`;
      })
      .sort();

  it.each([
    ['a plain question', slide(), [interaction()]],
    [
      'an exit poll',
      slide({ phase: 'respondReflectReset', interactionIds: ['t1', 'c1'] }),
      [
        interaction({ id: 't1', type: 'text' }),
        interaction({ id: 'c1', type: 'check-in' }),
      ],
    ],
    [
      'a check-in',
      slide({ interactionIds: ['c1'] }),
      [interaction({ id: 'c1', type: 'check-in' })],
    ],
  ])('%s', (_label, s, interactions) => {
    const a = render(
      <SlideRenderer
        slide={s}
        surface="present"
        language="en"
        interactions={interactions}
      />,
    );
    const presentZones = zones(a.container);
    a.unmount();

    const b = render(
      <SlideRenderer
        slide={s}
        surface="projector"
        language="en"
        interactions={interactions}
      />,
    );
    expect(zones(b.container)).toEqual(presentZones);
    expect(presentZones.length).toBeGreaterThan(0);
  });
});
