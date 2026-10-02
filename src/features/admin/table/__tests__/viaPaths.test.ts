import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  buildGraph,
  type Graph,
  type GraphSnapshot,
  matchSnapshotEvents,
} from '@/content/graph/deriveGraph';
import type { EdgeVia, EntityKind, GraphEdge } from '@/content/graph/types';
import type { Song } from '@/curriculum/types/songLibrary';
import { loadRepoSnapshot } from '@/features/admin/content/graph/repoSnapshot';
import { WORKING_KINDS } from '@/features/admin/content/graph/workingSnapshot';
import { REF_PATHS, type RefPath } from '@/scripts/apiContract/refPaths';
import { TABLES } from '../model/categories';
import type { ColumnDef, ConnectionPart, Hop, PartRole } from '../model/types';

/**
 * The registry against the edges the graph really draws (Table T0 note 1).
 *
 * Where one edge kind has a stated source and a guessed one — an artist's
 * City (`basedInPlaceId`) and their song pins (`city`), an event's stored
 * artists (`artistIds[]`) and the ones matched from its title and tags — the
 * registry tells them apart by the field that states each edge (`Hop.via`).
 * A path the derivers never write would count nothing, silently: a stated
 * column empty on every row, or guesses counted as stated. So every such
 * path is held to the graph and to the contract:
 *
 *  - some edge the step can take is stated by it, in the repo's own graph or
 *    in a fixture that stores what the repo does not have yet (an event's
 *    `artistIds`, a group's members' instruments);
 *  - REF_PATHS lists it for the content kind whose item states those edges
 *    (a song pin's `city` is the `artist_location` item's, filed under the
 *    artist it pins);
 *  - a stated part's paths are stored ids, and draw solid edges; a path the
 *    contract calls legacy text draws only guesses.
 */

// `eventConnections.ts` reads the content store for its arc drawing; the arcs
// themselves are a plain list (as in deriveGraph.test.ts).
vi.mock('@/content/contentStore', () => ({
  contentGeneration: 0,
  MUSIC_HISTORY: [],
}));

/** What the repo does not store yet, stated once so every path draws. */
const FIXTURE: GraphSnapshot = {
  artists: [
    {
      slug: 'the-fixtures',
      name: 'The Fixtures',
      basedInPlaceId: 'detroit',
      instrumentIds: ['piano'],
      members: [{ artistId: 'fay-fixture', instrumentIds: ['electric-bass'] }],
    },
    { slug: 'fay-fixture', name: 'Fay Fixture' },
  ],
  songs: [
    {
      id: 'fixture_song',
      title: 'Fixture Song',
      artist: 'The Fixtures',
      year: 1970,
      key: 'C',
      mode: 'major',
      credits: [
        {
          name: 'Fay Fixture',
          artistGlobeId: 'fay-fixture',
          role: 'performer',
          instrument: 'electric-bass',
        },
      ],
    } as unknown as Song,
  ],
  places: [
    { id: 'detroit', name: 'Detroit', country: 'US' },
  ] as unknown as GraphSnapshot['places'],
  events: [
    {
      id: 'evt-fixture-night',
      title: 'Fixture night',
      year: 1970,
      artistIds: ['fay-fixture'],
      songIds: ['fixture_song'],
      placeId: 'detroit',
    },
    // And one that stores nothing, as every event did until the bulk import
    // of 30 September 2026 stored their artists, songs and places: who and
    // what it is about, and where, are guessed from its title, tags and city.
    {
      id: 'evt-fixture-matinee',
      title: 'The Fixtures play "Fixture Song"',
      year: 1971,
      genre: [],
      tags: ['the fixtures', 'fixture song'],
      location: { city: 'Detroit', country: 'US', lat: 42.33, lng: -83.05 },
    },
  ],
};

/** The content kind whose items define each node kind (the merge's own table). */
const CONTENT_KIND_OF = new Map<string, RefPath['kind']>(
  Object.entries(WORKING_KINDS).flatMap(([kind, spec]) =>
    spec.node ? [[spec.node, kind as RefPath['kind']]] : [],
  ),
);

const kindOf = (id: string) => id.slice(0, id.indexOf(':')) as EntityKind;

/** The content kind whose item states a source: a pin's, else its node's. */
const statingKind = (via: EdgeVia): string =>
  via.statedBy?.kind ?? CONTENT_KIND_OF.get(kindOf(via.item)) ?? 'code';

/** One step that picks its edges by the field stating them. */
interface ViaStep {
  where: string;
  role: PartRole;
  hop: Hop & { via: readonly string[] };
  /** The node kinds the step stands on. */
  from: readonly EntityKind[];
}

/** Every part a column walks, its hint's included. */
function partsOf(column: ColumnDef): readonly ConnectionPart[] {
  const { source } = column;
  if (source.type === 'connections' || source.type === 'years') {
    return source.parts;
  }
  if (source.type === 'field') return source.hint?.parts ?? [];
  return [];
}

function viaSteps(): ViaStep[] {
  const steps: ViaStep[] = [];
  for (const def of Object.values(TABLES)) {
    const start: EntityKind[] = [def.rows.kind];
    if (def.rows.more) start.push(def.rows.more.kind);
    for (const column of def.columns) {
      for (const part of partsOf(column)) {
        let from: readonly EntityKind[] = start;
        part.hops.forEach((hop, i) => {
          if (hop.via) {
            steps.push({
              where: `${def.id}.${column.id}.${part.id} step ${i + 1}`,
              role: part.role,
              hop: { ...hop, via: hop.via },
              from,
            });
          }
          from = hop.to;
        });
      }
    }
    if (def.narrow?.hop.via) {
      const hop = def.narrow.hop;
      steps.push({
        where: `${def.id} narrow`,
        role: 'fact',
        hop: { ...hop, via: hop.via! },
        from: start,
      });
    }
  }
  return steps;
}

/** The edges a step can take (ignoring `via`), with the source it names. */
function picked(
  graph: Graph,
  step: ViaStep,
  path: string,
): { edge: GraphEdge; via: EdgeVia }[] {
  const out: { edge: GraphEdge; via: EdgeVia }[] = [];
  for (const edge of graph.edges) {
    if (!step.hop.edges.includes(edge.kind)) continue;
    const near = step.hop.dir === 'out' ? edge.from : edge.to;
    const far = step.hop.dir === 'out' ? edge.to : edge.from;
    if (!step.from.includes(kindOf(near))) continue;
    if (!step.hop.to.includes(kindOf(far))) continue;
    for (const via of edge.via) if (via.path === path) out.push({ edge, via });
  }
  return out;
}

const refPath = (kind: string, path: string) =>
  REF_PATHS.find((r) => r.kind === kind && r.path === path);

let graphs: readonly Graph[];
const STEPS = viaSteps();

beforeAll(async () => {
  graphs = [
    buildGraph(await loadRepoSnapshot()),
    buildGraph({ ...FIXTURE, eventMatches: matchSnapshotEvents(FIXTURE) }),
  ];
}, 30_000);

describe('the fields the registry tells sources apart by', () => {
  it('are used where one edge kind has sources to tell apart', () => {
    // The walks the registry names today; a new one joins this test.
    expect(STEPS.length).toBeGreaterThanOrEqual(10);
    for (const step of STEPS) {
      expect(step.hop.via.length, step.where).toBeGreaterThan(0);
      expect(step.hop.dir, step.where).not.toBe('both');
      expect(step.hop.through, step.where).toBeUndefined();
    }
  });

  it('each state an edge the step can take', () => {
    const unused: string[] = [];
    for (const step of STEPS) {
      for (const path of step.hop.via) {
        if (!graphs.some((g) => picked(g, step, path).length > 0)) {
          unused.push(`${step.where}: ${path}`);
        }
      }
    }
    expect(unused).toEqual([]);
  });

  it('are REF_PATHS paths of the kind whose item states the edge', () => {
    const wrong: string[] = [];
    for (const step of STEPS) {
      for (const path of step.hop.via) {
        const kinds = new Set(
          graphs
            .flatMap((g) => picked(g, step, path))
            .map((p) => statingKind(p.via)),
        );
        for (const kind of kinds) {
          if (!refPath(kind, path)) {
            wrong.push(`${step.where}: ${kind} ${path}`);
          }
        }
      }
    }
    expect(wrong).toEqual([]);
  });

  it('are stored ids drawn solid for what a row states, and legacy text only for guesses', () => {
    for (const step of STEPS) {
      for (const path of step.hop.via) {
        const found = graphs.flatMap((g) => picked(g, step, path));
        for (const { edge, via } of found) {
          const ref = refPath(statingKind(via), path);
          const at = `${step.where}: ${edge.from} ${edge.kind} ${edge.to} by ${path}`;
          if (step.role === 'stated') {
            expect(ref?.legacy, at).toBeUndefined();
            expect(edge.inferred, at).toBeUndefined();
          }
          if (ref?.legacy) expect(edge.inferred, at).toBe(true);
        }
      }
    }
  });

  it('keep the stated City apart from the song pins, and stored event links from matches', () => {
    const paths = (where: string) =>
      STEPS.filter((s) => s.where.startsWith(where)).flatMap((s) => s.hop.via);
    expect(paths('artists.city.stated')).toEqual(['basedInPlaceId']);
    expect(paths('artists.city.pins')).toEqual(['city']);
    expect(paths('events.artists.stated')).toEqual(['artistIds[]']);
    expect(paths('events.artists.matched')).toEqual(['title', 'tags[]']);
    expect(paths('events.place.stated')).toEqual(['placeId']);
    expect(paths('events.place.matched')).toEqual(['location.city']);
  });
});
