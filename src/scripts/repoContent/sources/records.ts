import type { MockKind } from '@/features/admin/content/mock/mockKinds';
import { JSON_LINES_LAYOUTS } from '../jsonLines';
import {
  badChange,
  checkIdentity,
  type FilePlan,
  type ItemChange,
  itemFrom,
  itemKey,
  jsonLinesRecords,
  jsonLinesText,
  type LoadedSource,
  oneChangePerItem,
  type PlanContext,
  type PlanOptions,
  planFor,
  readJsonLinesFile,
  type RepoReader,
  type RepoSource,
  slugPattern,
} from './common';

/**
 * Releases, studios and labels: the records that have no TypeScript home,
 * each kind in its own one-record-per-line file under `src/content/data/`
 * (`jsonLines.ts`), sorted by slug with the keys in the schema's order.
 * No student module reads them.
 *
 * The files start out in the repo: `studios.json` and `labels.json` with
 * the pilot songs' four studios and four labels (which the mock seeds from
 * the same files), `releases.json` empty. A file that has gone missing all
 * the same reads as no records, and the next save creates it.
 */

export const RECORD_FILES = {
  release: 'src/content/data/releases.json',
  studio: 'src/content/data/studios.json',
  label: 'src/content/data/labels.json',
} as const;

type RecordKind = keyof typeof RECORD_FILES;
const RECORD_KINDS = Object.keys(RECORD_FILES) as RecordKind[];

async function load(reader: RepoReader): Promise<LoadedSource> {
  const out: LoadedSource = { items: [], files: [], missing: [], warnings: [] };
  for (const kind of RECORD_KINDS) {
    const path = RECORD_FILES[kind];
    const read = await readJsonLinesFile(
      reader,
      path,
      JSON_LINES_LAYOUTS[kind],
    );
    out.warnings.push(...read.warnings);
    if (!read.file) {
      out.missing.push(path);
      continue;
    }
    out.files.push(read.file);
    for (const record of read.records) {
      out.items.push(itemFrom(kind, String(record.slug), record, read.file));
    }
  }
  return out;
}

async function plan(
  changes: readonly ItemChange[],
  context: PlanContext,
  options: PlanOptions = {},
): Promise<FilePlan[]> {
  oneChangePerItem(changes);
  const plans: FilePlan[] = [];
  for (const kind of RECORD_KINDS) {
    const mine = changes.filter((change) => change.kind === kind);
    if (!mine.length) continue;
    const path = RECORD_FILES[kind];
    const layout = JSON_LINES_LAYOUTS[kind];
    const file = context.file(path);
    const rows = new Map(
      jsonLinesRecords(path, file, layout).records.map((row) => [
        String(row.slug),
        row,
      ]),
    );
    for (const change of mine) {
      checkIdentity(change, 'slug', slugPattern(kind as MockKind));
      if (change.body === null) {
        if (!rows.delete(change.slug)) {
          throw badChange(change, `there is no such ${kind}`);
        }
      } else rows.set(change.slug, change.body);
    }
    const text = jsonLinesText(path, [...rows.values()], layout);
    const planned = planFor(
      path,
      file,
      text,
      mine.map((change) => itemKey(kind, change.slug)),
      options.force,
    );
    if (planned) plans.push(planned);
  }
  return plans;
}

export const recordsSource: RepoSource = {
  name: 'records',
  kinds: RECORD_KINDS,
  readOnly: false,
  files: async () => Object.values(RECORD_FILES),
  load,
  plan,
};
