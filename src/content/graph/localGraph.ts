import type { Graph } from './deriveGraph';
import { canonicalId } from './ids';
import type { EntityId, GraphEdge, GraphNode } from './types';

/**
 * The local graph: everything within a few steps of one item, as Obsidian's
 * local graph shows it.
 *
 * The walk starts at the focus and goes out one step at a time, up to the
 * depth asked for. Each step follows the edges that touch the nodes reached
 * by the step before and arrives at nodes not reached yet. Two switches say
 * which way an edge may be followed. An edge runs from its `from` node to
 * its `to` node, so standing on a song, `performed_by` is outgoing and an
 * event's `about` pointing at the song is incoming. With "Outgoing links"
 * off, the walk never follows an edge forward; with "Incoming links" off,
 * never backward. These rules apply at every step, not only at the focus.
 *
 * The walk returns two things. One is each node's distance from the focus.
 * The other is the edges it actually walked: those that run from a node one
 * step closer to the focus to a node reached on this step. An edge between
 * two nodes at the same distance is not walked. It is what Obsidian calls a
 * neighbour link, and the Mind Map draws those only when its "Neighbor
 * links" switch is on, by drawing every visible edge among the nodes
 * reached (`renderGraph.ts` does that, not this module).
 *
 * The caller decides what may be walked through, with `nodeOk` and
 * `edgeOk`: the Filters panel hides tags, curriculum, missing items, guessed
 * or unconfirmed links, and a hidden node or link is no route either. The
 * focus itself is always kept, whatever `nodeOk` says, so the local graph
 * of a genre still opens while tags are hidden.
 *
 * A third rule, `expand`, says which reached nodes the walk may go on from.
 * Obsidian's local graph reaches a tag but never walks on through it: a tag
 * is always a leaf, so a song's local graph shows its genre without pulling
 * in every other song of that genre. The Mind Map passes "not a tag" here
 * (`walkFilters` in `renderGraph.ts`), so with Tags on, two steps from Toto
 * reach about 30 items, as in Obsidian, not about 1,000. The focus is always
 * walked from, so the local graph of a genre still shows what is in it.
 *
 * This is not `Graph.egoNetwork`, which serves the old ring map: that walk
 * stops at two steps, draws everything around the focus on the first step
 * and refuses to walk on through any busy node. This one goes as far as the
 * depth asks and stops only at the nodes `expand` turns down.
 *
 * The module is pure. It imports nothing but the graph's id rules, so it
 * runs in node, in a worker or in the console's lazy chunk alike.
 */

/** The fewest steps the local graph walks. */
export const LOCAL_DEPTH_MIN = 1;
/** The most steps the local graph walks (Obsidian's depth slider stops at 5). */
export const LOCAL_DEPTH_MAX = 5;

/**
 * A depth from the URL or a slider → a whole number from 1 to 5. Anything
 * that does not read as a number is the default of one step.
 */
export function clampLocalDepth(depth: unknown): number {
  const asked = Math.floor(Number(depth));
  if (Number.isNaN(asked)) return LOCAL_DEPTH_MIN;
  return Math.min(LOCAL_DEPTH_MAX, Math.max(LOCAL_DEPTH_MIN, asked));
}

export interface LocalGraphOptions {
  /** How many steps to walk, 1 to 5. One when left out. */
  depth?: number;
  /** Follow edges backward, from their `to` to their `from`. On when left out. */
  incoming?: boolean;
  /** Follow edges forward, from their `from` to their `to`. On when left out. */
  outgoing?: boolean;
  /** Whether a node may be reached. Never asked of the focus. */
  nodeOk?: (node: GraphNode) => boolean;
  /** Whether an edge may be followed. */
  edgeOk?: (edge: GraphEdge) => boolean;
  /**
   * Whether the walk may go on from a node it has reached. A node turned
   * down is still reached and drawn, but is a dead end. Never asked of the
   * focus. Every node is walked from when left out.
   */
  expand?: (node: GraphNode) => boolean;
}

export interface LocalGraph {
  /** The focus as the graph knows it: a song's globe event is the song. */
  focus: EntityId;
  /** The depth walked, after clamping. */
  depth: number;
  /**
   * Every node reached, with its distance from the focus: the focus at 0,
   * then in the order the walk reached them. Empty when the graph has no
   * such focus.
   */
  depthOf: ReadonlyMap<EntityId, number>;
  /** The edges walked, each once, in the order they were walked. */
  traversed: readonly GraphEdge[];
}

const always = () => true;

/** The local graph around `focus` (see the notes at the top of this file). */
export function localGraph(
  graph: Pick<Graph, 'nodes' | 'adjacency'>,
  focusId: EntityId,
  options: LocalGraphOptions = {},
): LocalGraph {
  const focus = canonicalId(focusId);
  const depth = clampLocalDepth(options.depth ?? LOCAL_DEPTH_MIN);
  const depthOf = new Map<EntityId, number>();
  const traversed: GraphEdge[] = [];
  if (!graph.nodes.has(focus)) return { focus, depth, depthOf, traversed };

  const incoming = options.incoming ?? true;
  const outgoing = options.outgoing ?? true;
  const nodeOk = options.nodeOk ?? always;
  const edgeOk = options.edgeOk ?? always;
  const expand = options.expand ?? always;
  // Asked at most once per node and once per edge, however often it is met.
  const nodeVerdict = new Map<EntityId, boolean>();
  const reachable = (id: EntityId): boolean => {
    let ok = nodeVerdict.get(id);
    if (ok === undefined) {
      const node = graph.nodes.get(id);
      ok = node !== undefined && nodeOk(node);
      nodeVerdict.set(id, ok);
    }
    return ok;
  };
  const walked = new Set<GraphEdge>();

  depthOf.set(focus, 0);
  let frontier: EntityId[] = [focus];
  for (let step = 1; step <= depth && frontier.length > 0; step++) {
    const next: EntityId[] = [];
    for (const id of frontier) {
      for (const edge of graph.adjacency.get(id) ?? []) {
        if (edge.from === edge.to || walked.has(edge)) continue;
        // Which way this edge leaves `id`: forward when `id` is its `from`.
        const forward = edge.from === id;
        if (forward ? !outgoing : !incoming) continue;
        const other = forward ? edge.to : edge.from;
        const reached = depthOf.get(other);
        // Only onward: an edge back toward the focus, or across to a node
        // at the same distance, is a neighbour link, not part of the walk.
        if (reached !== undefined && reached !== step) continue;
        if (!edgeOk(edge) || !reachable(other)) continue;
        if (reached === undefined) {
          depthOf.set(other, step);
          // Reached either way; walked on from only if it may be.
          const node = graph.nodes.get(other);
          if (node && expand(node)) next.push(other);
        }
        walked.add(edge);
        traversed.push(edge);
      }
    }
    frontier = next;
  }
  return { focus, depth, depthOf, traversed };
}
