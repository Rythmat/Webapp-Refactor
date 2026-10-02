import { z } from 'zod';
import { SLUG_PATTERN } from '@/content/graph/ids';
import {
  INSTRUMENT_SECTIONS,
  type InstrumentSection,
} from '@/curriculum/data/instruments';

/**
 * The Atlas's own vocabularies as data: genres, subgenres and session
 * instruments, one record per line in `src/content/vocabulary/*.json`.
 *
 * They were code (`genres.ts`, `genreTags.ts`, `instrumentGenres.ts`,
 * `curriculum/data/instruments.ts`) until the owner made them editable in the
 * console (30 Sep 2026). The files hold what those modules held and nothing
 * more; the modules build their tables from the records (`tables.ts`), so
 * every export keeps its shape. What maps OTHER vocabularies onto these stays
 * in code: `SONG_TAG_TO_GENRE`, `PROGRESSION_STYLE_TO_GENRE`, the section
 * blurbs, the importers' aliases.
 *
 * THE KINDS
 *
 *  - `genre`: `taught` says the curriculum covers it, and only code changes
 *    that (a new genre is never taught). `tags` are the globe's own spellings
 *    that simply are this genre: 'Hip Hop' and 'Hip-Hop'.
 *  - `subgenre`: always under one `parent` genre. Umbrella or subgenre is the
 *    kind, not a field, because the level is part of the graph id
 *    (`genre:` or `subgenre:`), and an id never changes. `name` is the label
 *    the graph showed before it had one (the id, title-cased), so moving to
 *    data changed no label.
 *  - `instrument`: `typicalIn` holds bare genre or subgenre ids, like an
 *    artist's `genreIds`; the level is looked up, which is safe because no id
 *    is both (validation keeps it so).
 *
 * The tag lists (globe genre strings that name an instrument, describe reach
 * or format, or wait to be placed) live in `genreTagLists.json`. They are not
 * editable in the console yet; placing an unplaced tag is adding it to a
 * record, which takes it off the list without touching the list's file.
 *
 * Field order in each schema below is the order the files write keys in.
 */

/** Bumped whenever a file's shape changes. */
export const VOCABULARY_VERSION = 1;

export type VocabularyKind = 'genre' | 'subgenre' | 'instrument';

export const VOCABULARY_KINDS: readonly VocabularyKind[] = [
  'genre',
  'subgenre',
  'instrument',
];

/** Each file's name, in `src/content/vocabulary/`. */
export const VOCABULARY_FILES = {
  genre: 'genres.json',
  subgenre: 'subgenres.json',
  instrument: 'instruments.json',
  tagLists: 'genreTagLists.json',
} as const;

/** Text a person reads: never blank, never padded. */
const text = z
  .string()
  .refine((value) => value !== '' && value.trim() === value, {
    message: 'Must not be blank or start or end with a space',
  });

/**
 * A globe genre string, exactly as the globe writes it. `resolveGenreTag`
 * trims what it is given before looking it up, so a padded tag could never
 * match anything.
 */
const tag = text;

const slug = (kind: VocabularyKind) =>
  z.string().regex(SLUG_PATTERN[kind], `Not a ${kind} id (kebab-case)`);

const SECTIONS = INSTRUMENT_SECTIONS.map((s) => s.section) as [
  InstrumentSection,
  ...InstrumentSection[],
];

export const genreRecordSchema = z
  .object({
    id: slug('genre'),
    name: text,
    taught: z.boolean(),
    /** Why it exists without being taught. */
    note: text.optional(),
    tags: z.array(tag),
  })
  .strict();

export const subgenreRecordSchema = z
  .object({
    id: slug('subgenre'),
    name: text,
    parent: slug('genre'),
    tags: z.array(tag),
  })
  .strict();

export const instrumentRecordSchema = z
  .object({
    id: slug('instrument'),
    name: text,
    section: z.enum(SECTIONS),
    /** The globe's Instruments of the World entry, when it is the same instrument. */
    worldInstrumentId: text.optional(),
    /** Genre or subgenre ids, the most specific style the instrument defines. */
    typicalIn: z.array(
      z
        .string()
        .regex(
          SLUG_PATTERN.subgenre,
          'Not a genre or subgenre id (kebab-case)',
        ),
    ),
  })
  .strict();

export type GenreRecord = z.infer<typeof genreRecordSchema>;
export type SubgenreRecord = z.infer<typeof subgenreRecordSchema>;
export type InstrumentRecord = z.infer<typeof instrumentRecordSchema>;

/** A kind → its record type. */
export interface VocabularyRecordOf {
  genre: GenreRecord;
  subgenre: SubgenreRecord;
  instrument: InstrumentRecord;
}

export const RECORD_SCHEMAS = {
  genre: genreRecordSchema,
  subgenre: subgenreRecordSchema,
  instrument: instrumentRecordSchema,
} as const;

/** The order each kind's keys are written in: its schema's field order. */
export const RECORD_KEYS: {
  [K in VocabularyKind]: readonly (keyof VocabularyRecordOf[K])[];
} = {
  genre: Object.keys(genreRecordSchema.shape) as (keyof GenreRecord)[],
  subgenre: Object.keys(subgenreRecordSchema.shape) as (keyof SubgenreRecord)[],
  instrument: Object.keys(
    instrumentRecordSchema.shape,
  ) as (keyof InstrumentRecord)[],
};

const recordsFile = <K extends VocabularyKind>(kind: K) =>
  z
    .object({
      vocabularyVersion: z.literal(VOCABULARY_VERSION),
      kind: z.literal(kind),
      records: z.array(RECORD_SCHEMAS[kind]),
    })
    .strict();

/** A records file: a small header, then `records`, one per line. */
export const FILE_SCHEMAS = {
  genre: recordsFile('genre'),
  subgenre: recordsFile('subgenre'),
  instrument: recordsFile('instrument'),
} as const;

export const genreTagListsFileSchema = z
  .object({
    vocabularyVersion: z.literal(VOCABULARY_VERSION),
    /** Instruments wearing a genre tag (`INSTRUMENT_TAGS`). */
    instrumentTags: z.array(tag),
    /** Reach or format, not music (`IGNORED_GENRE_TAGS`). */
    ignoredTags: z.array(tag),
    /** Not placed yet, most frequent first (`UNPLACED_GENRE_TAGS`). */
    unplacedTags: z.array(tag),
  })
  .strict();

export type GenreTagLists = Omit<
  z.infer<typeof genreTagListsFileSchema>,
  'vocabularyVersion'
>;

/** Every vocabulary file's content, as records. */
export interface VocabularyRecords {
  genres: readonly GenreRecord[];
  subgenres: readonly SubgenreRecord[];
  instruments: readonly InstrumentRecord[];
  tagLists: GenreTagLists;
}
