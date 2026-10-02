import type { Song } from '@/curriculum/types/songLibrary';
import {
  getGenre,
  PROGRESSION_STYLE_TO_GENRE,
  SONG_TAG_TO_GENRE,
} from './genres';
import { placeSlugFor } from './places';
import { artistSlug } from './slugs';
import {
  type Edge,
  type EntityId,
  type EntityKind,
  entityId,
  toSlug,
} from './types';

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

/**
 * The names records print for the people the graph knows only by name: an
 * artist id worked out from a name (`credits[].name`, the artist line, the
 * composer line, a related recording's artist) → the name as the record
 * prints it, the first one seen for each id. The graph labels a person
 * nobody has an artist record for with it (`assembleGraph`), so that dot
 * reads "Russ Kunkel", not `russ-kunkel`. One map per graph.
 */
export type PrintedNames = Map<EntityId, string>;

/** Keep the printed name for an id worked out from it, unless one is kept. */
const notePrinted = (
  names: PrintedNames | undefined,
  id: EntityId,
  name: unknown,
) => {
  if (!names || typeof name !== 'string') return;
  const printed = name.trim().replace(/\s+/g, ' ');
  if (printed && !names.has(id)) names.set(id, printed);
};

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

/** Only set a flag when it is true, so edges stay small and comparable. */
const unverifiedFlag = (unverified?: boolean): Partial<Edge> =>
  unverified ? { unverified: true } : {};

/** A song v2 entry's flags: unconfirmed, and where the fact came from. */
const claimOf = (entry?: {
  unverified?: boolean;
  source?: string;
}): Partial<Edge> => {
  const source =
    typeof entry?.source === 'string' ? entry.source.trim() : undefined;
  return {
    ...unverifiedFlag(entry?.unverified),
    ...(source ? { source } : {}),
  };
};

/** Resolved from free text rather than a stored id. */
const GUESSED: Partial<Edge> = { inferred: true };

/** A value with text in it; a blank id states nothing. */
const present = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== '';

/**
 * A song v2 id, verbatim, as the graph reads every stored id: normalising
 * 'Sunset Sound' into `sunset-sound` would hide the malformed value that
 * integrity exists to show. (The v1 ids above go through `entityId`, as they
 * always have.)
 */
const storedId = (kind: EntityKind, id: string): EntityId =>
  `${kind}:${id.trim()}`;

/**
 * Every connection a single song's record states. Given `names`, it also
 * keeps the name each person it found by name is printed as.
 */
export function edgesForSong(song: Song, names?: PrintedNames): Edge[] {
  const edges: Edge[] = [];
  const from = entityId('song', song.id);
  const via = (path: string) => ({ item: from, path });
  const add = (
    kind: Edge['kind'],
    to: EntityId,
    path: string,
    extra: Partial<Edge> = {},
  ) => edges.push({ from, kind, to, via: via(path), ...extra });

  // ── The people ──
  for (const credit of song.credits ?? []) {
    // A stored artist id beats the display name: the name is how the label
    // printed it, the id is who it is.
    const linked = credit.artistGlobeId?.trim();
    const to = linked ? entityId('artist', linked) : artistId(credit.name);
    if (!linked) notePrinted(names, to, credit.name);
    const how = {
      ...unverifiedFlag(credit.unverified),
      ...(linked ? {} : GUESSED),
    };
    // A billed artist performed the record; a sideman played on it.
    const kind =
      credit.primary &&
      (credit.role === 'performer' || credit.role === 'vocals')
        ? 'performed_by'
        : ROLE_EDGE[credit.role];
    add(kind, to, linked ? 'credits[].artistGlobeId' : 'credits[].name', how);

    // The instrument hangs off the player, but only makes sense ON a record —
    // Jamerson plays bass here and might play something else elsewhere.
    if (credit.role === 'performer' && credit.instrument) {
      edges.push({
        from: to,
        kind: 'plays_instrument',
        to: entityId('instrument', credit.instrument),
        on: from,
        via: via('credits[].instrument'),
        ...how,
      });
    }
  }

  // The lead act, when someone has linked it to the registry. Billed credits
  // (a duet's second name) still add their own `performed_by`.
  const lead = song.origin?.artistGlobeId?.trim();
  if (lead)
    add('performed_by', entityId('artist', lead), 'origin.artistGlobeId');

  // Every song names its artist, and almost none has credits yet (4 of 640 at
  // the time of writing). Without this fallback the graph would connect only
  // the handful of researched songs to anyone, and the artist registry would
  // be unreachable. A linked lead act or a billed credit is better evidence,
  // so either wins; the fallback is marked as the guess it is.
  const billed = (song.credits ?? []).some(
    (c) => c.primary && (c.role === 'performer' || c.role === 'vocals'),
  );
  // NOT split. `song.artist` is the billed act, and the artist registry was
  // built from event titles the same way — whole phrase after the em dash.
  // Splitting it guarantees the two disagree, and it is wrong anyway: it turns
  // Earth, Wind & Fire into "Earth", Florence and the Machine into "Florence",
  // and KC and the Sunshine Band into "KC".
  if (
    !lead &&
    !billed &&
    song.artist &&
    !NOT_AN_ARTIST.has(song.artist.trim().toLowerCase())
  ) {
    add('performed_by', artistId(song.artist), 'artist', GUESSED);
    notePrinted(names, artistId(song.artist), song.artist);
  }

  // `composer` is the display line ("Written by Ashford & Simpson"). Only use
  // it when no songwriter credit exists, or the same person lands twice.
  const hasWriter = (song.credits ?? []).some((c) => c.role === 'songwriter');
  if (!hasWriter && song.composer) {
    for (const name of splitNames(song.composer)) {
      add('written_by', artistId(name), 'composer', GUESSED);
      notePrinted(names, artistId(name), name);
    }
  }

  // ── The records it is on (song v2) ──
  const releases = (song.releases ?? []).filter((r) => present(r?.releaseId));
  for (const release of releases) {
    add(
      'on_release',
      storedId('release', release.releaseId),
      'releases[].releaseId',
      claimOf(release),
    );
  }

  // ── Where it was made ──
  // Each of the studio, the label and the city is an id (song v2) or free
  // text. The id is stated; the text is a guess, read only while its field
  // has no id — the text stays because it is what the song page shows. The
  // label is the records' when the song names any (a record names its own
  // label), so then neither the session's label id nor its text is read.
  // The session's own flag and source carry onto each of them.
  const session = song.session;
  const sessionClaim = claimOf(session);
  const sessionHow = { ...sessionClaim, ...GUESSED };
  if (!releases.length) {
    if (present(session?.labelId)) {
      add(
        'released_on',
        storedId('label', session.labelId),
        'session.labelId',
        sessionClaim,
      );
    } else if (session?.label) {
      add(
        'released_on',
        entityId('label', session.label),
        'session.label',
        sessionHow,
      );
    }
  }
  if (present(session?.studioId)) {
    add(
      'recorded_at',
      storedId('studio', session.studioId),
      'session.studioId',
      sessionClaim,
    );
  } else if (session?.studio) {
    add(
      'recorded_at',
      entityId('studio', session.studio),
      'session.studio',
      sessionHow,
    );
  }
  if (present(session?.placeId)) {
    // Where it was recorded. It never moves the song's pin on the globe.
    add(
      'recorded_in',
      storedId('place', session.placeId),
      'session.placeId',
      sessionClaim,
    );
  } else if (session?.city) {
    // The globe's city id when the registry knows the city, so the session
    // and the globe pin are the same node.
    // A name the registry cannot place gets a slug that cannot collide with
    // a registered city (see placeSlugFor).
    const place = placeSlugFor(session.city, session.country);
    add('recorded_in', entityId('place', place), 'session.city', sessionHow);
  }

  // ── The music ──
  for (const tag of song.genreTags ?? []) {
    const genre = SONG_TAG_TO_GENRE[tag];
    if (genre) add('in_genre', entityId('genre', genre), 'genreTags[]');
  }
  // Finer than the tags (song v2): each is filed under its genre when the
  // graph is assembled, so the genre reaches the song through it.
  for (const subgenre of (song.subgenreIds ?? []).filter(present)) {
    add('in_genre', storedId('subgenre', subgenre), 'subgenreIds[]');
  }
  // The key node is the tonic alone, so "everything in D" and "everything
  // dorian" are separate questions. The accidental is kept: E♭ is `key:e-flat`.
  const tonic = song.key?.trim().split(/\s+/)[0];
  if (tonic) add('in_key', entityId('key', tonic), 'key');
  if (song.mode) add('in_mode', entityId('mode', song.mode), 'mode');

  // ── Other recordings ──
  // `relation` says what the OTHER recording is to this one: an `original`
  // is what this song covers; a `cover` is someone else covering this song.
  for (const rel of song.relatedRecordings ?? []) {
    const linkedArtist = rel.artistGlobeId?.trim();
    const artist = linkedArtist
      ? entityId('artist', linkedArtist)
      : artistId(rel.artist);
    if (!linkedArtist) notePrinted(names, artist, rel.artist);
    const other = rel.songId ? entityId('song', rel.songId) : artist;
    const path = rel.songId
      ? 'relatedRecordings[].songId'
      : linkedArtist
        ? 'relatedRecordings[].artistGlobeId'
        : 'relatedRecordings[].artist';
    const how: Partial<Edge> = {
      ...(rel.year ? { year: rel.year } : {}),
      ...unverifiedFlag(rel.unverified),
      ...(rel.songId || linkedArtist ? {} : GUESSED),
    };
    switch (rel.relation) {
      case 'original':
        add('covers', other, path, how);
        break;
      case 'cover':
        edges.push({
          from: other,
          kind: 'covers',
          to: from,
          via: via(path),
          ...how,
        });
        break;
      case 'sample':
      case 'interpolation':
        // Recording-to-recording only: an artist alone does not say WHICH
        // record was sampled, so there is no honest edge to draw without one.
        if (rel.songId) {
          add(
            rel.relation === 'sample' ? 'samples' : 'interpolates',
            other,
            path,
            how,
          );
        }
        break;
      case 'collaboration':
        // The other artist is on this record, not a separate recording of it.
        add(
          'features',
          artist,
          linkedArtist
            ? 'relatedRecordings[].artistGlobeId'
            : 'relatedRecordings[].artist',
          { ...how, ...(linkedArtist ? {} : GUESSED) },
        );
        break;
    }
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
      via: { item: progression, path: 'songIds[]' },
    });
  }
  for (const vibe of entry.vibes) {
    edges.push({
      from: progression,
      kind: 'has_vibe',
      to: entityId('vibe', vibe),
      via: { item: progression, path: 'vibes[]' },
    });
  }
  for (const style of entry.styles) {
    // The library spells them its own way ('r&b', 'hip-hop'); an unmapped
    // style like 'african' is skipped rather than forced somewhere. The map
    // names a subgenre ('gospel') where the owner filed a style at that level.
    const genre = PROGRESSION_STYLE_TO_GENRE[style];
    if (genre) {
      edges.push({
        from: progression,
        kind: 'in_genre',
        to: entityId(getGenre(genre) ? 'genre' : 'subgenre', genre),
        via: { item: progression, path: 'styles[]' },
      });
    }
  }
  return edges;
}

/** The whole song library as edges. */
export function deriveSongEdges(songs: readonly Song[]): Edge[] {
  return songs.flatMap((song) => edgesForSong(song));
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
  const file = (facet: EntityId, song: EntityId) => {
    const bucket = index.get(facet) ?? new Set<EntityId>();
    bucket.add(song);
    index.set(facet, bucket);
  };
  for (const edge of edges) {
    if (edge.from.startsWith('song:')) {
      file(edge.to, edge.from);
    } else if (edge.on) {
      // `on` carries the song for edges that do not touch one
      // (artist plays instrument ON a record).
      file(edge.to, edge.on);
    } else if (edge.to.startsWith('song:')) {
      // An edge that points AT a song — an artist covering it — makes the
      // other end the facet. Direction is about meaning, not about indexing.
      file(edge.from, edge.to);
    }
  }
  return index;
}

/** Slug helper re-exported so callers need not reach into `types`. */
export { toSlug };
