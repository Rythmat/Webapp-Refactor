// ─────────────────────────────────────────────────────────────────────────
//  GENERATED — do not edit.
//
//  `npx vitest run src/scripts/apiContract/__tests__/recordBodySchemas.test.ts`
//  regenerates this from src/content/records/types.ts (with the globe's City
//  and HistoricalEvent from src/components/atlas/types/index.ts, and Credit
//  from src/curriculum/types/songLibrary.ts) and fails if what is committed
//  here has drifted from them. Set WRITE_CONTRACT=1 to rewrite it.
//
//  These are the bodies the content API must accept on
//  `PUT /api/admin/content/items` for the record kinds and `globe_event`,
//  keyed by kind in `recordBodySchemas` below. See
//  docs/console-content-api-contract.md.
// ─────────────────────────────────────────────────────────────────────────
import { z } from 'zod';

export const regionIdSchema = z.enum([
  'north-america',
  'central-america',
  'south-america',
  'north-europe',
  'west-europe',
  'east-europe',
  'north-asia',
  'central-asia',
  'west-asia',
  'east-asia',
  'south-asia',
  'southeast-asia',
  'north-africa',
  'central-africa',
  'west-africa',
  'east-africa',
  'south-africa',
  'oceania',
]);

export const citySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    country: z.string(),
    subdivision: z.string(),
    region: regionIdSchema,
    coordinates: z.tuple([z.number(), z.number()]),
    genres: z.array(z.string()),
    description: z.string(),
    activeDecades: z.array(z.number()),
  })
  .strict();

/**
 * Where an event is pinned: its coordinates, and its city and country as written.
 */
export const eventLocationSchema = z
  .object({
    lat: z.number(),
    lng: z.number(),
    city: z.string(),
    country: z.string(),
  })
  .strict();

export const historicalEventSchema = z
  .object({
    id: z.string(),
    year: z.number(),
    location: eventLocationSchema,
    genre: z.array(z.string()),
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()),
    videoId: z.string().optional(),
  })
  .strict();

/**
 * What someone did on the recording.
 * `performer` is the only role that carries an `instrument`; the rest are the
 * jobs a session credit names without one. Songwriters appear here AND in the
 * song's `composer` line — `composer` is the sentence a reader sees ("Written
 * by Ashford & Simpson"), these are the entities the constellation walks.
 */
export const creditRoleSchema = z.enum([
  'performer',
  'vocals',
  'producer',
  'engineer',
  'arranger',
  'conductor',
  'songwriter',
]);

/**
 * One name on the recording.
 * An ensemble is a credit like any other: session records routinely name the
 * group and not its players ("The Funk Brothers", "Detroit Symphony
 * Orchestra"), and inventing a roster to fill the gap would be worse than
 * saying what the label said.
 */
export const creditSchema = z
  .object({
    /** Display name: 'James Jamerson', 'The Funk Brothers'. */
    name: z.string(),
    role: creditRoleSchema,
    /** A `SESSION_INSTRUMENTS` id. Only meaningful for `performer`. */
    instrument: z.string().optional(),
    /** True when the name is a group rather than one person. */
    ensemble: z.boolean().optional(),
    /**
     * A billed artist on the record, not a sideman. `Song.artist` is the
     *  display line ("Marvin Gaye"); this marks everyone the label actually
     *  credited, which is how a duet gets both names into the constellation.
     */
    primary: z.boolean().optional(),
    /** Globe artist slug, when this name exists in the Globe's artist index. */
    artistGlobeId: z.string().optional(),
    /**
     * Set when this could not be pinned to a reliable source — renders muted
     *  and is excluded from the constellation until someone confirms it.
     */
    unverified: z.boolean().optional(),
    /** Where the credit came from: 'musicbrainz', a liner-notes URL. (v2) */
    source: z.string().optional(),
  })
  .strict();

/**
 * Other catalogues' ids for the same thing, for matching and for linking out.
 */
export const externalIdsSchema = z
  .object({
    /** MusicBrainz id (artist, release group or label MBID). */
    mbid: z.string().optional(),
    /** Discogs id, numeric, as a string. */
    discogs: z.string().optional(),
    /** Wikidata QID: 'Q2831'. */
    wikidata: z.string().optional(),
  })
  .strict();

/**
 * A member of a group, on the group's record.
 */
export const artistMemberSchema = z
  .object({
    /** The member's artist slug. A member is an artist in their own right. */
    artistId: z.string(),
    /** Year they joined, when known. */
    from: z.number().optional(),
    /** Year they left; absent while they are still a member. */
    to: z.number().optional(),
    /** SESSION_INSTRUMENTS ids they played in this group. */
    instrumentIds: z.array(z.string()).optional(),
    unverified: z.boolean().optional(),
    source: z.string().optional(),
  })
  .strict();

/**
 * An artist who influenced this one, on the influenced artist's record.
 * Artist-level influence is the one relationship an editor states outright,
 * because no other record implies it (approved 29 Sep 2026). The globe's
 * event-to-event influence arcs stay where they are; the console flags an
 * artist influence that merely restates one of them.
 */
export const artistInfluenceSchema = z
  .object({
    /** The influencing artist's slug. */
    artistId: z.string(),
    unverified: z.boolean().optional(),
    source: z.string().optional(),
  })
  .strict();

/**
 * When and where an artist was born; for a group, when it formed.
 * A group's birthplace is its City (`basedInPlaceId`, where it formed), so on
 * a group only `date` is read.
 */
export const artistBirthSchema = z
  .object({
    /**
     * As precise as the source is: '1939', '1939-04' or '1939-04-02'. For a
     * group, the year it formed. The pattern holds the month to 01–12 and the
     * day to 01–31; whether that day is in that month is integrity's check.
     */
    date: z
      .string()
      .regex(/^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$/)
      .optional(),
    /** Where a person was born: a globe city id (a `pin: false` place when the globe draws no pin there). */
    placeId: z.string().optional(),
    unverified: z.boolean().optional(),
    source: z.string().optional(),
  })
  .strict();

/**
 * A person or a group — one kind for both, because a solo artist is both and a
 * band's members are artists too. Producers, engineers and session players are
 * artists; the role they played lives on the song's credits.
 */
export const artistRecordSchema = z
  .object({
    /** Identity: `artistSlug(name)` — accents folded, apostrophes dropped, '&' → 'and'. */
    slug: z.string(),
    /** Display name with its real casing and diacritics: 'Cesária Évora'. */
    name: z.string(),
    /** Other spellings that resolve here: 'Andy Grammar' for Andy Grammer. */
    aliases: z.array(z.string()).optional(),
    /** A group rather than one person. */
    group: z.boolean().optional(),
    /** On a group: who was in it. */
    members: z.array(artistMemberSchema).optional(),
    /** Born, or for a group formed: a date and (a person's) birthplace. */
    born: artistBirthSchema.optional(),
    /** Where they are from or were based: a globe city id. */
    basedInPlaceId: z.string().optional(),
    /** First year active. */
    activeFrom: z.number().optional(),
    /** Last year active; absent while active. */
    activeTo: z.number().optional(),
    /** Genre or subgenre ids from the vocabulary. */
    genreIds: z.array(z.string()).optional(),
    /** SESSION_INSTRUMENTS ids they are known for. */
    instrumentIds: z.array(z.string()).optional(),
    /** Label slugs they were signed to. */
    labelIds: z.array(z.string()).optional(),
    /** Artists who influenced this one. */
    influencedBy: z.array(artistInfluenceSchema).optional(),
    /** A few sentences for the console's artist view. */
    bio: z.string().optional(),
    externalIds: externalIdsSchema.optional(),
    unverified: z.boolean().optional(),
    source: z.string().optional(),
  })
  .strict();

/**
 * What kind of release a record is.
 */
export const releaseFormatSchema = z.enum([
  'album',
  'single',
  'ep',
  'compilation',
  'live',
  'soundtrack',
]);

/**
 * A record: an album, single or EP as issued. (The kind is called `release`
 * because "record" already means a content record; the console calls it
 * Records.) Songs point here through `song.releases`; there is no tracklist.
 */
export const releaseRecordSchema = z
  .object({
    /** `<artist-slug>-<title-slug>`, with `-<year>` when that alone is ambiguous. */
    slug: z.string(),
    title: z.string(),
    /** The billed artists' slugs, in billing order. */
    artistIds: z.array(z.string()),
    format: releaseFormatSchema,
    /** Release year. */
    year: z.number().optional(),
    /** The issuing label's slug. */
    labelId: z.string().optional(),
    catalogNumber: z.string().optional(),
    /** Cover art, as a served URL (like artist images). */
    coverRef: z.string().optional(),
    externalIds: externalIdsSchema.optional(),
    unverified: z.boolean().optional(),
    source: z.string().optional(),
  })
  .strict();

/**
 * A recording studio. Songs point here through `session.studioId`.
 */
export const studioRecordSchema = z
  .object({
    slug: z.string(),
    /** 'Hitsville U.S.A.' */
    name: z.string(),
    /** 'Studio A', 'Motown Studio A'. */
    aliases: z.array(z.string()).optional(),
    /** The city it is in: a globe city id. */
    placeId: z.string().optional(),
    openedYear: z.number().optional(),
    closedYear: z.number().optional(),
    /** [lat, lng] of the building, when it should get its own pin. */
    coordinates: z.tuple([z.number(), z.number()]).optional(),
    description: z.string().optional(),
    /** A photo, as a served URL. */
    imageRef: z.string().optional(),
    unverified: z.boolean().optional(),
    source: z.string().optional(),
  })
  .strict();

/**
 * A record label. Releases and artists point here.
 */
export const labelRecordSchema = z
  .object({
    slug: z.string(),
    /** 'Tamla' */
    name: z.string(),
    aliases: z.array(z.string()).optional(),
    /** Where it was based: a globe city id. */
    placeId: z.string().optional(),
    /** The label it is an imprint of: Tamla → Motown. */
    parentLabelId: z.string().optional(),
    foundedYear: z.number().optional(),
    defunctYear: z.number().optional(),
    description: z.string().optional(),
    unverified: z.boolean().optional(),
    source: z.string().optional(),
  })
  .strict();

/**
 * A place: the globe's own City, stored as content. `globe_city` becomes the
 * one registry of places; its body is the City the globe already renders plus
 * these fields.
 */
export const placeRecordSchema = citySchema
  .extend({
    /** Other names that resolve here: 'New York' for New York City. */
    aliases: z.array(z.string()).optional(),
    /**
     * Whether the globe draws a pin for it. A hometown or a studio's town can be
     * a place without being a pin; absent means true.
     */
    pin: z.boolean().optional(),
  })
  .strict();

/**
 * A globe event as a content record (`globe_event`, body v2): the globe's
 * `HistoricalEvent` plus ids for who and what it is about.
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
export const globeEventRecordSchema = historicalEventSchema
  .extend({
    /** Artist slugs it is about, lead act first. Absent = inferred, [] = none (evt- only). */
    artistIds: z.array(z.string()).optional(),
    /** Song ids it is about. Absent = inferred, [] = none (evt- only). */
    songIds: z.array(z.string()).optional(),
    /**
     * Where it happened: a globe city id. Absent = placed from `location.city`.
     * On a `song-` event, where the song was recorded (`session.placeId`); it
     * never moves the pin, which `location` holds.
     */
    placeId: z.string().optional(),
    /** Release slugs it is about; a `song-` event's are its song's `releases[].releaseId`. Absent = not stated (nothing infers it), [] = none (evt- only). */
    releaseIds: z.array(z.string()).optional(),
    /** Studio slugs it is about; a `song-` event's is its song's `session.studioId`. Absent = not stated (nothing infers it), [] = none (evt- only). */
    studioIds: z.array(z.string()).optional(),
    /**
     * Label slugs it is about. A `song-` event's is its song's
     * `session.labelId`, only when the song has no releases (a release names
     * its own label). Absent = not stated (nothing infers it), [] = none
     * (evt- only).
     */
    labelIds: z.array(z.string()).optional(),
    unverified: z.boolean().optional(),
    source: z.string().optional(),
    /** `song-` events, derived: the song's `session.label`, as written. */
    label: z.string().optional(),
    /** `song-` events, derived: the song's `session.studio`, as written. */
    studio: z.string().optional(),
    /** `song-` events, derived: the song's `session.recordedYear`. */
    recordedYear: z.number().optional(),
    /** `song-` events, derived: the song's `credits`, as they are. */
    credits: z.array(creditSchema).optional(),
  })
  .strict();

/** What each record kind's body must satisfy, keyed by content kind. */
export const recordBodySchemas = {
  artist: artistRecordSchema,
  release: releaseRecordSchema,
  studio: studioRecordSchema,
  label: labelRecordSchema,
  globe_city: placeRecordSchema,
  globe_event: globeEventRecordSchema,
} as const;

export type RecordKind = keyof typeof recordBodySchemas;
