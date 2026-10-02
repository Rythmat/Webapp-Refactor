// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type {
  EdgeKind,
  EntityId,
  EntityKind,
  GraphEdge,
  GraphNode,
} from '@/content/graph/types';
import type { LayoutPort } from '../layout/layoutClient';
import {
  createLayoutEngine,
  type InitRequest,
  type LayoutMessage,
  type LayoutRequest,
} from '../layout/layoutProtocol';
import type { PositionCache, PositionSnapshot } from '../layout/positionCache';
import { defaultGraphSettings, mappedForces } from '../model/graphSettings';
import { buildRenderGraph, type RenderGraph } from '../model/renderGraph';
import {
  GLOBAL_SCOPE,
  isTimelapseScope,
  placementSeed,
  RESTING_ALPHA,
  TIMELAPSE_TICKS_PER_SECOND,
  timelapseScope,
  useLayout,
  type UseLayoutOptions,
  withNewNodesPlaced,
} from '../useLayout';

/**
 * The layout's side of the timelapse: a timelapse run starts from nothing,
 * paced to the frame, and is never cached; the global graph it interrupted
 * comes back at rest, exactly where it had settled, unless something about
 * it changed meanwhile (here, the forces), when it warms up again as usual.
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
  via: [],
});

const IDS = [
  'artist:toto',
  'song:africa',
  'song:rosanna',
  'artist:michael-jackson',
  'song:thriller',
];
const EDGES = [
  edge('song:africa', 'performed_by', 'artist:toto'),
  edge('song:rosanna', 'performed_by', 'artist:toto'),
  edge('song:thriller', 'performed_by', 'artist:michael-jackson'),
  edge('song:rosanna', 'covers', 'song:thriller'),
];
const graphOf = (ids: string[]): RenderGraph =>
  buildRenderGraph({
    nodes: new Map(ids.map((id) => [id as EntityId, node(id)])),
    edges: EDGES.filter((e) => ids.includes(e.from) && ids.includes(e.to)),
  });
const WHOLE = graphOf(IDS);
const FIRST_STEP = graphOf(['artist:toto', 'song:africa']);
const FORCES = mappedForces(defaultGraphSettings().global.forces);

/** The inline engine behind a port that keeps every request. */
function recordingPort(requests: LayoutRequest[]): () => LayoutPort {
  return () => {
    let deliver: (message: LayoutMessage) => void = () => {};
    const engine = createLayoutEngine({
      post: (message) => queueMicrotask(() => deliver(message)),
      schedule: (task, ms) => {
        const id = setTimeout(task, ms);
        return () => clearTimeout(id);
      },
      now: () => performance.now(),
    });
    return {
      post(message) {
        requests.push(message);
        engine.handle(message);
      },
      listen(onMessage) {
        deliver = onMessage;
      },
      terminate: () => engine.dispose(),
    };
  };
}

/** A cache that remembers nothing and records what it was asked to save. */
function recordingCache(saves: PositionSnapshot[]): PositionCache {
  return {
    load: async (_signature: string, ids: readonly string[]) => ({
      xy: new Float32Array(ids.length * 2).fill(NaN),
      placed: 0,
      coverage: 0,
      alpha: 1,
    }),
    save: async (snapshot: PositionSnapshot) => {
      saves.push({ ...snapshot, xy: Float32Array.from(snapshot.xy) });
      return true;
    },
    saveOnPageHide: () => () => {},
    settled: async () => {},
    close: () => {},
  };
}

function setup() {
  const requests: LayoutRequest[] = [];
  const saves: PositionSnapshot[] = [];
  const base = (
    graph: RenderGraph,
    scope: string,
    forces = FORCES,
  ): UseLayoutOptions => ({
    graph,
    scope,
    signature: scope === GLOBAL_SCOPE ? 'global|test' : null,
    globalSignature: 'global|test',
    focusId: null,
    forces,
    cache: recordingCache(saves),
    clientOptions: { openPort: recordingPort(requests) },
  });
  const hook = renderHook((o: UseLayoutOptions) => useLayout(o), {
    initialProps: base(WHOLE, GLOBAL_SCOPE),
  });
  const inits = () =>
    requests.filter((r): r is InitRequest => r.type === 'init');
  return { ...hook, base, requests, saves, inits };
}

describe('the layout under a timelapse', () => {
  it('names its runs apart from the global and local graphs', () => {
    expect(timelapseScope(3)).toBe('timelapse:3');
    expect(isTimelapseScope(timelapseScope(1))).toBe(true);
    expect(isTimelapseScope(GLOBAL_SCOPE)).toBe(false);
    expect(isTimelapseScope('local:artist:toto')).toBe(false);
  });

  it('places each change’s unlinked newcomers with draws of its own', () => {
    expect(placementSeed('a')).toBe(placementSeed('a'));
    expect(placementSeed('a')).not.toBe(placementSeed('b'));
    // Two graphs, each one unlinked node bigger than a placed pair: with
    // one seed for both the newcomer would land at the same angle twice,
    // and step after step they lined up into a spoke.
    const angleOf = (fingerprint: string) => {
      const xy = Float32Array.from([0, 0, 50, 0, NaN, NaN]);
      const placed = withNewNodesPlaced(
        { count: 3, links: Uint32Array.from([0, 1]) },
        xy,
        placementSeed(fingerprint),
      );
      return Math.atan2(placed[5], placed[4]);
    };
    expect(angleOf('3:1:aaaa~step1')).toBe(angleOf('3:1:aaaa~step1'));
    expect(
      Math.abs(angleOf('3:1:aaaa~step1') - angleOf('3:1:aaaa~step2')),
    ).toBeGreaterThan(0.01);
  });

  it('grows from nothing, paced, uncached, and gives the global graph back at rest', async () => {
    const t = setup();
    await waitFor(() => expect(t.result.current.isSettled()).toBe(true), {
      timeout: 5000,
    });
    const settled = Float32Array.from(t.result.current.positions()!);
    const savedBefore = t.saves.length;
    expect(savedBefore).toBeGreaterThan(0);

    t.rerender(t.base(FIRST_STEP, timelapseScope(1)));
    await waitFor(() => expect(t.inits()).toHaveLength(2));
    const grow = t.inits()[1];
    expect(Array.from(grow.xy).every(Number.isNaN)).toBe(true);
    expect(grow.alpha).toBeUndefined();
    expect(grow.maxTicksPerSecond).toBe(TIMELAPSE_TICKS_PER_SECOND);
    expect(t.result.current.stats().warm).toBe(false);

    // The next step: the same run, a bigger graph.
    await waitFor(() => expect(t.result.current.positions()).not.toBeNull());
    t.rerender(t.base(WHOLE, timelapseScope(1)));
    expect(t.requests.at(-1)?.type).toBe('setGraph');
    await waitFor(() => expect(t.result.current.isSettled()).toBe(true), {
      timeout: 10_000,
    });
    // Nothing of the timelapse went into the cache.
    expect(t.saves).toHaveLength(savedBefore);

    t.rerender(t.base(WHOLE, GLOBAL_SCOPE));
    await waitFor(() => expect(t.inits()).toHaveLength(3));
    const back = t.inits()[2];
    expect(back.alpha).toBe(RESTING_ALPHA);
    expect(Array.from(back.xy)).toEqual(Array.from(settled));
    await waitFor(() => expect(t.result.current.isSettled()).toBe(true));
    expect(Array.from(t.result.current.positions()!)).toEqual(
      Array.from(settled),
    );
    expect(t.result.current.stats().ticks).toBe(0);
  }, 20_000);

  it('keeps hold of a dragged item when the graph changes under it', async () => {
    const t = setup();
    await waitFor(() => expect(t.result.current.isSettled()).toBe(true), {
      timeout: 5000,
    });
    // Hold Thriller (number 4 among the five, by id).
    const thriller = WHOLE.indexOf.get('song:thriller' as EntityId)!;
    t.result.current.pin(thriller, 10, 20);
    // A save adds an item that sorts before it: Thriller is renumbered.
    const grown = graphOf([...IDS, 'song:beat-it']);
    const now = grown.indexOf.get('song:thriller' as EntityId)!;
    expect(now).not.toBe(thriller);
    const before = t.requests.length;
    t.rerender(t.base(grown, GLOBAL_SCOPE));
    const after = t.requests.slice(before);
    expect(after.map((r) => r.type)).toEqual(['setGraph', 'pin']);
    expect(after[1]).toMatchObject({ type: 'pin', index: now, x: 10, y: 20 });
    // Let go by its old number: the item itself is let go.
    t.result.current.unpin(thriller);
    expect(t.requests.at(-1)).toMatchObject({ type: 'unpin', index: now });
  });

  it('warms the global graph up again when its forces changed meanwhile', async () => {
    const t = setup();
    await waitFor(() => expect(t.result.current.isSettled()).toBe(true), {
      timeout: 5000,
    });
    t.rerender(t.base(FIRST_STEP, timelapseScope(1)));
    await waitFor(() => expect(t.inits()).toHaveLength(2));
    const stronger = { ...FORCES, linkDistance: 400 };
    t.rerender(t.base(WHOLE, GLOBAL_SCOPE, stronger));
    await waitFor(() => expect(t.inits()).toHaveLength(3));
    expect(t.inits()[2].alpha).toBeUndefined();
    expect(t.result.current.stats().warm).toBe(true);
  });
});
