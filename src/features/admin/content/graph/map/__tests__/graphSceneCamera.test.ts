import { describe, expect, it } from 'vitest';
import type {
  EdgeKind,
  EntityId,
  EntityKind,
  GraphEdge,
  GraphNode,
} from '@/content/graph/types';
import {
  createGraphScene,
  ZOOM_EASE_DONE,
  ZOOM_EASE_KEEP,
} from '../graphScene';
import type { Camera, Point, Viewport } from '../model/camera';
import { buildRenderGraph, type RenderGraph } from '../model/renderGraph';
import {
  LABEL_GAP_PX,
  labelScale,
  nodeRadii,
  ringDeviceWidth,
} from '../model/sizing';
import { NODE_FLAG_RING } from '../render/GraphRenderer';
import type { LabelFrame, LabelLayer } from '../render/labelLayer';
import type { WebglGraphRenderer } from '../render/webglRenderer';

/**
 * The scene's camera and labels, with frames and the clock driven by hand:
 * the wheel's eased zoom (Obsidian's `updateZoom`: 15% of the gap a frame,
 * landing exactly once within 1%), the pan that brings an open row's dot
 * back when the stage narrows over it, and where a ringed dot's name sits
 * and which names get a halo.
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
const graphOf = (ids: string[], links: [string, string][]): RenderGraph =>
  buildRenderGraph({
    nodes: new Map(ids.map((id) => [id as EntityId, node(id)])),
    edges: links.map(([a, b]) => edge(a, 'performed_by', b)),
  });

// Ids sort a, b, c, d, so positions follow that order.
const GRAPH = graphOf(
  ['artist:a', 'song:b', 'song:c', 'song:d'],
  [
    ['song:b', 'artist:a'],
    ['song:c', 'artist:a'],
  ],
);
const XY = [0, 0, 300, 0, -300, 100, 2000, 2000];
const VIEW: Viewport = { width: 800, height: 600, dpr: 1 };

function harness(dpr = 1) {
  let time = 1000;
  let frames: ((time: number) => void)[] = [];
  let lastFrame: LabelFrame | null = null;
  const renderer = {
    isDirty: false,
    isLost: false,
    stats: { frames: 0, lastFrameMs: 0 },
    gpu: 'fake',
    setGraph() {},
    setPositions() {},
    setColors() {},
    setNodeFlags() {},
    setHighlight() {},
    setCamera() {},
    setStyle() {},
    resize() {},
    render() {},
    destroy() {},
  } as unknown as WebglGraphRenderer;
  const labels: LabelLayer = {
    ready: Promise.resolve(),
    isReady: () => true,
    resize() {},
    setColor() {},
    setHaloColor() {},
    draw(frame) {
      lastFrame = {
        ...frame,
        order: Array.from(frame.order),
        offset:
          typeof frame.offset === 'number' || frame.offset === undefined
            ? frame.offset
            : Array.from(frame.offset),
        halo:
          typeof frame.halo === 'number' || frame.halo === undefined
            ? frame.halo
            : Array.from(frame.halo),
      };
      return frame.order.length;
    },
    clear() {},
    destroy() {},
  };
  const xy = Float32Array.from(XY);
  const scene = createGraphScene({
    renderer,
    labels,
    hooks: { positions: () => xy },
    requestFrame: (callback) => {
      frames.push(callback);
      return frames.length;
    },
    cancelFrame: () => {},
    now: () => time,
  });
  scene.resize(VIEW.width, VIEW.height, dpr);
  const flags = new Uint8Array(GRAPH.count);
  scene.setGraph(
    GRAPH,
    nodeRadii(GRAPH),
    new Uint8Array(GRAPH.count * 4),
    flags,
  );
  const step = (ms = 1000 / 60) => {
    time += ms;
    const due = frames;
    frames = [];
    for (const frame of due) frame(time);
  };
  step();
  scene.setAutoFit(false);
  scene.setCamera({ x: 0, y: 0, zoom: 0.5 }, true);
  step();
  const worldUnder = (c: Camera, p: Point) => ({
    x: (p.x - VIEW.width / 2) / c.zoom + c.x,
    y: (p.y - VIEW.height / 2) / c.zoom + c.y,
  });
  return {
    scene,
    step,
    pending: () => frames.length,
    worldUnder,
    label: () => lastFrame,
  };
}

describe('the eased zoom', () => {
  it('eases 15% of the way a frame and lands exactly on 1.5 per notch, about the cursor', () => {
    const t = harness();
    const cursor = { x: 600, y: 150 };
    const before = t.scene.camera();
    const anchored = t.worldUnder(before, cursor);
    t.scene.zoomToward(1.5, cursor);
    // Nothing jumps: the zoom moves only as frames come.
    expect(t.scene.camera().zoom).toBe(0.5);
    expect(t.scene.zoomTarget()).toBeCloseTo(0.75, 12);
    t.step();
    const first = t.scene.camera().zoom;
    expect(first).toBeCloseTo(
      0.5 * ZOOM_EASE_KEEP + 0.75 * (1 - ZOOM_EASE_KEEP),
      10,
    );
    // The point under the cursor stays put every frame.
    const mid = t.worldUnder(t.scene.camera(), cursor);
    expect(mid.x).toBeCloseTo(anchored.x, 8);
    expect(mid.y).toBeCloseTo(anchored.y, 8);
    let frames = 1;
    while (t.pending() > 0 && frames < 200) {
      t.step();
      frames += 1;
    }
    const after = t.scene.camera();
    expect(after.zoom).toBe(0.75);
    expect(t.scene.zoomTarget()).toBeNull();
    const end = t.worldUnder(after, cursor);
    expect(end.x).toBeCloseTo(anchored.x, 8);
    expect(end.y).toBeCloseTo(anchored.y, 8);
    // log(0.01 / 0.5) / log(0.85) ≈ 24 frames, then quiet.
    expect(frames).toBeGreaterThan(15);
    expect(frames).toBeLessThan(30);
  });

  it('adds notches to where the zoom is heading, not where it is', () => {
    const t = harness();
    t.scene.zoomToward(1.5, { x: 400, y: 300 });
    t.step();
    t.scene.zoomToward(1.5, { x: 400, y: 300 });
    t.scene.zoomToward(1.5, { x: 400, y: 300 });
    expect(t.scene.zoomTarget()).toBeCloseTo(0.5 * 1.5 ** 3, 12);
    for (let i = 0; i < 200 && t.pending() > 0; i++) t.step();
    expect(t.scene.camera().zoom).toBeCloseTo(0.5 * 1.5 ** 3, 12);
  });

  it('zooms out about the middle, wherever the cursor is', () => {
    const t = harness();
    const before = t.scene.camera();
    t.scene.zoomToward(1 / 1.5, { x: 700, y: 50 });
    for (let i = 0; i < 200 && t.pending() > 0; i++) t.step();
    const after = t.scene.camera();
    expect(after.zoom).toBeCloseTo(before.zoom / 1.5, 12);
    expect(after.x).toBeCloseTo(before.x, 10);
    expect(after.y).toBeCloseTo(before.y, 10);
  });

  it('runs at the same speed on a 120 Hz screen', () => {
    const t = harness();
    t.scene.zoomToward(2, null);
    // The first frame takes Obsidian's one step, whatever the screen.
    t.step(1000 / 120);
    const first = 0.5 * ZOOM_EASE_KEEP + 1 * (1 - ZOOM_EASE_KEEP);
    expect(t.scene.camera().zoom).toBeCloseTo(first, 10);
    // After it, two 120 Hz frames close the gap as much as one 60 Hz frame.
    t.step(1000 / 120);
    t.step(1000 / 120);
    const expected = first * ZOOM_EASE_KEEP + 1 * (1 - ZOOM_EASE_KEEP);
    expect(t.scene.camera().zoom).toBeCloseTo(expected, 10);
  });

  it('jumps there under reduced motion', () => {
    const t = harness();
    t.scene.setReducedMotion(true);
    const cursor = { x: 600, y: 150 };
    const anchored = t.worldUnder(t.scene.camera(), cursor);
    t.scene.zoomToward(1.5, cursor);
    expect(t.scene.camera().zoom).toBe(0.75);
    expect(t.scene.zoomTarget()).toBeNull();
    const end = t.worldUnder(t.scene.camera(), cursor);
    expect(end.x).toBeCloseTo(anchored.x, 8);
  });

  it('lands where it was going when reduced motion is turned on mid-way', () => {
    const t = harness();
    t.scene.zoomToward(1.5, { x: 600, y: 150 });
    t.step();
    t.scene.setReducedMotion(true);
    expect(t.scene.camera().zoom).toBeCloseTo(0.75, 12);
    expect(t.scene.zoomTarget()).toBeNull();
  });

  it('carries on through a pan, but stops for a fit, a flight or a new zoom', () => {
    const t = harness();
    t.scene.zoomToward(1.5, null);
    t.step();
    const c = t.scene.camera();
    t.scene.setCamera({ ...c, x: c.x + 10 }, true);
    expect(t.scene.zoomTarget()).toBeCloseTo(0.75, 12);
    t.scene.fit(false);
    expect(t.scene.zoomTarget()).toBeNull();

    t.scene.zoomToward(1.5, null);
    expect(t.scene.flyTo(0)).toBe(true);
    expect(t.scene.zoomTarget()).toBeNull();

    t.scene.zoomToward(1.5, null);
    t.scene.setCamera({ ...t.scene.camera(), zoom: 0.2 }, true);
    expect(t.scene.zoomTarget()).toBeNull();
    expect(t.scene.camera().zoom).toBe(0.2);
  });

  it('stays inside Obsidian’s range', () => {
    const t = harness();
    for (let i = 0; i < 40; i++) t.scene.zoomToward(1.5, null);
    expect(t.scene.zoomTarget()).toBe(8);
    for (let i = 0; i < 400 && t.pending() > 0; i++) t.step();
    expect(t.scene.camera().zoom).toBe(8);
    expect(ZOOM_EASE_DONE).toBe(0.01);
  });
});

describe('bringing the open row’s dot back', () => {
  it('pans the least that puts a hidden dot 48 px inside the stage, gliding there', () => {
    const t = harness();
    t.scene.setCamera({ x: 0, y: 0, zoom: 1 }, true);
    t.step();
    // song:b at world x 300 sits at screen x 700 on the 800 px stage; the
    // stage narrows to 500 px (a drawer opening), and he is off it.
    t.scene.resize(500, 600, 1);
    t.step();
    expect(t.scene.screenOf(1)!.x).toBeGreaterThan(500);
    expect(t.scene.reveal(1)).toBe(true);
    for (let i = 0; i < 60 && t.pending() > 0; i++) t.step();
    const at = t.scene.screenOf(1)!;
    expect(at.x).toBeCloseTo(500 - 48, 6);
    expect(at.y).toBeCloseTo(300, 6);
    expect(t.scene.camera().zoom).toBe(1);
    // On the stage already: nothing moves.
    expect(t.scene.reveal(0)).toBe(false);
  });

  it('jumps under reduced motion', () => {
    const t = harness();
    t.scene.setReducedMotion(true);
    t.scene.setCamera({ x: 0, y: 0, zoom: 1 }, true);
    t.scene.resize(500, 600, 1);
    expect(t.scene.reveal(1)).toBe(true);
    expect(t.scene.screenOf(1)!.x).toBeCloseTo(452, 6);
  });
});

describe('the labels of ringed dots', () => {
  it('start below the ring, and the ringed and hovered names get a halo', () => {
    const t = harness(2);
    t.scene.setCamera({ x: 0, y: 0, zoom: 1 }, true);
    const flags = new Uint8Array(GRAPH.count);
    flags[2] = NODE_FLAG_RING;
    t.scene.setFlags(flags);
    t.step();
    const radii = nodeRadii(GRAPH);
    const type = labelScale(1, 2);
    const ring = ringDeviceWidth(1, 2) / 2;
    let frame = t.label()!;
    const offset = frame.offset as number[];
    // The scene's arrays are 32-bit floats.
    expect(offset[2]).toBeCloseTo((radii[2] + LABEL_GAP_PX) * type + ring, 5);
    expect(offset[1]).toBeCloseTo((radii[1] + LABEL_GAP_PX) * type, 5);
    // Only the ringed name has a halo while nothing is hovered.
    const halo = frame.halo as number[];
    expect(halo[2]).toBe(1);
    expect(halo[1]).toBe(0);
    expect(halo[3]).toBe(0);

    // Hovering artist:a lights b and c: their names sit on its white
    // lines, so they get a halo too; d is not next to it.
    t.scene.hover(0);
    for (let i = 0; i < 30 && t.pending() > 0; i++) t.step(20);
    frame = t.label()!;
    const lit = frame.halo as number[];
    expect(lit[0]).toBe(1);
    expect(lit[1]).toBe(1);
    expect(lit[2]).toBe(1);
    expect(lit[3]).toBe(0);
    expect((frame.offset as number[])[0]).toBeCloseTo(
      (radii[0] + LABEL_GAP_PX) * type + ring,
      5,
    );
  });

  it('draws no halo at all when no name needs one', () => {
    const t = harness(2);
    t.scene.setCamera({ x: 0, y: 0, zoom: 1 }, true);
    t.step();
    expect(t.label()!.halo).toBe(0);
  });
});
