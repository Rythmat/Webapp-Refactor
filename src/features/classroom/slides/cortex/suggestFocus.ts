import { canonicalId } from '@/content/graph/ids';
import type { EntityId, GraphNode } from '@/content/graph/types';
import { getYouTubeVideoId } from '../songDeepLinks';
import type { LessonCatalog } from './catalog';
import {
  globeNeighbours,
  isGlobeNode,
  kindOf,
  linked,
  seededRandom,
  slugOf,
  type LessonGraph,
} from './graphQueries';
import type { FocusKind, FocusReason, LessonFocus } from './types';

/**
 * Which artist or city a lesson's Showcase is about.
 *
 * The generator suggests and the teacher decides (accept, shuffle, search).
 * A suggestion comes from the Day first: a Day planned from the Teach year
 * carries its song and its globe events (the teach_day's `uses_song` and
 * `references_event`), and the artists who performed them or the places they
 * happened are the natural focus. Otherwise it is the best-connected artist
 * or city the class has not had recently.
 */

/** Confirmed Globe connections a focus needs: enough for every part. */
export const MIN_CONNECTIONS = 4;
/** A planned focus is the teacher's own choice; it only has to exist. */
const MIN_PLANNED_CONNECTIONS = 2;
/** How many of the best candidates Shuffle walks through. */
export const SHUFFLE_POOL = 24;
/**
 * Connections count up to here and no further. Past it a city is a hub
 * (New York has 150), and the hubs would otherwise fill every suggestion.
 */
const CONNECTION_CAP = 20;

export interface FocusContext {
  /** Song ids planned into the Day (`presentation.song`). */
  plannedSongIds: readonly string[];
  /** Globe event ids planned into the Day (its globe launch tiles). */
  plannedEventIds: readonly string[];
  /** Focus ids of this classroom's recent lessons, newest first. */
  recentFocusIds: readonly string[];
}

export const EMPTY_FOCUS_CONTEXT: FocusContext = {
  plannedSongIds: [],
  plannedEventIds: [],
  recentFocusIds: [],
};

const focusKindOf = (node: GraphNode): FocusKind | null =>
  node.kind === 'artist' ? 'artist' : node.kind === 'place' ? 'place' : null;

/** Whether a node can be a focus at all: an artist or a pinned city. */
const canFocus = (
  graph: LessonGraph,
  catalog: LessonCatalog,
  node: GraphNode | undefined,
): node is GraphNode =>
  Boolean(node) &&
  focusKindOf(node as GraphNode) !== null &&
  isGlobeNode(graph, catalog, (node as GraphNode).id);

const focusOf = (
  graph: LessonGraph,
  catalog: LessonCatalog,
  node: GraphNode,
  reason: FocusReason,
): LessonFocus => ({
  id: node.id,
  kind: focusKindOf(node) as FocusKind,
  label: node.label,
  reason,
  connections: globeNeighbours(graph, catalog, node.id).size,
});

/** Media the Showcase can show: a portrait, a video, a mini-globe. */
const mediaScore = (
  graph: LessonGraph,
  catalog: LessonCatalog,
  node: GraphNode,
  neighbours: ReadonlyMap<EntityId, unknown>,
): number => {
  let score = 0;
  if (node.kind === 'artist') {
    const performed = linked(graph, node.id, 'performed_by', 'in', {
      guesses: true,
    });
    if (performed.some((s) => catalog.songs.get(slugOf(s.id))?.artistImageRef))
      score += 3;
  } else {
    score += 3; // a city always has its mini-globe
  }
  for (const id of neighbours.keys()) {
    const slug = slugOf(id);
    if (kindOf(id) === 'event' && catalog.events.get(slug)?.videoId) {
      score += 2;
      break;
    }
    const song = kindOf(id) === 'song' ? catalog.songs.get(slug) : undefined;
    if (song && getYouTubeVideoId(song)) {
      score += 2;
      break;
    }
  }
  return score;
};

interface Ranked {
  focus: LessonFocus;
  score: number;
}

/** Per catalog, the graph it was ranked against and the ranking. */
const RANKED = new WeakMap<
  LessonCatalog,
  { nodes: LessonGraph['nodes']; ranked: Ranked[] }
>();

/**
 * Every artist and city with enough confirmed connections, best first:
 * connections (capped), then media, then label. Worked out once per graph.
 */
export const rankFocusCandidates = (
  graph: LessonGraph,
  catalog: LessonCatalog,
): readonly Ranked[] => {
  const cached = RANKED.get(catalog);
  if (cached?.nodes === graph.nodes) return cached.ranked;
  const ranked: Ranked[] = [];
  for (const node of graph.nodes.values()) {
    if (!canFocus(graph, catalog, node)) continue;
    const neighbours = globeNeighbours(graph, catalog, node.id);
    if (neighbours.size < MIN_CONNECTIONS) continue;
    ranked.push({
      focus: focusOf(graph, catalog, node, { kind: 'wellConnected' }),
      score:
        Math.min(neighbours.size, CONNECTION_CAP) +
        mediaScore(graph, catalog, node, neighbours),
    });
  }
  ranked.sort(
    (a, b) =>
      b.score - a.score ||
      b.focus.connections - a.focus.connections ||
      a.focus.label.localeCompare(b.focus.label),
  );
  RANKED.set(catalog, { nodes: graph.nodes, ranked });
  return ranked;
};

/**
 * Candidates from what the Day plans: each planned song's performers and the
 * place it was recorded; each planned event's subjects and the place it
 * happened (a song's globe event is its song).
 */
export const plannedFocusCandidates = (
  graph: LessonGraph,
  catalog: LessonCatalog,
  context: Pick<FocusContext, 'plannedSongIds' | 'plannedEventIds'>,
): LessonFocus[] => {
  const found = new Map<EntityId, LessonFocus>();
  const offer = (node: GraphNode, reason: FocusReason) => {
    if (found.has(node.id) || !canFocus(graph, catalog, node)) return;
    if (globeNeighbours(graph, catalog, node.id).size < MIN_PLANNED_CONNECTIONS)
      return;
    found.set(node.id, focusOf(graph, catalog, node, reason));
  };
  const fromSong = (songId: EntityId, reason: FocusReason) => {
    for (const artist of linked(graph, songId, 'performed_by', 'out', {
      guesses: true,
    }))
      offer(artist, reason);
    for (const place of linked(graph, songId, 'recorded_in', 'out'))
      offer(place, reason);
  };
  for (const songId of context.plannedSongIds) {
    const id: EntityId = `song:${songId}`;
    const song = graph.nodes.get(id);
    if (song) fromSong(id, { kind: 'plannedSong', songId, title: song.label });
  }
  for (const eventId of context.plannedEventIds) {
    const id = canonicalId(`event:${eventId}`);
    const node = graph.nodes.get(id);
    if (!node) continue;
    if (node.kind === 'song') {
      fromSong(id, {
        kind: 'plannedSong',
        songId: slugOf(id),
        title: node.label,
      });
      continue;
    }
    const reason: FocusReason = {
      kind: 'plannedEvent',
      eventId,
      title: node.label,
    };
    for (const artist of linked(graph, id, 'about', 'out'))
      offer(artist, reason);
    for (const place of linked(graph, id, 'took_place_in', 'out'))
      offer(place, reason);
  }
  return [...found.values()];
};

/**
 * The candidates Shuffle walks through: what the Day plans, then the best
 * connected the class has not had recently (unless that leaves nothing).
 */
export const focusPool = (
  graph: LessonGraph,
  catalog: LessonCatalog,
  context: FocusContext,
): LessonFocus[] => {
  const planned = plannedFocusCandidates(graph, catalog, context);
  const recent = new Set(context.recentFocusIds);
  const ranked = rankFocusCandidates(graph, catalog).map((r) => r.focus);
  const fresh = ranked.filter((f) => !recent.has(f.id));
  const rest = (fresh.length > 0 ? fresh : ranked).slice(0, SHUFFLE_POOL);
  const pool = [...planned];
  for (const focus of rest)
    if (!pool.some((p) => p.id === focus.id)) pool.push(focus);
  return pool;
};

/** Fixed, so Shuffle's order is the same every time for the same graph. */
const SHUFFLE_SALT = 0x5eed;

/**
 * The suggestion at shuffle position `seed`: 0 is the best candidate, and
 * each Shuffle steps through the rest of the pool in a fixed random order
 * before coming back round. Null only for a graph with no candidates.
 */
export const suggestFocus = (
  graph: LessonGraph,
  catalog: LessonCatalog,
  context: FocusContext,
  seed: number,
): LessonFocus | null => {
  const pool = focusPool(graph, catalog, context);
  if (pool.length === 0) return null;
  const rest = pool.slice(1);
  const random = seededRandom(SHUFFLE_SALT);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  const order = [pool[0], ...rest];
  const step =
    ((Math.trunc(seed) % order.length) + order.length) % order.length;
  return order[step];
};

const fold = (text: string): string =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/**
 * Artists and cities whose name matches, names that start with the query
 * first, then the best connected. Anything with at least one confirmed Globe
 * connection is offered: the teacher asked for it by name.
 */
export const searchFocus = (
  graph: LessonGraph,
  catalog: LessonCatalog,
  query: string,
  limit = 12,
): LessonFocus[] => {
  const q = fold(query);
  if (q.length < 2) return [];
  const hits: { focus: LessonFocus; starts: boolean }[] = [];
  for (const node of graph.nodes.values()) {
    if (node.kind !== 'artist' && node.kind !== 'place') continue;
    const label = fold(node.label);
    if (!label.includes(q)) continue;
    if (!canFocus(graph, catalog, node)) continue;
    const focus = focusOf(graph, catalog, node, { kind: 'searched' });
    if (focus.connections === 0) continue;
    hits.push({ focus, starts: label.startsWith(q) });
  }
  hits.sort(
    (a, b) =>
      Number(b.starts) - Number(a.starts) ||
      b.focus.connections - a.focus.connections ||
      a.focus.label.localeCompare(b.focus.label),
  );
  return hits.slice(0, limit).map((h) => h.focus);
};
