/**
 * What the progression rules suggest for a progression's vibes and styles,
 * as the side-effects note before a save shows it.
 *
 * The rules are the "Every Chord Progression" sheet's Algorithms tab made
 * app logic (src/curriculum/engine/progressionRules.ts, phase 8.6, being
 * built alongside this). They suggest; they never rewrite: the stored vibes
 * and styles stay the author's. Until that module lands, `suggestTags`
 * answers null and the note says suggestions are not available yet. Wiring
 * it in is one function: compare the rules' tags for the new chords with
 * the stored ones.
 */

/** Tags the rules would add, and stored tags they would not give. */
export interface TagSuggestion {
  add: string[];
  remove: string[];
}

export interface RuleSuggestions {
  vibes: TagSuggestion;
  styles: TagSuggestion;
}

/** A progression as the rules read it. */
export interface RuleInput {
  chords: readonly string[];
  vibes: readonly string[];
  styles: readonly string[];
}

export type SuggestTags = (entry: RuleInput) => RuleSuggestions | null;

/** The rules' suggestions, or null while the rules module is not built. */
export const suggestTags: SuggestTags = () => null;
