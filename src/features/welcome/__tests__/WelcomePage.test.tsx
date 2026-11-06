// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LearnProfile } from '@/features/learn/profile/learnProfile';
import { useInstrumentStore } from '@/features/learn/useInstrumentStore';
import { WelcomePage } from '../WelcomePage';

let profile: LearnProfile = {};
let settled = true;
const save = vi.fn();
const update = vi.fn();
let bio = {
  genres: new Set<string>(),
  instruments: new Set<string>(['Vocals']),
  focus: new Set<string>(['Songwriting']),
};

vi.mock('@/features/learn/profile/useLearnProfile', () => ({
  useLearnProfile: () => ({
    profile,
    answered: true,
    settled,
    save,
    dismiss: vi.fn(),
  }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({ role: 'student', appUser: { id: 'u1' } }),
}));
vi.mock('@/hooks/useUserBioPreferences', () => ({
  useUserBioPreferences: () => ({ ...bio, update }),
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
    useGenreReadiness: () => real.genreReadinessFrom(new Set(['funk:1:A'])),
  };
});
vi.mock('@/components/ClassroomLayout/home/HomeGlow', () => ({
  HomeGlow: () => null,
}));
vi.mock('@/components/Logo', () => ({ Logo: () => null }));
vi.stubGlobal(
  'IntersectionObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);
HTMLCanvasElement.prototype.getContext = () => null;

const open = (url = '/welcome?continue=%2Flearn') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/learn" element={<p>dashboard</p>} />
        <Route path="/" element={<p>home</p>} />
      </Routes>
    </MemoryRouter>,
  );

const next = () =>
  fireEvent.click(screen.getByRole('button', { name: /Continue/ }));

beforeEach(() => {
  profile = {};
  settled = true;
  bio = {
    genres: new Set(),
    instruments: new Set(['Vocals']),
    focus: new Set(['Songwriting']),
  };
  save.mockClear();
  update.mockClear();
  useInstrumentStore.setState({ instrument: 'piano', audio: false });
});
afterEach(cleanup);

describe('/welcome', () => {
  it('waits for their earlier answers before asking', () => {
    settled = false;
    open();
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
  });

  it('walks five questions to a plan, then saves everything', async () => {
    open();
    expect(screen.getByText('Question 1 of 5')).toBeTruthy();
    // Continue waits for an answer; "Not sure yet" moves on without one.
    expect(
      screen.getByRole('button', { name: /Continue/ }).hasAttribute('disabled'),
    ).toBe(true);
    fireEvent.click(screen.getByRole('checkbox', { name: /Guitar/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Music production/ }));
    expect(screen.getByText('Main')).toBeTruthy();
    next();
    fireEvent.click(
      await screen.findByRole('radio', { name: 'I know some basics' }),
    );
    next();
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Funk' }));
    next();
    fireEvent.click(
      await screen.findByRole('checkbox', { name: 'Write and produce' }),
    );
    next();
    fireEvent.click(await screen.findByRole('radio', { name: /3–4 days/ }));
    next();
    expect(await screen.findByText('Your plan is ready')).toBeTruthy();
    expect(screen.getByText('Start here')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Start learning/ }));

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        instruments: ['guitar', 'audio'],
        level: 'basics',
        goals: ['create'],
        daysPerWeek: 3,
        welcomedAt: expect.any(Number),
      }),
    );
    // The Bio keeps what Learn doesn't ask about.
    expect(update).toHaveBeenCalledWith({
      instruments: ['Vocals', 'Guitar'],
      genres: ['Funk'],
      focus: expect.arrayContaining(['Songwriting', 'Audio', 'Producing']),
    });
    expect(useInstrumentStore.getState().instrument).toBe('guitar');
    expect(screen.getByText('dashboard')).toBeTruthy();
  });

  it('lets them skip, and never asks again', () => {
    open('/welcome?continue=%2F');
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }));
    expect(save).toHaveBeenCalledWith({ welcomedAt: expect.any(Number) });
    expect(screen.getByText('home')).toBeTruthy();
  });

  it('opens with their answers to change, on the question asked', () => {
    profile = { welcomedAt: 5, instruments: ['bass'], daysPerWeek: 5 };
    open('/welcome?edit=1&step=days');
    expect(
      screen
        .getByRole('radio', { name: /5 or more/ })
        .getAttribute('aria-checked'),
    ).toBe('true');
    fireEvent.click(screen.getByRole('radio', { name: /1–2 days/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ daysPerWeek: 2, welcomedAt: 5 }),
    );
  });

  it('never sends them off the app after', () => {
    open('/welcome?continue=https%3A%2F%2Fevil.example');
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }));
    expect(screen.getByText('dashboard')).toBeTruthy();
  });
});
