import { Maximize, Minus, Plus } from 'lucide-react';
import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminRoutes } from '@/constants/routes';
import { canonicalId } from '@/content/graph/ids';
import { localGraph } from '@/content/graph/localGraph';
import type { EntityId, GraphNode } from '@/content/graph/types';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { isTableId, nodeIdForRow } from '../../table/tableIds';
import { ConsoleBadge } from '../../ui/ConsoleBadge';
import { ConsoleCallout } from '../../ui/ConsoleCallout';
import { consoleTabClass } from '../../ui/styles';
import { EntitySearch } from './EntitySearch';
import { GraphModeBadge } from './GraphModeBadge';
import { TryAgain, WorkingGraphNotice } from './WorkingGraphNotice';
import { kindLabel } from './graphVocabulary';
import type { GraphCanvasApi } from './map/GraphCanvas';
import { GraphContextMenu } from './map/GraphContextMenu';
import { GraphDrawerOutlet } from './map/GraphDrawerOutlet';
import { GraphListView } from './map/GraphListView';
import {
  currentNodeAnnouncement,
  GraphLiveRegion,
  useGraphAnnouncer,
} from './map/GraphLiveRegion';
import { GraphSettingsPanel } from './map/GraphSettingsPanel';
import { NodePreviewCard } from './map/NodePreviewCard';
import {
  TimelapseCanvas,
  TimelapseCounter,
  useTimelapseActive,
  useTimelapsePlayer,
} from './map/TimelapseCanvas';
import { layoutSignature } from './map/layout/positionCache';
import {
  colorNodes,
  presetGroups,
  type ColorGroup,
} from './map/model/colorGroups';
import { graphFacets } from './map/model/facets';
import { compileQueryText } from './map/model/graphQuery';
import {
  type GlobalFilterSettings,
  type GraphSettings,
  type LocalFilterSettings,
  mappedForces,
  restoreGraphDefaults,
} from './map/model/graphSettings';
import { TAG_FAMILIES } from './map/model/nodeRoles';
import {
  buildRenderGraph,
  edgeFilter,
  type RenderFilters,
  walkFilters,
} from './map/model/renderGraph';
import {
  GRAPH_STAGE_CLASS,
  GRAPH_THEME,
  rgbaBytes,
} from './map/render/graphTheme';
import type { GraphSettingsPatch } from './map/settings/SettingControls';
import type { PressKeys } from './map/useGraphInteraction';
import { useGraphSettings } from './map/useGraphSettings';
import { useGraphUrlState } from './map/useGraphUrlState';
import { GLOBAL_SCOPE, localScope } from './map/useLayout';
import {
  progressionOfNode,
  tesseractHrefForProgression,
} from './tesseract/tesseractLinks';
import { useWorkingGraph } from './useWorkingGraph';
import { useWorkingGraphStatus } from './workingGraphStatus';

/**
 * Cortex, the console's map of the Atlas (called the Mind Map until the
 * owner renamed it on 1 Oct 2026): the Atlas as one graph, drawn the way
 * Obsidian draws a vault, filling the whole page below the Cortex section's
 * bar (Amendment 7). It is the section's default view, at /console/cortex.
 *
 * The page is a shell (`GraphShell`) with a slim 44 px header and the graph
 * filling everything under it:
 *
 * - the header holds Find, the Global | Local switch, the badge saying which
 *   copy of the Atlas this is, the Map / Integrity / Links pills, the
 *   Graph | List switch and, when a saved search hides part of the graph,
 *   a "Filtered" chip;
 * - the stage is the app's own background, with the graph on it
 *   (`GraphCanvas`, WebGL). Floating over it: the settings panel top right
 *   (Filters, Groups, Display, Forces, as in Obsidian), the zoom buttons
 *   bottom right, and the notice the Table and Integrity show when the
 *   working copy did not load, as a banner across the top;
 * - a drawer on the right holds the row a click opens, and the stage
 *   shrinks to make room for it.
 *
 * It draws the working graph (`useWorkingGraph`): the content API's items
 * over the repo where the API serves `/export`, the repo's snapshot where it
 * does not. That is the graph the Table and Integrity read, so a row's "Open
 * in Cortex" always finds its node, and a node's "Open in Table" its row.
 *
 * From the Atlas to what is drawn:
 *
 * 1. The Filters decide what shows (`model/renderGraph.ts`): notes always,
 *    tags and curriculum only when switched on, missing items unless
 *    "Existing items only", guessed and unconfirmed links each on a switch,
 *    the search ("Search items…") hiding what it does not match.
 * 2. Global or local is in the URL (`useGraphUrlState`): no `focus` is the
 *    whole Atlas; `?focus=artist:toto&depth=2` is the local graph two steps
 *    round Toto (`localGraph.ts`), walked through what the filters show and
 *    stopping at tags, as Obsidian's does. Each mode keeps its own settings.
 * 3. The colour groups colour what is drawn (`model/colorGroups.ts`), in
 *    the app's twelve colours. The local graph's focus keeps its group's
 *    colour, at the largest size and with the white highlight ring.
 *
 * A change to the filters or the groups rebuilds what is drawn and its
 * colours; the layout moves only when the structure changed (its
 * fingerprint), and the forces reheat it. Every setting is kept in the
 * browser.
 *
 * Clicking a dot opens its Table row beside the graph (the URL's child
 * route), so the row can be read and edited without leaving the graph; a
 * dot no table holds opens read-only. A progression's dot is the exception
 * (owner, 1 Oct 2026): its click opens it in Tesseract, the map of
 * progression openings, in the last key shown there, with its branch open,
 * the camera flown to it and its row beside the map; Cmd- or Ctrl-click,
 * or Open row here in its right-click menu, opens its row here instead. The keyboard walks the graph too (the
 * key help below), and the List view (`?list=1`) is the same graph as the
 * accessible "Connections of X" table. One polite live region says what the
 * keys made current, what was opened, and when the layout has settled.
 */

/** The last focus this tab had, for the Local switch. */
const LAST_FOCUS_KEY = 'ma-console-graph-last-focus';

/** The keys the graph answers to, read out with the graph (design §5). */
const KEY_HELP =
  'Keys on the graph: arrow keys pan, three times as far with Shift. Equals and minus zoom in and out, and 0 fits the whole graph. Slash goes to Find. Left and right square brackets step through the current item’s neighbours. Enter opens the current item beside the graph (a progression opens in Tesseract; its menu, Shift F10, opens its row here), L opens its local graph, and Escape clears. Hold Command or Control over a dot to preview it.';

/**
 * How long the groups wait after a keystroke in a query before recolouring
 * (Obsidian's 250 ms). A new colour, a new order or a group added or
 * deleted recolours at once.
 */
const GROUPS_DEBOUNCE_MS = 250;

/**
 * What the List view says over itself when this browser cannot draw the
 * graph at all (no WebGL2, or a GPU that refused the renderer).
 */
export const NO_WEBGL_MESSAGE =
  'This browser cannot draw the graph, because WebGL2 is turned off or not working here, so Cortex shows the same items and connections as a list. Turning on hardware acceleration in the browser’s settings usually brings the graph back.';

const readLastFocus = (): string | null => {
  try {
    return window.sessionStorage.getItem(LAST_FOCUS_KEY);
  } catch {
    return null;
  }
};

const writeLastFocus = (id: string) => {
  try {
    window.sessionStorage.setItem(LAST_FOCUS_KEY, id);
  } catch {
    // Storage blocked: Local is offered from the selection only.
  }
};

/** Whether two lists of groups differ only in what their queries say. */
export function onlyQueriesDiffer(
  a: readonly ColorGroup[],
  b: readonly ColorGroup[],
): boolean {
  if (a.length !== b.length) return false;
  let differ = false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].color !== b[i].color || a[i].name !== b[i].name) return false;
    if (a[i].query !== b[i].query) differ = true;
  }
  return differ;
}

/**
 * The groups the graph is coloured by. Typing in a query waits until the
 * typing has stopped for `ms`, so a half-typed query does not recolour on
 * every keystroke; any other change (a colour dragged in the picker, a new
 * order, a group added or deleted) shows at once, since colouring the
 * graph again is cheap. While a query waits, the groups as they were are
 * used, which differ from the live ones only in that query.
 */
export function useColoringGroups(
  live: readonly ColorGroup[],
  ms: number,
): readonly ColorGroup[] {
  const [settled, setSettled] = useState(live);
  const typing = settled !== live && onlyQueriesDiffer(settled, live);
  useEffect(() => {
    if (settled === live) return;
    if (!typing) {
      setSettled(live);
      return;
    }
    const timer = window.setTimeout(() => setSettled(live), ms);
    return () => window.clearTimeout(timer);
  }, [live, settled, typing, ms]);
  return typing ? settled : live;
}

/** A colour's bytes as `#rrggbbaa`, the form the colour groups read. */
const hexOf = (bytes: readonly number[]) =>
  `#${bytes.map((b) => b.toString(16).padStart(2, '0')).join('')}`;

/** The theme's dot colours, one source for the groups and the page's dots. */
const DEFAULT_DOT = GRAPH_THEME.defaultNode;
const MISSING_DOT = hexOf(
  rgbaBytes(GRAPH_THEME.missing, GRAPH_THEME.missingAlpha) ?? [
    102, 102, 102, 128,
  ],
);

/** A count as the region's label reads it: "6,942". */
const count = (n: number) => n.toLocaleString('en-US');

/** A node's colour bytes as CSS. */
const rgbaAt = (rgba: Uint8Array, i: number) =>
  `rgba(${rgba[4 * i]}, ${rgba[4 * i + 1]}, ${rgba[4 * i + 2]}, ${
    Math.round((rgba[4 * i + 3] / 255) * 1000) / 1000
  })`;

/**
 * The filters that change the layout's structure, for the position cache's
 * key. The search is left out, so a search starts from the unfiltered
 * positions and filtering feels stable.
 */
const structuralSignature = (
  scope: string,
  filters: GlobalFilterSettings | LocalFilterSettings,
) =>
  layoutSignature(scope, {
    tags: filters.tags,
    families: filters.tags
      ? TAG_FAMILIES.filter((f) => filters.tagFamilies[f])
      : [],
    curriculum: filters.curriculum,
    existingOnly: filters.existingOnly,
    guessed: filters.guessed,
    unconfirmed: filters.unconfirmed,
    orphans: 'orphans' in filters ? filters.orphans : true,
  });

export const MindMapPage = () => {
  const url = useGraphUrlState();
  const navigate = useNavigate();
  // No item lists: the map draws the graph, not the items' states.
  const working = useWorkingGraph({ items: false });
  const status = useWorkingGraphStatus(working);
  const graph = working.graph;
  const { ref: liveRef, announce } = useGraphAnnouncer();
  const keyHelpId = useId();
  const listHeadingId = useId();
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const canvasApi = useRef<GraphCanvasApi>(null);
  // "Animate": its steps redraw only the canvas and the counter, never the
  // page; the page hears when a run starts and ends.
  const timelapse = useTimelapsePlayer();
  const timelapsePlaying = useTimelapseActive(timelapse);
  const findBox = useRef<HTMLDivElement>(null);

  const [settings, updateSettings] = useGraphSettings();
  const mode = url.mode;
  const modeSettings = settings[mode];
  const filters = modeSettings.filters;

  const [currentId, setCurrentId] = useState<string | null>(null);
  const [lastFocus, setLastFocus] = useState<string | null>(readLastFocus);
  const [hoverGroup, setHoverGroup] = useState<number | null>(null);
  const [noWebgl, setNoWebgl] = useState(false);

  const focusId = url.focus ? canonicalId(url.focus as EntityId) : null;
  const selectedId = useMemo(() => {
    if (url.row && isTableId(url.row.table)) {
      return nodeIdForRow(url.row.table, url.row.row);
    }
    return url.node ? canonicalId(url.node as EntityId) : null;
  }, [url.row, url.node]);

  // A new focus is what the list is about now, and what Local returns to.
  // The keyboard's current item is let go, unless it is the new focus (a
  // "To" pressed in the List view, or L on the graph): it stays current,
  // so the List view follows it even with a row open beside the graph.
  useEffect(() => {
    const focus = url.focus ? canonicalId(url.focus as EntityId) : null;
    setCurrentId((current) =>
      current !== null && current === focus ? current : null,
    );
    if (!url.focus) return;
    writeLastFocus(url.focus);
    setLastFocus(url.focus);
  }, [url.focus]);

  // ── What is drawn ───────────────────────────────────────────────────

  const facets = useMemo(() => (graph ? graphFacets(graph) : null), [graph]);
  const searchQuery = useMemo(
    () => compileQueryText(filters.search),
    [filters.search],
  );

  const renderFilters = useMemo<RenderFilters>(() => {
    const match = searchQuery.match;
    return {
      tags: filters.tags,
      tagFamilies: filters.tagFamilies,
      curriculum: filters.curriculum,
      existingOnly: filters.existingOnly,
      guessed: filters.guessed,
      unconfirmed: filters.unconfirmed,
      orphans: 'orphans' in filters ? filters.orphans : true,
      // A search that cannot be read hides nothing: the box says why.
      match:
        match && facets
          ? (node: GraphNode) => {
              const f = facets.get(node.id);
              return f ? match(f, false) : false;
            }
          : null,
    };
  }, [filters, searchQuery, facets]);

  const localFilters =
    mode === 'local' ? (filters as LocalFilterSettings) : null;
  const walk = useMemo(() => {
    if (!graph || !focusId || !localFilters) return null;
    return localGraph(graph, focusId as EntityId, {
      depth: url.depth,
      incoming: localFilters.incoming,
      outgoing: localFilters.outgoing,
      ...walkFilters(renderFilters),
    });
  }, [graph, focusId, url.depth, localFilters, renderFilters]);

  const neighborLinks = localFilters?.neighborLinks ?? false;
  const renderGraph = useMemo(() => {
    if (!graph) return null;
    const started = performance.now();
    const drawn = buildRenderGraph(
      graph,
      renderFilters,
      walk ? { walk, neighborLinks } : null,
    );
    if (import.meta.env.DEV) {
      performance.measure('cortex:render-graph', {
        start: started,
        end: performance.now(),
      });
    }
    return drawn;
  }, [graph, renderFilters, walk, neighborLinks]);

  // ── Colours ─────────────────────────────────────────────────────────

  const presets = useMemo(() => presetGroups(), []);
  const liveGroups: readonly ColorGroup[] = settings.groups ?? presets;
  const groups = useColoringGroups(liveGroups, GROUPS_DEBOUNCE_MS);

  const coloring = useMemo(
    () =>
      renderGraph && facets
        ? colorNodes({
            ids: renderGraph.ids,
            facets,
            groups,
            isOrphan: (i) => renderGraph.weights[i] === 0,
            defaultColor: DEFAULT_DOT,
            missingColor: MISSING_DOT,
          })
        : null,
    [renderGraph, facets, groups],
  );

  // Every dot wears its group's colour, the local graph's focus included:
  // the focus stands out by its size and its white ring, never by a fill
  // of its own.
  const colors = coloring?.rgba ?? null;

  const spotlight = useMemo(() => {
    if (hoverGroup === null || !coloring) return null;
    const mask = new Uint8Array(coloring.groupOf.length);
    coloring.groupOf.forEach((g, i) => {
      mask[i] = g === hoverGroup ? 1 : 0;
    });
    return mask;
  }, [hoverGroup, coloring]);

  const compiledGroups = useMemo(
    () =>
      groups.map((g) => ({
        match: compileQueryText(g.query).match,
        color: g.color,
      })),
    [groups],
  );

  /** A dot's colour anywhere on the page: the graph's, or what the groups would give it. */
  const colorOf = useCallback(
    (node: { id: string; kind: string }) => {
      const i = renderGraph?.indexOf.get(node.id as EntityId);
      if (i !== undefined && colors) return rgbaAt(colors, i);
      const f = facets?.get(node.id);
      if (!f) return DEFAULT_DOT;
      if (f.status === 'missing') return MISSING_DOT;
      for (const g of compiledGroups) if (g.match?.(f, false)) return g.color;
      return DEFAULT_DOT;
    },
    [renderGraph, colors, facets, compiledGroups],
  );

  // ── Layout keys ─────────────────────────────────────────────────────

  const globalSignature = useMemo(
    () => structuralSignature(GLOBAL_SCOPE, settings.global.filters),
    [settings.global.filters],
  );
  const scope = focusId ? localScope(focusId) : GLOBAL_SCOPE;
  const forces = useMemo(
    () => mappedForces(modeSettings.forces),
    [modeSettings.forces],
  );

  // ── What the reader does ────────────────────────────────────────────

  const nodeOf = useCallback(
    (id: string | null) => (id ? graph?.nodes.get(id as EntityId) : undefined),
    [graph],
  );

  const linksOf = useCallback(
    (id: string) => {
      const i = renderGraph?.indexOf.get(id as EntityId);
      return i === undefined || !renderGraph ? 0 : renderGraph.weights[i];
    },
    [renderGraph],
  );

  const onCurrentChange = useCallback(
    (id: string | null, step?: { index: number; of: number; from: string }) => {
      setCurrentId(id);
      const node = nodeOf(id);
      if (node) announce(currentNodeAnnouncement(node, linksOf(node.id), step));
    },
    [nodeOf, linksOf, announce],
  );

  // A dot clicked (or Enter) opens its row; it becomes the keyboard's
  // current item once the row has opened (below), so a move the unsaved
  // changes guard stops leaves the current item where it was. A
  // progression's plain click goes to Tesseract instead; with Cmd or Ctrl
  // held it opens the row here, as any other dot's does.
  const onOpen = useCallback(
    (id: string, keys?: PressKeys) => {
      const progression = progressionOfNode(id);
      if (progression !== null && !keys?.metaKey && !keys?.ctrlKey) {
        void navigate(tesseractHrefForProgression(progression));
        return;
      }
      if (id === selectedId) setCurrentId(id);
      else url.openRow(id);
    },
    [url, selectedId, navigate],
  );

  /** A progression's dot leaves for Tesseract; every other dot stays here. */
  const tesseractHref = useCallback((id: string) => {
    const progression = progressionOfNode(id);
    return progression === null
      ? null
      : tesseractHrefForProgression(progression);
  }, []);

  // What opens beside the graph is said once it is open, and is current.
  const lastSelected = useRef<string | null>(null);
  useEffect(() => {
    if (selectedId === lastSelected.current) return;
    lastSelected.current = selectedId;
    if (selectedId !== null) setCurrentId(selectedId);
    const node = nodeOf(selectedId);
    if (node) {
      announce(
        `Opened ${node.label}, ${kindLabel(node.kind).toLowerCase()}, beside the graph`,
      );
    }
  }, [selectedId, nodeOf, announce]);

  // The local graph keeps the depth it was last shown at, as Obsidian's
  // does (the local settings' `depth`): going to it from the whole Atlas
  // (Local, L on the graph, a dot's "Local graph") starts there, not at 1.
  // A link's own depth still wins, and becomes the one kept.
  const keptDepth = settings.local.filters.depth;
  useEffect(() => {
    if (mode !== 'local' || url.depth === keptDepth) return;
    const depth = url.depth;
    updateSettings((s) => ({
      ...s,
      local: { ...s.local, filters: { ...s.local.filters, depth } },
    }));
  }, [mode, url.depth, keptDepth, updateSettings]);

  /** The local graph round `id`, at the depth showing or the one kept. */
  const openLocal = (id: string) =>
    url.setFocus(id, { depth: mode === 'local' ? url.depth : keptDepth });

  const centre = currentId ?? selectedId ?? lastFocus;
  const toGlobal = () => url.setFocus(null);
  const toLocal = () => {
    if (centre) openLocal(centre);
  };

  /** Find: fly to the item and make it current; the keys then act on it. */
  const onFound = (id: string) => {
    const canon = canonicalId(id as EntityId);
    const node = nodeOf(canon);
    setCurrentId(canon);
    if (url.list || noWebgl) {
      if (node) announce(currentNodeAnnouncement(node, linksOf(canon)));
      return;
    }
    const api = canvasApi.current;
    if (node && api?.flyTo(canon)) {
      announce(currentNodeAnnouncement(node, linksOf(canon)));
      api.focus();
    } else if (node) {
      announce(
        `${node.label} is not drawn: the graph's filters${
          mode === 'local' ? ' or this local graph' : ''
        } leave it out. The List view shows its connections.`,
      );
    }
  };

  const goToFind = () => {
    findBox.current?.querySelector('input')?.focus();
  };

  // The List view: a "To" makes its item current, and in the local graph
  // moves the focus there too.
  const makeCurrentFromList = (id: string) => {
    const canon = canonicalId(id as EntityId);
    onCurrentChange(canon);
    if (mode === 'local') url.setFocus(canon);
  };

  const patchSettings = (patch: GraphSettingsPatch) =>
    updateSettings((s: GraphSettings) => {
      const current = s[mode];
      return {
        ...s,
        [mode]: {
          filters: { ...current.filters, ...patch.filters },
          display: { ...current.display, ...patch.display },
          forces: { ...current.forces, ...patch.forces },
        },
      };
    });

  const restoreDefaults = () => {
    updateSettings((s) => restoreGraphDefaults(s, mode));
    if (mode === 'local') url.setDepth(1);
  };

  // "Skip to the list" switches view, then lands on the list's heading.
  const showList = url.list || noWebgl;
  const landOnList = useRef(false);
  useEffect(() => {
    if (!showList || !landOnList.current) return;
    landOnList.current = false;
    document.getElementById(listHeadingId)?.focus();
  }, [showList, listHeadingId]);
  const skipToList = (e: ReactMouseEvent) => {
    e.preventDefault();
    landOnList.current = true;
    if (showList) document.getElementById(listHeadingId)?.focus();
    else url.toggleList(true);
  };

  const awaitingWorking = working.mode === 'repo' && working.isRefreshing;
  const focusNode = nodeOf(focusId);
  const missingFocus = mode === 'local' && !!graph && !focusNode;

  const regionLabel = renderGraph
    ? `${focusNode && mode === 'local' ? `Cortex around ${focusNode.label}` : 'Cortex'}: ${count(
        renderGraph.count,
      )} items, ${count(renderGraph.linkCount)} links`
    : 'Cortex';

  let body: ReactNode;
  if (!graph && !working.isLoading) {
    body = (
      <div className="px-6 py-6 md:px-10">
        <ConsoleCallout tone="danger">
          The graph could not be built: {String(working.error)}. <TryAgain />
        </ConsoleCallout>
      </div>
    );
  } else if (!graph || !renderGraph || !colors) {
    body = <Building />;
  } else {
    // Without WebGL2 the canvas is not kept: it would only lay out (and keep
    // a worker busy) for a picture nobody can see. The List view stands in.
    const canvas = noWebgl ? null : (
      <GraphContextMenu
        hitTest={(x, y) => canvasApi.current?.hitTest(x, y) ?? null}
        nodes={graph.nodes}
        currentId={currentId}
        onLocalGraph={openLocal}
        tesseractHref={tesseractHref}
        onOpenRow={url.openRow}
        onFit={() => canvasApi.current?.fit()}
        onResetZoom={() => canvasApi.current?.resetZoom()}
        disabled={showList}
      >
        <TimelapseCanvas
          player={timelapse}
          controlRef={canvasApi}
          graph={renderGraph}
          colors={colors}
          display={modeSettings.display}
          forces={forces}
          scope={scope}
          signature={mode === 'global' ? globalSignature : null}
          globalSignature={globalSignature}
          focusId={focusId}
          currentId={currentId}
          selectedId={selectedId}
          spotlight={spotlight}
          label={regionLabel}
          keyHelpId={keyHelpId}
          reducedMotion={reducedMotion}
          hidden={showList}
          onOpen={onOpen}
          onLocalGraph={openLocal}
          onCurrentChange={onCurrentChange}
          onFind={goToFind}
          // Said only while the picture shows: a List view reader is
          // somewhere else, and the news would talk over what they hear.
          onSettled={() => {
            if (!showList) announce('Layout settled');
          }}
          onUnavailable={() => setNoWebgl(true)}
          renderPreview={(id, at, bounds) => {
            const node = nodeOf(id);
            return node ? (
              <NodePreviewCard
                node={node}
                edges={graph.adjacency.get(node.id) ?? []}
                nodes={graph.nodes}
                links={linksOf(node.id)}
                colorOf={colorOf}
                at={at}
                bounds={bounds}
              />
            ) : null;
          }}
        />
      </GraphContextMenu>
    );
    body = (
      <>
        {canvas}
        {timelapsePlaying && !showList ? (
          <TimelapseCounter player={timelapse} onStop={timelapse.stop} />
        ) : null}
        {missingFocus && !showList ? (
          <div className="absolute inset-x-0 top-0 px-6 pt-6 md:px-10">
            {awaitingWorking ? (
              <Building />
            ) : (
              <ConsoleCallout tone="neutral">
                Nothing in the graph is called <code>{url.focus}</code>. Find a
                song, an artist, a place or an event above, or go back to the
                whole Atlas.
              </ConsoleCallout>
            )}
          </div>
        ) : null}
        {showList ? (
          <div
            className={`absolute inset-0 overflow-y-auto ${GRAPH_STAGE_CLASS}`}
          >
            {noWebgl ? (
              <div className="mx-auto max-w-5xl px-6 pt-6 md:px-10">
                <ConsoleCallout tone="neutral">
                  {NO_WEBGL_MESSAGE}
                </ConsoleCallout>
              </div>
            ) : null}
            <GraphListView
              graph={graph}
              current={currentId}
              selected={selectedId}
              focus={url.focus}
              onMakeCurrent={makeCurrentFromList}
              pins={working.pins}
              colorOf={colorOf}
              edgeOk={edgeFilter(renderFilters)}
              headingId={listHeadingId}
            />
          </div>
        ) : null}
      </>
    );
  }

  const graphShowing = !!renderGraph && !!colors && !showList;

  /**
   * Animate (the wand, or Display's button): the whole Atlas grows year by
   * year (`TimelapseCanvas`). The global graph's alone, as in Obsidian, and
   * never under reduced motion.
   */
  const startTimelapse = () => {
    if (!renderGraph || !facets || reducedMotion || mode !== 'global') return;
    const plan = timelapse.start(renderGraph, facets)?.plan;
    if (!plan) return;
    const { firstYear, lastYear } = plan;
    const span =
      firstYear === null || lastYear === null
        ? ''
        : firstYear === lastYear
          ? `, all of it from ${firstYear}`
          : ` from ${firstYear} to ${lastYear}`;
    announce(
      `Timelapse playing: the Atlas grows year by year${span}. Stop, or Escape on the graph, brings the graph back as it was.`,
    );
  };

  // A run ends when the picture it grows is no longer what shows.
  const timelapseAllowed = graphShowing && mode === 'global' && !reducedMotion;
  useEffect(() => {
    if (!timelapseAllowed) timelapse.stop();
  }, [timelapseAllowed, timelapse]);
  useEffect(
    () =>
      timelapse.onEnd((end) =>
        announce(
          end === 'finished'
            ? 'Timelapse finished. The graph is back as it was.'
            : 'Timelapse stopped. The graph is back as it was.',
        ),
      ),
    [timelapse, announce],
  );

  return (
    <GraphShell
      find={
        <div ref={findBox}>
          <EntitySearch
            nodes={graph?.nodes}
            onPick={onFound}
            colorOf={colorOf}
            disabled={!graph}
          />
        </div>
      }
      scope={
        <ScopeSwitch
          scope={mode}
          canLocal={mode === 'local' || centre !== null}
          onGlobal={toGlobal}
          onLocal={toLocal}
        />
      }
      badge={
        <GraphModeBadge
          mode={working.mode}
          status={status}
          refreshing={working.isRefreshing}
        />
      }
      view={
        <ViewSwitch
          list={showList}
          onChange={url.toggleList}
          graphDisabled={noWebgl}
        />
      }
      filtered={
        filters.search.trim() ? (
          <FilteredChip
            title={`Only items matching “${filters.search.trim()}” are drawn. Click to show everything.`}
            onClear={() => patchSettings({ filters: { search: '' } })}
          />
        ) : null
      }
      banner={
        graph ? (
          <WorkingGraphNotice
            status={status}
            error={working.error}
            subject="map"
            className="px-3 py-2 text-xs shadow-lg"
          />
        ) : null
      }
      settings={
        graphShowing ? (
          <GraphSettingsPanel
            mode={mode}
            settings={modeSettings}
            groups={liveGroups}
            groupCounts={coloring?.counts}
            queryErrors={coloring?.problems}
            onChange={patchSettings}
            onGroupsChange={(next) =>
              updateSettings((s) => ({ ...s, groups: next }))
            }
            onGroupHover={setHoverGroup}
            onRestoreDefaults={restoreDefaults}
            onAnimate={mode === 'global' ? startTimelapse : undefined}
            animateDisabled={reducedMotion}
            depth={mode === 'local' ? url.depth : undefined}
            onDepthChange={mode === 'local' ? url.setDepth : undefined}
            // The zoom buttons stay reachable under a tall open panel.
            className="max-h-[calc(100%-72px)]"
          />
        ) : null
      }
      zoom={
        graphShowing ? (
          <ZoomButtons
            onZoomIn={() => canvasApi.current?.zoomBy(1.5)}
            onZoomOut={() => canvasApi.current?.zoomBy(1 / 1.5)}
            onFit={() => canvasApi.current?.fit()}
          />
        ) : null
      }
      drawer={
        <GraphDrawerOutlet
          graph={graph}
          pins={working.pins}
          colorOf={colorOf}
          onLocalGraph={openLocal}
        />
      }
      skip={
        graphShowing ? (
          <a
            href={`#${listHeadingId}`}
            onClick={skipToList}
            className="sr-only rounded-full bg-white px-3 py-1 text-xs text-[#101012] focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-40"
          >
            Skip to the list of connections
          </a>
        ) : null
      }
      keyHelpId={keyHelpId}
      live={<GraphLiveRegion ref={liveRef} />}
    >
      {body}
    </GraphShell>
  );
};

/** The zoom buttons over the stage: the pointer's way to what `=`, `−` and `0` do. */
export const ZoomButtons = ({
  onZoomIn,
  onZoomOut,
  onFit,
}: {
  onZoomIn(): void;
  onZoomOut(): void;
  onFit(): void;
}) => {
  const button =
    'flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 [&>svg]:size-4';
  return (
    <div
      role="group"
      aria-label="Zoom"
      className="flex items-center gap-0.5 rounded-lg border border-border bg-popover/90 p-0.5 shadow-lg"
    >
      <button
        type="button"
        aria-label="Zoom in"
        title="Zoom in"
        onClick={onZoomIn}
        className={button}
      >
        <Plus aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Zoom out"
        title="Zoom out"
        onClick={onZoomOut}
        className={button}
      >
        <Minus aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Fit the graph"
        title="Fit the graph"
        onClick={onFit}
        className={button}
      >
        <Maximize aria-hidden />
      </button>
    </div>
  );
};

/* ── The shell ───────────────────────────────────────────────────────── */

/** The whole Atlas, or the graph around one item. */
export type GraphScope = 'global' | 'local';

export interface GraphShellProps {
  /** Find: the graph's search box. */
  find: ReactNode;
  /** The Global | Local switch. */
  scope: ReactNode;
  /** Which copy of the Atlas this is (`GraphModeBadge`). */
  badge: ReactNode;
  /** The Graph | List switch. */
  view: ReactNode;
  /** The "Filtered" chip, while a saved search hides part of the graph. */
  filtered?: ReactNode;
  /** A notice across the top of the stage (`WorkingGraphNotice`). */
  banner?: ReactNode;
  /**
   * The settings panel, floating top right over the stage. It goes into the
   * stage as it is, with no box around it, so pass a `GraphSettingsPanel`
   * left `floating` (its default): it then sits 12 px in from the stage's
   * top right corner, above the banner and the zoom buttons, and is never
   * taller than the stage. A box around it would have no height of its own,
   * and the open panel would shrink to nothing inside it.
   */
  settings?: ReactNode;
  /** The zoom buttons, floating bottom right over the stage. */
  zoom?: ReactNode;
  /** The row opened beside the graph; the stage shrinks to make room. */
  drawer?: ReactNode;
  /** The skip link to the List view, shown when it takes focus. */
  skip?: ReactNode;
  /** The page's one live region (`GraphLiveRegion`). */
  live?: ReactNode;
  /**
   * The id the key help is rendered under, for the graph region's
   * `aria-describedby`.
   */
  keyHelpId: string;
  /** The stage: the graph, the List view, or what shows while it builds. */
  children: ReactNode;
}

/**
 * Cortex's layout, and nothing else: the 44 px header over a stage that
 * fills the rest of the section below its bar, with the floating pieces placed
 * over it. Every piece comes in as a slot, so the canvas, the settings
 * panel and the drawer can each be dropped in without touching the others.
 */
export const GraphShell = ({
  find,
  scope,
  badge,
  view,
  filtered,
  banner,
  settings,
  zoom,
  drawer,
  skip,
  live,
  keyHelpId,
  children,
}: GraphShellProps) => (
  <div
    data-graph-stage=""
    className={`flex min-h-0 flex-1 flex-col ${GRAPH_STAGE_CLASS}`}
  >
    <h1 className="sr-only">Cortex</h1>
    {/* No overflow on the header: Find's matches drop down out of it. */}
    <header className="flex h-11 shrink-0 items-center gap-2 border-b border-white/[0.06] px-3">
      <div className="w-44 shrink-0 sm:w-56 lg:w-72">{find}</div>
      {scope}
      <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-white/10" />
      {/* The badges give way first when the header runs out of room. */}
      <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
        {badge}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {filtered}
        {view}
        <span aria-hidden className="mx-1 h-4 w-px bg-white/10" />
        <GraphViewsNav />
      </div>
    </header>
    <div className="flex min-h-0 flex-1">
      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
        {skip}
        {children}
        {banner && (
          <div
            className={`pointer-events-none absolute left-3 top-3 z-20 flex justify-center empty:hidden ${
              settings ? 'right-[264px]' : 'right-3'
            }`}
          >
            <div className="pointer-events-auto max-w-2xl empty:hidden">
              {banner}
            </div>
          </div>
        )}
        {/* No wrapper: the panel places itself in the stage's corner and
            takes its height from the stage, so it scrolls inside itself
            when it is taller (see GraphShellProps.settings). */}
        {settings}
        {zoom && <div className="absolute bottom-3 right-3 z-20">{zoom}</div>}
      </div>
      {drawer}
    </div>
    <p id={keyHelpId} className="sr-only">
      {KEY_HELP}
    </p>
    {live}
  </div>
);

/**
 * Cortex's graph pages: this one, Integrity and the bulk linker. The
 * section's bar above lights Cortex on all three; these switch between them.
 */
const GraphViewsNav = () => (
  <nav aria-label="Graph views" className="flex gap-1">
    <span aria-current="page" className={consoleTabClass(true, 'sm')}>
      Map
    </span>
    <Link
      to={AdminRoutes.cortexIntegrity()}
      className={consoleTabClass(false, 'sm')}
    >
      Integrity
    </Link>
    <Link
      to={AdminRoutes.cortexLinks()}
      className={consoleTabClass(false, 'sm')}
    >
      Links
    </Link>
  </nav>
);

/**
 * Global | Local. Local needs something to centre on, so it waits for a
 * selection or a focus this tab has had.
 */
export const ScopeSwitch = ({
  scope,
  canLocal,
  onGlobal,
  onLocal,
}: {
  scope: GraphScope;
  canLocal: boolean;
  onGlobal(): void;
  onLocal(): void;
}) => (
  <div role="group" aria-label="Graph scope" className="flex shrink-0 gap-1">
    <button
      type="button"
      aria-pressed={scope === 'global'}
      onClick={onGlobal}
      title="The whole Atlas"
      className={consoleTabClass(scope === 'global', 'sm')}
    >
      Global
    </button>
    <button
      type="button"
      aria-pressed={scope === 'local'}
      disabled={!canLocal}
      onClick={onLocal}
      title={
        canLocal
          ? 'The graph around one item'
          : 'Select or find something to centre a local graph on'
      }
      className={`${consoleTabClass(scope === 'local', 'sm')} disabled:opacity-40`}
    >
      Local
    </button>
  </div>
);

/**
 * Graph | List: the picture, or its connections as a table. Where the
 * browser cannot draw the picture (`graphDisabled`), Graph stays visible but
 * cannot be chosen, and says why.
 */
export const ViewSwitch = ({
  list,
  onChange,
  graphDisabled = false,
}: {
  list: boolean;
  onChange(list: boolean): void;
  graphDisabled?: boolean;
}) => (
  <div role="group" aria-label="Show as" className="flex gap-1">
    <button
      type="button"
      aria-pressed={!list}
      disabled={graphDisabled}
      title={
        graphDisabled
          ? 'This browser cannot draw the graph (WebGL2 is off)'
          : undefined
      }
      onClick={() => onChange(false)}
      className={`${consoleTabClass(!list, 'sm')} disabled:opacity-40`}
    >
      Graph
    </button>
    <button
      type="button"
      aria-pressed={list}
      onClick={() => onChange(true)}
      className={consoleTabClass(list, 'sm')}
    >
      List
    </button>
  </div>
);

/** A filtered graph says so, so a saved search never looks like a broken one. */
export const FilteredChip = ({
  title,
  onClear,
}: {
  title?: string;
  onClear?(): void;
}) =>
  onClear ? (
    <button
      type="button"
      onClick={onClear}
      title={title ?? 'Some items are hidden by a search. Click to show all.'}
      className={consoleTabClass(true, 'sm')}
    >
      Filtered
    </button>
  ) : (
    <ConsoleBadge tone="info" title={title}>
      Filtered
    </ConsoleBadge>
  );

/** What shows while the graph is built; the placeholders hold still under reduced motion. */
const Building = () => (
  <div className="grid gap-4 px-6 py-6 md:px-10 lg:grid-cols-[1fr_320px]">
    <Skeleton className="h-[62vh] rounded-xl motion-reduce:animate-none" />
    <Skeleton className="h-64 rounded-xl motion-reduce:animate-none" />
    <p className="text-sm text-white/45">Building the graph…</p>
  </div>
);
