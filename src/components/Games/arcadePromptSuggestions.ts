// ── The Arcade page's prompt bar ───────────────────────────────────────────
// What the bar under the Arcade's tabs suggests (as the Learn page's bar
// suggests its instrument's): Home's Arcade prompts, each opening a game,
// narrowed to a category when the page or a pill chooses one.

import {
  ARCADE_SUGGESTIONS,
  type PromptSuggestion,
} from '@/components/ClassroomLayout/home/promptSuggestions';
import { GameRoutes } from '@/constants/routes';
import { ARCADE_GAMES, type ArcadeCategory } from './arcadeGames';

/** Each catalog game's category, by the path its route opens. */
const CATEGORY_BY_PATH = new Map<string, ArcadeCategory>(
  ARCADE_GAMES.flatMap((game) =>
    game.route
      ? [[(GameRoutes[game.route] as () => string)(), game.category] as const]
      : [],
  ),
);

/** The category a suggestion's game is in; none for a page outside the
 *  catalog (Play Along). */
export const categoryOfSuggestion = (
  suggestion: PromptSuggestion,
): ArcadeCategory | null => CATEGORY_BY_PATH.get(suggestion.route) ?? null;

/** The bar's suggestions: every Arcade prompt, or one category's. */
export const arcadeSuggestionsFor = (
  category: ArcadeCategory | null,
): PromptSuggestion[] =>
  category
    ? ARCADE_SUGGESTIONS.filter((s) => categoryOfSuggestion(s) === category)
    : [...ARCADE_SUGGESTIONS];
