import type { Graph } from '@/content/graph/deriveGraph';
import type { MindMapKind, MindMapStop } from '@/content/graph/mindMapBoard';
import type {
  EdgeKind,
  EntityId,
  EntityKind,
  GraphEdge,
  GraphNode,
} from '@/content/graph/types';
import type { LessonCatalog } from './catalog';

/** The parts of the graph the lesson generator reads. */
export type LessonGraph = Pick<Graph, 'nodes' | 'adjacency' | 'solidDegree'>;

export const kindOf = (id: EntityId): EntityKind =>
  id.slice(0, id.indexOf(':')) as EntityKind;

export const slugOf = (id: EntityId): string => id.slice(id.indexOf(':') + 1);

/** Neither guessed from free text nor waiting to be confirmed. */
export const isSolid = (edge: GraphEdge): boolean =>
  !edge.inferred && !edge.unverified;

export const otherEnd = (edge: GraphEdge, id: EntityId): EntityId =>
  edge.from === id ? edge.to : edge.from;

const GLOBE_KINDS: ReadonlySet<EntityKind> = new Set<MindMapKind>([
  'artist',
  'place',
  'event',
  'song',
]);

/**
 * Whether a node is something a student can stand on in the Globe, and the
 * graph vouches for: an artist, a pinned city, a globe event or a song, never
 * a `missing` node, an unconfirmed record or a region.
 */
export const isGlobeNode = (
  graph: LessonGraph,
  catalog: LessonCatalog,
  id: EntityId,
): boolean => {
  const node = graph.nodes.get(id);
  if (!node || node.status === 'missing' || node.unverified) return false;
  if (!GLOBE_KINDS.has(node.kind)) return false;
  const slug = slugOf(id);
  switch (node.kind) {
    case 'place': {
      // A region (`place:region-north-america`) is a node, not a pin.
      if (slug.startsWith('region-')) return false;
      const place = catalog.places.get(slug);
      return Boolean(place && place.pin !== false && place.coordinates);
    }
    case 'event':
      return catalog.events.has(slug);
    case 'song':
      return catalog.songs.has(slug);
    default:
      return true;
  }
};

/**
 * The Globe nodes one confirmed edge away, each with the edges that join it,
 * optionally only along some edge kinds.
 */
export const globeNeighbours = (
  graph: LessonGraph,
  catalog: LessonCatalog,
  id: EntityId,
  kinds?: ReadonlySet<EdgeKind>,
): Map<EntityId, GraphEdge[]> => {
  const found = new Map<EntityId, GraphEdge[]>();
  for (const edge of graph.adjacency.get(id) ?? []) {
    if (!isSolid(edge) || edge.from === edge.to) continue;
    if (kinds && !kinds.has(edge.kind)) continue;
    const other = otherEnd(edge, id);
    if (!isGlobeNode(graph, catalog, other)) continue;
    found.set(other, [...(found.get(other) ?? []), edge]);
  }
  return found;
};

/**
 * The nodes joined to `id` by an edge of `kind`, in one direction, leaving
 * out missing and unconfirmed nodes:
 * `'out'` follows `from → to` (a song's performers), `'in'` the reverse (an
 * artist's songs). Confirmed edges only unless `guesses` is set; ordered by
 * how well connected each is, then by label, so a pick is stable.
 */
export const linked = (
  graph: LessonGraph,
  id: EntityId,
  kind: EdgeKind,
  direction: 'out' | 'in',
  options: { guesses?: boolean } = {},
): GraphNode[] => {
  const nodes: GraphNode[] = [];
  const seen = new Set<EntityId>();
  for (const edge of graph.adjacency.get(id) ?? []) {
    if (edge.kind !== kind) continue;
    if (!options.guesses && !isSolid(edge)) continue;
    const other =
      direction === 'out'
        ? edge.from === id
          ? edge.to
          : null
        : edge.to === id
          ? edge.from
          : null;
    if (!other || seen.has(other)) continue;
    const node = graph.nodes.get(other);
    // Never a node nothing defines, or a record not yet confirmed.
    if (!node || node.status === 'missing' || node.unverified) continue;
    seen.add(other);
    nodes.push(node);
  }
  return nodes.sort(byConnectedness(graph));
};

/** Better connected first, then by label: a stable order for picks. */
export const byConnectedness =
  (graph: LessonGraph) =>
  (a: GraphNode, b: GraphNode): number =>
    graph.solidDegree(b.id) - graph.solidDegree(a.id) ||
    a.label.localeCompare(b.label);

/** Where a Globe node is, as the Globe's URL addresses it. */
export const globeStopFor = (node: GraphNode): MindMapStop => {
  const slug = slugOf(node.id);
  switch (node.kind) {
    case 'place':
      return { place: `city:${slug}` };
    case 'event':
      return { event: slug };
    case 'song':
      return { event: `song-${slug}` };
    default:
      return { artist: node.label };
  }
};

/** A deterministic PRNG (mulberry32), so a shuffle can be replayed. */
export const seededRandom = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** "Ana", "Ana and Ben", "Ana, Ben and Cy". */
export const listOf = (items: readonly string[], and: string): string =>
  items.length <= 1
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} ${and} ${items[items.length - 1]}`;
