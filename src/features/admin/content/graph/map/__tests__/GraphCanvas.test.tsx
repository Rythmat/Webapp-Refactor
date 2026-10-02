// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  EdgeKind,
  EntityId,
  EntityKind,
  GraphEdge,
  GraphNode,
} from '@/content/graph/types';
import {
  GRAPH_CAMERA_KEY,
  GraphCanvas,
  type GraphCanvasApi,
  type GraphCanvasProps,
} from '../GraphCanvas';
import { defaultGraphSettings, mappedForces } from '../model/graphSettings';
import { buildRenderGraph, type RenderGraph } from '../model/renderGraph';
import {
  NODE_FLAG_RING,
  NODE_STATE_HOVERED,
  NODE_STATE_LIT,
  type RendererCamera,
  type RendererHighlight,
} from '../render/GraphRenderer';
import type { WebglGraphRenderer } from '../render/webglRenderer';

/**
 * Cortex's canvas in jsdom, with a renderer that records what it is told
 * and the layout engine running inline (jsdom has no WebGL and no Worker):
 * the region and its name, one renderer for the canvas's life, hover
 * lighting the neighbours, a click opening the dot, a drag pinning it, a
 * pan, the wheel's 1.5 per notch about the cursor, the keys, the preview
 * card, the rings, and the fallback where WebGL2 is missing.
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
const ATLAS = {
  nodes: new Map(NODES.map((n) => [n.id, n])),
  edges: EDGES,
};

/** A renderer that keeps what it was last told. */
function fakeRenderer() {
  const calls = {
    created: 0,
    setGraph: 0,
    setColors: 0,
    destroy: 0,
    renders: 0,
    highlight: null as RendererHighlight | null,
    camera: null as RendererCamera | null,
    flags: null as Uint8Array | null,
    positions: null as Float32Array | null,
  };
  let dirty = false;
  const make = (): WebglGraphRenderer => {
    calls.created += 1;
    const mark = () => {
      dirty = true;
    };
    return {
      get isDirty() {
        return dirty;
      },
      isLost: false,
      stats: { frames: 0, lastFrameMs: 0 },
      gpu: 'fake',
      setGraph(g) {
        calls.setGraph += 1;
        calls.flags = g.nodeFlags.slice();
        mark();
      },
      setPositions(xy) {
        calls.positions = xy.slice();
        mark();
      },
      setColors() {
        calls.setColors += 1;
        mark();
      },
      setNodeFlags(flags) {
        calls.flags = flags.slice();
        mark();
      },
      setHighlight(h) {
        calls.highlight = { ...h, state: h.state.slice() };
        mark();
      },
      setCamera(c) {
        calls.camera = { ...c };
        mark();
      },
      setStyle: mark,
      resize: mark,
      render() {
        dirty = false;
        calls.renders += 1;
      },
      destroy() {
        calls.destroy += 1;
      },
    };
  };
  return { calls, make };
}

const WIDTH = 800;
const HEIGHT = 600;

/** The stage as jsdom cannot measure it: 800 × 600 at the page's corner. */
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

function setup(overrides: Partial<GraphCanvasProps> = {}) {
  const renderer = fakeRenderer();
  const api = createRef<GraphCanvasApi>();
  const graph: RenderGraph = buildRenderGraph(ATLAS);
  const handlers = {
    onOpen: vi.fn(),
    onLocalGraph: vi.fn(),
    onCurrentChange: vi.fn(),
    onFind: vi.fn(),
    onSettled: vi.fn(),
    onUnavailable: vi.fn(),
  };
  const props: GraphCanvasProps = {
    graph,
    colors: new Uint8Array(graph.count * 4).fill(200),
    display: settings.global.display,
    forces: mappedForces(settings.global.forces),
    scope: 'global',
    signature: 'global|test',
    globalSignature: 'global|test',
    focusId: null,
    currentId: null,
    selectedId: null,
    label: `Cortex: ${graph.count} items, ${graph.linkCount} links`,
    reducedMotion: true,
    controlRef: api,
    createRenderer: () => renderer.make(),
    createLabels: () => null,
    positionCache: null,
    ...handlers,
    ...overrides,
  };
  const view = render(<GraphCanvas {...props} />);
  const region = screen.getByRole('application');
  const rerender = (next: Partial<GraphCanvasProps>) =>
    view.rerender(<GraphCanvas {...props} {...next} />);
  return { ...handlers, renderer, api, graph, region, rerender, props };
}

/** Wait until the inline layout has settled and a frame shows it. */
async function settled(t: ReturnType<typeof setup>) {
  await waitFor(() => expect(t.onSettled).toHaveBeenCalled());
  await waitFor(() =>
    expect(t.api.current?.screenPositionOf('artist:toto')).not.toBeNull(),
  );
}

/** A pointer event as a browser sends it (jsdom has no PointerEvent). */
function pointer(
  target: Element,
  type: string,
  x: number,
  y: number,
  extra: Partial<{
    button: number;
    buttons: number;
    ctrlKey: boolean;
    metaKey: boolean;
    pointerId: number;
    pointerType: string;
  }> = {},
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    button: extra.button ?? 0,
    buttons: extra.buttons ?? 0,
    ctrlKey: extra.ctrlKey ?? false,
    metaKey: extra.metaKey ?? false,
  });
  Object.defineProperty(event, 'pointerId', { value: extra.pointerId ?? 1 });
  Object.defineProperty(event, 'pointerType', {
    value: extra.pointerType ?? 'mouse',
  });
  act(() => {
    target.dispatchEvent(event);
  });
}

function key(target: Element, k: string, extra: KeyboardEventInit = {}) {
  act(() => {
    target.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: k,
        bubbles: true,
        cancelable: true,
        ...extra,
      }),
    );
  });
}

const at = (t: ReturnType<typeof setup>, id: string) => {
  const point = t.api.current?.screenPositionOf(id);
  if (!point) throw new Error(`${id} is not on screen`);
  return point;
};

/** A spot on the stage with no dot near it. */
function emptySpot(t: ReturnType<typeof setup>) {
  for (let y = 20; y < HEIGHT; y += 37) {
    for (let x = 20; x < WIDTH; x += 37) {
      if (t.api.current?.hitTest(x, y) === null) return { x, y };
    }
  }
  throw new Error('no empty spot');
}

describe('the graph region', () => {
  it('is an application region named for its counts, described by the key help', () => {
    const t = setup({ keyHelpId: 'keys' });
    expect(t.region).toHaveAccessibleName('Cortex: 7 items, 6 links');
    expect(t.region).toHaveAttribute('aria-roledescription', 'graph');
    expect(t.region).toHaveAttribute('aria-describedby', 'keys');
    expect(t.region).toHaveAttribute('tabindex', '0');
    for (const canvas of t.region.querySelectorAll('canvas')) {
      expect(canvas).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('keeps one renderer for its life: new colours, rings and graphs reuse it', async () => {
    const t = setup();
    await settled(t);
    expect(t.renderer.calls.created).toBe(1);
    const setGraphs = t.renderer.calls.setGraph;
    t.rerender({ colors: new Uint8Array(t.graph.count * 4).fill(90) });
    expect(t.renderer.calls.setColors).toBe(1);
    expect(t.renderer.calls.setGraph).toBe(setGraphs);
    // A graph of the same shape (a refresh of the same Atlas) is not sent
    // again; one with a node more is.
    t.rerender({ graph: buildRenderGraph(ATLAS) });
    expect(t.renderer.calls.setGraph).toBe(setGraphs);
    const grown = buildRenderGraph({
      nodes: new Map([
        ...ATLAS.nodes,
        ['song:99' as EntityId, node('song:99', '99')],
      ]),
      edges: [...EDGES, edge('song:99', 'performed_by', 'artist:toto')],
    });
    t.rerender({
      graph: grown,
      colors: new Uint8Array(grown.count * 4).fill(90),
    });
    expect(t.renderer.calls.setGraph).toBe(setGraphs + 1);
    expect(t.renderer.calls.created).toBe(1);
    expect(t.renderer.calls.destroy).toBe(0);
  });

  it('keeps a hover lit when a graph of the same shape arrives', async () => {
    const t = setup();
    await settled(t);
    const toto = t.graph.indexOf.get('artist:toto' as EntityId)!;
    const p = at(t, 'artist:toto');
    pointer(t.region, 'pointermove', p.x, p.y);
    await waitFor(() => expect(t.renderer.calls.highlight?.fade).toBe(1));
    // The same Atlas again, Toto renamed: the new name, the hover kept.
    const renamed = buildRenderGraph({
      nodes: new Map([
        ...ATLAS.nodes,
        ['artist:toto' as EntityId, node('artist:toto', 'TOTO')],
      ]),
      edges: EDGES,
    });
    t.rerender({ graph: renamed });
    expect(t.renderer.calls.highlight?.hovered).toBe(toto);
    expect(t.renderer.calls.highlight?.fade).toBe(1);
    expect(t.api.current?.hitTest(p.x, p.y)).toBe('artist:toto');
  });

  it('starts one layout run, and a graph of the same shape does not restart it', async () => {
    const t = setup();
    await settled(t);
    const stats = () =>
      (window.__atlasGraphDebug?.stats() as { layout: { starts: number } })
        .layout;
    expect(stats().starts).toBe(1);
    t.rerender({ graph: buildRenderGraph(ATLAS) });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(stats().starts).toBe(1);
    expect(window.__atlasGraphDebug?.counts).toEqual({ items: 7, links: 6 });
    expect(window.__atlasGraphDebug?.settled).toBe(true);
  });

  it('says where WebGL2 is missing, and tells the page', () => {
    const t = setup({ createRenderer: () => null });
    expect(t.onUnavailable).toHaveBeenCalledTimes(1);
    expect(t.region).toHaveTextContent(/cannot draw the graph/);
  });
});

describe('the pointer', () => {
  it('lights the hovered dot and its neighbours, and fades the rest', async () => {
    const t = setup();
    await settled(t);
    const toto = t.graph.indexOf.get('artist:toto' as EntityId)!;
    const p = at(t, 'artist:toto');
    pointer(t.region, 'pointermove', p.x, p.y);
    await waitFor(() => expect(t.renderer.calls.highlight?.fade).toBe(1));
    const { state, hovered } = t.renderer.calls.highlight!;
    expect(hovered).toBe(toto);
    expect(state[toto]).toBe(NODE_STATE_HOVERED);
    for (const id of [
      'song:africa',
      'song:rosanna',
      'song:hold-the-line',
      'release:toto-iv',
      'place:los-angeles',
    ]) {
      expect(state[t.graph.indexOf.get(id as EntityId)!], id).toBe(
        NODE_STATE_LIT,
      );
    }
    // Columbia is two steps away: it fades.
    expect(state[t.graph.indexOf.get('label:columbia' as EntityId)!]).toBe(0);
    expect(t.region.style.cursor).toBe('pointer');

    const empty = emptySpot(t);
    pointer(t.region, 'pointermove', empty.x, empty.y);
    await waitFor(() => expect(t.renderer.calls.highlight?.fade).toBe(0));
    expect(t.region.style.cursor).toBe('');
  });

  it('opens a dot on a click, and a move of more than 5 px is no click', async () => {
    const t = setup();
    await settled(t);
    const p = at(t, 'song:africa');
    pointer(t.region, 'pointerdown', p.x, p.y, { buttons: 1 });
    pointer(t.region, 'pointermove', p.x + 3, p.y + 2, { buttons: 1 });
    pointer(t.region, 'pointerup', p.x + 3, p.y + 2);
    // With the keys held as it was let go: none here.
    expect(t.onOpen).toHaveBeenCalledWith('song:africa', {
      altKey: false,
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
    });

    // Cmd held as it is let go: the page hears it (a progression's dot then
    // opens its row here rather than in Tesseract).
    t.onOpen.mockClear();
    pointer(t.region, 'pointerdown', p.x, p.y, { buttons: 1, metaKey: true });
    pointer(t.region, 'pointerup', p.x, p.y, { metaKey: true });
    expect(t.onOpen).toHaveBeenCalledWith(
      'song:africa',
      expect.objectContaining({ metaKey: true }),
    );

    t.onOpen.mockClear();
    pointer(t.region, 'pointerdown', p.x, p.y, { buttons: 1 });
    pointer(t.region, 'pointermove', p.x + 6, p.y, { buttons: 1 });
    pointer(t.region, 'pointerup', p.x + 6, p.y);
    expect(t.onOpen).not.toHaveBeenCalled();
    // The background clicked opens nothing either.
    const empty = emptySpot(t);
    pointer(t.region, 'pointerdown', empty.x, empty.y, { buttons: 1 });
    pointer(t.region, 'pointerup', empty.x, empty.y);
    expect(t.onOpen).not.toHaveBeenCalled();
  });

  it('pins a dragged dot under the pointer, and lets it go on release', async () => {
    const t = setup();
    await settled(t);
    const p = at(t, 'release:toto-iv');
    const to = { x: p.x + 60, y: p.y - 40 };
    pointer(t.region, 'pointerdown', p.x, p.y, { buttons: 1 });
    pointer(t.region, 'pointermove', to.x, to.y, { buttons: 1 });
    await waitFor(() => {
      const now = at(t, 'release:toto-iv');
      expect(Math.abs(now.x - to.x)).toBeLessThan(0.5);
      expect(Math.abs(now.y - to.y)).toBeLessThan(0.5);
    });
    pointer(t.region, 'pointerup', to.x, to.y);
    expect(t.onOpen).not.toHaveBeenCalled();
    // Let go, the layout settles again (it reheated round the drag).
    await waitFor(() => expect(t.onSettled).toHaveBeenCalled());
  });

  it('pans with a drag on the background', async () => {
    const t = setup();
    await settled(t);
    const empty = emptySpot(t);
    const before = { ...t.renderer.calls.camera! };
    pointer(t.region, 'pointerdown', empty.x, empty.y, { buttons: 1 });
    pointer(t.region, 'pointermove', empty.x + 50, empty.y + 30, {
      buttons: 1,
    });
    pointer(t.region, 'pointerup', empty.x + 50, empty.y + 30);
    const after = t.renderer.calls.camera!;
    expect(after.x).toBeCloseTo(before.x - 50 / before.zoom, 6);
    expect(after.y).toBeCloseTo(before.y - 30 / before.zoom, 6);
    expect(after.zoom).toBe(before.zoom);
  });

  it('zooms 1.5 times per wheel notch, in about the cursor', async () => {
    const t = setup();
    await settled(t);
    const before = { ...t.renderer.calls.camera! };
    const cursor = { x: 600, y: 150 };
    const worldUnder = (c: RendererCamera) => ({
      x: (cursor.x - WIDTH / 2) / c.zoom + c.x,
      y: (cursor.y - HEIGHT / 2) / c.zoom + c.y,
    });
    act(() => {
      t.region.dispatchEvent(
        new WheelEvent('wheel', {
          deltaY: -120,
          clientX: cursor.x,
          clientY: cursor.y,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    const after = t.renderer.calls.camera!;
    expect(after.zoom / before.zoom).toBeCloseTo(1.5, 10);
    expect(worldUnder(after).x).toBeCloseTo(worldUnder(before).x, 6);
    expect(worldUnder(after).y).toBeCloseTo(worldUnder(before).y, 6);
  });

  it('pinches with two fingers about their midpoint', async () => {
    const t = setup();
    await settled(t);
    const empty = emptySpot(t);
    const before = { ...t.renderer.calls.camera! };
    const touch = (type: string, id: number, x: number) =>
      pointer(t.region, type, x, empty.y, {
        buttons: 1,
        pointerId: id,
        pointerType: 'touch',
      });
    touch('pointerdown', 1, 300);
    touch('pointerdown', 2, 400);
    // The fingers move twice as far apart about the same midpoint.
    touch('pointermove', 1, 250);
    touch('pointermove', 2, 450);
    const after = t.renderer.calls.camera!;
    expect(after.zoom / before.zoom).toBeCloseTo(2, 6);
    const mid = 350;
    const worldX = (c: RendererCamera) => (mid - WIDTH / 2) / c.zoom + c.x;
    expect(worldX(after)).toBeCloseTo(worldX(before), 6);
    touch('pointerup', 1, 250);
    touch('pointerup', 2, 450);
    expect(t.onOpen).not.toHaveBeenCalled();
  });

  it('previews a dot while Cmd or Ctrl is held over it', async () => {
    const renderPreview = vi.fn((id: string) => (
      <div data-testid="preview">{id}</div>
    ));
    const t = setup({ renderPreview });
    await settled(t);
    const p = at(t, 'artist:toto');
    pointer(t.region, 'pointermove', p.x, p.y);
    expect(screen.queryByTestId('preview')).toBeNull();
    pointer(t.region, 'pointermove', p.x + 0.5, p.y, { metaKey: true });
    expect(screen.getByTestId('preview')).toHaveTextContent('artist:toto');
  });

  it('answers the context menu’s hit test in client pixels', async () => {
    const t = setup();
    await settled(t);
    const p = at(t, 'label:columbia');
    expect(t.api.current?.hitTest(p.x, p.y)).toBe('label:columbia');
    const empty = emptySpot(t);
    expect(t.api.current?.hitTest(empty.x, empty.y)).toBeNull();
  });
});

describe('the keys', () => {
  it('pan 40 px (120 with Shift) and zoom one notch about the middle', async () => {
    const t = setup();
    await settled(t);
    const c0 = { ...t.renderer.calls.camera! };
    key(t.region, 'ArrowRight');
    expect(t.renderer.calls.camera!.x).toBeCloseTo(c0.x + 40 / c0.zoom, 6);
    key(t.region, 'ArrowDown', { shiftKey: true });
    expect(t.renderer.calls.camera!.y).toBeCloseTo(c0.y + 120 / c0.zoom, 6);
    key(t.region, '=');
    expect(t.renderer.calls.camera!.zoom).toBeCloseTo(c0.zoom * 1.5, 10);
    key(t.region, '-');
    key(t.region, '-');
    expect(t.renderer.calls.camera!.zoom).toBeCloseTo(c0.zoom / 1.5, 10);
    // Cmd with = is the browser's zoom, not the graph's.
    const z = t.renderer.calls.camera!.zoom;
    key(t.region, '=', { metaKey: true });
    expect(t.renderer.calls.camera!.zoom).toBe(z);
  });

  it('fit with 0, and go to Find with /', async () => {
    const t = setup();
    await settled(t);
    const fitted = { ...t.renderer.calls.camera! };
    key(t.region, '=');
    key(t.region, 'ArrowLeft');
    key(t.region, '0');
    expect(t.renderer.calls.camera).toEqual(fitted);
    key(t.region, '/');
    expect(t.onFind).toHaveBeenCalledTimes(1);
  });

  it('step through the current item’s neighbours, open it, and open its local graph', async () => {
    const t = setup();
    await settled(t);
    // Nothing current: ] starts at the most linked item.
    key(t.region, ']');
    expect(t.onCurrentChange).toHaveBeenLastCalledWith(
      'artist:toto',
      undefined,
    );
    t.rerender({ currentId: 'artist:toto' });
    // Its neighbours, most linked first, then by name.
    key(t.region, ']');
    expect(t.onCurrentChange).toHaveBeenLastCalledWith('release:toto-iv', {
      index: 1,
      of: 5,
      from: 'Toto',
    });
    t.rerender({ currentId: 'release:toto-iv' });
    key(t.region, ']');
    expect(t.onCurrentChange).toHaveBeenLastCalledWith('song:africa', {
      index: 2,
      of: 5,
      from: 'Toto',
    });
    t.rerender({ currentId: 'song:africa' });
    key(t.region, '[');
    expect(t.onCurrentChange).toHaveBeenLastCalledWith('release:toto-iv', {
      index: 1,
      of: 5,
      from: 'Toto',
    });
    t.rerender({ currentId: 'release:toto-iv' });
    // Back past the first goes round to the last.
    key(t.region, '[');
    expect(t.onCurrentChange).toHaveBeenLastCalledWith('song:rosanna', {
      index: 5,
      of: 5,
      from: 'Toto',
    });
    t.rerender({ currentId: 'song:rosanna' });
    key(t.region, 'Enter');
    expect(t.onOpen).toHaveBeenCalledWith('song:rosanna');
    key(t.region, 'L');
    expect(t.onLocalGraph).toHaveBeenCalledWith('song:rosanna');
    key(t.region, 'Escape');
    expect(t.onCurrentChange).toHaveBeenLastCalledWith(null);
  });

  it('are left alone when typed into a field', async () => {
    const t = setup();
    await settled(t);
    const field = document.createElement('input');
    t.region.appendChild(field);
    const before = { ...t.renderer.calls.camera! };
    key(field, 'ArrowRight');
    key(field, '/');
    expect(t.renderer.calls.camera).toEqual(before);
    expect(t.onFind).not.toHaveBeenCalled();
  });
});

describe('rings and the camera kept', () => {
  it('rings the current item and the open row', async () => {
    const t = setup();
    await settled(t);
    t.rerender({ currentId: 'song:africa', selectedId: 'label:columbia' });
    const flags = t.renderer.calls.flags!;
    const index = (id: string) => t.graph.indexOf.get(id as EntityId)!;
    expect(flags[index('song:africa')]).toBe(NODE_FLAG_RING);
    expect(flags[index('label:columbia')]).toBe(NODE_FLAG_RING);
    expect(flags[index('artist:toto')]).toBe(0);
  });

  it('keeps the global graph’s camera in the browser when it unmounts', async () => {
    const t = setup();
    await settled(t);
    key(t.region, '=');
    const camera = { ...t.renderer.calls.camera! };
    cleanup();
    expect(JSON.parse(window.localStorage.getItem(GRAPH_CAMERA_KEY)!)).toEqual(
      camera,
    );
  });
});
