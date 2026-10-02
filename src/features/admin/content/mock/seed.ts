import { flowKey } from '@/content/flowStore';
import type { ArtistRow } from '@/content/records/compose';
import type { PlaceRecord } from '@/content/records/types';
import type {
  MockSeed,
  MockSeedItem,
  MockSuggestionSources,
} from './contentMockServer';
import { DECISIONS_FILE, parseDecisionsFile } from './decisions';
import type { Body } from './mockKinds';
import type { ContentMockMode } from './mockSwitch';
import { toLevel0 } from './songLevel0';
import { appPlannerFrom, readSuggestionArtifacts } from './suggestions';

/**
 * The mock's starting content: what the app ships today, as content items.
 *
 * Every source is a dynamic import. This module is itself only ever reached
 * through the mock's own dynamic import, but the song and event libraries are
 * several megabytes, and keeping them behind `import()` here too means no
 * static path can ever pull them onto an eager bundle.
 *
 * Everything is seeded as published, and the server gives each seeded kind a
 * live release, so the published view and the mock CDN have content from the
 * first request, as they would after the contract's import (priority 4).
 *
 * Artists, places, releases, studios and labels are read the way repo mode
 * reads them (src/scripts/repoContent/sources): the globe's roster and
 * cities, with the console's own records from `src/content/data/*.json`
 * composed in (src/content/records/compose.ts). So the rehearsal mock, the
 * read-only console's repo snapshot and repo mode all see one set. The
 * pilot songs' studios and labels (docs/console-content-api-contract.md,
 * priority 5) are the first rows of `studios.json` and `labels.json`. A
 * label's place is where the label was based, which is not always where the
 * song was recorded: Columbia was in New York.
 */

/** The one alias the place resolver knows today (places.ts), seeded at import. */
const CITY_ALIASES: Record<string, string[]> = {
  'new-york': ['New York', 'NYC'],
};

/**
 * Round-trip through JSON: the store only ever holds what a JSON request could
 * carry, so an `undefined` field in a .ts data file must not survive into a
 * body the diff and the schemas then disagree about.
 */
const plain = (value: unknown): Body => JSON.parse(JSON.stringify(value));

/**
 * A `src/content/data/*.json` file's records. The files are one record per
 * line, written by the repo store and checked against the record schemas
 * before every write; TypeScript's type for a JSON module is only what it
 * infers from the values (a release's `format` would be any string), so it
 * is set here instead.
 */
const recordsIn = <T>(file: { default: unknown }): readonly T[] =>
  file.default as readonly T[];

export async function loadSeed(mode: ContentMockMode): Promise<MockSeed> {
  const legacy = mode === 'legacy';
  const [
    songs,
    thankYou,
    thisMustBeThePlace,
    events,
    flows,
    locations,
    registry,
    cities,
    progressions,
    compose,
    artistRows,
    placeRows,
    releases,
    studios,
    labels,
  ] = await Promise.all([
    import('@/curriculum/data/songs/bundled'),
    import('@/curriculum/data/songs/thank_you'),
    import('@/curriculum/data/songs/this_must_be_the_place'),
    import('@/components/atlas/data/events'),
    import('@/curriculum/data/activityFlows/bundled'),
    import('@/scripts/artistLocations.json'),
    legacy ? null : import('@/components/atlas/data/artistRegistry'),
    legacy ? null : import('@/components/atlas/data/cities'),
    legacy ? null : import('@/curriculum/data/chordProgressionLibrary'),
    // Today's server holds none of the console's own records, and the
    // legacy mode is a rehearsal of today's server.
    legacy ? null : import('@/content/records/compose'),
    legacy ? null : import('@/content/data/artists.json'),
    legacy ? null : import('@/content/data/places.json'),
    legacy ? null : import('@/content/data/releases.json'),
    legacy ? null : import('@/content/data/studios.json'),
    legacy ? null : import('@/content/data/labels.json'),
  ]);
  const [allFlows, piano] = await Promise.all([
    flows.loadAllFlows(),
    flows.loadPianoFundamentals(),
  ]);

  const items: MockSeedItem[] = [];

  // The two charts bundled.ts leaves out are still songs in the content store
  // (the importer's "in the store, not in the repo" pair), and their globe
  // events exist, so the seed holds them as the store does.
  const allSongs: Record<string, object> = {
    ...songs.BUNDLED_SONGS,
    thank_you: thankYou.thank_you,
    this_must_be_the_place: thisMustBeThePlace.this_must_be_the_place,
  };
  for (const [id, song] of Object.entries(allSongs)) {
    const body = plain(song);
    // Production holds an older copy of every chart its schema refused; the
    // chart without the refused keys is the nearest the repo can get to it.
    items.push({
      kind: 'song',
      slug: id,
      body: legacy ? toLevel0(body) : body,
    });
  }

  for (const event of events.BUNDLED_MUSIC_HISTORY) {
    const songId = event.id.startsWith('song-')
      ? event.id.slice('song-'.length)
      : null;
    items.push({
      kind: 'globe_event',
      slug: event.id,
      body: plain(event),
      ...(songId && songId in allSongs
        ? { derivedFrom: { kind: 'song' as const, slug: songId } }
        : {}),
    });
  }

  // Published flows carry an id the app looks them up by; see flowStore.ts.
  for (const list of allFlows.values()) {
    for (const flow of list) {
      const id = flowKey(flow.genre, flow.level);
      items.push({
        kind: 'activity_flow',
        slug: id,
        body: plain({ ...flow, id }),
      });
    }
  }
  items.push({
    kind: 'fundamentals_flow',
    slug: 'piano-fundamentals',
    body: plain({ id: 'piano-fundamentals', ...piano }),
  });

  const locationFile = (locations.default ?? locations) as Record<
    string,
    { city: string; country: string; lat: number; lng: number }
  >;
  for (const [name, place] of Object.entries(locationFile))
    items.push({
      kind: 'artist_location',
      slug: name,
      body: plain({ id: name, ...place }),
    });

  // Today's server holds no globe cities (docs/songs-wiring-inventory.md), and
  // the legacy mode is a rehearsal of today's server. The places are the
  // globe's cities, then the ones it draws no pin for (places.json).
  if (cities && compose && placeRows) {
    const places = compose.composePlaces(
      cities.CITIES,
      recordsIn<PlaceRecord>(placeRows),
    );
    for (const place of places) {
      const aliases = CITY_ALIASES[place.id];
      items.push({
        kind: 'globe_city',
        slug: place.id,
        body: plain(aliases ? { ...place, aliases } : place),
      });
    }
  }

  // The globe's roster, each with its artists.json row's fields, then the
  // artists off the roster, whole from their rows.
  if (registry && compose && artistRows) {
    const artists = compose.composeArtists(
      registry.ARTIST_REGISTRY,
      recordsIn<ArtistRow>(artistRows),
    );
    for (const artist of artists)
      items.push({ kind: 'artist', slug: artist.slug, body: plain(artist) });
  }

  if (progressions) {
    for (const entry of progressions.default)
      items.push({
        kind: 'chord_progression',
        slug: String(entry.id),
        body: plain(entry),
      });
  }

  const records = [
    ['release', releases],
    ['studio', studios],
    ['label', labels],
  ] as const;
  for (const [kind, file] of records) {
    if (!file) continue;
    for (const record of recordsIn<{ slug: string }>(file))
      items.push({ kind, slug: record.slug, body: plain(record) });
  }

  return { items };
}

// ── Suggestions ─────────────────────────────────────────────────────────────

/**
 * The importer's committed artifacts and the owner's committed decisions
 * (src/scripts/enrichment/suggestions/*.json), as text, read only when the
 * mock starts: the rows (`artists.json`, `songs.json`), the records they
 * make (`places.json`, `record-places.json`, `releases.json`,
 * `labels.json`, `studios.json`, `artists-created.json`), the slug ledger
 * (`record-slugs.json`), `matches.json` and the manifest — about 11.6 MB,
 * read and checked in about 1.4 s under vitest (suggestions.ts
 * `readSuggestionArtifacts`). A file
 * that is not there yet is simply not in the map: the importer writes them,
 * and decisions.json exists once the owner first downloads one. DEV only,
 * like everything the mock reads.
 */
const SUGGESTION_FILES: Record<string, () => Promise<string>> = import.meta.env
  .DEV
  ? import.meta.glob<string>('/src/scripts/enrichment/suggestions/*.json', {
      query: '?raw',
      import: 'default',
    })
  : {};

/**
 * The Stage-1 planners' index, when it exists. Found through a glob rather
 * than imported by name, so the mock starts (with no app suggestions) while
 * the planners are still being written.
 */
const PLANNER_INDEX: Record<string, () => Promise<unknown>> = import.meta.env
  .DEV
  ? import.meta.glob('/src/content/linking/index.ts')
  : {};

/**
 * What `/suggestions` serves, for a server in `mode`: the importer's rows —
 * the artist half and the song half — with the records they need made
 * first, each run's calibration, the committed decisions to replay, and the
 * app's planners. Today's API has none.
 *
 * `files` and `planners` default to the repo's; tests hand in their own.
 */
export async function loadSuggestionSeed(
  mode: ContentMockMode,
  files: Record<string, () => Promise<string>> = SUGGESTION_FILES,
  planners: Record<string, () => Promise<unknown>> = PLANNER_INDEX,
): Promise<MockSuggestionSources> {
  if (mode === 'legacy') return {};
  const texts: Record<string, string> = Object.fromEntries(
    await Promise.all(
      Object.entries(files).map(
        async ([path, load]) => [path, await load()] as const,
      ),
    ),
  );
  const artifacts = readSuggestionArtifacts(texts);
  const decisions = Object.keys(texts).find((path) =>
    path.endsWith(`/${DECISIONS_FILE}`),
  );
  const index = Object.values(planners)[0];
  return {
    imported: artifacts.suggestions,
    batches: artifacts.batches,
    refused: artifacts.refused,
    ...(decisions ? { committed: parseDecisionsFile(texts[decisions]) } : {}),
    app: index ? appPlannerFrom(await index()) : null,
  };
}
