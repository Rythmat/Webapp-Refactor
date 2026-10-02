import type { Graph } from '@/content/graph/deriveGraph';
import type { LocalGraph, LocalGraphOptions } from '@/content/graph/localGraph';
import {
  ENTITY_KINDS,
  type EntityId,
  type EntityKind,
  type GraphEdge,
  type GraphNode,
} from '@/content/graph/types';
import { nodeRole, type TagFamily } from './nodeRoles';

/**
 * The Atlas graph → what the Mind Map draws (design §2).
 *
 * The Atlas graph is a map of nodes and a list of typed edges, often several
 * between the same two nodes: a song is `performed_by` an artist and
 * `written_by` the same artist, and an event may be `about` a song the song
 * also points back at. Obsidian draws one line between two notes however
 * many links join them, so this module does the same. It keeps the
 * difference that matters for drawing on each line as flags:
 *
 * - which ways the edges run (for arrows, and so a local graph can tell
 *   incoming from outgoing);
 * - whether the line is a guess: only when every edge behind it was guessed
 *   from a name (`inferred`), so one linked field makes the line solid;
 * - whether the line is unconfirmed: only when every edge behind it is
 *   (`unverified`).
 *
 * An edge's `on` song is context, not an end, so it plays no part here, and
 * an edge from a node to itself is never drawn.
 *
 * WHAT IS SHOWN
 *
 * The Filters panel decides. Notes are always shown. Tags show only when
 * "Tags" is on, and then only the families left on. Curriculum shows only
 * when its switch is on. "Existing items only" hides missing nodes, which
 * Obsidian calls unresolved; when they are shown they are flagged, so the
 * renderer can draw them dim. Guessed and unconfirmed links each have a
 * switch. "Search items…" hands in a predicate, and a node it says no to is
 * hidden. A line is drawn only when both its ends are shown.
 *
 * A node's weight is how many distinct neighbours it has among what is
 * shown, which is also how many lines touch it. Obsidian sizes dots by it.
 * A node with no lines is an orphan; "Orphans" hides them, and when they are
 * shown they are flagged.
 *
 * LOCAL GRAPHS
 *
 * Handed a local walk (`localGraph.ts`), only the nodes it reached are
 * shown, and the focus is shown whatever the filters say. The walk should be
 * made with `walkFilters`, so it goes only where the filters allow and, as in
 * Obsidian, stops at tags rather than walking on through them. The lines are the
 * edges the walk followed, or, with "Neighbor links" on, every edge the
 * filters allow among the nodes reached. Orphans are always shown, as in
 * Obsidian, where the switch belongs to the global graph alone.
 *
 * OUTPUT
 *
 * Typed arrays the renderer and the layout read directly. Nodes are numbered
 * in the order of their ids, so the same graph always numbers its nodes the
 * same way, whatever order it was built in. The fingerprint is an FNV-1a
 * hash of the shown ids and the line pairs. When a save leaves it unchanged,
 * the layout has nothing to redo, and only colours and labels need
 * refreshing.
 *
 * The module is pure: no React, no DOM, no content store.
 */

/* ── Flags ──────────────────────────────────────────────────────────────── */

/*
 * The line flags use the same bits as the renderer's `LINK_FLAG_*`
 * (`render/GraphRenderer.ts`), so `linkFlags` can be handed to it as it is.
 * A test holds the two in step.
 */

/** Every edge behind the line was guessed from a name: drawn dotted. */
export const LINE_GUESSED = 1;
/** Every edge behind the line is unconfirmed: drawn dashed. */
export const LINE_UNCONFIRMED = 2;
/** Some edge runs from the line's first node to its second. */
export const LINE_FORWARD = 4;
/** Some edge runs from the line's second node to its first. */
export const LINE_BACKWARD = 8;

/*
 * The node flags. The focus takes bit 1, which is the renderer's
 * `NODE_FLAG_RING`, so the local graph's focus gets its ring if the flags
 * are passed on unchanged; the renderer ignores the other bits.
 */

/** The local graph's focus. */
export const NODE_FOCUS = 1;
/** A missing item (Obsidian's "unresolved"): drawn dim grey. */
export const NODE_MISSING = 2;
/** A tag: genre, time, theory, instrument or region. */
export const NODE_TAG = 4;
/** A Teach day or a globe pathway. */
export const NODE_CURRICULUM = 8;
/** A node with no lines among what is shown. */
export const NODE_ORPHAN = 16;

/* ── Filters ────────────────────────────────────────────────────────────── */

/**
 * What the Filters panel lets through. The names match the persisted
 * settings (`graphSettings.ts`), so a mode's saved filters can be passed in
 * as they are, with the search compiled into `match`.
 */
export interface RenderFilters {
  /** Obsidian's "Tags". Off by default. */
  readonly tags: boolean;
  /** Each family's chip under "Tags". A family left out counts as on. */
  readonly tagFamilies?: Readonly<Partial<Record<TagFamily, boolean>>>;
  /** Teach days and pathways, in place of Obsidian's "Attachments". */
  readonly curriculum: boolean;
  /** "Existing items only" (Obsidian's "Existing files only"): hides missing items. */
  readonly existingOnly: boolean;
  /** Lines that are guesses. On by default. */
  readonly guessed: boolean;
  /** Lines that are unconfirmed. On by default. */
  readonly unconfirmed: boolean;
  /** Nodes with no lines. On by default; the global graph's switch only. */
  readonly orphans?: boolean;
  /** The compiled "Search items…": a node it says no to is hidden. */
  readonly match?: ((node: GraphNode) => boolean) | null;
}

/** Obsidian's stock filters, with the Atlas's own switches at theirs. */
export const DEFAULT_RENDER_FILTERS: RenderFilters = Object.freeze({
  tags: false,
  curriculum: false,
  existingOnly: false,
  guessed: true,
  unconfirmed: true,
  orphans: true,
});

/**
 * Whether the filters show a node, before orphans are counted. It is also
 * what the local walk is handed as its `nodeOk`, so the walk never goes
 * through a node that would not be drawn.
 */
export function nodeFilter(
  filters: RenderFilters,
): (node: GraphNode) => boolean {
  const families = filters.tagFamilies ?? {};
  const match = filters.match ?? null;
  return (node) => {
    const role = nodeRole(node);
    if (role.role === 'tag') {
      if (!filters.tags || families[role.family] === false) return false;
    } else if (role.role === 'curriculum' && !filters.curriculum) {
      return false;
    }
    if (filters.existingOnly && node.status === 'missing') return false;
    return match === null || match(node);
  };
}

/**
 * Whether the filters let an edge through. It is also what the local walk
 * is handed as its `edgeOk`. An edge that is both a guess and unconfirmed
 * needs both switches on.
 */
export function edgeFilter(
  filters: RenderFilters,
): (edge: GraphEdge) => boolean {
  const { guessed, unconfirmed } = filters;
  return (edge) =>
    (guessed || !edge.inferred) && (unconfirmed || !edge.unverified);
}

/**
 * Whether the local walk may go on from a node it has reached: from anything
 * but a tag. Obsidian's local graph shows a note's tags but never walks on
 * through one, since a tag joins hundreds of notes that have nothing else in
 * common. It is what the walk is handed as its `expand`.
 */
export const walkExpands = (node: GraphNode): boolean =>
  nodeRole(node).role !== 'tag';

/**
 * The rules a local walk takes from the Filters panel: what it may reach,
 * what it may follow, and what it may go on from. Pass them to `localGraph`
 * as they are.
 */
export function walkFilters(
  filters: RenderFilters,
): Required<Pick<LocalGraphOptions, 'nodeOk' | 'edgeOk' | 'expand'>> {
  return {
    nodeOk: nodeFilter(filters),
    edgeOk: edgeFilter(filters),
    expand: walkExpands,
  };
}

/* ── The drawn graph ────────────────────────────────────────────────────── */

/** A local walk to draw, and whether to draw its neighbour links. */
export interface LocalScope {
  readonly walk: LocalGraph;
  /** Obsidian's "Neighbor links": every allowed edge among the nodes reached. */
  readonly neighborLinks: boolean;
}

export interface RenderGraph {
  /** How many nodes are drawn. Every per-node array has this many entries. */
  readonly count: number;
  /** Each node's id, in id order. */
  readonly ids: readonly EntityId[];
  /** Each node, as the Atlas graph has it. */
  readonly nodes: readonly GraphNode[];
  /** A node's number from its id. */
  readonly indexOf: ReadonlyMap<EntityId, number>;
  /** Each node's kind, as its place in `ENTITY_KINDS`. */
  readonly kinds: Uint8Array;
  /** Each node's `NODE_*` flags. */
  readonly flags: Uint8Array;
  /** Each node's number of distinct neighbours among what is drawn. */
  readonly weights: Uint32Array;
  /** How many lines are drawn. */
  readonly linkCount: number;
  /** One pair of node numbers per line, the lower first: `[a0, b0, a1, b1, …]`. */
  readonly links: Uint32Array;
  /** Each line's `LINE_*` flags. */
  readonly linkFlags: Uint8Array;
  /**
   * Each node's neighbours: node i's are `neighbours` from
   * `neighbourOffsets[i]` up to `neighbourOffsets[i + 1]`, in node order,
   * and `neighbourLines` says which line joins them.
   */
  readonly neighbourOffsets: Uint32Array;
  readonly neighbours: Uint32Array;
  readonly neighbourLines: Uint32Array;
  /** The local graph's focus, or -1 for the global graph. */
  readonly focus: number;
  /** Each node's steps from the focus in a local graph; null for the global graph. */
  readonly depths: Uint8Array | null;
  /** A hash of the drawn ids and line pairs: the layout's structure. */
  readonly fingerprint: string;
}

const KIND_INDEX: ReadonlyMap<EntityKind, number> = new Map(
  ENTITY_KINDS.map((kind, index) => [kind, index]),
);

/** Ids in code-unit order: stable, and much cheaper than `localeCompare`. */
const byId = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** The neighbours of node `i`: a view into `neighbours`, not a copy. */
export const neighboursOf = (
  graph: Pick<RenderGraph, 'neighbours' | 'neighbourOffsets'>,
  i: number,
): Uint32Array =>
  graph.neighbours.subarray(
    graph.neighbourOffsets[i],
    graph.neighbourOffsets[i + 1],
  );

/* FNV-1a, 32 bits, over UTF-16 code units and 32-bit numbers. */
const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

function fnvString(hash: number, text: string): number {
  let h = hash;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), FNV_PRIME);
  }
  // A separator no id contains, so `ab`+`c` never hashes as `a`+`bc`.
  return Math.imul(h ^ 0xffff, FNV_PRIME);
}

function fnvNumber(hash: number, value: number): number {
  let h = hash;
  for (let shift = 0; shift < 32; shift += 8) {
    h = Math.imul(h ^ ((value >>> shift) & 0xff), FNV_PRIME);
  }
  return h;
}

/**
 * The structural fingerprint of a set of ids (in order) and line pairs: the
 * counts, then the FNV-1a hash in hex.
 */
export function structuralFingerprint(
  ids: readonly string[],
  links: ArrayLike<number>,
  linkCount: number,
): string {
  let hash = FNV_OFFSET;
  for (const id of ids) hash = fnvString(hash, id);
  for (let i = 0; i < linkCount * 2; i++) hash = fnvNumber(hash, links[i]);
  return `${ids.length}:${linkCount}:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

/**
 * Build what the Mind Map draws from the Atlas graph, the filters and, for a
 * local graph, the walk (see the notes at the top of this file).
 */
export function buildRenderGraph(
  graph: Pick<Graph, 'nodes' | 'edges'>,
  filters: RenderFilters = DEFAULT_RENDER_FILTERS,
  local: LocalScope | null = null,
): RenderGraph {
  const showNode = nodeFilter(filters);
  const showEdge = edgeFilter(filters);
  const focusId =
    local && local.walk.depthOf.size > 0 ? local.walk.focus : null;

  // 1. The nodes the filters show, in id order.
  const candidates: EntityId[] = [];
  if (local) {
    for (const id of local.walk.depthOf.keys()) {
      const node = graph.nodes.get(id);
      if (node && (id === focusId || showNode(node))) candidates.push(id);
    }
  } else {
    for (const [id, node] of graph.nodes)
      if (showNode(node)) candidates.push(id);
  }
  candidates.sort(byId);
  const slot = new Map<EntityId, number>();
  candidates.forEach((id, i) => slot.set(id, i));

  // 2. One line per pair, with the flags of every edge behind it.
  const n = candidates.length;
  const lineOf = new Map<number, number>();
  const ends: number[] = [];
  const lineFlags: number[] = [];
  const edges =
    local && !local.neighborLinks ? local.walk.traversed : graph.edges;
  for (const edge of edges) {
    if (edge.from === edge.to || !showEdge(edge)) continue;
    const a = slot.get(edge.from);
    const b = slot.get(edge.to);
    if (a === undefined || b === undefined || a === b) continue;
    const lo = a < b ? a : b;
    const hi = a < b ? b : a;
    const key = lo * n + hi;
    let line = lineOf.get(key);
    if (line === undefined) {
      line = lineFlags.length;
      lineOf.set(key, line);
      ends.push(lo, hi);
      // Guessed and unconfirmed until an edge says otherwise.
      lineFlags.push(LINE_GUESSED | LINE_UNCONFIRMED);
    }
    let flags = lineFlags[line] | (a === lo ? LINE_FORWARD : LINE_BACKWARD);
    if (!edge.inferred) flags &= ~LINE_GUESSED;
    if (!edge.unverified) flags &= ~LINE_UNCONFIRMED;
    lineFlags[line] = flags;
  }

  // 3. Weights: one line per neighbour, so a node's lines are its neighbours.
  const degree = new Uint32Array(n);
  for (let i = 0; i < ends.length; i++) degree[ends[i]]++;

  // 4. Orphans, hidden by the global graph's switch.
  const dropOrphans = !local && filters.orphans === false;
  let keep: Int32Array | null = null;
  let count = n;
  if (dropOrphans) {
    keep = new Int32Array(n);
    count = 0;
    for (let i = 0; i < n; i++) keep[i] = degree[i] > 0 ? count++ : -1;
  }
  const renumber = (i: number) => (keep ? keep[i] : i);

  const ids: EntityId[] = new Array(count);
  const nodes: GraphNode[] = new Array(count);
  const indexOf = new Map<EntityId, number>();
  const kinds = new Uint8Array(count);
  const nodeFlags = new Uint8Array(count);
  const weights = new Uint32Array(count);
  const depths = local ? new Uint8Array(count) : null;
  let focus = -1;
  for (let i = 0; i < n; i++) {
    const j = renumber(i);
    if (j < 0) continue;
    const id = candidates[i];
    const node = graph.nodes.get(id) as GraphNode;
    ids[j] = id;
    nodes[j] = node;
    indexOf.set(id, j);
    kinds[j] = KIND_INDEX.get(node.kind) ?? 0;
    weights[j] = degree[i];
    const role = nodeRole(node).role;
    let flags = 0;
    if (id === focusId) {
      flags |= NODE_FOCUS;
      focus = j;
    }
    if (node.status === 'missing') flags |= NODE_MISSING;
    if (role === 'tag') flags |= NODE_TAG;
    else if (role === 'curriculum') flags |= NODE_CURRICULUM;
    if (degree[i] === 0) flags |= NODE_ORPHAN;
    nodeFlags[j] = flags;
    if (depths) depths[j] = Math.min(255, local?.walk.depthOf.get(id) ?? 0);
  }

  // 5. The lines in pair order, renumbered past any orphans dropped.
  const linkCount = lineFlags.length;
  const order = Array.from({ length: linkCount }, (_, i) => i).sort(
    (x, y) => ends[2 * x] - ends[2 * y] || ends[2 * x + 1] - ends[2 * y + 1],
  );
  const links = new Uint32Array(linkCount * 2);
  const linkFlags = new Uint8Array(linkCount);
  order.forEach((line, k) => {
    links[2 * k] = renumber(ends[2 * line]);
    links[2 * k + 1] = renumber(ends[2 * line + 1]);
    linkFlags[k] = lineFlags[line];
  });

  // 6. Each node's neighbours, for hover and for stepping through them.
  const neighbourOffsets = new Uint32Array(count + 1);
  for (let j = 0; j < count; j++) {
    neighbourOffsets[j + 1] = neighbourOffsets[j] + weights[j];
  }
  const fill = neighbourOffsets.slice(0, count);
  const neighbours = new Uint32Array(linkCount * 2);
  const neighbourLines = new Uint32Array(linkCount * 2);
  for (let k = 0; k < linkCount; k++) {
    const a = links[2 * k];
    const b = links[2 * k + 1];
    neighbours[fill[a]] = b;
    neighbourLines[fill[a]++] = k;
    neighbours[fill[b]] = a;
    neighbourLines[fill[b]++] = k;
  }

  return {
    count,
    ids,
    nodes,
    indexOf,
    kinds,
    flags: nodeFlags,
    weights,
    linkCount,
    links,
    linkFlags,
    neighbourOffsets,
    neighbours,
    neighbourLines,
    focus,
    depths,
    fingerprint: structuralFingerprint(ids, links, linkCount),
  };
}
