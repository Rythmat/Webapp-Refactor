import { generateBodySchema, type TypeSource } from './generateSongSchema';

/**
 * The suggestion contract's schemas — a suggestion, and the owner's decision
 * about one — generated from src/content/suggestions/types.ts the same way
 * the body schemas are generated from their type files, and for the same
 * reason: the importer writes these shapes, the console reads them, and the
 * API will store both (contract §10, design decisions 9–10). A hand-kept
 * copy of either would drift.
 *
 * `value`, and a required record's `body`, are whatever the target path
 * holds, so they are `unknown` here: the item's own body schema checks them
 * when an accept is saved.
 */

/** In dependency order: a type before anything that refers to it. */
const WANTED = [
  'SuggestionProvider',
  'SuggestionSource',
  'SuggestionTarget',
  'SuggestionOp',
  'SuggestionTier',
  'RequiredRecord',
  'Suggestion',
  'DecisionOp',
  'DecisionMethod',
  'SuggestionDecision',
] as const;

const header =
  () => `// ─────────────────────────────────────────────────────────────────────────
//  GENERATED — do not edit.
//
//  \`npx vitest run src/scripts/apiContract/__tests__/suggestionSchema.test.ts\`
//  regenerates this from src/content/suggestions/types.ts and fails if what
//  is committed here has drifted from it. Set WRITE_CONTRACT=1 to rewrite it.
//
//  A suggestion is a fact offered for a content body, kept beside it, never
//  in it; a decision is what the owner did with one. These are the rows the
//  importer's artifacts (src/scripts/enrichment/suggestions/*.json) hold,
//  \`GET /suggestions\` serves, and \`POST /suggestions/decisions\` takes, and
//  the rows of the committed \`decisions.json\`. See
//  docs/console-content-api-contract.md.
// ─────────────────────────────────────────────────────────────────────────
import { z } from 'zod';`;

const footer =
  () => `/** The suggestion contract's two rows, by what they are. */
export const suggestionSchemas = {
  suggestion: suggestionSchema,
  decision: suggestionDecisionSchema,
} as const;

export type SuggestionRow = z.infer<typeof suggestionSchema>;
export type SuggestionDecisionRow = z.infer<typeof suggestionDecisionSchema>;`;

/** The suggestion schema file, as text. */
export function generateSuggestionSchema(types: TypeSource): string {
  return generateBodySchema({
    sources: [types],
    wanted: WANTED,
    header: header(),
    footer: footer(),
  });
}
