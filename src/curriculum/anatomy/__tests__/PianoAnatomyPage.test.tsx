// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInstrumentStore } from '@/features/learn/useInstrumentStore';
import PianoAnatomyPage from '../PianoAnatomyPage';

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
vi.mock('@/curriculum/guitar/layout/settingsControls', async (original) => ({
  ...(await original<
    typeof import('@/curriculum/guitar/layout/settingsControls')
  >()),
  // Open, so its rows can be read.
  GuitarSheet: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
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
    <MemoryRouter initialEntries={[`/learn/keyboard/technique/anatomy${url}`]}>
      <PianoAnatomyPage />
      <Search />
    </MemoryRouter>,
  );

const drawing = () => document.querySelector('[data-guitar]');
const search = () => screen.getByTestId('search').textContent;

describe('PianoAnatomyPage', () => {
  afterEach(() => {
    cleanup();
    useInstrumentStore.getState().setLeftHanded(false);
  });
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
  });

  it('offers Grand Piano and Upright Piano, the grand first', () => {
    open();
    expect(screen.getByRole('radio', { name: 'Grand Piano' })).toBeChecked();
    expect(
      screen.getByRole('radio', { name: 'Upright Piano' }),
    ).toBeInTheDocument();
    expect(drawing()).toHaveAttribute('data-guitar', 'grandPiano');
    expect(useInstrumentStore.getState().instrument).toBe('piano');
  });

  it('opens the upright from a short URL word', () => {
    open('?kind=upright');
    expect(drawing()).toHaveAttribute('data-guitar', 'uprightPiano');
    expect(
      screen.getByRole('img', {
        name: 'Exploded diagram of an upright piano',
      }),
    ).toBeInTheDocument();
  });

  it('switching writes the short word and keeps a shared part', () => {
    open('?part=hammers');
    fireEvent.click(screen.getByRole('radio', { name: 'Upright Piano' }));
    expect(search()).toContain('kind=upright');
    expect(search()).toContain('part=hammers');
    fireEvent.click(screen.getByRole('radio', { name: 'Grand Piano' }));
    expect(search()).not.toContain('kind=');
  });

  it('switching drops a part only one piano has', () => {
    open('?part=lyre');
    fireEvent.click(screen.getByRole('radio', { name: 'Upright Piano' }));
    expect(search()).not.toContain('part=');
  });

  it('has no left-handed setting, and ignores one left on', () => {
    useInstrumentStore.getState().setLeftHanded(true);
    open('?part=bridges');
    expect(screen.queryByText('Left-handed')).not.toBeInTheDocument();
    // Still the settings' other row, so the sheet itself is there.
    expect(screen.getByText('Name every part on the diagram')).toBeVisible();
    const right = document
      .querySelector('[data-part="lid"] path')
      ?.getAttribute('d');
    cleanup();
    useInstrumentStore.getState().setLeftHanded(false);
    open('?part=bridges');
    expect(
      document.querySelector('[data-part="lid"] path')?.getAttribute('d'),
    ).toBe(right);
  });

  it('Build it finishes offering the other piano by name', () => {
    open('?tab=build');
    expect(document.querySelector('[data-build-target]')).toHaveTextContent(
      'Legs',
    );
    expect(document.querySelector('[data-build-progress]')).toHaveTextContent(
      'of 23',
    );
  });
});
