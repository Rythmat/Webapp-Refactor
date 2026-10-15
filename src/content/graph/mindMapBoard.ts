import { canonicalId } from './ids';
import { artistSlug } from './slugs';
import { EDGE_LABELS, type EdgeKind, type EntityId } from './types';

/**
 * A Promoter's mind map: the part of the Atlas graph a student explores in the
 * Globe, and the small map they build from it.
 *
 * The classroom's lesson generator works out the BOARD on the teacher's side,
 * from the same graph the console's Cortex draws: the focus (an artist or a
 * city) and the artists, cities, events and songs a couple of confirmed
 * connections away, with every connection among them. The board rides on the
 * slide's interaction to the student's Globe, so a student never downloads the
 * graph. The student adds what they find on the Globe; the lines between what
 * they added are the board's edges, labelled the way Cortex labels them
 * ("born in", "performed by").
 *
 * Ids, names and edge kinds only: everything here is student-safe.
 */

/** What a mind map holds: the things a student can stand on in the Globe. */
export type MindMapKind = 'artist' | 'place' | 'event' | 'song';

export const MIND_MAP_KINDS: readonly MindMapKind[] = [
  'artist',
  'place',
  'event',
  'song',
];

/**
 * Where a node is on the Globe, as the Globe's own URL says it: `?event=`
 * (a song is its `song-<id>` event), `?artist=` (a name), `?place=` (an
 * encoded place, `city:<id>`).
 */
export type MindMapStop =
  | { event: string }
  | { artist: string }
  | { place: string };

export interface MindMapNode {
  id: EntityId;
  kind: MindMapKind;
  label: string;
  stop: MindMapStop;
}

export interface MindMapEdge {
  from: EntityId;
  to: EntityId;
  kind: EdgeKind;
}

export interface MindMapBoard {
  /** The lesson's focus, at the centre of every map. */
  focus: EntityId;
  /** How many connections the challenge asks for. */
  goal: number;
  /** The focus first, then everything a student may add. */
  nodes: MindMapNode[];
  /** Every confirmed connection among the nodes. */
  edges: MindMapEdge[];
}

/** What a student hands in: the nodes they added (the focus is implied). */
export interface MindMapSubmission {
  focus: EntityId;
  nodeIds: EntityId[];
  /** Lines the map draws among the focus and the added nodes. */
  edgeCount: number;
}

/**
 * The graph id for what the Globe is showing, matched against a board.
 * An event id may be a song's (`song-<id>`): it folds onto the song, as the
 * graph folds it.
 */
export type GlobeStopRef =
  | { kind: 'event'; eventId: string }
  | { kind: 'artist'; artist: string }
  | { kind: 'city'; cityId: string };

export const entityIdForGlobeStop = (stop: GlobeStopRef): EntityId => {
  switch (stop.kind) {
    case 'event':
      return canonicalId(`event:${stop.eventId}`);
    case 'artist':
      return `artist:${artistSlug(stop.artist)}`;
    case 'city':
      return `place:${stop.cityId}`;
  }
};

/** The board's node for a Globe stop, matching an artist by name too. */
export const boardNodeForStop = (
  board: MindMapBoard,
  stop: GlobeStopRef,
): MindMapNode | undefined => {
  const id = entityIdForGlobeStop(stop);
  const byId = board.nodes.find((n) => n.id === id);
  if (byId || stop.kind !== 'artist') return byId;
  const name = stop.artist.trim().toLowerCase();
  return board.nodes.find(
    (n) => n.kind === 'artist' && n.label.trim().toLowerCase() === name,
  );
};

/** The edges with both ends on the map (the focus is always on it). */
export const edgesOnMap = (
  board: MindMapBoard,
  added: ReadonlySet<EntityId>,
): MindMapEdge[] => {
  const on = (id: EntityId) => id === board.focus || added.has(id);
  return board.edges.filter((e) => on(e.from) && on(e.to));
};

/**
 * Whether a board node joins the map yet: some edge links it to the focus or
 * to a node already added. A student builds outward from the focus, so a node
 * two steps away waits until the node between is on the map.
 */
export const joinsMap = (
  board: MindMapBoard,
  added: ReadonlySet<EntityId>,
  id: EntityId,
): boolean => {
  if (id === board.focus || added.has(id)) return false;
  const on = (other: EntityId) => other === board.focus || added.has(other);
  return board.edges.some(
    (e) => (e.from === id && on(e.to)) || (e.to === id && on(e.from)),
  );
};

/** Board nodes that would join the map now, in board order. */
export const leadsFor = (
  board: MindMapBoard,
  added: ReadonlySet<EntityId>,
): MindMapNode[] => board.nodes.filter((n) => joinsMap(board, added, n.id));

/**
 * An edge's wording read from one of its ends, as Cortex words it:
 * standing on the song, `performed_by` reads "performed by"; standing on the
 * artist, "performed".
 */
export const edgeLabelFrom = (edge: MindMapEdge, from: EntityId): string =>
  edge.from === from
    ? EDGE_LABELS[edge.kind].forward
    : EDGE_LABELS[edge.kind].inverse;

/** A submission for the nodes a student added, in the order they added them. */
export const submissionFor = (
  board: MindMapBoard,
  addedInOrder: readonly EntityId[],
): MindMapSubmission => ({
  focus: board.focus,
  nodeIds: [...addedInOrder],
  edgeCount: edgesOnMap(board, new Set(addedInOrder)).length,
});
