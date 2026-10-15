/**
 * ══════════════════════════════════════════════════════════════════════════
 *  The Music Atlas graph — what a thing is, and how things connect
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Everything the Atlas knows is a NODE with a stable id, and every connection
 * between two nodes is a typed EDGE. Songs, the artists who made them, the
 * progressions they use, the studios they were cut in, the cities those
 * studios are in, the labels that issued them, the instruments played on them.
 *
 * WHY IDS, AND WHY NAMESPACED IDS
 *
 * Today the Atlas connects things by matching strings. `artists.ts` derives the
 * artist index from lowercase entries in a flat `tags` bag, using title
 * patterns and a hand-maintained stop list to weed out labels and festivals.
 * The progression library points at a song as free text (`song: 'I Got
 * Rhythm'`). Every such link breaks the moment something is renamed, or spelled
 * with a different apostrophe.
 *
 * It also cannot tell two things apart that share a name. This library already
 * contains the case: **Chicago** is an artist on one song and a city on
 * forty-three globe events. `chicago` cannot mean both. `artist:chicago` and
 * `place:chicago` can.
 *
 * So an id carries its kind: `<kind>:<slug>`. The kind makes the id
 * self-describing, which means an edge is readable on its own and a picker in
 * the admin console can never hand back an ambiguous value.
 *
 * SLUG CONVENTION
 *
 * New slugs are kebab-case, matching the globe's existing artist slugs
 * (`wes-montgomery`) and its instrument ids (`electric-guitar`).
 *
 * Songs are the documented exception: their ids are snake_case
 * (`aint_no_mountain_high_enough`) and are referenced by globe event ids, set
 * list entries and content refs. Re-slugging 640 songs to win consistency
 * inside a namespace that is already unambiguous would be a poor trade, so
 * `song:` keeps the slug it has. `isWellFormed` knows this.
 *
 * WHAT THIS FILE IS NOT
 *
 * It is the vocabulary, not the store. Where edges are persisted, how they are
 * edited and how they reach production are separate questions — the store lives
 * server-side in music-atlas-api. Agreeing the vocabulary first is what lets
 * both halves be built against the same idea.
 */

import { isWellFormedSlug, toEntityId } from './ids';
import { toSlug } from './slugs';

/* ── Nodes ───────────────────────────────────────────────────────────── */

/**
 * Every kind of thing the Atlas can talk about.
 *
 * `artist` covers both a person and a group — Marvin Gaye is an artist, The
 * Funk Brothers is an artist. Splitting person from group sounds tidier and
 * immediately gets awkward: a solo artist is both, a band's members are people
 * who are also artists, and every edge would need to accept either. One kind
 * with a `group` flag on the record keeps the graph simple.
 */
export type EntityKind =
  | 'song'
  | 'artist'
  | 'progression'
  | 'genre'
  | 'vibe'
  | 'instrument'
  | 'label'
  | 'studio'
  | 'place'
  | 'era'
  | 'subgenre'
  | 'scene'
  | 'event'
  /**
   * Key and mode are facets people filter by, so they are nodes rather than
   * text on a song: `key:d`, `mode:dorian`. A key node is the tonic alone —
   * 'D minor' is `key:d` plus `mode:minor`, which lets someone ask for
   * everything in D, or everything dorian, without the two being welded
   * together in one string.
   */
  | 'key'
  | 'mode'
  /**
   * A record as issued — album, single, EP. Called `release` because "record"
   * already means a content record; the console labels it Records.
   */
  | 'release'
  /**
   * A day of the canonical Teach curriculum (a `DayStub`), and a globe
   * pathway (a `HISTORICAL_MODULES` entry). Both are code-owned in slice 1:
   * they are nodes so the graph can say which lessons use a song and which
   * pathways pass through an event, not because the console edits them yet.
   */
  | 'teach_day'
  | 'pathway'
  /**
   * A calendar year and its decade: `year:1982`, `decade:1980s`. Code-owned,
   * like the eras. A song, record, event, label or studio points at its year,
   * an artist at the year it was born or formed and the decades it was
   * active, and the graph walks each year in use up to its decade and era
   * (`time.ts`), so standing on the 1980s reaches everything from them.
   */
  | 'year'
  | 'decade'
  /**
   * Instrument content — what lessons, Practice Tracks and the Studio play.
   * Code-owned in this slice, read from their registries (CODE_OWNERS):
   *
   *  - groove: a drum groove (the console's Drum Grooves designer).
   *  - part: an instrumental part — piano, bass, guitar (the Parts Library).
   *  - feel: a feel profile, per-16th timing measured from a player.
   *  - patch: an Oracle Synth patch, factory or Music Atlas.
   *  - kit: a drum kit, stock or custom.
   */
  | 'groove'
  | 'part'
  | 'feel'
  | 'patch'
  | 'kit'
  /**
   * A genre lesson level (`funk-l2`): one node per level, code-owned, so a
   * lesson can say which grooves it plays over and a part where it was taken
   * from, ahead of the Learn phase's fuller lesson model.
   */
  | 'lesson';

/** `artist:marvin-gaye`, `song:africa`, `place:detroit`. */
export type EntityId = `${EntityKind}:${string}`;

/**
 * `Listed`, provided it names every member of `All`; otherwise a type
 * `Listed` cannot be assigned to, so the error names the members left out.
 * The kind lists below pair it with `satisfies`, which checks the other half
 * (every entry IS a kind). Nothing else would notice a kind missing from a
 * list: the mind map builds its edge filter from `EDGE_KINDS`, so an edge kind
 * left off it was silently never walked.
 */
type EveryMember<All, Listed extends readonly All[]> = [
  Exclude<All, Listed[number]>,
] extends [never]
  ? Listed
  : { unlisted: Exclude<All, Listed[number]> };

const entityKinds = [
  'song',
  'artist',
  'progression',
  'genre',
  'vibe',
  'instrument',
  'label',
  'studio',
  'place',
  'era',
  'subgenre',
  'scene',
  'event',
  'key',
  'mode',
  'release',
  'teach_day',
  'pathway',
  'year',
  'decade',
  'groove',
  'part',
  'feel',
  'patch',
  'kit',
  'lesson',
] as const satisfies readonly EntityKind[];

/** Every entity kind; leaving one out of the list fails to compile. */
export const ENTITY_KINDS: EveryMember<EntityKind, typeof entityKinds> =
  entityKinds;

/** Text → the slug half of an id: 'Hitsville U.S.A.' → 'hitsville-u-s-a'. */
export { toSlug };

/**
 * Build an id. Text is normalised by the kind's own rule (see `ids.ts`):
 * songs, events and progressions keep their stored ids, artists use the
 * registry's `artistSlug`, keys keep their accidental, everything else is
 * kebab-cased.
 */
export const entityId = (kind: EntityKind, slug: string): EntityId =>
  toEntityId(kind, slug);

/**
 * Split an id back into its parts, or null if it isn't one.
 *
 * A slug never contains ':'. Without that rule a Teach activity ref such as
 * `song:africa:chart` parsed as a song whose slug is `africa:chart`.
 */
export function parseEntityId(
  id: string,
): { kind: EntityKind; slug: string } | null {
  const at = id.indexOf(':');
  if (at < 1) return null;
  const kind = id.slice(0, at) as EntityKind;
  const slug = id.slice(at + 1);
  if (!ENTITY_KINDS.includes(kind) || !slug || slug.includes(':')) return null;
  return { kind, slug };
}

/** Whether an id follows the convention for its kind (see `SLUG_PATTERN`). */
export function isWellFormed(id: string): boolean {
  const parsed = parseEntityId(id);
  return parsed ? isWellFormedSlug(parsed.kind, parsed.slug) : false;
}

/* ── Edges ───────────────────────────────────────────────────────────── */

/**
 * How two nodes connect.
 *
 * Deliberately specific. A generic `related` edge draws a pretty picture and
 * answers no questions; typed edges are what let the Atlas be asked "everything
 * Ashford & Simpson wrote that was cut at Hitsville" — which is the product,
 * not the diagram.
 */
export type EdgeKind =
  // ── A song and the people who made it ──
  | 'performed_by' // song | release → artist, billed on the label
  | 'features' // song → artist, a sideman on the date
  | 'written_by' // song → artist
  | 'produced_by' // song → artist
  | 'engineered_by' // song → artist
  | 'arranged_by' // song → artist
  // ── A song and its circumstances ──
  | 'released_on' // song | release → label
  | 'recorded_at' // song → studio
  | 'recorded_in' // song → place
  | 'in_scene' // song → scene
  | 'on_release' // song → release, a track on the record
  // ── When ──
  /**
   * A thing's year, the year's decade and the year's era. Content states only
   * the year; the calendar and `MUSICAL_ERAS` state the other two for every
   * year in use (`time.ts`), so an era is always reached through a year.
   */
  | 'from_year' // song | release | event | label | studio → year
  | 'in_decade' // year → decade
  | 'from_era' // year → era
  /**
   * An artist's own dates, from its record: a person's birth year, a group's
   * forming year (`born.date`, read by the record's `group` flag), and each
   * decade it was active in (`activeFrom`…`activeTo`). Kept apart from
   * `from_year`, which dates a thing that was made or happened: standing on
   * 1939, the songs from that year and the people born in it are different
   * questions.
   */
  | 'born_year' // artist → year
  | 'formed_year' // artist → year
  | 'active_in' // artist → decade
  /**
   * song | progression | artist | event → genre or subgenre, AND subgenre →
   * genre. Two levels by decision (2026-09-25): the globe carries 416
   * free-text genre strings against the song library's 12 canonical tags.
   * Collapsing them all to 12 loses real distinctions; promoting all 416
   * fragments the Atlas. So the detail lives as subgenres and the graph walks
   * up to the genre: every subgenre in use gets its `SUBGENRE_PARENT` edge
   * (deriveGraph.ts).
   */
  | 'in_genre'
  // ── A song and its music ──
  | 'uses_progression' // song → progression
  | 'plays_instrument' // artist → instrument (on a given song, via `on`)
  /**
   * instrument → genre or subgenre: the instruments a style is built on,
   * stated by a code table the owner reviews (`CODE_OWNERS.instrumentGenres`).
   * No record says it, so it is never a fact about one artist or song.
   */
  | 'typical_in'
  // ── Between recordings ──
  | 'covers' // song → song | artist
  | 'samples' // song → song
  | 'interpolates' // song → song
  // ── Semantics ──
  | 'has_vibe' // progression → vibe; a song's vibes come via its progressions
  | 'in_key' // song → key
  | 'in_mode' // song → mode
  // ── Between people and places ──
  | 'based_in' // artist | label | studio → place
  | 'born_in' // artist → place, a person's birthplace
  | 'located_in' // place → place (a city in a region)
  /**
   * A city's own scene: the genres it is known for (`globe_city.genres[]`)
   * and the decades that scene was active (`activeDecades[]`). The city
   * states them, not any song or artist, which is why they are not
   * `in_genre`: a genre's songs and the cities that are its scenes stay
   * separate arcs.
   */
  | 'scene_of' // place → genre | subgenre
  | 'scene_active_in' // place → decade
  // ── Between people and companies ──
  | 'member_of' // artist → artist, a member of a group
  | 'signed_to' // artist → label
  | 'imprint_of' // label → label, Tamla → Motown
  // ── A globe event ──
  /**
   * What an event is about and where it happened. Stored ids on the event
   * state them; until an event has them, its title and tags name them and
   * the edges are guesses (`inferred`).
   */
  | 'about' // event → artist | song | release | studio | label
  | 'took_place_in' // event → place
  // ── Curriculum ──
  | 'uses_song' // teach_day → song
  | 'references_event' // teach_day → event | song
  | 'part_of' // event | song → pathway, a stop on a globe pathway
  // ── Instrument content ──
  | 'has_feel' // part | groove → feel profile it is played with
  | 'played_on' // part → patch, groove → kit: the sound it is voiced on
  | 'in_style_of' // part | groove → artist, the player it is modelled on
  | 'excerpt_of' // part → song it is lifted from
  | 'uses_groove' // lesson → groove its play-alongs play over
  | 'taken_from' // part → lesson it was taken from
  // ── Influence ──
  /**
   * The one edge the globe already has. `eventConnections.ts` holds thousands
   * of these as bare `{ from, to }` pairs meaning "influenced", between event
   * ids — and its own header records what that cost: 73 had silently gone
   * dangling after a regeneration renamed ids underneath them, each one
   * quietly shortening a chain nobody was watching. That is this whole design
   * in one footnote.
   */
  | 'influenced';

const edgeKinds = [
  'performed_by',
  'features',
  'written_by',
  'produced_by',
  'engineered_by',
  'arranged_by',
  'released_on',
  'recorded_at',
  'recorded_in',
  'in_scene',
  'on_release',
  'from_year',
  'in_decade',
  'from_era',
  'born_year',
  'formed_year',
  'active_in',
  'in_genre',
  'uses_progression',
  'plays_instrument',
  'typical_in',
  'covers',
  'samples',
  'interpolates',
  'has_vibe',
  'in_key',
  'in_mode',
  'based_in',
  'born_in',
  'located_in',
  'scene_of',
  'scene_active_in',
  'member_of',
  'signed_to',
  'imprint_of',
  'about',
  'took_place_in',
  'uses_song',
  'references_event',
  'part_of',
  'influenced',
  'has_feel',
  'played_on',
  'in_style_of',
  'excerpt_of',
  'uses_groove',
  'taken_from',
] as const satisfies readonly EdgeKind[];

/** Every edge kind; leaving one out of the list fails to compile. */
export const EDGE_KINDS: EveryMember<EdgeKind, typeof edgeKinds> = edgeKinds;

/**
 * How each edge reads in each direction.
 *
 * The constellation shows a node's connections both ways round — standing on
 * Marvin Gaye you want "performed", standing on the song you want "performed
 * by" — so both phrasings belong with the edge rather than in whichever
 * component happens to render it.
 */
export const EDGE_LABELS: Record<
  EdgeKind,
  { forward: string; inverse: string }
> = {
  performed_by: { forward: 'performed by', inverse: 'performed' },
  features: { forward: 'features', inverse: 'played on' },
  written_by: { forward: 'written by', inverse: 'wrote' },
  produced_by: { forward: 'produced by', inverse: 'produced' },
  engineered_by: { forward: 'engineered by', inverse: 'engineered' },
  arranged_by: { forward: 'arranged by', inverse: 'arranged' },
  released_on: { forward: 'released on', inverse: 'released' },
  recorded_at: { forward: 'recorded at', inverse: 'where they cut' },
  recorded_in: { forward: 'recorded in', inverse: 'recorded there' },
  in_scene: { forward: 'part of', inverse: 'includes' },
  on_release: { forward: 'appears on', inverse: 'has the track' },
  from_year: { forward: 'from', inverse: 'the year of' },
  in_decade: { forward: 'in', inverse: 'includes' },
  from_era: { forward: 'from', inverse: 'includes' },
  born_year: { forward: 'born in', inverse: 'the birth year of' },
  formed_year: { forward: 'formed in', inverse: 'the year that formed' },
  active_in: { forward: 'active in', inverse: 'an active decade of' },
  in_genre: { forward: 'in', inverse: 'includes' },
  uses_progression: { forward: 'uses', inverse: 'used in' },
  plays_instrument: { forward: 'plays', inverse: 'played by' },
  typical_in: { forward: 'typical in', inverse: 'typically uses' },
  covers: { forward: 'covers', inverse: 'covered by' },
  samples: { forward: 'samples', inverse: 'sampled by' },
  interpolates: { forward: 'interpolates', inverse: 'interpolated by' },
  has_vibe: { forward: 'feels', inverse: 'felt in' },
  in_key: { forward: 'in the key of', inverse: 'is the key of' },
  in_mode: { forward: 'in', inverse: 'is the mode of' },
  based_in: { forward: 'based in', inverse: 'home to' },
  born_in: { forward: 'born in', inverse: 'birthplace of' },
  located_in: { forward: 'in', inverse: 'contains' },
  scene_of: { forward: 'a scene of', inverse: 'has a scene in' },
  scene_active_in: { forward: 'a scene in', inverse: 'a scene decade of' },
  member_of: { forward: 'member of', inverse: 'has member' },
  signed_to: { forward: 'signed to', inverse: 'signed' },
  imprint_of: { forward: 'imprint of', inverse: 'has imprint' },
  about: { forward: 'about', inverse: 'featured in' },
  took_place_in: { forward: 'took place in', inverse: 'happened there' },
  uses_song: { forward: 'uses', inverse: 'taught in' },
  references_event: { forward: 'references', inverse: 'referenced in' },
  part_of: { forward: 'a stop on', inverse: 'passes through' },
  has_feel: { forward: 'played with feel', inverse: 'feel of' },
  played_on: { forward: 'played on', inverse: 'sound of' },
  in_style_of: { forward: 'in the style of', inverse: 'parts in their style' },
  excerpt_of: { forward: 'excerpt of', inverse: 'parts from it' },
  uses_groove: { forward: 'plays over', inverse: 'used in' },
  taken_from: { forward: 'taken from', inverse: 'parts from it' },
  influenced: { forward: 'influenced', inverse: 'influenced by' },
};

/** Which node kinds an edge may join. Empty `to` means any kind. */
export const EDGE_ENDPOINTS: Record<
  EdgeKind,
  { from: readonly EntityKind[]; to: readonly EntityKind[] }
> = {
  // A release carries only what the release itself is — who is billed, the
  // label, the year. Where and with whom it was recorded stays on its songs.
  performed_by: { from: ['song', 'release'], to: ['artist'] },
  features: { from: ['song'], to: ['artist'] },
  written_by: { from: ['song'], to: ['artist'] },
  produced_by: { from: ['song'], to: ['artist'] },
  engineered_by: { from: ['song'], to: ['artist'] },
  arranged_by: { from: ['song'], to: ['artist'] },
  released_on: { from: ['song', 'release'], to: ['label'] },
  recorded_at: { from: ['song'], to: ['studio'] },
  recorded_in: { from: ['song'], to: ['place'] },
  in_scene: { from: ['song', 'artist'], to: ['scene'] },
  on_release: { from: ['song'], to: ['release'] },
  // A label's founding and a studio's opening are their years.
  from_year: {
    from: ['song', 'release', 'event', 'label', 'studio'],
    to: ['year'],
  },
  in_decade: { from: ['year'], to: ['decade'] },
  // Only a year has an era: everything else reaches its era through its year.
  from_era: { from: ['year'], to: ['era'] },
  born_year: { from: ['artist'], to: ['year'] },
  formed_year: { from: ['artist'], to: ['year'] },
  active_in: { from: ['artist'], to: ['decade'] },
  in_genre: {
    from: [
      'song',
      'progression',
      'artist',
      'event',
      'subgenre',
      'part',
      'groove',
    ],
    to: ['genre', 'subgenre'],
  },
  // A part's chords matched to the library are a guess (`inferred`).
  uses_progression: { from: ['song', 'part'], to: ['progression'] },
  // An artist plays it; a part or groove is played on it — one edge, so an
  // instrument's search reaches all three.
  plays_instrument: { from: ['artist', 'part', 'groove'], to: ['instrument'] },
  typical_in: { from: ['instrument'], to: ['genre', 'subgenre'] },
  // An original is covered by this song; a cover is by another artist or song.
  covers: { from: ['song', 'artist'], to: ['song', 'artist'] },
  samples: { from: ['song'], to: ['song'] },
  interpolates: { from: ['song'], to: ['song'] },
  has_vibe: { from: ['progression', 'song'], to: ['vibe'] },
  in_key: { from: ['song', 'progression', 'part'], to: ['key'] },
  in_mode: { from: ['song', 'progression', 'part'], to: ['mode'] },
  based_in: { from: ['artist', 'label', 'studio'], to: ['place'] },
  // A person's birthplace. A group's is where it formed: its `based_in`.
  born_in: { from: ['artist'], to: ['place'] },
  // A city in its region: `place:detroit` → `place:region-north-america`.
  located_in: { from: ['place'], to: ['place'] },
  scene_of: { from: ['place'], to: ['genre', 'subgenre'] },
  scene_active_in: { from: ['place'], to: ['decade'] },
  // From the member to the group, so standing on a person reads "member of".
  member_of: { from: ['artist'], to: ['artist'] },
  signed_to: { from: ['artist'], to: ['label'] },
  imprint_of: { from: ['label'], to: ['label'] },
  // Only an `evt-` event: a song's own event is the song (canonicalId).
  about: {
    from: ['event'],
    to: ['artist', 'song', 'release', 'studio', 'label'],
  },
  took_place_in: { from: ['event'], to: ['place'] },
  uses_song: { from: ['teach_day'], to: ['song'] },
  // `song` because a song's globe event folds onto the song (canonicalId).
  references_event: { from: ['teach_day'], to: ['event', 'song'] },
  part_of: { from: ['event', 'song'], to: ['pathway'] },
  has_feel: { from: ['part', 'groove'], to: ['feel'] },
  played_on: { from: ['part', 'groove'], to: ['patch', 'kit'] },
  in_style_of: { from: ['part', 'groove'], to: ['artist'] },
  excerpt_of: { from: ['part'], to: ['song'] },
  uses_groove: { from: ['lesson'], to: ['groove'] },
  taken_from: { from: ['part'], to: ['lesson'] },
  influenced: {
    from: ['event', 'song', 'artist', 'genre', 'scene'],
    to: ['event', 'song', 'artist', 'genre', 'scene'],
  },
};

/**
 * The repo files that state connections no content body holds. Their lists
 * are read into the graph, but the console cannot edit them, so an edge one
 * of them states names its file in `EdgeVia.code`.
 */
export const CODE_OWNERS = {
  /** The globe's event-to-event influence arcs. */
  influenceArcs: 'src/components/atlas/data/eventConnections.ts',
  /** The canonical Teach year's day stubs (code-owned in slice 1, decision 11). */
  teachYear: 'src/features/classroom/annual/curriculumTemplate.ts',
  /** The globe's pathways (`HISTORICAL_MODULES`). */
  pathways: 'src/components/atlas/data/historicalModules.ts',
  /** Which genre each subgenre sits under (`SUBGENRE_PARENT`). */
  subgenres: 'src/content/graph/genreTags.ts',
  /** Which decade each year is in. */
  calendar: 'src/content/graph/time.ts',
  /** Which era each year falls in (`MUSICAL_ERAS`). */
  eras: 'src/components/atlas/data/musicalEras.ts',
  /** Which genres each instrument is typical in (`typical_in`, owner-reviewed). */
  instrumentGenres: 'src/content/graph/instrumentGenres.ts',
  /** Drum grooves: the lesson set and the Studio's (`drumGrooves/studio/`). */
  grooves: 'src/curriculum/engine/drumGrooves/registry.ts',
  /** The Parts Library's instrumental parts. */
  parts: 'src/curriculum/engine/parts/registry.ts',
  /** Feel profiles measured from players. */
  feels: 'src/curriculum/engine/parts/feel.ts',
  /** Oracle Synth patches: factory and Music Atlas (`presets/atlas/`). */
  synthPatches: 'src/daw/oracle-synth/store/presets/factoryPresets.ts',
  /** The genre lesson levels (activity flows), as the repo bundles them. */
  lessons: 'src/curriculum/data/activityFlows/bundled.ts',
  /** Drum kits: stock and custom (`customDrumKits/`). */
  drumKits: 'src/daw/instruments/drumKits.ts',
} as const;

export type CodeOwner = (typeof CODE_OWNERS)[keyof typeof CODE_OWNERS];

/** Which item states a connection, and in which field: `credits[].artistGlobeId`. */
export interface EdgeVia {
  item: EntityId;
  path: string;
  /**
   * Set when code states the connection, not a content body. `item` is then
   * the node the statement is filed under (an arc's influencer, a Teach day,
   * a pathway, a subgenre, a year) and `path` names the list, but neither is
   * a field the console can edit: consumers link to the owner's explanation
   * (`code:<file>`) rather than an editor, and never hold a published item
   * responsible for it. Read it through `isCodeOwnedVia`, not by comparing
   * paths.
   */
  code?: CodeOwner;
  /**
   * The content item that states it, when that is not `item`. A song pin is
   * an `artist_location` item, keyed by the act's name in lowercase, but its
   * edge is filed under the artist it pins, so that it meets the artist's
   * other connections on one node; this names the pin, so the console can
   * say "song pins" and link to that item rather than to the artist. Two
   * pins for one act are two sources.
   */
  statedBy?: { kind: 'artist_location'; id: string };
}

/** Does code, rather than a content item, state this (see `EdgeVia.code`)? */
export const isCodeOwnedVia = (via: EdgeVia): boolean => via.code !== undefined;

/**
 * One connection.
 *
 * `on` is what makes a credit sayable: James Jamerson plays bass, but he plays
 * it ON a particular record, and the same edge on another record might be a
 * different instrument. Without it the graph can only say he plays bass
 * somewhere.
 */
export interface Edge {
  from: EntityId;
  kind: EdgeKind;
  to: EntityId;
  /** The song this connection happened on, when the edge isn't itself a song's. */
  on?: EntityId;
  /** When it happened, when that differs from the song's own year. */
  year?: number;
  /** Not yet confirmed against a reliable source. Rendered muted, and kept out
   *  of counts and paths until someone signs it off. */
  unverified?: boolean;
  /** Where this came from: 'discogs', 'wikipedia', a person's name. */
  source?: string;
  /**
   * The record field this edge was derived from — which item, which path
   * (`credits[].artistGlobeId`). Every derived edge carries one, so the console
   * can say why two things are connected and jump to the field that says so.
   */
  via?: EdgeVia;
  /**
   * The target was resolved from free text (a display name, a city string)
   * rather than a stored id. A guess, however good: rendered distinctly, and
   * kept out of paths until someone links it.
   */
  inferred?: true;
}

/** Does this edge join kinds it is allowed to join? */
export function isValidEdge(edge: Edge): boolean {
  const from = parseEntityId(edge.from);
  const to = parseEntityId(edge.to);
  if (!from || !to) return false;
  const spec = EDGE_ENDPOINTS[edge.kind];
  if (!spec) return false;
  return spec.from.includes(from.kind) && spec.to.includes(to.kind);
}

/* ── The built graph ─────────────────────────────────────────────────── */

/**
 * Where a node stands.
 *
 *  - `published`, `draft`, `pending` — a content item the API holds, in that
 *    state (`pending` is an editor's proposal awaiting review);
 *  - `code` — defined in the repo: bundled data, a code vocabulary, a Teach
 *    stub or pathway;
 *  - `missing` — referenced by some field but found nowhere. Never a silent
 *    phantom: the console draws it hollow and integrity lists it.
 */
export type NodeStatus = 'published' | 'draft' | 'pending' | 'code' | 'missing';

/** One node of the built graph (see deriveGraph.ts). */
export interface GraphNode {
  id: EntityId;
  kind: EntityKind;
  /** The record's own name or title; the slug when there is no record. */
  label: string;
  status: NodeStatus;
  /**
   * Whose copy this is: the API's, or the repo's. A `missing` node has
   * neither and says `code`; read `status` first.
   */
  origin: 'api' | 'code';
  /** The record itself is marked unconfirmed. */
  unverified?: boolean;
  /** Teach usage, when the API reports it; never an edge (decision 11). */
  usage?: { publishedDays: number; classrooms: number };
}

/**
 * An edge of the built graph: every field that states the same connection
 * merged into one, each named in `via`. The flags describe the merged edge —
 * `inferred` only when every source is a guess, `unverified` only when every
 * source is unconfirmed — so one linked field is enough to make it solid.
 */
export type GraphEdge = Omit<Edge, 'via'> & { via: EdgeVia[] };
