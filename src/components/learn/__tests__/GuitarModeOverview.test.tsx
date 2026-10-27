// @vitest-environment jsdom
/**
 * A mode's page (owner, 2026-10-26): its art filling the page and the key
 * wheel over it. On guitar the wheel's keys open the guitar lessons; on
 * piano the piano lessons, with Continue chips for saved progress.
 */

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GuitarModeOverview from '@/components/learn/GuitarModeOverview';
import { ModeOverview } from '@/components/learn/ModeOverview';
import { LearnRoutes } from '@/constants/routes';
import { useInstrumentStore } from '@/features/learn/useInstrumentStore';

const navigate = vi.fn();
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => navigate,
}));

vi.mock('@/hooks/data/prism', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/data/prism')>()),
  usePrismMode: () => ({ data: undefined }),
}));

// Piano progress on D Ionian: piano shows its resume card, guitar must not.
const progress = vi.hoisted(() => ({
  useProgressSummary: vi.fn((_enabled?: boolean) => ({
    data: {
      lessons: [
        {
          lessonId: 'mode-lesson-flow__d__ionian',
          lessonVersion: 2,
          mode: 'ionian',
          root: 'D',
          currentActivityInstanceId: null,
          completedCount: 3,
          totalCount: 10,
          updatedAt: '2026-09-01T00:00:00.000Z',
        },
      ],
    },
  })),
}));
vi.mock('@/hooks/data/progress', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/data/progress')>()),
  useProgressSummary: progress.useProgressSummary,
}));

const LocationProbe = () => {
  const { pathname, search } = useLocation();
  return <output data-testid="location">{`${pathname}${search}`}</output>;
};

function renderGuitarAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path={LearnRoutes.guitarOverview.definition}
          element={<GuitarModeOverview />}
        />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** The wheel's wedges, clockwise from C at the top. */
const wedges = () => screen.getAllByRole('radio');
/** Past the page's opening morph, or a key's round trip: in fifths. */
const settle = () => act(() => vi.advanceTimersByTime(1500));
/** The star in the wheel. */
const art = () => document.querySelector('[data-mode-art] svg');
/** Each wedge lit ('in'), grey ('out') or neither (null). */
const scaleState = () =>
  wedges().map(
    (w) => w.querySelector('path')?.getAttribute('data-scale') ?? null,
  );
/** The button that opens the chosen key's lesson. */
const start = () => screen.getByRole('button', { name: /^Start / });

beforeEach(() => {
  vi.useFakeTimers();
  useInstrumentStore.setState({ instrument: 'piano', leftHanded: false });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  navigate.mockReset();
  progress.useProgressSummary.mockClear();
});

const GUITAR_ROUTES = [
  'c',
  'g',
  'd',
  'a',
  'e',
  'b',
  'fsharp',
  'dflat',
  'aflat',
  'eflat',
  'bflat',
  'f',
];

describe('GuitarModeOverview', () => {
  it("shows the mode's art and the key wheel, with the book's line", () => {
    renderGuitarAt('/learn/guitar/ionian');
    expect(screen.getByRole('heading', { name: 'Ionian' })).toBeInTheDocument();
    expect(
      screen.getByText('Guitar · The Guitar Atlas, Book One'),
    ).toBeInTheDocument();
    expect(document.querySelector('[data-mode-art]')).not.toBeNull();
    expect(
      screen.getByRole('radiogroup', { name: 'Ionian: choose a key center' }),
    ).toBeInTheDocument();
  });

  it('chooses each key from its wedge, and Start opens its guitar lesson', () => {
    renderGuitarAt('/learn/guitar/ionian');
    settle();
    expect(wedges()).toHaveLength(12);
    // Round the fifths from C (already chosen: choosing it again would turn
    // the wheel chromatic).
    wedges().forEach((_, i) => {
      if (i > 0) {
        fireEvent.click(wedges()[i]);
        settle();
      }
      // Choosing doesn't leave the page; Start does.
      fireEvent.click(start());
    });
    expect(navigate.mock.calls.map(([to]) => to)).toEqual(
      GUITAR_ROUTES.map((key) => `/learn/guitar/ionian/${key}`),
    );
  });

  it("doesn't resume from piano progress", () => {
    renderGuitarAt('/learn/guitar/ionian');
    expect(screen.queryByRole('button', { name: /^Continue/ })).toBeNull();
    expect(progress.useProgressSummary).toHaveBeenCalledWith(false);
  });

  it('makes guitar the Learn instrument', () => {
    renderGuitarAt('/learn/guitar/ionian');
    expect(useInstrumentStore.getState().instrument).toBe('guitar');
  });

  it("opens a mode's own lessons", () => {
    renderGuitarAt('/learn/guitar/dorian');
    expect(screen.getByRole('heading', { name: 'Dorian' })).toBeInTheDocument();
    expect(
      screen.getByText('Guitar · Shapes from The Guitar Atlas, Book One'),
    ).toBeInTheDocument();
    settle();
    fireEvent.click(wedges()[6]);
    expect(navigate).not.toHaveBeenCalled();
    fireEvent.click(start());
    expect(navigate).toHaveBeenCalledWith('/learn/guitar/dorian/fsharp');
    expect(useInstrumentStore.getState().instrument).toBe('guitar');
  });

  it('sends a mode with no guitar content back to Theory', () => {
    renderGuitarAt('/learn/guitar/harmonicMinor');
    expect(screen.getByTestId('location').textContent).toBe(
      '/learn?tab=Theory',
    );
    expect(useInstrumentStore.getState().instrument).toBe('piano');
  });
});

describe('ModeOverview on piano', () => {
  function renderPiano() {
    render(
      <MemoryRouter>
        <ModeOverview mode="ionian" />
      </MemoryRouter>,
    );
  }

  it('shows the art and the wheel, and reads piano progress', () => {
    renderPiano();
    expect(document.querySelector('[data-mode-art]')).not.toBeNull();
    expect(wedges()).toHaveLength(12);
    expect(screen.queryByText(/Guitar Atlas/)).toBeNull();
    expect(progress.useProgressSummary).toHaveBeenCalledWith(true);
  });

  it('starts on C, and opens its piano lesson', () => {
    renderPiano();
    expect(start()).toHaveAccessibleName('Start C Ionian');
    fireEvent.click(start());
    expect(navigate).toHaveBeenCalledWith('/learn/keyboard/ionian/c');
  });

  it('opens chromatic, then morphs wheel and star into fifths, the scale lit in the mode colour', () => {
    renderPiano();
    const order = () => wedges().map((w) => w.getAttribute('aria-label'));
    // Chromatic: the wedges a semitone apart, the star's notes with them.
    expect(art()).toHaveAttribute('data-order', 'chromatic');
    expect(order().slice(0, 4)).toEqual(['C', 'D♭', 'D', 'E♭']);
    // C major's seven lit in either order, the rest grey.
    expect(scaleState().filter((st) => st === 'in')).toHaveLength(7);
    // No names lettered inside the star.
    expect(document.querySelector('.sigil-name')).toBeNull();
    // A beat later, fifths: the wedges round the circle of fifths.
    settle();
    expect(art()).toHaveAttribute('data-order', 'fifths');
    expect(order().slice(0, 4)).toEqual(['C', 'G', 'D', 'A']);
    expect(scaleState().filter((st) => st === 'in')).toHaveLength(7);
    expect(scaleState().filter((st) => st === 'out')).toHaveLength(5);
    // No toggle on the page.
    expect(screen.queryByRole('button', { name: 'Chromatic' })).toBeNull();
  });

  it('turns chromatic round a key chosen, keeping it on its wedge, then back to fifths', () => {
    renderPiano();
    settle();
    const letters = () => wedges().map((w) => w.getAttribute('aria-label'));
    expect(letters().slice(0, 4)).toEqual(['C', 'G', 'D', 'A']);
    // D: chromatic round D, which keeps its wedge (the third); the others
    // close round it a semitone a step.
    fireEvent.click(screen.getByRole('radio', { name: 'D' }));
    expect(art()).toHaveAttribute('data-order', 'chromatic');
    expect(letters().slice(1, 4)).toEqual(['C♯', 'D', 'E♭']);
    expect(wedges()[2]).toHaveAttribute('aria-checked', 'true');
    // Then back to fifths, D still on its wedge.
    settle();
    expect(art()).toHaveAttribute('data-order', 'fifths');
    expect(letters().slice(0, 4)).toEqual(['C', 'G', 'D', 'A']);
    expect(start()).toHaveAccessibleName('Start D Ionian');
    // The chosen key again: the same round trip.
    fireEvent.click(screen.getByRole('radio', { name: 'D' }));
    expect(art()).toHaveAttribute('data-order', 'chromatic');
    settle();
    expect(art()).toHaveAttribute('data-order', 'fifths');
  });

  it('moves the star to the key chosen', () => {
    renderPiano();
    settle();
    const tonic = () =>
      document
        .querySelector('[data-mode-art] [data-degree="0"]')
        ?.getAttribute('data-angle');
    expect(tonic()).toBe('0');
    fireEvent.click(wedges()[1]);
    expect(start()).toHaveAccessibleName('Start G Ionian');
  });

  it('dots the root and the parent key: C and G for C Lydian', () => {
    render(
      <MemoryRouter>
        <ModeOverview mode="lydian" />
      </MemoryRouter>,
    );
    const dotted = [
      ...document.querySelectorAll('[data-mode-art] .sigil-node--accent'),
    ].map((n) => n.getAttribute('data-degree'));
    // C (the 1st degree) and G (the 5th); not the ♯4.
    expect(dotted).toEqual(['0', '4']);
    expect(document.body.textContent).toContain('4th mode of G major');
  });

  it('names the key chosen under the wheel: a click changes it, a hover does not', () => {
    renderPiano();
    settle();
    const named = () => document.querySelector('[data-wheel-center]');
    expect(named()?.textContent).toContain('C Ionian');
    fireEvent.pointerEnter(wedges()[2]);
    expect(named()?.textContent).toContain('C Ionian');
    fireEvent.pointerLeave(wedges()[2]);
    fireEvent.click(wedges()[2]);
    expect(named()?.textContent).toContain('D Ionian');
  });

  it('offers to continue a piano lesson', () => {
    renderPiano();
    fireEvent.click(screen.getByRole('button', { name: /Continue D Ionian/ }));
    expect(navigate).toHaveBeenCalledWith('/learn/keyboard/ionian/d');
  });
});
