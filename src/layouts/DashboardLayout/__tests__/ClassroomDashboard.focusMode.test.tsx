// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClassroomDashboard } from '../ClassroomDashboard';

// ── Focus mode (milestone 2.5, owner decision 7) ───────────────────────────
// The Studio editor has its own top bar: no TopRail and no chord-notation bar
// on /studio. The Globe has its own rails in the Studio's frame (owner,
// 2026-10-29), and so does the Office (owner, 2026-11-09). Every page has the
// app rail (owner, 2026-11-10: Samply's sidebar, the editor's included) but
// Present and the lesson players, which take the whole window. Every other
// page, the Studio's Production lessons included, keeps the TopRail too.
//
// Run: npx vitest run src/layouts/DashboardLayout/__tests__/ClassroomDashboard.focusMode.test.tsx

vi.mock('@/hooks/data', () => ({ useProgressBootstrap: () => {} }));
// The Learn tours' layer reads the account; its own tests cover it.
vi.mock('@/features/learnTour/LearnTourLayer', () => ({
  LearnTourLayer: () => null,
}));
vi.mock('@/hooks/data/useAwards', () => ({ useStampEarnedAwards: () => {} }));
vi.mock('@/hooks/data/useStreak', () => ({ useStreakPing: () => {} }));
vi.mock('@/features/cortex/useCortexCapture', () => ({
  useCortexCapture: () => {},
}));
vi.mock('@/hooks/useChallengeWatcher', () => ({
  useChallengeWatcher: () => {},
}));
vi.mock('../ActivityPlayBar', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../ActivityPlayBar')>()),
  ActivityPlayBar: () => <div data-testid="play-bar" />,
}));
vi.mock('../AppRail', () => ({
  AppRail: () => <nav data-testid="sidebar" />,
  isIconRailPath: () => false,
}));
vi.mock('@/components/ClassroomLayout/TopRail', () => ({
  TOOLBAR_HEIGHT: '3.636rem',
  TopRail: () => <header data-testid="toprail" />,
  PageTopFade: () => null,
}));
vi.mock('@/components/ClassroomLayout/ChordNotationSwitcher', () => ({
  MobileChordNotationBar: () => <div data-testid="chord-bar" />,
}));

afterEach(cleanup);

function at(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<ClassroomDashboard />}>
          <Route path="*" element={<div data-testid="page" />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('focus mode', () => {
  it('gives Present the whole window', () => {
    at('/office/c1/present/d1');
    expect(screen.getByTestId('page')).toBeInTheDocument();
    expect(screen.queryByTestId('sidebar')).toBeNull();
    expect(screen.queryByTestId('toprail')).toBeNull();
  });

  it('keeps only the app rail in the editor', () => {
    at('/studio');
    expect(screen.getByTestId('page')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.queryByTestId('toprail')).toBeNull();
    expect(screen.queryByTestId('chord-bar')).toBeNull();
  });

  it('keeps only the app’s sidebar on the Globe', () => {
    for (const path of ['/globe', '/globe?pathway=blues-to-rock']) {
      at(path);
      expect(screen.getByTestId('page')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.queryByTestId('toprail')).toBeNull();
      expect(screen.queryByTestId('chord-bar')).toBeNull();
      cleanup();
    }
  });

  it('keeps only the app’s sidebar in the Office’s frame', () => {
    for (const path of ['/office', '/office/classes', '/office/c1/plan/d1']) {
      at(path);
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.queryByTestId('toprail')).toBeNull();
      expect(screen.queryByTestId('chord-bar')).toBeNull();
      cleanup();
    }
  });

  it('keeps it on the Studio lessons and elsewhere', () => {
    for (const path of ['/studio/production', '/learn', '/globes']) {
      at(path);
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('toprail')).toBeInTheDocument();
      cleanup();
    }
  });
});
