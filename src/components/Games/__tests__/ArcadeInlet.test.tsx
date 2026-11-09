// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PromptSuggestion } from '@/components/ClassroomLayout/home/promptSuggestions';
import { ARCADE_GAMES } from '../arcadeGames';

const plan = vi.hoisted(() => ({ isPremium: true }));
vi.mock('@/hooks/useIsPremium', () => ({
  useIsPremium: () => ({ isPremium: plan.isPremium }),
}));

// Home's prompt bar and activity rail bring the app's data hooks; here only
// what the page hands the bar matters.
const bar = vi.hoisted(() => ({
  suggestions: [] as readonly PromptSuggestion[],
}));
vi.mock('@/components/ClassroomLayout/home/HomePromptBar', () => ({
  HomePromptBar: ({
    suggestions,
    pills,
  }: {
    suggestions: readonly PromptSuggestion[];
    pills: ReactNode;
  }) => {
    bar.suggestions = suggestions;
    return <form aria-label="Prompt">{pills}</form>;
  },
}));
vi.mock('@/components/ClassroomLayout/home/ActivityRail', () => ({
  ActivityRail: () => null,
}));
vi.mock('@/components/ui/PerStudent', () => ({
  PerStudent: () => null,
}));

const { ArcadeInlet } = await import('../ArcadeInlet');

function renderAt(url = '/arcade') {
  render(
    <MemoryRouter initialEntries={[url]}>
      <ArcadeInlet />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  plan.isPremium = true;
  bar.suggestions = [];
});
afterEach(cleanup);

describe('the Arcade, laid out as the Learn page', () => {
  it('heads the page with the Arcade icon and its categories, the whole Arcade current', () => {
    renderAt();
    const nav = screen.getByRole('navigation', { name: 'Arcade' });
    // The icon alone shows; its name is for screen readers.
    expect(within(nav).getByRole('heading', { name: 'Arcade' })).toHaveClass(
      'sr-only',
    );
    expect(within(nav).getAllByRole('link')[0]).toHaveAttribute(
      'aria-current',
      'page',
    );
    for (const label of [
      'Ear Training',
      'Skill',
      'Puzzles',
      'Rhythm',
      'Sound Lab',
    ]) {
      expect(
        within(nav).getByRole('link', { name: `Open ${label}` }),
      ).toBeInTheDocument();
    }
    expect(document.body).not.toHaveTextContent(/friend's|hi friend/i);
  });

  it("puts the prompt bar under it, with every game's prompts and the categories as pills", () => {
    renderAt();
    expect(screen.getByRole('form', { name: 'Prompt' })).toBeInTheDocument();
    expect(bar.suggestions.length).toBeGreaterThan(10);
    expect(bar.suggestions.every((s) => s.route.startsWith('/arcade/'))).toBe(
      true,
    );
    const pills = screen.getByRole('radiogroup', { name: 'Suggest' });
    expect(within(pills).getAllByRole('radio')).toHaveLength(5);
  });

  it('features the Jam Room with a white pill named as it reads', () => {
    renderAt();
    const hero = screen.getByRole('region', { name: 'Featured: Jam Room' });
    expect(
      within(hero).getByRole('button', { name: 'Play Jam Room' }),
    ).toBeInTheDocument();
  });

  it("offers a free player the Jam Room's unlock instead", () => {
    plan.isPremium = false;
    renderAt();
    const hero = screen.getByRole('region', { name: 'Featured: Jam Room' });
    expect(
      within(hero).getByRole('button', { name: 'Unlock Jam Room' }),
    ).toBeInTheDocument();
  });

  it("shows one category on its tab, the bar suggesting that category's games", () => {
    renderAt('/arcade?tab=Rhythm');
    expect(screen.getByRole('link', { name: 'Open Rhythm' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    const rhythm = ARCADE_GAMES.filter((g) => g.category === 'Rhythm');
    for (const game of rhythm) {
      // Each game a square tile (a Chladni plate is square).
      const play = screen.getByRole('button', { name: `Play ${game.title}` });
      expect(play.closest('[data-arcade-tile]')).toHaveClass('aspect-square');
    }
    expect(screen.queryByRole('button', { name: 'Play Chroma' })).toBeNull();
    expect(screen.getByRole('radio', { name: 'Rhythm' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    const rhythmPaths = ['/arcade/foli', '/arcade/groove-lab'];
    expect(bar.suggestions.length).toBeGreaterThan(0);
    expect(bar.suggestions.every((s) => rhythmPaths.includes(s.route))).toBe(
      true,
    );
  });
});
