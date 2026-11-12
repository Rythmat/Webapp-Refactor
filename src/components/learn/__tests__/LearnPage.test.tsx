// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PerStudentPreviewContext } from '@/components/ui/PerStudent';
import { LearnPage } from '../LearnPage';

vi.mock('../LearnInlet', () => ({
  LearnInlet: () => <div data-testid="inlet" />,
}));
vi.mock('../dashboard/LearnDashboard', () => ({
  LearnDashboard: () => <div data-testid="dashboard" />,
}));
vi.mock('../LearnTabBar', () => ({ LearnTabBar: () => null }));
vi.mock('../LearnInstrumentPill', () => ({ LearnInstrumentPill: () => null }));
vi.mock('../LearnPromptPills', () => ({
  GenreSectionPills: () => null,
  LearnKindPills: () => null,
  SongFilterPills: () => null,
}));
vi.mock('@/components/ClassroomLayout/home/ActivityRail', () => ({
  ActivityRail: () => <div data-testid="rail" />,
}));
vi.mock('@/components/ClassroomLayout/home/HomeGlow', () => ({
  HomeGlow: () => null,
}));
vi.mock('@/components/ClassroomLayout/home/HomePromptBar', () => ({
  HomePromptBar: () => <div data-testid="prompt" />,
}));
vi.mock('@/features/learn/genreReadiness', () => ({
  useGenreReadiness: () => undefined,
}));
vi.mock('@/features/learn/learnPromptSuggestions', () => ({
  audioSuggestions: () => [],
  learnPageSuggestions: () => [],
}));

const renderPage = (props = {}, placeholder = false) =>
  render(
    <MemoryRouter>
      <PerStudentPreviewContext.Provider
        value={
          placeholder
            ? ({ label }) => <div data-testid="placeholder">{label}</div>
            : null
        }
      >
        <LearnPage {...props} />
      </PerStudentPreviewContext.Provider>
    </MemoryRouter>,
  );

afterEach(cleanup);

describe('Learn’s own page', () => {
  it('is the student’s dashboard (owner, 2026-11-04)', async () => {
    renderPage();
    expect(await screen.findByTestId('dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('inlet')).toBeNull();
  });

  it('keeps them off a tab’s page and off a section’s', () => {
    renderPage({ tab: 'StartHere' });
    expect(screen.queryByTestId('dashboard')).toBeNull();
    expect(screen.getByTestId('inlet')).toBeInTheDocument();
    expect(screen.getByTestId('prompt')).toBeInTheDocument();
    expect(screen.getByTestId('rail')).toBeInTheDocument();
    cleanup();
    renderPage({ section: 'Audio', children: <div data-testid="hub" /> });
    expect(screen.getByTestId('hub')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard')).toBeNull();
  });
});
