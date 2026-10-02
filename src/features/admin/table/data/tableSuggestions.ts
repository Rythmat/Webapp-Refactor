import type { EntityId } from '@/content/graph/types';
import { hashText } from '@/content/suggestions/keys';
import {
  OPEN_STATUSES,
  type SuggestionRow,
} from '@/hooks/data/admin/useSuggestions';
import type { TableSuggestions } from '../model/buildTableModel';
import type { GhostValue } from '../model/ghosts';
import { suggestionTitle } from './suggestionText';

/**
 * A table's suggestions as its model reads them (`TableSuggestions`): how
 * many are open on each row, the ghosts in its empty fields, and whether a
 * bulk accept on it waits to be reviewed.
 *
 * Built from two answers of `GET /suggestions` for the table's kind — the
 * open ones, and the bulk accepts nobody has reviewed — and keyed by the
 * row: a suggestion's target slug is its row's key (an artist's slug, an
 * event's id), as a node's id is its kind and that slug. Pure.
 */

const rowKeyOf = (node: EntityId): string => node.slice(node.indexOf(':') + 1);

/** The names of the records a suggestion would make first, by slug. */
const namesOf = (
  row: SuggestionRow,
): Readonly<Record<string, string>> | undefined => {
  const names: Record<string, string> = {};
  for (const record of row.suggestion.requires ?? []) {
    const body = record.body as { name?: unknown } | null;
    if (body && typeof body.name === 'string') names[record.slug] = body.name;
  }
  return Object.keys(names).length ? names : undefined;
};

export function tableSuggestionsOf(
  open: readonly SuggestionRow[],
  unreviewed: readonly SuggestionRow[] = [],
): TableSuggestions {
  const counts = new Map<string, number>();
  const ghosts = new Map<string, GhostValue[]>();
  const openStatuses = new Set(OPEN_STATUSES);
  for (const row of open) {
    if (!openStatuses.has(row.status)) continue;
    const { suggestion } = row;
    const key = suggestion.target.slug;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    // Only an empty field shows a ghost; a conflict is the panel's to show.
    if (row.status !== 'open') continue;
    const names = namesOf(row);
    const ghost: GhostValue = {
      path: suggestion.path,
      value: suggestion.value,
      display: suggestion.display,
      title: suggestionTitle(suggestion),
      ...(names ? { names } : {}),
    };
    const list = ghosts.get(key);
    if (list) list.push(ghost);
    else ghosts.set(key, [ghost]);
  }
  const waiting = new Set(
    unreviewed
      .filter((row) => row.unreviewed)
      .map((row) => row.suggestion.target.slug),
  );

  const version = hashText(
    [
      ...open.map((row) => `${row.suggestion.id}:${row.status}`),
      '|',
      ...[...waiting].sort(),
    ].join(','),
  );

  return {
    version,
    count: (node) => counts.get(rowKeyOf(node)) ?? 0,
    bulkUnreviewed: (node) => waiting.has(rowKeyOf(node)),
    ghosts: (node) => ghosts.get(rowKeyOf(node)) ?? [],
  };
}
