/**
 * The Mind Map's force layout, run headless in node: Obsidian's forces as
 * configured, d3's own repulsion matched bit for bit and its collision to
 * rounding, the same
 * picture from the same seed, settling by about 320 ticks, drag pins,
 * reheats, warm starts that barely move, where new nodes land, and the
 * shape of a settled graph (linked pairs close, orphans in the outer ring).
 */
import { forceCollide, forceManyBody } from 'd3-force';
import { describe, expect, it } from 'vitest';
import {
  ALPHA,
  alignPositions,
  collideForce,
  createForceLayout,
  degreesOf,
  manyBodyForce,
  mulberry32,
  NEW_NODE_JITTER,
  placedFraction,
  placeNewNodes,
  RING_MARGIN,
  settleProgress,
  SIMULATION,
  startAlphaFor,
  STOCK_FORCES,
  type LayoutLink,
  type LayoutNode,
} from '../layout/forceLayout';
import { distance, median, radiiFrom, syntheticGraph } from './layoutFixtures';

const GRAPH = syntheticGraph({ nodes: 240, edges: 480, orphans: 24, seed: 7 });

const settled = (seed = 42) => {
  const layout = createForceLayout({ ...GRAPH, forces: STOCK_FORCES, seed });
  layout.settle();
  return layout;
};

/** The settled layout most tests start from, worked out once. */
const BASE = settled().positions();

/** Mean and largest distance each node moved between two layouts. */
const movement = (a: Float32Array, b: Float32Array) => {
  let total = 0;
  let most = 0;
  for (let i = 0; i < a.length / 2; i++) {
    const d = Math.hypot(a[2 * i] - b[2 * i], a[2 * i + 1] - b[2 * i + 1]);
    total += d;
    most = Math.max(most, d);
  }
  return { mean: total / (a.length / 2), most };
};

/** How far the farthest node sits from the origin. */
const cloudRadius = (xy: Float32Array) => {
  let most = 0;
  for (let i = 0; i < xy.length; i += 2)
    most = Math.max(most, Math.hypot(xy[i], xy[i + 1]));
  return most;
};

describe("Obsidian's simulation, as configured", () => {
  it('uses the forces and decay the plan takes from Obsidian', () => {
    const layout = createForceLayout({
      ...GRAPH,
      forces: STOCK_FORCES,
      seed: 1,
    });
    const sim = layout.simulation();
    expect(sim.velocityDecay()).toBeCloseTo(0.4, 12);
    expect(sim.alphaDecay()).toBe(0.0228);
    expect(sim.alphaMin()).toBe(0.001);
    expect(sim.alpha()).toBe(1);
    expect(sim.alphaTarget()).toBe(0);

    const charge = sim.force('charge') as unknown as ReturnType<
      typeof manyBodyForce
    >;
    expect(charge.settings).toEqual({
      strength: -1000,
      theta: 0.9,
      distanceMin: 30,
    });
    const collide = sim.force('collide') as unknown as ReturnType<
      typeof collideForce
    >;
    expect(collide.settings).toEqual({ radius: 60, strength: 0.5 });

    const node = { index: 0, x: 5, y: 5 } as LayoutNode;
    const centerX = sim.force('x') as unknown as {
      strength(): (d: LayoutNode) => number;
      x(): (d: LayoutNode) => number;
    };
    expect(centerX.strength()(node)).toBe(0.1);
    expect(centerX.x()(node)).toBe(0);
    const centerY = sim.force('y') as unknown as {
      strength(): (d: LayoutNode) => number;
    };
    expect(centerY.strength()(node)).toBe(0.1);
  });

  it('divides each link force by the smaller degree of its two ends', () => {
    const layout = createForceLayout({
      ...GRAPH,
      forces: STOCK_FORCES,
      seed: 1,
    });
    const link = layout.simulation().force('link') as unknown as {
      links(): LayoutLink[];
      strength(): (l: LayoutLink) => number;
      distance(): (l: LayoutLink) => number;
    };
    const degree = degreesOf(GRAPH.count, GRAPH.links);
    const links = link.links();
    expect(links).toHaveLength(GRAPH.links.length / 2);
    for (const l of links) {
      const a = (l.source as LayoutNode).index;
      const b = (l.target as LayoutNode).index;
      expect(link.strength()(l)).toBe(1 / Math.min(degree[a], degree[b]));
      expect(link.distance()(l)).toBe(250);
    }

    layout.setForces({ ...STOCK_FORCES, link: 0.5, linkDistance: 120 });
    const [first] = link.links();
    const a = (first.source as LayoutNode).index;
    const b = (first.target as LayoutNode).index;
    expect(link.strength()(first)).toBe(0.5 / Math.min(degree[a], degree[b]));
    expect(link.distance()(first)).toBe(120);
  });

  it('counts each link once, and drops self-links', () => {
    const links = Uint32Array.from([0, 1, 1, 2, 2, 2, 0, 2]);
    expect(Array.from(degreesOf(3, links))).toEqual([2, 2, 2]);
    const layout = createForceLayout({
      count: 3,
      links,
      forces: STOCK_FORCES,
      seed: 1,
    });
    const link = layout.simulation().force('link') as unknown as {
      links(): LayoutLink[];
    };
    expect(link.links()).toHaveLength(3);
  });

  it('refuses links to nodes that do not exist, and odd-length links', () => {
    const forces = STOCK_FORCES;
    expect(() =>
      createForceLayout({
        count: 2,
        links: Uint32Array.from([0, 2]),
        forces,
        seed: 1,
      }),
    ).toThrow(RangeError);
    expect(() =>
      createForceLayout({
        count: 2,
        links: Uint32Array.from([0]),
        forces,
        seed: 1,
      }),
    ).toThrow(RangeError);
    expect(() =>
      createForceLayout({
        count: 2,
        links: new Uint32Array(0),
        xy: new Float32Array(3),
        forces,
        seed: 1,
      }),
    ).toThrow(RangeError);
  });
});

describe("repulsion and collision match d3's forces", () => {
  /** Nodes with some stacked exactly on others and some on shared lines. */
  const nodesFor = (seed: number, n: number, spread: number) => {
    const random = mulberry32(seed);
    const nodes: LayoutNode[] = [];
    for (let i = 0; i < n; i++) {
      let x = (random() - 0.5) * spread;
      let y = (random() - 0.5) * spread;
      if (i % 17 === 5) {
        x = nodes[i - 1].x;
        y = nodes[i - 1].y;
      }
      if (i % 23 === 7) x = Math.round(x / 40) * 40;
      nodes.push({
        index: i,
        x,
        y,
        vx: (random() - 0.5) * 20,
        vy: (random() - 0.5) * 20,
      });
    }
    return nodes;
  };
  const velocities = (nodes: LayoutNode[]) =>
    nodes.flatMap((d) => [d.vx, d.vy]);

  it.each([
    [1, 60, 300],
    [2, 600, 2000],
    [3, 2500, 20000],
    [4, 200, 40],
  ])('seed %i: %i nodes over %i units', (seed, n, spread) => {
    const theirs = nodesFor(seed, n, spread);
    const ours = nodesFor(seed, n, spread);

    const d3Charge = forceManyBody<LayoutNode>()
      .strength(-1000)
      .theta(0.9)
      .distanceMin(30);
    d3Charge.initialize?.(theirs, mulberry32(9));
    const charge = manyBodyForce(-1000, 0.9, 30);
    charge.initialize(ours, mulberry32(9));
    d3Charge(0.7);
    charge(0.7);
    // Repulsion: bit for bit.
    expect(velocities(ours)).toEqual(velocities(theirs));

    const before = velocities(ours);
    const d3Collide = forceCollide<LayoutNode>(60).strength(0.5);
    d3Collide.initialize?.(theirs, mulberry32(5));
    const collide = collideForce(60, 0.5);
    collide.initialize(ours, mulberry32(5));
    d3Collide(0.7);
    collide(0.7);
    const mine = velocities(ours);
    const d3s = velocities(theirs);
    // Collision keeps momentum: every push has an equal and opposite one.
    const sum = (v: number[], from: number) =>
      v.reduce((total, x, k) => (k % 2 === from ? total + x : total), 0);
    for (const axis of [0, 1]) {
      expect(sum(mine, axis) - sum(before, axis)).toBeCloseTo(0, 6);
    }
    if (spread / Math.sqrt(n) >= 120) {
      // Spread out (as a layout is for most of its run), the grid finds
      // d3's pairs and pushes, summed in another order: equal to rounding.
      let worst = 0;
      for (let k = 0; k < mine.length; k++) {
        worst = Math.max(
          worst,
          Math.abs(mine[k] - d3s[k]) / Math.max(1, Math.abs(d3s[k])),
        );
      }
      expect(worst).toBeLessThan(1e-9);
    }
  });

  it('settles to the same shape as with d3’s own collision', () => {
    // In a dense knot, early pushes move nodes before their turn, and d3's
    // tree and the grid then test slightly different pairs; the settled
    // pictures still agree. (On the Atlas itself, 6,942 nodes: median
    // radius 5,140 against 5,153, link length 685 against 681.)
    const shape = (useD3: boolean) => {
      const layout = createForceLayout({
        ...GRAPH,
        forces: STOCK_FORCES,
        seed: 42,
      });
      if (useD3) {
        layout
          .simulation()
          .force('collide', forceCollide<LayoutNode>(60).strength(0.5));
      }
      layout.settle();
      const xy = layout.positions();
      const linkLengths: number[] = [];
      for (let k = 0; k < GRAPH.links.length; k += 2) {
        linkLengths.push(distance(xy, GRAPH.links[k], GRAPH.links[k + 1]));
      }
      return {
        core: median(radiiFrom(xy, GRAPH.core, GRAPH.core)),
        orphans: median(radiiFrom(xy, GRAPH.orphans, GRAPH.core)),
        links: median(linkLengths),
      };
    };
    const ours = shape(false);
    const theirs = shape(true);
    for (const key of ['core', 'orphans', 'links'] as const) {
      expect(Math.abs(ours[key] / theirs[key] - 1), key).toBeLessThan(0.05);
    }
  });

  it('pushes overlapping pairs apart as d3 does, and leaves the rest alone', () => {
    // Three in a row, 50 apart (every pair under 120, so all three touch),
    // and one far off.
    const row = (): LayoutNode[] =>
      [0, 50, 100, 5000].map((x, index) => ({
        index,
        x,
        y: index === 3 ? 5000 : 0,
        vx: 0,
        vy: 0,
      }));
    const ours = row();
    const theirs = row();
    const collide = collideForce(60, 0.5);
    collide.initialize(ours, mulberry32(1));
    collide(1);
    const d3Collide = forceCollide<LayoutNode>(60).strength(0.5);
    d3Collide.initialize?.(theirs, mulberry32(1));
    d3Collide(1);
    // Node 0 against 1: (120 − 50)/50 · ½ = 0.7, so 50 · 0.7 · ½ = 17.5,
    // plus 5 more against node 2, 100 away.
    expect(ours[0].vx).toBeCloseTo(-22.5, 12);
    for (let i = 0; i < 4; i++) {
      expect(ours[i].vx).toBeCloseTo(theirs[i].vx, 12);
    }
    // Momentum is kept: every push has an equal and opposite one.
    expect(ours.reduce((total, d) => total + d.vx, 0)).toBeCloseTo(0, 12);
    // On one line, both nudge the other axis by under a millionth.
    expect(ours.every((d) => Math.abs(d.vy) < 1e-6)).toBe(true);
    expect([ours[3].vx, ours[3].vy]).toEqual([0, 0]);
  });

  it('does nothing over no nodes, or nodes with no position', () => {
    const empty: LayoutNode[] = [];
    const charge = manyBodyForce(-1000, 0.9, 30);
    charge.initialize(empty, Math.random);
    expect(() => charge(1)).not.toThrow();
    const lost = [{ index: 0, x: NaN, y: NaN, vx: 0, vy: 0 }];
    const collide = collideForce(60, 0.5);
    collide.initialize(lost, Math.random);
    collide(1);
    expect(lost[0].vx).toBe(0);
  });
});

describe('seeded determinism and settling', () => {
  it('gives identical positions from the same input and seed after 300 ticks', () => {
    const a = createForceLayout({ ...GRAPH, forces: STOCK_FORCES, seed: 42 });
    const b = createForceLayout({ ...GRAPH, forces: STOCK_FORCES, seed: 42 });
    a.tick(300);
    b.tick(300);
    expect(Array.from(a.positions())).toEqual(Array.from(b.positions()));
  });

  it('places new nodes from the seed, so another seed lands them elsewhere', () => {
    const xy = BASE.slice();
    for (let i = 0; i < GRAPH.count; i += 10) {
      xy[2 * i] = NaN;
      xy[2 * i + 1] = NaN;
    }
    const run = (seed: number) => {
      const layout = createForceLayout({
        ...GRAPH,
        xy,
        forces: STOCK_FORCES,
        seed,
      });
      layout.tick(300);
      return Array.from(layout.positions());
    };
    expect(run(7)).toEqual(run(7));
    expect(run(7)).not.toEqual(run(8));
  });

  it('settles from a cold start by about 320 ticks, and is still by then', () => {
    const layout = createForceLayout({
      ...GRAPH,
      forces: STOCK_FORCES,
      seed: 42,
    });
    const ticks = layout.settle();
    expect(ticks).toBeGreaterThanOrEqual(290);
    expect(ticks).toBeLessThanOrEqual(320);
    expect(layout.isSettled()).toBe(true);
    expect(layout.alpha()).toBeLessThan(SIMULATION.alphaMin);

    const before = layout.positions();
    layout.tick();
    // One more tick moves a node by well under a pixel on average.
    expect(movement(before, layout.positions()).mean).toBeLessThan(0.05);
  });

  it('settles an empty graph at once', () => {
    const layout = createForceLayout({
      count: 0,
      links: new Uint32Array(0),
      forces: STOCK_FORCES,
      seed: 1,
    });
    expect(layout.isSettled()).toBe(true);
    expect(layout.settle()).toBe(0);
    expect(layout.positions()).toHaveLength(0);
  });
});

describe('the shape of a settled graph', () => {
  it('ends linked pairs much closer than unlinked ones', () => {
    const linked: number[] = [];
    const pairs = new Set<string>();
    for (let k = 0; k < GRAPH.links.length; k += 2) {
      linked.push(distance(BASE, GRAPH.links[k], GRAPH.links[k + 1]));
      pairs.add(`${GRAPH.links[k]}-${GRAPH.links[k + 1]}`);
      pairs.add(`${GRAPH.links[k + 1]}-${GRAPH.links[k]}`);
    }
    const unlinked: number[] = [];
    for (let a = 0; a < GRAPH.count; a += 3) {
      for (let b = a + 1; b < GRAPH.count; b += 7) {
        if (!pairs.has(`${a}-${b}`)) unlinked.push(distance(BASE, a, b));
      }
    }
    const mean = (values: number[]) =>
      values.reduce((sum, v) => sum + v, 0) / values.length;
    expect(mean(linked)).toBeLessThan(mean(unlinked) * 0.5);
  });

  it("puts every orphan outside the linked core's median radius", () => {
    const core = radiiFrom(BASE, GRAPH.core, GRAPH.core);
    const orphans = radiiFrom(BASE, GRAPH.orphans, GRAPH.core);
    const coreMedian = median(core);
    expect(orphans.every((r) => r > coreMedian)).toBe(true);
    expect(median(orphans)).toBeGreaterThan(median(core) * 1.3);
  });
});

describe('dragging a node', () => {
  it('holds the node at the pointer and keeps the layout warm until let go', () => {
    const layout = createForceLayout({
      ...GRAPH,
      xy: BASE,
      forces: STOCK_FORCES,
      seed: 42,
    });
    layout.settle();
    expect(layout.isSettled()).toBe(true);

    const dragged = GRAPH.links[0];
    const neighbour = GRAPH.links[1];
    const before = distance(layout.positions(), neighbour, dragged);
    expect(layout.alpha()).toBeLessThan(0.01);
    layout.pin(dragged, 3000, -2000);
    // Held from rest, it is hot at once, as Obsidian's drag is: alpha is
    // 0.3 straight after the press, not easing up from rest.
    expect(layout.isSettled()).toBe(false);
    expect(layout.alpha()).toBeGreaterThanOrEqual(ALPHA.drag);
    expect(layout.alphaTarget()).toBe(ALPHA.drag);
    expect(layout.pinnedCount()).toBe(1);
    layout.tick(60);
    const held = layout.positions();
    expect(held[2 * dragged]).toBe(3000);
    expect(held[2 * dragged + 1]).toBe(-2000);
    expect(layout.alpha()).toBeGreaterThan(0.1);
    // While held, the layout never settles.
    expect(layout.settle(400)).toBe(400);
    expect(layout.isSettled()).toBe(false);
    // Its neighbour has been pulled along toward it.
    const pulled = distance(layout.positions(), neighbour, dragged);
    const startedAt = Math.hypot(
      BASE[2 * neighbour] - 3000,
      BASE[2 * neighbour + 1] + 2000,
    );
    expect(pulled).toBeLessThan(startedAt - 500);
    expect(before).toBeLessThan(startedAt);

    layout.unpin(dragged);
    expect(layout.alphaTarget()).toBe(0);
    expect(layout.pinnedCount()).toBe(0);
    const released = layout.settle();
    expect(released).toBeGreaterThan(0);
    expect(released).toBeLessThanOrEqual(320);
    expect(layout.isSettled()).toBe(true);
    // Let go, it drifts back toward the graph.
    const after = layout.positions();
    expect(
      Math.hypot(after[2 * dragged] - 3000, after[2 * dragged + 1] + 2000),
    ).toBeGreaterThan(100);
  });

  it('raises alpha back to 0.3 on every move of a held node', () => {
    const layout = createForceLayout({
      ...GRAPH,
      xy: BASE,
      forces: STOCK_FORCES,
      seed: 7,
    });
    layout.settle();
    layout.pin(3, 100, 100);
    expect(layout.alpha()).toBeGreaterThanOrEqual(ALPHA.drag);
    // Each tick cools it a little toward the target …
    layout.tick(5);
    // … and the next move of the pointer heats it again, never cooler.
    const hotter = Math.max(layout.alpha(), ALPHA.drag);
    layout.pin(3, 120, 90);
    expect(layout.alpha()).toBe(hotter);
    // A run already hotter than the drag (a cold start) is left as it is.
    const cold = createForceLayout({ ...GRAPH, forces: STOCK_FORCES, seed: 7 });
    expect(cold.alpha()).toBe(ALPHA.cold);
    cold.pin(3, 0, 0);
    expect(cold.alpha()).toBe(ALPHA.cold);
  });

  it('keeps the drag target while any node is still held', () => {
    const layout = createForceLayout({
      ...GRAPH,
      xy: BASE,
      forces: STOCK_FORCES,
      seed: 1,
    });
    layout.pin(1, 0, 0);
    layout.pin(2, 10, 10);
    layout.unpin(1);
    expect(layout.alphaTarget()).toBe(ALPHA.drag);
    layout.unpin(2);
    expect(layout.alphaTarget()).toBe(0);
    expect(() => layout.pin(GRAPH.count, 0, 0)).toThrow(RangeError);
  });
});

describe('reheats', () => {
  it('reheats to 0.3 on a slider change and settles again, wider for a stronger repel', () => {
    const layout = createForceLayout({
      ...GRAPH,
      xy: BASE,
      forces: STOCK_FORCES,
      seed: 42,
    });
    layout.settle();
    const radiusBefore = cloudRadius(layout.positions());
    layout.setForces({ ...STOCK_FORCES, repel: -2000 });
    expect(layout.alpha()).toBe(ALPHA.forces);
    expect(layout.isSettled()).toBe(false);
    const ticks = layout.settle();
    // From 0.3 down to the minimum is about 248 ticks.
    expect(ticks).toBeGreaterThanOrEqual(240);
    expect(ticks).toBeLessThanOrEqual(260);
    expect(cloudRadius(layout.positions())).toBeGreaterThan(radiusBefore * 1.1);
  });

  it('never cools a simulation that is hotter than the reheat', () => {
    const layout = createForceLayout({
      ...GRAPH,
      forces: STOCK_FORCES,
      seed: 42,
    });
    expect(layout.alpha()).toBe(ALPHA.cold);
    layout.setForces({ ...STOCK_FORCES, center: 0.2 });
    expect(layout.alpha()).toBe(ALPHA.cold);
    layout.reheat(0.1);
    expect(layout.alpha()).toBe(ALPHA.cold);
  });

  it('reheats to 0.1 on a structural change, keeping the positions nodes had', () => {
    const layout = createForceLayout({
      ...GRAPH,
      xy: BASE,
      forces: STOCK_FORCES,
      seed: 42,
    });
    layout.settle();
    const was = layout.positions();
    const count = GRAPH.count + 1;
    const links = Uint32Array.from([...GRAPH.links, GRAPH.count, 3]);
    const xy = new Float32Array(count * 2).fill(NaN);
    xy.set(was);
    layout.setGraph({ count, links, xy });
    expect(layout.count).toBe(count);
    expect(layout.alpha()).toBe(ALPHA.structure);
    expect(layout.pinnedCount()).toBe(0);
    expect(layout.alphaTarget()).toBe(0);
    const now = layout.positions();
    expect(Array.from(now.subarray(0, was.length))).toEqual(Array.from(was));
    expect(distance(now, GRAPH.count, 3)).toBeLessThanOrEqual(
      NEW_NODE_JITTER + 0.01,
    );
    // From 0.1 down to the minimum is about 200 ticks.
    const ticks = layout.settle();
    expect(ticks).toBeLessThanOrEqual(205);
  });
});

describe('a structural change during a drag', () => {
  it('lets go of the held node and keeps the drag’s heat', () => {
    const layout = createForceLayout({
      ...GRAPH,
      xy: BASE,
      forces: STOCK_FORCES,
      seed: 42,
    });
    layout.settle();
    layout.pin(5, 0, 0);
    const count = GRAPH.count + 1;
    const links = Uint32Array.from([...GRAPH.links, GRAPH.count, 3]);
    const xy = new Float32Array(count * 2).fill(NaN);
    xy.set(layout.positions());
    layout.setGraph({ count, links, xy });
    expect(layout.pinnedCount()).toBe(0);
    expect(layout.alphaTarget()).toBe(0);
    // Never cooled by the change: it was hotter than a structural reheat.
    expect(layout.alpha()).toBe(ALPHA.drag);
  });
});

describe('a refused structural change', () => {
  it('leaves the graph, its positions and its drag as they were', () => {
    const layout = createForceLayout({
      ...GRAPH,
      xy: BASE,
      forces: STOCK_FORCES,
      seed: 42,
    });
    layout.pin(2, 50, 60);
    expect(() =>
      layout.setGraph({ count: 2, links: Uint32Array.from([0, 7]) }),
    ).toThrow(RangeError);
    expect(layout.count).toBe(GRAPH.count);
    expect(layout.pinnedCount()).toBe(1);
    expect(layout.alphaTarget()).toBe(ALPHA.drag);
    layout.tick();
    const p = layout.positions();
    expect([p[4], p[5]]).toEqual([50, 60]);
  });
});

describe('warm starts', () => {
  it('starts at alpha 0.05 from cached positions and barely moves', () => {
    const layout = createForceLayout({
      ...GRAPH,
      xy: BASE,
      forces: STOCK_FORCES,
      seed: 42,
    });
    expect(layout.alpha()).toBe(ALPHA.warm);
    const ticks = layout.settle();
    expect(ticks).toBeLessThanOrEqual(175);
    const moved = movement(BASE, layout.positions());
    const radius = cloudRadius(BASE);
    // On average a node moves under 2% of the graph's radius.
    expect(moved.mean).toBeLessThan(radius * 0.02);
    expect(moved.most).toBeLessThan(radius * 0.1);
  });

  it('says how far the furthest node moved on the last tick, and can end the run', () => {
    const layout = createForceLayout({
      ...GRAPH,
      xy: BASE,
      forces: STOCK_FORCES,
      seed: 42,
    });
    const before = layout.positions();
    layout.tick();
    const after = layout.positions();
    // The last tick's largest move is what lastMove reports (to float32).
    expect(layout.lastMove()).toBeCloseTo(movement(before, after).most, 3);
    expect(layout.isSettled()).toBe(false);
    layout.rest();
    expect(layout.isSettled()).toBe(true);
  });

  it('never ends a run while a node is held', () => {
    const layout = createForceLayout({
      ...GRAPH,
      xy: BASE,
      forces: STOCK_FORCES,
      seed: 42,
    });
    layout.pin(0, 10, 10);
    layout.tick();
    layout.rest();
    expect(layout.isSettled()).toBe(false);
    layout.unpin(0);
    layout.rest();
    expect(layout.isSettled()).toBe(true);
  });

  it('starts warm only when at least 95% of the nodes have a position', () => {
    expect(startAlphaFor(0.95)).toBe(ALPHA.warm);
    expect(startAlphaFor(1)).toBe(ALPHA.warm);
    expect(startAlphaFor(0.9499)).toBe(ALPHA.cold);
    expect(startAlphaFor(0)).toBe(ALPHA.cold);

    const xy = BASE.slice();
    for (let i = 0; i < 24; i++) xy[2 * i] = NaN; // 90% placed
    expect(placedFraction(xy, GRAPH.count)).toBeCloseTo(0.9, 5);
    expect(
      createForceLayout({
        ...GRAPH,
        xy,
        forces: STOCK_FORCES,
        seed: 1,
      }).alpha(),
    ).toBe(ALPHA.cold);
    xy.set(BASE);
    for (let i = 0; i < 12; i++) xy[2 * i] = NaN; // 95% placed
    expect(
      createForceLayout({
        ...GRAPH,
        xy,
        forces: STOCK_FORCES,
        seed: 1,
      }).alpha(),
    ).toBe(ALPHA.warm);
  });

  it('lines positions up by id, and can centre them on one node', () => {
    const from = ['a', 'b', 'c'];
    const xy = Float32Array.from([10, 20, 30, 40, NaN, 0]);
    const plain = alignPositions(from, xy, ['c', 'b', 'z', 'a']);
    expect(plain.placed).toBe(2);
    expect(Array.from(plain.xy)).toEqual([NaN, NaN, 30, 40, NaN, NaN, 10, 20]);
    const centred = alignPositions(from, xy, ['a', 'b'], { center: 'b' });
    expect(Array.from(centred.xy)).toEqual([-20, -20, 0, 0]);
  });

  it('measures how far a converging layout has come', () => {
    expect(settleProgress(1, 1)).toBe(0);
    expect(settleProgress(1, 0.001)).toBe(1);
    expect(settleProgress(1, Math.sqrt(0.001))).toBeCloseTo(0.5, 6);
    expect(settleProgress(0.0005, 0.0004)).toBe(1);
  });
});

describe('where new nodes land', () => {
  // Nodes 0–3 are placed; 4 links to 1 and 2; 5 links only to 4; 6 links to
  // nothing; 7 and 8 link only to each other.
  const links = Uint32Array.from([0, 1, 1, 2, 2, 3, 4, 1, 4, 2, 5, 4, 7, 8]);
  const xy = Float32Array.from([
    0,
    0,
    100,
    0,
    100,
    100,
    -300,
    400,
    NaN,
    NaN,
    NaN,
    NaN,
    NaN,
    NaN,
    NaN,
    NaN,
    NaN,
    NaN,
  ]);
  const out = placeNewNodes(9, links, xy, mulberry32(3));
  const at = (i: number) => [out[2 * i], out[2 * i + 1]] as const;
  const gap = (a: readonly number[], b: readonly number[]) =>
    Math.hypot(a[0] - b[0], a[1] - b[1]);
  const ring = 500 + RING_MARGIN; // the farthest placed node is 500 out

  it('keeps placed nodes where they were', () => {
    expect(at(0)).toEqual([0, 0]);
    expect(at(3)).toEqual([-300, 400]);
  });

  it("starts a new node near its placed neighbours' mean", () => {
    expect(gap(at(4), [100, 50])).toBeLessThanOrEqual(NEW_NODE_JITTER);
  });

  it('grows a chain of new nodes outward from the placed graph', () => {
    expect(gap(at(5), at(4))).toBeLessThanOrEqual(NEW_NODE_JITTER);
  });

  it('starts a new node with no placed neighbour on the ring outside the cloud', () => {
    expect(Math.hypot(...at(6))).toBeCloseTo(ring, 6);
    expect(Math.hypot(...at(7))).toBeCloseTo(ring, 6);
    // Spaced around the ring rather than stacked.
    expect(gap(at(6), at(7))).toBeGreaterThan(100);
    // A new group grows from its first node on the ring.
    expect(gap(at(8), at(7))).toBeLessThanOrEqual(NEW_NODE_JITTER);
  });

  it('leaves a cold start to d3, which lays nodes on its spiral', () => {
    const cold = placeNewNodes(
      3,
      links.subarray(0, 4),
      undefined,
      mulberry32(1),
    );
    expect(Array.from(cold).every(Number.isNaN)).toBe(true);
    const layout = createForceLayout({
      count: 3,
      links: links.subarray(0, 4),
      forces: STOCK_FORCES,
      seed: 1,
    });
    expect(Array.from(layout.positions()).every(Number.isFinite)).toBe(true);
  });

  it('places them the same way inside a layout', () => {
    const layout = createForceLayout({
      count: 9,
      links,
      xy,
      forces: STOCK_FORCES,
      seed: 3,
    });
    const p = layout.positions();
    expect(Math.hypot(p[12], p[13])).toBeCloseTo(ring, 2);
    expect(Math.hypot(p[8] - 100, p[9] - 50)).toBeLessThanOrEqual(
      NEW_NODE_JITTER + 0.01,
    );
  });
});
