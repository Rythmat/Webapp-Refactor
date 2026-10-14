import type {
  EdgeKind,
  EntityId,
  GraphEdge,
  GraphNode,
  NodeStatus,
} from '@/content/graph/types';
import type { Song } from '@/curriculum/types/songLibrary';
import type { LessonCatalog, PlaceInfo } from '../catalog';
import type { LessonGraph } from '../graphQueries';
import type { TutorialInfo } from '../types';

/**
 * A small Atlas for the lesson generator's tests, built straight as nodes and
 * edges (what the generator reads), so each test can see exactly which
 * connections it is about. `cortexLesson.repo.test.ts` runs the generator on
 * the real graph.
 *
 *   Ana Lux    born in Motor City (1950), soul, active 1960s–70s; performs
 *              "Night Drive" (recorded in Motor City, on video, portrait),
 *              wrote "Sunrise", and is guessed to perform "Big Hit"; an event
 *              is about her debut, in Motor City, on video.
 *   Ben Ray    based in Motor City, born in Big City (a hub); performs
 *              "Sunrise".
 *   Cy Dee     born in Bay Town, house; performs "Low Tide" (recorded in
 *              Bay Town); the Bay Fest event is about Cy, in Bay Town.
 *   Motor City a soul scene; also "born in" for a missing artist and "based
 *              in" for an unconfirmed one, neither of which may be used.
 *   Big City   a hub: 45 artists are based there.
 */

interface NodeSpec {
  id: EntityId;
  label: string;
  status?: NodeStatus;
  unverified?: boolean;
}

interface EdgeSpec {
  from: EntityId;
  kind: EdgeKind;
  to: EntityId;
  inferred?: boolean;
  unverified?: boolean;
}

const kindOf = (id: EntityId) =>
  id.slice(0, id.indexOf(':')) as GraphNode['kind'];

export const fixtureGraph = (
  nodeSpecs: readonly NodeSpec[],
  edgeSpecs: readonly EdgeSpec[],
): LessonGraph => {
  const nodes = new Map<EntityId, GraphNode>();
  for (const spec of nodeSpecs)
    nodes.set(spec.id, {
      id: spec.id,
      kind: kindOf(spec.id),
      label: spec.label,
      status: spec.status ?? 'code',
      origin: 'code',
      ...(spec.unverified ? { unverified: true } : {}),
    });
  const adjacency = new Map<EntityId, GraphEdge[]>();
  for (const spec of edgeSpecs) {
    const edge: GraphEdge = {
      from: spec.from,
      kind: spec.kind,
      to: spec.to,
      via: [],
      ...(spec.inferred ? { inferred: true as const } : {}),
      ...(spec.unverified ? { unverified: true } : {}),
    };
    for (const end of [spec.from, spec.to])
      adjacency.set(end, [...(adjacency.get(end) ?? []), edge]);
  }
  const solidDegree = (id: EntityId) =>
    (adjacency.get(id) ?? []).filter((e) => !e.inferred && !e.unverified)
      .length;
  return { nodes, adjacency, solidDegree };
};

const fillers = Array.from({ length: 45 }, (_, i) => i + 1);

export const FIXTURE_NODES: NodeSpec[] = [
  { id: 'artist:ana-lux', label: 'Ana Lux' },
  { id: 'artist:ben-ray', label: 'Ben Ray' },
  { id: 'artist:cy-dee', label: 'Cy Dee' },
  { id: 'artist:ghost', label: 'Ghost', status: 'missing' },
  { id: 'artist:unsure', label: 'Unsure', unverified: true },
  { id: 'place:motor-city', label: 'Motor City' },
  { id: 'place:bay-town', label: 'Bay Town' },
  { id: 'place:big-city', label: 'Big City' },
  { id: 'place:no-pin', label: 'No Pin' },
  { id: 'place:region-north-america', label: 'North America' },
  { id: 'song:night_drive', label: 'Night Drive' },
  { id: 'song:sunrise', label: 'Sunrise' },
  { id: 'song:low_tide', label: 'Low Tide' },
  { id: 'song:big_hit', label: 'Big Hit' },
  { id: 'event:evt-ana-debut', label: 'Ana Lux releases “Night Drive”' },
  { id: 'event:evt-bay-fest', label: 'Bay Fest begins' },
  { id: 'genre:funk', label: 'Funk' },
  { id: 'genre:electronic', label: 'Electronic' },
  { id: 'subgenre:soul', label: 'Soul' },
  { id: 'subgenre:house', label: 'House' },
  { id: 'year:1950', label: '1950' },
  { id: 'decade:1960s', label: '1960s' },
  { id: 'decade:1970s', label: '1970s' },
  { id: 'progression:12', label: 'I–IV–V' },
  { id: 'vibe:uplifting', label: 'uplifting' },
  { id: 'vibe:groovy', label: 'groovy' },
  ...fillers.map((n) => ({
    id: `artist:filler-${n}` as EntityId,
    label: `Filler ${n}`,
  })),
];

export const FIXTURE_EDGES: EdgeSpec[] = [
  { from: 'song:night_drive', kind: 'performed_by', to: 'artist:ana-lux' },
  { from: 'song:night_drive', kind: 'recorded_in', to: 'place:motor-city' },
  { from: 'song:night_drive', kind: 'uses_progression', to: 'progression:12' },
  { from: 'progression:12', kind: 'has_vibe', to: 'vibe:uplifting' },
  { from: 'song:sunrise', kind: 'performed_by', to: 'artist:ben-ray' },
  { from: 'song:sunrise', kind: 'written_by', to: 'artist:ana-lux' },
  { from: 'song:sunrise', kind: 'has_vibe', to: 'vibe:groovy' },
  { from: 'song:low_tide', kind: 'performed_by', to: 'artist:cy-dee' },
  { from: 'song:low_tide', kind: 'recorded_in', to: 'place:bay-town' },
  {
    from: 'song:big_hit',
    kind: 'performed_by',
    to: 'artist:ana-lux',
    inferred: true,
  },
  { from: 'artist:ana-lux', kind: 'born_in', to: 'place:motor-city' },
  { from: 'artist:ana-lux', kind: 'born_year', to: 'year:1950' },
  { from: 'artist:ana-lux', kind: 'active_in', to: 'decade:1960s' },
  { from: 'artist:ana-lux', kind: 'active_in', to: 'decade:1970s' },
  { from: 'artist:ana-lux', kind: 'in_genre', to: 'subgenre:soul' },
  { from: 'artist:ben-ray', kind: 'based_in', to: 'place:motor-city' },
  { from: 'artist:ben-ray', kind: 'born_in', to: 'place:big-city' },
  { from: 'artist:cy-dee', kind: 'born_in', to: 'place:bay-town' },
  { from: 'artist:cy-dee', kind: 'in_genre', to: 'subgenre:house' },
  { from: 'subgenre:soul', kind: 'in_genre', to: 'genre:funk' },
  { from: 'subgenre:house', kind: 'in_genre', to: 'genre:electronic' },
  { from: 'event:evt-ana-debut', kind: 'about', to: 'artist:ana-lux' },
  {
    from: 'event:evt-ana-debut',
    kind: 'took_place_in',
    to: 'place:motor-city',
  },
  { from: 'event:evt-bay-fest', kind: 'about', to: 'artist:cy-dee' },
  { from: 'event:evt-bay-fest', kind: 'took_place_in', to: 'place:bay-town' },
  {
    from: 'place:motor-city',
    kind: 'located_in',
    to: 'place:region-north-america',
  },
  { from: 'place:motor-city', kind: 'scene_of', to: 'subgenre:soul' },
  { from: 'artist:ghost', kind: 'born_in', to: 'place:motor-city' },
  { from: 'artist:unsure', kind: 'based_in', to: 'place:motor-city' },
  ...fillers.map(
    (n): EdgeSpec => ({
      from: `artist:filler-${n}`,
      kind: 'based_in',
      to: 'place:big-city',
    }),
  ),
];

export const fixture = (): LessonGraph =>
  fixtureGraph(FIXTURE_NODES, FIXTURE_EDGES);

const song = (
  id: string,
  title: string,
  artist: string,
  over: Partial<Song> = {},
): Song =>
  ({
    id,
    title,
    artist,
    year: 1971,
    key: 'E major',
    mode: 'major',
    audioSources: [],
    ...over,
  }) as unknown as Song;

const place = (
  id: string,
  name: string,
  over: Partial<PlaceInfo> = {},
): PlaceInfo => ({
  id,
  name,
  coordinates: [40, -80],
  ...over,
});

export const FIXTURE_TUTORIALS: TutorialInfo[] = [
  ['make-first-track', 'Make your first track', true],
  ['jazz-color-your-chords', 'Jazz — Color your chords', true],
  ['hiphop-build-the-beat', 'Hip Hop — Build the beat', false],
  ['pop-flip-a-sample', 'Pop — Flip a sample', false],
  ['edm-design-the-drop', 'EDM — Design the drop', true],
  ['house-make-it-pump', 'House — Make it pump', false],
  ['rnb-mix-and-polish', 'R&B — Mix & polish', true],
  ['indie-movement-and-dynamics', 'Indie — Movement & dynamics', false],
].map(([id, title, needsPremium]) => ({
  id: id as string,
  title: title as string,
  estMinutes: 4,
  difficulty: 'Beginner',
  needsPremium: needsPremium as boolean,
}));

export const fixtureCatalog = (): LessonCatalog => ({
  songs: new Map(
    [
      song('night_drive', 'Night Drive', 'Ana Lux', {
        key: 'C major',
        audioSources: [
          {
            provider: 'youtube',
            uri: 'https://www.youtube.com/watch?v=nightDrive1',
            startOffsetSec: 12,
          },
        ] as Song['audioSources'],
        artistImageRef: '/artists/svg/ana-lux.webp',
      }),
      song('sunrise', 'Sunrise', 'Ben Ray', { key: 'D minor', mode: 'dorian' }),
      song('low_tide', 'Low Tide', 'Cy Dee', { key: 'A minor', mode: 'minor' }),
      song('big_hit', 'Big Hit', 'Ana Lux'),
    ].map((s) => [s.id, s]),
  ),
  places: new Map(
    [
      place('motor-city', 'Motor City', {
        description: 'Home of a famous sound.',
        coordinates: [42.3, -83.0],
      }),
      place('bay-town', 'Bay Town', { coordinates: [37.8, -122.3] }),
      place('big-city', 'Big City'),
      place('no-pin', 'No Pin', { pin: false }),
    ].map((p) => [p.id, p]),
  ),
  events: new Map(
    [
      {
        id: 'evt-ana-debut',
        title: 'Ana Lux releases “Night Drive”',
        year: 1971,
        videoId: 'anaDebut001',
        lat: 42.33,
        lng: -83.05,
      },
      {
        id: 'evt-bay-fest',
        title: 'Bay Fest begins',
        year: 1990,
        lat: 37.8,
        lng: -122.4,
      },
    ].map((e) => [e.id, e]),
  ),
  tutorials: FIXTURE_TUTORIALS,
});
