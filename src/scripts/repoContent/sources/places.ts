import {
  composePlaces,
  type PlaceHome,
  placeHome,
} from '@/content/records/compose';
import type { PlaceRecord } from '@/content/records/types';
import type { Body } from '@/features/admin/content/mock/mockKinds';
import { JSON_LINES_LAYOUTS } from '../jsonLines';
import { CITIES_DECLARATION } from '../literal';
import { TS_FILE_KINDS, writeTsElements } from '../tsWrite';
import {
  badChange,
  checkIdentity,
  declarationValue,
  type FilePlan,
  type ItemChange,
  itemFrom,
  itemKey,
  jsonLinesRecords,
  jsonLinesText,
  loadFailed,
  oneChangePerItem,
  type PlanContext,
  type PlanOptions,
  planFor,
  readJsonLinesFile,
  type RepoItem,
  type RepoReader,
  type RepoSource,
  slugPattern,
  unwritable,
} from './common';

/**
 * Places (`globe_city`): two files, chosen by `pin` (design C.1).
 *
 *  - A place the globe draws a pin for (`pin` absent or true) is one of the
 *    globe's cities, in `src/components/atlas/data/cities.ts` (`CITIES`),
 *    which students see. It is edited surgically, as an element found by
 *    its `id`; a new one is appended.
 *  - A place with no pin (`pin: false`: a hometown, a studio's town) lives
 *    in `src/content/data/places.json`, one record per line, which no
 *    student module reads. It starts out empty (`[]`); if it has gone
 *    missing, it reads as no places.
 *
 * `placeHome` (`src/content/records/compose.ts`) decides the file, so
 * flipping `pin` moves the record: out of one file and into the other, in
 * the same save. That puts a pin on the students' globe or takes one off,
 * which is what flipping it means. Loading composes the two with
 * `composePlaces`, which refuses a place held in both or in the wrong one.
 */

export const CITIES_FILE = 'src/components/atlas/data/cities.ts';
export const PLACES_FILE = 'src/content/data/places.json';

const PLACE_ID = slugPattern('globe_city');
const LAYOUT = JSON_LINES_LAYOUTS.globe_city;

async function load(reader: RepoReader) {
  const cities = await reader.read(CITIES_FILE);
  if (!cities) throw loadFailed(CITIES_FILE, new Error('the file is missing'));
  let cityBodies: PlaceRecord[];
  try {
    cityBodies = declarationValue(
      cities,
      CITIES_DECLARATION,
    ) as unknown as PlaceRecord[];
  } catch (error) {
    throw loadFailed(CITIES_FILE, error);
  }
  const places = await readJsonLinesFile(reader, PLACES_FILE, LAYOUT);
  let composed: PlaceRecord[];
  try {
    composed = composePlaces(
      cityBodies,
      places.records as unknown as PlaceRecord[],
    );
  } catch (error) {
    throw loadFailed(PLACES_FILE, error);
  }
  const items: RepoItem[] = composed.map((place) => {
    const file = placeHome(place) === 'cities' ? cities : places.file!;
    return itemFrom('globe_city', place.id, place as unknown as Body, file);
  });
  return {
    items,
    files: places.file ? [cities, places.file] : [cities],
    missing: places.file ? [] : [PLACES_FILE],
    warnings: places.warnings,
  };
}

async function plan(
  changes: readonly ItemChange[],
  context: PlanContext,
  options: PlanOptions = {},
): Promise<FilePlan[]> {
  oneChangePerItem(changes);
  const upsert: Body[] = [];
  const remove: string[] = [];
  const citiesItems: string[] = [];
  const placesItems: string[] = [];
  const placesFile = context.file(PLACES_FILE);
  // The rows as the loaded file has them, by id.
  const rows = new Map(
    jsonLinesRecords(PLACES_FILE, placesFile, LAYOUT).records.map((row) => [
      String(row.id),
      row,
    ]),
  );

  for (const change of changes) {
    checkIdentity(change, 'id', PLACE_ID);
    const key = itemKey('globe_city', change.slug);
    const existing = context.item('globe_city', change.slug);
    if (!existing && change.body === null) {
      throw badChange(change, 'there is no such place');
    }
    const from: PlaceHome | null = existing
      ? existing.file === CITIES_FILE
        ? 'cities'
        : 'places'
      : null;
    const to: PlaceHome | null = change.body
      ? placeHome(change.body as Pick<PlaceRecord, 'pin'>)
      : null;
    if (from === 'cities' || to === 'cities') citiesItems.push(key);
    if (from === 'places' || to === 'places') placesItems.push(key);
    if (from === 'cities' && to !== 'cities') remove.push(change.slug);
    if (to === 'cities') upsert.push(change.body!);
    if (from === 'places' && to !== 'places') rows.delete(change.slug);
    if (to === 'places') rows.set(change.slug, change.body!);
  }

  const plans: FilePlan[] = [];
  if (citiesItems.length) {
    const cities = context.file(CITIES_FILE);
    if (!cities)
      throw loadFailed(CITIES_FILE, new Error('the file is missing'));
    try {
      const written = await writeTsElements({
        text: cities.text,
        fileName: CITIES_FILE,
        ...TS_FILE_KINDS.cities,
        upsert,
        remove,
        force: options.force,
      });
      const planned = planFor(
        CITIES_FILE,
        cities,
        written.text,
        citiesItems,
        options.force,
      );
      if (planned) plans.push(planned);
    } catch (error) {
      throw unwritable(CITIES_FILE, error);
    }
  }
  if (placesItems.length) {
    const text = jsonLinesText(PLACES_FILE, [...rows.values()], LAYOUT);
    const planned = planFor(
      PLACES_FILE,
      placesFile,
      text,
      placesItems,
      options.force,
    );
    if (planned) plans.push(planned);
  }
  return plans;
}

export const placesSource: RepoSource = {
  name: 'places',
  kinds: ['globe_city'],
  readOnly: false,
  files: async () => [CITIES_FILE, PLACES_FILE],
  load,
  plan,
};
