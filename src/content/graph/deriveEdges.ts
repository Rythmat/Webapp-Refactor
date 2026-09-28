import { artistSlug } from '@/components/atlas/data/artists';
import type { Song } from '@/curriculum/types/songLibrary';
import { PROGRESSION_STYLE_TO_GENRE, SONG_TAG_TO_GENRE } from './genres';
import { type Edge, type EntityId, entityId, toSlug } from './types';

/**
 * Edges are DERIVED from records, never authored separately.
 *
 * A song's credits already say "James Jamerson, performer, electric bass". Its
 * session already says "Hitsville U.S.A., Motown, Detroit". Its genreTags
 * already say "funk, pop". Those ARE the connections — asking someone to
 * restate them in a second place would double the work and guarantee the two
 * disagree within a month.
 *
 * So this reads the records and emits the graph. Editing stays where it
 * belongs: add a credit in the console, the connection appears. Nothing to
 * keep in sync, because there is only one copy.
 *
 * The one exception is influence (`eventConnections.ts`), which genuinely is a
 * standalone assertion — no record implies "this event influenced that one" —
 * and already has its own store.
 */

/**
 * A composer line into the writers it names — 'David Paich and Jeff Porcaro'.
 *
 * Only ever applied to `composer`, never to `artist`: a composer field really
 * is a list of people, whereas an artist field is one billed act whose name may
 * itself contain both separators.
 */
const splitNames = (line: string): string[] =>
  line
    .split(/\s*,\s+|\s+and\s+/i)
    .map((n) => n.trim())
    .filter(Boolean);

/**
 * An artist name → the id the graph uses.
 *
 * Deliberately `artistSlug`, the globe's own normaliser, rather than the
 * generic `toSlug`: the artist registry is keyed by it, so anything else would
 * mint ids that look right and match nothing.
 */
const artistId = (name: string): EntityId => `artist:${artistSlug(name)}`;

/** Values that appear in an artist field but are not artists. */
const NOT_AN_ARTIST = new Set([
  'traditional',
  'unknown artist',
  'various artists',
]);

/** Roles that connect a song to a person, and the edge each one makes. */
const ROLE_EDGE = {
  performer: 'features',
  vocals: 'features',
  songwriter: 'written_by',
  producer: 'produced_by',
  engineer: 'engineered_by',
  arranger: 'arranged_by',
  conductor: 'arranged_by',
} as const;

const RELATION_EDGE = {
  original: 'covers',
  cover: 'covers',
  sample: 'samples',
  interpolation: 'interpolates',
  collaboration: 'covers',
} as const;

/** Every connection a single song's record states. */
export function edgesForSong(song: Song): Edge[] {
  const edges: Edge[] = [];
  const from = entityId('song', song.id);
  const add = (kind: Edge['kind'], to: EntityId, extra: Partial<Edge> = {}) =>
    edges.push({ from, kind, to, ...extra });

  // ── The people ──
  for (const credit of song.credits ?? []) {
    const to = artistId(credit.name);
    // A billed artist performed the record; a sideman played on it.
    const kind =
      credit.primary &&
      (credit.role === 'performer' || credit.role === 'vocals')
        ? 'performed_by'
        : ROLE_EDGE[credit.role];
    add(kind, to, credit.unverified ? { unverified: true } : {});

    // The instrument hangs off the player, but only makes sense ON a record —
    // Jamerson plays bass here and might play something else elsewhere.
    if (credit.role === 'performer' && credit.instrument) {
      edges.push({
        from: to,
        kind: 'plays_instrument',
        to: entityId('instrument', credit.instrument),
        on: from,
        ...(credit.unverified ? { unverified: true } : {}),
      });
    }
  }

  // Every song names its artist, and almost none has credits yet (4 of 640 at
  // the time of writing). Without this fallback the graph would connect only
  // the handful of researched songs to anyone, and the 881-artist registry
  // would be unreachable. A billed credit is better evidence, so it wins.
  const billed = (song.credits ?? []).some(
    (c) => c.primary && (c.role === 'performer' || c.role === 'vocals'),
  );
  // NOT split. `song.artist` is the billed act, and the artist registry was
  // built from event titles the same way — whole phrase after the em dash.
  // Splitting it guarantees the two disagree, and it is wrong anyway: it turns
  // Earth, Wind & Fire into "Earth", Florence and the Machine into "Florence",
  // and KC and the Sunshine Band into "KC".
  if (
    !billed &&
    song.artist &&
    !NOT_AN_ARTIST.has(song.artist.trim().toLowerCase())
  ) {
    add('performed_by', artistId(song.artist));
  }

  // `composer` is the display line ("Written by Ashford & Simpson"). Only use
  // it when no songwriter credit exists, or the same person lands twice.
  const hasWriter = (song.credits ?? []).some((c) => c.role === 'songwriter');
  if (!hasWriter && song.composer) {
    for (const name of splitNames(song.composer)) {
      add('written_by', artistId(name));
    }
  }

  // ── Where it was made ──
  const session = song.session;
  if (session?.label) add('released_on', entityId('label', session.label));
  if (session?.studio) add('recorded_at', entityId('studio', session.studio));
  if (session?.city) add('recorded_in', entityId('place', session.city));

  // ── The music ──
  for (const tag of song.genreTags ?? []) {
    const genre = SONG_TAG_TO_GENRE[tag];
    if (genre) add('in_genre', entityId('genre', genre));
  }
  // The key node is the tonic alone, so "everything in D" and "everything
  // dorian" are separate questions.
  const tonic = song.key?.trim().split(/\s+/)[0];
  if (tonic) add('in_key', entityId('key', tonic));
  if (song.mode) add('in_mode', entityId('mode', song.mode));

  // ── Other recordings ──
  for (const rel of song.relatedRecordings ?? []) {
    const to = rel.songId ? entityId('song', rel.songId) : artistId(rel.artist);
    add(RELATION_EDGE[rel.relation], to, {
      ...(rel.year ? { year: rel.year } : {}),
      ...(rel.unverified ? { unverified: true } : {}),
    });
  }

  return edges;
}

/**
 * A progression's own connections: the songs that use it, how it feels, and
 * where it lives.
 *
 * `uses_progression` runs song → progression, not the reverse, so it lands in
 * the facet index with every other song edge — clicking a progression narrows
 * the same way clicking a genre does.
 */
export function edgesForProgression(entry: {
  id: number;
  songIds?: string[];
  vibes: string[];
  styles: string[];
}): Edge[] {
  const progression = entityId('progression', String(entry.id));
  const edges: Edge[] = [];
  for (const songId of entry.songIds ?? []) {
    edges.push({
      from: entityId('song', songId),
      kind: 'uses_progression',
      to: progression,
    });
  }
  for (const vibe of entry.vibes) {
    edges.push({
      from: progression,
      kind: 'has_vibe',
      to: entityId('vibe', vibe),
    });
  }
  for (const style of entry.styles) {
    // The library spells them its own way ('r&b', 'hip-hop'); unmapped styles
    // like 'gospel' and 'african' are skipped rather than forced somewhere.
    const genre = PROGRESSION_STYLE_TO_GENRE[style];
    if (genre) {
      edges.push({
        from: progression,
        kind: 'in_genre',
        to: entityId('genre', genre),
      });
    }
  }
  return edges;
}

/** The whole song library as edges. */
export function deriveSongEdges(songs: readonly Song[]): Edge[] {
  return songs.flatMap(edgesForSong);
}

/** Every distinct node an edge list touches, for sizing and for pickers. */
export function nodesIn(edges: readonly Edge[]): Set<EntityId> {
  const nodes = new Set<EntityId>();
  for (const e of edges) {
    nodes.add(e.from);
    nodes.add(e.to);
  }
  return nodes;
}

/**
 * The lookup that makes faceted filtering work: facet id → the songs carrying
 * it. Clicking a facet intersects these sets; the values still present in the
 * result are what the other facet lists narrow to.
 */
export function buildFacetIndex(
  edges: readonly Edge[],
): Map<EntityId, Set<EntityId>> {
  const index = new Map<EntityId, Set<EntityId>>();
  for (const edge of edges) {
    // `on` carries the song for edges that do not start at one.
    const song = edge.from.startsWith('song:') ? edge.from : edge.on;
    if (!song) continue;
    const bucket = index.get(edge.to) ?? new Set<EntityId>();
    bucket.add(song as EntityId);
    index.set(edge.to, bucket);
  }
  return index;
}

/** Slug helper re-exported so callers need not reach into `types`. */
export { toSlug };
