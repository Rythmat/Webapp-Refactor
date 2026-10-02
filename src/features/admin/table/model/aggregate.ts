import type { Graph } from '@/content/graph/deriveGraph';
import { decadeOf } from '@/content/graph/time';
import type {
  EdgeKind,
  EntityId,
  EntityKind,
  GraphEdge,
} from '@/content/graph/types';
import {
  CHIP_LIMIT,
  CHIP_STYLES,
  type CellValue,
  type Chip,
  type ChipStyle,
  type ConnectionPart,
  type Hop,
  type PartCount,
  weakerStyle,
} from './types';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  Counting a cell: the registry's walks, over the graph's adjacency
 * ══════════════════════════════════════════════════════════════════════════
 *
 * A connections column is a list of parts, each one or two steps from the
 * row's node (types.ts). This walks them and counts what they reach, the way
 * the mind map would draw the row's first and second rings:
 *
 *  - every distinct node reached is one chip, whatever the number of paths;
 *  - a path is as strong as its weakest step (a genre's artists through a
 *    song whose artist is only guessed are a guess), and a chip as strong as
 *    its strongest path (one linked source makes it solid, as the graph
 *    merges edges);
 *  - a node found nowhere is hollow, whatever the path;
 *  - a stated part takes only edges whose `via` names the row itself, and
 *    what it takes is not counted again by the column's other one-step
 *    parts — so "stated 3 · matched 5" are eight different events, and the
 *    matched ones are the guesses still to accept;
 *  - a hint's chips are muted, and a node any other part reaches is not a
 *    hint.
 *
 * Pure, like the rest of model/*: it reads the graph it is handed and knows
 * nothing about where the graph came from.
 */

/* ── Walking ─────────────────────────────────────────────────────────── */

/** What a walk needs beyond the graph: credits by their `on`, and a narrowing. */
export interface WalkContext {
  graph: Graph;
  /**
   * Every edge that happened on a song (`plays_instrument` with `on`), by
   * the song. The adjacency holds an edge under its two ends only, so this
   * is what lets a song reach the instruments played on it.
   */
  byOn: ReadonlyMap<EntityId, readonly GraphEdge[]>;
  /**
   * Keep only the paths whose first step lands on a node that connects to
   * `node` through `hop` (Key: pick minor, and every count is of the minor
   * songs). Absent: nothing is narrowed.
   */
  narrow?: { hop: Hop; node: EntityId };
  /** Whether a first step's landing passes the narrowing, per node. */
  narrowed?: Map<EntityId, boolean>;
}

const onIndexes = new WeakMap<Graph, ReadonlyMap<EntityId, GraphEdge[]>>();

/** Credits by the song they were on, built once per graph. */
function onIndex(graph: Graph): ReadonlyMap<EntityId, GraphEdge[]> {
  const cached = onIndexes.get(graph);
  if (cached) return cached;
  const index = new Map<EntityId, GraphEdge[]>();
  for (const edge of graph.edges) {
    if (!edge.on) continue;
    const list = index.get(edge.on);
    if (list) list.push(edge);
    else index.set(edge.on, [edge]);
  }
  onIndexes.set(graph, index);
  return index;
}

/** A context to walk `graph` in, optionally narrowed (see `WalkContext`). */
export function walkContext(
  graph: Graph,
  narrow?: WalkContext['narrow'],
): WalkContext {
  return {
    graph,
    byOn: onIndex(graph),
    ...(narrow ? { narrow, narrowed: new Map() } : {}),
  };
}

export const kindOf = (id: EntityId): EntityKind =>
  id.slice(0, id.indexOf(':')) as EntityKind;

export const slugOf = (id: EntityId): string => id.slice(id.indexOf(':') + 1);

/** A node's label, or its slug when the graph does not have it. */
export const labelOf = (graph: Graph, id: EntityId): string =>
  graph.nodes.get(id)?.label ?? slugOf(id);

interface CompiledHop {
  edges: ReadonlySet<EdgeKind>;
  to: ReadonlySet<EntityKind>;
  via: ReadonlySet<string> | null;
  /** The graph `byNode` was read from (`stepsFor`). */
  graph: Graph | null;
  /** Each node's steps along the hop, in the adjacency's order. */
  byNode: Map<EntityId, Steps>;
}

/** One node's steps along a hop: where each lands, and the edge it takes. */
export interface Steps {
  readonly next: readonly EntityId[];
  readonly edges: readonly GraphEdge[];
}

// The registry's hops are constants, so each is compiled to sets once.
const compiled = new WeakMap<Hop, CompiledHop>();

function compile(hop: Hop): CompiledHop {
  let c = compiled.get(hop);
  if (!c) {
    c = {
      edges: new Set(hop.edges),
      to: new Set(hop.to),
      via: hop.via ? new Set(hop.via) : null,
      graph: null,
      byNode: new Map(),
    };
    compiled.set(hop, c);
  }
  return c;
}

/** Whether an edge comes through a field the hop names (all do when it names none). */
const passesVia = (c: CompiledHop, edge: GraphEdge): boolean => {
  if (!c.via) return true;
  for (const v of edge.via) if (c.via.has(v.path)) return true;
  return false;
};

/**
 * One step from `at`: every neighbour `hop` lands on, with the edge that
 * leads there, in the adjacency's order. A neighbour reached along two
 * edges is listed twice; the caller counts.
 *
 * Read once per graph, hop and node, and kept on the compiled hop for the
 * graph last walked. A table walks the same few thousand nodes from every
 * row, and a song or a genre holds edges of a dozen kinds, so reading each
 * adjacency again was most of a build. The graph is never changed in place
 * (a rebuilt graph is a new object, as `onIndex` and `getTableModel`
 * assume), and another graph starts the hop afresh.
 */
export function stepsFor(ctx: WalkContext, at: EntityId, hop: Hop): Steps {
  const c = compile(hop);
  if (c.graph !== ctx.graph) {
    c.graph = ctx.graph;
    c.byNode = new Map();
  }
  let steps = c.byNode.get(at);
  if (!steps) {
    steps = readSteps(ctx, at, hop, c);
    c.byNode.set(at, steps);
  }
  return steps;
}

function readSteps(
  ctx: WalkContext,
  at: EntityId,
  hop: Hop,
  c: CompiledHop,
): Steps {
  const next: EntityId[] = [];
  const edges: GraphEdge[] = [];
  if (hop.through === 'on' && hop.dir === 'out') {
    // From a song to what was played on it: edges filed under their `on`.
    for (const edge of ctx.byOn.get(at) ?? []) {
      if (!c.edges.has(edge.kind) || !c.to.has(kindOf(edge.to))) continue;
      if (!passesVia(c, edge)) continue;
      next.push(edge.to);
      edges.push(edge);
    }
    return { next, edges };
  }
  for (const edge of ctx.graph.adjacency.get(at) ?? []) {
    if (!c.edges.has(edge.kind)) continue;
    let to: EntityId | undefined;
    if (hop.through === 'on') {
      // From an instrument to the songs it was played on.
      to = edge.to === at ? edge.on : undefined;
    } else if (hop.dir === 'out') {
      to = edge.from === at ? edge.to : undefined;
    } else if (hop.dir === 'in') {
      to = edge.to === at ? edge.from : undefined;
    } else {
      to = edge.from === at ? edge.to : edge.from;
    }
    if (!to || to === at || !c.to.has(kindOf(to))) continue;
    if (!passesVia(c, edge)) continue;
    next.push(to);
    edges.push(edge);
  }
  return { next, edges };
}

/**
 * One step from `at`: every neighbour `hop` lands on, with the edge that
 * leads there (`stepsFor`). A neighbour reached along two edges is visited
 * twice; the caller counts.
 */
export function forEachStep(
  ctx: WalkContext,
  at: EntityId,
  hop: Hop,
  visit: (next: EntityId, edge: GraphEdge) => void,
): void {
  const { next, edges } = stepsFor(ctx, at, hop);
  for (let i = 0; i < next.length; i++) visit(next[i], edges[i]);
}

/**
 * Does the row itself state this edge — its own field, not another item's
 * or code's? Only such edges count as a column's stated value. An edge filed
 * under the row but stated by another item (a song pin: the Artist locations
 * item's `city`, filed under the artist it pins) is that item's, not the
 * row's, whatever field it names.
 */
export function statedBy(edge: GraphEdge, row: EntityId, hop: Hop): boolean {
  const c = compile(hop);
  return edge.via.some(
    (v) =>
      v.item === row && !v.code && !v.statedBy && (!c.via || c.via.has(v.path)),
  );
}

/** Whether a first step's landing passes the context's narrowing. */
export function passesNarrow(ctx: WalkContext, landing: EntityId): boolean {
  if (!ctx.narrow || !ctx.narrowed) return true;
  const known = ctx.narrowed.get(landing);
  if (known !== undefined) return known;
  let found = false;
  forEachStep(ctx, landing, ctx.narrow.hop, (next) => {
    if (next === ctx.narrow!.node) found = true;
  });
  ctx.narrowed.set(landing, found);
  return found;
}

/**
 * How one edge is drawn: guessed from text is dotted, unconfirmed is dashed,
 * anything else is linked. A guess that is also unconfirmed is a guess.
 */
export const edgeStyle = (edge: GraphEdge): ChipStyle =>
  edge.inferred ? 'dotted' : edge.unverified ? 'dashed' : 'solid';

const strictlyStronger = (a: ChipStyle, b: ChipStyle) =>
  CHIP_STYLES.indexOf(a) < CHIP_STYLES.indexOf(b);

/* ── Connections ─────────────────────────────────────────────────────── */

/** A count of none for every style (`CHIP_STYLES`), as a cell starts. */
const noStyles = (): Record<ChipStyle, number> => ({
  solid: 0,
  dashed: 0,
  dotted: 0,
  hollow: 0,
  ghost: 0,
});

/** What one part did for one node. */
export interface PartReach {
  /** Its strongest path. */
  style: ChipStyle;
  /** The nodes a two-step part came through: "via 12 songs". */
  mids: Set<EntityId> | null;
  /** The one-step edges that reached it, for the tooltip and the tag. */
  edges: GraphEdge[];
}

/**
 * Everything a column's walk reached, before it is drawn: per node, what
 * each part did for it (by the part's index; undefined where it did not).
 */
export type Reached = Map<EntityId, (PartReach | undefined)[]>;

/** A node a cell reached, for search and for the text no chip came from. */
export interface Neighbour {
  node: EntityId;
  label: string;
  /** Only a hint reached it. */
  muted: boolean;
}

export interface ConnectionsResult {
  cell: Extract<CellValue, { type: 'connections' }>;
  /** Every node reached, the chips past `CHIP_LIMIT` included. */
  neighbours: readonly Neighbour[];
  /** A stated or one-step fact the cell shows is guessed from text. */
  guessed: boolean;
  /** A stated or one-step fact the cell shows is unconfirmed. */
  unconfirmed: boolean;
}

export interface CellOptions {
  /** The row edits this column: `filled` says whether it states anything. */
  stored: boolean;
  /** What the cell says when it shows nothing. */
  empty: string;
}

/**
 * Walk `parts` from the row's nodes (its own, and those it stands on through
 * an expansion: a genre's subgenres, a decade's years) and count them into a
 * connections cell.
 */
export function connectionsOf(
  ctx: WalkContext,
  starts: readonly EntityId[],
  parts: readonly ConnectionPart[],
  options: CellOptions,
): ConnectionsResult {
  const reached = walkParts(ctx, starts, parts);
  const { graph } = ctx;
  // Most cells of a big table reach nothing: answered at once.
  if (reached.size === 0)
    return {
      cell: {
        type: 'connections',
        total: 0,
        parts: [],
        styles: noStyles(),
        chips: [],
        sort: 0,
        filled: !options.stored,
        note: options.empty,
      },
      neighbours: [],
      guessed: false,
      unconfirmed: false,
    };

  const perPart = parts.map(() => 0);
  const styles = noStyles();
  // A chip's tooltip and word are made only for the chips the cell shows.
  const chips: { chip: Chip; part: ConnectionPart; reach: PartReach }[] = [];
  const neighbours: Neighbour[] = [];
  let stated = 0;
  let firm = 0;
  let guessed = false;
  let unconfirmed = false;

  for (const [node, byPart] of reached) {
    // The chip belongs to the part with the strongest path, the column's
    // order breaking a tie — among the parts that are not hints, when any
    // is: the row's value outranks whatever a hint says, however solid.
    let muted = true;
    for (let i = 0; i < byPart.length; i++)
      if (byPart[i] && parts[i].role !== 'hint') {
        muted = false;
        break;
      }
    let best = -1;
    let weight = 0;
    let firmHere = false;
    let statedHere = false;
    for (let i = 0; i < byPart.length; i++) {
      const reach = byPart[i];
      if (!reach) continue;
      const part = parts[i];
      perPart[i] += 1;
      weight += reach.mids ? reach.mids.size : 1;
      if (part.role === 'stated') statedHere = true;
      if (part.role === 'hint' && !muted) continue;
      if (
        part.hops.length === 1 &&
        (reach.style === 'solid' || reach.style === 'dashed')
      ) {
        firmHere = true;
      }
      if (best < 0 || strictlyStronger(reach.style, byPart[best]!.style)) {
        best = i;
      }
    }
    const part = parts[best];
    const reach = byPart[best]!;
    if (statedHere) stated += 1;
    if (firmHere && !muted) firm += 1;
    // Flags come from what the row shows one step out; a guess two steps
    // away (a genre's artists through songs whose artist is guessed) is the
    // other row's to fix.
    if (!muted && part.hops.length === 1) {
      if (reach.style === 'dotted') guessed = true;
      if (reach.style === 'dashed') unconfirmed = true;
    }

    const graphNode = graph.nodes.get(node);
    const style: ChipStyle =
      graphNode?.status === 'missing' ? 'hollow' : reach.style;
    styles[style] += 1;
    const label = graphNode?.label ?? slugOf(node);
    chips.push({
      chip: {
        node,
        label,
        style,
        part: part.id,
        weight,
        ...(muted ? { muted: true as const } : {}),
      },
      part,
      reach,
    });
    neighbours.push({ node, label, muted });
  }

  const shown = firstInOrder(chips, CHIP_LIMIT, (a, b) =>
    chipOrder(a.chip, b.chip),
  );
  const total = reached.size;
  const cell: ConnectionsResult['cell'] = {
    type: 'connections',
    total,
    parts: parts.flatMap((p, i): PartCount[] =>
      perPart[i] ? [{ part: p.id, label: p.label, count: perPart[i] }] : [],
    ),
    styles,
    chips: shown.map(({ chip, part, reach }) => {
      // Set in place, in the order a chip's keys have always come in.
      const tag = tagOf(part, reach);
      if (tag) chip.tag = tag;
      chip.title = titleOf(part, reach);
      return chip;
    }),
    // Stated facts first; everything the cell shows only breaks a tie, so a
    // row of guesses never outranks one stated fact. total/(total+1) stays
    // below 1 and grows with total.
    sort: firm + total / (total + 1),
    filled: !options.stored || stated > 0,
    ...(total === 0 ? { note: options.empty } : {}),
  };
  return { cell, neighbours, guessed, unconfirmed };
}

/**
 * Every node the parts reach, and how each part reached it. Stated parts
 * walk first, so the edges they take are known before the one-step facts
 * walk (see the module note). The row panel lists the same walk in full
 * (panel/fullConnections.ts), so the two can never count differently.
 */
export function walkParts(
  ctx: WalkContext,
  starts: readonly EntityId[],
  parts: readonly ConnectionPart[],
): Reached {
  const reached: Reached = new Map();
  // One start, the common case, needs no set.
  const only = starts.length === 1 ? starts[0] : null;
  const startSet = only === null ? new Set(starts) : null;
  const isStart = (node: EntityId) =>
    only !== null ? node === only : startSet!.has(node);
  let claimed: Set<GraphEdge> | null = null;

  const record = (
    node: EntityId,
    index: number,
    style: ChipStyle,
    edge: GraphEdge | null,
    mid: EntityId | null,
  ) => {
    if (isStart(node)) return;
    let byPart = reached.get(node);
    if (!byPart) {
      byPart = [];
      reached.set(node, byPart);
    }
    let reach = byPart[index];
    if (!reach) {
      reach = { style, mids: mid ? new Set() : null, edges: [] };
      byPart[index] = reach;
    } else if (strictlyStronger(style, reach.style)) {
      reach.style = style;
    }
    if (mid) reach.mids!.add(mid);
    if (edge) reach.edges.push(edge);
  };

  const walk = (part: ConnectionPart, index: number) => {
    const [first, second] = part.hops;
    for (const start of starts) {
      const one = stepsFor(ctx, start, first);
      if (!second) {
        for (let i = 0; i < one.next.length; i++) {
          const next = one.next[i];
          const edge = one.edges[i];
          if (part.role === 'stated') {
            if (!statedBy(edge, start, first)) continue;
            (claimed ??= new Set()).add(edge);
          } else if (part.role === 'fact' && claimed?.has(edge)) {
            continue;
          }
          if (!passesNarrow(ctx, next)) continue;
          record(next, index, edgeStyle(edge), edge, null);
        }
        continue;
      }
      for (let i = 0; i < one.next.length; i++) {
        const mid = one.next[i];
        if (isStart(mid) || !passesNarrow(ctx, mid)) continue;
        const s1 = edgeStyle(one.edges[i]);
        const two = stepsFor(ctx, mid, second);
        for (let j = 0; j < two.next.length; j++)
          record(
            two.next[j],
            index,
            weakerStyle(s1, edgeStyle(two.edges[j])),
            null,
            mid,
          );
      }
    }
  };

  for (let i = 0; i < parts.length; i++)
    if (parts[i].role === 'stated') walk(parts[i], i);
  for (let i = 0; i < parts.length; i++)
    if (parts[i].role !== 'stated') walk(parts[i], i);
  return reached;
}

/**
 * The chip's word: the part's own ('song pins'), or the edge's where the
 * part has one per kind ('wrote') — and none if any edge that reached it has
 * none, so an artist who performed and wrote a song is not tagged 'wrote'.
 */
export function tagOf(
  part: ConnectionPart,
  reach: PartReach,
): string | undefined {
  if (part.tag) return part.tag;
  if (!part.tags || reach.edges.length === 0) return undefined;
  const words = new Set<string>();
  for (const edge of reach.edges) {
    const word = part.tags[edge.kind];
    if (!word) return undefined;
    words.add(word);
  }
  return [...words].join(' · ');
}

/**
 * The tooltip: the fields that state a one-step chip (or the code file that
 * does), or how many nodes a rolled-up chip came through.
 */
export function titleOf(part: ConnectionPart, reach: PartReach): string {
  if (reach.mids) return `${part.label} · ${reach.mids.size}`;
  const sources = new Set<string>();
  for (const edge of reach.edges) {
    for (const via of edge.via) sources.add(via.code ?? via.path);
  }
  return [...sources].join(', ');
}

/**
 * The first `limit` items in `order`, sorted: what sorting them all and
 * keeping the head gives, for any order that never calls two items equal
 * (`chipOrder` ends on the node id). A genre reaches hundreds of songs and
 * shows twelve, so the rest are compared once each against the twelfth.
 */
export function firstInOrder<T>(
  items: T[],
  limit: number,
  order: (a: T, b: T) => number,
): T[] {
  if (items.length <= limit) return items.sort(order);
  const best: T[] = [];
  for (const item of items) {
    if (best.length === limit && order(item, best[limit - 1]) >= 0) continue;
    let low = 0;
    let high = best.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (order(best[mid], item) <= 0) low = mid + 1;
      else high = mid;
    }
    best.splice(low, 0, item);
    if (best.length > limit) best.pop();
  }
  return best;
}

const labelCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

/** The row's own values first, then strongest style, weight, label. */
function chipOrder(a: Chip, b: Chip): number {
  return (
    Number(Boolean(a.muted)) - Number(Boolean(b.muted)) ||
    CHIP_STYLES.indexOf(a.style) - CHIP_STYLES.indexOf(b.style) ||
    b.weight - a.weight ||
    labelCollator.compare(a.label, b.label) ||
    (a.node < b.node ? -1 : a.node > b.node ? 1 : 0)
  );
}

/* ── Years ───────────────────────────────────────────────────────────── */

export interface YearsResult {
  cell: Extract<CellValue, { type: 'years' }>;
}

/**
 * The years of what the parts reach: each part's last step lands on `year`
 * nodes, and what it came through is what is counted — a genre's songs and
 * events, by decade. A thing dated twice in one decade counts once there.
 */
export function yearsOf(
  ctx: WalkContext,
  starts: readonly EntityId[],
  parts: readonly ConnectionPart[],
  options: CellOptions,
): YearsResult {
  // One start, the common case, needs no set.
  const only = starts.length === 1 ? starts[0] : null;
  const startSet = only === null ? new Set(starts) : null;
  const isStart = (node: EntityId) =>
    only !== null ? node === only : startSet!.has(node);
  // What was dated → its years; kept per part for the provenance line.
  const dated = parts.map(() => new Map<EntityId, Set<number>>());

  for (let i = 0; i < parts.length; i++) {
    const [first, second] = parts[i].hops;
    const note = (thing: EntityId, yearNode: EntityId) => {
      const year = Number(yearNode.slice('year:'.length));
      if (!Number.isInteger(year)) return;
      const years = dated[i].get(thing);
      if (years) years.add(year);
      else dated[i].set(thing, new Set([year]));
    };
    for (const start of starts) {
      if (!second) {
        // One step onto a year: the row itself is what is dated.
        forEachStep(ctx, start, first, (next) => note(start, next));
        continue;
      }
      forEachStep(ctx, start, first, (thing) => {
        if (isStart(thing) || !passesNarrow(ctx, thing)) return;
        forEachStep(ctx, thing, second, (year) => note(thing, year));
      });
    }
  }

  const byDecade = new Map<string, Set<EntityId>>();
  let first: number | undefined;
  let last: number | undefined;
  for (const map of dated) {
    for (const [thing, years] of map) {
      for (const year of years) {
        if (first === undefined || year < first) first = year;
        if (last === undefined || year > last) last = year;
        const decade = decadeOf(year);
        if (!decade) continue;
        const things = byDecade.get(decade);
        if (things) things.add(thing);
        else byDecade.set(decade, new Set([thing]));
      }
    }
  }
  const decades = [...byDecade]
    .map(([decade, things]) => ({ decade, count: things.size }))
    .sort((a, b) => parseInt(a.decade, 10) - parseInt(b.decade, 10));

  return {
    cell: {
      type: 'years',
      decades,
      ...(first !== undefined ? { first, last } : {}),
      parts: parts.flatMap((p, i): PartCount[] =>
        dated[i].size
          ? [{ part: p.id, label: p.label, count: dated[i].size }]
          : [],
      ),
      sort: first ?? null,
      filled: !options.stored || first !== undefined,
      ...(first === undefined ? { note: options.empty } : {}),
    },
  };
}

/** "1964–1983", or one year alone. */
export const yearSpan = (first: number, last: number | undefined): string =>
  last === undefined || last === first ? String(first) : `${first}–${last}`;
