import { foldText, isPresent, valuesAt } from './buildTableModel';
import { storedColumns } from './categories';
import type {
  CellValue,
  FilterRule,
  TableModel,
  TableQueryState,
  TableRow,
} from './types';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  Asking a built table: search, filters, views and sort
 * ══════════════════════════════════════════════════════════════════════════
 *
 * The model holds every row with its cells already counted, so a query only
 * reads them: which rows the status, view, filters and search let through,
 * in the order the sort puts them. It returns row indices, not rows, so the
 * grid's virtual list can keep one array per query and the rows stay shared.
 *
 * Search folds case, accents, '&' and apostrophes the way
 * `normalizeArtistName` does, so "sinead oconnor" finds Sinéad O'Connor and
 * "hall and oates" Hall & Oates. Sort compares with `Intl.Collator`'s numeric
 * order ("Track 2" before "Track 10"); an empty value sorts last either way,
 * and a tie falls back to the row's label, then its key, so the order never
 * shuffles between two queries.
 */

/** What a query may add beyond the URL's state. */
export interface QueryOptions {
  /**
   * Rows edited this session: they stay listed under a filter or search
   * they no longer match, until the query changes, rather than vanishing
   * from under the person editing them (the grid notes "no longer matches"
   * through `rowMatches`).
   */
  keep?: ReadonlySet<string>;
  /**
   * The open row's key: listed whatever the query says — the level toggle
   * included — so a link to a row the query hides (a subgenre while only
   * genres show, a credited person in the Acts view, an archived item) opens
   * it beside a list that has it, not one that has lost it.
   */
  open?: string | null;
}

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

/** A query's search text as the tokens every row must contain. */
export const searchTokens = (q: string): string[] =>
  foldText(q).split(' ').filter(Boolean);

/* ── Rules ───────────────────────────────────────────────────────────── */

/** Does a cell show nothing at all? Text no chip came from does not count. */
function isEmptyCell(cell: CellValue | undefined): boolean {
  if (!cell) return true;
  switch (cell.type) {
    case 'title':
      return false;
    case 'field':
      return cell.text === undefined;
    case 'connections':
      return cell.total === 0;
    case 'years':
      return cell.decades.length === 0;
    case 'credits':
      return cell.chips.length === 0;
  }
}

/**
 * Does the cell show something, all of it guessed? Nothing linked or
 * confirmed-but-unchecked among its chips, and at least one guess — a guess
 * at a missing node is drawn hollow, and counts as the guess it is.
 */
function isGuessedCell(cell: CellValue | undefined): boolean {
  if (!cell) return false;
  if (cell.type === 'connections') {
    const { solid, dashed, dotted } = cell.styles;
    return cell.total > 0 && solid === 0 && dashed === 0 && dotted > 0;
  }
  if (cell.type === 'credits') {
    return (
      cell.chips.length > 0 &&
      cell.chips.every((c) => c.style === 'dotted' || c.style === 'hollow') &&
      cell.chips.some((c) => c.style === 'dotted')
    );
  }
  return false;
}

/** Does a row pass a filter's rule (types.ts, `FilterRule`)? */
export function testRule(rule: FilterRule, row: TableRow): boolean {
  switch (rule.type) {
    case 'missing': {
      const cell = row.cells[rule.column];
      return cell !== undefined && !cell.filled;
    }
    case 'empty':
      return isEmptyCell(row.cells[rule.column]);
    case 'guessed':
      return isGuessedCell(row.cells[rule.column]);
    case 'flag':
      return row.flags.has(rule.flag);
    case 'field':
      return valuesAt(row.body, rule.path).some(isPresent);
    case 'not':
      return !testRule(rule.rule, row);
    case 'all':
      return rule.rules.every((r) => testRule(r, row));
  }
}

/* ── Which rows ──────────────────────────────────────────────────────── */

/** The table's second set of rows ("Show subgenres") is showing, or not needed. */
function levelShown(
  model: TableModel,
  row: TableRow,
  state: TableQueryState,
): boolean {
  const more = model.def.rows.more;
  return !more || row.kind !== more.kind || Boolean(state.more);
}

function statusShown(row: TableRow, state: TableQueryState): boolean {
  switch (state.status) {
    case 'all':
      // Archived items are listed only when asked for.
      return row.status !== 'archived';
    case 'rejected':
      return row.editState === 'rejected';
    case 'pending':
      return row.status === 'pending' || row.editState === 'pending';
    default:
      return row.status === state.status;
  }
}

/** The view a query is in: the one it names, or the table's first. */
function viewRule(
  model: TableModel,
  state: TableQueryState,
): FilterRule | null {
  const views = model.def.views;
  if (!views?.length) return null;
  return (views.find((v) => v.id === state.view) ?? views[0]).rule;
}

/** One query's test for a row, with its search and rules worked out once. */
function matcher(
  model: TableModel,
  state: TableQueryState,
): (row: TableRow) => boolean {
  const view = viewRule(model, state);
  // A filter the table does not have (an old link) filters nothing.
  const rules = state.filters.flatMap((id) => {
    const filter = model.def.filters.find((f) => f.id === id);
    return filter ? [filter.rule] : [];
  });
  const tokens = searchTokens(state.q);
  return (row) =>
    levelShown(model, row, state) &&
    statusShown(row, state) &&
    (!view || testRule(view, row)) &&
    rules.every((rule) => testRule(rule, row)) &&
    tokens.every((token) => row.haystack.includes(token));
}

/**
 * Does a row match the query's status, view, filters and search? The grid
 * asks it of a kept row to say "no longer matches".
 */
export const rowMatches = (
  model: TableModel,
  row: TableRow,
  state: TableQueryState,
): boolean => matcher(model, state)(row);

/* ── Order ───────────────────────────────────────────────────────────── */

type SortValue = number | string | null;

/** Numbers by value, text by the collator, numbers before text. */
function compareValues(a: number | string, b: number | string): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'number') return -1;
  if (typeof b === 'number') return 1;
  return collator.compare(a, b);
}

/**
 * The rows a query lets through, as indices into `model.rows`, in its sort
 * order. A sort column the table does not have falls back to its default.
 */
export function queryRows(
  model: TableModel,
  state: TableQueryState,
  options: QueryOptions = {},
): Int32Array {
  const { rows, def } = model;
  const { keep, open } = options;
  const matches = matcher(model, state);
  const picked: number[] = [];
  rows.forEach((row, i) => {
    if (matches(row) || row.key === open) picked.push(i);
    // A kept row still respects the level toggle: hiding the subgenres
    // hides an edited subgenre too.
    else if (keep?.has(row.key) && levelShown(model, row, state)) {
      picked.push(i);
    }
  });

  const known = def.columns.some((c) => c.id === state.sort.column);
  const sort = known ? state.sort : def.defaultSort;
  const values: SortValue[] = rows.map(
    (row) => row.cells[sort.column]?.sort ?? null,
  );
  const sign = sort.dir === 'asc' ? 1 : -1;
  picked.sort((i, j) => {
    const a = values[i];
    const b = values[j];
    if (a !== b) {
      // Empty last, whichever way the column is sorted.
      if (a === null) return 1;
      if (b === null) return -1;
      const order = compareValues(a, b);
      if (order !== 0) return sign * order;
    }
    const x = rows[i];
    const y = rows[j];
    return (
      collator.compare(x.label, y.label) ||
      (x.key < y.key ? -1 : x.key > y.key ? 1 : 0)
    );
  });
  return Int32Array.from(picked);
}

/**
 * The query's order with the rows edited this session put back where they
 * were when they were edited: `held` maps a row's key to its place in the
 * list then. Editing a cell and pressing Enter moves down the list; a row
 * the edit re-sorts (a Year changed under a sort by Year) must not jump
 * away from under the author, nor the row below it take its place. So a
 * held row keeps its old index, and the others fill the rest in the
 * query's order.
 *
 * A place beyond the list's end is its last place; two rows held at one
 * place take it and the next free one. A held row the query no longer
 * lists is not put back. Nothing held: the order itself, unchanged. O(n),
 * with a sort over the held rows alone.
 */
export function holdPositions(
  order: Int32Array,
  rows: readonly Pick<TableRow, 'key'>[],
  held: ReadonlyMap<string, number>,
): Int32Array {
  const n = order.length;
  if (held.size === 0 || n === 0) return order;
  const isHeld = new Uint8Array(n);
  const wants: { at: number; to: number }[] = [];
  for (let at = 0; at < n; at += 1) {
    const to = held.get(rows[order[at]].key);
    if (to === undefined) continue;
    isHeld[at] = 1;
    wants.push({ at, to: Math.min(Math.max(0, to), n - 1) });
  }
  if (!wants.length) return order;

  const placed = new Int32Array(n);
  const taken = new Uint8Array(n);
  wants.sort((a, b) => a.to - b.to || a.at - b.at);
  for (const { at, to } of wants) {
    let slot = to;
    while (slot < n && taken[slot]) slot += 1;
    // Past the end: the nearest free place before it.
    if (slot === n) {
      slot = to;
      while (taken[slot]) slot -= 1;
    }
    placed[slot] = order[at];
    taken[slot] = 1;
  }
  let slot = 0;
  for (let at = 0; at < n; at += 1) {
    if (isHeld[at]) continue;
    while (taken[slot]) slot += 1;
    placed[slot] = order[at];
    slot += 1;
  }
  return placed;
}

/* ── Counts ──────────────────────────────────────────────────────────── */

/**
 * How many rows each filter would leave, on top of the query's status, view
 * and search but none of its other filters: the counts on the toolbar's
 * filter chips.
 */
export function filterCounts(
  model: TableModel,
  state: TableQueryState,
): Readonly<Record<string, number>> {
  const matches = matcher(model, { ...state, filters: [] });
  const counts: Record<string, number> = {};
  for (const filter of model.def.filters) counts[filter.id] = 0;
  for (const row of model.rows) {
    if (!matches(row)) continue;
    for (const filter of model.def.filters) {
      if (testRule(filter.rule, row)) counts[filter.id] += 1;
    }
  }
  return counts;
}

/**
 * The coverage strip over the rows a query shows — "Born 0/907 · City 3/907"
 * — counting only rows with a record (not missing or archived ones).
 */
export function coverageOf(
  model: TableModel,
  order: Int32Array,
): Readonly<Record<string, { filled: number; total: number }>> {
  const columns = storedColumns(model.def).map((c) => c.id);
  const coverage: Record<string, { filled: number; total: number }> = {};
  for (const id of columns) coverage[id] = { filled: 0, total: 0 };
  for (const index of order) {
    const row = model.rows[index];
    if (row.status === 'missing' || row.status === 'archived') continue;
    for (const id of columns) {
      coverage[id].total += 1;
      if (row.cells[id]?.filled) coverage[id].filled += 1;
    }
  }
  return coverage;
}
