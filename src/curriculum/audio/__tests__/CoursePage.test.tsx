// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTutorialProgressStore } from '@/features/tutorials/useTutorialProgressStore';
import { CoursePage } from '../CoursePage';

let isPremium = true;
vi.mock('@/hooks/useIsPremium', () => ({
  useIsPremium: () => ({ isPremium, isLoading: false }),
}));
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => true }));

const Where = () => <output data-testid="at">{useLocation().pathname}</output>;

const open = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/learn/audio/:module" element={<CoursePage />} />
        <Route path="*" element={<span />} />
      </Routes>
      <Where />
    </MemoryRouter>,
  );

const states = () =>
  [...document.querySelectorAll<HTMLElement>('[data-course-row]')].map(
    (row) => `${row.dataset.courseRow}:${row.dataset.rowState}`,
  );

afterEach(() => {
  cleanup();
  isPremium = true;
  useTutorialProgressStore.setState({ completedAt: {} });
});

const PHYSICS_DONE = { 'audio:sound-basics:physics-of-sound:done': 1 };

describe('a course’s page', () => {
  it('marks the first lesson next for someone new', () => {
    open('/learn/audio/sound-basics');
    expect(states()).toEqual([
      'physics-of-sound:next',
      'hear-the-kit:todo',
      'decibels-and-faders:todo',
    ]);
    expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy();
  });

  it('gives a lab one stop per topic, each with its own progress', () => {
    useTutorialProgressStore.setState({
      completedAt: Object.fromEntries(
        ['hear', 'predict', 'reveal', 'try'].map((step) => [
          `audio:sound-to-electricity:air-to-signal:electromagnetism:${step}`,
          1,
        ]),
      ),
    });
    open('/learn/audio/sound-to-electricity');
    expect(states()).toEqual([
      'electricity:next',
      'electromagnetism:done',
      'transducers:todo',
    ]);
  });

  it('moves on past a finished lesson, and says Continue on a started one', () => {
    useTutorialProgressStore.setState({
      completedAt: {
        ...PHYSICS_DONE,
        'audio:sound-basics:hear-the-kit:done': 1,
        'audio:sound-basics:decibels-and-faders:hook': 1,
      },
    });
    open('/learn/audio/sound-basics');
    expect(states()).toEqual([
      'physics-of-sound:done',
      'hear-the-kit:done',
      'decibels-and-faders:next',
    ]);
    expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy();
  });

  it('doesn’t count steps from when a lesson was a lab', () => {
    useTutorialProgressStore.setState({
      completedAt: { 'audio:sound-basics:physics-of-sound:waves:hear': 1 },
    });
    open('/learn/audio/sound-basics');
    expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy();
  });

  it('selects a disc on the first press and opens it on the second', async () => {
    open('/learn/audio/sound-basics');
    const disc = screen.getByRole('button', { name: 'Decibels and Faders' });
    fireEvent.click(disc);
    expect(screen.getByTestId('at').textContent).toBe(
      '/learn/audio/sound-basics',
    );
    expect(disc.getAttribute('aria-pressed')).toBe('true');
    expect(
      await screen.findByRole('heading', { name: 'Decibels and Faders' }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Jump here' })).toBeTruthy();
    fireEvent.click(disc);
    expect(screen.getByTestId('at').textContent).toBe(
      '/learn/audio/sound-basics/decibels-and-faders',
    );
  });

  it('opens the selected lesson from the card', () => {
    open('/learn/audio/sound-basics');
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(screen.getByTestId('at').textContent).toBe(
      '/learn/audio/sound-basics/physics-of-sound',
    );
  });

  it('walks the path with Up and Down', () => {
    open('/learn/audio/sound-basics');
    const first = screen.getByRole('button', { name: /Physics of Sound/ });
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(
      screen
        .getByRole('button', { name: 'Hear the Kit' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('opens a lab’s topic from its disc', () => {
    open('/learn/audio/sound-color');
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(screen.getByTestId('at').textContent).toBe(
      '/learn/audio/sound-color/tone-and-timbre',
    );
  });

  it('offers the mic from the lesson that uses it', () => {
    open('/learn/audio/signal-path');
    fireEvent.click(screen.getByRole('button', { name: /^Gain Staging/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Take the mic apart' }));
    expect(screen.getByTestId('at').textContent).toBe(
      '/learn/audio/anatomy/microphone',
    );
  });

  it('shows a locked course, and sends the press to the plan', () => {
    isPremium = false;
    open('/learn/audio/sound-color');
    expect(
      screen.getByRole('button', { name: /Strings & Pipes, next, locked/ }),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Subscribe to unlock' }),
    );
    expect(screen.getByTestId('at').textContent).not.toContain(
      'tone-and-timbre',
    );
  });

  it('leads on to the next course', () => {
    open('/learn/audio/sound-basics');
    expect(document.querySelector('[data-up-next]')?.textContent).toContain(
      'Sound Color',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Jump ahead' }));
    expect(screen.getByTestId('at').textContent).toBe(
      '/learn/audio/sound-color',
    );
  });

  it('opens what a level teaches', () => {
    open('/learn/audio/sound-basics');
    fireEvent.click(screen.getByRole('button', { name: /Level 1/ }));
    expect(screen.getByText(/Read faders and meters/)).toBeTruthy();
  });

  it('selects the disc a link names', () => {
    open('/learn/audio/sound-basics?select=hear-the-kit');
    expect(
      screen
        .getByRole('button', { name: 'Hear the Kit' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('sends anything that isn’t a course back to the section', () => {
    open('/learn/audio/gear-anatomy');
    expect(screen.getByTestId('at').textContent).toBe('/learn/audio');
    cleanup();
    open('/learn/audio/nonsense');
    expect(screen.getByTestId('at').textContent).toBe('/learn/audio');
  });
});
