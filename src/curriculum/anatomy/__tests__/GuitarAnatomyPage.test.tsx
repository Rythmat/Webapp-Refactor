// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GuitarAnatomyPage from '../GuitarAnatomyPage';

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
// Motion off, so parts are where their pose says at once.
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
    <MemoryRouter initialEntries={[`/learn/guitar/technique/anatomy${url}`]}>
      <GuitarAnatomyPage />
      <Search />
    </MemoryRouter>,
  );

const search = () => screen.getByTestId('search').textContent;
const stateOf = (part: string) =>
  document.querySelector(`[data-part="${part}"]`)?.getAttribute('data-state');
const termButton = (name: string) => screen.getByRole('button', { name });

describe('GuitarAnatomyPage', () => {
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

  it('opens on the electric in Explore, nothing chosen', () => {
    open();
    expect(document.querySelector('[data-guitar]')).toHaveAttribute(
      'data-guitar',
      'electric',
    );
    expect(
      document.querySelector('[data-anatomy-explore]'),
    ).toBeInTheDocument();
    expect(stateOf('body')).toBe('idle');
  });

  it('restores the tab, guitar and part from the URL', () => {
    open('?kind=acoustic&part=saddle');
    expect(document.querySelector('[data-guitar]')).toHaveAttribute(
      'data-guitar',
      'acoustic',
    );
    expect(stateOf('saddle')).toBe('lit');
    expect(
      within(
        document.querySelector('[data-term-detail]') as HTMLElement,
      ).getByRole('heading', { name: 'Saddle' }),
    ).toBeInTheDocument();
  });

  it('opens Build it from the URL', () => {
    open('?tab=build&kind=acoustic');
    expect(document.querySelector('[data-anatomy-build]')).toBeInTheDocument();
    expect(document.querySelector('[data-build-target]')).toHaveTextContent(
      'Back',
    );
  });

  it('ignores a part this guitar doesn’t have', () => {
    open('?part=rosette');
    expect(stateOf('body')).toBe('idle');
  });

  it('choosing a word lights the part and writes the URL; again clears it', () => {
    open();
    fireEvent.click(termButton('Nut'));
    expect(stateOf('nut')).toBe('lit');
    expect(stateOf('body')).toBe('dim');
    expect(search()).toBe('?part=nut');
    fireEvent.click(termButton('Nut'));
    expect(stateOf('nut')).toBe('idle');
    expect(search()).toBe('');
  });

  it('pressing a part on the drawing chooses its word', () => {
    open();
    fireEvent.click(screen.getByTestId('part-pickguard'));
    expect(search()).toBe('?part=pickguard');
    expect(termButton('Pickguard')).toHaveAttribute('aria-pressed', 'true');
  });

  it('Escape puts the part back', () => {
    open('?part=nut');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(search()).toBe('');
  });

  it('switching guitars keeps a word both have, and drops one only one has', () => {
    open('?part=fretboard');
    fireEvent.click(screen.getByRole('radio', { name: 'Acoustic' }));
    expect(search()).toContain('kind=acoustic');
    expect(search()).toContain('part=fretboard');
    expect(stateOf('fretboard')).toBe('lit');

    fireEvent.click(termButton('Rosette'));
    fireEvent.click(screen.getByRole('radio', { name: 'Electric' }));
    expect(search()).not.toContain('part=');
  });

  it('Build it: a wrong press names the part, a right one moves on', () => {
    open('?tab=build');
    const target = () => document.querySelector('[data-build-target]');
    expect(target()).toHaveTextContent('Body');
    fireEvent.click(screen.getByTestId('part-nut'));
    expect(screen.getByText(/That’s the Nut\./)).toBeInTheDocument();
    expect(target()).toHaveTextContent('Body');
    fireEvent.click(screen.getByTestId('part-body'));
    expect(target()).toHaveTextContent('Strap Buttons');
    expect(document.querySelector('[data-build-progress]')).toHaveTextContent(
      '1 of 23',
    );
    // Home now: no longer pressable.
    expect(screen.queryByTestId('part-body')).not.toBeInTheDocument();
  });
});
