import type {
  EdgeKind,
  EntityId,
  EntityKind,
  GraphEdge,
  GraphNode,
  NodeStatus,
} from '@/content/graph/types';
import { nodeRole } from './nodeRoles';
import { normalizeText, textKey } from './text';

/**
 * What the graph's queries can ask about each node, worked out once per
 * graph.
 *
 * A colour group such as `genre:rock` is tested against every node each time
 * the groups change, and the search box against every node on each key
 * press. Walking the graph's edges for each of those tests would be slow at
 * the Atlas's size (about 8,000 nodes and 34,000 edges), so this module walks
 * them once and keeps the answers per node: its kind, its name as compared,
 * the genres, places, years, decades and eras it belongs to, and whether it
 * is a tag or curriculum. The answers are cached against the graph object,
 * so a graph that is replaced after a save is walked again and the old
 * answers are dropped with it.
 *
 * Whether a node is an orphan is not here: that depends on which nodes the
 * map's filters leave visible, so the caller supplies it when testing.
 *
 * The module is pure: no React, no DOM, no content store.
 */

/** The parts of the built graph this module reads. `Graph` has them. */
export interface FacetGraph {
  readonly nodes: ReadonlyMap<EntityId, GraphNode>;
  /** Every edge touching a node, in either direction. */
  readonly adjacency: ReadonlyMap<EntityId, readonly GraphEdge[]>;
}

/** One node's precomputed answers. Keys are made with `textKey`. */
export interface NodeFacets {
  readonly id: EntityId;
  /** The id in lower case, for id matches. */
  readonly idKey: string;
  /** The part of the id after the kind, in lower case. */
  readonly slugKey: string;
  readonly kind: EntityKind;
  /** The node's label as compared (`normalizeText`). */
  readonly name: string;
  readonly status: NodeStatus;
  /**
   * The genres and subgenres the node is filed under, and the genres those
   * subgenres sit under, each by its slug key and its name key. A genre or
   * subgenre node holds its own keys too, and a city holds the genres of its
   * scene.
   */
  readonly genres: ReadonlySet<string>;
  /**
   * The places the node is based in, born in, recorded in or took place in,
   * and the regions those places are in, each by slug key and name key. A
   * place node holds its own keys and its region's.
   */
  readonly places: ReadonlySet<string>;
  /**
   * The years the node is from, was born in or was formed in, ascending and
   * without repeats. A year node holds its own year.
   */
  readonly years: readonly number[];
  /** The earliest of `years`, or null when the node has none. */
  readonly firstYear: number | null;
  /**
   * The decades of its years, plus the decades an artist was active in, by
   * first year (1980 for the 1980s). A decade node holds its own decade.
   */
  readonly decades: ReadonlySet<number>;
  /** The eras its years fall in, by slug key and name key. */
  readonly eras: ReadonlySet<string>;
  /** A tag node: a genre, a year, a key, a region and the like (`nodeRole`). */
  readonly tag: boolean;
  /** Curriculum: a Teach day or a globe pathway (`nodeRole`). */
  readonly curriculum: boolean;
}

/** Every node's facets for one graph. */
export interface GraphFacets {
  readonly byId: ReadonlyMap<EntityId, NodeFacets>;
  /** One node's facets, or undefined for an id the graph does not have. */
  get(id: string): NodeFacets | undefined;
}

/** The edges whose far end is a genre the node is filed under. */
const GENRE_EDGES: ReadonlySet<EdgeKind> = new Set<EdgeKind>([
  'in_genre',
  'scene_of',
]);

/** The edges whose far end is a place the node belongs to. */
const PLACE_EDGES: ReadonlySet<EdgeKind> = new Set<EdgeKind>([
  'based_in',
  'born_in',
  'recorded_in',
  'took_place_in',
]);

/** The edges whose far end is a year that dates the node. */
const YEAR_EDGES: ReadonlySet<EdgeKind> = new Set<EdgeKind>([
  'from_year',
  'born_year',
  'formed_year',
]);

const EMPTY_KEYS: ReadonlySet<string> = new Set<string>();
const EMPTY_DECADES: ReadonlySet<number> = new Set<number>();

const slugOf = (id: string): string => id.slice(id.indexOf(':') + 1);

/** `1982` for `year:1982`; null for a slug that is not a whole number. */
const yearNumber = (id: string): number | null => {
  const slug = slugOf(id);
  return /^\d{1,4}$/.test(slug) ? Number(slug) : null;
};

/** `1980` for `decade:1980s`. */
const decadeNumber = (id: string): number | null => {
  const match = /^(\d{1,4})s$/.exec(slugOf(id));
  return match ? Number(match[1]) : null;
};

/** The first year of the decade a year is in. */
export const decadeOfYear = (year: number): number => year - (year % 10);

function buildFacets(graph: FacetGraph): GraphFacets {
  const { nodes, adjacency } = graph;

  /** A node's slug key and name key, without blanks or repeats. */
  const keysOf = (id: EntityId): string[] => {
    const keys = new Set<string>();
    const slug = textKey(slugOf(id));
    if (slug) keys.add(slug);
    const label = nodes.get(id)?.label;
    const name = label ? textKey(label) : '';
    if (name) keys.add(name);
    return [...keys];
  };

  const outgoing = (id: EntityId): GraphEdge[] =>
    (adjacency.get(id) ?? []).filter((e) => e.from === id);

  /**
   * A node's own keys and those of everything it reaches through `via`,
   * memoised. The node's own keys are stored before the walk, so a loop in
   * the data ends rather than recursing for ever.
   */
  const rollUp = (via: EdgeKind) => {
    const memo = new Map<EntityId, readonly string[]>();
    const walk = (id: EntityId): readonly string[] => {
      const known = memo.get(id);
      if (known) return known;
      const keys = keysOf(id);
      memo.set(id, keys);
      for (const edge of outgoing(id)) {
        if (edge.kind === via) keys.push(...walk(edge.to));
      }
      const unique = [...new Set(keys)];
      memo.set(id, unique);
      return unique;
    };
    return walk;
  };

  /** A genre or subgenre and the genres above it. */
  const genreKeys = rollUp('in_genre');
  /** A place and the regions it sits in. */
  const placeKeys = rollUp('located_in');

  /** A year node's era keys, through its `from_era` edges. */
  const eraMemo = new Map<EntityId, readonly string[]>();
  const yearEraKeys = (yearId: EntityId): readonly string[] => {
    const known = eraMemo.get(yearId);
    if (known) return known;
    const keys = outgoing(yearId)
      .filter((e) => e.kind === 'from_era')
      .flatMap((e) => keysOf(e.to));
    eraMemo.set(yearId, keys);
    return keys;
  };

  const byId = new Map<EntityId, NodeFacets>();
  for (const [id, node] of nodes) {
    const kind = node.kind;
    const { role } = nodeRole({ id, kind });
    const genres = new Set<string>();
    const places = new Set<string>();
    const years = new Set<number>();
    const decades = new Set<number>();
    const eras = new Set<string>();
    const addYear = (yearId: EntityId) => {
      const year = yearNumber(yearId);
      if (year === null) return;
      years.add(year);
      decades.add(decadeOfYear(year));
      for (const key of yearEraKeys(yearId)) eras.add(key);
    };

    // The node itself, where it is one of the things asked about.
    if (kind === 'genre' || kind === 'subgenre') {
      for (const key of genreKeys(id)) genres.add(key);
    } else if (kind === 'place') {
      for (const key of placeKeys(id)) places.add(key);
    } else if (kind === 'year') {
      addYear(id);
    } else if (kind === 'decade') {
      const decade = decadeNumber(id);
      if (decade !== null) decades.add(decade);
    } else if (kind === 'era') {
      for (const key of keysOf(id)) eras.add(key);
    }

    for (const edge of outgoing(id)) {
      if (GENRE_EDGES.has(edge.kind)) {
        for (const key of genreKeys(edge.to)) genres.add(key);
      } else if (PLACE_EDGES.has(edge.kind)) {
        for (const key of placeKeys(edge.to)) places.add(key);
      } else if (YEAR_EDGES.has(edge.kind)) {
        addYear(edge.to);
      } else if (edge.kind === 'active_in') {
        const decade = decadeNumber(edge.to);
        if (decade !== null) decades.add(decade);
      }
    }

    const sortedYears = [...years].sort((a, b) => a - b);
    byId.set(id, {
      id,
      idKey: id.toLowerCase(),
      slugKey: slugOf(id).toLowerCase(),
      kind,
      name: normalizeText(node.label),
      status: node.status,
      genres: genres.size ? genres : EMPTY_KEYS,
      places: places.size ? places : EMPTY_KEYS,
      years: sortedYears,
      firstYear: sortedYears.length ? sortedYears[0] : null,
      decades: decades.size ? decades : EMPTY_DECADES,
      eras: eras.size ? eras : EMPTY_KEYS,
      tag: role === 'tag',
      curriculum: role === 'curriculum',
    });
  }

  return {
    byId,
    get: (id) => byId.get(id as EntityId),
  };
}

const cache = new WeakMap<FacetGraph, GraphFacets>();

/**
 * Every node's facets for a graph, worked out on first use and cached
 * against the graph object.
 */
export function graphFacets(graph: FacetGraph): GraphFacets {
  let facets = cache.get(graph);
  if (!facets) {
    facets = buildFacets(graph);
    cache.set(graph, facets);
  }
  return facets;
}
