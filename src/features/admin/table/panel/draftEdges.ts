import { CITIES } from '@/components/atlas/data/cities';
import type { PrintedNames } from '@/content/graph/deriveEdges';
import {
  type ArtistLocationInput,
  assembleGraph,
  deriveSnapshotEdges,
  type Graph,
  type GraphSnapshot,
  type UnreadableItem,
} from '@/content/graph/deriveGraph';
import type { EventMatch } from '@/content/graph/eventMatches';
import type {
  Edge,
  EdgeVia,
  EntityId,
  GraphEdge,
  GraphNode,
} from '@/content/graph/types';
import type { StudioRecord } from '@/content/records/types';
import type { ContentKind } from '@/hooks/data/admin/useAdminContent';
import {
  WORKING_KINDS,
  type WorkingContentKind,
} from '../../content/graph/workingSnapshot';
import { edgeStyle } from '../model/aggregate';
import { type ChipStyle, strongerStyle } from '../model/types';
import { type EdgeGroup, edgeGroupsOf } from './fullConnections';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  The draft's own connections, before it is saved
 * ══════════════════════════════════════════════════════════════════════════
 *
 * The row panel's All connections lists the graph's edges of the row, which
 * are the item as saved. While Details holds unsaved changes, this lays the
 * draft over them (design §3.3, "live draft edges"): the item's own deriver
 * — the graph's, `deriveSnapshotEdges` over a one-item snapshot — runs on
 * the draft and on the version the draft is laid on, and what differs is
 * what the save would do. Every edge other items state (a song's credit of
 * this artist, an event about it) stays as the graph has it.
 *
 * Each changed edge is marked:
 *  - `added`: the save makes a connection the graph does not have;
 *  - `removed`: it takes away one nothing else states;
 *  - `restyled`: the connection stays, and its line changes — a guess the
 *    save states (an event's matched artist stored in `artistIds`), a
 *    statement it marks unconfirmed.
 * A statement the save adds to, or takes from, a connection other items
 * state as well changes only who states it, and is not marked.
 *
 * Three derivers read more than the item, and are handed what the graph
 * already says of the rest — so the draft is read against the same Atlas:
 *  - an event's guesses from its title and tags are the graph's matches
 *    (its guessed `about` edges); a draft that stores its artists or songs
 *    drops them, as a save would;
 *  - a song's city through its studio (`edgesForStudioPlace`) reads the
 *    studio's own `placeId` from the graph;
 *  - an act's song pins (`edgesForArtistLocation`) are the graph's, placed
 *    again from the registry city they name; a draft that sets a City drops
 *    them, as a save would.
 * What those read of other items is taken as it stands: a draft that
 * retitles an event keeps the matches the graph has until it is saved.
 *
 * Pure: it reads the graph and the two bodies it is handed.
 */

type Body = Readonly<Record<string, unknown>>;

/** What a save would do to one of the row's edges. */
export type DraftMark = 'added' | 'removed' | 'restyled';

export interface DraftEdges {
  /** The row's edges with the draft laid over them, as `edgeGroupsOf` groups them. */
  groups: EdgeGroup[];
  /** The edges the save changes, by the edge object in `groups`. */
  marks: ReadonlyMap<GraphEdge, DraftMark>;
  /** What a restyled edge's line is now, saved. */
  was: ReadonlyMap<GraphEdge, ChipStyle>;
  added: number;
  removed: number;
  restyled: number;
}

/** A content kind whose items are nodes the working graph derives edges for. */
export const draftsEdges = (
  kind: ContentKind,
): kind is Exclude<WorkingContentKind, 'artist_location'> =>
  kind in WORKING_KINDS &&
  WORKING_KINDS[kind as WorkingContentKind].node !== null;

/** An edge's identity in the graph: `assembleGraph` merges on the same key. */
const keyOf = (edge: Pick<Edge, 'from' | 'kind' | 'to' | 'on'>) =>
  `${edge.from}|${edge.kind}|${edge.to}|${edge.on ?? ''}`;

/** One statement of an edge, as `assembleGraph` tells two apart. */
const sameVia = (a: EdgeVia, b: EdgeVia) =>
  a.item === b.item && a.path === b.path && a.statedBy?.id === b.statedBy?.id;

/** What the rest of the Atlas tells the item's deriver. */
type Context = Pick<
  GraphSnapshot,
  'studios' | 'artistLocations' | 'eventMatches' | 'asOfYear'
>;

const outOf = (graph: Graph, node: EntityId) =>
  (graph.adjacency.get(node) ?? []).filter((edge) => edge.from === node);

/** The event's guesses as the graph read them: its guessed `about` edges. */
function matchOf(graph: Graph, node: EntityId): EventMatch {
  const match: EventMatch = { artists: [], songs: [] };
  for (const edge of outOf(graph, node)) {
    if (edge.kind !== 'about' || !edge.inferred) continue;
    const slug = edge.to.slice(edge.to.indexOf(':') + 1);
    for (const via of edge.via) {
      if (via.item !== node) continue;
      if (via.path !== 'title' && via.path !== 'tags[]') continue;
      if (edge.to.startsWith('artist:'))
        match.artists.push({ artistId: slug, path: via.path });
      else if (edge.to.startsWith('song:'))
        match.songs.push({ songId: slug, path: via.path });
    }
  }
  return match;
}

let registry: ReadonlyMap<string, (typeof CITIES)[number]> | null = null;

/**
 * The act's song pins as the graph has them, each placed again from the
 * registry city it resolved to: the city's own name and country pick out
 * that city whenever the pin's words did (`resolvePlaceName`).
 */
function pinsOf(graph: Graph, node: EntityId): ArtistLocationInput[] {
  registry ??= new Map(CITIES.map((city) => [city.id, city]));
  const pins: ArtistLocationInput[] = [];
  for (const edge of outOf(graph, node)) {
    if (edge.kind !== 'based_in') continue;
    const city = registry.get(edge.to.slice(edge.to.indexOf(':') + 1));
    if (!city) continue;
    for (const via of edge.via) {
      if (via.statedBy?.kind !== 'artist_location') continue;
      pins.push({
        id: via.statedBy.id,
        city: city.name,
        country: city.country,
      });
    }
  }
  return pins;
}

/** The studios a song's edges name, with the city each is in, from the graph. */
function studiosOf(graph: Graph, edges: readonly Edge[]): StudioRecord[] {
  const studios = new Map<EntityId, StudioRecord>();
  for (const at of edges) {
    if (at.kind !== 'recorded_at' || studios.has(at.to)) continue;
    const node: GraphNode | undefined = graph.nodes.get(at.to);
    const based = outOf(graph, at.to).find(
      (edge) =>
        edge.kind === 'based_in' &&
        edge.via.some((via) => via.item === at.to && via.path === 'placeId'),
    );
    if (!based) continue;
    studios.set(at.to, {
      slug: at.to.slice(at.to.indexOf(':') + 1),
      placeId: based.to.slice(based.to.indexOf(':') + 1),
      ...(node?.unverified ? { unverified: true } : {}),
      ...(based.source ? { source: based.source } : {}),
    } as StudioRecord);
  }
  return [...studios.values()];
}

/**
 * The item's own edges, from one body: the graph's deriver over a snapshot
 * of just that item and what `context` says of the rest. Null when the body
 * cannot be read (the graph lists such an item as unreadable).
 */
function edgesOfBody(
  kind: Exclude<WorkingContentKind, 'artist_location'>,
  slug: string,
  body: Body,
  context: Context,
  names?: PrintedNames,
): Edge[] | null {
  const { list, field } = WORKING_KINDS[kind];
  // The row's identity, whatever the draft says: these are its edges.
  const item = { ...body, [field]: slug };
  const unreadable: UnreadableItem[] = [];
  const edges = deriveSnapshotEdges(
    { ...context, [list]: [item] } as GraphSnapshot,
    unreadable,
    names,
  );
  return unreadable.some((u) => u.list === list) ? null : edges;
}

/**
 * The item's edges touching its node, merged as the graph merges them; a
 * person they reach by name only is labelled as `names` prints them.
 */
function touching(
  edges: readonly Edge[],
  node: EntityId,
  names?: ReadonlyMap<EntityId, string>,
) {
  const graph = assembleGraph([], edges, [], names);
  return {
    nodes: graph.nodes,
    edges: new Map(
      (graph.adjacency.get(node) ?? []).map((edge) => [keyOf(edge), edge]),
    ),
  };
}

/** `a` is a surer line than `b`. */
const stronger = (a: ChipStyle, b: ChipStyle) =>
  a !== b && strongerStyle(a, b) === a;

/** An edge's sources, one each (the graph joins them with '; '). */
const sourcesOf = (edge: Pick<Edge, 'source'> | undefined): string[] =>
  edge?.source ? edge.source.split('; ') : [];

/** An edge with these sources, and no others. */
function withSources(edge: GraphEdge, sources: readonly string[]): GraphEdge {
  const next: GraphEdge = { ...edge };
  const joined = [...new Set(sources)].join('; ');
  if (joined) next.source = joined;
  else delete next.source;
  return next;
}

/** An edge drawn with `style`: its flags set to say so. */
function styled(edge: GraphEdge, style: ChipStyle): GraphEdge {
  const next: GraphEdge = { ...edge };
  delete next.inferred;
  delete next.unverified;
  if (style === 'dotted') next.inferred = true;
  else if (style === 'dashed') next.unverified = true;
  return next;
}

/**
 * The row's edges with `draft` laid over them, against `base`, the version
 * the draft is laid on. Null when there is nothing to lay over — the kind is
 * not one the graph derives, or either body cannot be read.
 */
export function draftEdgesOf({
  graph,
  kind,
  node,
  slug,
  base,
  draft,
  asOfYear = new Date().getFullYear(),
}: {
  graph: Graph;
  kind: ContentKind;
  /** The row's node. */
  node: EntityId;
  /** The item's identity value: the row's key. */
  slug: string;
  base: Body;
  draft: Body;
  /** An open span of years active runs to here, as in the graph's snapshot. */
  asOfYear?: number;
}): DraftEdges | null {
  if (!draftsEdges(kind)) return null;
  let context: Context = {
    asOfYear,
    ...(kind === 'globe_event'
      ? { eventMatches: new Map([[slug, matchOf(graph, node)]]) }
      : {}),
    ...(kind === 'artist' ? { artistLocations: pinsOf(graph, node) } : {}),
  };
  // The names the draft prints for people it names, for their labels.
  const names: PrintedNames = new Map();
  let before = edgesOfBody(kind, slug, base, context);
  let after = edgesOfBody(kind, slug, draft, context, names);
  if (!before || !after) return null;
  if (kind === 'song') {
    // Read again with the studios either version names, for their cities.
    const studios = studiosOf(graph, [...before, ...after]);
    if (studios.length) {
      context = { ...context, studios };
      before = edgesOfBody(kind, slug, base, context);
      after = edgesOfBody(kind, slug, draft, context, names);
      if (!before || !after) return null;
    }
  }

  const saved = touching(before, node).edges;
  const drafted = touching(after, node, names);
  const marks = new Map<GraphEdge, DraftMark>();
  const was = new Map<GraphEdge, ChipStyle>();
  const edges: GraphEdge[] = [];
  const seen = new Set<string>();

  for (const edge of graph.adjacency.get(node) ?? []) {
    const key = keyOf(edge);
    seen.add(key);
    const then = saved.get(key);
    const now = drafted.edges.get(key);
    if (!then && !now) {
      edges.push(edge);
      continue;
    }
    // Who else states it: every statement but the item's own, as saved.
    const others = edge.via.filter(
      (via) => !then?.via.some((own) => sameVia(via, own)),
    );
    const theirSources = sourcesOf(edge).filter(
      (source) => !sourcesOf(then).includes(source),
    );
    if (!now) {
      if (others.length) {
        edges.push(withSources({ ...edge, via: others }, theirSources));
      } else {
        edges.push(edge);
        marks.set(edge, 'removed');
      }
      continue;
    }
    // The others' line: the edge's own where the item did not state it, or
    // where it is stronger than the item's statement was; otherwise it is no
    // stronger than that, unknown, and the draft's decides.
    const style = edgeStyle(edge);
    const theirs =
      others.length && (!then || stronger(style, edgeStyle(then)))
        ? style
        : null;
    const next = withSources(
      styled(
        {
          ...edge,
          via: [
            ...others,
            ...now.via.filter((via) => !others.some((o) => sameVia(via, o))),
          ],
        },
        theirs ? strongerStyle(theirs, edgeStyle(now)) : edgeStyle(now),
      ),
      [...theirSources, ...sourcesOf(now)],
    );
    edges.push(next);
    if (edgeStyle(next) !== style) {
      marks.set(next, 'restyled');
      was.set(next, style);
    }
  }
  for (const [key, edge] of drafted.edges) {
    // Stated as saved too, yet not drawn: the graph is behind, and the draft
    // changes nothing about it.
    if (seen.has(key) || saved.has(key)) continue;
    edges.push(edge);
    marks.set(edge, 'added');
  }

  const groups = edgeGroupsOf(graph, node, {
    edges,
    nodes: drafted.nodes,
  });
  let added = 0;
  let removed = 0;
  let restyled = 0;
  for (const mark of marks.values()) {
    if (mark === 'added') added += 1;
    else if (mark === 'removed') removed += 1;
    else restyled += 1;
  }
  return { groups, marks, was, added, removed, restyled };
}
