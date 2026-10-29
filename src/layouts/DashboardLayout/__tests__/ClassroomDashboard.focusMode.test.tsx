// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClassroomDashboard } from '../ClassroomDashboard';

// ── Focus mode (milestone 2.5, owner decision 7) ───────────────────────────
// The Studio editor gets the whole window: no sidebar or mobile tab bar, no
// TopRail and no chord-notation bar on /studio. So does the Globe, in the
// Studio's frame (owner, 2026-10-29). Every other page, the Studio's
// Production lessons included, keeps them.
//
// Run: npx vitest run src/layouts/DashboardLayout/__tests__/ClassroomDashboard.focusMode.test.tsx

vi.mock('@/hooks/data', () => ({ useProgressBootstrap: () => {} }));
// The Learn tours' layer reads the account; its own tests cover it.
vi.mock('@/features/learnTour/LearnTourLayer', () => ({
  LearnTourLayer: () => null,
}));
vi.mock('@/hooks/data/useAwards', () => ({ useStampEarnedAwards: () => {} }));
vi.mock('@/hooks/data/useStreak', () => ({ useStreakPing: () => {} }));
vi.mock('@/hooks/useChallengeWatcher', () => ({
  useChallengeWatcher: () => {},
}));
vi.mock('../ClassroomSidebar', () => ({
  ClassroomSidebar: () => <nav data-testid="sidebar" />,
}));
vi.mock('../MobileTabBar', () => ({
  MobileTabBar: () => <nav data-testid="tabbar" />,
}));
vi.mock('@/components/ClassroomLayout/TopRail', () => ({
  TopRail: () => <header data-testid="toprail" />,
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
  it('hides the app chrome in the editor', () => {
    at('/studio');
    expect(screen.getByTestId('page')).toBeInTheDocument();
    expect(screen.queryByTestId('sidebar')).toBeNull();
    expect(screen.queryByTestId('tabbar')).toBeNull();
    expect(screen.queryByTestId('toprail')).toBeNull();
    expect(screen.queryByTestId('chord-bar')).toBeNull();
  });

  it('hides the app chrome on the Globe', () => {
    for (const path of ['/globe', '/globe?pathway=blues-to-rock']) {
      at(path);
      expect(screen.getByTestId('page')).toBeInTheDocument();
      expect(screen.queryByTestId('sidebar')).toBeNull();
      expect(screen.queryByTestId('tabbar')).toBeNull();
      expect(screen.queryByTestId('toprail')).toBeNull();
      expect(screen.queryByTestId('chord-bar')).toBeNull();
      cleanup();
    }
  });

  it('keeps it on the Studio lessons and elsewhere', () => {
    for (const path of ['/studio/production', '/learn', '/globes']) {
      at(path);
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('tabbar')).toBeInTheDocument();
      expect(screen.getByTestId('toprail')).toBeInTheDocument();
      cleanup();
    }
  });
});
