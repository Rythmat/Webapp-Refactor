import { useEffect, useId, useRef } from 'react';
import type { Graph } from '@/content/graph/deriveGraph';
import { canonicalId } from '@/content/graph/ids';
import type { EntityId, GraphEdge, GraphNode } from '@/content/graph/types';
import { CONSOLE_LABEL } from '../../../ui/styles';
import { ConnectionsTable } from '../ConnectionsTable';

/**
 * The Mind Map as a list (design §9): the keyboard's and the screen
 * reader's way through the graph, and the view to fall back on where WebGL2
 * is missing.
 *
 * It shows one item's connections as the accessible "Connections of X"
 * table (`ConnectionsTable`). X is the first of these that is set:
 *
 * 1. the node made current with the keys or from this list;
 * 2. the selection (the item whose row is open beside the graph);
 * 3. the local graph's focus.
 *
 * Each "To" button in the table makes that item current, so the list is
 * walked one item at a time, as the ring map's table was. In the local
 * graph the page also moves the focus there (`onMakeCurrent` decides).
 *
 * The heading takes focus programmatically (`tabIndex={-1}`), so the page's
 * "Skip to the list" link can land on it. Pressing a "To" also lands there
 * once the list has moved on: the button pressed belongs to the old list
 * and is gone, and the new heading is where reading the next item starts.
 */

/** The colour of an item's dot: the graph's colour groups. */
export type DotColor = (node: { id: string; kind: string }) => string;

export interface GraphListViewProps {
  /** The graph the Mind Map draws; nothing is listed while it builds. */
  graph: Pick<Graph, 'nodes' | 'adjacency'> | undefined;
  /** The node made current with the keys or from this list. */
  current?: string | null;
  /** The selected node: the one whose row is open beside the graph. */
  selected?: string | null;
  /** The local graph's focus; none in the global graph. */
  focus?: string | null;
  /** A "To" button was pressed: make that item current. */
  onMakeCurrent(id: string): void;
  /** A song pin's key → its item's id (`useWorkingGraph().pins`). */
  pins?: ReadonlyMap<string, string>;
  /** The graph's colour groups, for the dots; the kind's colour when absent. */
  colorOf?: DotColor;
  /**
   * Which connections the graph's filters show (guessed links, unconfirmed
   * links, tags); every connection when absent.
   */
  edgeOk?: (edge: GraphEdge) => boolean;
  /** The heading's id, for a skip link to land on. */
  headingId?: string;
}

/** The item the list is about: current, then selected, then the focus. */
export function listSubject(
  current: string | null | undefined,
  selected: string | null | undefined,
  focus: string | null | undefined,
): string | null {
  const id = current || selected || focus;
  return id ? canonicalId(id as EntityId) : null;
}

export const GraphListView = ({
  graph,
  current,
  selected,
  focus,
  onMakeCurrent,
  pins,
  colorOf,
  edgeOk,
  headingId,
}: GraphListViewProps) => {
  const ownId = useId();
  const hid = headingId ?? ownId;
  const id = listSubject(current, selected, focus);
  const node: GraphNode | undefined = id
    ? graph?.nodes.get(id as EntityId)
    : undefined;

  const heading = useRef<HTMLHeadingElement>(null);
  /** A "To" was pressed: land on the heading once the list moves on. */
  const followTo = useRef(false);
  useEffect(() => {
    if (!followTo.current) return;
    followTo.current = false;
    heading.current?.focus();
  }, [node?.id]);
  const goTo = (to: string) => {
    followTo.current = true;
    onMakeCurrent(to);
  };
  const edges = node
    ? (graph?.adjacency.get(node.id) ?? []).filter((e) => !edgeOk || edgeOk(e))
    : [];

  return (
    <section
      aria-labelledby={hid}
      className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-6 md:px-10"
    >
      <h2
        ref={heading}
        id={hid}
        tabIndex={-1}
        className={`${CONSOLE_LABEL} focus:outline-none`}
      >
        {node ? `Connections of ${node.label}` : 'Connections'}
      </h2>
      {node && graph ? (
        <ConnectionsTable
          focus={node}
          edges={edges}
          nodes={graph.nodes}
          onFocus={goTo}
          pins={pins}
          colorOf={colorOf}
        />
      ) : id && graph ? (
        <p className="text-sm text-white/55">
          Nothing in the graph is called <code>{id}</code>. Find something above
          to list its connections.
        </p>
      ) : (
        <p className="text-sm text-white/55">
          Nothing is chosen yet. Find something above, or pick a dot in the
          graph, and its connections are listed here.
        </p>
      )}
    </section>
  );
};
