// ─────────────────────────────────────────────────────────────────────────
//  Every field in a content body that points at another thing in the Atlas.
//
//  Import-free on purpose: this file is part of the API contract and is meant
//  to be copied into music-atlas-api as-is, where it drives reference
//  validation, rename and merge rewriting. In the webapp it also drives the
//  console's legacy-text linking and integrity checks.
//
//  Completeness is enforced, not hoped for: `refPaths.test.ts` walks the
//  generated body schemas and fails on any id-shaped field missing here, and
//  checks both ways that the derived paths here are exactly the paths the
//  graph's edges name.
// ─────────────────────────────────────────────────────────────────────────

/**
 * One reference-bearing path.
 *
 * `path` uses `[]` for "every element": `credits[].artistGlobeId`.
 * `target` is the graph entity kind the value names (`artist`, `place`, …).
 */
export interface RefPath {
  /** The content kind whose body holds the field. */
  kind:
    | 'song'
    | 'chord_progression'
    | 'artist'
    | 'release'
    | 'studio'
    | 'label'
    | 'globe_city'
    | 'globe_event'
    | 'artist_location';
  path: string;
  target: string;
  /**
   * Other kinds the field can name, besides `target`: an event's tag can be
   * a song's title as well as an artist's name, and a genre string can land
   * on a subgenre. A path is listed once, so this is where the rest go.
   */
  alsoTargets?: readonly string[];
  /**
   * Free text standing in for an id — a display name, a city as written.
   * The console offers to link it; the graph resolves it and marks the edge
   * `inferred`. Never removed: it is what the page shows.
   */
  legacy?: true;
  /**
   * Display text the graph resolves through a curated table in code, not a
   * guess: 'Art Rock' is `subgenre:art-rock` because the genre table says so
   * (`resolveGenreTag`). The API does not check it, since most of the strings
   * are not ids ('Hip Hop', 'Delta Blues'); the graph draws its edges solid
   * and integrity counts them as linked. A string the table does not know
   * states nothing.
   */
  resolvedBy?: 'genreTag';
  /** The value is from a vocabulary kept in code (genres, instruments, …). */
  vocab?: true;
  /** The value names something code-owned with no content record (a theory topic). */
  code?: true;
  /** Not turned into graph edges (yet). Still validated and rewritten on rename. */
  derive?: false;
  /** Song body schema level that first accepts the field (see manifest.json). */
  minSongSchema?: 1 | 2;
  /**
   * Following this field from item to item must never come back round: a
   * group cannot be its own member, a label its own parent. Names the edge the
   * cycle would be made of. The API rejects a write that closes one.
   */
  acyclic?: string;
  /** Why the field is here, when that is not obvious. */
  note?: string;
}

export const REF_PATHS: readonly RefPath[] = [
  // ── Song: who made it ──
  {
    kind: 'song',
    path: 'artist',
    target: 'artist',
    legacy: true,
    note: 'Display line of the billed act; linked through origin.artistGlobeId.',
  },
  {
    kind: 'song',
    path: 'origin.artistGlobeId',
    target: 'artist',
    minSongSchema: 1,
    note: 'The lead act. Full billing is the primary credits.',
  },
  {
    kind: 'song',
    path: 'composer',
    target: 'artist',
    legacy: true,
    note: 'Display line; derived only when no songwriter credit exists.',
  },
  { kind: 'song', path: 'credits[].name', target: 'artist', legacy: true },
  {
    kind: 'song',
    path: 'credits[].artistGlobeId',
    target: 'artist',
    minSongSchema: 1,
  },
  {
    kind: 'song',
    path: 'credits[].instrument',
    target: 'instrument',
    vocab: true,
    minSongSchema: 1,
  },

  // ── Song: where it was made ──
  {
    kind: 'song',
    path: 'session.studio',
    target: 'studio',
    legacy: true,
    note: 'Display text; linked through session.studioId.',
  },
  {
    kind: 'song',
    path: 'session.label',
    target: 'label',
    legacy: true,
    note: 'Display text; linked through session.labelId, or the releases.',
  },
  {
    kind: 'song',
    path: 'session.city',
    target: 'place',
    legacy: true,
    note: 'Display text; linked through session.placeId.',
  },
  {
    kind: 'song',
    path: 'session.studioId',
    target: 'studio',
    minSongSchema: 2,
  },
  {
    kind: 'song',
    path: 'session.labelId',
    target: 'label',
    minSongSchema: 2,
    note: 'Read only when the song has no releases: a release names its own label.',
  },
  {
    kind: 'song',
    path: 'session.placeId',
    target: 'place',
    minSongSchema: 2,
    note: "Where it was recorded. It never moves the song's pin.",
  },
  {
    kind: 'song',
    path: 'session.country',
    target: 'place',
    legacy: true,
    derive: false,
    note: 'Disambiguates session.city; a country is not yet a node.',
  },

  // ── Song: globe origin (one song uses it today) ──
  {
    kind: 'song',
    path: 'origin.region',
    target: 'place',
    legacy: true,
    derive: false,
  },
  {
    kind: 'song',
    path: 'origin.country',
    target: 'place',
    legacy: true,
    derive: false,
  },
  {
    kind: 'song',
    path: 'origin.era',
    target: 'era',
    legacy: true,
    derive: false,
    note: "Free text ('late_1970s_arena_rock'), not a MUSICAL_ERAS id.",
  },
  {
    kind: 'song',
    path: 'origin.scene',
    target: 'scene',
    legacy: true,
    derive: false,
  },

  // ── Song: other recordings ──
  {
    kind: 'song',
    path: 'relatedRecordings[].songId',
    target: 'song',
    minSongSchema: 1,
  },
  {
    kind: 'song',
    path: 'relatedRecordings[].artist',
    target: 'artist',
    legacy: true,
  },
  {
    kind: 'song',
    path: 'relatedRecordings[].artistGlobeId',
    target: 'artist',
    minSongSchema: 1,
  },

  // ── Song: the records it is on ──
  {
    kind: 'song',
    path: 'releases[].releaseId',
    target: 'release',
    minSongSchema: 2,
  },

  // ── Song: the music ──
  { kind: 'song', path: 'genreTags[]', target: 'genre', vocab: true },
  {
    kind: 'song',
    path: 'subgenreIds[]',
    target: 'subgenre',
    vocab: true,
    minSongSchema: 2,
    note: 'Subgenre ids (vocabulary `subgenres[].id`), each filed under its genre.',
  },
  {
    kind: 'song',
    path: 'key',
    target: 'key',
    vocab: true,
    note: "'E♭ major' — the tonic is the key node; the mode is its own field.",
  },
  { kind: 'song', path: 'mode', target: 'mode', vocab: true },
  {
    kind: 'song',
    path: 'techniques[]',
    target: 'technique',
    code: true,
    derive: false,
  },

  // ── Song: explicit content cross-references ──
  {
    kind: 'song',
    path: 'contentRefs[].globeArtistId',
    target: 'artist',
    derive: false,
  },
  {
    kind: 'song',
    path: 'contentRefs[].globeSceneId',
    target: 'scene',
    derive: false,
  },
  {
    kind: 'song',
    path: 'contentRefs[].globeRegion',
    target: 'place',
    derive: false,
    note: 'A globe RegionId; becomes place `region-<id>`.',
  },
  {
    kind: 'song',
    path: 'contentRefs[].globeEra',
    target: 'era',
    derive: false,
  },
  {
    kind: 'song',
    path: 'contentRefs[].genre',
    target: 'genre',
    vocab: true,
    derive: false,
  },
  {
    kind: 'song',
    path: 'contentRefs[].topicId',
    target: 'theory_topic',
    code: true,
    derive: false,
  },
  {
    kind: 'song',
    path: 'contentRefs[].studioPreset',
    target: 'studio_template',
    code: true,
    derive: false,
  },

  // ── Chord progression ──
  { kind: 'chord_progression', path: 'songIds[]', target: 'song' },
  {
    kind: 'chord_progression',
    path: 'song',
    target: 'song',
    legacy: true,
    derive: false,
    note: "Free text ('Lively Up Yourself (Bob Marley)'); songIds is the link.",
  },
  {
    kind: 'chord_progression',
    path: 'artist',
    target: 'artist',
    legacy: true,
    derive: false,
  },
  { kind: 'chord_progression', path: 'vibes[]', target: 'vibe', vocab: true },
  {
    kind: 'chord_progression',
    path: 'styles[]',
    target: 'genre',
    alsoTargets: ['subgenre'],
    vocab: true,
    note: "The library's own spelling ('r&b'), mapped to graph genres; 'gospel' to the Gospel subgenre.",
  },

  // ── Artist ──
  {
    kind: 'artist',
    path: 'members[].artistId',
    target: 'artist',
    acyclic: 'member_of',
  },
  {
    kind: 'artist',
    path: 'members[].instrumentIds[]',
    target: 'instrument',
    vocab: true,
  },
  { kind: 'artist', path: 'basedInPlaceId', target: 'place' },
  {
    kind: 'artist',
    path: 'born.placeId',
    target: 'place',
    note: "A person's birthplace. A group's is its City (basedInPlaceId).",
  },
  {
    kind: 'artist',
    path: 'genreIds[]',
    target: 'genre',
    alsoTargets: ['subgenre'],
    vocab: true,
  },
  {
    kind: 'artist',
    path: 'instrumentIds[]',
    target: 'instrument',
    vocab: true,
  },
  { kind: 'artist', path: 'labelIds[]', target: 'label' },
  {
    kind: 'artist',
    path: 'influencedBy[].artistId',
    target: 'artist',
    note: 'Artist-level influence; the one relationship stated outright.',
  },

  // ── Release (a record) ──
  { kind: 'release', path: 'artistIds[]', target: 'artist' },
  { kind: 'release', path: 'labelId', target: 'label' },

  // ── Studio ──
  { kind: 'studio', path: 'placeId', target: 'place' },

  // ── Label ──
  { kind: 'label', path: 'placeId', target: 'place' },
  {
    kind: 'label',
    path: 'parentLabelId',
    target: 'label',
    acyclic: 'imprint_of',
  },

  // ── Place (globe_city) ──
  {
    kind: 'globe_city',
    path: 'region',
    target: 'place',
    vocab: true,
    note: 'A globe RegionId; the place `region-<id>` it sits in.',
  },
  {
    kind: 'globe_city',
    path: 'genres[]',
    target: 'genre',
    alsoTargets: ['subgenre'],
    resolvedBy: 'genreTag',
    note: "The city's scenes ('Motown', 'Techno'), as the globe writes them.",
  },

  // ── Globe event (hand-authored `evt-` events; a `song-` event is its song) ──
  {
    kind: 'globe_event',
    path: 'title',
    target: 'artist',
    alsoTargets: ['song'],
    legacy: true,
    note: 'The title opens on its subject and may quote its song: Etta James records "At Last". Linked through artistIds and songIds.',
  },
  {
    kind: 'globe_event',
    path: 'tags[]',
    target: 'artist',
    alsoTargets: ['song'],
    legacy: true,
    note: 'Lowercase names mixed with places, genres and themes; a place or genre name never matches alone. Linked through artistIds and songIds.',
  },
  {
    kind: 'globe_event',
    path: 'location.city',
    target: 'place',
    legacy: true,
    note: 'Where the pin is. Linked through placeId.',
  },
  {
    kind: 'globe_event',
    path: 'location.country',
    target: 'place',
    legacy: true,
    derive: false,
    note: 'Disambiguates location.city; a country is not yet a node.',
  },
  {
    kind: 'globe_event',
    path: 'genre[]',
    target: 'genre',
    alsoTargets: ['subgenre'],
    resolvedBy: 'genreTag',
  },
  // Event body v2. On an `evt-` event a stored list wins over the guesses
  // from the title, tags and city, and `[]` says "reviewed: none". A `song-`
  // event's are copied from its song and never `[]`; the graph reads none.
  {
    kind: 'globe_event',
    path: 'artistIds[]',
    target: 'artist',
    note: 'Lead act first. On a song- event, the lead act and primary credits.',
  },
  { kind: 'globe_event', path: 'songIds[]', target: 'song' },
  {
    kind: 'globe_event',
    path: 'placeId',
    target: 'place',
    note: 'Where it happened. On a song- event, where it was recorded (session.placeId); it never moves the pin.',
  },
  { kind: 'globe_event', path: 'releaseIds[]', target: 'release' },
  { kind: 'globe_event', path: 'studioIds[]', target: 'studio' },
  {
    kind: 'globe_event',
    path: 'labelIds[]',
    target: 'label',
    note: "On a song- event, the song's session.labelId, only when it has no releases.",
  },
  {
    kind: 'globe_event',
    path: 'credits[].artistGlobeId',
    target: 'artist',
    derive: false,
    note: "song- events only: the song's credits, copied. The song states them.",
  },
  // The rest of what a `song-` event copies from its song, listed as the song
  // lists them. The song states each; the graph reads none of them here.
  {
    kind: 'globe_event',
    path: 'credits[].name',
    target: 'artist',
    legacy: true,
    derive: false,
    note: 'song- events only: the credit as the song writes it. Linked through credits[].artistGlobeId.',
  },
  {
    kind: 'globe_event',
    path: 'credits[].instrument',
    target: 'instrument',
    vocab: true,
    derive: false,
  },
  {
    kind: 'globe_event',
    path: 'studio',
    target: 'studio',
    legacy: true,
    derive: false,
    note: "song- events only: the song's session.studio, as written. Linked through studioIds.",
  },
  {
    kind: 'globe_event',
    path: 'label',
    target: 'label',
    legacy: true,
    derive: false,
    note: "song- events only: the song's session.label, as written. Linked through labelIds.",
  },

  // ── Artist location (the globe's song pins, keyed by the artist's name) ──
  {
    kind: 'artist_location',
    path: 'city',
    target: 'place',
    legacy: true,
    note: "Where the act's songs are pinned, not its scene; the graph reads it only when the artist has no basedInPlaceId.",
  },
];
