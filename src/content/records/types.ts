import type { City, HistoricalEvent } from '@/components/atlas/types';
import type { Credit } from '@/curriculum/types/songLibrary';

/**
 * The Atlas's people, records, rooms and companies, as content records.
 *
 * Each is a content kind the console edits and the API stores, and each is a
 * node in the graph. A record holds only facts that belong to it; everything
 * that connects it to something else is a reference field holding the other
 * thing's slug (`labelId: 'motown'`), and the graph derives its edges from
 * those fields — there is no separate edge store (src/content/graph).
 *
 * One owner per fact. A song says which records it appears on
 * (`song.releases`), so a release has no tracklist; where and with whom a
 * recording was made lives on the song's session and credits, so a release
 * says only what the release itself is — its label, format, year. Anything
 * that reads both ways is computed, never stated twice.
 *
 * Identity is `slug` for every kind here, kebab-case (see
 * src/content/graph/ids.ts). Songs, globe events and cities keep the `id`
 * field they already had.
 *
 * `unverified` and `source` sit on anything that can be wrong: shown muted,
 * never filtered out, and saying where the claim came from.
 *
 * These interfaces are the source of truth for the API's body schemas:
 * src/scripts/apiContract/recordBodySchemas.ts is generated from this file.
 * Use only what that generator understands — named interfaces, string
 * unions, arrays, tuples, optional fields, and a `@pattern` tag on a string
 * field — and it will refuse the rest.
 */

/** Other catalogues' ids for the same thing, for matching and for linking out. */
export interface ExternalIds {
  /** MusicBrainz id (artist, release group or label MBID). */
  mbid?: string;
  /** Discogs id, numeric, as a string. */
  discogs?: string;
  /** Wikidata QID: 'Q2831'. */
  wikidata?: string;
}

/** A member of a group, on the group's record. */
export interface ArtistMember {
  /** The member's artist slug. A member is an artist in their own right. */
  artistId: string;
  /** Year they joined, when known. */
  from?: number;
  /** Year they left; absent while they are still a member. */
  to?: number;
  /** SESSION_INSTRUMENTS ids they played in this group. */
  instrumentIds?: string[];
  unverified?: boolean;
  source?: string;
}

/**
 * An artist who influenced this one, on the influenced artist's record.
 *
 * Artist-level influence is the one relationship an editor states outright,
 * because no other record implies it (approved 29 Sep 2026). The globe's
 * event-to-event influence arcs stay where they are; the console flags an
 * artist influence that merely restates one of them.
 */
export interface ArtistInfluence {
  /** The influencing artist's slug. */
  artistId: string;
  unverified?: boolean;
  source?: string;
}

/**
 * When and where an artist was born; for a group, when it formed.
 *
 * A group's birthplace is its City (`basedInPlaceId`, where it formed), so on
 * a group only `date` is read.
 */
export interface ArtistBirth {
  /**
   * As precise as the source is: '1939', '1939-04' or '1939-04-02'. For a
   * group, the year it formed. The pattern holds the month to 01–12 and the
   * day to 01–31; whether that day is in that month is integrity's check.
   * @pattern ^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$
   */
  date?: string;
  /** Where a person was born: a globe city id (a `pin: false` place when the globe draws no pin there). */
  placeId?: string;
  unverified?: boolean;
  source?: string;
}

/**
 * A person or a group — one kind for both, because a solo artist is both and a
 * band's members are artists too. Producers, engineers and session players are
 * artists; the role they played lives on the song's credits.
 */
export interface ArtistRecord {
  /** Identity: `artistSlug(name)` — accents folded, apostrophes dropped, '&' → 'and'. */
  slug: string;
  /** Display name with its real casing and diacritics: 'Cesária Évora'. */
  name: string;
  /** Other spellings that resolve here: 'Andy Grammar' for Andy Grammer. */
  aliases?: string[];
  /** A group rather than one person. */
  group?: boolean;
  /** On a group: who was in it. */
  members?: ArtistMember[];
  /** Born, or for a group formed: a date and (a person's) birthplace. */
  born?: ArtistBirth;
  /** Where they are from or were based: a globe city id. */
  basedInPlaceId?: string;
  /** First year active. */
  activeFrom?: number;
  /** Last year active; absent while active. */
  activeTo?: number;
  /** Genre or subgenre ids from the vocabulary. */
  genreIds?: string[];
  /** SESSION_INSTRUMENTS ids they are known for. */
  instrumentIds?: string[];
  /** Label slugs they were signed to. */
  labelIds?: string[];
  /** Artists who influenced this one. */
  influencedBy?: ArtistInfluence[];
  /** A few sentences for the console's artist view. */
  bio?: string;
  externalIds?: ExternalIds;
  unverified?: boolean;
  source?: string;
}

/** What kind of release a record is. */
export type ReleaseFormat =
  | 'album'
  | 'single'
  | 'ep'
  | 'compilation'
  | 'live'
  | 'soundtrack';

/**
 * A record: an album, single or EP as issued. (The kind is called `release`
 * because "record" already means a content record; the console calls it
 * Records.) Songs point here through `song.releases`; there is no tracklist.
 */
export interface ReleaseRecord {
  /** `<artist-slug>-<title-slug>`, with `-<year>` when that alone is ambiguous. */
  slug: string;
  title: string;
  /** The billed artists' slugs, in billing order. */
  artistIds: string[];
  format: ReleaseFormat;
  /** Release year. */
  year?: number;
  /** The issuing label's slug. */
  labelId?: string;
  catalogNumber?: string;
  /** Cover art, as a served URL (like artist images). */
  coverRef?: string;
  externalIds?: ExternalIds;
  unverified?: boolean;
  source?: string;
}

/** A recording studio. Songs point here through `session.studioId`. */
export interface StudioRecord {
  slug: string;
  /** 'Hitsville U.S.A.' */
  name: string;
  /** 'Studio A', 'Motown Studio A'. */
  aliases?: string[];
  /** The city it is in: a globe city id. */
  placeId?: string;
  openedYear?: number;
  closedYear?: number;
  /** [lat, lng] of the building, when it should get its own pin. */
  coordinates?: [number, number];
  description?: string;
  /** A photo, as a served URL. */
  imageRef?: string;
  unverified?: boolean;
  source?: string;
}

/** A record label. Releases and artists point here. */
export interface LabelRecord {
  slug: string;
  /** 'Tamla' */
  name: string;
  aliases?: string[];
  /** Where it was based: a globe city id. */
  placeId?: string;
  /** The label it is an imprint of: Tamla → Motown. */
  parentLabelId?: string;
  foundedYear?: number;
  defunctYear?: number;
  description?: string;
  unverified?: boolean;
  source?: string;
}

/**
 * A place: the globe's own City, stored as content. `globe_city` becomes the
 * one registry of places; its body is the City the globe already renders plus
 * these fields.
 */
export interface PlaceRecord extends City {
  /** Other names that resolve here: 'New York' for New York City. */
  aliases?: string[];
  /**
   * Whether the globe draws a pin for it. A hometown or a studio's town can be
   * a place without being a pin; absent means true.
   */
  pin?: boolean;
}

/**
 * A globe event as a content record (`globe_event`, body v2): the globe's
 * `HistoricalEvent` plus ids for who and what it is about.
 *
 * Two kinds of event share the shape.
 *  - A hand-authored `evt-` event is edited in the console. On it,
 *    `artistIds`, `songIds` and `placeId` absent mean the graph infers them
 *    (from the title, the tags and the city, shown as guesses); the records,
 *    studios and labels are never inferred, so absent means not stated. `[]`
 *    means reviewed: exactly none.
 *  - A `song-` event is derived by the server from its song and not edited.
 *    It carries the song's recording (`label`, `studio`, `recordedYear`,
 *    `credits`) and its ids, each omitted when the song gives it no value —
 *    never `[]`. The graph reads no field of it: the song is the node.
 */
export interface GlobeEventRecord extends HistoricalEvent {
  /** Artist slugs it is about, lead act first. Absent = inferred, [] = none (evt- only). */
  artistIds?: string[];
  /** Song ids it is about. Absent = inferred, [] = none (evt- only). */
  songIds?: string[];
  /**
   * Where it happened: a globe city id. Absent = placed from `location.city`.
   * On a `song-` event, where the song was recorded (`session.placeId`); it
   * never moves the pin, which `location` holds.
   */
  placeId?: string;
  /** Release slugs it is about; a `song-` event's are its song's `releases[].releaseId`. Absent = not stated (nothing infers it), [] = none (evt- only). */
  releaseIds?: string[];
  /** Studio slugs it is about; a `song-` event's is its song's `session.studioId`. Absent = not stated (nothing infers it), [] = none (evt- only). */
  studioIds?: string[];
  /**
   * Label slugs it is about. A `song-` event's is its song's
   * `session.labelId`, only when the song has no releases (a release names
   * its own label). Absent = not stated (nothing infers it), [] = none
   * (evt- only).
   */
  labelIds?: string[];
  unverified?: boolean;
  source?: string;
  /** `song-` events, derived: the song's `session.label`, as written. */
  label?: string;
  /** `song-` events, derived: the song's `session.studio`, as written. */
  studio?: string;
  /** `song-` events, derived: the song's `session.recordedYear`. */
  recordedYear?: number;
  /** `song-` events, derived: the song's `credits`, as they are. */
  credits?: Credit[];
}
