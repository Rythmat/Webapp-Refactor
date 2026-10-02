import {
  FILE_SCHEMAS,
  type GenreTagLists,
  genreTagListsFileSchema,
  RECORD_KEYS,
  VOCABULARY_VERSION,
  type VocabularyKind,
  type VocabularyRecordOf,
} from './schemas';

/**
 * The vocabulary files' text: a small header, then one record per line.
 *
 * The same shape as the importer's artifacts (`rowsJson` in
 * src/scripts/enrichment/import/emit.ts), for the same reason: a console
 * save, or a re-import, reads in `git diff` as the lines it changed. Records
 * keep their order, so an edit rewrites its own line in place and a new
 * record is one line appended; the genre and instrument order is what the
 * Vocabulary page and the pickers show, so it must not shuffle.
 *
 * Keys are written in each kind's fixed order (`RECORD_KEYS`) and an absent
 * optional field is left out, so the same records always give the same bytes:
 * `parse` then `serialize` returns the file unchanged. The files are in
 * .prettierignore, which would otherwise spread each record over lines.
 */

/** `{ … "key": [\n row,\n row\n] }`: one row per line. */
export function rowsJson(
  head: Record<string, unknown>,
  key: string,
  rows: unknown[],
) {
  const top = Object.entries(head)
    .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
    .join('\n');
  const body = rows.map((row) => `    ${JSON.stringify(row)}`).join(',\n');
  return `{\n${top}\n  ${JSON.stringify(key)}: [${rows.length ? `\n${body}\n  ` : ''}]\n}\n`;
}

/** `rowsJson` with several lists after the header, each one row per line. */
export function listsJson(
  head: Record<string, unknown>,
  lists: Record<string, readonly unknown[]>,
) {
  const top = Object.entries(head).map(
    ([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`,
  );
  const arrays = Object.entries(lists).map(([key, rows]) => {
    const body = rows.map((row) => `    ${JSON.stringify(row)}`).join(',\n');
    return `  ${JSON.stringify(key)}: [${rows.length ? `\n${body}\n  ` : ''}]`;
  });
  return `{\n${[...top, ...arrays].join(',\n')}\n}\n`;
}

/** The record with its keys in `keys` order, an undefined value left out. */
function ordered<T extends object>(record: T, keys: readonly (keyof T)[]) {
  const out: Partial<T> = {};
  for (const key of keys) {
    if (record[key] !== undefined) out[key] = record[key];
  }
  return out;
}

/** A kind's records → its file's text. */
export function serializeRecords<K extends VocabularyKind>(
  kind: K,
  records: readonly VocabularyRecordOf[K][],
): string {
  const keys = RECORD_KEYS[kind] as readonly (keyof VocabularyRecordOf[K])[];
  return rowsJson(
    { vocabularyVersion: VOCABULARY_VERSION, kind },
    'records',
    records.map((record) => ordered(record, keys)),
  );
}

/** A kind's file text → its records. Throws (a ZodError) on a bad file. */
export function parseRecords<K extends VocabularyKind>(
  kind: K,
  text: string,
): VocabularyRecordOf[K][] {
  return FILE_SCHEMAS[kind].parse(JSON.parse(text))
    .records as VocabularyRecordOf[K][];
}

/** The tag lists → `genreTagLists.json`'s text. */
export function serializeTagLists(lists: GenreTagLists): string {
  return listsJson(
    { vocabularyVersion: VOCABULARY_VERSION },
    {
      instrumentTags: lists.instrumentTags,
      ignoredTags: lists.ignoredTags,
      unplacedTags: lists.unplacedTags,
    },
  );
}

/** `genreTagLists.json`'s text → the tag lists. Throws on a bad file. */
export function parseTagLists(text: string): GenreTagLists {
  const { instrumentTags, ignoredTags, unplacedTags } =
    genreTagListsFileSchema.parse(JSON.parse(text));
  return { instrumentTags, ignoredTags, unplacedTags };
}
