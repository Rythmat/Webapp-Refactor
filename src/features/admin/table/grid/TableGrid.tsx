import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { Graph } from '@/content/graph/deriveGraph';
import type { EntityId } from '@/content/graph/types';
import type { WorkingGraphStatus } from '../../content/graph/workingGraphStatus';
import type { WriteEvent } from '../edit/writeQueue';
import {
  filterCounts,
  holdPositions,
  queryRows,
  rowMatches,
} from '../model/query';
import type { TableModel, TableRow } from '../model/types';
import { tableHref } from '../tablePaths';
import { CoverageStrip } from './CoverageStrip';
import {
  type NarrowChoice,
  TableToolbar,
  type ToolbarCounts,
} from './TableToolbar';
import { VirtualTable } from './VirtualTable';
import { coverageEntries } from './coverage';
import type { GridEditing } from './gridEditing';
import { rowState, useCloseRow } from './rowHistory';
import { FIELD_PARAM, LINK_PARAM, NEW_PARAM, searchOf } from './tableQuery';
import { useTableUrlState } from './useTableUrlState';
import { useVisibleColumns } from './useVisibleColumns';

/**
 * One table: its toolbar, the coverage of its stored fields, and the grid of
 * its rows, all driven by the URL. Clicking a row's title (or ⌘Enter)
 * opens it at `/console/table/:table/:row` (keeping the query), where the
 * row panel picks it up and edits it; Esc in the grid closes it again. The
 * cells edit in place where the page hands in `edits` (the scalars, in
 * this release); a cell's Link…, and Enter or a double-click on a cell
 * that does not edit in place, open the row's panel at the place that
 * writes it.
 *
 * The caller builds the model (from the working graph) and hands it in; the
 * query is this component's, read from the URL. A narrowing (Key: one mode)
 * changes what the model counts, so the caller builds the model for the
 * URL's `narrow` — `parseTableQuery(def, searchParams).narrow` reads it the
 * same way this does — and passes the choices for the picker, and the one
 * it built with.
 *
 * The open row is always listed, even where the query would hide it (a link
 * to a subgenre, a credited person, an archived item), marked as outside the
 * view, so the panel never sits beside a list that has lost its row. So is
 * a row edited this session (`keep`), marked as no longer matching, until
 * the query changes.
 *
 * A row edited this session also stays where it was in the list (`held`,
 * `holdPositions`): a Year changed under a sort by Year must not send the
 * row away from under the author, nor pull the next row up in its place,
 * or Enter's "save and move down" would land somewhere else. Its title
 * says "Sorted elsewhere" once the rebuilt rows sort it elsewhere, and the
 * toolbar's "N edited rows held · Re-sort" puts every row where the sort
 * puts it. The holds go when the query changes.
 *
 * Saves, undos and what the keys refuse are said in the grid's own live
 * region; a write that failed, at once (`role="alert"`).
 */

export interface TableGridProps {
  model: TableModel;
  /** What the table can be narrowed to (`narrowChoices` in the model), for `def.narrow`. */
  narrowChoices?: readonly NarrowChoice[];
  /** The narrowing the model was built with (a real one of the choices). */
  narrow?: EntityId;
  /** Where the rows came from: the working copy, or the repo's snapshot. */
  mode?: 'working' | 'repo';
  /**
   * Which copy shows and why (`workingGraphStatus`): the badge's tooltip.
   * By default the mode's plain case — the working copy, or the repo's for
   * want of `/export`.
   */
  graphStatus?: WorkingGraphStatus;
  /** A rebuild with newer saves is on its way; the rows showing are the last build's. */
  refreshing?: boolean;
  /**
   * Rows edited this session: they stay listed under a query they no longer
   * match, marked so, until the query changes (`onQueryChange`).
   */
  keep?: ReadonlySet<string>;
  /**
   * The query changed — search, sort, filters, status, view, the subgenre
   * rows, the narrowing — so the caller lets go of the rows it keeps.
   */
  onQueryChange?(): void;
  /**
   * A word about the rows as a whole, between the toolbar and the grid: why
   * the Table is read-only, that the working copy failed to load, what would
   * block a publish. Notices that render nothing leave no gap.
   */
  notice?: ReactNode;
  /** The table's own actions, at the end of the toolbar's title line (bulk accept). */
  actions?: ReactNode;
  /**
   * Editing in place, over the page's write queue (`useGridEditing`).
   * Without it the grid is read-only.
   */
  edits?: GridEditing;
  /** The graph the model was built from: formats a written Born's place. */
  graph?: Graph;
  /** A fixed grid size; measured from the space given otherwise. */
  height?: number;
  width?: number;
}

/**
 * Is the key press going into something that takes it for its own: a text
 * field, or an open menu, list or dialog (a Radix menu's typeahead, the
 * Select's list, the row panel's sheet), which "/" must not steal focus from.
 */
const typingIn = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
    target.closest(
      '[role="menu"], [role="listbox"], [role="dialog"], [role="alertdialog"]',
    ) !== null
  );
};

/** What the title cell says of a row listed though the query hides it. */
const NO_LONGER_MATCHES = 'No longer matches';
const OUTSIDE_VIEW = 'Outside this view';
/** …and of an edited row held where it was, which the sort puts elsewhere. */
const SORTED_ELSEWHERE = 'Sorted elsewhere';

const NO_HOLDS: ReadonlyMap<string, number> = new Map();
const NO_ROWS = new Int32Array(0);

/** Two orders list the same rows in the same places. */
const sameOrder = (a: Int32Array, b: Int32Array): boolean => {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let at = 0; at < a.length; at += 1) if (a[at] !== b[at]) return false;
  return true;
};

/** Two sets of row notes say the same of the same rows. */
const sameNotes = (
  a: ReadonlyMap<string, string> | undefined,
  b: ReadonlyMap<string, string> | undefined,
): boolean => {
  if (a === b) return true;
  if (!a || !b || a.size !== b.size) return false;
  for (const [key, note] of a) if (b.get(key) !== note) return false;
  return true;
};

/** Where a row is in an order, or -1. */
const placeOf = (
  order: Int32Array,
  rows: readonly TableRow[],
  key: string,
): number => {
  for (let at = 0; at < order.length; at += 1)
    if (rows[order[at]].key === key) return at;
  return -1;
};

/** Where each of `keys` is in an order. */
const placesOf = (
  order: Int32Array,
  rows: readonly TableRow[],
  keys: ReadonlyMap<string, unknown>,
): Map<string, number> => {
  const at = new Map<string, number>();
  order.forEach((index, place) => {
    const { key } = rows[index];
    if (keys.has(key)) at.set(key, place);
  });
  return at;
};

/** What a write came to, in a line for the live region. */
function spoken(event: WriteEvent): { text: string; urgent: boolean } | null {
  switch (event.type) {
    case 'saved': {
      const { write, proposed } = event;
      const how =
        write.purpose === 'undo'
          ? 'Undone'
          : write.purpose === 'redo'
            ? 'Redone'
            : proposed
              ? 'Proposed'
              : 'Saved';
      return { text: `${how}: ${write.summary}`, urgent: false };
    }
    case 'failed':
      return {
        text: `Not saved: ${event.failed.write.summary}. ${event.failed.message}`,
        urgent: true,
      };
    case 'not-undone':
      return {
        text: `${event.message}: ${event.write.summary}`,
        urgent: true,
      };
    case 'in-panel':
      return {
        text: `${event.write.summary}: ${event.message}`,
        urgent: false,
      };
    default:
      return null;
  }
}

export const TableGrid = ({
  model,
  narrowChoices,
  narrow,
  mode = 'working',
  graphStatus,
  refreshing,
  keep,
  onQueryChange,
  notice,
  actions,
  edits,
  graph,
  height,
  width,
}: TableGridProps) => {
  const { def } = model;
  const { row } = useParams();
  const selectedKey = row ?? null;
  const navigate = useNavigate();
  const location = useLocation();
  const url = useTableUrlState(def);
  const { state } = url;
  const visible = useVisibleColumns(def);
  const searchRef = useRef<HTMLInputElement>(null);

  // A new query starts from what it matches: the rows kept under the last
  // one are let go, before paint, so none shows under the new one. The URL's
  // other params (the panel's `field`) are not the query.
  const query = JSON.stringify(state);
  const lastQuery = useRef(query);
  // The edited rows held where they were (`holdPositions`), and every row
  // `keep` has named, held or since let go (by Re-sort).
  const [held, setHeld] = useState<ReadonlyMap<string, number>>(NO_HOLDS);
  const seen = useRef(new Set<string>());
  useLayoutEffect(() => {
    if (lastQuery.current === query) return;
    lastQuery.current = query;
    seen.current.clear();
    setHeld(NO_HOLDS);
    onQueryChange?.();
  }, [query, onQueryChange]);

  // What the query lists, in its order; then as shown, the held rows back
  // where they were. The same array as before when nothing moved: the
  // first edit of a row holds it (and the page keeps it), which rebuilds
  // both, and a new order would draw every row again for one cell's edit.
  const natural = useMemo(
    () => queryRows(model, state, { keep, open: selectedKey }),
    [model, state, keep, selectedKey],
  );
  const shownOrder = useRef<Int32Array>(NO_ROWS);
  const order = useMemo(() => {
    const next = holdPositions(natural, model.rows, held);
    return sameOrder(shownOrder.current, next) ? shownOrder.current : next;
  }, [natural, model.rows, held]);
  shownOrder.current = order;

  // A row a cell edit wrote is held where it is now, before the rebuilt
  // rows can sort it elsewhere.
  const hold = useCallback(
    (key: string) =>
      setHeld((prev) => {
        if (prev.has(key)) return prev;
        const at = placeOf(shownOrder.current, model.rows, key);
        return at < 0 ? prev : new Map(prev).set(key, at);
      }),
    [model.rows],
  );

  // A row the page newly keeps (saved in its panel, linked from it) is held
  // where it shows now; a row it lets go of is let go of here too.
  useLayoutEffect(() => {
    const kept = keep ?? new Set<string>();
    const fresh = [...kept].filter((key) => !seen.current.has(key));
    for (const key of fresh) seen.current.add(key);
    for (const key of [...seen.current])
      if (!kept.has(key)) seen.current.delete(key);
    setHeld((prev) => {
      let next: Map<string, number> | null = null;
      for (const key of prev.keys())
        if (!kept.has(key)) {
          next ??= new Map(prev);
          next.delete(key);
        }
      for (const key of fresh) {
        if (prev.has(key)) continue;
        const at = placeOf(order, model.rows, key);
        if (at < 0) continue;
        next ??= new Map(prev);
        next.set(key, at);
      }
      return next ?? prev;
    });
  }, [keep]);

  // The held rows the sort would put elsewhere now.
  const moved = useMemo(() => {
    if (!held.size) return new Set<string>();
    const sorted = placesOf(natural, model.rows, held);
    const shown = placesOf(order, model.rows, held);
    return new Set(
      [...shown]
        .filter(([key, at]) => sorted.get(key) !== at)
        .map(([key]) => key),
    );
  }, [held, natural, order, model.rows]);

  // Rows listed though the query does not match them, or held where the
  // sort does not put them, to say so on the row: kept ones no longer
  // match; held ones are sorted elsewhere; the open one may never have
  // matched. The same map as before when it says the same (every row is
  // drawn from it).
  const shownStale = useRef<ReadonlyMap<string, string> | undefined>(undefined);
  const stale = useMemo(() => {
    const notes = new Map<string, string>();
    const check = (key: string, note: string) => {
      const index = model.byKey.get(key);
      if (index === undefined || notes.has(key)) return;
      if (!rowMatches(model, model.rows[index], state)) notes.set(key, note);
    };
    for (const key of keep ?? []) check(key, NO_LONGER_MATCHES);
    if (selectedKey) check(selectedKey, OUTSIDE_VIEW);
    for (const key of moved)
      if (!notes.has(key)) notes.set(key, SORTED_ELSEWHERE);
    const next = notes.size ? notes : undefined;
    return sameNotes(shownStale.current, next) ? shownStale.current : next;
  }, [model, state, keep, selectedKey, moved]);
  shownStale.current = stale;

  /* ── What the grid says ────────────────────────────────────────── */

  // Two live regions: saves, undos and refusals politely; a write that
  // failed at once. A line said twice is said again (the counter).
  const [said, setSaid] = useState({ polite: '', alert: '', p: 0, a: 0 });
  const announce = useCallback(
    (text: string, urgent = false) =>
      setSaid((prev) =>
        urgent
          ? { ...prev, alert: text, a: prev.a + 1 }
          : { ...prev, polite: text, p: prev.p + 1 },
      ),
    [],
  );

  // Re-sort lets go of the held rows, and its chip goes with them: the
  // keyboard goes back to the grid rather than to nowhere, and the grid
  // says what happened.
  const rootRef = useRef<HTMLDivElement>(null);
  const resort = useCallback(() => {
    setHeld(NO_HOLDS);
    rootRef.current
      ?.querySelector<HTMLElement>('[role="grid"]')
      ?.focus({ preventScroll: true });
    announce('Rows re-sorted.');
  }, [announce]);

  useEffect(
    () =>
      edits?.onEvent((event) => {
        const line = spoken(event);
        if (line) announce(line.text, line.urgent);
      }),
    [edits, announce],
  );

  // What the status and view list before search and filters narrow them,
  // and how many of those are missing rows.
  const listed = useMemo(() => {
    const rows = queryRows(model, { ...state, q: '', filters: [] });
    let missing = 0;
    for (const index of rows)
      if (model.rows[index].status === 'missing') missing += 1;
    return { count: rows.length, missing };
  }, [model, state.status, state.view, state.more]);

  const counts = useMemo<ToolbarCounts>(() => {
    let drafts = 0;
    let pending = 0;
    let suggestions = 0;
    let missing = 0;
    for (const index of order) {
      const r = model.rows[index];
      if (r.status === 'draft') drafts += 1;
      if (r.status === 'pending' || r.editState === 'pending') pending += 1;
      if (r.status === 'missing') missing += 1;
      suggestions += r.suggestions;
    }
    return {
      shown: order.length,
      of: listed.count,
      missing: { shown: missing, of: listed.missing },
      drafts,
      pending,
      suggestions,
    };
  }, [model, order, listed]);

  const perFilter = useMemo(() => filterCounts(model, state), [model, state]);

  const coverage = useMemo(
    () => coverageEntries(model, order, visible.shown),
    [model, order, visible.shown],
  );

  /* ── Opening and closing rows ──────────────────────────────────── */

  const urlParams = url.params;
  const here = `${location.pathname}${location.search}`;
  const historyState: unknown = location.state;
  const closeRow = useCloseRow();

  const open = useCallback(
    (key: string, field?: string, link?: string) => {
      const params = urlParams();
      if (field) params.set(FIELD_PARAM, field);
      else params.delete(FIELD_PARAM);
      if (link) params.set(LINK_PARAM, link);
      else params.delete(LINK_PARAM);
      params.delete(NEW_PARAM);
      const to = `${tableHref(def.id, key)}${searchOf(params)}`;
      // A second click on the open row (a double-click's first two) must
      // not stack history entries; moving to a field of the open row
      // replaces it too, so Back still closes the panel.
      if (to === here) return;
      const replace = key === selectedKey;
      navigate(to, {
        replace,
        // Opened from the list, the row says so, and closing it goes back
        // to that list (rowHistory.ts); a replaced entry keeps what it said.
        state: replace
          ? historyState
          : selectedKey === null
            ? rowState(here)
            : undefined,
      });
    },
    [urlParams, def.id, here, selectedKey, historyState, navigate],
  );

  const close = useCallback(() => {
    const params = urlParams();
    params.delete(FIELD_PARAM);
    params.delete(LINK_PARAM);
    closeRow(`${tableHref(def.id)}${searchOf(params)}`);
  }, [urlParams, def.id, closeRow]);

  const link = useCallback(
    (key: string, column: string) => open(key, undefined, column),
    [open],
  );

  // "New …": the panel, on a new item, named from the search when there is
  // one — a search that found nothing is often the name to make.
  const startNew = useCallback(() => {
    const params = urlParams();
    params.delete(FIELD_PARAM);
    params.delete(LINK_PARAM);
    params.set(NEW_PARAM, state.q.trim());
    navigate(`${tableHref(def.id)}${searchOf(params)}`, {
      state: selectedKey === null ? rowState(here) : historyState,
      replace: selectedKey !== null,
    });
  }, [urlParams, state.q, def.id, navigate, selectedKey, here, historyState]);

  // "/" jumps to the search box from anywhere on the page but a text field.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey)
        return;
      if (event.defaultPrevented || typingIn(event.target)) return;
      event.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const narrowed = state.q.trim() !== '' || state.filters.length > 0;
  const noun = def.title.toLowerCase();
  const empty = narrowed ? (
    <>
      No {noun} match.{' '}
      <button
        type="button"
        onClick={() => {
          url.setQ('');
          url.clearFilters();
        }}
        className="text-white/75 underline underline-offset-2 hover:text-white"
      >
        Clear the search and filters
      </button>
    </>
  ) : (
    <>
      No {noun} here yet.{def.empty ? ` ${def.empty}` : ''}
    </>
  );

  return (
    <div ref={rootRef} className="flex min-h-0 min-w-0 flex-1 flex-col">
      <TableToolbar
        def={def}
        url={url}
        visible={visible}
        counts={counts}
        filterCounts={perFilter}
        narrowChoices={narrowChoices}
        narrow={narrow}
        mode={mode}
        graphStatus={
          graphStatus ?? (mode === 'working' ? 'working' : 'no-export')
        }
        refreshing={refreshing}
        searchRef={searchRef}
        actions={actions}
        onNew={mode === 'working' ? startNew : undefined}
        editable={!!edits && mode === 'working'}
        held={moved.size ? { count: moved.size, onResort: resort } : undefined}
      />
      {notice && (
        <div className="flex shrink-0 flex-col gap-2 px-6 pt-3 empty:hidden">
          {notice}
        </div>
      )}
      <CoverageStrip
        entries={coverage}
        active={state.filters}
        onToggle={url.toggleFilter}
      />
      <VirtualTable
        def={def}
        columns={visible.columns}
        rows={model.rows}
        order={order}
        selectedKey={selectedKey}
        sort={state.sort}
        onSort={url.sortBy}
        onOpen={open}
        onLink={mode === 'working' ? link : undefined}
        onClose={close}
        edits={edits}
        onEdited={hold}
        announce={announce}
        graph={graph}
        stale={stale}
        mode={mode}
        label={def.title}
        empty={empty}
        height={height}
        width={width}
      />
      <p className="sr-only" aria-live="polite">
        {said.polite}
        {said.p % 2 ? '\u00a0' : ''}
      </p>
      <p className="sr-only" role="alert">
        {said.alert}
        {said.a % 2 ? '\u00a0' : ''}
      </p>
    </div>
  );
};
