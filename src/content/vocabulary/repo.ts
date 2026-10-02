import TAG_LISTS_FILE from './genreTagLists.json';
import GENRE_FILE from './genres.json';
import INSTRUMENT_FILE from './instruments.json';
import type {
  GenreRecord,
  InstrumentRecord,
  SubgenreRecord,
  VocabularyRecords,
} from './schemas';
import SUBGENRE_FILE from './subgenres.json';
import { buildVocabularyTables } from './tables';

/**
 * The repo's vocabulary: the four files in this folder, as records, and the
 * tables the vocabulary modules export, built from them once.
 *
 * `genres.ts`, `genreTags.ts` and `instrumentGenres.ts` re-export these
 * tables, so their readers (the graph, the Table, the pickers, the
 * Vocabulary page, the importer, the API contract) read the files without
 * knowing it. Only console and graph code may load this module: it carries
 * the genre data, which no student page needs. The student app's one reader,
 * the song page's instrument pills, goes through
 * `curriculum/data/instruments.ts`, which reads `instruments.json` alone.
 *
 * The files are not parsed here: the schemas bring zod, and the bytes are
 * checked where they are written (the console's save) and in the tests
 * (`files.test.ts` parses every file under its schema). That test is also
 * what makes the casts below safe: a JSON import types `section` as any
 * string, and the schema holds it to the instrument sections.
 */

export const REPO_VOCABULARY: VocabularyRecords = {
  genres: GENRE_FILE.records as GenreRecord[],
  subgenres: SUBGENRE_FILE.records as SubgenreRecord[],
  instruments: INSTRUMENT_FILE.records as InstrumentRecord[],
  tagLists: {
    instrumentTags: TAG_LISTS_FILE.instrumentTags,
    ignoredTags: TAG_LISTS_FILE.ignoredTags,
    unplacedTags: TAG_LISTS_FILE.unplacedTags,
  },
};

/** Every table the vocabulary modules export, from the repo's files. */
export const REPO_TABLES = buildVocabularyTables(REPO_VOCABULARY);
