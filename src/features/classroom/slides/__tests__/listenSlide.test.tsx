// @vitest-environment jsdom
/**
 * The song beside the class's questions (owner, 2026-11-12): the video on
 * the left half, multiple-choice questions on the right, answered on the
 * students' devices.
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Interaction } from '../../types';
import { SlideRenderer } from '../SlideRenderer';
import { listenQuestions } from '../cortex/buildDeck';
import type { Slide } from '../types';

afterEach(cleanup);

const interactions: Interaction[] = listenQuestions().map((q, i) => ({
  id: `ix-${i + 1}`,
  type: 'choice',
  question: q.question,
  shareable: true,
  choice: { options: [...q.options], multi: Boolean(q.multi) },
}));

const slide = {
  id: 's-listen',
  kind: 'interaction',
  phase: 'connectRegulate',
  section: 'showcase',
  presetId: 'listen-questions',
  title: { en: 'Listen' },
  media: { type: 'youtube', videoId: 'rlpZmqGS8rc' },
  interactionIds: interactions.map((i) => i.id),
  reveal: 'bars',
} as Slide;

describe('the listening slide', () => {
  it('lists the questions and their choices beside the video on the room’s screen', () => {
    const { container } = render(
      <SlideRenderer
        slide={slide}
        surface="projector"
        language="en"
        interactions={interactions}
        still
      />,
    );
    const list = container.querySelector('[data-question-list]');
    expect(list).not.toBeNull();
    expect(list!.textContent).toContain('How does this song make you feel?');
    expect(list!.textContent).toContain('What do you think the tempo is?');
    expect(list!.querySelectorAll('li').length).toBe(
      interactions.reduce((n, i) => n + i.choice!.options.length, 0),
    );
    expect(container.querySelector('[data-split-media] img')).not.toBeNull();
  });

  it('gives a student every question to answer, and the video as a still', () => {
    const { container } = render(
      <SlideRenderer
        slide={slide}
        surface="student"
        language="es"
        interactions={interactions}
        slots={{ input: (i) => <button type="button">{i.id}</button> }}
      />,
    );
    for (const i of interactions)
      expect(screen.getByRole('button', { name: i.id })).toBeTruthy();
    expect(screen.getByText('¿Qué instrumentos escuchas?')).toBeTruthy();
    expect(container.querySelector('[data-split-media] img')).not.toBeNull();
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('shows a revealed question’s results in its own place', () => {
    const { container } = render(
      <SlideRenderer
        slide={slide}
        surface="projector"
        language="en"
        interactions={interactions}
        still
        slots={{
          reveal: (i) =>
            i.id === 'ix-3' ? <div data-testid="bars">bars</div> : null,
        }}
      />,
    );
    const list = container.querySelector('[data-question-list]');
    expect(list).not.toBeNull();
    expect(screen.getByTestId('bars')).toBeTruthy();
    // The others still show their choices.
    expect(list!.textContent).toContain('Hopeful');
    expect(list!.textContent).not.toContain('Drums');
  });
});
