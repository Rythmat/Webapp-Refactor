// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CompassTourButton, tourForTab } from '../CompassTourButton';
import { ShowTourAgainRow } from '../ShowTourAgainRow';
import { useLearnTourStore } from '../learnTourStore';

afterEach(() => {
  cleanup();
  useLearnTourStore.getState().quit();
  localStorage.clear();
  window.history.pushState({}, '', '/');
});

describe('the compass in the Learn menu', () => {
  const compassOn = (url: string) => {
    render(
      <MemoryRouter initialEntries={[url]}>
        <CompassTourButton />
      </MemoryRouter>,
    );
    return screen.getByRole('button');
  };

  it('tours the whole of Learn from the dashboard', () => {
    const compass = compassOn('/learn');
    expect(compass).toHaveAccessibleName('How to Navigate');
    fireEvent.click(compass);
    expect(useLearnTourStore.getState()).toMatchObject({
      tour: 'navigate',
      index: 0,
    });
  });

  it.each([
    ['StartHere', 'startHere', 'Start Here'],
    ['Songs', 'songs', 'Songs'],
    ['Genre', 'genre', 'Genre'],
    ['Theory', 'theory', 'Theory'],
  ])('tours %s on its own page', (tab, tour, title) => {
    const compass = compassOn(`/learn?tab=${tab}`);
    expect(compass).toHaveAccessibleName(`How to use ${title}`);
    fireEvent.click(compass);
    expect(useLearnTourStore.getState().tour).toBe(tour);
  });

  it.each(['Technique', 'WorldHarmony'])(
    'isn’t shown on %s, which has no tour yet',
    (tab) => {
      render(
        <MemoryRouter initialEntries={[`/learn?tab=${tab}`]}>
          <CompassTourButton />
        </MemoryRouter>,
      );
      expect(screen.queryByRole('button')).toBeNull();
      expect(tourForTab(tab)).toBeNull();
    },
  );
});

describe('Lesson Settings: Show the tutorial again', () => {
  it('closes the sheet and starts the lesson tour on this lesson', () => {
    window.history.pushState({}, '', '/learn/keyboard/ionian/c?section=A');
    const onClose = vi.fn();
    render(<ShowTourAgainRow onClose={onClose} />);
    fireEvent.click(
      screen.getByRole('button', { name: /Show the tutorial again/ }),
    );
    expect(onClose).toHaveBeenCalled();
    expect(useLearnTourStore.getState().tour).toBe('lesson');
    expect(useLearnTourStore.getState().ctx.returnTo).toBe(
      '/learn/keyboard/ionian/c?section=A',
    );
  });

  it('isn’t offered where the tour doesn’t fit (Music Literacy)', () => {
    window.history.pushState(
      {},
      '',
      '/curriculum/music-literacy/music-literacy-part-1',
    );
    const { container } = render(<ShowTourAgainRow onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
