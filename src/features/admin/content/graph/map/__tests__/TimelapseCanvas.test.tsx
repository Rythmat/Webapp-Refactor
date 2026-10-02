// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EntityId, GraphEdge } from '@/content/graph/types';
import type { GraphCanvasApi } from '../GraphCanvas';
import {
  TimelapseCanvas,
  type TimelapseCanvasProps,
  TimelapseCounter,
} from '../TimelapseCanvas';
import type { LayoutPort } from '../layout/layoutClient';
import {
  createLayoutEngine,
  type InitRequest,
  type LayoutMessage,
  type LayoutRequest,
  type SetGraphRequest,
} from '../layout/layoutProtocol';
import { graphFacets } from '../model/facets';
import { defaultGraphSettings, mappedForces } from '../model/graphSettings';
import {
  buildRenderGraph,
  DEFAULT_RENDER_FILTERS,
  type RenderGraph,
} from '../model/renderGraph';
import { revealGraph } from '../model/timelapseGraph';
import type { WebglGraphRenderer } from '../render/webglRenderer';
import {
  createTimelapsePlayer,
  type TimelapsePlayer,
} from '../timelapsePlayer';
import { localScope, TIMELAPSE_TICKS_PER_SECOND } from '../useLayout';
import { ATLAS } from './queryFixture';

/**
 * "Animate" on the real canvas, in jsdom: a renderer that records what it is
 * told, the layout engine running inline behind a port that keeps every
 * request, and the player's clock stepped by hand. The run grows the graph
 * from nothing in a layout run of its own, a line only once both its ends
 * show; Stop, Escape or a graph of another shape end it; and the layout the
 * graph had settled at before comes back exactly, the dots gliding home.
 */

const edges: GraphEdge[] = [...new Set([...ATLAS.adjacency.values()].flat())];
// The default filters: the notes, no tags (the years still date them).
const FULL = buildRenderGraph(
  { nodes: ATLAS.nodes, edges },
  DEFAULT_RENDER_FILTERS,
);
const FACETS = graphFacets(ATLAS);
const settings = defaultGraphSettings();

function fakeRenderer() {
  const graphs: { count: number; links: Uint32Array; colors: Uint8Array }[] =
    [];
  let positions: Float32Array | null = null;
  let made = 0;
  let dirty = false;
  const mark = () => {
    dirty = true;
  };
  const make = (): WebglGraphRenderer => {
    made += 1;
    return {
      get isDirty() {
        return dirty;
      },
      isLost: false,
      stats: { frames: 0, lastFrameMs: 0 },
      gpu: 'fake',
      setGraph(g) {
        graphs.push({
          count: g.count,
          links: g.links.slice(),
          colors: g.colors.slice(),
        });
        mark();
      },
      setPositions(xy) {
        positions = xy.slice();
        mark();
      },
      setColors: mark,
      setNodeFlags: mark,
      setHighlight: mark,
      setCamera: mark,
      setStyle: mark,
      resize: mark,
      render() {
        dirty = false;
      },
      destroy() {},
    } as WebglGraphRenderer;
  };
  return {
    make,
    graphs,
    made: () => made,
    positions: () => positions,
    drawnCount: () => graphs[graphs.length - 1]?.count ?? 0,
  };
}

/** The inline engine behind a port that keeps every request it is sent. */
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

/** A player whose steps run when the test says. */
function manualPlayer() {
  let pending: (() => void) | null = null;
  const player = createTimelapsePlayer({
    schedule: (task) => {
      pending = task;
      return () => {
        if (pending === task) pending = null;
      };
    },
  });
  const step = () => {
    const task = pending;
    pending = null;
    act(() => task?.());
  };
  return { player, step, hasNext: () => pending !== null };
}

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 800,
    bottom: 600,
    width: 800,
    height: 600,
    toJSON: () => ({}),
  } as DOMRect);
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function setup(overrides: Partial<TimelapseCanvasProps> = {}) {
  const renderer = fakeRenderer();
  const requests: LayoutRequest[] = [];
  const api = createRef<GraphCanvasApi>();
  const { player, step, hasNext } = manualPlayer();
  const onSettled = vi.fn();
  const props: TimelapseCanvasProps = {
    player,
    graph: FULL,
    colors: new Uint8Array(FULL.count * 4).fill(200),
    display: settings.global.display,
    forces: mappedForces(settings.global.forces),
    scope: 'global',
    signature: 'global|test',
    globalSignature: 'global|test',
    focusId: null,
    currentId: null,
    selectedId: null,
    label: 'Cortex',
    reducedMotion: false,
    controlRef: api,
    createRenderer: () => renderer.make(),
    createLabels: () => null,
    positionCache: null,
    layoutClientOptions: { openPort: recordingPort(requests) },
    onOpen: vi.fn(),
    onLocalGraph: vi.fn(),
    onCurrentChange: vi.fn(),
    onFind: vi.fn(),
    onSettled,
    ...overrides,
  };
  const view = render(
    <>
      <TimelapseCanvas {...props} />
      <TimelapseCounter player={player} onStop={player.stop} />
    </>,
  );
  const rerender = (next: Partial<TimelapseCanvasProps>) =>
    view.rerender(
      <>
        <TimelapseCanvas {...props} {...next} />
        <TimelapseCounter player={player} onStop={player.stop} />
      </>,
    );
  return {
    renderer,
    requests,
    api,
    player,
    step,
    hasNext,
    onSettled,
    rerender,
    region: screen.getByRole('application'),
  };
}

const inits = (requests: LayoutRequest[]) =>
  requests.filter((r): r is InitRequest => r.type === 'init');
const setGraphs = (requests: LayoutRequest[]) =>
  requests.filter((r): r is SetGraphRequest => r.type === 'setGraph');

/** The global graph laid out and at rest; its positions, as drawn. */
async function settledGlobal(t: ReturnType<typeof setup>) {
  await waitFor(() => expect(t.onSettled).toHaveBeenCalled(), {
    timeout: 5000,
  });
  await waitFor(() =>
    expect(t.renderer.positions()?.length).toBe(FULL.count * 2),
  );
  return Float32Array.from(t.renderer.positions()!);
}

function start(t: ReturnType<typeof setup>, player: TimelapsePlayer) {
  let first: ReturnType<TimelapsePlayer['start']> = null;
  act(() => {
    first = player.start(FULL, FACETS);
  });
  return first!;
}

/** A pointer event as a browser sends it (jsdom has no PointerEvent). */
function pointer(
  target: Element,
  type: string,
  x: number,
  y: number,
  buttons = 0,
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    button: 0,
    buttons,
  });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  Object.defineProperty(event, 'pointerType', { value: 'mouse' });
  act(() => {
    target.dispatchEvent(event);
  });
}

describe('the timelapse on the canvas', () => {
  it('grows the graph from nothing, in a paced run of its own', async () => {
    const t = setup();
    await settledGlobal(t);
    const before = inits(t.requests).length;
    const run = start(t, t.player);
    const plan = run.plan!;
    expect(plan.batches.length).toBeGreaterThan(2);

    // A new run, cold (no positions at all) and paced to the frame.
    await waitFor(() => expect(inits(t.requests).length).toBe(before + 1));
    const init = inits(t.requests).at(-1)!;
    const first = revealGraph(FULL, plan, 0).graph;
    expect(init.count).toBe(first.count);
    expect(Array.from(init.xy).every(Number.isNaN)).toBe(true);
    expect(init.alpha).toBeUndefined();
    expect(init.maxTicksPerSecond).toBe(TIMELAPSE_TICKS_PER_SECOND);
    expect(t.renderer.drawnCount()).toBe(first.count);
    expect(screen.getByRole('group', { name: 'Timelapse' })).toHaveTextContent(
      String(plan.firstYear),
    );

    // Each step hands the layout the bigger graph; the dots already there
    // keep their places.
    const counts = [first.count];
    for (let b = 1; b < plan.batches.length; b++) {
      await waitFor(() => expect(t.renderer.positions()).not.toBeNull());
      t.step();
      const shown = revealGraph(FULL, plan, b).graph;
      counts.push(shown.count);
      expect(t.renderer.drawnCount()).toBe(shown.count);
      const drawn = t.renderer.graphs.at(-1)!;
      // A line only between two dots showing.
      for (const end of drawn.links) expect(end).toBeLessThan(shown.count);
      expect(drawn.links.length).toBe(shown.linkCount * 2);
      const grown = setGraphs(t.requests).at(-1)!;
      expect(grown.count).toBe(shown.count);
    }
    expect(counts).toEqual([...counts].sort((a, b) => a - b));
    expect(counts.at(-1)).toBe(FULL.count);
    // The same canvas throughout, and no "Layout settled" for the show.
    expect(t.renderer.made()).toBe(1);
    expect(t.onSettled).toHaveBeenCalledTimes(1);
  });

  it('hands back the layout it had settled at, the dots gliding home', async () => {
    const t = setup();
    const settled = await settledGlobal(t);
    /** How far the furthest dot is from where the graph had settled. */
    const away = (xy: Float32Array | null) => {
      if (!xy || xy.length !== settled.length) return Infinity;
      let most = 0;
      for (let i = 0; i < xy.length; i++)
        most = Math.max(most, Math.abs(xy[i] - settled[i]));
      return most;
    };
    const runs = inits(t.requests).length;
    const plan = start(t, t.player).plan!;
    await waitFor(() => expect(inits(t.requests).length).toBe(runs + 1));
    for (let b = 1; b < plan.batches.length; b++) t.step();
    // The grown picture: the timelapse's own layout of the whole graph,
    // nothing like the settled one.
    await waitFor(() => {
      const xy = t.renderer.positions();
      expect(xy?.length).toBe(FULL.count * 2);
      expect(away(xy)).toBeGreaterThan(50);
    });

    // Every batch in: the picture holds, then hands back by itself.
    t.step();
    expect(t.player.getSnapshot().status).toBe('holding');
    const before = inits(t.requests).length;
    t.step();
    expect(t.player.getSnapshot().status).toBe('idle');
    expect(screen.queryByRole('group', { name: 'Timelapse' })).toBeNull();

    // The global run starts again from exactly where it had settled.
    await waitFor(() => expect(inits(t.requests).length).toBe(before + 1));
    const init = inits(t.requests).at(-1)!;
    expect(init.count).toBe(FULL.count);
    expect(Array.from(init.xy)).toEqual(Array.from(settled));
    expect(t.renderer.drawnCount()).toBe(FULL.count);

    // The dots glide: part of the way home, then home.
    await waitFor(() => {
      const gap = away(t.renderer.positions());
      expect(gap).toBeGreaterThan(1);
      expect(gap).toBeLessThan(Infinity);
    });
    // Home is exactly where it had settled: the layout resumes at rest.
    await waitFor(
      () => expect(away(t.renderer.positions())).toBeLessThan(1e-3),
      { timeout: 4000 },
    );
    // Coming back at rest is not news (the page says the run ended); the
    // next run's settle is.
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(t.onSettled).toHaveBeenCalledTimes(1);
    t.rerender({ scope: localScope('artist:toto'), signature: null });
    await waitFor(() => expect(t.onSettled).toHaveBeenCalledTimes(2), {
      timeout: 8000,
    });
  }, 20_000);

  it('keeps hold of a dragged dot while the graph grows under it', async () => {
    const t = setup();
    await settledGlobal(t);
    const plan = start(t, t.player).plan!;
    const stepGraph = (b: number) => revealGraph(FULL, plan, b).graph;
    // A dot of the first year, once the run has drawn it.
    const id = stepGraph(0).ids[0];
    await waitFor(() =>
      expect(t.api.current?.screenPositionOf(id)).not.toBeNull(),
    );
    const p = t.api.current!.screenPositionOf(id)!;
    const pins = () =>
      t.requests.filter(
        (r): r is Extract<LayoutRequest, { type: 'pin' }> => r.type === 'pin',
      );
    pointer(t.region, 'pointerdown', p.x, p.y, 1);
    pointer(t.region, 'pointermove', p.x + 30, p.y + 10, 1);
    expect(pins()).toHaveLength(1);
    // The graph grows twice; the dot is still the one held.
    for (const b of [1, 2]) {
      t.step();
      pointer(t.region, 'pointermove', p.x + 30 + 10 * b, p.y + 10, 1);
      const held = pins().at(-1)!;
      expect(stepGraph(b).ids[held.index]).toBe(id);
    }
    expect(pins().map((r) => stepGraph(0).ids[r.index] ?? id)).toEqual(
      pins().map(() => id),
    );
    pointer(t.region, 'pointerup', p.x + 50, p.y + 10);
    expect(t.requests.at(-1)).toMatchObject({ type: 'unpin' });
  });

  it('stops on Stop and on Escape over the graph', async () => {
    const t = setup();
    await settledGlobal(t);
    start(t, t.player);
    t.step();
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(t.player.getSnapshot().status).toBe('idle');
    await waitFor(() => expect(t.renderer.drawnCount()).toBe(FULL.count));

    start(t, t.player);
    expect(t.player.getSnapshot().status).toBe('playing');
    fireEvent.keyDown(t.region, { key: 'Escape' });
    expect(t.player.getSnapshot().status).toBe('idle');
  });

  it('stops when the graph changes shape under it', async () => {
    const t = setup();
    await settledGlobal(t);
    start(t, t.player);
    expect(t.player.getSnapshot().status).toBe('playing');
    // The same graph again (a refresh) keeps playing…
    t.rerender({ graph: buildRenderGraph({ nodes: ATLAS.nodes, edges }) });
    expect(t.player.getSnapshot().status).toBe('playing');
    // …one with a link fewer ends the run.
    const fewer = buildRenderGraph({
      nodes: ATLAS.nodes,
      edges: edges.filter(
        (e) =>
          !(
            e.from === ('song:rosanna' as EntityId) && e.kind === 'performed_by'
          ),
      ),
    });
    t.rerender({
      graph: fewer,
      colors: new Uint8Array(fewer.count * 4).fill(200),
    });
    expect(t.player.getSnapshot().status).toBe('idle');
  });

  it('colours each step’s dots as the whole graph has them', async () => {
    // Each dot's red is its number in the whole graph.
    const colors = new Uint8Array(FULL.count * 4);
    for (let i = 0; i < FULL.count; i++) colors.set([i, 0, 0, 255], 4 * i);
    const t = setup({ colors });
    await settledGlobal(t);
    const plan = start(t, t.player).plan!;
    t.step();
    const shown: RenderGraph = revealGraph(FULL, plan, 1).graph;
    const drawn = t.renderer.graphs.at(-1)!;
    expect(drawn.count).toBe(shown.count);
    for (let k = 0; k < shown.count; k++) {
      expect(drawn.colors[4 * k]).toBe(FULL.indexOf.get(shown.ids[k]));
    }
  });
});
