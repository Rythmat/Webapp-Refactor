import { MUSICAL_ERAS } from '@/components/atlas/data/musicalEras';
import { REGIONS } from '@/components/atlas/data/regions';
import type {
  HistoricalEvent,
  HistoricalModule,
} from '@/components/atlas/types';
import type {
  ArtistRecord,
  LabelRecord,
  PlaceRecord,
  ReleaseRecord,
  StudioRecord,
} from '@/content/records/types';
import { SESSION_INSTRUMENTS } from '@/curriculum/data/instruments';
import { VIBE_ALGORITHMS } from '@/curriculum/engine/vibeAlgorithms';
import type { Song, SongMode } from '@/curriculum/types/songLibrary';
import type { DayStub } from '@/features/classroom/annual/curriculumTemplate';
import {
  edgesForProgression,
  edgesForSong,
  type PrintedNames,
} from './deriveEdges';
import {
  createEventMatcher,
  type EventMatch,
  type MatchableArtist,
  type MatchableSong,
} from './eventMatches';
import {
  resolveGenreTag,
  SUBGENRE_PARENT,
  TAG_TO_GENRE,
  TAG_TO_SUBGENRE,
} from './genreTags';
import { GENRES } from './genres';
import { canonicalId, SLUG_PATTERN } from './ids';
import { TYPICAL_IN_PATH, type TypicalGenre } from './instrumentGenres';
import { resolvePlaceName } from './places';
import { artistSlug } from './slugs';
import { decadeOf, decadesBetween, edgesForYear, yearOf } from './time';
import {
  CODE_OWNERS,
  type Edge,
  type EdgeKind,
  type EdgeVia,
  type EntityId,
  type EntityKind,
  type GraphEdge,
  type GraphNode,
  isValidEdge,
  isWellFormed,
  type NodeStatus,
  parseEntityId,
} from './types';

/**
 * The whole Atlas as one graph: every record's reference fields turned into
 * edges, merged, folded onto one node per real thing, and checked.
 *
 * `deriveEdges.ts` reads a song or a progression. This reads everything else —
 * artists, records, studios, labels, places, the globe's events, song pins,
 * pathways and influence arcs, the canonical Teach days and the instruments'
 * typical genres — and assembles the lot. It is pure: the caller hands it a
 * snapshot (the repo's bundled data, or the API's, per decision 15) and gets
 * back nodes, edges, an adjacency index and the mind map's ego-network walk.
 * Nothing here knows where data lives.
 *
 * PROVENANCE
 *
 * Every edge says which item and which field state it (`via`). A stored id
 * field is read verbatim: normalising `'Detroit'` into `detroit` would hide
 * exactly the malformed value integrity exists to show, so it is reported
 * instead (see `violations`). Two fields stating the same connection — the
 * lead act and a primary credit naming the same artist — become one edge with
 * both named in `via[]`.
 *
 * Some statements are code's, not a content body's: the globe's influence
 * arcs, the canonical Teach days, the pathways, the subgenre table, the
 * calendar (which decade and era a year is in) and the instruments' typical
 * genres. Their `via` names the node the statement is filed under and carries
 * `code` (the owning file), so the console never offers to edit them as a
 * field of that node and integrity never blames a published item for them.
 *
 * Four edges are computed across records, per design §3.3: a song whose
 * session names a studio but no city is `recorded_in` the studio record's
 * `placeId` (inferred, via that field); every subgenre in use sits
 * `in_genre` under its parent, so the genre reaches what is filed below it;
 * every year in use sits in its decade and its era (`time.ts`), so a
 * decade or an era reaches everything dated within it; and an act's song
 * pins (`artist_location`) place it only while its artist record names no
 * city of its own.
 *
 * UNREADABLE ITEMS
 *
 * Partial bodies are real — API rows missing a required field, working-mode
 * drafts, the half-typed draft open in the editor. `buildGraph` reads each
 * item on its own; one that throws is left out and named in `unreadable`,
 * rather than taking the whole map down or vanishing without a word.
 *
 * ONE NODE PER REAL THING
 *
 * Ids go through `canonicalId` before anything else, so a song's globe event
 * (`event:song-africa`) is the song (`song:africa`): its influence arcs, the
 * Teach days that reference it and the pathways that pass through it all meet
 * the song's credits on one node. Endpoints are validated AFTER that folding,
 * because folding changes an endpoint's kind.
 *
 * NEVER A SILENT PHANTOM
 *
 * An edge that fails validation is left out of `edges` and listed in
 * `violations` with its `via`, so integrity can link to the field. An id
 * something points at but nothing defines becomes a `missing` node. Code
 * vocabularies (genres, instruments, vibes, modes, eras, keys, globe
 * regions, years and decades) are nodes with status `code`, but only when
 * used — and only for values the vocabulary actually has; anything else is
 * `missing` too.
 *
 * HOP EXPANSION (the mind map's walk, design §3.5)
 *
 * Every edge that touches the focus is returned, whatever its flags: 634 of
 * 640 songs are linked to their artist only by a guess from the display name,
 * so hiding guesses would leave almost every song standing alone. The map
 * draws them dotted (inferred) or dashed (unverified). Beyond the focus, only
 * solid edges carry the walk: a node reached by a guess or an unconfirmed
 * claim is shown but not expanded, and a guessed or unconfirmed edge between
 * two other nodes is not drawn — one guess never leads on to the next.
 * `includeInferred` and `includeUnverified` (the map's toggles) lift that.
 * `stopAt` names nodes that are shown but not walked through the same way,
 * however solid their edges: the map passes its hubs, so a song's two-step
 * map is not every other song in its key. `stopAbove` stops at any node the
 * walk would go on through too many edges from, counted with the same
 * filters. The network says how many nodes each stop would have led on to
 * (`stopped`), so the map can say so too.
 */

/* ── Derivers ────────────────────────────────────────────────────────── */

/** A connection between globe events: `from` influenced `to`. */
export interface InfluenceArc {
  from: string;
  to: string;
}

/**
 * The `via.path` of an influence arc. The arcs are a code-owned list
 * (`eventConnections.ts`), not a field of any content body, so REF_PATHS has
 * no entry for it and the console must not offer to edit it as one; the
 * arc's `via.code` says so.
 */
export const INFLUENCE_ARC_PATH = 'eventConnections[]';

/** The `via.path` of a subgenre's edge to its genre: its `SUBGENRE_PARENT` entry. */
export const SUBGENRE_PARENT_PATH = 'parent';

/** A stored slug → its id, verbatim (see PROVENANCE above). */
const ref = (kind: EntityKind, slug: string): EntityId =>
  `${kind}:${slug.trim()}`;

/**
 * A blank field states nothing, so it derives nothing. A partial body can hold
 * anything in any field, so only a string with text in it counts.
 */
const present = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== '';

/** A display name or title, or '' when the body has none to give. */
const text = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

interface Claim {
  unverified?: boolean;
  source?: string;
}

/**
 * The flags an edge inherits: unconfirmed if the entry or its record is, and
 * the first source given, most specific first. A record marked unverified
 * vouches for none of its fields, the way a session's flag covers its studio,
 * label and city.
 */
function claimOf(...claims: (Claim | undefined)[]): Partial<Edge> {
  const unverified = claims.some((c) => c?.unverified);
  const source = claims.map((c) => c?.source?.trim()).find(Boolean);
  return {
    ...(unverified ? { unverified: true } : {}),
    ...(source ? { source } : {}),
  };
}

// The calendar moved to time.ts; callers that bucket a year here keep working.
export { eraForYear } from './time';

/**
 * The year a dated field states, as an edge from its item to the year: a
 * song's or a record's `year`, a label's `foundedYear`, a studio's
 * `openedYear` (`from_year`), an artist's birth or a group's forming
 * (`born_year`, `formed_year`). A year is a value, not a reference, so it is
 * read through `yearOf` rather than verbatim — a value that is not a year
 * states nothing, and a date ('1939-04-02') states its year — and it is
 * typed, not a guess. The year's decade and era are the calendar's, added
 * when the graph is assembled (`edgesForYear`).
 */
function yearEdges(
  self: EntityId,
  value: unknown,
  path: string,
  claim: Partial<Edge> = {},
  kind: Extract<
    EdgeKind,
    'from_year' | 'born_year' | 'formed_year'
  > = 'from_year',
): Edge[] {
  const year = yearOf(value);
  if (year === null) return [];
  return [
    {
      from: self,
      kind,
      to: ref('year', String(year)),
      via: { item: self, path },
      ...claim,
    },
  ];
}

/**
 * A song's year. Kept out of `edgesForSong`, which serves the student facet
 * index; the year is a graph fact, and the song's era comes through it.
 */
export function edgesForSongYear(song: Pick<Song, 'id' | 'year'>): Edge[] {
  return yearEdges(ref('song', song.id), song.year, 'year');
}

let genreIds: ReadonlySet<string> | null = null;

/**
 * An artist's `genreIds` hold genres or subgenres from one vocabulary; the
 * node kind is whichever level the id belongs to. A genre wins a tie, and an
 * id in neither list stays a genre so it surfaces as `missing`.
 */
function genreRef(id: string): EntityId {
  genreIds ??= new Set(GENRES.map((g) => g.id));
  const subgenre =
    !genreIds.has(id) &&
    Object.prototype.hasOwnProperty.call(SUBGENRE_PARENT, id);
  return ref(subgenre ? 'subgenre' : 'genre', id);
}

/**
 * A subgenre under its genre, from the code table, so an artist filed at
 * `subgenre:acid-rock` is reachable from `genre:rock` — the walk up that
 * `in_genre` promises. Nothing for a subgenre the table does not have: that
 * node is `missing`, and has no parent to name.
 */
export function edgesForSubgenre(subgenre: string): Edge[] {
  if (!Object.prototype.hasOwnProperty.call(SUBGENRE_PARENT, subgenre)) {
    return [];
  }
  const self = ref('subgenre', subgenre);
  return [
    {
      from: self,
      kind: 'in_genre',
      to: ref('genre', SUBGENRE_PARENT[subgenre]),
      via: {
        item: self,
        path: SUBGENRE_PARENT_PATH,
        code: CODE_OWNERS.subgenres,
      },
    },
  ];
}

/**
 * Whether an artist record is a group: marked one (`group`), or listing
 * members, which only a group has. The flag is the record's word, but an
 * import can fill Born and the members without it (none of the registry's
 * artists carries it yet), and a band's forming read as a birth would draw
 * the wrong edge and hide its birthplace from integrity. Integrity notes a
 * record with members and no flag, so the flag gets set.
 */
export function isGroupArtist(artist: {
  readonly group?: unknown;
  readonly members?: unknown;
}): boolean {
  return (
    artist.group === true ||
    (Array.isArray(artist.members) && artist.members.length > 0)
  );
}

/**
 * An artist's own connections.
 *
 * Membership is stated on the group but runs FROM the member (`member_of`), so
 * standing on a person reads "member of"; what a member played in the group
 * hangs off the member, with no `on` — it was in the group, not on one record.
 * Influence is stated on the influenced artist and runs FROM the influencer,
 * matching the globe's arcs.
 *
 * When, from `born` and the years active (design §4.1, checkpoint C2):
 *  - `born.date` is a person's birth (`born_year`) and a group's forming
 *    (`formed_year`; a group as `isGroupArtist` reads it), to the year it
 *    names, whatever its precision;
 *  - `born.placeId` is a person's birthplace (`born_in`). A group's is its
 *    City (`basedInPlaceId`, where it formed), so on a group it states
 *    nothing here; integrity notes one that is set;
 *  - `activeFrom`…`activeTo` is every decade the span touches (`active_in`).
 *    A span still open (no `activeTo`) runs to `asOfYear`, the snapshot's
 *    year, passed in so the graph stays a function of its data rather than of
 *    the clock; with none given, an open span states only its first decade,
 *    all it says for sure. A span the calendar cannot read — one that ends
 *    before it starts, an open one that starts after `asOfYear`, one of more
 *    than 30 decades — states no decade (`decadesBetween`); integrity lists
 *    it. Pass `asOfYear` by name: handed to `map` or `flatMap` directly, this
 *    would take the element's index for it.
 *
 * `born`'s own unconfirmed flag and source carry onto its edges, as a
 * member's do; the years active have none of their own, so they carry the
 * record's.
 */
export function edgesForArtist(
  artist: ArtistRecord,
  asOfYear?: number,
): Edge[] {
  const self = ref('artist', artist.slug);
  const via = (path: string): EdgeVia => ({ item: self, path });
  const own = claimOf(artist);
  const edges: Edge[] = [];

  for (const member of artist.members ?? []) {
    if (!present(member.artistId)) continue;
    const person = ref('artist', member.artistId);
    const claim = claimOf(member, artist);
    edges.push({
      from: person,
      kind: 'member_of',
      to: self,
      via: via('members[].artistId'),
      ...claim,
    });
    for (const instrument of (member.instrumentIds ?? []).filter(present)) {
      edges.push({
        from: person,
        kind: 'plays_instrument',
        to: ref('instrument', instrument),
        via: via('members[].instrumentIds[]'),
        ...claim,
      });
    }
  }
  for (const instrument of (artist.instrumentIds ?? []).filter(present)) {
    edges.push({
      from: self,
      kind: 'plays_instrument',
      to: ref('instrument', instrument),
      via: via('instrumentIds[]'),
      ...own,
    });
  }
  for (const genre of (artist.genreIds ?? []).filter(present)) {
    edges.push({
      from: self,
      kind: 'in_genre',
      to: genreRef(genre.trim()),
      via: via('genreIds[]'),
      ...own,
    });
  }
  for (const label of (artist.labelIds ?? []).filter(present)) {
    edges.push({
      from: self,
      kind: 'signed_to',
      to: ref('label', label),
      via: via('labelIds[]'),
      ...own,
    });
  }
  if (present(artist.basedInPlaceId)) {
    edges.push({
      from: self,
      kind: 'based_in',
      to: ref('place', artist.basedInPlaceId),
      via: via('basedInPlaceId'),
      ...own,
    });
  }
  for (const influence of artist.influencedBy ?? []) {
    if (!present(influence.artistId)) continue;
    edges.push({
      from: ref('artist', influence.artistId),
      kind: 'influenced',
      to: self,
      via: via('influencedBy[].artistId'),
      ...claimOf(influence, artist),
    });
  }

  // A partial body can hold anything in `born`; only an object states a birth.
  const born =
    artist.born && typeof artist.born === 'object' ? artist.born : undefined;
  if (born) {
    const birth = claimOf(born, artist);
    const group = isGroupArtist(artist);
    edges.push(
      ...yearEdges(
        self,
        born.date,
        'born.date',
        birth,
        group ? 'formed_year' : 'born_year',
      ),
    );
    if (!group && present(born.placeId)) {
      edges.push({
        from: self,
        kind: 'born_in',
        to: ref('place', born.placeId),
        via: via('born.placeId'),
        ...birth,
      });
    }
  }

  const first = yearOf(artist.activeFrom);
  if (first !== null) {
    // Null is how a JSON body leaves a field unset.
    const open = artist.activeTo === undefined || artist.activeTo === null;
    const last = open ? (yearOf(asOfYear) ?? first) : yearOf(artist.activeTo);
    for (const decade of last === null ? [] : decadesBetween(first, last)) {
      edges.push({
        from: self,
        kind: 'active_in',
        to: ref('decade', decade),
        via: via('activeFrom'),
        ...own,
      });
    }
  }
  return edges;
}

/**
 * A record's own facts: who is billed, the label, the year. Its tracks and
 * where they were cut live on the songs (decision 7), so they are not here.
 */
export function edgesForRelease(release: ReleaseRecord): Edge[] {
  const self = ref('release', release.slug);
  const via = (path: string): EdgeVia => ({ item: self, path });
  const own = claimOf(release);
  const edges: Edge[] = [];
  // Required by the type, but a draft or a partial API row can lack it.
  for (const artist of (release.artistIds ?? []).filter(present)) {
    edges.push({
      from: self,
      kind: 'performed_by',
      to: ref('artist', artist),
      via: via('artistIds[]'),
      ...own,
    });
  }
  if (present(release.labelId)) {
    edges.push({
      from: self,
      kind: 'released_on',
      to: ref('label', release.labelId),
      via: via('labelId'),
      ...own,
    });
  }
  edges.push(...yearEdges(self, release.year, 'year', own));
  return edges;
}

/** The city a studio is in, and the year it opened. */
export function edgesForStudio(studio: StudioRecord): Edge[] {
  const self = ref('studio', studio.slug);
  const own = claimOf(studio);
  const edges: Edge[] = [];
  if (present(studio.placeId)) {
    edges.push({
      from: self,
      kind: 'based_in',
      to: ref('place', studio.placeId),
      via: { item: self, path: 'placeId' },
      ...own,
    });
  }
  edges.push(...yearEdges(self, studio.openedYear, 'openedYear', own));
  return edges;
}

/**
 * Where a song was recorded when its session names a studio but no city: the
 * studio record's own `placeId` (design §3.3). The studio picker never copies
 * the place into the song, so this is how such a song reaches the city. It is
 * as sure as the studio is: a guess while the studio was matched from the
 * session's text, stated once the session stores `studioId` (song v2), since
 * then both halves are. It carries the session's flag and the studio's. A
 * city the session does name, as text or as `placeId`, always wins, so
 * nothing is derived then.
 *
 * `songEdges` are one song's own edges (`edgesForSong`); `studios` are the
 * snapshot's studio records by id.
 */
export function edgesForStudioPlace(
  songEdges: readonly Edge[],
  studios: ReadonlyMap<EntityId, StudioRecord>,
): Edge[] {
  if (songEdges.some((e) => e.kind === 'recorded_in')) return [];
  const edges: Edge[] = [];
  for (const at of songEdges) {
    if (at.kind !== 'recorded_at') continue;
    const studio = studios.get(canonicalId(at.to));
    if (!studio || !present(studio.placeId)) continue;
    edges.push({
      from: at.from,
      kind: 'recorded_in',
      to: ref('place', studio.placeId),
      via: { item: ref('studio', studio.slug), path: 'placeId' },
      ...(at.inferred ? { inferred: true } : {}),
      ...claimOf(at, studio),
    });
  }
  return edges;
}

/**
 * Where a label was based, the label it is an imprint of, and the year it
 * was founded.
 */
export function edgesForLabel(label: LabelRecord): Edge[] {
  const self = ref('label', label.slug);
  const own = claimOf(label);
  const edges: Edge[] = [];
  if (present(label.placeId)) {
    edges.push({
      from: self,
      kind: 'based_in',
      to: ref('place', label.placeId),
      via: { item: self, path: 'placeId' },
      ...own,
    });
  }
  if (present(label.parentLabelId)) {
    edges.push({
      from: self,
      kind: 'imprint_of',
      to: ref('label', label.parentLabelId),
      via: { item: self, path: 'parentLabelId' },
      ...own,
    });
  }
  edges.push(...yearEdges(self, label.foundedYear, 'foundedYear', own));
  return edges;
}

/** The place node for a globe region: `place:region-north-america`. */
export const regionPlaceId = (region: string): EntityId =>
  ref('place', `region-${region.trim()}`);

/**
 * A genre string as the globe writes it ('Art Rock', 'Hip Hop') → the genre
 * or subgenre the curated table puts it at, or null when the table does not
 * know it (see `resolveGenreTag`). A lookup, not a guess: the table is code
 * someone reviewed, so what it resolves is drawn solid (RefPath
 * `resolvedBy: 'genreTag'`).
 */
function genreTagRef(tag: string): EntityId | null {
  const resolved = resolveGenreTag(tag);
  if (!resolved) return null;
  return resolved.subgenre
    ? ref('subgenre', resolved.subgenre)
    : ref('genre', resolved.genre);
}

/**
 * A city in its globe region, and its scene: the genres it is known for
 * (`scene_of`, read through the genre table like an event's) and the decades
 * that scene was active (`scene_active_in`). The city states both, so they
 * are its own edges rather than anyone's `in_genre`. A decade is a value, not
 * a reference, bucketed like a year: 1965 is the 1960s.
 */
export function edgesForPlace(
  place: Pick<PlaceRecord, 'id' | 'region'> &
    Partial<Pick<PlaceRecord, 'genres' | 'activeDecades'>>,
): Edge[] {
  const self = ref('place', place.id);
  const via = (path: string): EdgeVia => ({ item: self, path });
  const edges: Edge[] = [];
  if (present(place.region)) {
    edges.push({
      from: self,
      kind: 'located_in',
      to: regionPlaceId(place.region),
      via: via('region'),
    });
  }
  for (const tag of (place.genres ?? []).filter(present)) {
    const genre = genreTagRef(tag);
    if (!genre) continue;
    edges.push({
      from: self,
      kind: 'scene_of',
      to: genre,
      via: via('genres[]'),
    });
  }
  for (const value of place.activeDecades ?? []) {
    const decade = decadeOf(value);
    if (decade === null) continue;
    edges.push({
      from: self,
      kind: 'scene_active_in',
      to: ref('decade', decade),
      via: via('activeDecades[]'),
    });
  }
  return edges;
}

/**
 * A globe event as the graph reads it. Past its id every field is optional,
 * because a draft or a partial API row can lack any of them.
 *
 * The ids are what an event body stores once a reviewer has confirmed them
 * (`GlobeEventRecord`, event body v2). Absent, the graph infers the artists,
 * songs and place from the title, the tags and the city; an empty list says
 * the event is about none, which is how a reviewer answers a wrong guess.
 * Nothing infers the records, studios and labels, so absent and empty say the
 * same for those. `unverified` and `source` are the event's own, and cover
 * every field it states, as a record's do.
 */
export type GlobeEventInput = Pick<HistoricalEvent, 'id'> &
  Partial<Pick<HistoricalEvent, 'title' | 'year' | 'genre' | 'tags'>> & {
    location?: Partial<HistoricalEvent['location']>;
    artistIds?: readonly string[];
    songIds?: readonly string[];
    placeId?: string;
    releaseIds?: readonly string[];
    studioIds?: readonly string[];
    labelIds?: readonly string[];
    unverified?: boolean;
    source?: string;
  };

/**
 * A globe event's own connections: its year, where it happened, its genres,
 * and who and what it is about.
 *
 * Only a hand-authored `evt-` event. A `song-` event is its song on the globe
 * (`canonicalId` folds the two), and its fields are copies of the song's —
 * the city its session names, a year of 2000 where the song has none — so
 * reading them here would restate the song, or state something false.
 *
 * Each field is read on its own, and a stored id wins over a guess:
 *  - the year is a value, bucketed like a song's (`from_year`);
 *  - the place is `placeId` when stored; otherwise the city as written,
 *    placed through the city registry (`resolvePlaceName`) and marked a
 *    guess. A name the registry cannot place states nothing: a city slugged
 *    from free text would be a guess resting on a guess;
 *  - each genre string goes through the curated genre table and is drawn
 *    solid (the owner's call, 29 Sep 2026); a string the table does not know
 *    states nothing;
 *  - `about` comes from `artistIds` and `songIds` when stored, and otherwise
 *    from `match`, what `eventMatches.ts` read in the title and tags. Those
 *    are guesses, each citing the part of the event that named it. The
 *    records, studios and labels it is about are only ever stored
 *    (`releaseIds`, `studioIds`, `labelIds`).
 *
 * An event marked unverified vouches for none of this, and its source goes
 * with every edge; a guess is a guess either way.
 */
export function edgesForEvent(
  event: GlobeEventInput,
  match?: EventMatch,
): Edge[] {
  const self = ref('event', event.id);
  // A song's event folds onto the song: it is not an event of its own.
  if (canonicalId(self) !== self) return [];
  const via = (path: string): EdgeVia => ({ item: self, path });
  const own = claimOf(event);
  const edges: Edge[] = [...yearEdges(self, event.year, 'year', own)];

  const city = event.location?.city;
  const country = event.location?.country;
  if (present(event.placeId)) {
    edges.push({
      from: self,
      kind: 'took_place_in',
      to: ref('place', event.placeId),
      via: via('placeId'),
      ...own,
    });
  } else if (present(city)) {
    const place = resolvePlaceName(
      city,
      present(country) ? country : undefined,
    );
    if (place.status === 'resolved') {
      edges.push({
        from: self,
        kind: 'took_place_in',
        to: ref('place', place.id),
        via: via('location.city'),
        inferred: true,
        ...own,
      });
    }
  }

  for (const tag of (event.genre ?? []).filter(present)) {
    const genre = genreTagRef(tag);
    if (!genre) continue;
    edges.push({
      from: self,
      kind: 'in_genre',
      to: genre,
      via: via('genre[]'),
      ...own,
    });
  }

  // Stored ids, when the field is a list at all (an empty one included),
  // or else the guesses. A partial body can hold anything there: a value
  // that is not a list states nothing, as integrity's coverage counts it,
  // rather than taking the event's year and place down with it.
  const about = (
    kind: 'artist' | 'song' | 'release' | 'studio' | 'label',
    stored: readonly string[] | undefined,
    path: string,
    matched: readonly { id: string; path: string }[] = [],
  ) => {
    if (Array.isArray(stored)) {
      for (const id of stored.filter(present)) {
        edges.push({
          from: self,
          kind: 'about',
          to: ref(kind, id),
          via: via(path),
          ...own,
        });
      }
      return;
    }
    for (const m of matched) {
      edges.push({
        from: self,
        kind: 'about',
        to: ref(kind, m.id),
        via: via(m.path),
        inferred: true,
        ...own,
      });
    }
  };
  about(
    'artist',
    event.artistIds,
    'artistIds[]',
    (match?.artists ?? []).map((a) => ({ id: a.artistId, path: a.path })),
  );
  about(
    'song',
    event.songIds,
    'songIds[]',
    (match?.songs ?? []).map((s) => ({ id: s.songId, path: s.path })),
  );
  about('release', event.releaseIds, 'releaseIds[]');
  about('studio', event.studioIds, 'studioIds[]');
  about('label', event.labelIds, 'labelIds[]');
  return edges;
}

/**
 * A song pin as the globe keeps it: an `artist_location` item, keyed by the
 * act's name in lowercase (`'marvin gaye'`), placing the act's songs on the
 * map.
 */
export interface ArtistLocationInput {
  id: string;
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
}

/**
 * Where an act's songs are pinned, as a guessed `based_in`: the "song pins"
 * city.
 *
 * It is not the act's City. The pins say where the songs are shown — often a
 * birthplace or where someone grew up (Marvin Gaye's say Washington, where his
 * scene was Detroit) — so the edge is a guess, and only stands in while the
 * artist record states no city of its own: once `basedInPlaceId` is set, that
 * is the act's City and the pin says nothing more. An act the snapshot has no
 * artist record for gets nothing, rather than a missing node conjured from a
 * pin. The city is placed through the registry, as an event's is, and a name
 * it cannot place states nothing.
 *
 * The statement is the `artist_location` item's own (REF_PATHS
 * `artist_location` `city`), filed under the artist it pins, `artistSlug` of
 * its id, and naming the pin itself in `via.statedBy`: two pins spelled
 * differently for one act are two sources, and each links to its own item.
 */
export function edgesForArtistLocation(
  location: ArtistLocationInput,
  artist: Pick<ArtistRecord, 'slug' | 'basedInPlaceId'> | undefined,
): Edge[] {
  if (!artist || present(artist.basedInPlaceId)) return [];
  if (!present(location.city)) return [];
  const place = resolvePlaceName(
    location.city,
    present(location.country) ? location.country : undefined,
  );
  if (place.status !== 'resolved') return [];
  const self = ref('artist', artistSlug(location.id));
  return [
    {
      from: self,
      kind: 'based_in',
      to: ref('place', place.id),
      via: {
        item: self,
        path: 'city',
        statedBy: { kind: 'artist_location', id: location.id },
      },
      inferred: true,
    },
  ];
}

/**
 * An instrument's typical genres, from the owner-reviewed table
 * (`instrumentGenres.ts`). Code states them, so each is filed under the
 * instrument with `via.code`, like a subgenre's parent.
 */
export function edgesForInstrument(
  instrument: string,
  genres: readonly TypicalGenre[],
): Edge[] {
  const self = ref('instrument', instrument);
  return genres.map(
    (genre): Edge => ({
      from: self,
      kind: 'typical_in',
      to: genre,
      via: {
        item: self,
        path: TYPICAL_IN_PATH,
        code: CODE_OWNERS.instrumentGenres,
      },
    }),
  );
}

/**
 * A canonical Teach day's song and globe events. Code-owned in slice 1
 * (decision 11), so these are read-only "code" edges; a `song-<id>` event
 * folds onto the song.
 */
export function edgesForDayStub(
  stub: Pick<DayStub, 'slug' | 'songId' | 'globeEventIds'>,
): Edge[] {
  const self = ref('teach_day', stub.slug);
  const via = (path: string): EdgeVia => ({
    item: self,
    path,
    code: CODE_OWNERS.teachYear,
  });
  const edges: Edge[] = [];
  if (present(stub.songId)) {
    edges.push({
      from: self,
      kind: 'uses_song',
      to: ref('song', stub.songId),
      via: via('songId'),
    });
  }
  for (const event of (stub.globeEventIds ?? []).filter(present)) {
    edges.push({
      from: self,
      kind: 'references_event',
      to: canonicalId(ref('event', event)),
      via: via('globeEventIds[]'),
    });
  }
  return edges;
}

/** Each stop on a globe pathway (`HISTORICAL_MODULES`); code-owned. */
export function edgesForPathway(
  pathway: Pick<HistoricalModule, 'id' | 'eventIds'>,
): Edge[] {
  const self = ref('pathway', pathway.id);
  return (pathway.eventIds ?? []).filter(present).map(
    (event): Edge => ({
      from: canonicalId(ref('event', event)),
      kind: 'part_of',
      to: self,
      via: { item: self, path: 'eventIds[]', code: CODE_OWNERS.pathways },
    }),
  );
}

/**
 * The globe's influence arcs (`eventConnections.ts`) as `influenced` edges.
 *
 * Taken as a parameter rather than imported: that module reads the content
 * store, which this pure module must not pull in. The list is written
 * influencer-first, so each arc is filed under its influencer (`via.item`) —
 * but the statement is the list's, not the influencer's: after folding, that
 * is usually a song, whose body has no such field. `via.code` says so.
 *
 * An arc whose two ends fold onto one node states nothing and is dropped:
 * the BBC live `Valerie` leading to the record is the song and itself
 * (`songEventAliases.ts`), not one thing influencing another.
 */
export function edgesForInfluenceArcs(arcs: readonly InfluenceArc[]): Edge[] {
  return arcs
    .filter((arc) => present(arc.from) && present(arc.to))
    .flatMap((arc): Edge[] => {
      const from = canonicalId(ref('event', arc.from));
      const to = canonicalId(ref('event', arc.to));
      if (from === to) return [];
      return [
        {
          from,
          kind: 'influenced',
          to,
          via: {
            item: from,
            path: INFLUENCE_ARC_PATH,
            code: CODE_OWNERS.influenceArcs,
          },
        },
      ];
    });
}

/* ── The snapshot ────────────────────────────────────────────────────── */

/** A content item's state in the API; anything absent from `statuses` is code. */
export type ItemStatus = Exclude<NodeStatus, 'code' | 'missing'>;

/** A progression as the graph needs it; `progression` is its display form. */
export type ProgressionInput = Parameters<typeof edgesForProgression>[0] & {
  progression?: string;
};

/**
 * Everything the graph is built from. The caller decides where each list
 * comes from (repo, API, or both with the API winning per id); every list may
 * be left out, which only means the graph has none of that kind.
 */
export interface GraphSnapshot {
  songs?: readonly Song[];
  progressions?: readonly ProgressionInput[];
  artists?: readonly ArtistRecord[];
  releases?: readonly ReleaseRecord[];
  studios?: readonly StudioRecord[];
  labels?: readonly LabelRecord[];
  places?: readonly PlaceRecord[];
  /**
   * Globe events: their nodes, and each `evt-` event's own edges. Without
   * them every event a Teach day, pathway or arc names is `missing`.
   */
  events?: readonly GlobeEventInput[];
  /** The globe's song pins (`artist_location` items). */
  artistLocations?: readonly ArtistLocationInput[];
  dayStubs?: readonly Pick<
    DayStub,
    'slug' | 'label' | 'songId' | 'globeEventIds'
  >[];
  pathways?: readonly Pick<HistoricalModule, 'id' | 'title' | 'eventIds'>[];
  influenceArcs?: readonly InfluenceArc[];
  /**
   * The owner-reviewed instrument → genre table (`INSTRUMENT_GENRES`). Passed
   * in, like the pathways and arcs, so a snapshot that leaves it out has no
   * `typical_in` edges and no instrument nodes it does not use.
   */
  instrumentGenres?: Readonly<Record<string, readonly TypicalGenre[]>>;
  /**
   * Who and what each globe event is about, read from its title and tags,
   * by event id (`matchSnapshotEvents`). The caller runs the matcher because
   * the answer depends on every artist, song, place and genre at once; an
   * event with no entry is about no one the graph can guess.
   */
  eventMatches?: ReadonlyMap<string, EventMatch>;
  /**
   * The year the snapshot was taken, for spans still open: an artist with no
   * `activeTo` is still active this year. Passed in, so the graph stays a
   * function of its snapshot rather than of the clock.
   */
  asOfYear?: number;
  /** API state per item, keyed by canonical id. */
  statuses?: ReadonlyMap<EntityId, ItemStatus>;
}

/**
 * The lists a snapshot holds, by name. The rest are about the lists: the
 * event matches, the snapshot's year, the item states, and the instrument
 * table, which is a lookup rather than a list of items.
 */
export type SnapshotList = Exclude<
  keyof GraphSnapshot,
  'statuses' | 'eventMatches' | 'asOfYear' | 'instrumentGenres'
>;

/**
 * A snapshot item the graph could not read: a partial body that threw on the
 * way in. It is left out of the graph and named here, so integrity can say
 * which item to open (see UNREADABLE ITEMS above).
 */
export interface UnreadableItem {
  list: SnapshotList;
  /** Its position in that list. */
  index: number;
  /** Its id, when that much of it could be read. */
  item?: EntityId;
  /** What went wrong. */
  message: string;
}

/**
 * Where each list's items keep their identity, and the node kind it names.
 * A third entry turns the field into the node's slug, where the two differ.
 */
const IDENTITY: Record<
  Exclude<SnapshotList, 'influenceArcs'>,
  [EntityKind, string, ((value: string) => string)?]
> = {
  songs: ['song', 'id'],
  progressions: ['progression', 'id'],
  artists: ['artist', 'slug'],
  releases: ['release', 'slug'],
  studios: ['studio', 'slug'],
  labels: ['label', 'slug'],
  places: ['place', 'id'],
  events: ['event', 'id'],
  // Keyed by the act's name in lowercase; it pins the artist of that name.
  artistLocations: ['artist', 'id', artistSlug],
  dayStubs: ['teach_day', 'slug'],
  pathways: ['pathway', 'id'],
};

/**
 * An item's own id. A string is used as written (an empty one makes a
 * malformed node, which integrity reports by its id); a progression's number
 * is its slug; a body with neither cannot be a node, so it is unreadable.
 */
function ownId(kind: EntityKind, value: unknown): EntityId {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return ref(kind, String(value));
  }
  if (typeof value === 'string') return ref(kind, value);
  throw new Error(`It has no ${kind} id.`);
}

/** The id of an item that could not be read, if it has a usable one. */
function identityOf(list: SnapshotList, item: unknown): EntityId | undefined {
  if (list === 'influenceArcs' || !item || typeof item !== 'object') {
    return undefined;
  }
  const [kind, field, slugged] = IDENTITY[list];
  const value = (item as Record<string, unknown>)[field];
  const usable =
    typeof value === 'number' ? Number.isFinite(value) : present(value);
  if (!usable) return undefined;
  return canonicalId(
    ownId(kind, slugged && typeof value === 'string' ? slugged(value) : value),
  );
}

/**
 * `read` over one snapshot list, an item at a time. An item that throws is
 * recorded in `unreadable` and passed over; with nowhere to record it, the
 * error is rethrown, so a caller that did not ask for a list still hears.
 */
function forEachItem<T>(
  list: SnapshotList,
  items: readonly T[] | undefined,
  unreadable: UnreadableItem[] | undefined,
  read: (item: T) => void,
): void {
  (items ?? []).forEach((item, index) => {
    try {
      read(item);
    } catch (error) {
      if (!unreadable) throw error;
      const id = identityOf(list, item);
      unreadable.push({
        list,
        index,
        ...(id ? { item: id } : {}),
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

/**
 * Every edge the snapshot's records state, before merging. An item that
 * cannot be read goes into `unreadable` when given one (see `forEachItem`).
 * Given `names`, the songs' printed names for the people they name are kept
 * there too (`PrintedNames`), for the graph's labels.
 */
export function deriveSnapshotEdges(
  snapshot: GraphSnapshot,
  unreadable?: UnreadableItem[],
  names?: PrintedNames,
): Edge[] {
  const s = snapshot;
  const edges: Edge[] = [];
  const each = <T>(
    list: SnapshotList,
    items: readonly T[] | undefined,
    derive: (item: T) => readonly Edge[],
  ) =>
    forEachItem(list, items, unreadable, (item) => {
      edges.push(...derive(item));
    });

  // First definition wins, as for nodes: the caller has merged API over repo.
  const studios = new Map<EntityId, StudioRecord>();
  for (const studio of s.studios ?? []) {
    if (!present(studio?.slug)) continue;
    const id = ref('studio', studio.slug);
    if (!studios.has(id)) studios.set(id, studio);
  }
  const artists = new Map<EntityId, ArtistRecord>();
  for (const artist of s.artists ?? []) {
    if (!present(artist?.slug)) continue;
    const id = ref('artist', artist.slug);
    if (!artists.has(id)) artists.set(id, artist);
  }

  each('songs', s.songs, (song) => {
    const own = edgesForSong(song, names);
    return [
      ...own,
      ...edgesForSongYear(song),
      ...edgesForStudioPlace(own, studios),
    ];
  });
  // `edgesForProgression` iterates both lists; a partial entry may lack them.
  each('progressions', s.progressions, (p) =>
    edgesForProgression({
      ...p,
      vibes: p.vibes ?? [],
      styles: p.styles ?? [],
    }),
  );
  each('artists', s.artists, (artist) => edgesForArtist(artist, s.asOfYear));
  each('releases', s.releases, edgesForRelease);
  each('studios', s.studios, edgesForStudio);
  each('labels', s.labels, edgesForLabel);
  each('places', s.places, edgesForPlace);
  each('dayStubs', s.dayStubs, edgesForDayStub);
  each('pathways', s.pathways, edgesForPathway);
  each('influenceArcs', s.influenceArcs, (arc) => edgesForInfluenceArcs([arc]));
  each('events', s.events, (event) =>
    edgesForEvent(event, s.eventMatches?.get(event.id)),
  );
  each('artistLocations', s.artistLocations, (location) =>
    edgesForArtistLocation(
      location,
      artists.get(ref('artist', artistSlug(location.id))),
    ),
  );
  for (const [instrument, genres] of Object.entries(s.instrumentGenres ?? {})) {
    edges.push(...edgesForInstrument(instrument, genres));
  }
  return edges;
}

/**
 * The part of a snapshot `matchSnapshotEvents` reads. A registry artist is
 * enough (`MatchableArtist`); the places are the registered cities.
 */
export interface EventMatchSources {
  events?: readonly GlobeEventInput[];
  artists?: readonly MatchableArtist[];
  songs?: readonly Song[];
  places?: readonly Partial<
    Pick<PlaceRecord, 'name' | 'country' | 'subdivision' | 'genres'>
  >[];
}

/**
 * Every name a tag can mean a place or a genre by, as written: the
 * registered cities with their countries and states, every city and country
 * an event is set in, the genre vocabulary's names and ids, every subgenre,
 * every string the genre table reads, and the genre strings the events and
 * cities carry. A city also counts with its state or its country as one name
 * ('Portland, Maine', 'Kingston Jamaica'), so that a registry entry called
 * 'Portland, Maine' is refused as one called 'Portland' would be.
 *
 * These are the names the event matcher refuses on a tag alone
 * (`matchSnapshotEvents`), and the artist registry's guard test holds the
 * registry to the same lists, so the two cannot drift apart.
 */
export function placeAndGenreNames(
  sources: Pick<EventMatchSources, 'events' | 'places'>,
): { placeNames: Set<string>; genreNames: Set<string> } {
  const placeNames = new Set<string>();
  const genreNames = new Set<string>([
    ...GENRES.flatMap((g) => [g.id, g.name]),
    ...Object.keys(SUBGENRE_PARENT),
    ...Object.keys(TAG_TO_SUBGENRE),
    ...Object.keys(TAG_TO_GENRE),
  ]);
  const addAll = (
    into: Set<string>,
    values: readonly unknown[] | undefined,
  ) => {
    for (const value of values ?? []) if (present(value)) into.add(value);
  };
  // A city with its state or its country, as one name.
  const joined = (city: unknown, ...wider: unknown[]) =>
    present(city) ? wider.filter(present).map((w) => `${city} ${w}`) : [];
  for (const place of sources.places ?? []) {
    addAll(placeNames, [place?.name, place?.country, place?.subdivision]);
    addAll(placeNames, joined(place?.name, place?.subdivision, place?.country));
    addAll(genreNames, Array.isArray(place?.genres) ? place.genres : []);
  }
  for (const event of sources.events ?? []) {
    const city = event?.location?.city;
    const country = event?.location?.country;
    addAll(placeNames, [city, country, ...joined(city, country)]);
    addAll(genreNames, Array.isArray(event?.genre) ? event.genre : []);
  }
  return { placeNames, genreNames };
}

/**
 * Who and what each globe event is about, for `GraphSnapshot.eventMatches`:
 * the globe's own matcher (`eventMatches.ts`) run over the snapshot's
 * artists and songs.
 *
 * A tag that names a place or a genre never counts on its own, so the
 * matcher is handed every such name the Atlas knows (`placeAndGenreNames`).
 * The repo's registry has no such name (a guard test keeps it so), but an
 * artist the console creates can: a record called Chicago would otherwise be
 * the subject of every event tagged with the city.
 *
 * A song is by whoever the graph says performed it (its lead act, billed
 * credits or the guess from its artist line), which is what a song match has
 * to agree with; an event that stores its artists is about those, for its
 * songs too. A partial body is passed over rather than stopping the rest: a
 * song the graph cannot read performs for no one here, and an event whose
 * tags cannot be read is about no one the matcher can name.
 */
export function matchSnapshotEvents(
  sources: EventMatchSources,
): Map<string, EventMatch> {
  const { placeNames, genreNames } = placeAndGenreNames(sources);

  const artists = (sources.artists ?? []).filter(
    (a) => present(a?.slug) && present(a?.name),
  );
  const songs: MatchableSong[] = [];
  for (const song of sources.songs ?? []) {
    if (!present(song?.id) || !present(song.title)) continue;
    try {
      const performers = edgesForSong(song).filter(
        (e) => e.kind === 'performed_by',
      );
      songs.push({
        id: song.id,
        title: song.title,
        artistIds: performers.map((e) => slugOf(e.to)),
      });
    } catch {
      // Unreadable: `buildGraph` names it when it reads the same song.
    }
  }

  const matcher = createEventMatcher({
    artists,
    songs,
    placeNames,
    genreNames,
  });
  const matches = new Map<string, EventMatch>();
  for (const event of sources.events ?? []) {
    if (!present(event?.id)) continue;
    try {
      matches.set(event.id, matcher.match(event));
    } catch {
      // Tags that are not a list of strings name no one.
    }
  }
  return matches;
}

/**
 * The node every record in the snapshot defines, keyed by canonical id. An
 * item without a readable id goes into `unreadable` when given one.
 */
export function snapshotNodes(
  snapshot: GraphSnapshot,
  unreadable?: UnreadableItem[],
): GraphNode[] {
  const s = snapshot;
  const nodes = new Map<EntityId, GraphNode>();
  // First definition wins: the caller has already merged API over repo, so a
  // repeat is the same item twice, or a song event meeting its song.
  const put = (raw: EntityId, label: unknown, unverified?: boolean) => {
    const id = canonicalId(raw);
    if (nodes.has(id)) return;
    const status = s.statuses?.get(id);
    nodes.set(id, {
      id,
      kind: kindOf(id),
      label: text(label) || slugOf(id),
      status: status ?? 'code',
      origin: status ? 'api' : 'code',
      ...(unverified ? { unverified: true } : {}),
    });
  };
  const each = <T>(
    list: SnapshotList,
    items: readonly T[] | undefined,
    read: (item: T) => void,
  ) => forEachItem(list, items, unreadable, read);

  each('songs', s.songs, (song) => put(ownId('song', song.id), song.title));
  each('progressions', s.progressions, (p) =>
    put(ownId('progression', p.id), p.progression),
  );
  each('artists', s.artists, (a) =>
    put(ownId('artist', a.slug), a.name, a.unverified),
  );
  each('releases', s.releases, (r) =>
    put(ownId('release', r.slug), r.title, r.unverified),
  );
  each('studios', s.studios, (st) =>
    put(ownId('studio', st.slug), st.name, st.unverified),
  );
  each('labels', s.labels, (l) =>
    put(ownId('label', l.slug), l.name, l.unverified),
  );
  each('places', s.places, (p) => put(ownId('place', p.id), p.name));
  each('dayStubs', s.dayStubs, (d) => put(ownId('teach_day', d.slug), d.label));
  each('pathways', s.pathways, (p) => put(ownId('pathway', p.id), p.title));
  // Events last, so a song's event lands on the song rather than naming it.
  // A `song-<id>` event whose song the library lacks is a missing song, not
  // an event: the globe points at a recording that is not there.
  each('events', s.events, (e) => {
    const id = canonicalId(ownId('event', e.id));
    if (nodes.has(id)) return;
    if (id.startsWith('song:')) {
      nodes.set(id, missingNode(id, e.title));
    } else {
      put(id, e.title);
    }
  });
  return [...nodes.values()];
}

/* ── Assembly ────────────────────────────────────────────────────────── */

/**
 * Why a derived edge was left out of the graph:
 *  - `malformed` — an endpoint (or `on`) breaks its kind's slug grammar;
 *  - `endpoints` — well-formed, but the edge kind does not join those kinds;
 *  - `no-via` — it does not say which field states it (a deriver bug).
 */
export interface GraphViolation {
  reason: 'malformed' | 'endpoints' | 'no-via';
  /** The edge after canonicalization, with the field that stated it. */
  edge: Edge;
}

export interface EgoFilter {
  /** Only these edge kinds; all when absent. */
  edgeKinds?: readonly EdgeKind[];
  /** Walk on through unconfirmed edges too. */
  includeUnverified?: boolean;
  /** Walk on through edges guessed from free text too. */
  includeInferred?: boolean;
  /**
   * Nodes the walk shows but does not go on through: the map's hubs, where a
   * genre or a key would bring in hundreds of songs that share nothing else
   * with the focus. The focus itself is always walked.
   */
  stopAt?: (id: EntityId) => boolean;
  /**
   * A node the walk would go on through more than this many edges from is a
   * stop too, whatever its kind: a big city, a label with its catalogue.
   * Counted the walk's own way, so the filters count: a guessed or
   * unconfirmed edge adds to it once the walk follows those, and an edge
   * kind left out adds nothing. A count of every solid edge would miss a
   * city joined mostly by guesses just when the walk starts following them.
   */
  stopAbove?: number;
}

export interface EgoNetwork {
  /** The canonical focus id. */
  focus: EntityId;
  /** Focus first, then in the order the walk reached them. */
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** Each node's distance from the focus: 0, 1 or 2. */
  hopOf: ReadonlyMap<EntityId, number>;
  /**
   * The nodes `stopAt` or `stopAbove` kept the walk from going on through,
   * each with how many nodes it would have led on to: the other ends of its
   * walkable edges that are not in the network. The map writes it beside the
   * hub ("+130 via Detroit"), so a stop does not read as a dead end. Only
   * nodes the walk would otherwise have gone on from are here; at the last
   * hop nothing is.
   */
  stopped: ReadonlyMap<EntityId, number>;
}

export interface Graph {
  nodes: ReadonlyMap<EntityId, GraphNode>;
  edges: readonly GraphEdge[];
  /** Every edge touching a node, either direction. `on` is context, not an end. */
  adjacency: ReadonlyMap<EntityId, readonly GraphEdge[]>;
  /**
   * How many solid edges (neither guessed nor unconfirmed) touch a node,
   * across the whole graph and whatever the map's filters: how much of a
   * node is stated rather than guessed. The map's own hub test counts what
   * its walk follows instead (`EgoFilter.stopAbove`).
   */
  solidDegree(id: EntityId): number;
  violations: readonly GraphViolation[];
  /** Snapshot items that could not be read at all, one entry per item. */
  unreadable: readonly UnreadableItem[];
  /** The mind map's neighbourhood of one node (see HOP EXPANSION above). */
  egoNetwork(focus: EntityId, hops?: number, filter?: EgoFilter): EgoNetwork;
}

const kindOf = (id: EntityId): EntityKind =>
  id.slice(0, id.indexOf(':')) as EntityKind;

const slugOf = (id: EntityId): string => id.slice(id.indexOf(':') + 1);

/**
 * A slug as words: `russ-kunkel` → "Russ Kunkel". Only for a person no
 * record prints a name for, so their dot can still be read.
 */
export const humanizeSlug = (slug: string): string =>
  slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

/**
 * A node something points at but nothing defines. Its label is the name a
 * record gave it (an event's title; the name a song's credits print for a
 * person), else, for a person, their slug as words, else the slug itself,
 * so a malformed id stays visible as it is.
 */
function missingNode(id: EntityId, label?: unknown): GraphNode {
  const kind = kindOf(id);
  return {
    id,
    kind,
    label:
      text(label) ||
      (kind === 'artist' ? humanizeSlug(slugOf(id)) : '') ||
      slugOf(id),
    status: 'missing',
    origin: 'code',
  };
}

/* The code vocabularies, as slug → label per kind. Built on first use. */

// Typed against SongMode, so a mode added there fails to compile here.
const MODE_NAMES: Record<SongMode, string> = {
  major: 'Major',
  minor: 'Minor',
  dorian: 'Dorian',
  mixolydian: 'Mixolydian',
  phrygian: 'Phrygian',
  lydian: 'Lydian',
  locrian: 'Locrian',
  aeolian: 'Aeolian',
  ionian: 'Ionian',
};

const ACCIDENTAL_MARK: Record<string, string> = { flat: '♭', sharp: '♯' };

const humanize = (slug: string): string =>
  slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

let vocabulary: ReadonlyMap<EntityKind, ReadonlyMap<string, string>> | null =
  null;

function vocabularyLabel(id: EntityId): string | null {
  const parsed = parseEntityId(id);
  if (!parsed) return null;
  if (parsed.kind === 'key') {
    // Any well-formed tonic is a key: 'e-flat' → 'E♭'.
    if (!SLUG_PATTERN.key.test(parsed.slug)) return null;
    const [letter, accidental] = parsed.slug.split('-');
    return letter.toUpperCase() + (ACCIDENTAL_MARK[accidental ?? ''] ?? '');
  }
  if (parsed.kind === 'year' || parsed.kind === 'decade') {
    // Every well-formed year and decade is on the calendar, named as written.
    return SLUG_PATTERN[parsed.kind].test(parsed.slug) ? parsed.slug : null;
  }
  vocabulary ??= new Map<EntityKind, ReadonlyMap<string, string>>([
    ['genre', new Map(GENRES.map((g) => [g.id, g.name]))],
    [
      'subgenre',
      new Map(Object.keys(SUBGENRE_PARENT).map((s) => [s, humanize(s)])),
    ],
    ['instrument', new Map(SESSION_INSTRUMENTS.map((i) => [i.id, i.name]))],
    [
      'vibe',
      new Map(Object.keys(VIBE_ALGORITHMS).map((v) => [v, humanize(v)])),
    ],
    ['mode', new Map(Object.entries(MODE_NAMES))],
    ['era', new Map(MUSICAL_ERAS.map((e) => [e.id, e.label]))],
    ['place', new Map(REGIONS.map((r) => [`region-${r.id}`, r.label]))],
  ]);
  return vocabulary.get(parsed.kind)?.get(parsed.slug) ?? null;
}

const canonicalEdge = (edge: Edge): Edge => ({
  ...edge,
  from: canonicalId(edge.from),
  to: canonicalId(edge.to),
  ...(edge.on ? { on: canonicalId(edge.on) } : {}),
  ...(edge.via
    ? { via: { ...edge.via, item: canonicalId(edge.via.item) } }
    : {}),
});

function problemWith(edge: Edge): 'malformed' | 'endpoints' | null {
  const ends = [edge.from, edge.to, ...(edge.on ? [edge.on] : [])];
  if (!ends.every(isWellFormed)) return 'malformed';
  return isValidEdge(edge) ? null : 'endpoints';
}

/**
 * Fold one more source of the same connection into a merged edge. A source
 * is its item and field, and the item behind a song pin (`statedBy`).
 */
function mergeInto(target: GraphEdge, edge: Edge, via: EdgeVia) {
  const same = (v: EdgeVia) =>
    v.item === via.item &&
    v.path === via.path &&
    v.statedBy?.id === via.statedBy?.id;
  if (!target.via.some(same)) target.via.push(via);
  // Solid as soon as one source is: a linked field outweighs any guess.
  if (!edge.inferred) delete target.inferred;
  if (!edge.unverified) delete target.unverified;
  if (target.year === undefined && edge.year !== undefined) {
    target.year = edge.year;
  }
  const sources = new Set(
    [target.source, edge.source].flatMap((s) => (s ? s.split('; ') : [])),
  );
  if (sources.size) target.source = [...sources].join('; ');
}

/**
 * Nodes plus edges → the graph: canonicalize, validate, merge, walk each
 * subgenre up to its genre and each year up to its decade and era, fill in
 * the nodes edges point at, index.
 * `buildGraph` is this over a snapshot; it is exported on its own for
 * overlays (a draft's edges over the snapshot's), which is why seeds are
 * folded here too rather than trusted to arrive canonical.
 * `names` are the printed names the edges were derived from
 * (`deriveSnapshotEdges`): a missing person is labelled with theirs.
 */
export function assembleGraph(
  seeds: Iterable<GraphNode>,
  derived: Iterable<Edge>,
  unreadable: readonly UnreadableItem[] = [],
  names?: ReadonlyMap<EntityId, string>,
): Graph {
  const nodes = new Map<EntityId, GraphNode>();
  // A seeded `event:song-x` left unfolded would sit beside the `song:x` its
  // edges fold onto: two nodes for one recording, the API status on the
  // wrong one. First definition wins, as in snapshotNodes. A seed whose id
  // breaks its grammar is kept, not dropped: integrity reports every such
  // node by its own id.
  for (const seed of seeds) {
    const id = canonicalId(seed.id);
    if (nodes.has(id)) continue;
    nodes.set(id, id === seed.id ? seed : { ...seed, id, kind: kindOf(id) });
  }

  const violations: GraphViolation[] = [];
  const merged = new Map<string, GraphEdge>();
  const add = (raw: Edge) => {
    const edge = canonicalEdge(raw);
    const via = edge.via;
    if (!via) {
      violations.push({ reason: 'no-via', edge });
      return;
    }
    const reason = problemWith(edge);
    if (reason) {
      violations.push({ reason, edge });
      return;
    }
    const key = `${edge.from}|${edge.kind}|${edge.to}|${edge.on ?? ''}`;
    const existing = merged.get(key);
    if (existing) mergeInto(existing, edge, via);
    else merged.set(key, { ...edge, via: [via] });
  };
  for (const raw of derived) add(raw);

  // Every subgenre something is filed under walks up to its genre, so the
  // genre reaches it. Parents are genres, so one pass finds them all. Every
  // year something is from walks up to its decade and era the same way; a
  // year is well formed by now, or its edge would have been refused.
  const subgenres = new Set<string>();
  const years = new Set<string>();
  for (const edge of merged.values()) {
    for (const end of [edge.from, edge.to]) {
      if (kindOf(end) === 'subgenre') subgenres.add(slugOf(end));
      if (kindOf(end) === 'year') years.add(slugOf(end));
    }
  }
  for (const subgenre of subgenres) edgesForSubgenre(subgenre).forEach(add);
  for (const year of years) edgesForYear(Number(year)).forEach(add);

  const edges = [...merged.values()];

  // The printed names by canonical id, as the edges' ends are by now.
  const printed = new Map<EntityId, string>();
  for (const [id, name] of names ?? []) {
    const canon = canonicalId(id);
    if (!printed.has(canon)) printed.set(canon, name);
  }
  const ensure = (id: EntityId) => {
    if (nodes.has(id)) return;
    const label = vocabularyLabel(id);
    nodes.set(
      id,
      label === null
        ? missingNode(id, printed.get(id))
        : { id, kind: kindOf(id), label, status: 'code', origin: 'code' },
    );
  };
  const adjacency = new Map<EntityId, GraphEdge[]>();
  const solidDegrees = new Map<EntityId, number>();
  const touch = (id: EntityId, edge: GraphEdge) => {
    const list = adjacency.get(id);
    if (list) list.push(edge);
    else adjacency.set(id, [edge]);
    if (!edge.inferred && !edge.unverified) {
      solidDegrees.set(id, (solidDegrees.get(id) ?? 0) + 1);
    }
  };
  for (const edge of edges) {
    ensure(edge.from);
    ensure(edge.to);
    if (edge.on) ensure(edge.on);
    touch(edge.from, edge);
    if (edge.to !== edge.from) touch(edge.to, edge);
  }

  const egoNetwork = (
    focusId: EntityId,
    hops = 1,
    filter: EgoFilter = {},
  ): EgoNetwork => {
    const focus = canonicalId(focusId);
    const hopOf = new Map<EntityId, number>();
    const walked = new Set<GraphEdge>();
    const stopped = new Map<EntityId, number>();
    if (!nodes.has(focus)) {
      return { focus, nodes: [], edges: [], hopOf, stopped };
    }

    // `hops` arrives from the map's URL (`?hops=`); a garbled value is the
    // default, not a lone focus with nothing around it.
    const asked = Math.floor(Number(hops));
    const depth = Number.isNaN(asked) ? 1 : Math.min(2, Math.max(0, asked));
    const kinds = filter.edgeKinds ? new Set(filter.edgeKinds) : null;
    const shown = (e: GraphEdge) => !kinds || kinds.has(e.kind);
    const solid = (e: GraphEdge) =>
      shown(e) &&
      (filter.includeUnverified || !e.unverified) &&
      (filter.includeInferred || !e.inferred);
    // Asked once per node, and only of nodes the walk could go on from.
    const stopsHere = new Map<EntityId, boolean>();
    const isStop = (id: EntityId): boolean => {
      let stop = stopsHere.get(id);
      if (stop === undefined) {
        stop = !!filter.stopAt?.(id);
        if (!stop && filter.stopAbove !== undefined) {
          const onward = (adjacency.get(id) ?? []).filter(solid).length;
          stop = onward > filter.stopAbove;
        }
        stopsHere.set(id, stop);
      }
      return stop;
    };

    hopOf.set(focus, 0);
    const stops = new Set<EntityId>();
    let frontier: EntityId[] = [focus];
    for (let hop = 1; hop <= depth; hop++) {
      const next = new Set<EntityId>();
      for (const id of frontier) {
        for (const edge of adjacency.get(id) ?? []) {
          // The focus shows all it touches; past it, only solid edges walk.
          if (hop === 1 ? !shown(edge) : !solid(edge)) continue;
          const other = edge.from === id ? edge.to : edge.from;
          walked.add(edge);
          if (!hopOf.has(other)) hopOf.set(other, hop);
          if (hopOf.get(other) !== hop || !solid(edge)) continue;
          // Nothing walks on from the last hop, so nothing there is a stop.
          if (hop === depth) continue;
          if (isStop(other)) stops.add(other);
          else next.add(other);
        }
      }
      frontier = [...next];
    }
    // What each stop would have led on to, counted the way the walk would
    // have gone: through its solid edges, to nodes not already shown.
    for (const id of stops) {
      const onward = new Set<EntityId>();
      for (const edge of adjacency.get(id) ?? []) {
        if (!solid(edge)) continue;
        const other = edge.from === id ? edge.to : edge.from;
        if (!hopOf.has(other)) onward.add(other);
      }
      stopped.set(id, onward.size);
    }
    return {
      focus,
      nodes: [...hopOf.keys()].map((id) => nodes.get(id)!),
      edges: [...walked],
      hopOf,
      stopped,
    };
  };

  const solidDegree = (id: EntityId): number =>
    solidDegrees.get(canonicalId(id)) ?? 0;

  return {
    nodes,
    edges,
    adjacency,
    solidDegree,
    violations,
    unreadable,
    egoNetwork,
  };
}

/**
 * The Atlas graph for one snapshot. About 4.8k nodes and 18k edges on the
 * repo's own data, so the console builds it memoized on the main thread.
 * A partial body never throws out of here; it lands in `unreadable`.
 */
export function buildGraph(snapshot: GraphSnapshot): Graph {
  const unreadable: UnreadableItem[] = [];
  const nodes = snapshotNodes(snapshot, unreadable);
  const names: PrintedNames = new Map();
  const edges = deriveSnapshotEdges(snapshot, unreadable, names);
  // An item unreadable both as a node and for its edges is one problem.
  const seen = new Set<string>();
  const once = unreadable.filter((u) => {
    const key = `${u.list}#${u.index}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return assembleGraph(nodes, edges, once, names);
}
