// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Song } from '@/curriculum/types/songLibrary';
import { useInstrumentStore } from '@/features/learn/useInstrumentStore';
import { ExplorePage } from '../ExplorePage';
import { ExploreSongsPage } from '../ExploreSongsPage';

const song = (id: string, title: string, extra: Partial<Song> = {}): Song =>
  ({
    id,
    title,
    artist: 'Someone',
    key: 'C major',
    keyRoot: 0,
    mode: 'major',
    year: 1970,
    difficulty: 2,
    genreTags: ['funk'],
    popularity: 50,
    artistImageSource: 'none',
    ...extra,
  }) as Song;

const SONGS = [
  song('superstition', 'Superstition', {
    artist: 'Stevie Wonder',
    popularity: 95,
  }),
  song('pick_up', 'Pick Up the Pieces', { popularity: 60 }),
  song('cissy', 'Cissy Strut', { popularity: 55, difficulty: 1 }),
  song('jungle', 'Jungle Boogie', { popularity: 50 }),
  song('let_it_be', 'Let It Be', {
    artist: 'The Beatles',
    genreTags: ['rock'],
    difficulty: 1,
    popularity: 90,
  }),
];

vi.mock('@/curriculum/data/songs', () => ({
  getAllSongs: () => SONGS,
}));
vi.mock('@/features/learn/profile/useLearnProfile', () => ({
  useLearnProfile: () => ({
    profile: { level: 'basics' },
    answered: true,
    settled: true,
    save: vi.fn(),
    dismiss: vi.fn(),
  }),
}));
// One object, as the real ledger keeps until it changes
// (useSyncExternalStore loops on a new snapshot every read).
const RECORDS = {};
vi.mock('@/features/cortex/ledger', () => ({
  getCortexRecords: () => RECORDS,
  subscribeCortex: () => () => {},
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({ role: 'student', appUser: { id: 'u1' } }),
}));
vi.mock('@/hooks/useUserBioPreferences', () => ({
  useUserBioPreferences: () => ({
    genres: new Set(['Funk']),
    instruments: new Set(),
    focus: new Set(),
  }),
}));
vi.mock('@/hooks/useIsPremium', () => ({
  useIsPremium: () => ({ isPremium: true, isLoading: false }),
}));
vi.mock('@/hooks/data/progress', () => ({
  useProgressSummary: () => ({ data: { lessons: [] } }),
}));
vi.mock('@/hooks/useUISound', () => ({
  useUISound: () => ({ play: () => {} }),
}));
vi.mock('@/features/learn/genreReadiness', async (importOriginal) => {
  const real =
    await importOriginal<typeof import('@/features/learn/genreReadiness')>();
  return {
    ...real,
    useGenreReadiness: () =>
      real.genreReadinessFrom(new Set(['pop:1:A', 'funk:1:A'])),
  };
});
vi.mock('@/components/ClassroomLayout/home/HomeGlow', () => ({
  HomeGlow: () => null,
}));
vi.mock('@/components/learn/LearnActivityRail', () => ({
  LearnActivityRail: () => null,
}));
vi.mock('@/components/learn/LearnInstrumentPill', () => ({
  LearnInstrumentPill: () => null,
}));
vi.stubGlobal(
  'IntersectionObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);
HTMLCanvasElement.prototype.getContext = () => null;

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{`${pathname}${search}`}</p>;
}

const open = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/learn" element={<ExplorePage />} />
        <Route path="/songs" element={<ExploreSongsPage />} />
      </Routes>
      <Where />
    </MemoryRouter>,
  );

const shelf = (id: string) =>
  document.querySelector<HTMLElement>(`[data-explore-shelf="${id}"]`);

beforeEach(() => {
  useInstrumentStore.setState({ instrument: 'piano', audio: false });
});
afterEach(cleanup);

describe('/learn', () => {
  it('lays out Suno’s shelves: songs, courses, easy songs, Best Of', () => {
    open('/learn');
    expect(screen.getByTestId('explore')).toHaveAttribute(
      'data-explore-view',
      'hub',
    );
    const popular = shelf('popular')!;
    expect(
      within(popular).getByRole('heading', { name: 'Popular songs' }),
    ).toBeInTheDocument();
    // The best-known first.
    expect(
      popular
        .querySelector('[data-explore-song]')
        ?.getAttribute('data-explore-song'),
    ).toBe('superstition');
    expect(
      within(popular).getByRole('link', { name: 'See all: Popular songs' }),
    ).toHaveAttribute('href', '/songs');
    // Their instrument's courses, a section to a shelf, each with its See all.
    expect(
      within(shelf('piano-theory')!).getByRole('link', {
        name: /^See all/,
      }),
    ).toHaveAttribute('href', '/learn?i=keyboard&c=theory');
    expect(
      within(shelf('easy')!).getByRole('link', { name: /^See all/ }),
    ).toHaveAttribute('href', '/songs?difficulty=1');
    // Funk has four songs: a Best of tile, opening the library on it.
    expect(
      screen.getByRole('link', { name: 'Best of Funk, 4 songs' }),
    ).toHaveAttribute('href', '/songs?genre=funk');
  });

  it('offers a Continue before anything is begun: Level 1 · C Ionian, or Sound Basics on Audio', () => {
    open('/learn?i=guitar');
    const strip = (topic: string) =>
      document.querySelector<HTMLElement>(`[data-explore-courses="${topic}"]`)!;
    expect(
      within(strip('guitar')).getByText('Level 1 · C Ionian'),
    ).toBeInTheDocument();
    expect(
      within(strip('guitar')).getByRole('link', { name: /^Start/ }),
    ).toBeInTheDocument();
    cleanup();
    open('/learn?i=audio');
    expect(
      within(strip('audio')).getByText(/^Continue.*Sound Basics/),
    ).toBeInTheDocument();
  });

  it('opens a section’s courses whole from its See all', () => {
    open('/learn?i=guitar&c=theory');
    expect(screen.getByTestId('explore')).toHaveAttribute(
      'data-explore-view',
      'section',
    );
    expect(
      screen.getByRole('heading', { level: 2, name: 'Theory' }),
    ).toBeInTheDocument();
    expect(useInstrumentStore.getState().instrument).toBe('guitar');
  });

  it('heads the page with the Arcade’s nav: the compass, then the instruments', () => {
    open('/learn?i=guitar&c=theory');
    const nav = screen.getByRole('navigation', { name: 'Learn' });
    expect(within(nav).getByRole('link', { name: 'Learn' })).toHaveAttribute(
      'href',
      '/learn',
    );
    const guitar = within(nav).getByRole('link', { name: 'Guitar' });
    expect(guitar).toHaveAttribute('aria-current', 'page');
    // On a section's page, another instrument keeps the section.
    expect(within(nav).getByRole('link', { name: 'Bass' })).toHaveAttribute(
      'href',
      '/learn?i=bass&c=theory',
    );
    // No search bar on the hub any more.
    expect(screen.queryByRole('searchbox')).toBeNull();
  });

  it('searches songs and courses', () => {
    open('/learn?q=stevie');
    expect(screen.getByTestId('explore')).toHaveAttribute(
      'data-explore-view',
      'search',
    );
    expect(
      screen.getByRole('link', { name: 'Superstition by Stevie Wonder' }),
    ).toHaveAttribute('href', '/songs/superstition');
    expect(screen.queryByText('Let It Be')).toBeNull();
  });

  it('says so when nothing matches', () => {
    open('/learn?q=zzzz');
    expect(screen.getByText('Nothing matches “zzzz”.')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Back to Learn' }),
    ).toBeInTheDocument();
  });

  it('sends an old one-page anchor to its section', () => {
    open('/learn#guitar-theory');
    expect(screen.getByTestId('where').textContent).toBe(
      '/learn?i=guitar&c=theory',
    );
  });
});

describe('/songs', () => {
  it('shows shelves, a genre to a shelf', () => {
    open('/songs');
    expect(screen.getByTestId('explore-songs')).toHaveAttribute(
      'data-explore-view',
      'shelves',
    );
    expect(shelf('popular')).not.toBeNull();
    expect(
      within(shelf('genre-funk')!).getByRole('link', { name: /^See all/ }),
    ).toHaveAttribute('href', '/songs?genre=funk');
    // Rock has one song: too few for a shelf.
    expect(shelf('genre-rock')).toBeNull();
    expect(
      screen.getByRole('link', { name: 'Open Set Lists' }),
    ).toHaveAttribute('href', '/songs/setlists');
  });

  it('turns a filter into a grid, by title', () => {
    open('/songs?genre=funk');
    expect(screen.getByTestId('explore-songs')).toHaveAttribute(
      'data-explore-view',
      'grid',
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Funk' }),
    ).toBeInTheDocument();
    const ids = [...document.querySelectorAll('[data-explore-song]')].map(
      (el) => el.getAttribute('data-explore-song'),
    );
    expect(ids).toEqual(['cissy', 'jungle', 'pick_up', 'superstition']);
  });

  it('keeps a search in ?q=', () => {
    open('/songs?q=beatles');
    expect(screen.getByText('1 song')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Let It Be by The Beatles' }),
    ).toBeInTheDocument();
  });

  it('says so when no song fits', () => {
    open('/songs?genre=funk&difficulty=3');
    expect(
      screen.getByText('No songs match these filters.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Clear filters' }),
    ).toBeInTheDocument();
  });
});
