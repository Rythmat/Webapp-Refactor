import { describe, expect, it } from 'vitest';
import type {
  EdgeKind,
  EntityId,
  EntityKind,
  GraphEdge,
  GraphNode,
} from '@/content/graph/types';
import { createGraphScene } from '../graphScene';
import type { Camera } from '../model/camera';
import { buildRenderGraph, type RenderGraph } from '../model/renderGraph';
import { nodeRadii } from '../model/sizing';
import type { WebglGraphRenderer } from '../render/webglRenderer';

/**
 * The scene's glide, which hands a timelapse's picture back to the settled
 * layout: each dot travels from where it was drawn to its new place, a dot
 * not drawn before appears in place, a camera the page sets meanwhile flies
 * there with them, and none of it happens under reduced motion. Frames and
 * the clock are driven by hand.
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

function harness() {
  let time = 1000;
  let frames: ((time: number) => void)[] = [];
  let latest: Float32Array | null = null;
  const uploads: Float32Array[] = [];
  const renderer = {
    isDirty: false,
    isLost: false,
    stats: { frames: 0, lastFrameMs: 0 },
    gpu: 'fake',
    setGraph() {},
    setPositions(xy: Float32Array) {
      uploads.push(xy.slice());
    },
    setColors() {},
    setNodeFlags() {},
    setHighlight() {},
    setCamera() {},
    setStyle() {},
    resize() {},
    render() {},
    destroy() {},
  } as unknown as WebglGraphRenderer;
  const scene = createGraphScene({
    renderer,
    labels: null,
    hooks: { positions: () => latest },
    requestFrame: (callback) => {
      frames.push(callback);
      return frames.length;
    },
    cancelFrame: () => {},
    now: () => time,
  });
  scene.resize(800, 600, 1);
  const runFrames = () => {
    const due = frames;
    frames = [];
    for (const frame of due) frame(time);
  };
  return {
    scene,
    uploads,
    /** Draw a graph at these positions and let a frame show it. */
    show(graph: RenderGraph, xy: number[]) {
      scene.setGraph(
        graph,
        nodeRadii(graph),
        new Uint8Array(graph.count * 4),
        new Uint8Array(graph.count),
      );
      latest = Float32Array.from(xy);
      scene.positionsChanged();
      runFrames();
    },
    at(ms: number) {
      time = 1000 + ms;
      runFrames();
    },
    pending: () => frames.length,
    last: () => Array.from(uploads[uploads.length - 1]),
  };
}

const PARTIAL = graphOf(['artist:a', 'song:b'], [['song:b', 'artist:a']]);
const WHOLE = graphOf(
  ['artist:a', 'song:b', 'song:c'],
  [
    ['song:b', 'artist:a'],
    ['song:c', 'artist:a'],
  ],
);
// Ids sort a, b (and c), so the positions follow that order.
const GROWN = [0, 0, 100, 0];
const SETTLED = [400, 200, 600, 200, 500, 500];

describe('the scene’s glide', () => {
  it('carries each dot from where it was drawn to its settled place', () => {
    const t = harness();
    t.show(PARTIAL, GROWN);
    t.scene.glideNext(900);
    t.show(WHOLE, SETTLED);
    // As it sets off: the dots where the timelapse left them, the dot it
    // never showed already in its place.
    expect(t.last()).toEqual([0, 0, 100, 0, 500, 500]);
    t.at(450);
    // Halfway in time is halfway on the way (the ease is symmetric).
    expect(t.last()).toEqual([200, 100, 350, 100, 500, 500]);
    expect(t.scene.screenOf(0)).not.toBeNull();
    t.at(900);
    expect(t.last()).toEqual(SETTLED);
    // Done: no more frames asked for.
    t.at(1000);
    expect(t.pending()).toBe(0);
  });

  it('flies a camera the page sets meanwhile, but not the user’s', () => {
    const t = harness();
    t.show(PARTIAL, GROWN);
    t.scene.setAutoFit(false);
    const from = t.scene.camera();
    const kept: Camera = { x: 500, y: 300, zoom: 0.5 };
    t.scene.glideNext(900);
    t.show(WHOLE, SETTLED);
    t.scene.setCamera(kept, false);
    t.at(450);
    const mid = t.scene.camera();
    expect(mid.x).toBeGreaterThan(Math.min(from.x, kept.x));
    expect(mid.x).toBeLessThan(Math.max(from.x, kept.x));
    t.at(900);
    expect(t.scene.camera()).toEqual(kept);

    // After the glide a page's camera lands at once again, and the user's
    // always does.
    const elsewhere: Camera = { x: 10, y: 20, zoom: 1 };
    t.scene.setCamera(elsewhere, false);
    expect(t.scene.camera()).toEqual(elsewhere);
  });

  it('jumps under reduced motion', () => {
    const t = harness();
    t.show(PARTIAL, GROWN);
    t.scene.setReducedMotion(true);
    t.scene.glideNext(900);
    t.show(WHOLE, SETTLED);
    expect(t.last()).toEqual(SETTLED);
    // The frame the fitted camera asked for, and then quiet: no glide.
    t.at(16);
    expect(t.pending()).toBe(0);
    expect(t.last()).toEqual(SETTLED);
  });

  it('does nothing when nothing was drawn to glide from', () => {
    const t = harness();
    t.scene.glideNext(900);
    t.show(WHOLE, SETTLED);
    expect(t.last()).toEqual(SETTLED);
  });

  it('frames where the dots are going while they glide', () => {
    const t = harness();
    t.show(PARTIAL, GROWN);
    // The graph fits itself (no camera kept): it flies to the settled frame.
    t.scene.setAutoFit(true);
    t.scene.glideNext(900);
    t.show(WHOLE, SETTLED);
    t.at(900);
    const settledFit = t.scene.camera();
    expect(settledFit.x).toBeCloseTo(500, 5);
    expect(settledFit.y).toBeCloseTo(350, 5);
  });
});
