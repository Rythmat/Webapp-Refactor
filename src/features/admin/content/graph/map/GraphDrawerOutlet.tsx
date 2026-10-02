import { lazy, Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import type { Graph } from '@/content/graph/deriveGraph';
import {
  GRAPH_DRAWER_WIDTH_KEY,
  usePanelWidth,
} from '../../../table/panel/PanelFrame';
import { isTableId } from '../../../table/tableIds';
import { NodeSummaryPanel } from './NodeSummaryPanel';
import { useGraphUrlState } from './useGraphUrlState';

// The row panel, the table's model and the editors load with the first dot
// clicked, not with the map.
const GraphRowDrawer = lazy(() => import('./GraphRowDrawer'));

export interface GraphDrawerOutletProps {
  /** The graph the map draws; absent while it is being built. */
  graph?: Graph;
  /** A song pin's key → its item's id (`useWorkingGraph().pins`). */
  pins?: ReadonlyMap<string, string>;
  /** Each item's dot colour, as the graph draws it (its colour groups). */
  colorOf?: (node: { id: string; kind: string }) => string;
  /**
   * "Local graph" pressed in the drawer: the page's way to a local graph
   * (at the depth it keeps). Left out, the focus moves at the URL's depth.
   */
  onLocalGraph?: (node: string) => void;
}

/**
 * Whatever is open beside Cortex's graph, from the URL
 * (`useGraphUrlState`): a dot's Table row (`/console/cortex/:table/:row`,
 * `GraphRowDrawer`), or an item no table holds (`?node=`,
 * `NodeSummaryPanel`), or nothing.
 *
 * The map's page draws this to the right of the canvas, in the same flex
 * row, so the canvas narrows while a drawer is open. The page stays mounted
 * as rows open, close and change (the row is a child route of the graph's),
 * so the canvas, its layout worker and the camera all survive. Both kinds
 * of drawer share one width, which the reader can drag and the browser
 * remembers (`ma-console-graph-drawer-v1`).
 *
 * A path naming no table of the Table goes back to the graph, its view
 * kept, rather than opening a panel that has nothing to show.
 */
export const GraphDrawerOutlet = ({
  graph,
  pins,
  colorOf,
  onLocalGraph: localGraph,
}: GraphDrawerOutletProps) => {
  const url = useGraphUrlState();
  const onLocalGraph = localGraph ?? ((node: string) => url.setFocus(node));
  const [width, setWidth] = usePanelWidth(GRAPH_DRAWER_WIDTH_KEY);

  if (url.row) {
    if (!isTableId(url.row.table)) {
      return <Navigate replace to={url.graphHref} />;
    }
    return (
      <Suspense fallback={<DrawerLoading width={width} />}>
        <GraphRowDrawer
          table={url.row.table}
          row={url.row.row}
          onClose={url.closeRow}
          onLocalGraph={onLocalGraph}
          width={width}
          onWidthChange={setWidth}
        />
      </Suspense>
    );
  }

  if (url.node) {
    return (
      <NodeSummaryPanel
        // Another node is another panel: its scroll starts at the top.
        key={url.node}
        nodeId={url.node}
        graph={graph}
        pins={pins}
        colorOf={colorOf}
        onClose={url.closeRow}
        onLocalGraph={onLocalGraph}
        onOpen={url.openRow}
        width={width}
        onWidthChange={setWidth}
      />
    );
  }

  return null;
};

/** Where the drawer will be while its code loads: beside the graph from xl. */
const DrawerLoading = ({ width }: { width: number }) => (
  <div
    aria-hidden
    className="hidden h-full shrink-0 border-l border-border bg-[hsl(var(--ui-background))] xl:block"
    style={{ width }}
  />
);
