// @vitest-environment jsdom
/**
 * The Ionian (Major) overview on guitar, and the piano overview it shares a
 * page with. Guitar shows the book's scale box where piano shows the
 * keyboard, and its key tiles open the guitar lessons; piano must render and
 * route exactly as before, resume cards included.
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
import { colorForKeyMode } from '@/lib/modeColorShift';

const navigate = vi.fn();
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => navigate,
}));

vi.mock('@/components/PianoKeyboard', () => ({
  PianoKeyboard: () => <div data-testid="piano-keyboard" />,
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

const BOOK_ORDER = [
  'C',
  'G',
  'D',
  'A',
  'E',
  'B',
  'F♯',
  'D♭',
  'A♭',
  'E♭',
  'B♭',
  'F',
];

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

/** The key tiles, in page order ("C Ionian" + the note spelling). */
const keyTiles = () =>
  screen
    .getAllByRole('button')
    .filter((b) => / Ionian/.test(b.textContent ?? ''));
const tileKey = (tile: HTMLElement) => tile.textContent?.split(' Ionian')[0];

/** The scale box (the fret diagram's image, named for its scale). */
const scaleBox = () => screen.getByRole('img', { name: /Major Scale/ });

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

describe('GuitarModeOverview', () => {
  it('shows the book scale box in place of the keyboard', () => {
    renderGuitarAt('/learn/guitar/ionian');
    expect(screen.getByRole('heading', { name: 'Ionian' })).toBeInTheDocument();
    expect(
      screen.getByText('Guitar · The Guitar Atlas, Book One'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('piano-keyboard')).toBeNull();
    // C first, ringing its tonic: string 6, fret 8 in the book.
    expect(scaleBox()).toHaveAccessibleName(
      /^C Major Scale: 8 notes, frets 7 to 11, next: string 6 fret 8/,
    );
  });

  it('follows the note and the key the overview is playing, in its colour', () => {
    renderGuitarAt('/learn/guitar/ionian');
    expect(scaleBox().innerHTML).toContain(colorForKeyMode('C', 'ionian'));
    act(() => vi.advanceTimersByTime(600));
    expect(scaleBox()).toHaveAccessibleName(/next: string 6 fret 10/);
    // Eight notes a key, then on to G.
    act(() => vi.advanceTimersByTime(600 * 7));
    expect(scaleBox()).toHaveAccessibleName(/^G Major Scale/);
    expect(scaleBox().innerHTML).toContain(colorForKeyMode('G', 'ionian'));
  });

  it('mirrors the box for a left-hander', () => {
    const { unmount } = renderGuitarAt('/learn/guitar/ionian');
    const rightHanded = scaleBox().innerHTML;
    unmount();
    useInstrumentStore.setState({ leftHanded: true });
    renderGuitarAt('/learn/guitar/ionian');
    expect(scaleBox().innerHTML).not.toBe(rightHanded);
  });

  it('lists the twelve keys in book order, each opening its guitar lesson', () => {
    renderGuitarAt('/learn/guitar/ionian');
    const tiles = keyTiles();
    expect(tiles.map(tileKey)).toEqual(BOOK_ORDER);
    for (const tile of tiles) fireEvent.click(tile);
    expect(navigate.mock.calls.map(([to]) => to)).toEqual(
      [
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
      ].map((key) => `/learn/guitar/ionian/${key}`),
    );
  });

  it("doesn't resume from piano progress", () => {
    renderGuitarAt('/learn/guitar/ionian');
    expect(screen.queryByText('Continue lesson')).toBeNull();
    expect(progress.useProgressSummary).toHaveBeenCalledWith(false);
  });

  it('makes guitar the Learn instrument', () => {
    renderGuitarAt('/learn/guitar/ionian');
    expect(useInstrumentStore.getState().instrument).toBe('guitar');
  });

  it("shows a mode's own scale box, and its tiles open its lessons", () => {
    renderGuitarAt('/learn/guitar/dorian');
    expect(screen.getByRole('heading', { name: 'Dorian' })).toBeInTheDocument();
    expect(
      screen.getByText('Guitar · Shapes from The Guitar Atlas, Book One'),
    ).toBeInTheDocument();
    // C Dorian from string 6, fret 8.
    expect(
      screen.getByRole('img', { name: /^C Dorian Scale/ }),
    ).toHaveAccessibleName(/frets 7 to 11, next: string 6 fret 8/);
    const tiles = screen
      .getAllByRole('button')
      .filter((b) => / Dorian/.test(b.textContent ?? ''));
    expect(tiles.map((t) => t.textContent?.split(' Dorian')[0])).toEqual(
      BOOK_ORDER,
    );
    fireEvent.click(tiles[6]);
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

describe('ModeOverview on piano (unchanged)', () => {
  function renderPiano() {
    render(
      <MemoryRouter>
        <ModeOverview mode="ionian" />
      </MemoryRouter>,
    );
  }

  it('shows the keyboard, not a scale box', () => {
    renderPiano();
    expect(screen.getByTestId('piano-keyboard')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /Major Scale/ })).toBeNull();
    expect(screen.queryByText(/Guitar Atlas/)).toBeNull();
    expect(progress.useProgressSummary).toHaveBeenCalledWith(true);
  });

  it('opens the piano lesson from a key tile', () => {
    renderPiano();
    const c = keyTiles().find((tile) => tileKey(tile) === 'C')!;
    fireEvent.click(c);
    expect(navigate).toHaveBeenCalledWith('/learn/ionian/c');
  });

  it('still offers to resume a piano lesson', () => {
    renderPiano();
    expect(screen.getByText('Continue lesson')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(navigate).toHaveBeenCalledWith('/learn/ionian/d');
  });
});
