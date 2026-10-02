import type { EntityId } from '@/content/graph/types';
import { STATUS_FILTERS } from '../model/categories';
import type {
  ColumnDef,
  SortState,
  StatusFilter,
  TableDef,
  TableQueryState,
} from '../model/types';

/**
 * A table's query as its URL holds it:
 * `?q=&sort=&f=&status=&view=&more=&narrow=`.
 *
 *  - `q` — the search box, as typed;
 *  - `sort` — a column id, `-` first for descending (`-songs`);
 *  - `f` — the filters on, comma-separated (`missing-city,groups`);
 *  - `status` — the status control;
 *  - `view` — a named subset (Artist: `credited`);
 *  - `more` — `1` while the second set of rows shows (Show subgenres);
 *  - `narrow` — the node every count is narrowed to (Key: `mode:minor`).
 *
 * A value equal to the table's default is left out, so a table opened from
 * the bar has a bare URL and a link names only what it changed. Anything the
 * URL holds that is not the query (the panel's `field`) is kept as it is.
 *
 * Pure: the grid's hook reads and writes through these, and the page that
 * builds the model reads `narrow` through `parseTableQuery` too, so the two
 * always agree on what the URL says.
 */

export const QUERY_PARAMS = {
  q: 'q',
  sort: 'sort',
  filters: 'f',
  status: 'status',
  view: 'view',
  more: 'more',
  narrow: 'narrow',
} as const;

/**
 * The stored field the row's panel opens at (`?field=born`): double-clicking
 * a stored cell sets it, opening a row by click or key clears it.
 */
export const FIELD_PARAM = 'field';

/**
 * A column's Link… asked for from the grid (`?link=songs`): the row opens
 * and its panel opens the dialog, then drops the param.
 */
export const LINK_PARAM = 'link';

/**
 * A new item being made in the panel (`?new=`), with the name to start from
 * when there is one (`?new=Marvin`): the toolbar's "New …".
 */
export const NEW_PARAM = 'new';

const STATUSES: ReadonlySet<string> = new Set(
  STATUS_FILTERS.map((s) => s.value),
);

/**
 * Which way a column sorts on its first click: names and fields A→Z and
 * oldest first, counts most first — "which genre has the most artists" is
 * the question a count column is clicked for.
 */
export const defaultDir = (column: ColumnDef): SortState['dir'] =>
  column.source.type === 'title' || column.source.type === 'field'
    ? 'asc'
    : 'desc';

/** `songs` / `-songs` → a sort on a column the table has, or its default. */
export function parseSort(def: TableDef, value: string | null): SortState {
  if (!value) return def.defaultSort;
  const desc = value.startsWith('-');
  const column = desc ? value.slice(1) : value;
  if (!def.columns.some((c) => c.id === column)) return def.defaultSort;
  return { column, dir: desc ? 'desc' : 'asc' };
}

const sameSort = (a: SortState, b: SortState) =>
  a.column === b.column && a.dir === b.dir;

/** The sort a header click asks for: the other way on the same column. */
export function nextSort(
  def: TableDef,
  current: SortState,
  column: string,
): SortState {
  if (current.column === column) {
    return { column, dir: current.dir === 'asc' ? 'desc' : 'asc' };
  }
  const target = def.columns.find((c) => c.id === column);
  return { column, dir: target ? defaultDir(target) : 'asc' };
}

/** The filter ids on, in the order they were turned on, known ones only. */
function parseFilters(def: TableDef, value: string | null): string[] {
  if (!value) return [];
  const known = new Set(def.filters.map((f) => f.id));
  return [...new Set(value.split(','))].filter((id) => known.has(id));
}

/** What the URL says about a table's query; anything unknown reads as the default. */
export function parseTableQuery(
  def: TableDef,
  params: URLSearchParams,
): TableQueryState {
  const status = params.get(QUERY_PARAMS.status);
  const view = params.get(QUERY_PARAMS.view);
  const narrow = params.get(QUERY_PARAMS.narrow);
  return {
    q: params.get(QUERY_PARAMS.q) ?? '',
    sort: parseSort(def, params.get(QUERY_PARAMS.sort)),
    filters: parseFilters(def, params.get(QUERY_PARAMS.filters)),
    status: status && STATUSES.has(status) ? (status as StatusFilter) : 'all',
    ...(view && def.views?.some((v) => v.id === view) ? { view } : {}),
    ...(def.rows.more && params.get(QUERY_PARAMS.more) === '1'
      ? { more: true }
      : {}),
    ...(narrow && def.narrow ? { narrow: narrow as EntityId } : {}),
  };
}

/** Set a param, or drop it when it holds the default. */
function put(params: URLSearchParams, name: string, value: string | null) {
  if (value === null || value === '') params.delete(name);
  else params.set(name, value);
}

/**
 * The URL's params with part of the query changed — defaults left out, and
 * every other param (the panel's `field`, anything a later part adds) kept.
 */
export function writeTableQuery(
  def: TableDef,
  current: URLSearchParams,
  change: Partial<TableQueryState>,
): URLSearchParams {
  const params = new URLSearchParams(current);
  if ('q' in change) {
    put(params, QUERY_PARAMS.q, change.q?.trim() ? change.q : null);
  }
  if (change.sort) {
    const { column, dir } = change.sort;
    put(
      params,
      QUERY_PARAMS.sort,
      sameSort(change.sort, def.defaultSort)
        ? null
        : `${dir === 'desc' ? '-' : ''}${column}`,
    );
  }
  if (change.filters) {
    put(params, QUERY_PARAMS.filters, [...new Set(change.filters)].join(','));
  }
  if (change.status) {
    put(
      params,
      QUERY_PARAMS.status,
      change.status === 'all' ? null : change.status,
    );
  }
  if ('view' in change) {
    // The first view is where the table opens: no param for it.
    const first = def.views?.[0]?.id;
    put(
      params,
      QUERY_PARAMS.view,
      change.view && change.view !== first ? change.view : null,
    );
  }
  if ('more' in change)
    put(params, QUERY_PARAMS.more, change.more ? '1' : null);
  if ('narrow' in change) {
    put(params, QUERY_PARAMS.narrow, change.narrow ?? null);
  }
  return params;
}

/** The filter list with one filter turned on, or off if it was on. */
export const toggledFilters = (
  filters: readonly string[],
  id: string,
): string[] =>
  filters.includes(id) ? filters.filter((f) => f !== id) : [...filters, id];

/** `?a=1` from params, or '' when there are none. */
export const searchOf = (params: URLSearchParams): string => {
  const text = params.toString();
  return text ? `?${text}` : '';
};
