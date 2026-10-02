import type { Graph } from '@/content/graph/deriveGraph';
import {
  EDGE_KINDS,
  EDGE_LABELS,
  type EdgeKind,
  type EntityId,
  type EntityKind,
  type GraphEdge,
  type GraphNode,
} from '@/content/graph/types';
import {
  edgeStyle,
  kindOf,
  labelOf,
  tagOf,
  titleOf,
  walkParts,
  type WalkContext,
} from '../model/aggregate';
import {
  CHIP_STYLES,
  type ChipStyle,
  type ColumnSource,
  type ConnectionPart,
  type PartRole,
  type TableDef,
} from '../model/types';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  A row's connections in full, for its panel
 * ══════════════════════════════════════════════════════════════════════════
 *
 * A grid cell carries at most `CHIP_LIMIT` chips and a count; the row's
 * panel lists everything. Two lists:
 *
 *  - a column in full: every node the column's walk reaches, filed under
 *    the part that reached it by its strongest path — the same node, style,
 *    part, weight and word its grid chip has, only none left out. The walk
 *    is aggregate.ts's own (`walkParts`: a stated part takes only edges the
 *    row states, and the one-step facts skip them; a chip is as strong as
 *    its strongest path, a path as its weakest step), and so are the chip's
 *    word and tooltip; only the drawing is this file's (hints only where
 *    nothing else reached the node). fullConnections.test.ts holds the two
 *    together on the fixture and on the repo's own graph, chip for chip.
 *  - every edge touching the row's node, grouped the way the mind map's
 *    connections table reads them ("performed", "featured in"), each with
 *    the fields that state it.
 *
 * Pure, like model/*: it reads the graph it is handed.
 */

/* ── A column in full ────────────────────────────────────────────────── */

/** One node a column reaches, as its chip would show it. */
export interface PanelEntry {
  node: EntityId;
  label: string;
  style: ChipStyle;
  /** Distinct paths to it across the column's parts. */
  weight: number;
  /** Only a hint reached it: not a value of the row. */
  muted: boolean;
  /** Its part's word: 'wrote', 'song pins', 'scene'. */
  tag?: string;
  /** The fields that state it, or "via songs · 12". */
  title?: string;
}

/** The nodes one part reached by their strongest path. */
export interface PanelPart {
  id: string;
  label: string;
  role: PartRole;
  entries: readonly PanelEntry[];
}

export interface PanelColumn {
  /** Every distinct node reached. */
  total: number;
  /** In the column's order; parts that reached nothing are left out. */
  parts: readonly PanelPart[];
}

const rank = (style: ChipStyle) => CHIP_STYLES.indexOf(style);

const labelCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

/**
 * The grid's chip order: the row's own values first, then strongest style,
 * weight, label.
 */
export function entryOrder(a: PanelEntry, b: PanelEntry): number {
  return (
    Number(a.muted) - Number(b.muted) ||
    rank(a.style) - rank(b.style) ||
    b.weight - a.weight ||
    labelCollator.compare(a.label, b.label) ||
    (a.node < b.node ? -1 : a.node > b.node ? 1 : 0)
  );
}

/**
 * A connections column in full: every node its parts reach from `starts`,
 * under the part that reached it by its strongest path (the part its grid
 * chip names), each part's entries in the grid's chip order.
 */
export function columnInFull(
  ctx: WalkContext,
  starts: readonly EntityId[],
  parts: readonly ConnectionPart[],
): PanelColumn {
  const reached = walkParts(ctx, starts, parts);
  const byPart: PanelEntry[][] = parts.map(() => []);

  for (const [node, reaches] of reached) {
    // As connectionsOf: the strongest path wins, the column's order breaks a
    // tie, and a hint counts only where nothing but hints reached the node.
    const muted = reaches.every((r, i) => !r || parts[i].role === 'hint');
    let best = -1;
    let weight = 0;
    reaches.forEach((reach, i) => {
      if (!reach) return;
      weight += reach.mids ? reach.mids.size : 1;
      if (parts[i].role === 'hint' && !muted) return;
      if (best < 0 || rank(reach.style) < rank(reaches[best]!.style)) {
        best = i;
      }
    });
    const part = parts[best];
    const reach = reaches[best]!;
    const missing = ctx.graph.nodes.get(node)?.status === 'missing';
    const tag = tagOf(part, reach);
    byPart[best].push({
      node,
      label: labelOf(ctx.graph, node),
      style: missing ? 'hollow' : reach.style,
      weight,
      muted,
      ...(tag ? { tag } : {}),
      title: titleOf(part, reach),
    });
  }

  return {
    total: reached.size,
    parts: parts.flatMap((part, i): PanelPart[] =>
      byPart[i].length
        ? [
            {
              id: part.id,
              label: part.label,
              role: part.role,
              entries: byPart[i].sort(entryOrder),
            },
          ]
        : [],
    ),
  };
}

/**
 * The nodes a row stands on for a column: its own, and the ones its table
 * expands it over — a genre's subgenres, a decade's years — unless the
 * column keeps to the row itself (`noExpand`). As buildTableModel does.
 */
export function startsFor(
  graph: Graph,
  def: TableDef,
  node: EntityId,
  source: ColumnSource,
): EntityId[] {
  if ('noExpand' in source && source.noExpand) return [node];
  const expand = def.rows.expand;
  const kind = kindOf(node);
  const [edge, from]: [EdgeKind, EntityKind] | [null, null] =
    expand === 'subgenres' && kind === 'genre'
      ? ['in_genre', 'subgenre']
      : expand === 'decadeYears' && kind === 'decade'
        ? ['in_decade', 'year']
        : [null, null];
  if (!edge) return [node];
  const nodes = [node];
  for (const e of graph.adjacency.get(node) ?? []) {
    if (e.kind === edge && e.to === node && kindOf(e.from) === from) {
      nodes.push(e.from);
    }
  }
  return nodes;
}

/* ── Every edge ──────────────────────────────────────────────────────── */

/** One edge touching the row, from the row's side. */
export interface PanelEdge {
  edge: GraphEdge;
  /** The node at the other end. */
  other: EntityId;
  label: string;
  /** As a chip would draw the other end: hollow when it is found nowhere. */
  style: ChipStyle;
}

/** The row's edges of one kind, read one way round: "performed", "featured in". */
export interface EdgeGroup {
  key: string;
  kind: EdgeKind;
  /** The row is the edge's `from`. */
  forward: boolean;
  label: string;
  edges: readonly PanelEdge[];
}

/**
 * Every edge touching `node`, grouped by kind and direction in the mind
 * map's arc order (its connections table's), each group strongest first,
 * then by label.
 *
 * `overlay` stands in for the graph's own edges of the node — a draft's,
 * laid over them (`draftEdges.ts`) — with the nodes they reach that the
 * graph does not have yet.
 */
export function edgeGroupsOf(
  graph: Graph,
  node: EntityId,
  overlay?: {
    edges: readonly GraphEdge[];
    nodes: ReadonlyMap<EntityId, GraphNode>;
  },
): EdgeGroup[] {
  const groups = new Map<string, EdgeGroup & { edges: PanelEdge[] }>();
  const nodeOf = (id: EntityId) =>
    graph.nodes.get(id) ?? overlay?.nodes.get(id);
  for (const edge of overlay?.edges ?? graph.adjacency.get(node) ?? []) {
    const forward = edge.from === node;
    const other = forward ? edge.to : edge.from;
    if (other === node) continue;
    const key = `${edge.kind}:${forward ? 'out' : 'in'}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        kind: edge.kind,
        forward,
        label: EDGE_LABELS[edge.kind][forward ? 'forward' : 'inverse'],
        edges: [],
      };
      groups.set(key, group);
    }
    const found = nodeOf(other);
    group.edges.push({
      edge,
      other,
      label: found?.label ?? labelOf(graph, other),
      // Found nowhere: every end of the graph's own edges is a node.
      style:
        (found?.status ?? 'missing') === 'missing' ? 'hollow' : edgeStyle(edge),
    });
  }
  const order = (g: EdgeGroup) =>
    EDGE_KINDS.indexOf(g.kind) * 2 + (g.forward ? 0 : 1);
  return [...groups.values()]
    .sort((a, b) => order(a) - order(b))
    .map((group) => ({
      ...group,
      edges: group.edges.sort(
        (a, b) =>
          rank(a.style) - rank(b.style) ||
          labelCollator.compare(a.label, b.label) ||
          (a.other < b.other ? -1 : a.other > b.other ? 1 : 0) ||
          (a.edge.on ?? '').localeCompare(b.edge.on ?? ''),
      ),
    }));
}
