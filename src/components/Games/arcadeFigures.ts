import { allocateFigures, type ChladniMode, type FigureSlot } from '@/lib/art';
import { artForGame, type ArcadeGame } from './arcadeGames';

/** A game's own figure (every catalog game names one). */
const homeOf = (game: ArcadeGame): ChladniMode =>
  artForGame(game).mode ?? { n: 3, m: 1, sign: 1 };

/** The featured card's key in the page's figures. */
export const FEATURED_FIGURES = 'featured';

/**
 * Every card's figures on the Arcade page, none shared (owner, 2026-10-28:
 * "ensure that no two patterns repeat"), keyed `${row}:${title}`. Served
 * by importance: the featured card and each game in its category first
 * (each its own figure and two near ones), then the rows that show a game
 * again ("Start here", "Jump back in": two fresh figures each, near the
 * game's own), so a game seen twice is never drawn twice alike.
 */
export function arcadeFigures({
  featured,
  shelves,
  again = [],
}: {
  featured?: ArcadeGame;
  /** The category shelves, by row name. */
  shelves: readonly { row: string; games: readonly ArcadeGame[] }[];
  /** Rows repeating games shown elsewhere. */
  again?: readonly { row: string; games: readonly ArcadeGame[] }[];
}): Map<string, ChladniMode[]> {
  const slots: FigureSlot[] = [];
  if (featured)
    slots.push({ key: FEATURED_FIGURES, home: homeOf(featured), count: 3 });
  for (const { row, games } of shelves)
    for (const game of games)
      slots.push({ key: `${row}:${game.title}`, home: homeOf(game), count: 3 });
  for (const { row, games } of again)
    for (const game of games)
      slots.push({ key: `${row}:${game.title}`, home: homeOf(game), count: 2 });
  return allocateFigures(slots);
}
