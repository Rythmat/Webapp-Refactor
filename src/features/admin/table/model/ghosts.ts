import type { Graph } from '@/content/graph/deriveGraph';
import type { EntityId, EntityKind } from '@/content/graph/types';
import { SESSION_INSTRUMENTS } from '@/curriculum/data/instruments';
import { labelOf } from './aggregate';
import type { CellValue, ColumnDef, GhostChip, TableDef } from './types';

/**
 * Suggestions in the grid: which column a suggested value belongs in, and
 * the ghost chips it shows there until someone accepts it (design §3.2:
 * "ghost (suggestion)").
 *
 * A suggestion names a body path as REF_PATHS spells it ('basedInPlaceId',
 * 'born.date', 'artistIds', 'genreIds[]'); a column the row edits names the
 * path its panel writes, and the fields it writes with it. The two meet on
 * the path without its indices: a suggestion for `born.date` is the Born
 * column's, one for `activeTo` the Years Active column's.
 *
 * Pure (the model's purity test holds this).
 */

/** A suggested value for one of the row's fields, as the grid shows it. */
export interface GhostValue {
  /** Where it would be written: 'placeId', 'born.date', 'genreIds[]'. */
  path: string;
  /** The value: a slug, a list of slugs, a year, a date. */
  value: unknown;
  /** One line for the owner: 'Took place in Detroit', 'Born 2 Apr 1939'. */
  display: string;
  /** The chip's tooltip: what, from whom, how sure. */
  title: string;
  /**
   * The names of records the value names that do not exist yet (a place it
   * would make first), by slug, so its chip says "Gary" and not "gary-in".
   */
  names?: Readonly<Record<string, string>>;
}

/** A path without its indices or its trailing `[]`: `credits[2].name` → `credits.name`. */
const bare = (path: string) => path.replace(/\[\d*\]/g, '');

/** The roles a column takes of a list it shares (`ColumnEdit` `roles`). */
const rolesOf = (column: ColumnDef): readonly string[] | undefined =>
  column.edit.by === 'row' ? column.edit.roles : undefined;

/**
 * The column a suggestion for `path` belongs in: the one whose row edit
 * writes that path, or the field it sits inside (`born.placeId` → Born).
 * Never the title column: a name is not suggested as a chip. Where several
 * columns edit one list (a song's credits: a column per role, Composers to
 * Conductor, and Credits), `value` says which — a songwriter credit is a
 * composer's — and without one, or for a role no column takes, it is the
 * column that takes them all.
 */
export function columnForPath(
  def: Pick<TableDef, 'columns'>,
  path: string,
  value?: unknown,
): ColumnDef | undefined {
  const wanted = bare(path);
  const matches = def.columns.filter(
    (column) =>
      column.edit.by === 'row' &&
      column.source.type !== 'title' &&
      [column.edit.path, ...(column.edit.also ?? [])].some((edited) => {
        const own = bare(edited);
        return wanted === own || wanted.startsWith(`${own}.`);
      }),
  );
  if (matches.length < 2) return matches[0];
  const role =
    value && typeof value === 'object' && 'role' in value
      ? (value as { role?: unknown }).role
      : undefined;
  return (
    (typeof role === 'string' &&
      matches.find((column) => rolesOf(column)?.includes(role))) ||
    matches.find((column) => !rolesOf(column)) ||
    matches[0]
  );
}

/**
 * A name for a slug the graph has no node for, from its vocabulary: an
 * instrument no song credits yet ("lead-vocals" is "Lead Vocals").
 */
const INSTRUMENT_NAMES = new Map(
  SESSION_INSTRUMENTS.map((instrument) => [instrument.id, instrument.name]),
);
const vocabularyName = (
  kinds: readonly EntityKind[],
  slug: string,
): string | undefined =>
  kinds.includes('instrument') ? INSTRUMENT_NAMES.get(slug) : undefined;

/** The node kinds a column's stated part lands on: a City's places. */
function statedKinds(column: ColumnDef): readonly EntityKind[] {
  if (column.source.type !== 'connections') return [];
  const parts = column.source.parts;
  const stated = parts.find((part) => part.role === 'stated') ?? parts[0];
  return stated?.hops[0].to ?? [];
}

/** Where to look for a slug no column says the kind of: a birthplace, a record. */
const ANY_KINDS: readonly EntityKind[] = [
  'place',
  'artist',
  'song',
  'genre',
  'subgenre',
  'instrument',
  'release',
  'studio',
  'label',
  'event',
];

/**
 * A value as the owner reads it beside a field: the graph's names for the
 * slugs it holds ("Detroit", not "detroit"), a list joined, an object's
 * fields in a line, anything else as written. For the row panel's
 * "now → suggested" and the bulk accept's lists.
 */
export function valueText(
  graph: Graph,
  def: Pick<TableDef, 'columns'>,
  path: string,
  value: unknown,
): string {
  const column = columnForPath(def, path);
  const kinds =
    column && statedKinds(column).length ? statedKinds(column) : ANY_KINDS;
  const one = (item: unknown): string => {
    if (typeof item === 'string') {
      const node = kinds
        .map((kind) => `${kind}:${item}` as EntityId)
        .find((id) => graph.nodes.has(id));
      return node
        ? labelOf(graph, node)
        : (vocabularyName(kinds, item) ?? item);
    }
    if (item === null || item === undefined) return '—';
    // Where a value came from is not what it says, and may name an outside
    // catalogue the site never names (owner decision of 30 September 2026).
    if (typeof item === 'object')
      return JSON.stringify(
        Array.isArray(item)
          ? item
          : Object.fromEntries(
              Object.entries(item).filter(
                ([key]) => key !== 'source' && key !== 'unverified',
              ),
            ),
      );
    return String(item);
  };
  if (Array.isArray(value))
    return value.length ? value.map(one).join(', ') : 'none';
  if (value && typeof value === 'object')
    return Object.entries(value)
      .filter(([key]) => key !== 'source' && key !== 'unverified')
      .map(([key, field]) => `${key} ${one(field)}`)
      .join(' · ');
  return one(value);
}

const slugsIn = (value: unknown): string[] =>
  (Array.isArray(value) ? value : [value]).filter(
    (item): item is string => typeof item === 'string' && item.trim() !== '',
  );

/**
 * The chips a suggested value shows in a column: in a connections cell, one
 * per node it names (the graph's name for it, or the name of the record it
 * would make); in a field cell, its one line.
 */
function chipsFor(
  graph: Graph,
  column: ColumnDef,
  ghost: GhostValue,
): GhostChip[] {
  const kinds = statedKinds(column);
  if (kinds.length === 0 || typeof ghost.value === 'number')
    return [{ label: ghost.display, title: ghost.title }];
  return slugsIn(ghost.value).map((slug) => {
    const node = (kinds
      .map((kind) => `${kind}:${slug}`)
      .find((id) => graph.nodes.has(id as EntityId)) ??
      `${kinds[0]}:${slug}`) as EntityId;
    return {
      node,
      label: graph.nodes.has(node)
        ? labelOf(graph, node)
        : (ghost.names?.[slug] ?? vocabularyName(kinds, slug) ?? slug),
      title: ghost.title,
    };
  });
}

/**
 * Lay a row's suggested values over its cells: each goes to its column's
 * cell (a field or a connections cell the row edits) as ghost chips, once
 * per node. A suggestion no column shows is left to the row's count and its
 * panel.
 */
export function withGhosts(
  graph: Graph,
  def: Pick<TableDef, 'columns'>,
  cells: Record<string, CellValue>,
  ghosts: readonly GhostValue[],
): void {
  for (const ghost of ghosts) {
    const column = columnForPath(def, ghost.path, ghost.value);
    const cell = column && cells[column.id];
    if (!cell || (cell.type !== 'field' && cell.type !== 'connections'))
      continue;
    const have = new Set((cell.ghosts ?? []).map((g) => g.node ?? g.label));
    const added = chipsFor(graph, column, ghost).filter(
      (chip) => !have.has(chip.node ?? chip.label),
    );
    if (added.length)
      cells[column.id] = {
        ...cell,
        ghosts: [...(cell.ghosts ?? []), ...added],
      };
  }
}
