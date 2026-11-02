// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSavedItemsStore } from '@/features/learn/useSavedItemsStore';
import { useTutorialProgressStore } from '@/features/tutorials/useTutorialProgressStore';
import { AudioHub } from '../AudioHub';

let isPremium = true;
vi.mock('@/hooks/useIsPremium', () => ({
  useIsPremium: () => ({ isPremium, isLoading: false }),
}));

const Where = () => <output data-testid="at">{useLocation().pathname}</output>;
const open = () =>
  render(
    <MemoryRouter initialEntries={['/learn/audio']}>
      <AudioHub />
      <Where />
    </MemoryRouter>,
  );

afterEach(() => {
  cleanup();
  isPremium = true;
  useSavedItemsStore.setState({ saved: {} });
  useTutorialProgressStore.setState({ completedAt: {} });
});

describe('the Audio hub', () => {
  it('puts the course’s modules on one shelf, in teaching order', () => {
    open();
    const tiles = [
      ...document.querySelectorAll(
        '[data-audio-shelf="Course"] [data-audio-tile]',
      ),
    ].map((tile) => tile.getAttribute('data-audio-tile'));
    expect(tiles).toEqual([
      'sound-basics',
      'sound-color',
      'waves-together',
      'hearing',
      'sound-to-electricity',
      'signal-path',
    ]);
  });

  it('keeps Anatomy and Hands On on their own shelves, below the course', () => {
    open();
    expect(
      [...document.querySelectorAll('[data-audio-shelf]')].map((shelf) =>
        shelf.getAttribute('data-audio-shelf'),
      ),
    ).toEqual(['Course', 'Instrument Anatomy', 'Gear Anatomy', 'Hands On']);
  });

  it('locks each tile by its own module, on the shared shelf', () => {
    isPremium = false;
    open();
    const course = document.querySelector('[data-audio-shelf="Course"]')!;
    expect(
      within(course as HTMLElement).getAllByRole('button', {
        name: /subscribe to unlock/,
      }),
    ).toHaveLength(5);
    expect(
      within(course as HTMLElement).getByRole('link', {
        name: 'Sound Basics',
      }),
    ).toBeTruthy();
  });

  it('opens a course’s page from its tile', () => {
    open();
    fireEvent.click(screen.getByRole('link', { name: 'Sound Basics' }));
    expect(screen.getByTestId('at').textContent).toBe(
      '/learn/audio/sound-basics',
    );
  });

  it('counts every lesson in the course on its tile', () => {
    useTutorialProgressStore.setState({
      completedAt: {
        'audio:sound-basics:physics-of-sound:waves:hear': 1,
        'audio:sound-basics:physics-of-sound:waves:predict': 1,
        'audio:sound-basics:hear-the-kit:done': 1,
      },
    });
    open();
    // A quarter of what's left of the lab, all of one lesson, none of another.
    expect(screen.getByText('42%')).toBeTruthy();
  });

  it('locks everything past Sound Basics for a free student', () => {
    isPremium = false;
    open();
    expect(screen.getByRole('link', { name: 'Sound Basics' })).toBeTruthy();
    expect(
      screen.getAllByRole('button', { name: /subscribe to unlock/ }),
    ).toHaveLength(14);
  });

  it('keeps Anatomy’s hearts, by the same key, without opening the lesson', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Save Synth Anatomy' }));
    expect(
      useSavedItemsStore.getState().saved['technique:Synth Anatomy'],
    ).toBeTruthy();
    expect(screen.getByTestId('at').textContent).toBe('/learn/audio');
    expect(
      screen.getByRole('button', { name: 'Remove Synth Anatomy from saved' }),
    ).toBeTruthy();
  });
});
