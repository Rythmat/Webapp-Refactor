import type {
  EdgeKind,
  EntityId,
  EntityKind,
  GraphEdge,
  GraphNode,
  NodeStatus,
} from '@/content/graph/types';
import type { FacetGraph } from '../model/facets';

/**
 * A small hand-built Atlas for the query, colour-group, facet and timelapse
 * tests: a few songs, artists, places, genres and years, joined the way the
 * real graph joins them (a subgenre to its genre, a city to its region, a
 * year to its decade and era), plus an orphan and a missing node.
 */

type NodeRow = readonly [id: string, label: string, status?: NodeStatus];
type EdgeRow = readonly [from: string, kind: EdgeKind, to: string];

export function fixtureGraph(
  nodeRows: readonly NodeRow[],
  edgeRows: readonly EdgeRow[],
): FacetGraph {
  const nodes = new Map<EntityId, GraphNode>();
  for (const [id, label, status = 'published'] of nodeRows) {
    nodes.set(id as EntityId, {
      id: id as EntityId,
      kind: id.slice(0, id.indexOf(':')) as EntityKind,
      label,
      status,
      origin: status === 'code' || status === 'missing' ? 'code' : 'api',
    });
  }
  const adjacency = new Map<EntityId, GraphEdge[]>();
  const touch = (id: EntityId, edge: GraphEdge) => {
    const list = adjacency.get(id) ?? [];
    list.push(edge);
    adjacency.set(id, list);
  };
  for (const [from, kind, to] of edgeRows) {
    for (const end of [from, to]) {
      if (!nodes.has(end as EntityId)) throw new Error(`no node ${end}`);
    }
    const edge: GraphEdge = {
      from: from as EntityId,
      kind,
      to: to as EntityId,
      via: [],
    };
    touch(edge.from, edge);
    if (edge.to !== edge.from) touch(edge.to, edge);
  }
  return { nodes, adjacency };
}

export const NODES: readonly NodeRow[] = [
  ['song:africa', 'Africa'],
  ['song:rosanna', 'Rosanna'],
  ['song:so_what', 'So What'],
  ['artist:toto', 'Toto'],
  ['artist:beyonce', 'Beyoncé'],
  ['artist:miles-davis', 'Miles Davis'],
  ['artist:loner', 'The Loner'],
  ['artist:ghost', 'Ghost Writer', 'missing'],
  ['event:evt-motown-founded', 'Motown is founded'],
  ['release:toto-iv', 'Toto IV'],
  ['label:columbia', 'Columbia'],
  ['studio:sunset-sound', 'Sunset Sound', 'draft'],
  ['progression:ii-v-i', 'ii–V–I', 'code'],
  ['place:los-angeles', 'Los Angeles'],
  ['place:detroit', 'Detroit'],
  ['place:houston', 'Houston'],
  ['place:london', 'London'],
  ['place:region-north-america', 'North America', 'code'],
  ['place:region-europe', 'Europe', 'code'],
  ['genre:rock', 'Rock', 'code'],
  ['subgenre:art-rock', 'Art Rock', 'code'],
  ['genre:jazz', 'Jazz', 'code'],
  ['subgenre:modal-jazz', 'Modal Jazz', 'code'],
  ['genre:hip-hop', 'Hip Hop', 'code'],
  ['genre:soul', 'Soul', 'code'],
  ['year:1959', '1959', 'code'],
  ['year:1977', '1977', 'code'],
  ['year:1981', '1981', 'code'],
  ['year:1982', '1982', 'code'],
  ['decade:1950s', '1950s', 'code'],
  ['decade:1970s', '1970s', 'code'],
  ['decade:1980s', '1980s', 'code'],
  ['era:postwar', 'Postwar & Revolution', 'code'],
  ['era:electronic-hiphop', 'Electronic & Hip Hop', 'code'],
  ['key:c', 'C', 'code'],
  ['mode:dorian', 'Dorian', 'code'],
  ['teach_day:unit-1-day-1', 'Unit 1, day 1', 'code'],
  ['pathway:jazz-age', 'The Jazz Age', 'code'],
];

export const EDGES: readonly EdgeRow[] = [
  ['song:africa', 'performed_by', 'artist:toto'],
  ['song:africa', 'in_genre', 'subgenre:art-rock'],
  ['song:africa', 'from_year', 'year:1982'],
  ['song:africa', 'recorded_in', 'place:los-angeles'],
  ['song:africa', 'on_release', 'release:toto-iv'],
  ['song:africa', 'in_key', 'key:c'],
  ['song:africa', 'written_by', 'artist:ghost'],
  ['song:rosanna', 'performed_by', 'artist:toto'],
  ['song:rosanna', 'in_genre', 'genre:rock'],
  ['song:rosanna', 'from_year', 'year:1982'],
  ['song:so_what', 'performed_by', 'artist:miles-davis'],
  ['song:so_what', 'in_genre', 'subgenre:modal-jazz'],
  ['song:so_what', 'from_year', 'year:1959'],
  ['song:so_what', 'in_mode', 'mode:dorian'],
  ['song:so_what', 'part_of', 'pathway:jazz-age'],
  ['song:so_what', 'released_on', 'label:columbia'],
  ['subgenre:art-rock', 'in_genre', 'genre:rock'],
  ['subgenre:modal-jazz', 'in_genre', 'genre:jazz'],
  ['artist:toto', 'based_in', 'place:los-angeles'],
  ['artist:toto', 'formed_year', 'year:1977'],
  ['artist:toto', 'active_in', 'decade:1980s'],
  ['artist:beyonce', 'born_in', 'place:houston'],
  ['artist:beyonce', 'born_year', 'year:1981'],
  ['artist:beyonce', 'in_genre', 'genre:hip-hop'],
  ['artist:miles-davis', 'in_genre', 'genre:jazz'],
  ['event:evt-motown-founded', 'took_place_in', 'place:detroit'],
  ['event:evt-motown-founded', 'from_year', 'year:1959'],
  ['event:evt-motown-founded', 'in_genre', 'genre:soul'],
  ['release:toto-iv', 'performed_by', 'artist:toto'],
  ['release:toto-iv', 'from_year', 'year:1982'],
  ['studio:sunset-sound', 'based_in', 'place:los-angeles'],
  ['progression:ii-v-i', 'in_genre', 'genre:jazz'],
  ['place:los-angeles', 'located_in', 'place:region-north-america'],
  ['place:detroit', 'located_in', 'place:region-north-america'],
  ['place:houston', 'located_in', 'place:region-north-america'],
  ['place:london', 'located_in', 'place:region-europe'],
  ['place:detroit', 'scene_of', 'genre:soul'],
  ['year:1959', 'in_decade', 'decade:1950s'],
  ['year:1959', 'from_era', 'era:postwar'],
  ['year:1977', 'in_decade', 'decade:1970s'],
  ['year:1977', 'from_era', 'era:postwar'],
  ['year:1981', 'in_decade', 'decade:1980s'],
  ['year:1981', 'from_era', 'era:electronic-hiphop'],
  ['year:1982', 'in_decade', 'decade:1980s'],
  ['year:1982', 'from_era', 'era:electronic-hiphop'],
  ['teach_day:unit-1-day-1', 'uses_song', 'song:africa'],
];

/** The fixture Atlas. */
export const ATLAS: FacetGraph = fixtureGraph(NODES, EDGES);

/** The fixture's ids in a fixed drawing order. */
export const IDS: readonly string[] = NODES.map(([id]) => id);
