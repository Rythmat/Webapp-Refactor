import { SLUG_PATTERN } from '@/content/graph/ids';
import {
  RECORD_SCHEMAS,
  VOCABULARY_FILES,
  VOCABULARY_KINDS,
  VOCABULARY_VERSION,
  type VocabularyKind,
  type VocabularyRecordOf,
  type VocabularyRecords,
} from '@/content/vocabulary/schemas';
import { serializeRecords } from '@/content/vocabulary/serialize';
import type { Body, MockKind } from '@/features/admin/content/mock/mockKinds';
import type { MockVocabularySources } from '@/features/admin/content/mock/vocabulary';
import { firstDifference, formatPath, type Json, toJson } from '../literal';
import {
  badChange,
  checkIdentity,
  type FilePlan,
  type ItemChange,
  itemFrom,
  itemKey,
  type LoadedSource,
  loadFailed,
  oneChangePerItem,
  type PlanContext,
  type PlanOptions,
  planFor,
  type RepoFile,
  type RepoReader,
  RepoContentError,
  type RepoSource,
} from './common';
import { LIBRARY_FILE } from './progressions';

/**
 * The Atlas's own vocabularies: genres, subgenres and session instruments,
 * one record per line in `src/content/vocabulary/{genres,subgenres,
 * instruments}.json` (the vocabulary design, sections 2 to 5). A record's
 * `id` is its slug, and it never changes.
 *
 * The files keep their rows in the order they are in, because the genre and
 * instrument order is what the Vocabulary page and the pickers show: an edit
 * rewrites its record's line where it stands, a new record is one line
 * appended, and a delete takes its line out. Each file is written by the
 * vocabulary's own serializer (`serialize.ts`: a small header, then the
 * records with their keys in the kind's schema order), so an unchanged file
 * reads back byte for byte, and git shows a one-field edit as one line.
 *
 * A save can also change the content API's copy of the vocabulary,
 * `src/scripts/apiContract/vocabulary.generated.json`, and with it that
 * file's hash in `manifest.json` (a genre's name, a new subgenre, an
 * instrument's section: `buildVocabulary` says which fields count). Both are
 * worked out here, with the same code `writeVocabularyContract` runs
 * (`vocabularyContractTexts`), from the records about to be written, and
 * planned beside the vocabulary file. So all three go through the store's
 * hash check and are written together, the store's own-write record covers
 * the manifest the console imports, and a tag edit, which the API's copy
 * does not hold, plans neither. `regeneratedContractFiles` names them among
 * a save's plans, for the server to report.
 *
 * The tag lists (`genreTagLists.json`) are not items: the console does not
 * edit them yet, and placing an unplaced tag is a record's write.
 *
 * Whether a record is valid against the rest (a parent that is a genre, a
 * tag on one record only) is the content server's check, which runs before
 * a change reaches this adapter. Here a changed record must fit its file's
 * schema, and every record must read back from the new text as intended;
 * anything else is refused with `REPO_UNWRITABLE`, and nothing is written.
 */

const DIR = 'src/content/vocabulary';

/** Each kind's file, repo-relative. */
export const VOCABULARY_DATA_FILES: Readonly<Record<VocabularyKind, string>> = {
  genre: `${DIR}/${VOCABULARY_FILES.genre}`,
  subgenre: `${DIR}/${VOCABULARY_FILES.subgenre}`,
  instrument: `${DIR}/${VOCABULARY_FILES.instrument}`,
};

/**
 * The content API's copy of the vocabulary and the manifest that records
 * its hash (`writeVocabulary.ts`), repo-relative. A vocabulary save plans
 * them when their text would change.
 */
export const VOCABULARY_CONTRACT_FILES = {
  vocabulary: 'src/scripts/apiContract/vocabulary.generated.json',
  manifest: 'src/scripts/apiContract/manifest.json',
} as const;

const CONTRACT_PATHS: readonly string[] = Object.values(
  VOCABULARY_CONTRACT_FILES,
);

/**
 * The contract files among a save's plans: what a vocabulary save
 * regenerated besides its own file, for the server to name in its answer.
 */
export const regeneratedContractFiles = (
  plans: readonly Pick<FilePlan, 'path'>[],
): string[] =>
  plans
    .map((planned) => planned.path)
    .filter((path) => CONTRACT_PATHS.includes(path));

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * A vocabulary file's records, as JSON: its header must name its kind and
 * the version this code writes, and every record must carry an id. What
 * else a record holds is the content server's to check, so a hand edit that
 * broke one record shows on its row instead of stopping every kind loading.
 */
function recordsIn(kind: VocabularyKind, file: RepoFile): Body[] {
  let data: unknown;
  try {
    data = JSON.parse(file.text);
  } catch (error) {
    throw loadFailed(file.path, error);
  }
  if (
    !isPlainObject(data) ||
    data.vocabularyVersion !== VOCABULARY_VERSION ||
    data.kind !== kind ||
    !Array.isArray(data.records)
  ) {
    throw loadFailed(
      file.path,
      new Error(
        `it should be { "vocabularyVersion": ${VOCABULARY_VERSION}, "kind": "${kind}", "records": [one record per line] }`,
      ),
    );
  }
  const seen = new Set<string>();
  return data.records.map((record: unknown, index: number) => {
    const id = isPlainObject(record) ? record.id : undefined;
    if (typeof id !== 'string' || id === '') {
      throw loadFailed(file.path, new Error(`record ${index + 1} has no id`));
    }
    if (seen.has(id)) {
      throw loadFailed(
        file.path,
        new Error(`the id '${id}' is on two records`),
      );
    }
    seen.add(id);
    return record as Body;
  });
}

/** Records typed as the serializer takes them; the schemas are checked where it matters. */
const asRecords = <K extends VocabularyKind>(_kind: K, records: Body[]) =>
  records as unknown as VocabularyRecordOf[K][];

async function load(reader: RepoReader): Promise<LoadedSource> {
  const out: LoadedSource = { items: [], files: [], missing: [], warnings: [] };
  for (const kind of VOCABULARY_KINDS) {
    const path = VOCABULARY_DATA_FILES[kind];
    const file = await reader.read(path);
    if (!file) {
      out.missing.push(path);
      continue;
    }
    const records = recordsIn(kind, file);
    if (serializeRecords(kind, asRecords(kind, records)) !== file.text) {
      out.warnings.push(
        `${path} is not in the one-record-per-line layout; its next write re-lays the whole file`,
      );
    }
    out.files.push(file);
    for (const record of records) {
      out.items.push(itemFrom(kind, String(record.id), record, file));
    }
  }
  for (const path of CONTRACT_PATHS) {
    const file = await reader.read(path);
    if (file) {
      out.files.push(file);
      continue;
    }
    out.missing.push(path);
    out.warnings.push(
      `${path} is missing, so a vocabulary save cannot bring the API's copy of the vocabulary up to date`,
    );
  }
  return out;
}

const unwritableFile = (path: string, reason: string) =>
  new RepoContentError(
    'REPO_UNWRITABLE',
    422,
    `${path}: ${reason}; nothing was written`,
    path,
  );

/**
 * The file's new text, checked: each changed record fits its kind's schema
 * (the strict one the file is held to), and parsing the text gives back
 * every record as intended, in the same order.
 */
function recordsText(
  kind: VocabularyKind,
  path: string,
  records: readonly Body[],
  changed: ReadonlySet<string>,
): string {
  for (const record of records) {
    if (!changed.has(String(record.id))) continue;
    const parsed = RECORD_SCHEMAS[kind].safeParse(record);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const at = issue.path.length ? `${issue.path.join('.')}: ` : '';
      throw unwritableFile(
        path,
        `the ${kind} '${String(record.id)}' is not a record the file can hold (${at}${issue.message})`,
      );
    }
  }
  const text = serializeRecords(kind, asRecords(kind, [...records]));
  const back = (JSON.parse(text) as { records: unknown[] }).records;
  const problems: string[] = [];
  if (back.length !== records.length) {
    problems.push(
      `${records.length} records written, ${back.length} read back`,
    );
  }
  records.forEach((record, index) => {
    if (index >= back.length) return;
    const differs = firstDifference(
      toJson(back[index]),
      toJson(record) as Json,
    );
    if (differs !== null) {
      problems.push(
        `the ${kind} '${String(record.id)}' reads back different at ${formatPath(differs)}`,
      );
    }
  });
  if (problems.length) {
    throw unwritableFile(
      path,
      `the new text does not read back as intended (${problems.slice(0, 5).join('; ')}${problems.length > 5 ? ` and ${problems.length - 5} more` : ''})`,
    );
  }
  return text;
}

/**
 * The contract files' plans for the vocabulary as it will be: none when
 * their text stays the same (and nothing forces them), or when either file
 * is missing (the load warned). The progression styles in the API's copy
 * come from the library as the store has it.
 */
async function contractPlans(
  next: Readonly<Record<VocabularyKind, readonly Body[]>>,
  context: PlanContext,
  items: readonly string[],
  force: boolean | undefined,
): Promise<FilePlan[]> {
  const vocabularyFile = context.file(VOCABULARY_CONTRACT_FILES.vocabulary);
  const manifestFile = context.file(VOCABULARY_CONTRACT_FILES.manifest);
  if (!vocabularyFile || !manifestFile) return [];
  const records = {
    genres: next.genre,
    subgenres: next.subgenre,
    instruments: next.instrument,
  } as unknown as Pick<
    VocabularyRecords,
    'genres' | 'subgenres' | 'instruments'
  >;
  const progressions = context.file(LIBRARY_FILE)
    ? context.items('chord_progression').map((item) => ({
        styles: Array.isArray(item.body.styles)
          ? item.body.styles.filter(
              (style): style is string => typeof style === 'string',
            )
          : [],
      }))
    : undefined;
  // Loaded only when a vocabulary change is planned: it brings the whole
  // progression library and the vibe engine with it.
  const { vocabularyContractTexts } = await import(
    '@/scripts/apiContract/writeVocabulary'
  );
  let texts: { vocabulary: string; manifest: string };
  try {
    texts = vocabularyContractTexts(
      { vocabulary: vocabularyFile.text, manifest: manifestFile.text },
      records,
      progressions,
    );
  } catch (error) {
    throw unwritableFile(
      manifestFile.path,
      `the vocabulary's hash cannot be recorded (${error instanceof Error ? error.message : String(error)})`,
    );
  }
  return [
    planFor(
      vocabularyFile.path,
      vocabularyFile,
      texts.vocabulary,
      items,
      force,
    ),
    planFor(manifestFile.path, manifestFile, texts.manifest, items, force),
  ].filter((planned): planned is FilePlan => planned !== null);
}

async function plan(
  changes: readonly ItemChange[],
  context: PlanContext,
  options: PlanOptions = {},
): Promise<FilePlan[]> {
  oneChangePerItem(changes);
  const plans: FilePlan[] = [];
  const touched: string[] = [];
  const next = {} as Record<VocabularyKind, Body[]>;
  for (const kind of VOCABULARY_KINDS) {
    const path = VOCABULARY_DATA_FILES[kind];
    const file = context.file(path);
    const records = file ? recordsIn(kind, file) : [];
    next[kind] = records;
    const mine = changes.filter((change) => change.kind === kind);
    if (!mine.length) continue;
    for (const change of mine) {
      checkIdentity(change, 'id', SLUG_PATTERN[kind]);
      const index = records.findIndex((record) => record.id === change.slug);
      if (change.body === null) {
        if (index < 0) throw badChange(change, `there is no such ${kind}`);
        records.splice(index, 1);
      } else if (index < 0) records.push(change.body);
      else records[index] = change.body;
    }
    const keys = mine.map((change) => itemKey(kind, change.slug));
    const text = recordsText(
      kind,
      path,
      records,
      new Set(mine.filter((change) => change.body !== null).map((c) => c.slug)),
    );
    const planned = planFor(path, file, text, keys, options.force);
    if (planned) plans.push(planned);
    touched.push(...keys);
  }
  if (touched.length) {
    plans.push(...(await contractPlans(next, context, touched, options.force)));
  }
  return plans;
}

export const vocabularySource: RepoSource = {
  name: 'vocabulary',
  kinds: VOCABULARY_KINDS as readonly MockKind[],
  readOnly: false,
  files: async () => [
    ...Object.values(VOCABULARY_DATA_FILES),
    ...CONTRACT_PATHS,
  ],
  load,
  plan,
};

/**
 * What the content server's vocabulary rules read, the importer's tables
 * included: pass it as `createContentMockServer({ vocabulary })` in repo
 * mode. App code may not import the importer (appBoundary.test.ts), so the
 * server's own defaults (`REPO_VOCABULARY_SOURCES`) leave out the tags the
 * importer's genre aliases lead to (without them a save that takes one off
 * is not warned, ALIAS_TAG_REMOVED) and its instrument aliases (without
 * them an instrument an alias leads to could be deleted). This store runs
 * in Node, where it may.
 *
 * Loaded when called, so loading the store's items does not pay for it.
 */
export async function repoVocabularySources(): Promise<MockVocabularySources> {
  const [{ REPO_VOCABULARY_SOURCES }, genreMap, instrumentMap] =
    await Promise.all([
      import('@/features/admin/content/mock/vocabulary'),
      import('@/scripts/enrichment/import/genreMap'),
      import('@/scripts/enrichment/import/instrumentMap'),
    ]);
  return {
    ...REPO_VOCABULARY_SOURCES,
    context: {
      ...REPO_VOCABULARY_SOURCES.context,
      aliasTags: Object.values(genreMap.ALIASES),
    },
    codeTables: [
      ...REPO_VOCABULARY_SOURCES.codeTables,
      {
        name: 'instrumentMap.ts ALIASES',
        names: ['instrument'],
        table: instrumentMap.ALIASES,
      },
    ],
  };
}
