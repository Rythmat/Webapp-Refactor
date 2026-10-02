import type { HistoricalEvent } from '@/components/atlas/types';
import { edgesForProgression, edgesForSong } from '@/content/graph/deriveEdges';
import {
  assembleGraph,
  edgesForArtist,
  edgesForPlace,
  edgesForSongYear,
  type GraphSnapshot,
} from '@/content/graph/deriveGraph';
import type {
  Edge,
  EntityId,
  EntityKind,
  GraphNode,
} from '@/content/graph/types';
import type { ArtistRecord, PlaceRecord } from '@/content/records/types';
import type { ChordProgressionEntry } from '@/curriculum/data/chordProgressionLibrary';
import type { Song } from '@/curriculum/types/songLibrary';
import type { TableInput, TableItem } from '../model/buildTableModel';

/**
 * A small Atlas for the Table's model and query tests: Toto and friends, two
 * globe events, two progressions, three places.
 *
 * Records' edges come from the graph's own derivers, so their `via` paths are
 * the real ones; the events' edges are written out by hand the way the event
 * deriver states them (stored ids solid, title matches and the city dotted),
 * so these tests do not move when that deriver does.
 */

const song = (body: Partial<Song> & Pick<Song, 'id' | 'title'>): Song =>
  ({ genreTags: [], ...body }) as Song;

export const SONGS: readonly Song[] = [
  song({
    id: 'africa',
    title: 'Africa',
    artist: 'Toto',
    year: 1982,
    key: 'B major',
    mode: 'major',
    genreTags: ['rock'],
    credits: [
      {
        name: 'David Paich',
        role: 'songwriter',
        artistGlobeId: 'david-paich',
      },
      {
        name: 'Jeff Porcaro',
        role: 'performer',
        instrument: 'drum-kit',
        artistGlobeId: 'jeff-porcaro',
      },
      {
        name: 'Jeff Porcaro',
        role: 'performer',
        instrument: 'gong',
        artistGlobeId: 'jeff-porcaro',
        unverified: true,
      },
      { name: 'Lenny Castro', role: 'performer', instrument: 'congas' },
    ],
  }),
  song({
    id: 'rosanna',
    title: 'Rosanna',
    artist: 'Toto',
    origin: { artistGlobeId: 'toto' } as Song['origin'],
    year: 1982,
    key: 'G',
    mode: 'minor',
    genreTags: ['pop'],
  }),
  song({
    id: 'hold_the_line',
    title: 'Hold the Line',
    artist: 'Toto',
    key: 'F minor',
    mode: 'minor',
  }),
];

export const ARTISTS: readonly ArtistRecord[] = [
  // `born` arrives with the stored fields (C2); the model reads it already.
  {
    slug: 'toto',
    name: 'Toto',
    group: true,
    aliases: ['TOTO'],
    basedInPlaceId: 'los-angeles',
    genreIds: ['rock', 'made-up'],
    activeFrom: 1977,
    members: [{ artistId: 'jeff-porcaro', instrumentIds: ['drum-kit'] }],
    born: { date: '1977', placeId: 'los-angeles' },
  } as ArtistRecord,
  {
    slug: 'jeff-porcaro',
    name: 'Jeff Porcaro',
    born: { date: '1954-04-01', placeId: 'hartford', unverified: true },
    activeFrom: 1972,
    activeTo: 1992,
    instrumentIds: ['drum-kit'],
  } as ArtistRecord,
  { slug: 'david-paich', name: 'David Paich' },
  { slug: 'sinead-oconnor', name: 'Sinéad O’Connor' },
  { slug: 'hall-and-oates', name: 'Hall & Oates', group: true },
];

const city = (
  id: string,
  name: string,
  subdivision: string,
  extra: Partial<PlaceRecord> = {},
): PlaceRecord => ({
  id,
  name,
  country: 'US',
  subdivision,
  region: 'north-america',
  coordinates: [34.0522, -118.2437],
  genres: [],
  description: '',
  activeDecades: [],
  ...extra,
});

export const PLACES: readonly PlaceRecord[] = [
  city('los-angeles', 'Los Angeles', 'California'),
  city('hartford', 'Hartford', 'Connecticut', { pin: false }),
];

export const EVENTS: readonly HistoricalEvent[] = [
  {
    id: 'evt-live-aid',
    year: 1985,
    title: 'Live Aid',
    description: '',
    location: { lat: 41.6, lng: -87.3, city: 'Gary', country: 'US' },
    genre: ['Rock', 'Zzyzx Beat'],
    tags: ['toto'],
  },
  {
    id: 'evt-grammys-1983',
    year: 1983,
    title: 'Toto sweeps the Grammys',
    description: '',
    location: { lat: 34, lng: -118, city: 'Los Angeles', country: 'US' },
    genre: ['Pop'],
    tags: ['toto', 'los angeles'],
  },
];

const progression = (
  entry: Partial<ChordProgressionEntry> & Pick<ChordProgressionEntry, 'id'>,
): ChordProgressionEntry => ({
  progression: '1 – 5 – 6 – 4',
  chords: ['I', 'V', 'vi', 'IV'],
  chordCount: 4,
  startingChord: 'I',
  startingDegree: '1',
  complexity: 'simple',
  vibes: [],
  styles: [],
  artist: '',
  song: '',
  ...entry,
});

export const PROGRESSIONS: readonly ChordProgressionEntry[] = [
  progression({
    id: 1,
    song: 'Rosanna- Toto',
    artist: 'Toto',
    styles: ['rock'],
  }),
  progression({ id: 2, song: 'Africa', songIds: ['africa'], styles: ['pop'] }),
];

/** An edge as the event deriver states it. */
const eventEdge = (
  event: string,
  kind: Edge['kind'],
  to: EntityId,
  path: string,
  guessed = false,
): Edge => ({
  from: `event:${event}`,
  kind,
  to,
  via: { item: `event:${event}`, path },
  ...(guessed ? { inferred: true as const } : {}),
});

const EVENT_EDGES: readonly Edge[] = [
  eventEdge('evt-live-aid', 'about', 'artist:toto', 'tags[]', true),
  eventEdge('evt-live-aid', 'in_genre', 'genre:rock', 'genre[]'),
  eventEdge('evt-live-aid', 'from_year', 'year:1985', 'year'),
  eventEdge('evt-grammys-1983', 'about', 'artist:toto', 'artistIds[]'),
  eventEdge('evt-grammys-1983', 'about', 'song:rosanna', 'title', true),
  eventEdge('evt-grammys-1983', 'in_genre', 'genre:pop', 'genre[]'),
  eventEdge('evt-grammys-1983', 'from_year', 'year:1983', 'year'),
  eventEdge(
    'evt-grammys-1983',
    'took_place_in',
    'place:los-angeles',
    'location.city',
    true,
  ),
];

export const SNAPSHOT: GraphSnapshot = {
  songs: SONGS,
  artists: ARTISTS,
  places: PLACES,
  events: EVENTS,
  progressions: PROGRESSIONS,
};

const kindOf = (id: EntityId) => id.slice(0, id.indexOf(':')) as EntityKind;

const seed = (
  id: EntityId,
  label: string,
  status: GraphNode['status'] = 'code',
  extra: Partial<GraphNode> = {},
): GraphNode => ({
  id,
  kind: kindOf(id),
  label,
  status,
  origin: status === 'code' || status === 'missing' ? 'code' : 'api',
  ...extra,
});

const SEEDS: readonly GraphNode[] = [
  ...SONGS.map((s) => seed(`song:${s.id}`, s.title)),
  seed('artist:toto', 'Toto', 'pending'),
  seed('artist:jeff-porcaro', 'Jeff Porcaro', 'code', { unverified: true }),
  seed('artist:david-paich', 'David Paich', 'draft'),
  seed('artist:sinead-oconnor', 'Sinéad O’Connor'),
  seed('artist:hall-and-oates', 'Hall & Oates'),
  ...PLACES.map((p) => seed(`place:${p.id}`, p.name)),
  ...EVENTS.map((e) => seed(`event:${e.id}`, e.title)),
  ...PROGRESSIONS.map((p) => seed(`progression:${p.id}`, p.progression)),
];

/** The fixture's edges: the records' own, plus the events'. */
export const EDGES: readonly Edge[] = [
  ...SONGS.flatMap((s) => [...edgesForSong(s), ...edgesForSongYear(s)]),
  ...ARTISTS.flatMap(edgesForArtist),
  ...PLACES.flatMap(edgesForPlace),
  ...PROGRESSIONS.flatMap(edgesForProgression),
  ...EVENT_EDGES,
  // A subgenre in use, so the genres table has one to expand over.
  {
    from: 'song:hold_the_line',
    kind: 'in_genre',
    to: 'subgenre:acid-rock',
    via: { item: 'song:hold_the_line', path: 'subgenreIds[]' },
  },
];

export const fixtureGraph = () => assembleGraph(SEEDS, EDGES);

/** The API's copies of a few rows, as working mode joins them. */
export const ITEMS: ReadonlyMap<EntityId, TableItem> = new Map<
  EntityId,
  TableItem
>([
  [
    'artist:toto',
    {
      id: 'db-toto',
      status: 'published',
      editState: 'pending',
      body: { ...ARTISTS[0], bio: 'Session players from Los Angeles.' },
    },
  ],
  [
    'artist:david-paich',
    {
      id: 'db-paich',
      status: 'draft',
      editState: 'rejected',
      body: null,
      pendingBody: { slug: 'david-paich', name: 'David Paich' },
    },
  ],
  [
    'artist:old-act',
    {
      id: 'db-old',
      status: 'archived',
      editState: null,
      body: { slug: 'old-act', name: 'An Old Act' },
    },
  ],
]);

/** The fixture as the Table is handed it, in working mode. */
export const fixtureInput = (over: Partial<TableInput> = {}): TableInput => ({
  graph: fixtureGraph(),
  snapshot: SNAPSHOT,
  items: ITEMS,
  ...over,
});
