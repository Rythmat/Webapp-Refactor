import type { Body } from '@/features/admin/content/mock/mockKinds';
import {
  type FilePlan,
  itemFrom,
  loadFailed,
  type RepoItem,
  type RepoReader,
  RepoContentError,
  type RepoSource,
} from './common';

/**
 * Where each billed act is from: `src/scripts/artistLocations.json`, which
 * the globe build turns into the song pins students see. Each entry is an
 * item (`artist_location`) whose slug is the act as the file spells it and
 * whose body is `{ id, city, country, lat, lng }`, as the mock seeds it.
 *
 * Read-only in repo mode (design B): the owner's rule is that pins never
 * move, so every change is refused with 403 `REPO_READ_ONLY`. The file is
 * still loaded, so the Table, the graph and the reference checks see it.
 */

export const ARTIST_LOCATIONS_FILE = 'src/scripts/artistLocations.json';

async function load(reader: RepoReader) {
  const file = await reader.read(ARTIST_LOCATIONS_FILE);
  if (!file) {
    throw loadFailed(ARTIST_LOCATIONS_FILE, new Error('the file is missing'));
  }
  let entries: unknown;
  try {
    entries = JSON.parse(file.text);
  } catch (error) {
    throw loadFailed(ARTIST_LOCATIONS_FILE, error);
  }
  if (
    typeof entries !== 'object' ||
    entries === null ||
    Array.isArray(entries)
  ) {
    throw loadFailed(
      ARTIST_LOCATIONS_FILE,
      new Error('it should be an object from act to place'),
    );
  }
  const items: RepoItem[] = Object.entries(entries).map(([name, place]) =>
    itemFrom('artist_location', name, { id: name, ...(place as Body) }, file),
  );
  return { items, files: [file], missing: [], warnings: [] };
}

export const artistLocationsSource: RepoSource = {
  name: 'artist locations',
  kinds: ['artist_location'],
  readOnly: true,
  files: async () => [ARTIST_LOCATIONS_FILE],
  load,
  async plan(changes): Promise<FilePlan[]> {
    if (!changes.length) return [];
    throw new RepoContentError(
      'REPO_READ_ONLY',
      403,
      `artist locations are read-only in repo mode: the song pins never move (${changes
        .map((change) => `'${change.slug}'`)
        .join(', ')})`,
      ARTIST_LOCATIONS_FILE,
    );
  },
};
