// @vitest-environment jsdom
/**
 * The reflow is a different ARRANGEMENT, never a different slide.
 *
 * Two risks it has to be held to: losing content that the stage shows (the
 * spec's own reading order omits four zones, and the student's input is not in
 * the footer at all), and showing content the stage would gate (a phone must
 * never be the surface where Rule 2 leaks).
 */
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Interaction } from '../../types';
import { SlideRenderer } from '../SlideRenderer';
import type { InteractionSlide, Slide } from '../types';

afterEach(cleanup);

const lt = (en: string) => ({ en });

const interaction = (over: Partial<Interaction> = {}): Interaction => ({
  id: 'i1',
  type: 'choice',
  question: lt('Which one?'),
  shareable: true,
  choice: { options: [lt('A')], multi: false },
  ...over,
});

const questionSlide = (
  over: Partial<InteractionSlide> = {},
): InteractionSlide =>
  ({
    id: 's1',
    kind: 'interaction',
    phase: 'connectRegulate',
    title: lt('Title'),
    interactionIds: ['i1'],
    ...over,
  }) as InteractionSlide;

const zonesOf = (root: HTMLElement) =>
  [...root.querySelectorAll('[data-zone]')].map((e) =>
    e.getAttribute('data-zone'),
  );

describe('reflow keeps every zone the stage renders', () => {
  it.each([
    [
      'bodyShort + tileRow',
      {
        body: lt('Seeded body'),
        launchTiles: [{ id: 't', module: 'globe', activityRef: 'a/b' }],
      },
    ],
    ['plain body', { body: lt('Seeded body') }],
  ])('%s survives the reflow', (_label, extra) => {
    const slide = {
      id: 's1',
      kind: 'content',
      phase: 'connectRegulate',
      title: lt('Title'),
      ...extra,
    } as unknown as Slide;

    const stage = render(
      <SlideRenderer
        slide={slide}
        surface="student"
        language="en"
        interactions={[]}
      />,
    );
    const stageZones = zonesOf(stage.container).sort();
    stage.unmount();

    const reflow = render(
      <SlideRenderer
        slide={slide}
        surface="student"
        language="en"
        interactions={[]}
        layoutMode="reflow"
      />,
    );
    expect(zonesOf(reflow.container).sort()).toEqual(stageZones);
    // The regression the spec's own order would cause.
    expect(screen.getByText('Seeded body')).toBeTruthy();
  });

  it('keeps the question and the input, which live in the band and not the footer', () => {
    // A zone-only reflow drops these: the footer element renders nothing when
    // the band carries the interaction.
    render(
      <SlideRenderer
        slide={questionSlide()}
        surface="student"
        language="en"
        interactions={[interaction()]}
        layoutMode="reflow"
        slots={{ input: () => <div data-testid="input">INPUT</div> }}
      />,
    );
    expect(screen.getByTestId('input')).toBeTruthy();
    expect(screen.getByText('Which one?')).toBeTruthy();
  });

  it('puts the band above the footer, where the middle band would be', () => {
    const { container } = render(
      <SlideRenderer
        slide={questionSlide()}
        surface="student"
        language="en"
        interactions={[interaction()]}
        layoutMode="reflow"
        slots={{ input: () => <div data-testid="input">INPUT</div> }}
      />,
    );
    const order = [
      ...container.querySelectorAll('[data-reflow-band], [data-zone]'),
    ].map((e) =>
      e.hasAttribute('data-reflow-band') ? 'BAND' : e.getAttribute('data-zone'),
    );
    expect(order).toContain('BAND');
    expect(order.indexOf('BAND')).toBeGreaterThan(order.indexOf('title'));
  });
});

describe('reflow does not weaken Rule 2', () => {
  it('never builds a check-in reveal, exactly as the stage does not', () => {
    const reveal = vi.fn(() => <div>REVEALED</div>);
    render(
      <SlideRenderer
        slide={questionSlide({ interactionIds: ['c1'] })}
        surface="student"
        language="en"
        interactions={[interaction({ id: 'c1', type: 'check-in' })]}
        layoutMode="reflow"
        slots={{ reveal }}
      />,
    );
    expect(reveal).not.toHaveBeenCalled();
  });

  it('renders a hidden element in neither mode', () => {
    const slide = {
      id: 's1',
      kind: 'content',
      phase: 'connectRegulate',
      title: lt('Title'),
      body: lt('Hidden body'),
      layout: { body: { x: 64, y: 288, w: 1152, h: 316, hidden: true } },
    } as unknown as Slide;

    const { container } = render(
      <SlideRenderer
        slide={slide}
        surface="student"
        language="en"
        interactions={[]}
        layoutMode="reflow"
      />,
    );
    expect(within(container).queryByText('Hidden body')).toBeNull();
  });
});
