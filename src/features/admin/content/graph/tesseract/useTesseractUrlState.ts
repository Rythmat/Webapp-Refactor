import { useCallback, useMemo } from 'react';
import { useLocation, useMatch, useNavigate } from 'react-router-dom';
import { AdminRoutes } from '@/constants/routes';
import { rowState, useCloseRow } from '../../../table/grid/rowHistory';
import {
  DEFAULT_VIEW,
  hasViewParams,
  outsideRow,
  parseTesseractView,
  PROGRESSIONS_TABLE,
  readStoredView,
  storeView,
  tesseractSearch,
  type TesseractView,
} from './tesseractLinks';

/**
 * What Tesseract's URL says (the map at /console/cortex/tesseract), and the
 * ways to change it.
 *
 * - The view (key, notation, list, what is open) is in the query
 *   (`tesseractLinks.ts`). Changing it replaces the entry it is on, as
 *   Cortex's depth slider does: twelve keys tried in a row are one change,
 *   not twelve entries for Back to walk. The entry keeps its history state,
 *   so closing a row still finds the map behind it. Every change is also
 *   kept in the browser (`storeView`), so the next bare visit and the next
 *   link from Cortex open where the reader left off.
 * - A bare URL (the pill) shows the stored view at once; `writeBare`
 *   writes it into the URL in place. The page calls it from an effect that
 *   runs before the map's own (a component ahead of the map), so a view the
 *   map reports as it mounts (the way to a progression opened) lands after
 *   it, on top.
 * - A progression's row open beside the map is in the path
 *   (`/console/cortex/tesseract/progressions/12`), as Cortex opens a row:
 *   the first one is a new history entry over the map, each one after it
 *   replaces it, and closing goes back to the map without leaving the row
 *   behind in history (`grid/rowHistory.ts`). Because the row is in the
 *   path, leaving a row with unsaved edits asks first (the console's one
 *   unsaved-changes guard).
 */

export interface TesseractUrlState {
  /** The view showing: the URL's, or the stored one while a bare URL is rewritten. */
  view: TesseractView;
  /** The URL names no view: `view` is the stored one (or the default). */
  bare: boolean;
  /** Write the view showing into a bare URL, in place. */
  writeBare(): void;
  /** The row open beside the map, as the path names it (not checked here). */
  row: { table: string; row: string } | null;
  /** The map's URL with nothing open beside it, its view as it is. */
  mapHref: string;
  /** Change the view in place (and keep it in the browser). */
  setView(patch: Partial<TesseractView>): void;
  /** Open a progression's row beside the map, keeping the view. */
  openRow(progressionId: number): void;
  /** Close the row, back to the map as it is. */
  closeRow(): void;
}

export function useTesseractUrlState(): TesseractUrlState {
  const navigate = useNavigate();
  const { pathname, search, state } = useLocation();
  const closeTo = useCloseRow();
  const match = useMatch(AdminRoutes.cortexTesseractRow.definition);
  const table = match?.params.table;
  const rowKey = match?.params.row;

  const params = useMemo(() => new URLSearchParams(search), [search]);
  const bare = !hasViewParams(params);
  const view = useMemo<TesseractView>(
    () =>
      bare ? (readStoredView() ?? DEFAULT_VIEW) : parseTesseractView(params),
    [bare, params],
  );
  const row = useMemo(
    () => (table && rowKey ? { table, row: rowKey } : null),
    [table, rowKey],
  );

  const kept = useMemo(() => outsideRow(params), [params]);
  const mapHref = useMemo(
    () => `${AdminRoutes.cortexTesseract()}${tesseractSearch(view, kept)}`,
    [view, kept],
  );

  const writeBare = useCallback(() => {
    if (!bare) return;
    void navigate(`${pathname}${tesseractSearch(view, params)}`, {
      replace: true,
      state,
    });
  }, [bare, view, navigate, pathname, params, state]);

  const setView = useCallback(
    (patch: Partial<TesseractView>) => {
      const next = { ...view, ...patch };
      storeView(next);
      const nextSearch = tesseractSearch(next, params);
      if (nextSearch === search) return;
      void navigate(`${pathname}${nextSearch}`, { replace: true, state });
    },
    [view, params, search, navigate, pathname, state],
  );

  const openRow = useCallback(
    (progressionId: number) => {
      const to = `${AdminRoutes.cortexTesseractRow({
        table: PROGRESSIONS_TABLE,
        row: String(progressionId),
      })}${tesseractSearch(view, kept)}`;
      // The first row is an entry over the map, which says so in its
      // history state; one opened over it takes its place, state and all.
      void navigate(to, {
        replace: row !== null,
        state: row !== null ? state : rowState(mapHref),
      });
    },
    [view, kept, navigate, row, state, mapHref],
  );

  const closeRow = useCallback(() => closeTo(mapHref), [closeTo, mapHref]);

  return useMemo(
    () => ({ view, bare, writeBare, row, mapHref, setView, openRow, closeRow }),
    [view, bare, writeBare, row, mapHref, setView, openRow, closeRow],
  );
}
