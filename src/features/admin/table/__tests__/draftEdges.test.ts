import { describe, expect, it } from 'vitest';
import { CITIES } from '@/components/atlas/data/cities';
import {
  assembleGraph,
  buildGraph,
  edgesForArtist,
  type Graph,
  type GraphSnapshot,
} from '@/content/graph/deriveGraph';
import type { EntityId, GraphEdge } from '@/content/graph/types';
import type { ContentKind } from '@/hooks/data/admin/useAdminContent';
import { type DraftEdges, draftEdgesOf } from '../panel/draftEdges';
import {
  ARTISTS,
  EVENTS,
  fixtureGraph,
  PLACES,
  PROGRESSIONS,
  SONGS,
} from './tableFixtures';

/**
 * The row panel's live draft edges: the item's own deriver run on the
 * draft and on the version it is laid on, laid over the graph's edges of
 * the row — what a save would add, take away or make surer, with every
 * edge other items state left as the graph has it.
 */

type Body = Record<string, unknown>;

const overlay = (
  graph: Graph,
  kind: ContentKind,
  node: EntityId,
  base: Body,
  draft: Body,
) =>
  draftEdgesOf({
    graph,
    kind,
    node,
    slug: node.slice(node.indexOf(':') + 1),
    base,
    draft,
    asOfYear: 2026,
  })!;

/** Each edge of the overlay as "kind other · mark", in its groups' order. */
const lines = (result: DraftEdges) =>
  result.groups.flatMap((group) =>
    group.edges.map(
      ({ edge, other, style }) =>
        `${edge.kind} ${other} ${style}${
          result.marks.get(edge) ? ` · ${result.marks.get(edge)}` : ''
        }`,
    ),
  );

const marked = (result: DraftEdges) =>
  lines(result).filter((line) => line.includes(' · '));

const TOTO = ARTISTS[0] as unknown as Body;
const PORCARO = ARTISTS[1] as unknown as Body;

describe('a draft laid over the graph', () => {
  it('marks nothing while the draft says what is saved', () => {
    const graph = fixtureGraph();
    const result = overlay(graph, 'artist', 'artist:toto', TOTO, { ...TOTO });
    expect(marked(result)).toEqual([]);
    expect([result.added, result.removed, result.restyled]).toEqual([0, 0, 0]);
    // The same edges the panel lists without a draft.
    expect(lines(result)).toHaveLength(
      graph.adjacency.get('artist:toto')!.length,
    );
  });

  it('adds and removes what the item itself states', () => {
    const result = overlay(fixtureGraph(), 'artist', 'artist:toto', TOTO, {
      ...TOTO,
      basedInPlaceId: 'hartford',
      genreIds: ['rock', 'made-up', 'pop'],
    });
    expect(marked(result).sort()).toEqual([
      'based_in place:hartford solid · added',
      'based_in place:los-angeles solid · removed',
      'in_genre genre:pop solid · added',
    ]);
    expect([result.added, result.removed, result.restyled]).toEqual([2, 1, 0]);
  });

  it('keeps every edge other items state as the graph has it', () => {
    const graph = fixtureGraph();
    const result = overlay(graph, 'artist', 'artist:toto', TOTO, {
      ...TOTO,
      genreIds: [],
    });
    // The events about Toto, the songs Toto performed: theirs, untouched.
    const kept = lines(result).filter(
      (line) => line.startsWith('about ') || line.startsWith('performed_by '),
    );
    expect(kept).toEqual(
      expect.arrayContaining([
        'about event:evt-live-aid dotted',
        'about event:evt-grammys-1983 solid',
      ]),
    );
    expect(marked(result).sort()).toEqual([
      'in_genre genre:made-up hollow · removed',
      'in_genre genre:rock solid · removed',
    ]);
  });

  it('follows a birth date to its year', () => {
    const result = overlay(
      fixtureGraph(),
      'artist',
      'artist:jeff-porcaro',
      PORCARO,
      {
        ...PORCARO,
        born: { ...(PORCARO.born as Body), date: '1955' },
      },
    );
    expect(marked(result).sort()).toEqual([
      'born_year year:1954 dashed · removed',
      'born_year year:1955 dashed · added',
    ]);
  });

  it('draws a target found nowhere hollow', () => {
    const result = overlay(fixtureGraph(), 'artist', 'artist:toto', TOTO, {
      ...TOTO,
      basedInPlaceId: 'atlantis',
    });
    expect(marked(result)).toContain('based_in place:atlantis hollow · added');
  });

  it('turns an event’s guess solid when the draft stores it, and drops it for none', () => {
    const graph = fixtureGraph();
    const event = EVENTS[0] as unknown as Body;
    const stored = overlay(graph, 'globe_event', 'event:evt-live-aid', event, {
      ...event,
      artistIds: ['toto'],
    });
    expect(marked(stored)).toEqual(['about artist:toto solid · restyled']);
    const edge = stored.groups
      .flatMap((g) => g.edges)
      .find((e) => e.other === 'artist:toto')!.edge;
    expect(stored.was.get(edge)).toBe('dotted');
    expect(edge.via.map((via) => via.path)).toEqual(['artistIds[]']);

    // `[]`: about no one — the guess goes.
    const none = overlay(graph, 'globe_event', 'event:evt-live-aid', event, {
      ...event,
      artistIds: [],
    });
    expect(marked(none)).toEqual(['about artist:toto dotted · removed']);
  });

  it('reads a song’s draft, its year and its genres', () => {
    const song = SONGS[1] as unknown as Body;
    const result = overlay(fixtureGraph(), 'song', 'song:rosanna', song, {
      ...song,
      year: 1983,
      genreTags: ['pop', 'rock'],
    });
    expect(marked(result).sort()).toEqual([
      'from_year year:1982 solid · removed',
      'from_year year:1983 solid · added',
      'in_genre genre:rock solid · added',
    ]);
  });

  it('adds the songs a progression names, from the song’s side', () => {
    const progression = PROGRESSIONS[1] as unknown as Body;
    const result = overlay(
      fixtureGraph(),
      'chord_progression',
      'progression:2',
      progression,
      { ...progression, songIds: ['africa', 'rosanna'] },
    );
    expect(marked(result)).toEqual([
      'uses_progression song:rosanna solid · added',
    ]);
  });

  it('reads a city’s scene through the genre table', () => {
    const place = PLACES[0] as unknown as Body;
    const result = overlay(
      fixtureGraph(),
      'globe_city',
      'place:los-angeles',
      place,
      {
        ...place,
        genres: ['Jazz'],
      },
    );
    expect(marked(result)).toEqual(['scene_of genre:jazz solid · added']);
  });

  it('drops an act’s song pins once the draft gives it a City', () => {
    const snapshot: GraphSnapshot = {
      places: CITIES,
      artists: [{ slug: 'hall-and-oates', name: 'Hall & Oates', group: true }],
      artistLocations: [
        { id: 'hall and oates', city: 'Philadelphia', country: 'US' },
      ],
    };
    const graph = buildGraph(snapshot);
    const act = snapshot.artists![0] as unknown as Body;
    // The pins' city, stated: the guess becomes the act's City.
    const same = overlay(graph, 'artist', 'artist:hall-and-oates', act, {
      ...act,
      basedInPlaceId: 'philadelphia',
    });
    expect(marked(same)).toEqual([
      'based_in place:philadelphia solid · restyled',
    ]);
    // Another city: the pins say nothing more.
    const other = overlay(graph, 'artist', 'artist:hall-and-oates', act, {
      ...act,
      basedInPlaceId: 'memphis',
    });
    expect(marked(other).sort()).toEqual([
      'based_in place:memphis solid · added',
      'based_in place:philadelphia dotted · removed',
    ]);
  });

  it('moves a song’s city with its studio', () => {
    const snapshot: GraphSnapshot = {
      songs: [
        {
          ...SONGS[1],
          session: { studio: 'Sunset Sound', studioId: 'sunset-sound' },
        },
      ],
      studios: [
        { slug: 'sunset-sound', name: 'Sunset Sound', placeId: 'los-angeles' },
        { slug: 'sigma-sound', name: 'Sigma Sound', placeId: 'philadelphia' },
      ],
      places: CITIES,
    };
    const graph = buildGraph(snapshot);
    const song = snapshot.songs![0] as unknown as Body;
    const result = overlay(graph, 'song', 'song:rosanna', song, {
      ...song,
      session: { studio: 'Sigma Sound', studioId: 'sigma-sound' },
    });
    expect(marked(result).sort()).toEqual([
      'recorded_at studio:sigma-sound solid · added',
      'recorded_at studio:sunset-sound solid · removed',
      'recorded_in place:los-angeles solid · removed',
      'recorded_in place:philadelphia solid · added',
    ]);
  });

  it('only changes who states a connection another item states too', () => {
    // Rock, stated by Toto's genreIds and by a (made-up) event field.
    const graph = assembleGraph(
      [],
      [
        ...edgesForArtist(ARTISTS[0]),
        {
          from: 'artist:toto',
          kind: 'in_genre',
          to: 'genre:rock',
          via: { item: 'event:evt-live-aid', path: 'genre[]' },
        },
      ],
    );
    const result = overlay(graph, 'artist', 'artist:toto', TOTO, {
      ...TOTO,
      genreIds: ['made-up'],
    });
    const rock = result.groups
      .flatMap((g) => g.edges)
      .find((e) => e.other === 'genre:rock')!;
    expect(result.marks.get(rock.edge)).toBeUndefined();
    expect(rock.edge.via).toEqual([
      { item: 'event:evt-live-aid', path: 'genre[]' },
    ]);
  });

  it('says nothing for a kind the graph does not derive', () => {
    expect(
      draftEdgesOf({
        graph: fixtureGraph(),
        kind: 'activity_flow',
        node: 'artist:toto',
        slug: 'toto',
        base: {},
        draft: {},
      }),
    ).toBeNull();
  });

  it('keeps the graph’s own edge objects where nothing changes', () => {
    const graph = fixtureGraph();
    const result = overlay(graph, 'artist', 'artist:toto', TOTO, {
      ...TOTO,
      bio: 'Session players.',
    });
    const others = new Set<GraphEdge>(graph.adjacency.get('artist:toto'));
    const theirs = result.groups
      .flatMap((g) => g.edges)
      .filter((e) => others.has(e.edge));
    // Everything other items state is the graph's own object.
    expect(theirs.length).toBeGreaterThan(0);
  });
});
