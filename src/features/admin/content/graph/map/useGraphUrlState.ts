import { useCallback, useMemo } from 'react';
import { useLocation, useMatch, useNavigate } from 'react-router-dom';
import { AdminRoutes } from '@/constants/routes';
import { LOCAL_DEPTH_MAX, LOCAL_DEPTH_MIN } from '@/content/graph/localGraph';
import { rowState, useCloseRow } from '../../../table/grid/rowHistory';
import { tableRowForNode } from '../../../table/tableIds';

/**
 * What Cortex's URL says (the graph of the Atlas, at /console/cortex), and
 * the ways to change it.
 *
 * The URL holds where the graph is, so a view can be linked from anywhere in
 * the console and the back button walks it:
 *
 *  - no `focus` is the global graph, the whole Atlas; `?focus=artist:toto`
 *    is the local graph around Toto, walked `depth` steps out (1 to 5, left
 *    out of the URL when it is 1). Every "Open in Cortex" in the console
 *    already links with a focus, so each one opens a local graph;
 *  - `?list=1` shows the accessible List view in place of the map;
 *  - a dot clicked opens its Table row beside the graph, in the path
 *    (`/console/cortex/artists/toto`), as the Table opens a row: the
 *    first one is a new history entry over the graph, each one after it
 *    replaces it, and closing goes back to the graph without leaving the row
 *    behind in history (`grid/rowHistory.ts`). Because the row is in the
 *    path, leaving a row with unsaved edits asks first (the console's one
 *    unsaved-changes guard);
 *  - an item with no Table row (a vibe, an era, a teach day) opens read-only
 *    beside the graph with `?node=`, the same way.
 *
 * Changing the focus, the depth or the view touches only the search, so an
 * open row stays open, unsaved edits and all. A new focus is a new history
 * entry, so Back walks the trail of focuses; the depth and the List view
 * replace the entry they are on, since a slider dragged through five values
 * is one change, not five.
 *
 * Old links may say `hops` (read as `depth`) or `off`, `on`, `guesses`,
 * `unconfirmed` and `hubs`, the ring map's chips. They are read past, and
 * every change this hook makes writes the URL without them.
 */

/** The search parameters the graph owns. */
export const GRAPH_PARAMS = {
  focus: 'focus',
  depth: 'depth',
  list: 'list',
  node: 'node',
} as const;

/**
 * The ring map's parameters: `hops` is read as `depth`, the rest mean
 * nothing now. All of them are dropped the first time the URL is changed.
 */
export const LEGACY_GRAPH_PARAMS = [
  'hops',
  'off',
  'on',
  'guesses',
  'unconfirmed',
  'hubs',
] as const;

/**
 * What points into an open row and means nothing once it closes or another
 * opens: the row panel's field to scroll to, and the grid's Link… asked for
 * (grid/tableQuery.ts `FIELD_PARAM`, `LINK_PARAM`).
 */
const ROW_PARAMS = ['field', 'link'] as const;

/**
 * How far a local graph walks out from its focus: the walk's own limits
 * (`localGraph.ts`), which the settings panel's Depth slider shares.
 */
const DEPTH = { min: LOCAL_DEPTH_MIN, max: LOCAL_DEPTH_MAX } as const;

/** The graph's view as the URL holds it. */
export interface GraphQuery {
  /** The local graph's centre, as the URL spells it; null for global. */
  focus: string | null;
  /** Steps out from the focus, 1 to 5. */
  depth: number;
  /** The List view is showing. */
  list: boolean;
  /** An item with no Table row open beside the graph (`?node=`). */
  node: string | null;
}

/** A depth the local graph can have: a whole number from 1 to 5. */
export function clampDepth(value: unknown): number {
  const n =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number.parseInt(value, 10)
        : NaN;
  if (!Number.isFinite(n)) return DEPTH.min;
  return Math.min(DEPTH.max, Math.max(DEPTH.min, Math.trunc(n)));
}

/** The graph's view from its URL's search; old parameters read as above. */
export function parseGraphQuery(params: URLSearchParams): GraphQuery {
  const depth = params.get(GRAPH_PARAMS.depth) ?? params.get('hops');
  return {
    focus: params.get(GRAPH_PARAMS.focus) || null,
    depth: depth === null ? DEPTH.min : clampDepth(depth),
    list: params.get(GRAPH_PARAMS.list) === '1',
    node: params.get(GRAPH_PARAMS.node) || null,
  };
}

/** The URL holds parameters only the ring map understood. */
export const hasLegacyParams = (params: URLSearchParams): boolean =>
  LEGACY_GRAPH_PARAMS.some((name) => params.has(name));

/**
 * The search for a view of the graph (`?focus=…&depth=2`, or '' for none),
 * written one way: the graph's own parameters as `query` says, a depth of 1
 * left out, and the old ones gone. Anything else `keep` holds is kept as
 * it is.
 */
export function graphSearch(
  query: GraphQuery,
  keep: URLSearchParams = new URLSearchParams(),
): string {
  const next = new URLSearchParams(keep);
  for (const name of Object.values(GRAPH_PARAMS)) next.delete(name);
  for (const name of LEGACY_GRAPH_PARAMS) next.delete(name);
  if (query.focus) next.set(GRAPH_PARAMS.focus, query.focus);
  const depth = clampDepth(query.depth);
  if (depth !== DEPTH.min) next.set(GRAPH_PARAMS.depth, String(depth));
  if (query.list) next.set(GRAPH_PARAMS.list, '1');
  if (query.node) next.set(GRAPH_PARAMS.node, query.node);
  const text = next.toString();
  return text ? `?${text}` : '';
}

/**
 * A link to the local graph around `focus`, for a menu's Copy link or a
 * page's "Open in Cortex": the same URL the graph writes for itself.
 */
export const localGraphHref = (focus: string, depth: number = DEPTH.min) =>
  `${AdminRoutes.cortex()}${graphSearch({
    focus,
    depth,
    list: false,
    node: null,
  })}`;

/** Which graph shows: the whole Atlas, or one item's neighbourhood. */
export type GraphViewMode = 'global' | 'local';

export interface GraphUrlState extends GraphQuery {
  mode: GraphViewMode;
  /**
   * The Table row open beside the graph, as the path names it (the table is
   * not checked here: the drawer sends an unknown one back to the graph).
   */
  row: { table: string; row: string } | null;
  /** The URL still holds the ring map's parameters. */
  legacy: boolean;
  /** The graph's URL with nothing open beside it, its view as it is. */
  graphHref: string;
  /**
   * Centre the graph on `id` (local), or with null show the whole Atlas
   * (global, the depth dropped with the focus). A new history entry unless
   * `replace`; the depth is kept unless one is given.
   */
  setFocus(
    id: string | null,
    options?: { depth?: number; replace?: boolean },
  ): void;
  /** Walk the local graph this many steps out (1 to 5), in place. */
  setDepth(depth: number): void;
  /** Show the List view (or the map), in place; toggles when not told. */
  toggleList(on?: boolean): void;
  /**
   * Open a node's Table row beside the graph, keeping the graph's search:
   * a new entry the first time, in place of the open one after. A node no
   * table holds opens read-only instead (`openNode`).
   */
  openRow(nodeId: string): void;
  /** Open a node beside the graph read-only (`?node=`), as `openRow` does. */
  openNode(nodeId: string): void;
  /** Close whatever is open beside the graph, back to the graph. */
  closeRow(): void;
}

/** The graph's view and the ways to change it; see the top of this file. */
export function useGraphUrlState(): GraphUrlState {
  const navigate = useNavigate();
  const { pathname, search, state } = useLocation();
  const closeTo = useCloseRow();
  const match = useMatch(AdminRoutes.cortexRow.definition);
  const table = match?.params.table;
  const rowKey = match?.params.row;

  const params = useMemo(() => new URLSearchParams(search), [search]);
  const query = useMemo(() => parseGraphQuery(params), [params]);
  const row = useMemo(
    () => (table && rowKey ? { table, row: rowKey } : null),
    [table, rowKey],
  );
  const drawerOpen = row !== null || query.node !== null;

  /** The search without what pointed into the open row. */
  const outsideRow = useMemo(() => {
    const next = new URLSearchParams(params);
    for (const name of ROW_PARAMS) next.delete(name);
    return next;
  }, [params]);

  /** The graph with nothing open beside it, its view as it is now. */
  const graphUrl = useMemo(
    () =>
      `${AdminRoutes.cortex()}${graphSearch(
        { ...query, node: null },
        outsideRow,
      )}`,
    [query, outsideRow],
  );

  // The first drawer opened is an entry over the graph, which says so in its
  // history state; one opened over it takes its place, state and all.
  const openAt = useCallback(
    (to: string): void => {
      void navigate(to, {
        replace: drawerOpen,
        state: drawerOpen ? state : rowState(graphUrl),
      });
    },
    [navigate, drawerOpen, state, graphUrl],
  );

  const openNode = useCallback(
    (nodeId: string) =>
      openAt(
        `${AdminRoutes.cortex()}${graphSearch(
          { ...query, node: nodeId },
          outsideRow,
        )}`,
      ),
    [openAt, query, outsideRow],
  );

  const openRow = useCallback(
    (nodeId: string): void => {
      const target = tableRowForNode(nodeId);
      if (!target) return openNode(nodeId);
      openAt(
        `${AdminRoutes.cortexRow(target)}${graphSearch(
          { ...query, node: null },
          outsideRow,
        )}`,
      );
    },
    [openAt, openNode, query, outsideRow],
  );

  const closeRow = useCallback(() => closeTo(graphUrl), [closeTo, graphUrl]);

  // A change of view keeps the path (and so any open row). In place, the
  // entry keeps its history state, so closing still finds the graph behind
  // it; a new entry starts without, so closing it never steps back over
  // another view of the graph.
  //
  // Asking for the view already showing changes nothing: the router would
  // otherwise push a copy of this entry (only a link click skips a same-URL
  // push), and Back would then seem to do nothing. Pressing Local graph on
  // the item that is already the focus is the usual way here. The one
  // exception is an old link still carrying the ring map's parameters,
  // which is rewritten in place without them, as any change would.
  const change = useCallback(
    (next: GraphQuery, replace: boolean): void => {
      const nextSearch = graphSearch(next, params);
      const sameView = nextSearch === graphSearch(query, params);
      if (sameView && !hasLegacyParams(params)) return;
      const inPlace = replace || sameView;
      void navigate(`${pathname}${nextSearch}`, {
        replace: inPlace,
        state: inPlace ? state : undefined,
      });
    },
    [navigate, pathname, params, query, state],
  );

  const setFocus = useCallback<GraphUrlState['setFocus']>(
    (id, options = {}) =>
      change(
        {
          ...query,
          focus: id || null,
          depth: id ? (options.depth ?? query.depth) : DEPTH.min,
        },
        options.replace ?? false,
      ),
    [change, query],
  );

  const setDepth = useCallback(
    (depth: number) => change({ ...query, depth: clampDepth(depth) }, true),
    [change, query],
  );

  const toggleList = useCallback(
    (on?: boolean) => change({ ...query, list: on ?? !query.list }, true),
    [change, query],
  );

  // One object per URL, so a page can depend on it without re-running work
  // on every render.
  return useMemo(
    () => ({
      ...query,
      mode: query.focus ? 'local' : 'global',
      row,
      legacy: hasLegacyParams(params),
      graphHref: graphUrl,
      setFocus,
      setDepth,
      toggleList,
      openRow,
      openNode,
      closeRow,
    }),
    [
      query,
      row,
      params,
      graphUrl,
      setFocus,
      setDepth,
      toggleList,
      openRow,
      openNode,
      closeRow,
    ],
  );
}
