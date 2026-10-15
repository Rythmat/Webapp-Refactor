import { localGraph } from '@/content/graph/localGraph';
import type {
  MindMapBoard,
  MindMapEdge,
  MindMapKind,
  MindMapNode,
} from '@/content/graph/mindMapBoard';
import type { EntityId, GraphNode } from '@/content/graph/types';
import type { LessonCatalog } from './catalog';
import {
  globeStopFor,
  isGlobeNode,
  isSolid,
  type LessonGraph,
} from './graphQueries';

/**
 * The Promoter's board: what a student can find on the Globe around the focus,
 * and how it connects.
 *
 * The walk is the Cortex local graph (`localGraph`) two steps out from the
 * focus, through confirmed edges only and only through things a student can
 * stand on in the Globe: artists, pinned cities, events and songs. It does not
 * walk on through a hub (a city like New York joins 150 things, none of them
 * about the focus), though a hub it reaches is still on the board. The board
 * keeps the nearest and best-connected nodes, and every confirmed edge among
 * them, so a map can link two things the walk reached separately.
 */

/** Nodes on a board, the focus included. */
export const BOARD_MAX_NODES = 36;
/** A board needs this many nodes besides the focus to be worth a challenge. */
export const BOARD_MIN_FINDS = 4;
/** Connections asked for. */
export const BOARD_GOAL = 5;
/** A node with more confirmed edges than this is a hub: reached, not walked on. */
export const HUB_LIMIT = 40;

export const promoterBoard = (
  graph: LessonGraph,
  catalog: LessonCatalog,
  focusId: EntityId,
): MindMapBoard | null => {
  const focusNode = graph.nodes.get(focusId);
  if (!focusNode) return null;
  const walk = localGraph(graph, focusId, {
    depth: 2,
    nodeOk: (node) => isGlobeNode(graph, catalog, node.id),
    edgeOk: isSolid,
    expand: (node) => graph.solidDegree(node.id) <= HUB_LIMIT,
  });
  const reached = [...walk.depthOf]
    .filter(([id]) => id !== walk.focus)
    .map(([id, depth]) => ({ node: graph.nodes.get(id) as GraphNode, depth }))
    .filter(({ node }) => Boolean(node));
  if (reached.length < BOARD_MIN_FINDS) return null;

  reached.sort(
    (a, b) =>
      a.depth - b.depth ||
      graph.solidDegree(b.node.id) - graph.solidDegree(a.node.id) ||
      a.node.label.localeCompare(b.node.label),
  );
  const kept = [
    focusNode,
    ...reached.slice(0, BOARD_MAX_NODES - 1).map((r) => r.node),
  ];
  const keptIds = new Set(kept.map((n) => n.id));

  const nodes: MindMapNode[] = kept.map((node) => ({
    id: node.id,
    kind: node.kind as MindMapKind,
    label: node.label,
    stop: globeStopFor(node),
  }));

  // Every confirmed edge among the kept nodes, once each, in a stable order.
  const edges: MindMapEdge[] = [];
  const seen = new Set<string>();
  for (const node of kept) {
    for (const edge of graph.adjacency.get(node.id) ?? []) {
      if (!isSolid(edge) || edge.from === edge.to) continue;
      if (!keptIds.has(edge.from) || !keptIds.has(edge.to)) continue;
      const key = `${edge.from}|${edge.kind}|${edge.to}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ from: edge.from, to: edge.to, kind: edge.kind });
    }
  }

  return {
    focus: focusNode.id,
    goal: Math.min(BOARD_GOAL, nodes.length - 1),
    nodes,
    edges,
  };
};
