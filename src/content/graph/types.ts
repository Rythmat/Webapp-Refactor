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
  | 'mode';

/** `artist:marvin-gaye`, `song:africa`, `place:detroit`. */
export type EntityId = `${EntityKind}:${string}`;

export const ENTITY_KINDS: readonly EntityKind[] = [
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
];

/** Text → the slug half of an id: 'Hitsville U.S.A.' → 'hitsville-u-s-a'. */
export const toSlug = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // fold accents: Sinéad → Sinead
    .replace(/['’]/g, '') // Ain't → aint, not ain-t
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

/** Build an id. The slug is normalised unless it is already one. */
export const entityId = (kind: EntityKind, slug: string): EntityId =>
  `${kind}:${kind === 'song' ? slug : toSlug(slug)}`;

/** Split an id back into its parts, or null if it isn't one. */
export function parseEntityId(
  id: string,
): { kind: EntityKind; slug: string } | null {
  const at = id.indexOf(':');
  if (at < 1) return null;
  const kind = id.slice(0, at) as EntityKind;
  const slug = id.slice(at + 1);
  if (!ENTITY_KINDS.includes(kind) || !slug) return null;
  return { kind, slug };
}

/**
 * Whether an id follows the convention for its kind. Songs keep their
 * snake_case slugs; everything else is kebab-case.
 */
export function isWellFormed(id: string): boolean {
  const parsed = parseEntityId(id);
  if (!parsed) return false;
  return parsed.kind === 'song'
    ? /^[a-z0-9_]+$/.test(parsed.slug)
    : /^[a-z0-9]+(-[a-z0-9]+)*$/.test(parsed.slug);
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
  | 'performed_by' // song → artist, billed on the label
  | 'features' // song → artist, a sideman on the date
  | 'written_by' // song → artist
  | 'produced_by' // song → artist
  | 'engineered_by' // song → artist
  | 'arranged_by' // song → artist
  // ── A song and its circumstances ──
  | 'released_on' // song → label
  | 'recorded_at' // song → studio
  | 'recorded_in' // song → place
  | 'from_era' // song → era
  | 'in_scene' // song → scene
  /**
   * song | progression | artist → genre or subgenre, AND subgenre → genre.
   * Two levels by decision (2026-09-25): the globe carries 416 free-text genre
   * strings against the song library's 12 canonical tags. Collapsing them all
   * to 12 loses real distinctions; promoting all 416 fragments the Atlas. So
   * the detail lives as subgenres and the graph walks up to the genre.
   */
  | 'in_genre'
  // ── A song and its music ──
  | 'uses_progression' // song → progression
  | 'plays_instrument' // artist → instrument (on a given song, via `on`)
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
  | 'located_in' // place → place (a city in a region)
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

export const EDGE_KINDS: readonly EdgeKind[] = [
  'performed_by',
  'features',
  'written_by',
  'produced_by',
  'engineered_by',
  'arranged_by',
  'released_on',
  'recorded_at',
  'recorded_in',
  'from_era',
  'in_scene',
  'in_genre',
  'uses_progression',
  'plays_instrument',
  'covers',
  'samples',
  'interpolates',
  'has_vibe',
  'in_key',
  'in_mode',
  'based_in',
  'located_in',
  'influenced',
];

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
  from_era: { forward: 'from', inverse: 'includes' },
  in_scene: { forward: 'part of', inverse: 'includes' },
  in_genre: { forward: 'in', inverse: 'includes' },
  uses_progression: { forward: 'uses', inverse: 'used in' },
  plays_instrument: { forward: 'plays', inverse: 'played by' },
  covers: { forward: 'covers', inverse: 'covered by' },
  samples: { forward: 'samples', inverse: 'sampled by' },
  interpolates: { forward: 'interpolates', inverse: 'interpolated by' },
  has_vibe: { forward: 'feels', inverse: 'felt in' },
  in_key: { forward: 'in the key of', inverse: 'is the key of' },
  in_mode: { forward: 'in', inverse: 'is the mode of' },
  based_in: { forward: 'based in', inverse: 'home to' },
  located_in: { forward: 'in', inverse: 'contains' },
  influenced: { forward: 'influenced', inverse: 'influenced by' },
};

/** Which node kinds an edge may join. Empty `to` means any kind. */
export const EDGE_ENDPOINTS: Record<
  EdgeKind,
  { from: readonly EntityKind[]; to: readonly EntityKind[] }
> = {
  performed_by: { from: ['song'], to: ['artist'] },
  features: { from: ['song'], to: ['artist'] },
  written_by: { from: ['song'], to: ['artist'] },
  produced_by: { from: ['song'], to: ['artist'] },
  engineered_by: { from: ['song'], to: ['artist'] },
  arranged_by: { from: ['song'], to: ['artist'] },
  released_on: { from: ['song'], to: ['label'] },
  recorded_at: { from: ['song'], to: ['studio'] },
  recorded_in: { from: ['song'], to: ['place'] },
  from_era: { from: ['song'], to: ['era'] },
  in_scene: { from: ['song', 'artist'], to: ['scene'] },
  in_genre: {
    from: ['song', 'progression', 'artist', 'subgenre'],
    to: ['genre', 'subgenre'],
  },
  uses_progression: { from: ['song'], to: ['progression'] },
  plays_instrument: { from: ['artist'], to: ['instrument'] },
  covers: { from: ['song'], to: ['song', 'artist'] },
  samples: { from: ['song'], to: ['song'] },
  interpolates: { from: ['song'], to: ['song'] },
  has_vibe: { from: ['progression', 'song'], to: ['vibe'] },
  in_key: { from: ['song', 'progression'], to: ['key'] },
  in_mode: { from: ['song', 'progression'], to: ['mode'] },
  based_in: { from: ['artist', 'label', 'studio'], to: ['place'] },
  located_in: { from: ['place'], to: ['place'] },
  influenced: {
    from: ['event', 'song', 'artist', 'genre', 'scene'],
    to: ['event', 'song', 'artist', 'genre', 'scene'],
  },
};

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
