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

import { REPO_TABLES } from '@/content/vocabulary/repo';

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
 * The genres, in the order the Vocabulary page and the pickers list them:
 * the twelve the song library already normalises to, the regional umbrellas,
 * and Classical, which the globe needs and the curriculum does not teach yet.
 *
 * They are data now, one per line in src/content/vocabulary/genres.json,
 * which the console edits (the owner's call, 30 Sep 2026); this module
 * re-exports what `src/content/vocabulary/repo.ts` builds from that file, so
 * every reader sees the same exports it did when the list was code.
 *
 * REGIONAL UMBRELLAS
 *
 * The globe is a history of all music; the curriculum teaches a Western
 * popular subset. 275 traditions had no parent among the twelve — Griot,
 * Qawwali, Maqam, Amapiano, Powwow. Rather than force them under Pop or
 * gather them into a single "World Music" bucket, they sit under the region
 * they come from. Slugs mirror the globe's own region ids so a genre and a
 * place can be tied together.
 *
 * `getGenre` looks a genre up by id; `TAUGHT_GENRES` is the curriculum's own
 * set, the song library's. Whether a genre is taught is code's call even in
 * the file: the console never changes it, and a new genre is never taught.
 */
export const { GENRES, getGenre, TAUGHT_GENRES } = REPO_TABLES;

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
 * A value is a genre id or, like an artist's `genreIds`, a subgenre id from
 * `SUBGENRE_PARENT`: the edge lands on whichever level the id belongs to, and
 * a subgenre walks up to its genre from there. `gospel` is the one subgenre —
 * the owner filed the style under the Atlas's existing Gospel (30 Sep 2026),
 * which the twelve do not name.
 *
 * `african` is deliberately absent. It is too broad for any of the regional
 * umbrellas — west-african and south-african are different places — so it is
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
  // A subgenre (under Funk in genreTags.ts), not one of the genres above.
  gospel: 'gospel',
};
