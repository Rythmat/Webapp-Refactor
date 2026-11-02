// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
  it('shows Sound Basics as one unit', () => {
    open();
    const tiles = [
      ...document.querySelectorAll(
        '[data-audio-module="sound-basics"] [data-audio-tile]',
      ),
    ].map((tile) => tile.getAttribute('data-audio-tile'));
    expect(tiles).toEqual(['physics-of-sound']);
  });

  it('opens the unit from its tile', () => {
    open();
    fireEvent.click(screen.getByRole('link', { name: 'Physics of Sound' }));
    expect(screen.getByTestId('at').textContent).toBe(
      '/learn/audio/sound-basics/physics-of-sound',
    );
  });

  it('counts the whole unit on its tile', () => {
    useTutorialProgressStore.setState({
      completedAt: {
        'audio:sound-basics:physics-of-sound:waves:hear': 1,
        'audio:sound-basics:physics-of-sound:waves:predict': 1,
        'audio:sound-basics:physics-of-sound:amplitude:try': 1,
        'audio:sound-basics:physics-of-sound:amplitude:hear': 1,
      },
    });
    open();
    expect(screen.getByText('25%')).toBeTruthy();
  });

  it('locks everything past Sound Basics for a free student', () => {
    isPremium = false;
    open();
    expect(screen.getByRole('link', { name: 'Physics of Sound' })).toBeTruthy();
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
