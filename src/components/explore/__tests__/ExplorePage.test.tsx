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
    audioSources: [
      { provider: 'youtube', uri: 'https://youtube.com/watch?v=0CFuCYNx-1g' },
    ],
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
  it('lays out the courses alone: the songs live on /songs (owner, 2026-11-11)', () => {
    open('/learn');
    expect(screen.getByTestId('explore')).toHaveAttribute(
      'data-explore-view',
      'hub',
    );
    // Their instrument's courses, a section to a shelf, each with its See all.
    expect(
      within(shelf('piano-theory')!).getByRole('link', {
        name: /^See all/,
      }),
    ).toHaveAttribute('href', '/learn?i=keyboard&c=theory');
    for (const id of ['for-you', 'popular', 'easy', 'best-of']) {
      expect(shelf(id)).toBeNull();
    }
    expect(document.querySelector('[data-explore-song]')).toBeNull();
  });

  it('opens on the shelves, with no Continue bar over them (owner, 2026-11-10)', () => {
    open('/learn?i=guitar');
    const courses = document.querySelector<HTMLElement>(
      '[data-explore-courses="guitar"]',
    )!;
    expect(within(courses).queryByText('Level 1 · C Ionian')).toBeNull();
    expect(within(courses).queryByRole('link', { name: /^Start/ })).toBeNull();
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

  it('heads the page with its title, then the instruments as tabs', () => {
    open('/learn?i=guitar&c=theory');
    const title = screen.getByRole('heading', { level: 1, name: 'Learn' });
    expect(within(title).getByRole('link', { name: 'Learn' })).toHaveAttribute(
      'href',
      '/learn',
    );
    const nav = screen.getByRole('navigation', { name: 'Learn' });
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

  it('searches courses, not songs', () => {
    open('/learn?q=theory');
    expect(screen.getByTestId('explore')).toHaveAttribute(
      'data-explore-view',
      'search',
    );
    expect(screen.getByText(/courses? for “theory”/)).toBeInTheDocument();
    open('/learn?q=stevie');
    expect(screen.getByText('Nothing matches “stevie”.')).toBeInTheDocument();
    expect(document.querySelector('[data-explore-song]')).toBeNull();
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
  it('lays out Learn’s song shelves, then a genre to a shelf', () => {
    open('/songs');
    expect(screen.getByTestId('explore-songs')).toHaveAttribute(
      'data-explore-view',
      'shelves',
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
      within(shelf('easy')!).getByRole('link', { name: /^See all/ }),
    ).toHaveAttribute('href', '/songs?difficulty=1');
    // Funk has four songs: a Best of tile, opening the library on it.
    expect(
      screen.getByRole('link', { name: 'Best of Funk, 4 songs' }),
    ).toHaveAttribute('href', '/songs?genre=funk');
    expect(
      within(shelf('genre-funk')!).getByRole('link', { name: /^See all/ }),
    ).toHaveAttribute('href', '/songs?genre=funk');
    // Rock has one song: too few for a shelf.
    expect(shelf('genre-rock')).toBeNull();
    // No courses here.
    expect(document.querySelector('[data-explore-courses]')).toBeNull();
    // Best Of and the genres first; theirs, the best-known and the easy ones
    // close the page (owner, 2026-11-11).
    const order = [
      ...document.querySelectorAll<HTMLElement>('[data-explore-shelf]'),
    ].map((el) => el.dataset.exploreShelf);
    expect(order.slice(-3)).toEqual(['for-you', 'popular', 'easy']);
    expect(order.indexOf('best-of')).toBeLessThan(order.indexOf('genre-funk'));
    expect(order.indexOf('genre-funk')).toBeLessThan(order.indexOf('for-you'));
  });

  it('heads the page as Learn’s, its filters in the tabs’ place', () => {
    open('/songs');
    const title = screen.getByRole('heading', { level: 1, name: 'Songs' });
    expect(within(title).getByRole('link', { name: 'Songs' })).toHaveAttribute(
      'href',
      '/songs',
    );
    expect(
      screen.getByRole('group', { name: 'Filter songs' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Learn' })).toBeNull();
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

  it('shows Genre, Artist and Title as views, Genre the shelves, and no Genre pill', () => {
    open('/songs');
    const views = screen.getByRole('navigation', { name: 'View songs by' });
    expect(
      within(views)
        .getAllByRole('link')
        .map((a) => a.textContent),
    ).toEqual(['Genre', 'Artist', 'Title']);
    expect(within(views).getByRole('link', { name: 'Genre' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.queryByRole('button', { name: 'Genre' })).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Difficulty' }),
    ).toBeInTheDocument();
  });

  it('lists every song by title in the Title view', () => {
    open('/songs?view=title');
    expect(screen.getByTestId('explore-songs')).toHaveAttribute(
      'data-explore-view',
      'grid',
    );
    const ids = [...document.querySelectorAll('[data-explore-song]')].map(
      (el) => el.getAttribute('data-explore-song'),
    );
    expect(ids).toEqual([
      'cissy',
      'jungle',
      'let_it_be',
      'pick_up',
      'superstition',
    ]);
  });

  it('lists every artist A–Z as their track list in the Artist view, and opens one', () => {
    open('/songs?view=artist&difficulty=2');
    expect(screen.getByTestId('explore-songs')).toHaveAttribute(
      'data-explore-view',
      'artists',
    );
    expect(screen.getByText('2 artists')).toBeInTheDocument();
    // One long list: each artist's name over their numbered songs.
    const names = screen
      .getAllByRole('heading', { level: 2 })
      .map((h) => h.textContent);
    expect(names).toEqual(['Someone', 'Stevie Wonder']);
    expect(
      screen.getByRole('list', { name: 'Someone’s songs' }),
    ).toBeInTheDocument();
    // Their name opens their own page; the view's tab keeps the filters.
    expect(screen.getByRole('link', { name: 'Someone' })).toHaveAttribute(
      'href',
      '/songs?view=artist&difficulty=2&artist=Someone',
    );
    expect(screen.getByRole('link', { name: 'Title' })).toHaveAttribute(
      'href',
      '/songs?view=title&difficulty=2',
    );

    cleanup();
    open('/songs?view=artist&artist=someone');
    expect(screen.getByTestId('explore-songs')).toHaveAttribute(
      'data-explore-view',
      'artist',
    );
    // Samply's playlist: their name over a numbered list, best-known first.
    expect(
      screen.getByRole('heading', { level: 2, name: 'Someone' }),
    ).toBeInTheDocument();
    expect(screen.getByText('3 songs · Funk')).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Someone’s songs' });
    const ids = [...list.querySelectorAll('[data-explore-song]')].map((el) =>
      el.getAttribute('data-explore-song'),
    );
    expect(ids).toEqual(['pick_up', 'cissy', 'jungle']);
    // The page's title stays Songs, and opens the artists again.
    expect(
      within(screen.getByRole('heading', { level: 1 })).getByRole('link', {
        name: 'Songs',
      }),
    ).toHaveAttribute('href', '/songs?view=artist');
  });

  it('plays an artist’s songs from a ▶ in each row, none at the top', () => {
    open('/songs?view=artist&artist=Stevie%20Wonder');
    // ▶ plays and opens the video; there's no ▾ (owner, 2026-11-11).
    const list = screen.getByRole('list', { name: 'Stevie Wonder’s songs' });
    expect(
      within(list).getAllByRole('button', { name: 'Play the recording' }),
    ).toHaveLength(1);
    expect(
      screen.getAllByRole('button', { name: 'Play the recording' }),
    ).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Show the video' })).toBeNull();
    cleanup();
    // A song without a video has no ▶.
    open('/songs?view=artist&artist=someone');
    expect(
      screen.queryByRole('button', { name: 'Play the recording' }),
    ).toBeNull();
  });

  it('toggles the Artist tab between Grid, Tracks and Compact, Tracks first', () => {
    open('/songs?view=artist');
    const layouts = screen.getByRole('group', { name: 'Layout' });
    expect(
      within(layouts)
        .getAllByRole('link')
        .map((a) => a.getAttribute('aria-label')),
    ).toEqual(['Grid', 'Tracks', 'Compact']);
    expect(
      within(layouts).getByRole('link', { name: 'Tracks' }),
    ).toHaveAttribute('aria-current', 'true');
    expect(within(layouts).getByRole('link', { name: 'Grid' })).toHaveAttribute(
      'href',
      '/songs?view=artist&layout=grid',
    );
    cleanup();

    // Grid: a card to an artist, opening their page.
    open('/songs?view=artist&layout=grid');
    expect(
      screen.getByRole('link', { name: 'Someone, 3 songs' }),
    ).toHaveAttribute('href', '/songs?view=artist&layout=grid&artist=Someone');
    expect(screen.queryByRole('list', { name: 'Someone’s songs' })).toBeNull();
    cleanup();

    // Compact: one line to an artist.
    open('/songs?view=artist&layout=compact');
    const lines = within(screen.getByRole('list', { name: 'Artists' }))
      .getAllByRole('link')
      .map((a) => a.getAttribute('aria-label'));
    expect(lines).toEqual([
      'The Beatles, 1 song',
      'Someone, 3 songs',
      'Stevie Wonder, 1 song',
    ]);
    cleanup();

    // Only the Artist tab has the toggle.
    open('/songs?view=title');
    expect(screen.queryByRole('group', { name: 'Layout' })).toBeNull();
  });
});
