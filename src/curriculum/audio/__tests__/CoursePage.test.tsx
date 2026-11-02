// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTutorialProgressStore } from '@/features/tutorials/useTutorialProgressStore';
import { CoursePage } from '../CoursePage';

vi.mock('@/components/ui/RequirePremium', () => ({
  RequirePremium: ({ children }: { children: React.ReactNode }) => children,
}));

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
  useTutorialProgressStore.setState({ completedAt: {} });
});

const FINISHED_LAB = Object.fromEntries(
  ['waves', 'compression'].flatMap((topic) =>
    ['hear', 'predict', 'reveal', 'try'].map((step) => [
      `audio:sound-basics:physics-of-sound:${topic}:${step}`,
      1,
    ]),
  ),
);

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

  it('counts the lab done once what’s left of it is', () => {
    useTutorialProgressStore.setState({ completedAt: FINISHED_LAB });
    open('/learn/audio/sound-basics');
    expect(states()).toEqual([
      'physics-of-sound:done',
      'hear-the-kit:next',
      'decibels-and-faders:todo',
    ]);
  });

  it('moves on past a finished lesson, and says Continue on a started one', () => {
    useTutorialProgressStore.setState({
      completedAt: {
        ...FINISHED_LAB,
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

  it('keeps every lesson open, even one still to come', () => {
    open('/learn/audio/sound-basics');
    fireEvent.click(
      screen.getByRole('button', { name: 'Decibels and Faders' }),
    );
    expect(screen.getByTestId('at').textContent).toBe(
      '/learn/audio/sound-basics/decibels-and-faders',
    );
  });

  it('hangs the mic off Gain Staging, on the URL it’s always had', () => {
    open('/learn/audio/signal-path');
    fireEvent.click(screen.getByRole('button', { name: /Take the mic apart/ }));
    expect(screen.getByTestId('at').textContent).toBe(
      '/learn/audio/anatomy/microphone',
    );
  });

  it('sends anything that isn’t a course back to the section', () => {
    open('/learn/audio/gear-anatomy');
    expect(screen.getByTestId('at').textContent).toBe('/learn/audio');
    cleanup();
    open('/learn/audio/nonsense');
    expect(screen.getByTestId('at').textContent).toBe('/learn/audio');
  });
});
