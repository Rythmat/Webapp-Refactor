import type { ResolvedGenre } from '@/content/graph/genreTags';
import type { Genre } from '@/content/graph/genres';
import type { TypicalGenre } from '@/content/graph/instrumentGenres';
import type { SessionInstrument } from '@/curriculum/data/instruments';
import type {
  GenreRecord,
  GenreTagLists,
  InstrumentRecord,
  SubgenreRecord,
  VocabularyRecords,
} from './schemas';

/**
 * The vocabulary modules' lookup tables, built from records.
 *
 * `genres.ts`, `genreTags.ts`, `instrumentGenres.ts` and
 * `curriculum/data/instruments.ts` export these tables; each builder below
 * returns one module's set under the module's own export names and types.
 * `repo.ts` hands in the repo's records, and the first three re-export what
 * comes out unchanged; the console can hand in the records it is editing.
 *
 * Records are passed in, never imported: this file imports types only, so
 * whatever loads it loads no JSON and no zod. The student app, which reaches
 * the instruments (the song page's pills), does not load it at all
 * (studentBundle.test.ts).
 *
 * Where records disagree (two records with one id, one tag on two records)
 * the later one wins, as a later key did in the code tables. Validation
 * (`validate.ts`) refuses a save that would make them disagree.
 */

/** `genres.ts`: the genres, without their tags, and the taught subset. */
export function genreTables(genres: readonly GenreRecord[]): {
  GENRES: readonly Genre[];
  getGenre: (id: string) => Genre | undefined;
  TAUGHT_GENRES: readonly Genre[];
} {
  const GENRES: Genre[] = genres.map(({ id, name, taught, note }) =>
    note === undefined ? { id, name, taught } : { id, name, taught, note },
  );
  const byId = new Map(GENRES.map((g) => [g.id, g]));
  return {
    GENRES,
    getGenre: (id) => byId.get(id),
    TAUGHT_GENRES: GENRES.filter((g) => g.taught),
  };
}

/**
 * `genreTags.ts`: the subgenre tree, the globe's tags on each level, the tag
 * lists and the resolver.
 *
 * A tag placed on a record resolves to it before the lists are consulted, so
 * placing a tag in the console is one record's write: it leaves the unplaced
 * list here without its file changing. The code checked the lists first; no
 * tag was both, so nothing resolves differently. Instrument and ignored tags
 * cannot be placed (validation refuses them), so they still resolve to null.
 */
export function genreTagTables(
  genres: readonly GenreRecord[],
  subgenres: readonly SubgenreRecord[],
  lists: GenreTagLists,
): {
  SUBGENRE_PARENT: Record<string, string>;
  TAG_TO_SUBGENRE: Record<string, string>;
  TAG_TO_GENRE: Record<string, string>;
  INSTRUMENT_TAGS: readonly string[];
  IGNORED_GENRE_TAGS: readonly string[];
  UNPLACED_GENRE_TAGS: readonly string[];
  resolveGenreTag: (tag: string) => ResolvedGenre | null;
} {
  const SUBGENRE_PARENT: Record<string, string> = {};
  const TAG_TO_SUBGENRE: Record<string, string> = {};
  const TAG_TO_GENRE: Record<string, string> = {};
  // The lookups read Maps, not the exported objects, so a tag spelled like an
  // Object.prototype key ('constructor') is just an unknown tag.
  const genreIds = new Set<string>();
  const genreByTag = new Map<string, string>();
  const subgenreByTag = new Map<string, string>();
  const parentOf = new Map<string, string>();

  for (const genre of genres) {
    genreIds.add(genre.id);
    for (const tag of genre.tags) {
      TAG_TO_GENRE[tag] = genre.id;
      genreByTag.set(tag, genre.id);
    }
  }
  for (const subgenre of subgenres) {
    SUBGENRE_PARENT[subgenre.id] = subgenre.parent;
    parentOf.set(subgenre.id, subgenre.parent);
    for (const tag of subgenre.tags) {
      TAG_TO_SUBGENRE[tag] = subgenre.id;
      subgenreByTag.set(tag, subgenre.id);
    }
  }

  /**
   * Where a globe genre string lands. Null when the tag carries no genre
   * signal, names an instrument, or has not been placed — callers treat that
   * as "unknown", never as a default genre.
   */
  const resolveGenreTag = (tag: string): ResolvedGenre | null => {
    const clean = tag.trim();
    if (!clean) return null;
    const direct = genreByTag.get(clean);
    if (direct) return { genre: direct };
    const subgenre = subgenreByTag.get(clean);
    if (!subgenre) return null;
    const genre = parentOf.get(subgenre);
    return genre && genreIds.has(genre) ? { genre, subgenre } : null;
  };

  return {
    SUBGENRE_PARENT,
    TAG_TO_SUBGENRE,
    TAG_TO_GENRE,
    INSTRUMENT_TAGS: [...lists.instrumentTags],
    IGNORED_GENRE_TAGS: [...lists.ignoredTags],
    UNPLACED_GENRE_TAGS: lists.unplacedTags.filter(
      (tag) => !genreByTag.has(tag) && !subgenreByTag.has(tag),
    ),
    resolveGenreTag,
  };
}

/**
 * `instrumentGenres.ts`: each instrument's `typicalIn`, as graph ids, for the
 * instruments that have any, in instrument order.
 *
 * An id is a subgenre when the subgenres have it and the genres do not;
 * otherwise it stays a genre, so an id in neither surfaces as a `missing`
 * node, as an artist's `genreIds` do (`genreRef` in deriveGraph.ts).
 */
export function instrumentGenreTable(
  instruments: readonly InstrumentRecord[],
  genres: readonly GenreRecord[],
  subgenres: readonly SubgenreRecord[],
): Readonly<Record<string, readonly TypicalGenre[]>> {
  const genreIds = new Set(genres.map((g) => g.id));
  const subgenreIds = new Set(subgenres.map((s) => s.id));
  const ref = (id: string): TypicalGenre =>
    subgenreIds.has(id) && !genreIds.has(id) ? `subgenre:${id}` : `genre:${id}`;
  const table: Record<string, readonly TypicalGenre[]> = {};
  for (const instrument of instruments) {
    if (instrument.typicalIn.length > 0) {
      table[instrument.id] = instrument.typicalIn.map(ref);
    }
  }
  return table;
}

/**
 * `curriculum/data/instruments.ts`: the session instruments, without
 * `typicalIn`. That module maps its file the same way itself, so the student
 * app loads nothing from this folder but the file; this is the mapping for
 * the console's tables, and tables.test.ts holds the two together.
 */
export function instrumentTables(instruments: readonly InstrumentRecord[]): {
  SESSION_INSTRUMENTS: readonly SessionInstrument[];
  getInstrument: (id: string) => SessionInstrument | undefined;
  INSTRUMENT_IDS: readonly string[];
} {
  const SESSION_INSTRUMENTS: SessionInstrument[] = instruments.map(
    ({ id, name, section, worldInstrumentId }) =>
      worldInstrumentId === undefined
        ? { id, name, section }
        : { id, name, section, worldInstrumentId },
  );
  const byId = new Map(SESSION_INSTRUMENTS.map((i) => [i.id, i]));
  return {
    SESSION_INSTRUMENTS,
    getInstrument: (id) => byId.get(id),
    INSTRUMENT_IDS: SESSION_INSTRUMENTS.map((i) => i.id),
  };
}

/** Every table the four modules export, from one set of records. */
export function buildVocabularyTables(records: VocabularyRecords) {
  const { genres, subgenres, instruments, tagLists } = records;
  return {
    ...genreTables(genres),
    ...genreTagTables(genres, subgenres, tagLists),
    INSTRUMENT_GENRES: instrumentGenreTable(instruments, genres, subgenres),
    ...instrumentTables(instruments),
  };
}

export type VocabularyTables = ReturnType<typeof buildVocabularyTables>;
