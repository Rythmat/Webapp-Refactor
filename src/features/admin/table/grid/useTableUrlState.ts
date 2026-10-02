import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import type { EntityId } from '@/content/graph/types';
import type { StatusFilter, TableDef, TableQueryState } from '../model/types';
import {
  nextSort,
  parseTableQuery,
  toggledFilters,
  writeTableQuery,
} from './tableQuery';

/**
 * A table's query, kept in the URL (tableQuery.ts says how), so a view can
 * be linked, reloaded and walked back through.
 *
 * Every write replaces the history entry and keeps the path: changing a
 * filter or the sort is not a place to go back to, and a write that kept the
 * path never trips the unsaved-changes guard, which blocks only when the
 * path changes (a row being edited stays open while the list narrows).
 *
 * The search box is the exception to "the URL is the state": it answers each
 * key at once from its own state, the rows follow through
 * `useDeferredValue` so typing never waits on a query, and the URL is
 * written 250 ms after typing stops. A URL changed from elsewhere (Back, a
 * link) wins over the box.
 */

/** How long typing must pause before the search is written to the URL. */
export const SEARCH_URL_DELAY = 250;

export interface TableUrlState {
  /** The query the rows follow: the URL's, with the (deferred) search box. */
  state: TableQueryState;
  /** The search box as typed, ahead of `state.q`. */
  q: string;
  setQ(q: string): void;
  /** Sort by a column, or the other way if it is the sort already. */
  sortBy(column: string): void;
  toggleFilter(id: string): void;
  clearFilters(): void;
  setStatus(status: StatusFilter): void;
  setView(view: string): void;
  setMore(more: boolean): void;
  setNarrow(node: EntityId | undefined): void;
  /**
   * The URL's params with the search box as typed — for a row link, so
   * opening a row straight after typing does not lose the search.
   */
  params(): URLSearchParams;
}

export function useTableUrlState(def: TableDef): TableUrlState {
  const [searchParams, setSearchParams] = useSearchParams();
  const url = useMemo(
    () => parseTableQuery(def, searchParams),
    [def, searchParams],
  );

  // The setter changes with every URL; a delayed write must use the latest.
  const latest = useRef({ searchParams, setSearchParams });
  latest.current = { searchParams, setSearchParams };

  const write = useCallback(
    (change: Partial<TableQueryState>) => {
      const { searchParams: current, setSearchParams: set } = latest.current;
      set(writeTableQuery(def, current, change), { replace: true });
    },
    [def],
  );

  /* ── The search box ─────────────────────────────────────────────── */

  const [q, setQ] = useState(url.q);
  // The last search the URL was given (or gave): what tells a URL changed
  // from elsewhere apart from the echo of our own write.
  const written = useRef(url.q);

  useEffect(() => {
    if (url.q === written.current) return;
    written.current = url.q;
    setQ(url.q);
  }, [url.q]);

  useEffect(() => {
    if (q === written.current) return undefined;
    const timer = window.setTimeout(() => {
      written.current = q;
      write({ q });
    }, SEARCH_URL_DELAY);
    return () => window.clearTimeout(timer);
  }, [q, write]);

  const deferredQ = useDeferredValue(q);

  const state = useMemo(() => ({ ...url, q: deferredQ }), [url, deferredQ]);

  /* ── The rest, written at once ───────────────────────────────────── */

  const sortBy = useCallback(
    (column: string) => write({ sort: nextSort(def, url.sort, column) }),
    [def, url.sort, write],
  );
  const toggleFilter = useCallback(
    (id: string) => write({ filters: toggledFilters(url.filters, id) }),
    [url.filters, write],
  );
  const clearFilters = useCallback(() => write({ filters: [] }), [write]);
  const setStatus = useCallback(
    (status: StatusFilter) => write({ status }),
    [write],
  );
  const setView = useCallback((view: string) => write({ view }), [write]);
  const setMore = useCallback((more: boolean) => write({ more }), [write]);
  const setNarrow = useCallback(
    (narrow: EntityId | undefined) => write({ narrow }),
    [write],
  );

  // A link built from this carries the box's value; when it is followed, the
  // URL's search changes to what the box says, and nothing is reset. Read
  // through a ref, so the function stays the same while typing and the rows
  // that link with it are not redrawn on every key.
  const typed = useRef(q);
  typed.current = q;
  const params = useCallback(
    () =>
      writeTableQuery(def, latest.current.searchParams, { q: typed.current }),
    [def],
  );

  return {
    state,
    q,
    setQ,
    sortBy,
    toggleFilter,
    clearFilters,
    setStatus,
    setView,
    setMore,
    setNarrow,
    params,
  };
}
