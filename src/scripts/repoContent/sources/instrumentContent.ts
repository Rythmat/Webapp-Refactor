import { format } from 'prettier';
import type { MockKind } from '@/features/admin/content/mock/mockKinds';
import { repoPrettierOptions } from '../tsWrite';
import {
  checkIdentity,
  type FilePlan,
  itemFrom,
  itemKey,
  type LoadedSource,
  loadFailed,
  mapLimit,
  oneChangePerItem,
  planFor,
  type RepoFile,
  type RepoItem,
  type RepoReader,
  type RepoSource,
  slugPattern,
} from './common';

/**
 * The console's instrument content, one JSON file per item (the shape the
 * Drum Grooves designer and the Parts Library have always written):
 *
 * | Kind | Files |
 * |---|---|
 * | `drum_groove` | `src/curriculum/data/drumGrooves/<id>.json`, and the Studio's imported grooves in `drumGrooves/studio/` |
 * | `instrument_part` | `src/curriculum/data/parts/<id>.json` |
 * | `feel_profile` | `src/curriculum/data/feels/<id>.json` |
 *
 * One adapter per kind, so a file made in one of these folders by hand is
 * known as that kind (`kindsOfPath` in repoStore.ts). A new item is written
 * to the kind's first folder; an existing one back where it was read from,
 * so a Studio groove stays with the Studio's. Each file is the body as JSON,
 * laid out by prettier with the repo's options, so an unchanged body writes
 * unchanged bytes.
 */

interface InstrumentFolders {
  name: string;
  kind: MockKind;
  /** Repo-relative folders, the first one taking new items. */
  dirs: readonly string[];
}

const jsonFiles = async (reader: RepoReader, dir: string) =>
  (await reader.list(dir))
    .filter((name) => name.endsWith('.json'))
    .map((name) => `${dir}/${name}`);

/** A body as its file's text: JSON, laid out by the repo's prettier. */
async function bodyText(body: unknown): Promise<string> {
  // Indented first: prettier keeps an object broken over lines when it was,
  // which is how every file here has always been laid out.
  return format(JSON.stringify(body, null, 2), {
    ...(await repoPrettierOptions()),
    parser: 'json',
  });
}

function instrumentSource({ name, kind, dirs }: InstrumentFolders): RepoSource {
  const files = async (reader: RepoReader) =>
    (await Promise.all(dirs.map((dir) => jsonFiles(reader, dir)))).flat();

  return {
    name,
    kinds: [kind],
    readOnly: false,
    files,

    async load(reader): Promise<LoadedSource> {
      const paths = await files(reader);
      const read = await mapLimit(paths, 16, (path) => reader.read(path));
      const items: RepoItem[] = [];
      const loaded: RepoFile[] = [];
      const warnings: string[] = [];
      for (const file of read) {
        if (!file) continue;
        loaded.push(file);
        let body: Record<string, unknown>;
        try {
          body = JSON.parse(file.text) as Record<string, unknown>;
        } catch (error) {
          throw loadFailed(file.path, error);
        }
        const fileId = file.path.slice(
          file.path.lastIndexOf('/') + 1,
          -'.json'.length,
        );
        const id = typeof body.id === 'string' ? body.id : fileId;
        if (id !== fileId) {
          warnings.push(
            `${file.path} holds ${kind} '${id}': the file is named for another id.`,
          );
        }
        items.push(itemFrom(kind, id, body, file));
      }
      return { items, files: loaded, missing: [], warnings };
    },

    async plan(changes, context, options): Promise<FilePlan[]> {
      oneChangePerItem(changes);
      const pattern = slugPattern(kind);
      const plans: FilePlan[] = [];
      for (const change of changes) {
        checkIdentity(change, 'id', pattern);
        const existing = context.item(kind, change.slug);
        const path = existing?.file ?? `${dirs[0]}/${change.slug}.json`;
        const file = context.file(path);
        const text = change.body === null ? null : await bodyText(change.body);
        const plan = planFor(
          path,
          file,
          text,
          [itemKey(kind, change.slug)],
          options?.force,
        );
        if (plan) plans.push(plan);
      }
      return plans;
    },
  };
}

export const drumGroovesSource = instrumentSource({
  name: 'drum grooves',
  kind: 'drum_groove',
  dirs: [
    'src/curriculum/data/drumGrooves',
    'src/curriculum/data/drumGrooves/studio',
  ],
});

export const instrumentPartsSource = instrumentSource({
  name: 'instrument parts',
  kind: 'instrument_part',
  dirs: ['src/curriculum/data/parts'],
});

export const feelProfilesSource = instrumentSource({
  name: 'feel profiles',
  kind: 'feel_profile',
  dirs: ['src/curriculum/data/feels'],
});
