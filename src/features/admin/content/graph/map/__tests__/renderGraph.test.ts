import { describe, expect, it } from 'vitest';
import { localGraph } from '@/content/graph/localGraph';
import {
  ENTITY_KINDS,
  type EdgeKind,
  type EntityId,
  type EntityKind,
  type GraphEdge,
  type GraphNode,
  type NodeStatus,
} from '@/content/graph/types';
import {
  buildRenderGraph,
  DEFAULT_RENDER_FILTERS,
  edgeFilter,
  LINE_BACKWARD,
  LINE_FORWARD,
  LINE_GUESSED,
  LINE_UNCONFIRMED,
  type LocalScope,
  neighboursOf,
  NODE_CURRICULUM,
  NODE_FOCUS,
  NODE_MISSING,
  NODE_ORPHAN,
  NODE_TAG,
  nodeFilter,
  type RenderFilters,
  type RenderGraph,
  structuralFingerprint,
  walkExpands,
  walkFilters,
} from '../model/renderGraph';
import {
  LINK_FLAG_BACKWARD,
  LINK_FLAG_FORWARD,
  LINK_FLAG_GUESSED,
  LINK_FLAG_UNCONFIRMED,
  NODE_FLAG_RING,
} from '../render/GraphRenderer';

/**
 * The Atlas graph → the drawn graph: what each filter shows, one line per
 * pair with its flags merged, weights, orphans, local scopes and the
 * fingerprint. The fixture is built by hand, so every node and edge is
 * exactly what the test says.
 */

type FixtureGraph = {
  nodes: Map<EntityId, GraphNode>;
  edges: GraphEdge[];
  adjacency: Map<EntityId, GraphEdge[]>;
};

const kindOf = (id: EntityId) => id.slice(0, id.indexOf(':')) as EntityKind;

const node = (id: EntityId, status: NodeStatus = 'published'): GraphNode => ({
  id,
  kind: kindOf(id),
  label: id.slice(id.indexOf(':') + 1),
  status,
  origin: 'api',
});

const edge = (
  from: EntityId,
  kind: EdgeKind,
  to: EntityId,
  extra: Partial<GraphEdge> = {},
): GraphEdge => ({
  from,
  kind,
  to,
  via: [{ item: from, path: 'test' }],
  ...extra,
});

function graphOf(nodes: GraphNode[], edges: GraphEdge[]): FixtureGraph {
  const adjacency = new Map<EntityId, GraphEdge[]>();
  const touch = (id: EntityId, e: GraphEdge) =>
    adjacency.set(id, [...(adjacency.get(id) ?? []), e]);
  for (const e of edges) {
    touch(e.from, e);
    if (e.to !== e.from) touch(e.to, e);
  }
  return { nodes: new Map(nodes.map((n) => [n.id, n])), edges, adjacency };
}

const NODES: GraphNode[] = [
  node('song:africa'),
  node('song:rosanna'),
  node('song:lonely'),
  node('artist:toto'),
  node('artist:david-paich'),
  node('artist:ghost', 'missing'),
  node('release:toto-iv'),
  node('label:columbia'),
  node('studio:sunset-sound'),
  node('event:evt-grammys'),
  node('progression:12', 'code'),
  node('place:los-angeles'),
  node('place:region-north-america', 'code'),
  node('genre:rock', 'code'),
  node('year:1982', 'code'),
  node('decade:1980s', 'code'),
  node('key:a', 'code'),
  node('instrument:piano', 'code'),
  node('teach_day:aug-day-1', 'code'),
  node('pathway:blues-to-rock', 'code'),
];

const EDGES: GraphEdge[] = [
  edge('song:africa', 'performed_by', 'artist:toto'),
  edge('song:africa', 'written_by', 'artist:david-paich'),
  edge('artist:david-paich', 'member_of', 'artist:toto'),
  edge('song:rosanna', 'performed_by', 'artist:toto'),
  edge('song:rosanna', 'written_by', 'artist:ghost'),
  edge('song:rosanna', 'uses_progression', 'progression:12'),
  edge('song:africa', 'in_genre', 'genre:rock'),
  edge('song:africa', 'from_year', 'year:1982'),
  edge('year:1982', 'in_decade', 'decade:1980s'),
  edge('song:africa', 'in_key', 'key:a'),
  // `on` is context: it never makes a line to the song.
  edge('artist:david-paich', 'plays_instrument', 'instrument:piano', {
    on: 'song:africa',
  }),
  edge('place:los-angeles', 'located_in', 'place:region-north-america'),
  edge('teach_day:aug-day-1', 'uses_song', 'song:africa'),
  edge('song:africa', 'part_of', 'pathway:blues-to-rock'),
  // A self-loop is never drawn.
  edge('song:africa', 'samples', 'song:africa'),
  // Two ways round one pair, one guessed and one solid: one solid line.
  edge('event:evt-grammys', 'about', 'song:africa', { inferred: true }),
  edge('song:africa', 'influenced', 'event:evt-grammys'),
  edge('artist:toto', 'signed_to', 'label:columbia', { unverified: true }),
  edge('release:toto-iv', 'released_on', 'label:columbia', {
    inferred: true,
    unverified: true,
  }),
  // Two edges of one kind (different `on`): one a guess, one unconfirmed.
  edge('release:toto-iv', 'performed_by', 'artist:toto', { inferred: true }),
  edge('release:toto-iv', 'performed_by', 'artist:toto', {
    on: 'song:africa',
    unverified: true,
  }),
  edge('song:africa', 'recorded_at', 'studio:sunset-sound'),
  edge('studio:sunset-sound', 'based_in', 'place:los-angeles'),
];

const GRAPH = graphOf(NODES, EDGES);

const ALL_ON: RenderFilters = {
  tags: true,
  curriculum: true,
  existingOnly: false,
  guessed: true,
  unconfirmed: true,
  orphans: true,
};

const build = (
  filters: Partial<RenderFilters> = {},
  local: LocalScope | null = null,
  graph: Pick<FixtureGraph, 'nodes' | 'edges'> = GRAPH,
) => buildRenderGraph(graph, { ...DEFAULT_RENDER_FILTERS, ...filters }, local);

/** The line between two ids, with its directions read from `a` to `b`. */
function lineOf(rg: RenderGraph, a: EntityId, b: EntityId) {
  const i = rg.indexOf.get(a);
  const j = rg.indexOf.get(b);
  if (i === undefined || j === undefined) return null;
  const lo = Math.min(i, j);
  const hi = Math.max(i, j);
  for (let k = 0; k < rg.linkCount; k++) {
    if (rg.links[2 * k] !== lo || rg.links[2 * k + 1] !== hi) continue;
    const f = rg.linkFlags[k];
    const forward = (f & LINE_FORWARD) !== 0;
    const backward = (f & LINE_BACKWARD) !== 0;
    return {
      aToB: i === lo ? forward : backward,
      bToA: i === lo ? backward : forward,
      guessed: (f & LINE_GUESSED) !== 0,
      unconfirmed: (f & LINE_UNCONFIRMED) !== 0,
    };
  }
  return null;
}

const weightOf = (rg: RenderGraph, id: EntityId) =>
  rg.weights[rg.indexOf.get(id) as number];

const flagsOf = (rg: RenderGraph, id: EntityId) =>
  rg.flags[rg.indexOf.get(id) as number];

const NOTES = [
  'artist:david-paich',
  'artist:ghost',
  'artist:toto',
  'event:evt-grammys',
  'label:columbia',
  'place:los-angeles',
  'progression:12',
  'release:toto-iv',
  'song:africa',
  'song:lonely',
  'song:rosanna',
  'studio:sunset-sound',
];

describe('buildRenderGraph: what is shown', () => {
  it('shows only notes by default, numbered in id order', () => {
    const rg = build();
    expect(rg.ids).toEqual(NOTES);
    expect(rg.count).toBe(NOTES.length);
    expect(rg.nodes.map((n) => n.id)).toEqual(NOTES);
    rg.ids.forEach((id, i) => expect(rg.indexOf.get(id)).toBe(i));
    rg.nodes.forEach((n, i) => expect(ENTITY_KINDS[rg.kinds[i]]).toBe(n.kind));
    expect(rg.focus).toBe(-1);
    expect(rg.depths).toBeNull();
  });

  it('shows tags when Tags is on, flagged as tags', () => {
    const rg = build({ tags: true });
    for (const id of [
      'genre:rock',
      'year:1982',
      'decade:1980s',
      'key:a',
      'instrument:piano',
      'place:region-north-america',
    ] as EntityId[]) {
      expect(rg.indexOf.has(id), id).toBe(true);
      expect(flagsOf(rg, id) & NODE_TAG, id).toBe(NODE_TAG);
    }
    expect(flagsOf(rg, 'place:los-angeles') & NODE_TAG).toBe(0);
    expect(rg.indexOf.has('teach_day:aug-day-1')).toBe(false);
  });

  it('hides a tag family switched off, keeping the others', () => {
    const rg = build({
      tags: true,
      tagFamilies: { time: false, regions: false },
    });
    expect(rg.indexOf.has('year:1982')).toBe(false);
    expect(rg.indexOf.has('decade:1980s')).toBe(false);
    expect(rg.indexOf.has('place:region-north-america')).toBe(false);
    expect(rg.indexOf.has('place:los-angeles')).toBe(true);
    expect(rg.indexOf.has('genre:rock')).toBe(true);
    expect(rg.indexOf.has('key:a')).toBe(true);
    // Families do nothing while Tags itself is off.
    expect(
      build({ tagFamilies: { genres: true } }).indexOf.has('genre:rock'),
    ).toBe(false);
  });

  it('shows curriculum only when its switch is on, flagged', () => {
    expect(build().indexOf.has('teach_day:aug-day-1')).toBe(false);
    const rg = build({ curriculum: true });
    expect(flagsOf(rg, 'teach_day:aug-day-1')).toBe(NODE_CURRICULUM);
    expect(flagsOf(rg, 'pathway:blues-to-rock')).toBe(NODE_CURRICULUM);
    expect(lineOf(rg, 'teach_day:aug-day-1', 'song:africa')?.aToB).toBe(true);
  });

  it('flags missing items, and hides them with Existing items only', () => {
    const rg = build();
    expect(flagsOf(rg, 'artist:ghost') & NODE_MISSING).toBe(NODE_MISSING);
    expect(flagsOf(rg, 'artist:toto') & NODE_MISSING).toBe(0);
    const existing = build({ existingOnly: true });
    expect(existing.indexOf.has('artist:ghost')).toBe(false);
    expect(weightOf(existing, 'song:rosanna')).toBe(
      weightOf(rg, 'song:rosanna') - 1,
    );
  });

  it('hides whatever the search says no to', () => {
    const rg = build({ match: (n) => n.kind === 'song' });
    expect(rg.ids).toEqual(['song:africa', 'song:lonely', 'song:rosanna']);
    expect(rg.linkCount).toBe(0);
    // A null search is no search.
    expect(build({ match: null }).ids).toEqual(NOTES);
  });

  it('skips an edge to a node the graph does not have', () => {
    const graph = graphOf(NODES, [
      ...EDGES,
      edge('song:lonely', 'performed_by', 'artist:not-in-nodes'),
    ]);
    const rg = build({}, null, graph);
    expect(rg.indexOf.has('artist:not-in-nodes')).toBe(false);
    expect(weightOf(rg, 'song:lonely')).toBe(0);
  });
});

describe('buildRenderGraph: lines', () => {
  it('draws one line per pair, never a self-loop, never to an `on` song', () => {
    const rg = build(ALL_ON);
    const pairs = new Set<string>();
    for (let k = 0; k < rg.linkCount; k++) {
      const a = rg.links[2 * k];
      const b = rg.links[2 * k + 1];
      expect(a).toBeLessThan(b);
      pairs.add(`${a}-${b}`);
    }
    expect(pairs.size).toBe(rg.linkCount);
    // 23 edges: one self-loop, two pairs stated twice.
    expect(rg.linkCount).toBe(EDGES.length - 1 - 2);
    expect(lineOf(rg, 'artist:david-paich', 'song:africa')).not.toBeNull();
    expect(lineOf(rg, 'instrument:piano', 'song:africa')).toBeNull();
    expect(lineOf(rg, 'instrument:piano', 'artist:david-paich')).not.toBeNull();
  });

  it('keeps the lines in pair order', () => {
    const rg = build(ALL_ON);
    for (let k = 1; k < rg.linkCount; k++) {
      const before = rg.links[2 * k - 2] * rg.count + rg.links[2 * k - 1];
      const after = rg.links[2 * k] * rg.count + rg.links[2 * k + 1];
      expect(after).toBeGreaterThan(before);
    }
  });

  it('records which ways the edges run', () => {
    const rg = build();
    expect(lineOf(rg, 'song:africa', 'artist:toto')).toEqual({
      aToB: true,
      bToA: false,
      guessed: false,
      unconfirmed: false,
    });
    const both = lineOf(rg, 'song:africa', 'event:evt-grammys');
    expect(both?.aToB).toBe(true);
    expect(both?.bToA).toBe(true);
  });

  it('is a guess only when every edge behind it is, unconfirmed likewise', () => {
    const rg = build();
    // One guessed edge and one solid one: solid.
    expect(lineOf(rg, 'event:evt-grammys', 'song:africa')?.guessed).toBe(false);
    // Only an unconfirmed edge.
    expect(lineOf(rg, 'artist:toto', 'label:columbia')).toMatchObject({
      guessed: false,
      unconfirmed: true,
    });
    // One edge that is both.
    expect(lineOf(rg, 'release:toto-iv', 'label:columbia')).toMatchObject({
      guessed: true,
      unconfirmed: true,
    });
    // A guess and an unconfirmed edge: neither flag holds for every edge.
    expect(lineOf(rg, 'release:toto-iv', 'artist:toto')).toEqual({
      aToB: true,
      bToA: false,
      guessed: false,
      unconfirmed: false,
    });
  });

  it('drops guessed edges before merging when Guessed links is off', () => {
    const rg = build({ guessed: false });
    expect(lineOf(rg, 'release:toto-iv', 'label:columbia')).toBeNull();
    // Only the unconfirmed edge is left between the record and Toto.
    expect(lineOf(rg, 'release:toto-iv', 'artist:toto')).toMatchObject({
      guessed: false,
      unconfirmed: true,
    });
    // The solid influence arc keeps the event's line, one way now.
    expect(lineOf(rg, 'song:africa', 'event:evt-grammys')).toMatchObject({
      aToB: true,
      bToA: false,
    });
    expect(rg.linkFlags.every((f) => (f & LINE_GUESSED) === 0)).toBe(true);
  });

  it('drops unconfirmed edges when Unconfirmed links is off', () => {
    const rg = build({ unconfirmed: false });
    expect(lineOf(rg, 'artist:toto', 'label:columbia')).toBeNull();
    expect(lineOf(rg, 'release:toto-iv', 'label:columbia')).toBeNull();
    expect(lineOf(rg, 'release:toto-iv', 'artist:toto')).toMatchObject({
      guessed: true,
      unconfirmed: false,
    });
  });

  it('lets an edge both guessed and unconfirmed through only with both on', () => {
    const both = edge('release:toto-iv', 'released_on', 'label:columbia', {
      inferred: true,
      unverified: true,
    });
    const filters = (guessed: boolean, unconfirmed: boolean) =>
      edgeFilter({ ...DEFAULT_RENDER_FILTERS, guessed, unconfirmed })(both);
    expect([
      filters(true, true),
      filters(false, true),
      filters(true, false),
      filters(false, false),
    ]).toEqual([true, false, false, false]);
  });
});

describe('buildRenderGraph: weights and orphans', () => {
  it('weighs a node by its distinct visible neighbours', () => {
    const rg = build();
    // Toto, Paich, the event (two edges, one neighbour) and the studio.
    expect(weightOf(rg, 'song:africa')).toBe(4);
    // Africa, Rosanna, Paich, Columbia and the record (two edges).
    expect(weightOf(rg, 'artist:toto')).toBe(5);
    const tags = build(ALL_ON);
    // Plus rock, 1982, A, the pathway and the Teach day.
    expect(weightOf(tags, 'song:africa')).toBe(9);
    for (let i = 0; i < rg.count; i++) {
      expect(neighboursOf(rg, i).length).toBe(rg.weights[i]);
    }
  });

  it('lists each node’s neighbours in node order, with their lines', () => {
    const rg = build();
    const africa = rg.indexOf.get('song:africa') as number;
    const names = [...neighboursOf(rg, africa)].map((j) => rg.ids[j]);
    expect(names).toEqual([
      'artist:david-paich',
      'artist:toto',
      'event:evt-grammys',
      'studio:sunset-sound',
    ]);
    const start = rg.neighbourOffsets[africa];
    names.forEach((_, k) => {
      const line = rg.neighbourLines[start + k];
      const ends = [rg.links[2 * line], rg.links[2 * line + 1]];
      expect(ends).toContain(africa);
      expect(ends).toContain(rg.neighbours[start + k]);
    });
  });

  it('flags orphans after filtering, and hides them when Orphans is off', () => {
    const rg = build();
    expect(flagsOf(rg, 'song:lonely') & NODE_ORPHAN).toBe(NODE_ORPHAN);
    expect(weightOf(rg, 'song:lonely')).toBe(0);
    expect(flagsOf(rg, 'song:africa') & NODE_ORPHAN).toBe(0);

    const hidden = build({ orphans: false });
    expect(hidden.indexOf.has('song:lonely')).toBe(false);
    expect(hidden.count).toBe(rg.count - 1);
    expect(hidden.linkCount).toBe(rg.linkCount);
    // The lines are renumbered past the node that went.
    expect(lineOf(hidden, 'song:africa', 'artist:toto')?.aToB).toBe(true);
    expect(weightOf(hidden, 'artist:toto')).toBe(5);

    // An orphan made by a filter: the search leaves Africa on its own.
    const alone = build({ match: (n) => n.id === 'song:africa' });
    expect(flagsOf(alone, 'song:africa') & NODE_ORPHAN).toBe(NODE_ORPHAN);
    expect(
      build({ match: (n) => n.id === 'song:africa', orphans: false }).count,
    ).toBe(0);
  });
});

describe('buildRenderGraph: local graphs', () => {
  const scope = (
    focus: EntityId,
    depth: number,
    neighborLinks = false,
    filters: RenderFilters = DEFAULT_RENDER_FILTERS,
  ): LocalScope => ({
    walk: localGraph(GRAPH, focus, {
      depth,
      nodeOk: nodeFilter(filters),
      edgeOk: edgeFilter(filters),
    }),
    neighborLinks,
  });

  it('shows only the nodes the walk reached, with their depths and the focus', () => {
    const rg = build({}, scope('artist:toto', 1));
    expect(rg.ids).toEqual([
      'artist:david-paich',
      'artist:toto',
      'label:columbia',
      'release:toto-iv',
      'song:africa',
      'song:rosanna',
    ]);
    expect(rg.ids[rg.focus]).toBe('artist:toto');
    expect(flagsOf(rg, 'artist:toto') & NODE_FOCUS).toBe(NODE_FOCUS);
    expect(flagsOf(rg, 'song:africa') & NODE_FOCUS).toBe(0);
    expect(rg.depths?.[rg.focus]).toBe(0);
    expect(rg.depths?.[rg.indexOf.get('song:africa') as number]).toBe(1);
  });

  it('draws only the walked edges unless Neighbor links is on', () => {
    const walked = build({}, scope('artist:toto', 1));
    // Africa and Paich are both one step out: a neighbour link.
    expect(lineOf(walked, 'song:africa', 'artist:david-paich')).toBeNull();
    expect(walked.linkCount).toBe(5);
    const all = build({}, scope('artist:toto', 1, true));
    expect(lineOf(all, 'song:africa', 'artist:david-paich')?.aToB).toBe(true);
    // And the record's guessed label, both ends one step out.
    expect(lineOf(all, 'release:toto-iv', 'label:columbia')?.guessed).toBe(
      true,
    );
    expect(all.linkCount).toBe(7);
  });

  it('keeps the focus when the filters would hide it, and ignores Orphans', () => {
    const rg = build({ orphans: false }, scope('genre:rock', 1));
    expect(rg.ids).toEqual(['genre:rock', 'song:africa']);
    expect(rg.focus).toBe(0);
    // A lone focus is still drawn.
    const lone = build({ orphans: false }, scope('song:lonely', 2));
    expect(lone.ids).toEqual(['song:lonely']);
    expect(lone.flags[0] & NODE_ORPHAN).toBe(NODE_ORPHAN);
  });

  it('stops the walk at tags, as Obsidian does, given walkFilters', () => {
    const tagsOn: RenderFilters = { ...DEFAULT_RENDER_FILTERS, tags: true };
    // Without the rule, the year leads on to its decade.
    const through = localGraph(GRAPH, 'song:africa', {
      depth: 2,
      nodeOk: nodeFilter(tagsOn),
      edgeOk: edgeFilter(tagsOn),
    });
    expect(through.depthOf.get('decade:1980s')).toBe(2);
    // With it, the year and the genre are reached and are dead ends.
    const leaf = localGraph(GRAPH, 'song:africa', {
      depth: 2,
      ...walkFilters(tagsOn),
    });
    expect(leaf.depthOf.get('year:1982')).toBe(1);
    expect(leaf.depthOf.get('genre:rock')).toBe(1);
    expect(leaf.depthOf.has('decade:1980s')).toBe(false);
    // Notes still lead on: Rosanna, through Toto.
    expect(leaf.depthOf.get('song:rosanna')).toBe(2);
    // A tag's own local graph still opens out from the tag.
    const year = localGraph(GRAPH, 'year:1982', {
      depth: 2,
      ...walkFilters(tagsOn),
    });
    expect(year.depthOf.get('song:africa')).toBe(1);
    expect(year.depthOf.get('decade:1980s')).toBe(1);
    expect(year.depthOf.get('artist:toto')).toBe(2);
  });

  it('walks on from notes and curriculum, never from a tag of any family', () => {
    const verdict = (id: EntityId) =>
      walkExpands(GRAPH.nodes.get(id) as GraphNode);
    expect(verdict('song:africa')).toBe(true);
    expect(verdict('place:los-angeles')).toBe(true);
    expect(verdict('teach_day:aug-day-1')).toBe(true);
    for (const tag of [
      'genre:rock',
      'year:1982',
      'decade:1980s',
      'key:a',
      'instrument:piano',
      'place:region-north-america',
    ] as EntityId[]) {
      expect(verdict(tag)).toBe(false);
    }
  });

  it('draws nothing for a focus the graph does not have', () => {
    const rg = build({}, scope('song:nowhere_man', 2));
    expect(rg.count).toBe(0);
    expect(rg.focus).toBe(-1);
  });
});

describe('buildRenderGraph: fingerprint', () => {
  it('ignores the order the graph was built in', () => {
    const shuffled = graphOf([...NODES].reverse(), [...EDGES].reverse());
    expect(build(ALL_ON, null, shuffled).fingerprint).toBe(
      build(ALL_ON).fingerprint,
    );
    expect(build(ALL_ON, null, shuffled).links).toEqual(build(ALL_ON).links);
  });

  it('ignores labels, statuses and line flags', () => {
    const renamed = graphOf(
      NODES.map((n) => ({
        ...n,
        label: `${n.label}!`,
        status: 'draft' as const,
      })),
      EDGES.map((e) => ({ ...e, inferred: undefined, unverified: true })),
    );
    expect(build(ALL_ON, null, renamed).fingerprint).toBe(
      build(ALL_ON).fingerprint,
    );
  });

  it('changes when a node or a line does', () => {
    const base = build(ALL_ON).fingerprint;
    const moreEdges = graphOf(NODES, [
      ...EDGES,
      edge('song:lonely', 'performed_by', 'artist:toto'),
    ]);
    expect(build(ALL_ON, null, moreEdges).fingerprint).not.toBe(base);
    const moreNodes = graphOf([...NODES, node('song:new_song')], EDGES);
    expect(build(ALL_ON, null, moreNodes).fingerprint).not.toBe(base);
    expect(build({ ...ALL_ON, tags: false }).fingerprint).not.toBe(base);
  });

  it('reads as counts and an FNV-1a hash', () => {
    const rg = build();
    expect(rg.fingerprint).toMatch(
      new RegExp(`^${rg.count}:${rg.linkCount}:[0-9a-f]{8}$`),
    );
    // FNV-1a of nothing is its offset basis.
    expect(structuralFingerprint([], new Uint32Array(0), 0)).toBe(
      '0:0:811c9dc5',
    );
    // An id's characters are not run together with the next id's.
    expect(structuralFingerprint(['ab', 'c'], [], 0)).not.toBe(
      structuralFingerprint(['a', 'bc'], [], 0),
    );
  });
});

describe('the flags the renderer reads', () => {
  it('uses the renderer’s line bits, so linkFlags pass straight through', () => {
    expect(LINE_GUESSED).toBe(LINK_FLAG_GUESSED);
    expect(LINE_UNCONFIRMED).toBe(LINK_FLAG_UNCONFIRMED);
    expect(LINE_FORWARD).toBe(LINK_FLAG_FORWARD);
    expect(LINE_BACKWARD).toBe(LINK_FLAG_BACKWARD);
  });

  it('puts the focus on the renderer’s ring bit, and the other flags apart', () => {
    expect(NODE_FOCUS).toBe(NODE_FLAG_RING);
    const bits = [
      NODE_FOCUS,
      NODE_MISSING,
      NODE_TAG,
      NODE_CURRICULUM,
      NODE_ORPHAN,
    ];
    expect(bits.reduce((all, b) => all | b, 0)).toBe(
      bits.reduce((sum, b) => sum + b, 0),
    );
  });
});
