// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { localGraph } from '@/content/graph/localGraph';
import type {
  EdgeKind,
  EntityId,
  EntityKind,
  GraphEdge,
  GraphNode,
} from '@/content/graph/types';
import {
  GraphCanvas,
  type GraphCanvasApi,
  type GraphCanvasProps,
} from '../GraphCanvas';
import { ALPHA, SIMULATION } from '../layout/forceLayout';
import type { LayoutClientOptions, LayoutPort } from '../layout/layoutClient';
import { createLayoutEngine } from '../layout/layoutProtocol';
import type { PositionCache } from '../layout/positionCache';
import { defaultGraphSettings, mappedForces } from '../model/graphSettings';
import { buildRenderGraph, type RenderGraph } from '../model/renderGraph';
import type { RendererCamera } from '../render/GraphRenderer';
import type { LabelLayer } from '../render/labelLayer';
import type {
  WebglGraphRenderer,
  WebglRendererOptions,
} from '../render/webglRenderer';
import { localScope } from '../useLayout';

/**
 * Cortex's graph when things go wrong or the reader asks for stillness
 * (Amendment 7, P6), in jsdom with a renderer that records what it is told:
 *
 * - reduced motion: the layout worked out out of sight with "Arranging…
 *   N%", drawn once; a warm start shown at once; no fade, glide or coast;
 * - a save: the same structure recolours and renames with the layout left
 *   alone, a changed one reheats the same run to 0.1 with the new node
 *   already beside its neighbour;
 * - the WebGL context lost and given back: "Graph paused", names hidden,
 *   then a frame drawn again from the same positions;
 * - the layout worker failing: the same run carried on by the engine on
 *   the page, from where the worker had got to.
 *
 * Where the timing matters the layout engine runs on a clock and a queue
 * the test steps by hand, so "while it is arranging" is a moment the test
 * can stop at.
 */

const kindOf = (id: string) => id.slice(0, id.indexOf(':')) as EntityKind;
const node = (id: string, label: string): GraphNode => ({
  id: id as EntityId,
  kind: kindOf(id),
  label,
  status: 'published',
  origin: 'api',
});
const edge = (from: string, kind: EdgeKind, to: string): GraphEdge => ({
  from: from as EntityId,
  kind,
  to: to as EntityId,
  via: [{ item: from as EntityId, path: 'test' }],
});

const NODES = [
  node('artist:toto', 'Toto'),
  node('song:africa', 'Africa'),
  node('song:rosanna', 'Rosanna'),
  node('song:hold-the-line', 'Hold the Line'),
  node('release:toto-iv', 'Toto IV'),
  node('label:columbia', 'Columbia'),
  node('place:los-angeles', 'Los Angeles'),
];
const EDGES = [
  edge('song:africa', 'performed_by', 'artist:toto'),
  edge('song:rosanna', 'performed_by', 'artist:toto'),
  edge('song:hold-the-line', 'performed_by', 'artist:toto'),
  edge('release:toto-iv', 'performed_by', 'artist:toto'),
  edge('release:toto-iv', 'signed_to', 'label:columbia'),
  edge('artist:toto', 'based_in', 'place:los-angeles'),
];
const adjacencyOf = (edges: GraphEdge[]) => {
  const adjacency = new Map<EntityId, GraphEdge[]>();
  for (const e of edges) {
    adjacency.set(e.from, [...(adjacency.get(e.from) ?? []), e]);
    adjacency.set(e.to, [...(adjacency.get(e.to) ?? []), e]);
  }
  return adjacency;
};
const ATLAS = {
  nodes: new Map(NODES.map((n) => [n.id, n])),
  edges: EDGES,
  adjacency: adjacencyOf(EDGES),
};

/** The Atlas after a save: `extra` nodes, each performed by Toto. */
const atlasWith = (extra: GraphNode[], names: Record<string, string> = {}) => {
  const nodes = new Map(ATLAS.nodes);
  for (const [id, label] of Object.entries(names)) {
    nodes.set(id as EntityId, { ...nodes.get(id as EntityId)!, label });
  }
  for (const n of extra) nodes.set(n.id, n);
  return {
    nodes,
    edges: [
      ...EDGES,
      ...extra.map((n) => edge(n.id, 'performed_by', 'artist:toto')),
    ],
  };
};

/**
 * A renderer that keeps what it was told, and whose context the test can
 * take away and give back as a browser would.
 */
function fakeRenderer() {
  const calls = {
    created: 0,
    setGraph: 0,
    setColors: 0,
    setPositions: 0,
    renders: 0,
    positions: null as Float32Array | null,
    fades: [] as number[],
    cameras: [] as RendererCamera[],
  };
  let dirty = false;
  let lost = false;
  let options: WebglRendererOptions = {};
  const make = (
    _canvas: HTMLCanvasElement,
    given: WebglRendererOptions,
  ): WebglGraphRenderer => {
    calls.created += 1;
    options = given;
    const mark = () => {
      dirty = true;
    };
    return {
      get isDirty() {
        return dirty && !lost;
      },
      get isLost() {
        return lost;
      },
      stats: { frames: 0, lastFrameMs: 0 },
      gpu: 'fake',
      setGraph() {
        calls.setGraph += 1;
        mark();
      },
      setPositions(xy) {
        calls.setPositions += 1;
        calls.positions = xy.slice();
        mark();
      },
      setColors() {
        calls.setColors += 1;
        mark();
      },
      setNodeFlags: mark,
      setHighlight(h) {
        calls.fades.push(h.fade);
        mark();
      },
      setCamera(c) {
        calls.cameras.push({ ...c });
        mark();
      },
      setStyle: mark,
      resize: mark,
      render() {
        if (lost) return;
        dirty = false;
        calls.renders += 1;
      },
      destroy() {},
    };
  };
  return {
    calls,
    make,
    /** The browser takes the context away. */
    lose: () =>
      act(() => {
        lost = true;
        options.onContextLost?.();
      }),
    /** The browser gives it back, and the renderer has rebuilt itself. */
    restore: () =>
      act(() => {
        lost = false;
        dirty = true;
        options.onContextRestored?.();
      }),
  };
}

/** A label layer that keeps the names it was last asked to draw. */
function fakeLabels() {
  let shown: string[] = [];
  const layer: LabelLayer = {
    ready: Promise.resolve(),
    isReady: () => true,
    resize() {},
    setColor() {},
    setHaloColor() {},
    draw(frame) {
      shown = Array.from(frame.order, (i) => frame.text[i]);
      return shown.length;
    },
    clear() {
      shown = [];
    },
    destroy() {},
  };
  return { layer, shown: () => shown };
}

/**
 * The layout engine on a clock that moves 5 ms each time it is read, with
 * its slices queued for the test to run by hand. `options` go to the
 * canvas (or `openPort` wraps the same engine as a worker).
 */
function steppedEngine() {
  let clock = 0;
  const queue: { task: () => void; cancelled: boolean }[] = [];
  const options: LayoutClientOptions = {
    openPort: null,
    now: () => (clock += 5),
    schedule(task) {
      const entry = { task, cancelled: false };
      queue.push(entry);
      return () => {
        entry.cancelled = true;
      };
    },
  };
  /** Let promises and microtasks (the engine's messages) land. */
  const drain = () =>
    act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  /** Run slices until `until` holds, or none are left. */
  async function run(until: () => boolean = () => false) {
    for (let i = 0; i < 5000; i++) {
      if (until()) return true;
      const entry = queue.shift();
      if (!entry) {
        await drain();
        if (queue.length === 0) return until();
        continue;
      }
      if (entry.cancelled) continue;
      await act(async () => {
        entry.task();
        await Promise.resolve();
      });
    }
    return until();
  }
  /**
   * The same engine behind a port, as the worker would run it, that the
   * test can make fail.
   */
  function worker() {
    let deliver: (message: never) => void = () => {};
    let fail: (reason: string) => void = () => {};
    let terminated = false;
    const engine = createLayoutEngine({
      post: (message) => queueMicrotask(() => deliver(message as never)),
      schedule: options.schedule!,
      now: options.now!,
    });
    const port: LayoutPort = {
      post: (message) => engine.handle(message),
      listen(onMessage, onError) {
        deliver = onMessage as (message: never) => void;
        fail = onError;
      },
      terminate() {
        terminated = true;
        engine.dispose();
      },
    };
    return {
      port,
      fail: (reason: string) => act(() => fail(reason)),
      terminated: () => terminated,
    };
  }
  return { options, run, drain, worker };
}

/** The ticks the layout takes to cool from `alpha` to rest. */
const ticksToRest = (alpha: number) =>
  Math.ceil(
    Math.log(SIMULATION.alphaMin / alpha) / Math.log(1 - SIMULATION.alphaDecay),
  );

const WIDTH = 800;
const HEIGHT = 600;

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: WIDTH,
    bottom: HEIGHT,
    width: WIDTH,
    height: HEIGHT,
    toJSON: () => ({}),
  } as DOMRect);
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const settings = defaultGraphSettings();
const colorsFor = (graph: RenderGraph, value = 200) =>
  new Uint8Array(graph.count * 4).fill(value);

function setup(overrides: Partial<GraphCanvasProps> = {}) {
  const renderer = fakeRenderer();
  const api = createRef<GraphCanvasApi>();
  const graph = overrides.graph ?? buildRenderGraph(ATLAS);
  const handlers = {
    onOpen: vi.fn(),
    onLocalGraph: vi.fn(),
    onCurrentChange: vi.fn(),
    onFind: vi.fn(),
    onSettled: vi.fn(),
    onUnavailable: vi.fn(),
    onPausedChange: vi.fn(),
  };
  const props: GraphCanvasProps = {
    graph,
    colors: colorsFor(graph),
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
    createRenderer: renderer.make,
    createLabels: () => null,
    positionCache: null,
    ...handlers,
    ...overrides,
  };
  const view = render(<GraphCanvas {...props} />);
  const region = screen.getByRole('application');
  const rerender = (next: Partial<GraphCanvasProps>) =>
    view.rerender(<GraphCanvas {...props} {...next} />);
  return { ...handlers, renderer, api, graph, region, rerender };
}

/** The layout's own numbers, through the dev hook. */
const layoutStats = () =>
  (
    window.__atlasGraphDebug!.stats() as {
      layout: {
        starts: number;
        ticks: number;
        changes: number;
        alpha: number | null;
        lastError: string | null;
      };
      runsIn: string;
    }
  ).layout;
const runsIn = () =>
  (window.__atlasGraphDebug!.stats() as { runsIn: string }).runsIn;

/** A node's position in the positions the renderer last drew. */
const drawnAt = (
  t: ReturnType<typeof setup>,
  graph: RenderGraph,
  id: string,
) => {
  const i = graph.indexOf.get(id as EntityId)!;
  const xy = t.renderer.calls.positions!;
  return { x: xy[2 * i], y: xy[2 * i + 1] };
};

const arranging = () =>
  screen.queryByRole('progressbar', { name: 'Arranging the graph' });

/** A pointer event as a browser sends it, at a given time. */
function pointer(
  target: Element,
  type: string,
  x: number,
  y: number,
  extra: { buttons?: number; t?: number } = {},
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    button: 0,
    buttons: extra.buttons ?? 0,
  });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  Object.defineProperty(event, 'pointerType', { value: 'mouse' });
  if (extra.t !== undefined)
    Object.defineProperty(event, 'timeStamp', { value: extra.t });
  act(() => {
    target.dispatchEvent(event);
  });
}

/** Let a few animation frames go by. */
const frames = (ms = 120) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });

/**
 * Wait until the drawing has caught up with the layout: the canvas uploads
 * the latest positions once a frame, so the last tick's positions can reach
 * the renderer a frame after the layout says it has settled. Under a busy
 * test run that frame can come late, so wait for 60 ms without an upload.
 */
const drawnCaughtUp = async (t: ReturnType<typeof setup>) => {
  for (let i = 0; i < 50; i++) {
    const uploads = t.renderer.calls.setPositions;
    await frames(60);
    if (t.renderer.calls.setPositions === uploads) return;
  }
};

describe('reduced motion', () => {
  it('lays the graph out out of sight, says how far it has come, and draws it once', async () => {
    const engine = steppedEngine();
    const t = setup({
      reducedMotion: true,
      layoutClientOptions: engine.options,
    });
    // Run the layout until it reports progress, then look while it works.
    expect(await engine.run(() => arranging() !== null)).toBe(true);
    const bar = arranging()!;
    expect(bar).toHaveTextContent(/^Arranging… \d+%$/);
    const first = Number(bar.getAttribute('aria-valuenow'));
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(100);
    // Nothing on the stage yet, so the status sits in its middle.
    expect(bar.className).toContain('top-1/2');
    await frames(40);
    expect(t.renderer.calls.setPositions).toBe(0);
    expect(t.onSettled).not.toHaveBeenCalled();

    // It counts up as the layout cools.
    expect(
      await engine.run(
        () => Number(arranging()?.getAttribute('aria-valuenow')) > first,
      ),
    ).toBe(true);
    expect(t.renderer.calls.setPositions).toBe(0);

    await engine.run();
    await waitFor(() => expect(t.onSettled).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(t.renderer.calls.setPositions).toBe(1));
    expect(arranging()).toBeNull();
    // Laid out to rest from a cold start: Obsidian's full 300 ticks.
    expect(layoutStats().ticks).toBe(ticksToRest(ALPHA.cold));
    await frames(60);
    expect(t.renderer.calls.setPositions).toBe(1);
  });

  it('opens a local graph already drawn together, never the cut-out it starts from', async () => {
    const engine = steppedEngine();
    const t = setup({
      reducedMotion: true,
      layoutClientOptions: engine.options,
    });
    await engine.run();
    await waitFor(() => expect(t.onSettled).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(t.renderer.calls.setPositions).toBe(1));

    // Two steps round Toto: it starts from the global positions, centred
    // on him, which under reduced motion are never shown.
    const walk = localGraph(ATLAS, 'artist:toto' as EntityId, { depth: 2 });
    const local = buildRenderGraph(ATLAS, undefined, {
      walk,
      neighborLinks: false,
    });
    t.rerender({
      graph: local,
      colors: colorsFor(local),
      scope: localScope('artist:toto'),
      signature: null,
      focusId: 'artist:toto',
    });
    // The run has started (its first slice is queued) and frames have gone
    // by: nothing new was drawn while it waits to be worked out.
    await engine.drain();
    await frames(60);
    expect(t.renderer.calls.setPositions).toBe(1);
    await engine.run();
    await waitFor(() => expect(t.onSettled).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(t.renderer.calls.setPositions).toBe(2));
    await frames(60);
    // One upload for the local graph: its rest, with Toto no longer pinned
    // to the centre the start put him at.
    expect(t.renderer.calls.setPositions).toBe(2);
    const toto = drawnAt(t, local, 'artist:toto');
    expect(Math.hypot(toto.x, toto.y)).toBeGreaterThan(0.001);
  });

  it('shows a warm start where it was at once, and still draws the rest only once', async () => {
    const engine = steppedEngine();
    const graph = buildRenderGraph(ATLAS);
    // Where an earlier visit left the nodes: round a circle.
    const kept = new Float32Array(graph.count * 2);
    for (let i = 0; i < graph.count; i++) {
      const a = (2 * Math.PI * i) / graph.count;
      kept[2 * i] = 300 * Math.cos(a);
      kept[2 * i + 1] = 300 * Math.sin(a);
    }
    const cache: PositionCache = {
      load: async () => ({
        xy: kept.slice(),
        placed: graph.count,
        coverage: 1,
        alpha: ALPHA.warm,
      }),
      save: async () => true,
      saveOnPageHide: () => () => {},
      settled: async () => {},
      close() {},
    };
    const t = setup({
      graph,
      reducedMotion: true,
      layoutClientOptions: engine.options,
      positionCache: cache,
    });
    // Before the layout has run a single slice, the kept positions show.
    await engine.drain();
    await waitFor(() => expect(t.renderer.calls.setPositions).toBe(1));
    expect(Array.from(t.renderer.calls.positions!)).toEqual(Array.from(kept));
    await engine.run();
    await waitFor(() => expect(t.onSettled).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(t.renderer.calls.setPositions).toBe(2));
  });

  it('turns the hover on and off at once, where it otherwise fades over 150 ms', async () => {
    const still = setup({ reducedMotion: true });
    await waitFor(() => expect(still.onSettled).toHaveBeenCalled());
    await waitFor(() =>
      expect(still.api.current?.screenPositionOf('artist:toto')).not.toBeNull(),
    );
    const p = still.api.current!.screenPositionOf('artist:toto')!;
    still.renderer.calls.fades.length = 0;
    pointer(still.region, 'pointermove', p.x, p.y);
    await frames();
    pointer(still.region, 'pointermove', 5, 5);
    await frames();
    expect(still.renderer.calls.fades).toContain(1);
    expect(still.renderer.calls.fades.every((f) => f === 0 || f === 1)).toBe(
      true,
    );
    cleanup();

    const moving = setup({ reducedMotion: false });
    await waitFor(() => expect(moving.onSettled).toHaveBeenCalled());
    await waitFor(() =>
      expect(
        moving.api.current?.screenPositionOf('artist:toto'),
      ).not.toBeNull(),
    );
    const q = moving.api.current!.screenPositionOf('artist:toto')!;
    moving.renderer.calls.fades.length = 0;
    pointer(moving.region, 'pointermove', q.x, q.y);
    await frames(250);
    expect(moving.renderer.calls.fades.some((f) => f > 0 && f < 1)).toBe(true);
  });

  it('jumps instead of gliding or coasting: a find lands at once, a flung pan stops dead', async () => {
    const t = setup({ reducedMotion: true });
    await waitFor(() => expect(t.onSettled).toHaveBeenCalled());
    await waitFor(() =>
      expect(t.api.current?.screenPositionOf('song:africa')).not.toBeNull(),
    );
    // Find: the very next frame is already there.
    t.renderer.calls.cameras.length = 0;
    act(() => {
      expect(t.api.current?.flyTo('song:africa')).toBe(true);
    });
    await frames(60);
    const africa = drawnAt(t, t.graph, 'song:africa');
    const flights = t.renderer.calls.cameras;
    expect(flights.length).toBeGreaterThan(0);
    for (const c of flights) {
      expect(c.x).toBeCloseTo(africa.x, 6);
      expect(c.y).toBeCloseTo(africa.y, 6);
    }

    // A quick flick on the background: 3 px a millisecond, then let go.
    const fling = async (canvas: ReturnType<typeof setup>) => {
      const from = { x: 20, y: 20 };
      expect(canvas.api.current?.hitTest(from.x, from.y)).toBeNull();
      pointer(canvas.region, 'pointerdown', from.x, from.y, {
        buttons: 1,
        t: 1000,
      });
      pointer(canvas.region, 'pointermove', from.x + 30, from.y, {
        buttons: 1,
        t: 1010,
      });
      pointer(canvas.region, 'pointermove', from.x + 60, from.y, {
        buttons: 1,
        t: 1020,
      });
      pointer(canvas.region, 'pointerup', from.x + 60, from.y, { t: 1021 });
      const released = { ...canvas.renderer.calls.cameras.at(-1)! };
      await frames(120);
      return { released, after: canvas.renderer.calls.cameras.at(-1)! };
    };
    const still = await fling(t);
    expect(still.after).toEqual(still.released);
    cleanup();

    // With motion, the same flick coasts on after the release.
    const moving = setup({ reducedMotion: false });
    await waitFor(() => expect(moving.onSettled).toHaveBeenCalled());
    await waitFor(() =>
      expect(
        moving.api.current?.screenPositionOf('song:africa'),
      ).not.toBeNull(),
    );
    const coasted = await fling(moving);
    expect(coasted.after.x).toBeLessThan(coasted.released.x - 1);
  });
});

describe('refresh after a save', () => {
  it('recolours and renames when the structure is the same, and the layout never hears of it', async () => {
    const engine = steppedEngine();
    const labels = fakeLabels();
    const t = setup({
      layoutClientOptions: engine.options,
      createLabels: () => labels.layer,
      currentId: 'artist:toto',
    });
    await engine.run();
    await waitFor(() => expect(t.onSettled).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(labels.shown()).toContain('Toto'));
    await drawnCaughtUp(t);
    const before = { ...layoutStats() };
    const setGraphs = t.renderer.calls.setGraph;
    const uploads = t.renderer.calls.setPositions;
    const where = drawnAt(t, t.graph, 'release:toto-iv');

    // The drawer saved a new name for Toto: the working graph is rebuilt,
    // and with it what is drawn and its colours.
    const saved = buildRenderGraph(atlasWith([], { 'artist:toto': 'TOTO' }));
    expect(saved.fingerprint).toBe(t.graph.fingerprint);
    t.rerender({
      graph: saved,
      colors: colorsFor(saved, 90),
      currentId: 'artist:toto',
    });
    await waitFor(() => expect(labels.shown()).toContain('TOTO'));
    expect(t.renderer.calls.setColors).toBe(1);
    expect(t.renderer.calls.setGraph).toBe(setGraphs);
    // No reheat, not a tick: nothing for the engine to run.
    expect(await engine.run()).toBe(false);
    await frames(40);
    expect(layoutStats()).toEqual(before);
    expect(t.renderer.calls.setPositions).toBe(uploads);
    expect(drawnAt(t, saved, 'release:toto-iv')).toEqual(where);
    expect(t.onSettled).toHaveBeenCalledTimes(1);
  });

  it('reheats the same run to 0.1 when a save adds an item, with the item beside its neighbour from the first frame', async () => {
    const engine = steppedEngine();
    const t = setup({ layoutClientOptions: engine.options });
    await engine.run();
    await waitFor(() => expect(t.onSettled).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(t.api.current?.screenPositionOf('artist:toto')).not.toBeNull(),
    );
    await drawnCaughtUp(t);
    const toto = drawnAt(t, t.graph, 'artist:toto');
    const columbia = drawnAt(t, t.graph, 'label:columbia');
    const setGraphs = t.renderer.calls.setGraph;

    // A new song by Toto, saved in the drawer.
    const saved = buildRenderGraph(atlasWith([node('song:99', '99')]));
    t.rerender({ graph: saved, colors: colorsFor(saved) });
    expect(t.renderer.calls.setGraph).toBe(setGraphs + 1);
    // The frame before the layout's first tick: everyone where they were,
    // the new song already within a few dots of Toto.
    await waitFor(() =>
      expect(t.renderer.calls.positions?.length).toBe(saved.count * 2),
    );
    expect(drawnAt(t, saved, 'label:columbia')).toEqual(columbia);
    const placed = drawnAt(t, saved, 'song:99');
    expect(
      Math.hypot(placed.x - toto.x, placed.y - toto.y),
    ).toBeLessThanOrEqual(30);

    await engine.run();
    await waitFor(() => expect(layoutStats().alpha).toBeLessThan(0.001));
    // The same run, carried over and cooled from a save's 0.1.
    expect(layoutStats()).toMatchObject({
      starts: 1,
      changes: 1,
      ticks: ticksToRest(ALPHA.structure),
    });
    expect(t.renderer.calls.created).toBe(1);
  });
});

describe('the WebGL context', () => {
  it('says the graph is paused while the context is lost, hides the names, and draws again when it is back', async () => {
    const t = setup({ reducedMotion: true });
    await waitFor(() => expect(t.onSettled).toHaveBeenCalled());
    await waitFor(() => expect(t.renderer.calls.renders).toBeGreaterThan(0));
    const labelCanvas = t.region.querySelectorAll('canvas')[1];
    expect(labelCanvas.className).not.toContain('invisible');
    const positions = t.renderer.calls.positions!.slice();

    await t.renderer.lose();
    expect(t.onPausedChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByRole('status')).toHaveTextContent(
      /^Graph paused: the browser took away its drawing surface\./,
    );
    expect(labelCanvas.className).toContain('invisible');
    // Nothing is drawn while it is gone, however the camera moves.
    const renders = t.renderer.calls.renders;
    act(() => t.api.current?.zoomBy(1.5));
    await frames(60);
    expect(t.renderer.calls.renders).toBe(renders);

    await t.renderer.restore();
    expect(t.onPausedChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByText(/Graph paused/)).toBeNull();
    expect(labelCanvas.className).not.toContain('invisible');
    // A frame at once, from the same positions, with no new renderer.
    await waitFor(() =>
      expect(t.renderer.calls.renders).toBeGreaterThan(renders),
    );
    expect(Array.from(t.renderer.calls.positions!)).toEqual(
      Array.from(positions),
    );
    expect(t.renderer.calls.created).toBe(1);
  });
});

describe('the layout worker', () => {
  it('carries the same run on with the engine on the page when the worker fails, from where it had got to', async () => {
    const engine = steppedEngine();
    const worker = engine.worker();
    const t = setup({
      layoutClientOptions: { ...engine.options, openPort: () => worker.port },
    });
    expect(runsIn()).toBe('worker');
    // Part way: the worker has been posting positions for a while.
    expect(
      await engine.run(
        () =>
          window.__atlasGraphDebug !== undefined && layoutStats().ticks >= 60,
      ),
    ).toBe(true);
    const heat = layoutStats().alpha!;
    expect(heat).toBeGreaterThan(0.1);

    await worker.fail('The layout worker stopped.');
    expect(worker.terminated()).toBe(true);
    expect(runsIn()).toBe('inline');
    expect(layoutStats().lastError).toBe('The layout worker stopped.');

    await engine.run();
    await waitFor(() => expect(t.onSettled).toHaveBeenCalledTimes(1));
    // Not a new run: it cooled on from the heat the worker had reached,
    // where a fresh start would have taken all 300 ticks.
    expect(layoutStats().starts).toBe(1);
    expect(layoutStats().ticks).toBe(ticksToRest(heat));
    expect(layoutStats().ticks).toBeLessThan(ticksToRest(ALPHA.cold) - 50);
    await waitFor(() =>
      expect(t.api.current?.screenPositionOf('song:africa')).not.toBeNull(),
    );
  });

  it('runs on the page from the start when no worker can be opened', async () => {
    const t = setup({
      layoutClientOptions: {
        openPort: () => {
          throw new Error('Workers are blocked here');
        },
      },
    });
    expect(runsIn()).toBe('inline');
    await waitFor(() => expect(t.onSettled).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(t.api.current?.screenPositionOf('song:africa')).not.toBeNull(),
    );
  });
});
