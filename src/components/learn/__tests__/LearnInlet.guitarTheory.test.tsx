// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigationType } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  useInstrumentStore,
  type LearnInstrument,
} from '@/features/learn/useInstrumentStore';
import type { ProgressSummaryResponse } from '@/lib/progress/types';

// ── Heavy neighbours, stubbed at module level ──────────────────────────────

// Half of C Ionian done on piano, so the piano view shows percentages.
const summary: ProgressSummaryResponse = {
  lessons: [
    {
      lessonId: 'mode-lesson-flow:ionian:c',
      lessonVersion: 1,
      mode: 'ionian',
      root: 'c',
      currentActivityInstanceId: null,
      completedCount: 1,
      totalCount: 2,
      updatedAt: '2026-09-01T00:00:00Z',
    },
  ],
};
vi.mock('@/hooks/data/progress/useProgressSummary', () => ({
  useProgressSummary: () => ({ data: summary }),
}));
const premium = vi.hoisted(() => ({ isPremium: false }));
vi.mock('@/hooks/useIsPremium', () => ({
  useIsPremium: () => ({ isPremium: premium.isPremium }),
}));
vi.mock('@/curriculum/hooks/useCurriculumProgress', () => ({
  buildCurriculumLessonId: (genre: string, level: string) =>
    `curriculum:${genre}:${level}`,
}));
vi.mock('@/curriculum/data/activityFlows', () => ({
  getActivityFlow: async () => undefined,
}));
vi.mock('@/curriculum/data/genreProfiles', () => ({
  getGenreProfile: () => undefined,
}));
vi.mock('@/components/songLibrary/SongLibraryPage', () => ({
  SongLibraryBody: () => null,
}));
vi.mock('@/components/learn/LearnHome', () => ({ LearnHome: () => null }));
vi.mock('@/components/learn/WorldHarmony', () => ({
  WorldHarmony: () => null,
}));
vi.mock('@/daw/components/MeshGradientBg', () => ({
  MeshGradientBg: () => null,
}));
vi.mock('@/components/ui/hex-wave-background', () => ({
  HexWaveBackground: ({ className }: { className?: string }) => (
    <div className={className} />
  ),
}));

// The real chapters, with a hook to hold one back (for the quick-clicks case).
vi.mock('@/components/learn/guitarTheory', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/components/learn/guitarTheory')>();
  return {
    ...actual,
    guitarTheoryChapters: vi.fn(actual.guitarTheoryChapters),
    isTheoryItemOnGuitar: vi.fn(actual.isTheoryItemOnGuitar),
  };
});
const { guitarTheoryChapters, isTheoryItemOnGuitar } = await import(
  '@/components/learn/guitarTheory'
);
const realIsTheoryItemOnGuitar = vi
  .mocked(isTheoryItemOnGuitar)
  .getMockImplementation()!;
const { LearnInlet } = await import('@/components/learn/LearnInlet');

beforeAll(() => {
  // jsdom has no matchMedia; LearnInlet reads it for the grid's column count.
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
});

const LocationProbe = () => {
  const { pathname, search } = useLocation();
  return (
    <output data-testid="location" data-navigation={useNavigationType()}>
      {`${pathname}${search}`}
    </output>
  );
};

function renderLearn(
  url: string,
  instrument: LearnInstrument,
  setSubTab?: (tab: string) => void,
) {
  useInstrumentStore.setState({ instrument });
  render(
    <MemoryRouter initialEntries={[url]}>
      <LearnInlet setSubTab={setSubTab} />
      <LocationProbe />
    </MemoryRouter>,
  );
}

const location = () => screen.getByTestId('location').textContent;
/** How the router got to the current entry: 'POP', 'PUSH' or 'REPLACE'. */
const navigation = () => screen.getByTestId('location').dataset.navigation;

/** A Theory tile, found by its title. */
const tile = (title: string) =>
  screen.getByRole('heading', { name: title }).closest('.group') as HTMLElement;

/** Open a tile the way a click on its art does. */
const openTile = (title: string) =>
  fireEvent.click(tile(title).querySelector('[data-learn-tile]')!);

const DIATONIC_TITLES = [
  'Lydian',
  'Mixolydian',
  'Dorian',
  'Aeolian (Minor)',
  'Phrygian',
  'Locrian',
];

describe('Learn → Theory on guitar', () => {
  afterEach(() => {
    cleanup();
    vi.mocked(guitarTheoryChapters).mockClear();
    vi.mocked(isTheoryItemOnGuitar).mockImplementation(
      realIsTheoryItemOnGuitar,
    );
    useInstrumentStore.setState({ instrument: 'piano', leftHanded: false });
    premium.isPremium = false;
  });

  it('opens every Theory tile on guitar', () => {
    renderLearn('/learn?tab=Theory', 'guitar');

    const ionian = tile('Ionian (Major)');
    expect(ionian).not.toHaveAttribute('aria-disabled');
    // Still savable, and free (no premium lock).
    expect(within(ionian).getByRole('button', { name: 'Save' })).toBeVisible();

    // Every family has guitar lessons (Premium, as on piano).
    for (const title of [
      ...DIATONIC_TITLES,
      'Major Pentatonic',
      'Minor Blues',
      'Harmonic Minor',
      'Phrygian Dominant',
      'Melodic Minor',
      'Altered Dominant',
      'Harmonic Major',
      'Double Harmonic Major',
      'Ultraphrygian',
      'Red',
      'Pink',
    ]) {
      expect(tile(title), title).not.toHaveAttribute('aria-disabled');
    }
    expect(screen.getAllByRole('heading', { level: 3 }).length).toBeGreaterThan(
      40,
    );
    expect(
      screen.queryByText('Coming soon for guitar'),
    ).not.toBeInTheDocument();
    // Guitar tiles show no piano progress.
    expect(screen.queryByText('50%')).not.toBeInTheDocument();
  });

  it('marks a tile with no guitar lessons "Coming soon for guitar"', () => {
    vi.mocked(isTheoryItemOnGuitar).mockImplementation(
      (item) => item.mode !== 'harmonicminor' && realIsTheoryItemOnGuitar(item),
    );
    renderLearn('/learn?tab=Theory', 'guitar');
    const disabled = screen.getByRole('group', {
      name: 'Harmonic Minor: Coming soon for guitar',
    });
    expect(disabled).toHaveAttribute('aria-disabled', 'true');
    expect(
      within(disabled).getByText('Coming soon for guitar'),
    ).toBeInTheDocument();
    // No saved heart, and no premium lock over it.
    expect(
      within(disabled).queryByRole('button', { name: 'Save' }),
    ).not.toBeInTheDocument();
    expect(disabled.closest('[style*="grayscale"]')).toBeNull();
    // Nor does its card lift on hover as if it could be opened.
    const lifts = (el: HTMLElement) =>
      el.querySelector('.spotlight-card')?.getAttribute('data-interactive');
    expect(lifts(disabled)).toBeNull();
    expect(lifts(tile('Ionian (Major)'))).toBe('true');
    // A disabled tile doesn't open.
    openTile('Harmonic Minor');
    expect(location()).toBe('/learn?tab=Theory');
    // On piano it is a tile like any other.
    act(() => useInstrumentStore.setState({ instrument: 'piano' }));
    expect(tile('Harmonic Minor')).not.toHaveAttribute('aria-disabled');
  });

  // A tile opens its page (owner, 2026-10-26): no menus in the grid.
  it("opens a mode's guitar page", () => {
    renderLearn('/learn?tab=Theory', 'guitar');
    openTile('Ionian (Major)');
    expect(location()).toBe('/learn/guitar/ionian');
    expect(
      screen.queryByRole('heading', { name: 'Keys' }),
    ).not.toBeInTheDocument();
  });

  it('opens Premium modes and the other families on guitar too', () => {
    premium.isPremium = true;
    for (const [title, path] of [
      ['Dorian', '/learn/guitar/dorian'],
      ['Ionian #5', '/learn/guitar/ionian%235'],
      ['Minor Blues', '/learn/guitar/minorblues'],
    ] as const) {
      renderLearn('/learn?tab=Theory', 'guitar');
      openTile(title);
      expect(location(), title).toBe(path);
      cleanup();
    }
    expect(guitarTheoryChapters).not.toHaveBeenCalled();
  });

  it('opens a Relative or Parallel tile on its page', () => {
    renderLearn('/learn?tab=Theory', 'guitar');
    openTile('Blue');
    expect(location()).toBe('/learn/keyboard/relative/dflat');
    expect(
      screen.queryByRole('heading', { name: 'Modes' }),
    ).not.toBeInTheDocument();
    cleanup();
    renderLearn('/learn?tab=Theory', 'guitar');
    openTile('F#');
    expect(location()).toBe('/learn/keyboard/parallel/fsharp');
  });

  it('sends ?tab=Technique to Theory on guitar', () => {
    const setSubTab = vi.fn();
    renderLearn('/learn?tab=Technique', 'guitar', setSubTab);
    expect(location()).toBe('/learn?tab=Theory');
    // Replaced, so Back doesn't return to the empty Technique link.
    expect(navigation()).toBe('REPLACE');
    // Theory from the first render: no empty Technique tab in between.
    expect(setSubTab).toHaveBeenCalledWith('Theory');
    expect(setSubTab).not.toHaveBeenCalledWith('Technique');
    expect(screen.getByPlaceholderText('Search modes')).toBeInTheDocument();
    expect(screen.queryByText('Piano Fundamentals')).not.toBeInTheDocument();
  });

  it('opens Start Here, the Music Literacy path, on guitar as on piano', () => {
    for (const instrument of ['guitar', 'piano'] as const) {
      const setSubTab = vi.fn();
      renderLearn('/learn?tab=StartHere', instrument, setSubTab);
      expect(location()).toBe('/learn?tab=StartHere');
      expect(setSubTab).toHaveBeenCalledWith('StartHere');
      expect(
        screen.getByRole('heading', { name: 'Start here: Music Literacy' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('list', { name: 'The Music Literacy path' }).children,
      ).toHaveLength(5);
      cleanup();
    }
  });
});

describe('Learn → Theory on piano', () => {
  afterEach(cleanup);

  it('keeps every tile available with the piano chapters and progress', () => {
    renderLearn('/learn?tab=Theory', 'piano');

    expect(
      screen.queryByText('Coming soon for guitar'),
    ).not.toBeInTheDocument();
    expect(screen.queryAllByRole('group')).toHaveLength(0);
    for (const title of ['Ionian (Major)', 'Dorian', 'Harmonic Minor', 'Red']) {
      expect(tile(title)).not.toHaveAttribute('aria-disabled');
    }
    // Piano progress on the Ionian tile.
    expect(within(tile('Ionian (Major)')).getByText('50%')).toBeInTheDocument();

    openTile('Ionian (Major)');
    expect(location()).toBe('/learn/keyboard/ionian');
    expect(guitarTheoryChapters).not.toHaveBeenCalled();
  });

  it('opens Dorian, and a Relative tile, on piano', () => {
    renderLearn('/learn?tab=Theory', 'piano');
    openTile('Dorian');
    expect(location()).toBe('/learn/keyboard/dorian');
    cleanup();
    renderLearn('/learn?tab=Theory', 'piano');
    openTile('Red');
    expect(location()).toBe('/learn/keyboard/relative/c');
  });

  it("opens a genre's course from the Genre tab", () => {
    renderLearn('/learn?tab=Genre', 'piano');
    openTile('Pop');
    expect(location()).toBe('/curriculum/pop');
    expect(
      screen.queryByRole('heading', { name: 'Levels' }),
    ).not.toBeInTheDocument();
  });

  it('keeps ?tab=Technique on piano', () => {
    renderLearn('/learn?tab=Technique', 'piano');
    expect(location()).toBe('/learn?tab=Technique');
    expect(screen.getByText('Piano Fundamentals')).toBeInTheDocument();
  });
});
