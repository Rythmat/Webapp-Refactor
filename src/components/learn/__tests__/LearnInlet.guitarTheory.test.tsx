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
  fireEvent.click(tile(title).querySelector('.glass-panel')!);

const KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'D♭', 'A♭', 'E♭', 'B♭', 'F'];
const DIATONIC_TITLES = [
  'Lydian',
  'Mixolydian',
  'Dorian',
  'Aeolian (Minor)',
  'Phrygian',
  'Locrian',
];

/** The Keys panel (its "Keys" heading's box). */
const keysPanel = () =>
  screen.getByRole('heading', { name: 'Keys' }).parentElement as HTMLElement;

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
    // Nor does its art zoom on hover as if it could be opened.
    expect(disabled.innerHTML).not.toContain('group-hover:scale-105');
    expect(tile('Ionian (Major)').innerHTML).toContain('group-hover:scale-105');
    // A disabled tile doesn't open.
    openTile('Harmonic Minor');
    expect(
      screen.queryByRole('heading', { name: 'Keys' }),
    ).not.toBeInTheDocument();
    // On piano it is a tile like any other.
    act(() => useInstrumentStore.setState({ instrument: 'piano' }));
    expect(tile('Harmonic Minor')).not.toHaveAttribute('aria-disabled');
  });

  it('opens a harmonic minor mode on its keys and three chapters', async () => {
    renderLearn('/learn?tab=Theory', 'guitar');
    openTile('Ionian #5');
    expect(await screen.findByText('C Ionian #5 Chapters')).toBeInTheDocument();
    expect(await screen.findByText('Play-Along')).toBeInTheDocument();
    expect(screen.getByText('14 steps')).toBeInTheDocument();
    expect(screen.getByText('48 steps')).toBeInTheDocument();
    expect(screen.getByText('9 steps')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Chords'));
    expect(location()).toBe('/learn/guitar/ionian%235/c?section=B');
  });

  it('opens a blues scale on Melody and Play-Along, with no Chords', async () => {
    renderLearn('/learn?tab=Theory', 'guitar');
    openTile('Minor Blues');
    expect(await screen.findByText('Play-Along')).toBeInTheDocument();
    expect(screen.getByText('Melody')).toBeInTheDocument();
    expect(screen.queryByText('Chords')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Play-Along'));
    expect(location()).toBe('/learn/guitar/minorblues/c?section=D');
  });

  it("opens a Relative tile's modes as their guitar lessons", () => {
    renderLearn('/learn?tab=Theory', 'guitar');
    openTile('Red');
    const modes = screen.getByRole('heading', { name: 'Modes' })
      .parentElement as HTMLElement;
    for (const label of [
      'C Ionian',
      'D Dorian',
      'E Phrygian',
      'F Lydian',
      'G Mixolydian',
      'A Aeolian',
      'B Locrian',
    ]) {
      expect(within(modes).getByText(label)).toBeInTheDocument();
    }
    fireEvent.click(within(modes).getByText('D Dorian'));
    expect(location()).toBe('/learn/guitar/dorian/d');
  });

  it("opens a Parallel tile's modes, and spells sharp keys as the URLs do", () => {
    renderLearn('/learn?tab=Theory', 'guitar');
    openTile('Blue');
    fireEvent.click(screen.getByText('F# Lydian'));
    expect(location()).toBe('/learn/guitar/lydian/fsharp');
  });

  it('keeps Relative modes on their piano lessons on piano', () => {
    renderLearn('/learn?tab=Theory', 'piano');
    openTile('Red');
    expect(screen.getByRole('heading', { name: 'Modes' })).toBeInTheDocument();
    fireEvent.click(screen.getByText('D Dorian'));
    expect(location()).toBe('/learn/dorian/d');
  });

  it("opens Ionian (Major) on the book's key centers and their chapters", async () => {
    renderLearn('/learn?tab=Theory', 'guitar');
    openTile('Ionian (Major)');

    const keys = keysPanel();
    for (const key of KEYS) {
      expect(
        within(keys).getByText(`${key} Ionian (Major)`),
      ).toBeInTheDocument();
    }
    // No piano percentages next to the keys.
    expect(within(keys).queryByText(/%/)).not.toBeInTheDocument();

    // The first key is selected and its chapters load from the book.
    expect(
      await screen.findByText('C Ionian (Major) Chapters'),
    ).toBeInTheDocument();
    expect(await screen.findByText('Play-Along')).toBeInTheDocument();
    expect(screen.getByText('Melody')).toBeInTheDocument();
    expect(screen.getByText('20 steps')).toBeInTheDocument();
    expect(screen.getByText('46 steps')).toBeInTheDocument();
    expect(screen.getByText('9 steps')).toBeInTheDocument();
    expect(screen.queryByText('Overview')).not.toBeInTheDocument();
    expect(screen.queryByText('Practice Track')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Chords'));
    expect(location()).toBe('/learn/guitar/ionian/c?section=B');
  });

  it('shows the last key clicked when keys are clicked quickly', async () => {
    renderLearn('/learn?tab=Theory', 'guitar');
    openTile('Ionian (Major)');
    await screen.findByText('Play-Along');

    // G's chapters are held back until after D's have arrived.
    let releaseG: () => void = () => {};
    const actual = vi.mocked(guitarTheoryChapters).getMockImplementation()!;
    vi.mocked(guitarTheoryChapters).mockImplementationOnce(
      (mode, keyLabel) =>
        new Promise((resolve) => {
          releaseG = () => resolve(actual(mode, keyLabel));
        }),
    );
    fireEvent.click(within(keysPanel()).getByText('G Ionian (Major)'));
    fireEvent.click(within(keysPanel()).getByText('D Ionian (Major)'));
    expect(
      await screen.findByText('D Ionian (Major) Chapters'),
    ).toBeInTheDocument();
    await screen.findByText('Melody');

    await act(async () => {
      releaseG();
    });
    expect(screen.getByText('D Ionian (Major) Chapters')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Melody'));
    expect(location()).toBe('/learn/guitar/ionian/d?section=A');
  });

  it("opens a mode's key centers and their chapters (Premium)", async () => {
    premium.isPremium = true;
    renderLearn('/learn?tab=Theory', 'guitar');
    openTile('Dorian');

    const keys = keysPanel();
    for (const key of KEYS) {
      expect(within(keys).getByText(`${key} Dorian`)).toBeInTheDocument();
    }
    expect(await screen.findByText('C Dorian Chapters')).toBeInTheDocument();
    expect(await screen.findByText('26 steps')).toBeInTheDocument();
    expect(screen.getByText('48 steps')).toBeInTheDocument();
    expect(vi.mocked(guitarTheoryChapters)).toHaveBeenCalledWith('dorian', 'C');

    fireEvent.click(screen.getByText('Chords'));
    expect(location()).toBe('/learn/guitar/dorian/c?section=B');
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

  it('closes the open tile when the instrument changes', async () => {
    renderLearn('/learn?tab=Theory', 'guitar');
    openTile('Ionian (Major)');
    await screen.findByText('Play-Along');
    act(() => useInstrumentStore.setState({ instrument: 'piano' }));
    expect(
      screen.queryByRole('heading', { name: 'Keys' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Play-Along')).not.toBeInTheDocument();
  });

  it("keeps the key selected when the book doesn't load, and retries", async () => {
    renderLearn('/learn?tab=Theory', 'guitar');
    openTile('Ionian (Major)');
    await screen.findByText('Play-Along');

    vi.mocked(guitarTheoryChapters).mockRejectedValueOnce(new Error('offline'));
    fireEvent.click(within(keysPanel()).getByText('G Ionian (Major)'));
    expect(
      await screen.findByText('G Ionian (Major) Chapters'),
    ).toBeInTheDocument();
    await act(async () => {});
    expect(screen.queryByText('Play-Along')).not.toBeInTheDocument();

    fireEvent.click(within(keysPanel()).getByText('G Ionian (Major)'));
    expect(await screen.findByText('Play-Along')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Play-Along'));
    expect(location()).toBe('/learn/guitar/ionian/g?section=D');
  });
});

describe('Learn → Theory on piano (unchanged)', () => {
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
    expect(
      within(keysPanel()).getByText('C Ionian (Major)').parentElement,
    ).toHaveTextContent('C Ionian (Major)50%');
    expect(screen.getByText('C Ionian (Major) Chapters')).toBeInTheDocument();
    for (const chapter of ['Overview', 'Melody', 'Chords', 'Practice Track']) {
      expect(screen.getByText(chapter)).toBeInTheDocument();
    }
    expect(screen.queryByText('Play-Along')).not.toBeInTheDocument();
    expect(guitarTheoryChapters).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Chords'));
    expect(location()).toBe('/learn/ionian/c?activity=arpeggiate-1-nh');
  });

  it('opens Dorian on piano', () => {
    renderLearn('/learn?tab=Theory', 'piano');
    openTile('Dorian');
    expect(within(keysPanel()).getByText('C Dorian')).toBeInTheDocument();
  });

  it('keeps ?tab=Technique on piano', () => {
    renderLearn('/learn?tab=Technique', 'piano');
    expect(location()).toBe('/learn?tab=Technique');
    expect(screen.getByText('Piano Fundamentals')).toBeInTheDocument();
  });
});
