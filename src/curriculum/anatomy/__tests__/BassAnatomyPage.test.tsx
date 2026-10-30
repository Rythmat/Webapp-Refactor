// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInstrumentStore } from '@/features/learn/useInstrumentStore';
import BassAnatomyPage from '../BassAnatomyPage';

// The frame's rail and panels aren't this activity: the frame is tested with
// the lessons, and here it only needs to show its children.
vi.mock('@/curriculum/guitar/layout/LessonFrame', () => ({
  LessonFrame: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock('@/curriculum/guitar/layout/GuitarLessonHeader', () => ({
  GuitarLessonHeader: () => null,
}));
vi.mock('@/curriculum/guitar/layout/LessonInsightPanel', () => ({
  LessonInsightPanel: () => null,
}));
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => true }));
vi.mock('framer-motion', async (original) => ({
  ...(await original<typeof import('framer-motion')>()),
  useReducedMotion: () => true,
}));

function Search() {
  const { search } = useLocation();
  return <output data-testid="search">{search}</output>;
}

const open = (url = '') =>
  render(
    <MemoryRouter initialEntries={[`/learn/bass/technique/anatomy${url}`]}>
      <BassAnatomyPage />
      <Search />
    </MemoryRouter>,
  );

const drawing = () => document.querySelector('[data-guitar]');

describe('BassAnatomyPage', () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
  });

  it('opens on the electric bass and makes bass the Learn instrument', () => {
    open();
    expect(drawing()).toHaveAttribute('data-guitar', 'electricBass');
    expect(useInstrumentStore.getState().instrument).toBe('bass');
  });

  it('opens the acoustic bass from the URL', () => {
    open('?kind=acoustic&part=piezo');
    expect(drawing()).toHaveAttribute('data-guitar', 'acousticBass');
    expect(
      document.querySelector('[data-part="piezo"]')?.getAttribute('data-state'),
    ).toBe('lit');
  });

  it('switching keeps a word both have and writes the URL', () => {
    open('?part=fretboard');
    fireEvent.click(screen.getByRole('radio', { name: 'Acoustic' }));
    const search = screen.getByTestId('search').textContent;
    expect(search).toContain('kind=acoustic');
    expect(search).toContain('part=fretboard');
  });

  it('switching drops a word only one has', () => {
    open('?part=neckPocket');
    fireEvent.click(screen.getByRole('radio', { name: 'Acoustic' }));
    expect(screen.getByTestId('search').textContent).not.toContain('part=');
  });

  it('Build it asks for the bass’s own parts', () => {
    open('?tab=build');
    expect(document.querySelector('[data-build-progress]')).toHaveTextContent(
      '0 of 19',
    );
    fireEvent.click(screen.getByTestId('part-body'));
    fireEvent.click(screen.getByTestId('part-strapButtons'));
    fireEvent.click(screen.getByTestId('part-pickguard'));
    expect(document.querySelector('[data-build-target]')).toHaveTextContent(
      'Pickup',
    );
  });
});
