/**
 * The Atlas's genre vocabulary — two levels, by decision (2026-09-25).
 *
 * The song library carries 12 normalised `genreTags`. The globe's events carry
 * 758 free-text genre strings, 578 of which appear only once or twice
 * ('Acoustic Rock', 'Blues Jazz', 'Afro-Pop'). Collapsing all 758 to 12 throws
 * away real distinctions; promoting all 758 to nodes fragments the Atlas so
 * that Art Rock and Rock never meet.
 *
 * So: a small set of GENRES, and as many SUBGENRES as the data needs, each
 * pointing at a parent. A song or event links to whichever level it knows, and
 * the graph walks up.
 *
 * TAUGHT vs KNOWN
 *
 * The globe is a history of all music; the curriculum teaches a subset. Those
 * are different scopes, and Classical is the case that reveals it: 71 globe
 * events, no songs, no lessons. Rather than exclude it (leaving those events
 * pointing at nothing) or pretend it is a teaching genre, a genre records
 * whether the curriculum covers it. Classical lessons later are a flag flip,
 * not a migration.
 */

export interface Genre {
  /** Slug half of `genre:<id>`. */
  id: string;
  name: string;
  /** The curriculum has lessons and charts for this genre. */
  taught: boolean;
  /** Why it exists without being taught. */
  note?: string;
}

/**
 * The twelve the song library already normalises to, plus Classical, which the
 * globe needs and the curriculum does not teach yet.
 */
export const GENRES: readonly Genre[] = [
  { id: 'rock', name: 'Rock', taught: true },
  { id: 'pop', name: 'Pop', taught: true },
  { id: 'funk', name: 'Funk', taught: true },
  { id: 'folk', name: 'Folk', taught: true },
  { id: 'rnb', name: 'R&B', taught: true },
  { id: 'jazz', name: 'Jazz', taught: true },
  { id: 'hip-hop', name: 'Hip Hop', taught: true },
  { id: 'reggae', name: 'Reggae', taught: true },
  { id: 'latin', name: 'Latin', taught: true },
  { id: 'blues', name: 'Blues', taught: true },
  { id: 'electronic', name: 'Electronic', taught: true },
  { id: 'jam-band', name: 'Jam Band', taught: true },
  // ── Regional umbrellas ──
  // The globe is a history of all music; the curriculum teaches a Western
  // popular subset. 275 traditions had no parent among the twelve — Griot,
  // Qawwali, Maqam, Amapiano, Powwow. Rather than force them under Pop or
  // gather them into a single "World Music" bucket, they sit under the region
  // they come from. Slugs mirror the globe's own region ids so a genre and a
  // place can be tied together.
  { id: 'west-african', name: 'West African', taught: false },
  { id: 'east-african', name: 'East African', taught: false },
  { id: 'north-african', name: 'North African', taught: false },
  { id: 'central-african', name: 'Central African', taught: false },
  { id: 'south-african', name: 'Southern African', taught: false },
  { id: 'west-asian', name: 'West Asian', taught: false },
  { id: 'central-asian', name: 'Central Asian', taught: false },
  { id: 'south-asian', name: 'South Asian', taught: false },
  { id: 'east-asian', name: 'East Asian', taught: false },
  { id: 'southeast-asian', name: 'Southeast Asian', taught: false },
  { id: 'east-european', name: 'East European', taught: false },
  { id: 'west-european', name: 'West European', taught: false },
  { id: 'south-european', name: 'South European', taught: false },
  { id: 'caribbean', name: 'Caribbean', taught: false },
  {
    id: 'indigenous-american',
    name: 'Indigenous American',
    taught: false,
  },
  { id: 'oceanian', name: 'Oceanian', taught: false },
  {
    id: 'classical',
    name: 'Classical',
    taught: false,
    note: 'On the globe (Classical, Opera, Film Scoring) but not yet a lesson family or a charted genre. Expected to become taught.',
  },
];

const GENRE_BY_ID = new Map(GENRES.map((g) => [g.id, g]));
export const getGenre = (id: string): Genre | undefined => GENRE_BY_ID.get(id);

/** Genres the curriculum actually teaches — the song library's own set. */
export const TAUGHT_GENRES: readonly Genre[] = GENRES.filter((g) => g.taught);

/**
 * How a song's `genreTags` value spells a genre id.
 *
 * The two vocabularies agree today — the library's slugs were spaced ('hip
 * hop', 'jam band') until they were hyphenated to be URL-safe, and this map
 * fell to an identity for those. It stays because the vocabularies are allowed
 * to diverge again later, and one mapping is better than a `.replace(' ', '-')`
 * scattered around.
 */
export const SONG_TAG_TO_GENRE: Record<string, string> = {
  rock: 'rock',
  pop: 'pop',
  funk: 'funk',
  folk: 'folk',
  rnb: 'rnb',
  jazz: 'jazz',
  'hip-hop': 'hip-hop',
  reggae: 'reggae',
  latin: 'latin',
  blues: 'blues',
  electronic: 'electronic',
  'jam-band': 'jam-band',
};

/**
 * The progression library's `styles` → genre ids.
 *
 * That vocabulary predates the graph and still spells one thing its own way —
 * `r&b`, where the graph says `rnb` — so it needs the same translation
 * `genreTags` needs.
 *
 * `gospel` and `african` are deliberately absent. Gospel is a tradition the
 * twelve do not name, and `african` is too broad for any of the regional
 * umbrellas — west-african and south-african are different places. Both are
 * left unmapped rather than forced somewhere plausible-looking.
 */
export const PROGRESSION_STYLE_TO_GENRE: Record<string, string> = {
  jazz: 'jazz',
  'r&b': 'rnb',
  // Neo-soul has no genre of its own; it is R&B with a particular harmony.
  'neo-soul': 'rnb',
  latin: 'latin',
  pop: 'pop',
  blues: 'blues',
  folk: 'folk',
  'hip-hop': 'hip-hop',
  reggae: 'reggae',
  funk: 'funk',
  'jam-band': 'jam-band',
  electronic: 'electronic',
  rock: 'rock',
};
