import {
  type ArtistLocationInput,
  buildGraph,
  type Graph,
  type GraphSnapshot,
  matchSnapshotEvents,
} from '@/content/graph/deriveGraph';
import { INSTRUMENT_GENRES } from '@/content/graph/instrumentGenres';
import type { ArtistRow } from '@/content/records/compose';
import type {
  LabelRecord,
  PlaceRecord,
  ReleaseRecord,
  StudioRecord,
} from '@/content/records/types';
import {
  instrumentContentSnapshot,
  loadLessonInputs,
} from './instrumentContentSnapshot';

/**
 * A `src/content/data/*.json` file's records. The repo store writes them one
 * per line and checks them against the record schemas first; TypeScript's
 * type for a JSON module is only what it infers from the values (a release's
 * `format` would be any string), so it is set here instead.
 */
const recordsIn = <T>(file: { default: unknown }): readonly T[] =>
  file.default as readonly T[];

/**
 * The Atlas graph as the repo holds it: the "Repo snapshot" mode of the mind
 * map (design §3.5, checkpoint 1d).
 *
 * Most of it is code the app already bundles — the 640 chord charts, the
 * progression library, the artist registry, the cities, the globe's events,
 * song pins, pathways and influence arcs, and the canonical Teach year. The
 * rest is the console's own records, which no student module reads:
 * `src/content/data/*.json` holds the releases, studios and labels, the
 * places the globe draws no pin for, and every artist field the roster does
 * not keep (and every artist off it). The artists and places are composed
 * the way repo mode and the mock compose them
 * (src/content/records/compose.ts), so all three see one set. It shows what
 * the content says, before anything is authored in the console, which is the
 * point of shipping it first: the gaps are visible (credits on a handful of
 * songs, most artists joined to their songs only by a guess from the name).
 *
 * The working and published modes, from the content API and the CDN, arrive
 * with 1h. Every data import is dynamic, the record files and the code that
 * composes them included: the charts alone are ~3.3 MB, and none of it
 * belongs on the console's first load, let alone a student's.
 */
export async function loadRepoSnapshot(): Promise<GraphSnapshot> {
  const [
    { BUNDLED_SONGS },
    { default: progressions },
    { ARTIST_REGISTRY },
    { CITIES },
    { BUNDLED_MUSIC_HISTORY },
    { HISTORICAL_MODULES },
    { allConnections },
    { CANONICAL_ANNUAL_TEMPLATE },
    locations,
    { composeArtists, composePlaces },
    artistRows,
    placeRows,
    releases,
    studios,
    labels,
  ] = await Promise.all([
    import('@/curriculum/data/songs/bundled'),
    import('@/curriculum/data/chordProgressionLibrary'),
    import('@/components/atlas/data/artistRegistry'),
    import('@/components/atlas/data/cities'),
    import('@/components/atlas/data/events'),
    import('@/components/atlas/data/historicalModules'),
    import('@/components/atlas/data/eventConnections'),
    import('@/features/classroom/annual/curriculumTemplate'),
    import('@/scripts/artistLocations.json'),
    import('@/content/records/compose'),
    import('@/content/data/artists.json'),
    import('@/content/data/places.json'),
    import('@/content/data/releases.json'),
    import('@/content/data/studios.json'),
    import('@/content/data/labels.json'),
  ]);
  const units = [
    ...CANONICAL_ANNUAL_TEMPLATE.autumn.units,
    ...CANONICAL_ANNUAL_TEMPLATE.spring.units,
  ];
  // The song pins as the content store serves them: one `artist_location`
  // item per act, its id the act's name in lowercase (see the mock's seed).
  const pins = (locations.default ?? locations) as Record<
    string,
    Omit<ArtistLocationInput, 'id'>
  >;
  const artistLocations = Object.entries(pins).map(
    ([id, place]): ArtistLocationInput => ({ id, ...place }),
  );
  const snapshot: GraphSnapshot = {
    songs: Object.values(BUNDLED_SONGS),
    progressions,
    artists: composeArtists(ARTIST_REGISTRY, recordsIn<ArtistRow>(artistRows)),
    releases: recordsIn<ReleaseRecord>(releases),
    studios: recordsIn<StudioRecord>(studios),
    labels: recordsIn<LabelRecord>(labels),
    places: composePlaces(CITIES, recordsIn<PlaceRecord>(placeRows)),
    events: BUNDLED_MUSIC_HISTORY,
    artistLocations,
    dayStubs: units.flatMap((u) => u.dayStubs),
    pathways: HISTORICAL_MODULES,
    influenceArcs: allConnections(),
    instrumentGenres: INSTRUMENT_GENRES,
    // Drum grooves, parts, feels, synth patches and drum kits (code-owned),
    // and the genre lesson levels that play over the grooves.
    ...instrumentContentSnapshot(),
    lessons: await loadLessonInputs(),
    asOfYear: new Date().getFullYear(),
  };
  // Who each event is about, by the matcher the globe's artist chips use,
  // over everything above at once.
  return { ...snapshot, eventMatches: matchSnapshotEvents(snapshot) };
}

export interface AtlasGraph {
  snapshot: GraphSnapshot;
  graph: Graph;
}

let repoGraph: Promise<AtlasGraph> | null = null;

/**
 * The repo's graph, built once per page load: about 4.8k nodes and 18k
 * edges, matched and built in well under a second on the main thread. The
 * repo cannot change under a running console, so there is nothing to
 * invalidate.
 */
export const loadRepoGraph = (): Promise<AtlasGraph> =>
  (repoGraph ??= loadRepoSnapshot()
    .then((snapshot) => ({ snapshot, graph: buildGraph(snapshot) }))
    .catch((error: unknown) => {
      // A failed chunk load should be retryable, not cached for the session.
      repoGraph = null;
      throw error;
    }));
