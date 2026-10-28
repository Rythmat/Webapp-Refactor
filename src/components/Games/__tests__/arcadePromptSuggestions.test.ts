import { describe, expect, it } from 'vitest';
import { ARCADE_SUGGESTIONS } from '@/components/ClassroomLayout/home/promptSuggestions';
import { CATEGORY_ORDER } from '../arcadeGames';
import {
  arcadeSuggestionsFor,
  categoryOfSuggestion,
} from '../arcadePromptSuggestions';

describe("the Arcade page's prompts", () => {
  it('are all of the Arcade prompts with no category chosen', () => {
    expect(arcadeSuggestionsFor(null)).toEqual(ARCADE_SUGGESTIONS);
  });

  it("narrow to a category's games", () => {
    for (const category of CATEGORY_ORDER) {
      const some = arcadeSuggestionsFor(category);
      expect(some.length, category).toBeGreaterThan(0);
      expect(some.every((s) => categoryOfSuggestion(s) === category)).toBe(
        true,
      );
    }
  });

  it('place every prompt but Play Along in a category', () => {
    const loose = ARCADE_SUGGESTIONS.filter(
      (s) => categoryOfSuggestion(s) === null,
    ).map((s) => s.route);
    expect(new Set(loose)).toEqual(new Set(['/arcade/play-along']));
  });
});
