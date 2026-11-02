// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PerStudentPreviewContext } from '@/components/ui/PerStudent';
import { LearnPage } from '../LearnPage';

vi.mock('@/features/cortex/CortexPanel', () => ({
  default: () => <div data-testid="cortex" />,
}));
vi.mock('../LearnInlet', () => ({
  LearnInlet: () => <div data-testid="inlet" />,
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
  it('shows the Cortex under the prompt bar, with the rail still there', async () => {
    renderPage();
    expect(await screen.findByTestId('cortex')).toBeInTheDocument();
    expect(screen.getByTestId('prompt')).toBeInTheDocument();
    expect(screen.getByTestId('rail')).toBeInTheDocument();
  });

  it('keeps it off a tab’s page and off Audio’s', () => {
    renderPage({ tab: 'Theory' });
    expect(screen.queryByTestId('cortex')).toBeNull();
    expect(screen.getByTestId('inlet')).toBeInTheDocument();
    renderPage({ section: 'Audio', children: <div data-testid="hub" /> });
    expect(screen.getByTestId('hub')).toBeInTheDocument();
    expect(screen.queryByTestId('cortex')).toBeNull();
  });

  it('never mounts in the console’s mirror, which has no student', () => {
    renderPage({}, true);
    expect(screen.queryByTestId('cortex')).toBeNull();
    expect(
      screen.getAllByTestId('placeholder').map((p) => p.textContent),
    ).toContain('Your Cortex');
  });
});
