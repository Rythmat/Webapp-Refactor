// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { localGraph } from '@/content/graph/localGraph';
import type {
  EdgeKind,
  EntityId,
  EntityKind,
  GraphEdge,
  GraphNode,
} from '@/content/graph/types';
import { ALPHA, NEW_NODE_JITTER, SIMULATION } from '../layout/forceLayout';
import { defaultGraphSettings, mappedForces } from '../model/graphSettings';
import { buildRenderGraph, type RenderGraph } from '../model/renderGraph';
import {
  GLOBAL_SCOPE,
  localScope,
  useLayout,
  type UseLayoutOptions,
  withNewNodesPlaced,
} from '../useLayout';

/**
 * Cortex's layout hook, with the engine inline (jsdom has no Worker) and no
 * cache: one run per scope, nothing restarted for a graph of the same
 * shape, a changed shape carried over with the positions nodes had (new
 * nodes placed beside their neighbours at once, the run reheated to a
 * save's 0.1), a save that changes no structure never reaching the layout,
 * a local graph started from the global positions round its focus, and the
 * global graph warm again on the way back.
 */

const kindOf = (id: string) => id.slice(0, id.indexOf(':')) as EntityKind;
const node = (id: string): GraphNode => ({
  id: id as EntityId,
  kind: kindOf(id),
  label: id,
  status: 'published',
  origin: 'api',
});
const edge = (from: string, kind: EdgeKind, to: string): GraphEdge => ({
  from: from as EntityId,
  kind,
  to: to as EntityId,
  via: [{ item: from as EntityId, path: 'test' }],
});

const atlas = (extra: string[] = []) => {
  const ids = [
    'artist:toto',
    'song:africa',
    'song:rosanna',
    'artist:michael-jackson',
    'song:thriller',
    ...extra,
  ];
  const edges = [
    edge('song:africa', 'performed_by', 'artist:toto'),
    edge('song:rosanna', 'performed_by', 'artist:toto'),
    edge('song:thriller', 'performed_by', 'artist:michael-jackson'),
    edge('song:rosanna', 'covers', 'song:thriller'),
    ...extra.map((id) => edge(id, 'performed_by', 'artist:toto')),
  ];
  const nodes = new Map(ids.map((id) => [id as EntityId, node(id)]));
  const adjacency = new Map<EntityId, GraphEdge[]>();
  for (const e of edges) {
    adjacency.set(e.from, [...(adjacency.get(e.from) ?? []), e]);
    adjacency.set(e.to, [...(adjacency.get(e.to) ?? []), e]);
  }
  return { nodes, edges, adjacency };
};

const FORCES = mappedForces(defaultGraphSettings().global.forces);

/**
 * The ticks the layout takes to cool from `alpha` to rest, by its own decay:
 * how a test tells a save's reheat (0.1) from a slider's (0.3) or a cold
 * start (1) after the fact.
 */
const ticksToRest = (alpha: number) =>
  Math.ceil(
    Math.log(SIMULATION.alphaMin / alpha) / Math.log(1 - SIMULATION.alphaDecay),
  );

const base = (graph: RenderGraph, scope = GLOBAL_SCOPE): UseLayoutOptions => ({
  graph,
  scope,
  signature: scope === GLOBAL_SCOPE ? 'global|test' : null,
  globalSignature: 'global|test',
  focusId: scope === GLOBAL_SCOPE ? null : scope.slice('local:'.length),
  forces: FORCES,
  cache: null,
  clientOptions: { openPort: null },
});

const positionOf = (
  layout: { positions(): Float32Array | null },
  graph: RenderGraph,
  id: string,
) => {
  const i = graph.indexOf.get(id as EntityId)!;
  const xy = layout.positions()!;
  return { x: xy[2 * i], y: xy[2 * i + 1] };
};

describe('useLayout', () => {
  it('runs once per scope, and a graph of the same shape changes nothing', async () => {
    const graph = buildRenderGraph(atlas());
    const { result, rerender } = renderHook(
      (o: UseLayoutOptions) => useLayout(o),
      {
        initialProps: base(graph),
      },
    );
    await waitFor(() => expect(result.current.isSettled()).toBe(true));
    expect(result.current.stats().starts).toBe(1);
    expect(result.current.stats().warm).toBe(false);
    expect(result.current.runsIn()).toBe('inline');

    const before = positionOf(result.current, graph, 'song:africa');
    const same = buildRenderGraph(atlas());
    expect(same.fingerprint).toBe(graph.fingerprint);
    rerender(base(same));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(result.current.stats().starts).toBe(1);
    expect(result.current.isSettled()).toBe(true);
    expect(positionOf(result.current, same, 'song:africa')).toEqual(before);
  });

  it('carries a changed shape over, every node keeping its place', async () => {
    const graph = buildRenderGraph(atlas());
    const { result, rerender } = renderHook(
      (o: UseLayoutOptions) => useLayout(o),
      {
        initialProps: base(graph),
      },
    );
    await waitFor(() => expect(result.current.isSettled()).toBe(true));
    const before = positionOf(result.current, graph, 'song:thriller');

    const toto = positionOf(result.current, graph, 'artist:toto');
    const grown = buildRenderGraph(atlas(['song:hold-the-line']));
    rerender(base(grown));
    // At once, before the layout has ticked: the old nodes where they were,
    // the new one already placed beside its one neighbour, Toto.
    expect(positionOf(result.current, grown, 'song:thriller')).toEqual(before);
    const placed = positionOf(result.current, grown, 'song:hold-the-line');
    expect(
      Math.hypot(placed.x - toto.x, placed.y - toto.y),
    ).toBeLessThanOrEqual(NEW_NODE_JITTER);
    await waitFor(() => expect(result.current.isSettled()).toBe(true));
    // The same run, reheated to 0.1 (a save's reheat): cooling from there
    // to rest takes exactly this many ticks (200), where a cold start takes
    // 300 and a slider's reheat to 0.3 takes 248.
    expect(result.current.stats().starts).toBe(1);
    expect(result.current.stats().changes).toBe(1);
    expect(result.current.stats().ticks).toBe(ticksToRest(ALPHA.structure));
    expect(
      Number.isFinite(
        positionOf(result.current, grown, 'song:hold-the-line').x,
      ),
    ).toBe(true);
  });

  it('leaves the layout alone when a save changes no structure', async () => {
    const graph = buildRenderGraph(atlas());
    const { result, rerender } = renderHook(
      (o: UseLayoutOptions) => useLayout(o),
      { initialProps: base(graph) },
    );
    await waitFor(() => expect(result.current.isSettled()).toBe(true));
    const ticks = result.current.stats().ticks;
    const heard: string[] = [];
    const stop = result.current.subscribe((event) => heard.push(event.type));
    // Toto renamed: the same nodes and lines in a new graph object.
    const renamed = atlas();
    renamed.nodes.set('artist:toto' as EntityId, {
      ...node('artist:toto'),
      label: 'TOTO',
    });
    const next = buildRenderGraph(renamed);
    expect(next.fingerprint).toBe(graph.fingerprint);
    rerender(base(next));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    stop();
    // Not a tick, not a message: the layout never heard of it.
    expect(heard).toEqual([]);
    expect(result.current.isSettled()).toBe(true);
    expect(result.current.stats()).toMatchObject({
      starts: 1,
      changes: 0,
      ticks,
    });
  });

  it('places a new group with no placed neighbour on a ring outside the cloud', () => {
    // Two placed nodes 100 apart, a new pair linked only to each other.
    const aligned = Float32Array.from([-50, 0, 50, 0, NaN, NaN, NaN, NaN]);
    const xy = withNewNodesPlaced(
      { count: 4, links: Uint32Array.from([0, 1, 2, 3]) },
      aligned,
    );
    expect(Array.from(xy.subarray(0, 4))).toEqual([-50, 0, 50, 0]);
    // The first lands on the ring (cloud radius 50, plus 200), the second
    // beside it.
    expect(Math.hypot(xy[4], xy[5])).toBeCloseTo(250, 3);
    expect(Math.hypot(xy[6] - xy[4], xy[7] - xy[5])).toBeLessThanOrEqual(
      NEW_NODE_JITTER,
    );
    // Nothing placed at all: left for the layout's own cold start.
    const cold = withNewNodesPlaced(
      { count: 2, links: Uint32Array.from([0, 1]) },
      new Float32Array(4).fill(NaN),
    );
    expect(Array.from(cold).every(Number.isNaN)).toBe(true);
  });

  it('starts a local graph from the global positions round its focus, and the global graph warm again after', async () => {
    const full = atlas();
    const graph = buildRenderGraph(full);
    const { result, rerender } = renderHook(
      (o: UseLayoutOptions) => useLayout(o),
      {
        initialProps: base(graph),
      },
    );
    await waitFor(() => expect(result.current.isSettled()).toBe(true));
    const toto = positionOf(result.current, graph, 'artist:toto');
    const africa = positionOf(result.current, graph, 'song:africa');

    const walk = localGraph(full, 'artist:toto' as EntityId, { depth: 1 });
    const local = buildRenderGraph(full, undefined, {
      walk,
      neighborLinks: false,
    });
    // Where the local run starts, read as it starts.
    let started: Float32Array | null = null;
    const stop = result.current.subscribe((event) => {
      if (event.type === 'start')
        started = result.current.positions()?.slice() ?? null;
    });
    rerender(base(local, localScope('artist:toto')));
    await waitFor(() => expect(result.current.stats().starts).toBe(2));
    // Not a warm start: the local graph still finds its own shape.
    expect(result.current.stats().warm).toBe(false);
    await waitFor(() => expect(result.current.isSettled()).toBe(true));
    stop();
    // It began where the global graph had Africa, shifted so Toto, the
    // focus, sat at the centre.
    expect(local.count).toBe(3);
    const at = (id: string) => {
      const i = local.indexOf.get(id as EntityId)!;
      return { x: started![2 * i], y: started![2 * i + 1] };
    };
    expect(at('artist:toto').x).toBeCloseTo(0, 3);
    expect(at('artist:toto').y).toBeCloseTo(0, 3);
    expect(at('song:africa').x).toBeCloseTo(africa.x - toto.x, 2);
    expect(at('song:africa').y).toBeCloseTo(africa.y - toto.y, 2);

    rerender(base(graph));
    await waitFor(() => expect(result.current.stats().starts).toBe(3));
    expect(result.current.stats().warm).toBe(true);
    await waitFor(() => expect(result.current.isSettled()).toBe(true));
    // Warm from where it settled: it barely moved.
    const again = positionOf(result.current, graph, 'artist:toto');
    expect(Math.hypot(again.x - toto.x, again.y - toto.y)).toBeLessThan(25);
  });

  it('reheats for new forces without a new run', async () => {
    const graph = buildRenderGraph(atlas());
    const { result, rerender } = renderHook(
      (o: UseLayoutOptions) => useLayout(o),
      {
        initialProps: base(graph),
      },
    );
    await waitFor(() => expect(result.current.isSettled()).toBe(true));
    const spread = (g: RenderGraph) =>
      Math.hypot(
        positionOf(result.current, g, 'song:africa').x -
          positionOf(result.current, g, 'song:thriller').x,
        positionOf(result.current, g, 'song:africa').y -
          positionOf(result.current, g, 'song:thriller').y,
      );
    const before = spread(graph);
    rerender({ ...base(graph), forces: { ...FORCES, linkDistance: 500 } });
    await waitFor(() => {
      expect(result.current.isSettled()).toBe(true);
      expect(spread(graph)).toBeGreaterThan(before * 1.2);
    });
    expect(result.current.stats().starts).toBe(1);
  });
});
