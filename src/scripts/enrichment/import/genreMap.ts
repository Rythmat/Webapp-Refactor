import {
  type ResolvedGenre,
  resolveGenreTag,
  TAG_TO_GENRE,
  TAG_TO_SUBGENRE,
} from '@/content/graph/genreTags';
import { normalizeArtistName } from '@/content/graph/slugs';

/**
 * A genre as Wikidata or MusicBrainz names it → our genre or subgenre.
 *
 * The curated table (`genreTags.ts`) is keyed by the globe's Title Case
 * strings, case-sensitively: 'Soul', 'Hip Hop', 'R&B'. Wikidata says "soul
 * music", "hip hop music", "rhythm and blues"; MusicBrainz says "soul",
 * "hip hop", "r&b". So the lookup folds case, accents and punctuation (the
 * artist-name normaliser, which also reads "&" as "and"), drops a trailing
 * " music", and knows a few names the table spells otherwise. A name that
 * lands nowhere is reported and suggests nothing: better no genre than a
 * forced one.
 */

const key = (text: string): string =>
  normalizeArtistName(text)
    .replace(/ music$/, '')
    .trim();

/**
 * Names the sources use for a tag the table spells differently. Exported for
 * the vocabulary's checks: a console edit that removes a tag named here is
 * warned about (`ALIAS_TAG_REMOVED` in src/content/vocabulary/validate.ts).
 */
export const ALIASES: Record<string, string> = {
  'rhythm and blues': 'R&B',
  rnb: 'R&B',
  'contemporary r and b': 'R&B',
  'hip hop': 'Hip Hop',
  hiphop: 'Hip Hop',
  'rock n roll': 'Rock and Roll',
  'electronic dance': 'Electronic',
  electronica: 'Electronic',
  popular: 'Pop',
};

let index: Map<string, ResolvedGenre> | null = null;

function built(): Map<string, ResolvedGenre> {
  if (index) return index;
  index = new Map();
  // Genres first: where a name is both, the genre is the plainer reading.
  for (const tag of [
    ...Object.keys(TAG_TO_GENRE),
    ...Object.keys(TAG_TO_SUBGENRE),
  ]) {
    const resolved = resolveGenreTag(tag);
    if (resolved && !index.has(key(tag))) index.set(key(tag), resolved);
  }
  for (const [alias, tag] of Object.entries(ALIASES)) {
    const resolved = resolveGenreTag(tag);
    if (resolved && !index.has(alias)) index.set(alias, resolved);
  }
  return index;
}

/** Our genre (and subgenre) for a source's genre name, or null. */
export function mapGenre(name: string): ResolvedGenre | null {
  return built().get(key(name)) ?? null;
}

/** The id an artist's `genreIds[]` holds: the subgenre when there is one. */
export const genreIdOf = (resolved: ResolvedGenre): string =>
  resolved.subgenre ?? resolved.genre;
