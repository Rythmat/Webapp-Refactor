import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';
import type { CortexWeb } from './buildWeb';

/**
 * Where each node sits. The simulation is seeded from the ids, so one web
 * always gives one picture, and it starts from where the nodes were last time:
 * old nodes are tethered there, so the map stays recognisable while new ones
 * find their place beside what they connect to and clusters can still form.
 * With nothing new, nothing moves at all. A fixed core holds the middle open,
 * so the web grows around it and never over it.
 */

export interface Point {
  x: number;
  y: number;
}

export type Positions = Readonly<Record<string, Point>>;

const LINK_DISTANCE = 64;
const CHARGE = -340;
const COLLIDE_RADIUS = 30;
/** Not a node on the web: only a place in the simulation, always at the origin. */
const CORE_ID = '\0core';
const CORE_CLEAR = 70;
/** How hard an old node holds its place. */
const TETHER = 0.35;
const TICKS_FRESH = 220;
const TICKS_GROWING = 90;
/** Ms of work per frame, so a big web never blocks the page. */
const SLICE_MS = 8;

interface SimNode extends SimulationNodeDatum {
  id: string;
  home?: Point;
}

const hash = (text: string): number => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/** A small seeded generator (mulberry32): d3-force's jiggle stays repeatable. */
const seededRandom = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const angleOf = (id: string) => (hash(id) / 4294967296) * Math.PI * 2;

/** Whether `web` has exactly the nodes `saved` placed. */
export const layoutIsCurrent = (web: CortexWeb, saved: Positions): boolean => {
  const ids = Object.keys(saved);
  return ids.length === web.nodes.length && web.nodes.every((n) => saved[n.id]);
};

const buildSimulation = (web: CortexWeb, saved: Positions, narrow: boolean) => {
  const neighbours = new Map<string, string[]>();
  const add = (a: string, b: string) => {
    neighbours.set(a, [...(neighbours.get(a) ?? []), b]);
  };
  for (const link of web.links) {
    add(link.source, link.target);
    add(link.target, link.source);
  }

  // Sorted, so the order things were done in can't change the picture.
  const nodes: SimNode[] = [...web.nodes]
    .sort((a, b) => (a.id < b.id ? -1 : 1))
    .map((node, index): SimNode => {
      const home = saved[node.id];
      if (home) return { id: node.id, x: home.x, y: home.y, home };
      // New: beside what it connects to, once those are placed, or on a
      // spiral out from the middle.
      const placed = (neighbours.get(node.id) ?? [])
        .map((id) => saved[id])
        .filter(Boolean);
      const angle = angleOf(node.id);
      if (placed.length > 0) {
        const cx = placed.reduce((sum, p) => sum + p.x, 0) / placed.length;
        const cy = placed.reduce((sum, p) => sum + p.y, 0) / placed.length;
        return {
          id: node.id,
          x: cx + Math.cos(angle) * LINK_DISTANCE,
          y: cy + Math.sin(angle) * LINK_DISTANCE,
        };
      }
      const radius = CORE_CLEAR + 30 + 14 * Math.sqrt(index);
      return {
        id: node.id,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      };
    });

  const links: SimulationLinkDatum<SimNode>[] = [...web.links]
    .sort((a, b) => (a.id < b.id ? -1 : 1))
    .map((link) => ({ source: link.source, target: link.target }));

  const isHeld = (node: SimNode) => node.home !== undefined;
  const isCore = (node: SimNode) => node.id === CORE_ID;
  const seed = web.nodes.length;
  nodes.push({ id: CORE_ID, x: 0, y: 0, fx: 0, fy: 0 });
  const simulation = forceSimulation(nodes)
    .randomSource(seededRandom(seed))
    .force(
      'link',
      forceLink<SimNode, SimulationLinkDatum<SimNode>>(links)
        .id((node) => node.id)
        .distance(LINK_DISTANCE)
        .strength(0.6),
    )
    .force(
      'charge',
      forceManyBody<SimNode>().strength((node) => (isCore(node) ? 0 : CHARGE)),
    )
    .force(
      'collide',
      forceCollide<SimNode>((node) =>
        isCore(node) ? CORE_CLEAR : COLLIDE_RADIUS,
      ),
    )
    // Holds the web together, far wider than tall: under the prompt bar the
    // panel is a wide strip, and a round web would only use its middle. On a
    // phone the panel is about square, and a strip would shrink to a sliver.
    .force(
      'x',
      forceX<SimNode>((node) => node.home?.x ?? 0).strength((node) =>
        isHeld(node) ? TETHER : narrow ? 0.07 : 0.02,
      ),
    )
    .force(
      'y',
      forceY<SimNode>((node) => node.home?.y ?? 0).strength((node) =>
        isHeld(node) ? TETHER : narrow ? 0.07 : 0.11,
      ),
    )
    .stop();

  const grown = Object.keys(saved).length > 0;
  return { simulation, nodes, ticks: grown ? TICKS_GROWING : TICKS_FRESH };
};

const result = (nodes: readonly SimNode[]): Positions => {
  const out: Record<string, Point> = {};
  for (const node of nodes) {
    if (node.id === CORE_ID) continue;
    out[node.id] = {
      x: Math.round((node.x ?? 0) * 10) / 10,
      y: Math.round((node.y ?? 0) * 10) / 10,
    };
  }
  return out;
};

/** The whole layout in one go. Pure; for tests and small webs. */
export const layoutWeb = (
  web: CortexWeb,
  saved: Positions = {},
  narrow = false,
): Positions => {
  if (layoutIsCurrent(web, saved)) return saved;
  const { simulation, nodes, ticks } = buildSimulation(web, saved, narrow);
  simulation.tick(ticks);
  return result(nodes);
};

/** The same, a slice per frame. The returned function cancels it. */
export const layoutWebInSlices = (
  web: CortexWeb,
  saved: Positions,
  done: (positions: Positions) => void,
  narrow = false,
): (() => void) => {
  if (layoutIsCurrent(web, saved)) {
    done(saved);
    return () => {};
  }
  const { simulation, nodes, ticks } = buildSimulation(web, saved, narrow);
  let left = ticks;
  let frame = 0;
  const step = () => {
    const until = performance.now() + SLICE_MS;
    while (left > 0 && performance.now() < until) {
      simulation.tick();
      left -= 1;
    }
    if (left > 0) frame = requestAnimationFrame(step);
    else done(result(nodes));
  };
  frame = requestAnimationFrame(step);
  return () => cancelAnimationFrame(frame);
};

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export const boundsOf = (positions: Positions): Bounds | null => {
  const points = Object.values(positions);
  if (points.length === 0) return null;
  return {
    minX: Math.min(...points.map((p) => p.x)),
    minY: Math.min(...points.map((p) => p.y)),
    maxX: Math.max(...points.map((p) => p.x)),
    maxY: Math.max(...points.map((p) => p.y)),
  };
};

export interface View {
  x: number;
  y: number;
  k: number;
}

export const MIN_ZOOM = 0.08;
export const MAX_ZOOM = 2.5;
/** A map of a few nodes isn't blown up to fill the panel. */
const MAX_FIT_ZOOM = 1.15;
/** Room round the edge for names: the panel's own header sits top left. */
const FIT_MARGIN_X = 112;
const FIT_MARGIN_X_NARROW = 24;
/** Under this, the map is on a phone. */
export const NARROW_PX = 640;
const FIT_MARGIN_BOTTOM = 24;
const FIT_MARGIN_TOP = 48;

/** Where the middle of a box this size sits, clear of the panel's header. */
export const fitCentre = (width: number, height: number): Point => ({
  x: width / 2,
  y: (height + FIT_MARGIN_TOP - FIT_MARGIN_BOTTOM) / 2,
});

/**
 * The view that shows the whole web in a box this size. With `around`, that
 * point of the web sits at the box's middle, whichever way the web has grown.
 */
export const fitView = (
  positions: Positions,
  width: number,
  height: number,
  around?: Point,
): View => {
  const bounds = boundsOf(positions);
  if (!bounds) return { x: width / 2, y: height / 2, k: 1 };
  const middle = around ?? {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  };
  const w = Math.max(
    1,
    around
      ? 2 * Math.max(bounds.maxX - around.x, around.x - bounds.minX)
      : bounds.maxX - bounds.minX,
  );
  const h = Math.max(
    1,
    around
      ? 2 * Math.max(bounds.maxY - around.y, around.y - bounds.minY)
      : bounds.maxY - bounds.minY,
  );
  const k = Math.max(
    MIN_ZOOM,
    Math.min(
      MAX_FIT_ZOOM,
      (width - (width < NARROW_PX ? FIT_MARGIN_X_NARROW : FIT_MARGIN_X) * 2) /
        w,
      (height - FIT_MARGIN_TOP - FIT_MARGIN_BOTTOM) / h,
    ),
  );
  const centre = fitCentre(width, height);
  return { k, x: centre.x - middle.x * k, y: centre.y - middle.y * k };
};
