import type { Body } from '@/features/admin/content/mock/mockKinds';
import { EVENTS_DECLARATION } from '../literal';
import { TS_FILE_KINDS, writeTsElements } from '../tsWrite';
import {
  badChange,
  byCodeUnit,
  checkIdentity,
  declarationValue,
  type FilePlan,
  type ItemChange,
  itemFrom,
  itemKey,
  loadFailed,
  oneChangePerItem,
  type PlanContext,
  type PlanOptions,
  planFor,
  type RepoFile,
  type RepoItem,
  type RepoReader,
  type RepoSource,
  slugPattern,
  unwritable,
} from './common';

/**
 * Globe events: the 16 arrays under `src/components/atlas/data/events/`,
 * one `export const <GENRE>_EVENTS = [...]` per file, which `index.ts`
 * spreads into `BUNDLED_MUSIC_HISTORY` for students.
 *
 * An event is edited where it stands: the element with its `id` in the file
 * that holds it, changed surgically (`tsWrite.ts`), with the other events
 * and the section comments between them left byte for byte. Deleting one
 * cuts only its element.
 *
 * A new event needs a file (design C.1). A `song-` event goes to
 * `songLibrary.ts`, which holds the 640 of them; there is no song-to-event
 * derivation in repo mode, so one is only ever written when it is edited
 * directly. An `evt-` event goes to the file mapped from its first genre,
 * and the map is read off the files themselves: each first genre belongs to
 * the file whose `evt-` events have it first most often (`Afrobeats` to
 * `african.ts`, `Salsa` to `latin.ts`, `Electronic` to `electronic.ts`
 * rather than `musicForMedia.ts`). A genre no file has goes to `world.ts`.
 * The new event is appended to the end of the file's array.
 */

export const EVENTS_DIR = 'src/components/atlas/data/events';
export const SONG_EVENTS_FILE = `${EVENTS_DIR}/songLibrary.ts`;
export const FALLBACK_EVENTS_FILE = `${EVENTS_DIR}/world.ts`;

const EVENT_ID = slugPattern('globe_event');

const isEventsFileName = (name: string) =>
  name.endsWith('.ts') && !name.endsWith('.d.ts') && name !== 'index.ts';

async function eventFiles(reader: RepoReader): Promise<string[]> {
  return (await reader.list(EVENTS_DIR))
    .filter(isEventsFileName)
    .map((name) => `${EVENTS_DIR}/${name}`);
}

/** An event's first genre, when it has one. */
const firstGenre = (body: Body): string | undefined => {
  const genre = body.genre;
  if (Array.isArray(genre)) {
    return typeof genre[0] === 'string' ? genre[0] : undefined;
  }
  return typeof genre === 'string' ? genre : undefined;
};

/**
 * Which file each first genre belongs to, read off the loaded events: the
 * file whose `evt-` events have it first most often, the earlier file (in
 * code-unit order) on a tie. `songLibrary.ts` takes no part: its events are
 * the songs' own.
 */
export function eventFileRoutes(
  events: readonly RepoItem[],
): Map<string, string> {
  const counts = new Map<string, Map<string, number>>();
  for (const event of events) {
    if (!event.slug.startsWith('evt-') || event.file === SONG_EVENTS_FILE) {
      continue;
    }
    const genre = firstGenre(event.body);
    if (genre === undefined) continue;
    const byFile = counts.get(genre) ?? new Map<string, number>();
    byFile.set(event.file, (byFile.get(event.file) ?? 0) + 1);
    counts.set(genre, byFile);
  }
  const routes = new Map<string, string>();
  for (const [genre, byFile] of counts) {
    const [file] = [...byFile].sort(
      ([a, x], [b, y]) => y - x || byCodeUnit(a, b),
    )[0];
    routes.set(genre, file);
  }
  return routes;
}

/** The file a new event goes to. */
export function routeNewEvent(
  body: Body,
  routes: ReadonlyMap<string, string>,
): string {
  if (String(body.id).startsWith('song-')) return SONG_EVENTS_FILE;
  const genre = firstGenre(body);
  return (genre !== undefined && routes.get(genre)) || FALLBACK_EVENTS_FILE;
}

async function load(reader: RepoReader) {
  const paths = await eventFiles(reader);
  const files: RepoFile[] = [];
  const items: RepoItem[] = [];
  const where = new Map<string, string>();
  const problems: string[] = [];
  for (const path of paths) {
    const file = await reader.read(path);
    if (!file)
      throw loadFailed(path, new Error('the file vanished while loading'));
    files.push(file);
    let events: unknown[];
    try {
      events = declarationValue(file, EVENTS_DECLARATION) as unknown[];
    } catch (error) {
      throw loadFailed(path, error);
    }
    events.forEach((event, index) => {
      const id = (event as { id?: unknown } | null)?.id;
      if (
        typeof event !== 'object' ||
        event === null ||
        typeof id !== 'string'
      ) {
        problems.push(
          `${path}: element ${index + 1} is not an event with an id`,
        );
        return;
      }
      const other = where.get(id);
      if (other) {
        problems.push(`the event '${id}' is in ${other} and in ${path}`);
        return;
      }
      where.set(id, path);
      items.push(itemFrom('globe_event', id, event as Body, file));
    });
  }
  if (problems.length) {
    throw loadFailed(EVENTS_DIR, new Error(problems.join('; ')));
  }
  return { items, files, missing: [], warnings: [] };
}

async function plan(
  changes: readonly ItemChange[],
  context: PlanContext,
  options: PlanOptions = {},
): Promise<FilePlan[]> {
  oneChangePerItem(changes);
  let routes: Map<string, string> | undefined;
  const byFile = new Map<
    string,
    { upsert: Body[]; remove: string[]; items: string[] }
  >();
  const target = (path: string) => {
    const entry = byFile.get(path) ?? { upsert: [], remove: [], items: [] };
    byFile.set(path, entry);
    return entry;
  };

  for (const change of changes) {
    checkIdentity(change, 'id', EVENT_ID);
    const existing = context.item('globe_event', change.slug);
    const key = itemKey('globe_event', change.slug);
    if (change.body === null) {
      if (!existing) throw badChange(change, 'there is no such event');
      const entry = target(existing.file);
      entry.remove.push(change.slug);
      entry.items.push(key);
      continue;
    }
    let path = existing?.file;
    if (!path) {
      routes ??= eventFileRoutes(context.items('globe_event'));
      path = routeNewEvent(change.body, routes);
      if (!context.file(path)) {
        throw badChange(change, `its events file, ${path}, does not exist`);
      }
    }
    const entry = target(path);
    entry.upsert.push(change.body);
    entry.items.push(key);
  }

  const plans: FilePlan[] = [];
  for (const [path, entry] of byFile) {
    const file = context.file(path);
    if (!file) throw loadFailed(path, new Error('the file is missing'));
    try {
      const written = await writeTsElements({
        text: file.text,
        fileName: path,
        ...TS_FILE_KINDS.events,
        upsert: entry.upsert,
        remove: entry.remove,
        force: options.force,
      });
      const planned = planFor(
        path,
        file,
        written.text,
        entry.items,
        options.force,
      );
      if (planned) plans.push(planned);
    } catch (error) {
      throw unwritable(path, error);
    }
  }
  return plans;
}

export const eventsSource: RepoSource = {
  name: 'events',
  kinds: ['globe_event'],
  readOnly: false,
  files: eventFiles,
  load,
  plan,
};
