// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LearnProfile } from '@/features/learn/profile/learnProfile';
import { useInstrumentStore } from '@/features/learn/useInstrumentStore';
import { LearnDashboard } from '../LearnDashboard';
import { LearnDiscoverColumns } from '../LearnDiscoverColumns';
import { HomeProgressColumn } from '../ProgressColumn';

let profile: LearnProfile = {};
let answered = true;
const dismiss = vi.fn();
let role = 'student';
let assignments: unknown[] = [];
let records: Record<string, readonly [number, number, number]> = {};

vi.mock('@/features/learn/profile/useLearnProfile', () => ({
  useLearnProfile: () => ({
    profile,
    answered,
    settled: true,
    save: vi.fn(),
    dismiss,
  }),
}));
vi.mock('@/features/cortex/ledger', () => ({
  getCortexRecords: () => records,
  subscribeCortex: () => () => {},
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({ role, appUser: { id: 'u1' } }),
}));
vi.mock('@/hooks/useUserBioPreferences', () => ({
  useUserBioPreferences: () => ({
    genres: new Set(['Funk']),
    instruments: new Set(),
    focus: new Set(),
  }),
}));
vi.mock('@/hooks/data', () => ({
  useMe: () => ({ data: { nickname: 'Sam' } }),
}));
vi.mock('@/hooks/data/experience', () => ({
  useExperienceSummary: () => ({ data: undefined }),
}));
vi.mock('@/hooks/data/useStreak', () => ({
  useStreak: () => ({ data: { currentStreak: 0 } }),
}));
vi.mock('@/hooks/data/classrooms/useCurrentClassroom', () => ({
  useCurrentClassroom: () => ({ currentClassroomId: 'c1' }),
}));
vi.mock('@/features/classroom/assignments/useAssignments', () => ({
  useAssignments: () => ({ assignments }),
}));
// The song library loads on its own; here it hasn't landed yet.
vi.mock('@/features/classroom/plan/useSongsReady', () => ({
  useSongsReady: () => false,
}));
vi.mock('@/hooks/useIsPremium', () => ({
  useIsPremium: () => ({ isPremium: true, isLoading: false }),
}));
vi.mock('@/hooks/data/progress', () => ({
  useProgressSummary: () => ({ data: { lessons: [] } }),
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
vi.mock('@/features/learn/learnPromptSuggestions', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@/features/learn/learnPromptSuggestions')
  >()),
  learnPageSuggestions: () => [],
}));
vi.mock('@/components/ClassroomLayout/home/HomePromptBar', () => ({
  HomePromptBar: () => <div data-testid="prompt" />,
}));
vi.mock('@/components/ClassroomLayout/home/HomeGlow', () => ({
  HomeGlow: () => null,
}));
vi.mock('@/components/learn/LearnActivityRail', () => ({
  LearnActivityRail: () => null,
}));
vi.mock('@/components/ClassroomLayout/home/HomeSearchPill', () => ({
  HomeSearchPill: () => <div data-testid="search" />,
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

/** The columns, as Home draws them. */
const openColumns = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <LearnDiscoverColumns />
    </MemoryRouter>,
  );

const open = () =>
  render(
    <MemoryRouter initialEntries={['/learn']}>
      <Routes>
        <Route path="/learn" element={<LearnDashboard />} />
        <Route path="/welcome" element={<p>welcome page</p>} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  profile = { welcomedAt: 1, instruments: ['piano'], level: 'basics' };
  answered = true;
  role = 'student';
  assignments = [];
  records = {};
  useInstrumentStore.setState({ instrument: 'piano', audio: false });
});
afterEach(cleanup);

const column = (name: string) =>
  screen.getByRole('region', { name }) as HTMLElement;

describe('the Learn dashboard and its columns (on Home)', () => {
  it('sends a student who was never welcomed to /welcome', () => {
    profile = {};
    open();
    expect(screen.getByText('welcome page')).toBeTruthy();
  });

  it('waits for the account before deciding that', () => {
    profile = {};
    answered = false;
    open();
    expect(screen.queryByText('welcome page')).toBeNull();
    expect(screen.getByTestId('learn-page')).toBeTruthy();
  });

  it('has search, a centred welcome and the prompt bar', () => {
    open();
    expect(screen.getByTestId('search')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Welcome, Sam',
    );
    expect(screen.getByTestId('prompt')).toBeTruthy();
  });

  it('draws exactly three columns: Learn, Arcade, Songs', () => {
    openColumns();
    const titles = [
      ...document.querySelectorAll<HTMLElement>('[data-learn-column]'),
    ].map((el) => el.dataset.learnColumn);
    expect(titles).toEqual(['Learn', 'Arcade', 'Songs']);
  });

  it('fills Songs once the library lands, and sees more on /songs', () => {
    openColumns();
    const songs = column('Songs');
    expect(within(songs).getByText('Loading songs…')).toBeTruthy();
    expect(
      within(songs).getByRole('link', { name: 'See more' }),
    ).toHaveProperty('pathname', '/songs');
  });

  it('leads Learn with where to start, then reasoned picks', () => {
    openColumns();
    const rows = within(column('Learn')).getAllByRole('listitem');
    expect(rows.length).toBeGreaterThan(1);
    expect(rows).toHaveLength(4);
    expect(rows[0].textContent).toContain('Diatonic Modes');
    expect(rows[0].textContent).toContain('Start here');
    expect(
      within(column('Learn')).getByRole('link', { name: 'See more' }),
    ).toHaveProperty('pathname', '/learn');
  });

  it('continues the course they were last in', () => {
    const now = Date.now() / 60_000;
    records = { 'lesson:funk-l1': [now - 30, now - 20, 0] };
    openColumns();
    const first = within(column('Learn')).getAllByRole('listitem')[0];
    expect(first.textContent).toContain('Funk');
    expect(first.textContent).toContain('Next:');
  });

  it('offers four games, the last played first', () => {
    openColumns();
    let rows = within(column('Arcade')).getAllByRole('listitem');
    expect(rows).toHaveLength(4);
    // Nothing played yet: one picked for them first.
    expect(rows[0].textContent).toContain('Picked for you');
    cleanup();
    const now = Date.now() / 60_000;
    records = { 'game:echo': [now - 30, now - 20, 0] };
    openColumns();
    rows = within(column('Arcade')).getAllByRole('listitem');
    expect(rows[0].textContent).toContain('Echo');
    expect(rows[0].textContent).toContain('Jump back in');
    expect(
      within(column('Arcade')).getByRole('link', { name: 'See more' }),
    ).toHaveProperty('pathname', '/arcade');
  });

  it('shows the week in Progress (beside the Studio card), never a zero', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <HomeProgressColumn />
      </MemoryRouter>,
    );
    const progress = column('Progress');
    expect(
      within(progress).getByText('Your week starts with one lesson.'),
    ).toBeTruthy();
    expect(within(progress).queryByText('In a row')).toBeNull();
    expect(within(progress).queryByText('XP')).toBeNull();
    expect(
      within(progress).getByRole('link', { name: 'See more' }),
    ).toHaveProperty('pathname', '/user');
  });

  it('leaves the other sections off for now', () => {
    assignments = [
      {
        id: 'a1',
        classroomId: 'c1',
        title: 'Learn the C major scale',
        kind: 'instructions',
        status: 'open',
        createdAt: '',
      },
    ];
    open();
    expect(
      screen.queryByRole('region', { name: 'From your teacher' }),
    ).toBeNull();
    expect(screen.queryByText('Browse every course')).toBeNull();
    expect(screen.queryByRole('navigation', { name: 'Learn' })).toBeNull();
    // The columns moved to Home (owner, 2026-11-04).
    expect(document.querySelector('[data-learn-column]')).toBeNull();
  });
});
