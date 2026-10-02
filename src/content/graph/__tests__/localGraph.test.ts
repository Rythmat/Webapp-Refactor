import { describe, expect, it } from 'vitest';
import { assembleGraph } from '../deriveGraph';
import {
  clampLocalDepth,
  LOCAL_DEPTH_MAX,
  LOCAL_DEPTH_MIN,
  localGraph,
} from '../localGraph';
import type { Edge, EntityId, GraphEdge } from '../types';

/**
 * The local graph's walk (Obsidian's local graph): how far, which way, what
 * it may pass through, and which edges count as walked. The graph is built
 * by the real `assembleGraph`, so ids are folded and edges merged exactly as
 * the console sees them.
 *
 *   song:africa  -performed_by->  artist:toto  <-performed_by-  song:rosanna
 *   song:africa  -written_by->    artist:david-paich -member_of-> artist:toto
 *   song:africa  -recorded_at->   studio:sunset-sound -based_in-> place:los-angeles
 *   event:evt-toto-iv -about-> song:africa          (incoming to africa)
 *   song:africa  -samples-> song:africa             (a self-loop)
 *   artist:toto  -signed_to-> label:columbia        (a guess)
 *   artist:a -member_of-> artist:b -> … -> artist:g (a chain of seven)
 */

const via = { item: 'song:africa' as EntityId, path: 'test' };
const e = (
  from: EntityId,
  kind: Edge['kind'],
  to: EntityId,
  extra: Partial<Edge> = {},
): Edge => ({ from, kind, to, via, ...extra });

const CHAIN = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map(
  (s) => `artist:${s}` as EntityId,
);

const graph = assembleGraph(
  [],
  [
    e('song:africa', 'performed_by', 'artist:toto'),
    e('song:rosanna', 'performed_by', 'artist:toto'),
    e('song:africa', 'written_by', 'artist:david-paich'),
    e('artist:david-paich', 'member_of', 'artist:toto'),
    e('song:africa', 'recorded_at', 'studio:sunset-sound'),
    e('studio:sunset-sound', 'based_in', 'place:los-angeles'),
    e('event:evt-toto-iv', 'about', 'song:africa'),
    e('song:africa', 'samples', 'song:africa'),
    e('artist:toto', 'signed_to', 'label:columbia', { inferred: true }),
    // The song's own globe event folds onto the song.
    e('event:song-africa', 'influenced', 'event:evt-later'),
    ...CHAIN.slice(1).map((to, i) => e(CHAIN[i], 'member_of', to)),
  ],
);

const depths = (walk: { depthOf: ReadonlyMap<EntityId, number> }) =>
  Object.fromEntries(walk.depthOf);

const line = (edge: GraphEdge) => `${edge.from} -${edge.kind}-> ${edge.to}`;

describe('localGraph', () => {
  it('walks one step both ways by default', () => {
    const walk = localGraph(graph, 'artist:toto');
    expect(walk.focus).toBe('artist:toto');
    expect(walk.depth).toBe(1);
    expect(depths(walk)).toEqual({
      'artist:toto': 0,
      'song:africa': 1,
      'song:rosanna': 1,
      'artist:david-paich': 1,
      'label:columbia': 1,
    });
    // The focus comes first, then the nodes in the order they were reached.
    expect([...walk.depthOf.keys()][0]).toBe('artist:toto');
  });

  it('counts each step out to the depth asked for, 1 to 5', () => {
    for (let depth = 1; depth <= 5; depth++) {
      const walk = localGraph(graph, 'artist:a', { depth });
      expect(walk.depthOf.size).toBe(depth + 1);
      expect(walk.depthOf.get(CHAIN[depth])).toBe(depth);
      expect(walk.depthOf.has(CHAIN[depth + 1])).toBe(false);
      expect(walk.traversed).toHaveLength(depth);
    }
  });

  it('clamps the depth to 1–5, and reads garbage as 1', () => {
    expect(localGraph(graph, 'artist:a', { depth: 9 }).depth).toBe(5);
    expect(localGraph(graph, 'artist:a', { depth: 9 }).depthOf.size).toBe(6);
    expect(localGraph(graph, 'artist:a', { depth: 0 }).depth).toBe(1);
    expect(localGraph(graph, 'artist:a', { depth: -3 }).depth).toBe(1);
    expect(localGraph(graph, 'artist:a', { depth: Number.NaN }).depth).toBe(1);
    expect(localGraph(graph, 'artist:a', { depth: 2.9 }).depth).toBe(2);
    expect(clampLocalDepth('3')).toBe(3);
    expect(clampLocalDepth(undefined)).toBe(LOCAL_DEPTH_MIN);
    expect(clampLocalDepth(Infinity)).toBe(LOCAL_DEPTH_MAX);
    expect(clampLocalDepth('two')).toBe(LOCAL_DEPTH_MIN);
    expect([LOCAL_DEPTH_MIN, LOCAL_DEPTH_MAX]).toEqual([1, 5]);
  });

  it('follows edges forward only when incoming links are off', () => {
    const walk = localGraph(graph, 'song:africa', {
      depth: 2,
      incoming: false,
    });
    expect(depths(walk)).toEqual({
      'song:africa': 0,
      'artist:toto': 1,
      'artist:david-paich': 1,
      'studio:sunset-sound': 1,
      'event:evt-later': 1,
      'place:los-angeles': 2,
      'label:columbia': 2,
    });
    // Rosanna points at Toto, and the event points at Africa: both incoming.
    expect(walk.depthOf.has('song:rosanna')).toBe(false);
    expect(walk.depthOf.has('event:evt-toto-iv')).toBe(false);
  });

  it('follows edges backward only when outgoing links are off', () => {
    const walk = localGraph(graph, 'artist:toto', {
      depth: 2,
      outgoing: false,
    });
    expect(depths(walk)).toEqual({
      'artist:toto': 0,
      'song:africa': 1,
      'song:rosanna': 1,
      'artist:david-paich': 1,
      'event:evt-toto-iv': 2,
    });
    // Toto's own guess points out, at the label.
    expect(walk.depthOf.has('label:columbia')).toBe(false);
    // A middle link is walked backward at the second step too.
    expect(
      localGraph(graph, 'artist:d', { depth: 3, outgoing: false }).depthOf,
    ).toEqual(
      new Map([
        ['artist:d', 0],
        ['artist:c', 1],
        ['artist:b', 2],
        ['artist:a', 3],
      ]),
    );
  });

  it('reaches nothing when both directions are off', () => {
    const walk = localGraph(graph, 'artist:toto', {
      incoming: false,
      outgoing: false,
    });
    expect(depths(walk)).toEqual({ 'artist:toto': 0 });
    expect(walk.traversed).toEqual([]);
  });

  it('walks only onward: links between nodes at one distance are neighbour links', () => {
    const walk = localGraph(graph, 'artist:toto');
    const walked = walk.traversed.map(line).sort();
    expect(walked).toEqual(
      [
        'song:africa -performed_by-> artist:toto',
        'song:rosanna -performed_by-> artist:toto',
        'artist:david-paich -member_of-> artist:toto',
        'artist:toto -signed_to-> label:columbia',
      ].sort(),
    );
    // Africa and David Paich are both one step out: their link is not walked.
    expect(walked).not.toContain(
      'song:africa -written_by-> artist:david-paich',
    );
    // Each edge once.
    expect(new Set(walk.traversed).size).toBe(walk.traversed.length);
  });

  it('keeps every edge into a newly reached node, from any node a step closer', () => {
    // From Africa, Los Angeles is two steps out, through the studio, and
    // Rosanna is two steps out, through Toto.
    const walk = localGraph(graph, 'song:africa', { depth: 2 });
    const walked = walk.traversed.map(line);
    expect(walked).toContain(
      'studio:sunset-sound -based_in-> place:los-angeles',
    );
    expect(walked).toContain('song:rosanna -performed_by-> artist:toto');
    // Paich → Toto joins two nodes one step out: a neighbour link.
    expect(walked).not.toContain('artist:david-paich -member_of-> artist:toto');
    expect(walk.depthOf.get('song:rosanna')).toBe(2);
  });

  it('never walks a self-loop', () => {
    const walk = localGraph(graph, 'song:africa', { depth: 5 });
    expect(walk.traversed.some((edge) => edge.from === edge.to)).toBe(false);
  });

  it('goes only through nodes and edges the filters allow', () => {
    const noStudios = localGraph(graph, 'song:africa', {
      depth: 2,
      nodeOk: (node) => node.kind !== 'studio',
    });
    expect(noStudios.depthOf.has('studio:sunset-sound')).toBe(false);
    expect(noStudios.depthOf.has('place:los-angeles')).toBe(false);

    const noGuesses = localGraph(graph, 'artist:toto', {
      edgeOk: (edge) => !edge.inferred,
    });
    expect(noGuesses.depthOf.has('label:columbia')).toBe(false);
    expect(noGuesses.traversed.some((edge) => edge.inferred)).toBe(false);
  });

  it('keeps the focus even when the filters would hide it', () => {
    const walk = localGraph(graph, 'artist:toto', {
      nodeOk: (node) => node.kind !== 'artist',
    });
    expect(walk.depthOf.get('artist:toto')).toBe(0);
    expect(walk.depthOf.has('song:africa')).toBe(true);
    expect(walk.depthOf.has('artist:david-paich')).toBe(false);
  });

  it('asks the filters once per node and edge', () => {
    let nodeAsks = 0;
    let edgeAsks = 0;
    localGraph(graph, 'artist:toto', {
      depth: 5,
      nodeOk: () => (nodeAsks++, true),
      edgeOk: () => (edgeAsks++, true),
    });
    expect(nodeAsks).toBeLessThanOrEqual(graph.nodes.size);
    expect(edgeAsks).toBeLessThanOrEqual(graph.edges.length);
  });

  it('returns an empty walk for a focus the graph does not have', () => {
    const walk = localGraph(graph, 'song:nowhere_man', { depth: 3 });
    expect(walk.focus).toBe('song:nowhere_man');
    expect(walk.depthOf.size).toBe(0);
    expect(walk.traversed).toEqual([]);
  });

  it("folds a song's globe event onto the song", () => {
    const walk = localGraph(graph, 'event:song-africa');
    expect(walk.focus).toBe('song:africa');
    expect(walk.depthOf.get('song:africa')).toBe(0);
    // The event's influence arc meets the song's credits on one node.
    expect(walk.depthOf.get('event:evt-later')).toBe(1);
    expect(walk.depthOf.get('artist:toto')).toBe(1);
    expect(graph.nodes.has('event:song-africa')).toBe(false);
  });
});

describe('localGraph: dead ends', () => {
  /*
   * Three songs share a genre, and Africa's band has a second song. Obsidian
   * never walks on through a tag, so from Africa the genre is reached but
   * the other rock songs are not, unless Toto leads to them.
   */
  const rock = assembleGraph(
    [],
    [
      e('song:africa', 'in_genre', 'genre:rock'),
      e('song:rosanna', 'in_genre', 'genre:rock'),
      e('song:hold_the_line', 'in_genre', 'genre:rock'),
      e('song:africa', 'performed_by', 'artist:toto'),
      e('song:rosanna', 'performed_by', 'artist:toto'),
    ],
  );
  const notGenre = (node: { kind: string }) => node.kind !== 'genre';

  it('walks on through every node when nothing is a dead end', () => {
    const walk = localGraph(rock, 'song:africa', { depth: 2 });
    expect(walk.depthOf.get('genre:rock')).toBe(1);
    expect(walk.depthOf.get('song:hold_the_line')).toBe(2);
  });

  it('reaches a dead end but goes no further through it', () => {
    const walk = localGraph(rock, 'song:africa', {
      depth: 2,
      expand: notGenre,
    });
    expect(depths(walk)).toEqual({
      'song:africa': 0,
      'genre:rock': 1,
      'artist:toto': 1,
      // Through Toto, not through the genre.
      'song:rosanna': 2,
    });
    expect(walk.depthOf.has('song:hold_the_line')).toBe(false);
    // The edge into the genre is walked; none out of it.
    expect(
      walk.traversed.filter((edge) => edge.to === 'genre:rock').map(line),
    ).toEqual(['song:africa -in_genre-> genre:rock']);
  });

  it('always walks out from the focus, even a dead end', () => {
    const walk = localGraph(rock, 'genre:rock', {
      depth: 2,
      expand: notGenre,
    });
    expect(walk.depthOf.get('song:africa')).toBe(1);
    expect(walk.depthOf.get('song:hold_the_line')).toBe(1);
    // And on from the songs it reached, which are not dead ends.
    expect(walk.depthOf.get('artist:toto')).toBe(2);
  });
});
