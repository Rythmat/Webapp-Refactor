import { getPath } from '@/content/bodyPaths';
import type { Suggestion } from '@/content/suggestions/types';
import {
  type DecisionInput,
  loadSuggestions,
  postDecisions,
  type SuggestionRow,
} from '@/hooks/data/admin/useSuggestions';
import { sameValue } from '../../content/itemEditor/rebase';

/**
 * A save that states what a suggestion offered is the owner's decision
 * about it, and is logged as one (design §5.3, C11): Link… and Confirm, an
 * event's "Keep the matches", a City picked by hand that MusicBrainz also
 * offers. Otherwise the fact is in the body but not in `decisions.json`,
 * and a seed change — which makes the store's saved patch stale — loses it.
 *
 * After the save, for each suggestion on the item still undecided whose
 * field the save changed:
 *  - the body now says it: an `accept`, which the server logs as `already`
 *    (nothing is written again);
 *  - the body says something else, on a field whose guesses the author was
 *    shown and chose among (`guessed`: an event's artists, songs and place,
 *    the app's own matches): an `accept` of the author's value, which is
 *    what "the owner changed it first" means — the Temptations unticked is
 *    the list without them, decided.
 * Anything else — an importer's value the author wrote over without seeing
 * it — stays open, a conflict for someone to look at.
 *
 * The save has gone through by then; a log that fails is said, not undone.
 */

type Body = Readonly<Record<string, unknown>>;

/** The field a path writes, whole: `songIds[]` → `songIds`. */
const fieldOf = (path: string): string => path.split('[')[0];

/** Offered by the app's planners alone: the graph's own guesses, stated. */
const appOnly = (suggestion: Suggestion): boolean =>
  suggestion.sources.every((source) => source.provider === 'app');

/** The decisions a save makes, from the item's suggestions. Pure. */
export function decisionsForWrite(
  rows: readonly SuggestionRow[],
  before: Body | null,
  after: Body,
  guessed: readonly string[] = [],
): DecisionInput[] {
  const out: DecisionInput[] = [];
  const from = before ?? {};
  for (const { suggestion, status, decision } of rows) {
    if (decision) continue;
    const field = fieldOf(suggestion.path);
    if (sameValue(getPath(from, field), getPath(after, field))) continue;
    if (status === 'applied') {
      out.push({ suggestionId: suggestion.id, op: 'accept', method: 'single' });
      continue;
    }
    const value = getPath(after, suggestion.path);
    if (
      status === 'conflict' &&
      guessed.includes(suggestion.path) &&
      appOnly(suggestion) &&
      value !== undefined
    )
      out.push({
        suggestionId: suggestion.id,
        op: 'accept',
        method: 'single',
        value,
      });
  }
  return out;
}

/** Log what a save decided; resolves with how many were logged. */
export async function logWritten(
  token: string,
  write: {
    kind: string;
    slug: string;
    before: Body | null;
    after: Body;
    guessed?: readonly string[];
  },
): Promise<number> {
  const { rows } = await loadSuggestions(token, {
    kind: write.kind,
    slugs: [write.slug],
  });
  const decisions = decisionsForWrite(
    rows,
    write.before,
    write.after,
    write.guessed,
  );
  if (!decisions.length) return 0;
  const { results } = await postDecisions(token, decisions);
  return results.filter((result) => result.outcome !== 'refused').length;
}

/** The event fields whose guesses the Table shows, to be chosen among. */
export const GUESSED_FIELDS: Readonly<Record<string, readonly string[]>> = {
  globe_event: ['artistIds', 'songIds', 'placeId'],
};
