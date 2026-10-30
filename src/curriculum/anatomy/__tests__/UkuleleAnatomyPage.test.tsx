// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInstrumentStore } from '@/features/learn/useInstrumentStore';
import UkuleleAnatomyPage from '../UkuleleAnatomyPage';
import { compiledInstrument } from '../compileModel';

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

const open = (url = '') =>
  render(
    <MemoryRouter initialEntries={[`/learn/ukulele/technique/anatomy${url}`]}>
      <UkuleleAnatomyPage />
    </MemoryRouter>,
  );

describe('UkuleleAnatomyPage', () => {
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

  it('opens on the ukulele and makes it the Learn instrument', () => {
    open();
    expect(document.querySelector('[data-guitar]')).toHaveAttribute(
      'data-guitar',
      'ukulele',
    );
    expect(useInstrumentStore.getState().instrument).toBe('ukulele');
  });

  it('has no choice of instrument, in either tab', () => {
    open();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    cleanup();
    open('?tab=build');
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it('a finished build offers to go again, and no other instrument', () => {
    open('?tab=build');
    for (const step of compiledInstrument('ukulele', false).buildOrder) {
      fireEvent.click(screen.getByTestId(`part-${step.parts[0]}`));
    }
    expect(document.querySelector('[data-build-card]')).toHaveTextContent(
      'Built',
    );
    expect(
      screen.queryByRole('button', { name: /^Build the/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Again' }));
    expect(document.querySelector('[data-build-target]')).toHaveTextContent(
      'Back',
    );
  });

  it('lights a part from the URL', () => {
    open('?part=rosette');
    expect(
      document
        .querySelector('[data-part="rosette"]')
        ?.getAttribute('data-state'),
    ).toBe('lit');
  });

  it('describes it as a ukulele, not an "concert ukulele"', () => {
    open();
    expect(
      screen.getByRole('img', { name: 'Exploded diagram of a ukulele' }),
    ).toBeInTheDocument();
  });
});
