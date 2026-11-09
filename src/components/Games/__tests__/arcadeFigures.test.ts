import { describe, expect, it } from 'vitest';
import { arcadeFigures, FEATURED_FIGURES } from '../arcadeFigures';
import {
  ARCADE_GAMES,
  artForGame,
  FEATURED_GAME,
  gamesByCategory,
  isGameFree,
} from '../arcadeGames';

const key = (m: { n: number; m: number; sign: number }) =>
  `${m.n},${m.m},${m.sign}`;

/** The fullest Arcade page: every shelf, six back to jump into, every free
 *  game to start with. */
const fullPage = () => {
  const shelves = gamesByCategory
    .map((c) => ({
      row: c.category,
      games: c.games.filter((g) => g !== FEATURED_GAME),
    }))
    .filter((c) => c.games.length > 0);
  const others = ARCADE_GAMES.filter((g) => g !== FEATURED_GAME);
  return arcadeFigures({
    featured: FEATURED_GAME,
    shelves,
    again: [
      { row: 'Jump back in', games: others.slice(0, 6) },
      { row: 'Start here', games: others.filter(isGameFree) },
    ],
  });
};

describe("the Arcade's figures", () => {
  it('never draws one figure on two cards, even with a game shown in three rows', () => {
    const figures = fullPage();
    const all = [...figures.values()].flat().map(key);
    expect(all.length).toBeGreaterThan(40);
    expect(new Set(all).size).toBe(all.length);
    // No dense lattice, which would read as another one scaled.
    for (const k of all) {
      const [n, m] = k.split(',').map(Number);
      if (m === 0) expect(n, k).toBeLessThanOrEqual(4);
    }
  });

  it('keeps simple figures on the page, not only intricate ones', () => {
    const all = [...fullPage().values()].flat();
    const simple = all.filter((f) => f.n <= 3);
    // At least a third of the page's figures are low ratios (n ≤ 3).
    expect(simple.length / all.length).toBeGreaterThanOrEqual(1 / 3);
  });

  it("gives each game's first card its own figure, and every card more than one to morph through", () => {
    const figures = fullPage();
    expect(figures.get(FEATURED_FIGURES)?.[0]).toEqual(
      artForGame(FEATURED_GAME).mode,
    );
    for (const { category, games } of gamesByCategory) {
      for (const game of games) {
        if (game === FEATURED_GAME) continue;
        const own = figures.get(`${category}:${game.title}`)!;
        expect(own[0], game.title).toEqual(artForGame(game).mode);
        expect(own.length).toBe(3);
      }
    }
    for (const [slot, modes] of figures)
      expect(modes.length, slot).toBeGreaterThanOrEqual(2);
  });
});
