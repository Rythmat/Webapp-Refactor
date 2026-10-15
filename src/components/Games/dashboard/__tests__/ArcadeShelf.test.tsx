// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ARCADE_GAMES, type ArcadeGame, isGameFree } from '../../arcadeGames';
import { ArcadeShelf } from '../ArcadeShelf';

/**
 * The Arcade's locked games, through the shared LockedFeatureOverlay (audit
 * prism-ui-23): a free player's Premium game is inert, so the keyboard and
 * screen readers stop at its lock, which leads to the plans, rather than at
 * the card's own Play.
 */

// The cover art draws on a canvas, which jsdom lacks; the card's own button
// is all that matters here.
vi.mock('../GameCard', () => ({
  GameCard: ({ game }: { game: ArcadeGame }) => (
    <button type="button">Play {game.title}</button>
  ),
}));

const premiumGame = ARCADE_GAMES.find((g) => !isGameFree(g));
const freeGame = ARCADE_GAMES.find(isGameFree);

function renderShelf(isPremium: boolean) {
  if (!premiumGame || !freeGame) throw new Error('no free or Premium game');
  render(
    <MemoryRouter>
      <ArcadeShelf
        title="Games"
        games={[premiumGame, freeGame]}
        isPremium={isPremium}
        onLaunch={() => {}}
      />
    </MemoryRouter>,
  );
}

const playOf = (game: ArcadeGame | undefined) =>
  screen.getByText(`Play ${game?.title}`);
const locks = () =>
  screen.queryAllByRole('button', { name: /subscribe to unlock/i });

afterEach(cleanup);

describe('the Arcade shelf', () => {
  it("makes a free player's Premium game inert, behind its lock", () => {
    renderShelf(false);
    expect(playOf(premiumGame).closest('[inert]')).not.toBeNull();
    expect(locks()).toHaveLength(1);
    // The lock names the game it unlocks.
    expect(locks()[0]).toHaveAccessibleName(
      `${premiumGame?.title}: subscribe to unlock`,
    );
    expect(playOf(freeGame).closest('[inert]')).toBeNull();
  });

  it('locks nothing for a premium player', () => {
    renderShelf(true);
    expect(document.querySelector('[inert]')).toBeNull();
    expect(locks()).toHaveLength(0);
  });
});
