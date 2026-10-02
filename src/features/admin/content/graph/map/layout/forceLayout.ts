/**
 * The Mind Map's force layout: Obsidian's graph simulation, rebuilt on
 * d3-force.
 *
 * Obsidian runs d3-force in a Web Worker with a fixed set of forces, and its
 * settings sliders only change their strengths. This module builds the same
 * simulation over index-addressed typed arrays, so it runs unchanged in the
 * layout worker, in the inline engine the client falls back to, and in node
 * for the tests. It never touches React, the DOM or the content store.
 *
 * The forces, taken from Obsidian as they are:
 * - a pull toward the origin, `forceX(0)` and `forceY(0)` at the centre
 *   strength the settings map their slider to (0.1 by default);
 * - links of rest length 250 whose strength is the link force divided by the
 *   smaller of the two ends' degrees, so hubs do not drag their leaves in;
 * - many-body repulsion of −1000 with Barnes–Hut theta 0.9 and a minimum
 *   distance of 30;
 * - collision at radius 60 and strength 0.5;
 * - velocity decay 0.4, alpha decay 0.0228 (300 ticks from 1 down to the
 *   alpha minimum of 0.001), and a seeded random source, so the same input
 *   always gives the same picture.
 *
 * The layout is ticked by hand: d3's own timer is stopped as soon as the
 * simulation is built, and whoever drives it (the worker or the inline
 * engine) decides when to tick and when to post positions.
 *
 * Repulsion and collision do not use d3's own forces, which walk the
 * quadtree through an object per visited quad: at 8,000 nodes and 34,000
 * links that costs about 64 ms a tick in node, against about 10 ms here.
 * Repulsion runs the same arithmetic over a quadtree kept in typed arrays,
 * built with the same extent, splits and order as d3-quadtree's and visited
 * in the same order, so it gives bit-for-bit the velocities d3's force
 * gives. Collision, where every node has the same radius, files nodes in a
 * plain grid instead of a tree and finds the same pairs at well under half
 * the cost; it sums each node's pushes in another order, so it matches d3's
 * to rounding rather than to the bit. The tests hold both to that.
 */
import {
  forceLink,
  forceSimulation,
  forceX,
  forceY,
  type ForceLink,
  type ForceX,
  type ForceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';

// ── Constants ───────────────────────────────────────────────────────────────

/**
 * The simulation's force strengths after the settings sliders have been
 * mapped (the mapping itself lives with the settings). These are the values
 * d3 receives.
 */
export interface LayoutForces {
  /** Strength of the pull toward the origin on each axis. */
  center: number;
  /** Many-body strength; negative, so nodes push each other apart. */
  repel: number;
  /** Link force, divided per link by the smaller of its ends' degrees. */
  link: number;
  /** A link's rest length, in world units. */
  linkDistance: number;
}

/** Obsidian's stock forces, as the sliders' defaults map them. */
export const STOCK_FORCES: Readonly<LayoutForces> = Object.freeze({
  center: 0.1,
  repel: -1000,
  link: 1,
  linkDistance: 250,
});

/** The parts of Obsidian's simulation the sliders never change. */
export const SIMULATION = Object.freeze({
  repelTheta: 0.9,
  repelDistanceMin: 30,
  collideRadius: 60,
  collideStrength: 0.5,
  velocityDecay: 0.4,
  alphaDecay: 0.0228,
  alphaMin: 0.001,
});

/**
 * How hot the simulation runs after each kind of change. A cold start begins
 * at 1; a slider change reheats to 0.3; a save that changes the graph's
 * structure reheats to 0.1; a warm start from cached positions begins at
 * 0.05, so reopening the map looks still. Holding a node raises alpha to
 * at least 0.3 at once, on the press and on every move of the pointer, as
 * Obsidian's graph does, so its neighbours follow from the first pixel; it
 * stays aimed at 0.3 while the node is held and cools toward 0 once it is
 * let go.
 */
export const ALPHA = Object.freeze({
  cold: 1,
  forces: 0.3,
  structure: 0.1,
  warm: 0.05,
  drag: 0.3,
});

/** The share of nodes with a known position that makes a start "warm". */
export const WARM_START_COVERAGE = 0.95;

/** How far a new node may land from its neighbours' mean position. */
export const NEW_NODE_JITTER = 30;

/** How far beyond the placed cloud a new node with no placed neighbour lands. */
export const RING_MARGIN = 200;

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

// ── Random numbers ──────────────────────────────────────────────────────────

/**
 * A small seeded generator (mulberry32) giving numbers in [0, 1). The layout
 * hands it to d3 as its random source and uses its own copy for placing new
 * nodes, so a seed always reproduces the same layout.
 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Graph input ─────────────────────────────────────────────────────────────

/** A graph as the layout sees it: nodes are numbered 0…count−1. */
export interface LayoutGraph {
  count: number;
  /** Links as pairs of node numbers: a0, b0, a1, b1, … */
  links: Uint32Array;
  /**
   * Starting positions as x0, y0, x1, y1, …; NaN marks a node with no
   * position yet. Left out, every node starts unplaced.
   */
  xy?: ArrayLike<number>;
}

const isPlaced = (xy: ArrayLike<number>, i: number) =>
  Number.isFinite(xy[2 * i]) && Number.isFinite(xy[2 * i + 1]);

/** The share of `count` nodes whose position in `xy` is known. */
export function placedFraction(
  xy: ArrayLike<number> | undefined,
  count: number,
): number {
  if (!xy || count === 0) return 0;
  let placed = 0;
  for (let i = 0; i < count; i++) if (isPlaced(xy, i)) placed += 1;
  return placed / count;
}

/**
 * The alpha to start at, given the share of nodes that already have a
 * position: a warm start when nearly all of them do, a cold one otherwise.
 */
export function startAlphaFor(coverage: number): number {
  return coverage >= WARM_START_COVERAGE ? ALPHA.warm : ALPHA.cold;
}

/**
 * How far a settling simulation has come, from 0 when it was at `fromAlpha`
 * to 1 at the alpha minimum. Alpha decays geometrically, so this grows
 * evenly with the ticks run.
 */
export function settleProgress(fromAlpha: number, alpha: number): number {
  if (!(fromAlpha > SIMULATION.alphaMin) || !(alpha > 0)) return 1;
  const done =
    Math.log(fromAlpha / alpha) / Math.log(fromAlpha / SIMULATION.alphaMin);
  return Math.min(1, Math.max(0, done));
}

/**
 * Positions for `toIds`, read by id from an earlier layout (`fromIds` with
 * `fromXy`); NaN where an id had no finite position. With `center`, every
 * position is shifted so that node sits at the origin, which is how a local
 * graph starts from the global graph's positions.
 */
export function alignPositions(
  fromIds: readonly string[],
  fromXy: ArrayLike<number>,
  toIds: readonly string[],
  options: { center?: string } = {},
): { xy: Float32Array; placed: number } {
  const indexOf = new Map<string, number>();
  for (let i = 0; i < fromIds.length; i++) indexOf.set(fromIds[i], i);
  let dx = 0;
  let dy = 0;
  if (options.center !== undefined) {
    const c = indexOf.get(options.center);
    if (c !== undefined && isPlaced(fromXy, c)) {
      dx = -fromXy[2 * c];
      dy = -fromXy[2 * c + 1];
    }
  }
  const xy = new Float32Array(toIds.length * 2).fill(NaN);
  let placed = 0;
  for (let k = 0; k < toIds.length; k++) {
    const i = indexOf.get(toIds[k]);
    if (i === undefined || !isPlaced(fromXy, i)) continue;
    xy[2 * k] = fromXy[2 * i] + dx;
    xy[2 * k + 1] = fromXy[2 * i + 1] + dy;
    placed += 1;
  }
  return { xy, placed };
}

/** Each node's neighbours, packed: neighbours of i are targets[offsets[i]…offsets[i+1]). */
interface Adjacency {
  offsets: Uint32Array;
  targets: Uint32Array;
}

function adjacencyOf(count: number, links: Uint32Array): Adjacency {
  const offsets = new Uint32Array(count + 1);
  for (let k = 0; k < links.length; k += 2) {
    if (links[k] === links[k + 1]) continue;
    offsets[links[k] + 1] += 1;
    offsets[links[k + 1] + 1] += 1;
  }
  for (let i = 0; i < count; i++) offsets[i + 1] += offsets[i];
  const fill = offsets.slice(0, count);
  const targets = new Uint32Array(offsets[count]);
  for (let k = 0; k < links.length; k += 2) {
    const a = links[k];
    const b = links[k + 1];
    if (a === b) continue;
    targets[fill[a]++] = b;
    targets[fill[b]++] = a;
  }
  return { offsets, targets };
}

/**
 * Starting positions for every node. Nodes with a position keep it. A new
 * node next to placed ones starts at their mean position plus a little
 * seeded jitter, working outward wave by wave so a chain of new nodes grows
 * from the placed graph. A new group with no placed node at all starts on a
 * ring just outside the placed cloud (its radius plus 200), spaced by the
 * golden angle, and grows from there.
 *
 * When no node has a position (a cold start) the result is all NaN, and d3
 * lays the nodes out on its own phyllotaxis spiral.
 */
export function placeNewNodes(
  count: number,
  links: Uint32Array,
  xy: ArrayLike<number> | undefined,
  random: () => number,
): Float64Array {
  const out = new Float64Array(count * 2).fill(NaN);
  const placed = new Uint8Array(count);
  let remaining = count;
  let cloud = 0;
  if (xy) {
    for (let i = 0; i < count; i++) {
      if (!isPlaced(xy, i)) continue;
      out[2 * i] = xy[2 * i];
      out[2 * i + 1] = xy[2 * i + 1];
      placed[i] = 1;
      remaining -= 1;
      cloud = Math.max(cloud, Math.hypot(out[2 * i], out[2 * i + 1]));
    }
  }
  if (remaining === 0 || remaining === count) return out;

  const { offsets, targets } = adjacencyOf(count, links);
  const ring = cloud + RING_MARGIN;
  const ringStart = random() * 2 * Math.PI;
  let ringSlot = 0;
  // A stamp per node keeps each wave's frontier free of repeats.
  const seen = new Uint32Array(count);
  let stamp = 0;

  const unplacedNeighbours = (from: Iterable<number>) => {
    stamp += 1;
    const next: number[] = [];
    for (const i of from) {
      for (let e = offsets[i]; e < offsets[i + 1]; e++) {
        const j = targets[e];
        if (placed[j] || seen[j] === stamp) continue;
        seen[j] = stamp;
        next.push(j);
      }
    }
    return next;
  };

  const startPlaced: number[] = [];
  for (let i = 0; i < count; i++) if (placed[i]) startPlaced.push(i);
  let frontier = unplacedNeighbours(startPlaced);
  let scan = 0;

  while (remaining > 0) {
    while (frontier.length > 0) {
      // A wave reads only nodes placed before it, then lands all at once.
      const wave: number[] = [];
      for (const i of frontier) {
        let sx = 0;
        let sy = 0;
        let n = 0;
        for (let e = offsets[i]; e < offsets[i + 1]; e++) {
          const j = targets[e];
          if (!placed[j]) continue;
          sx += out[2 * j];
          sy += out[2 * j + 1];
          n += 1;
        }
        if (n === 0) continue;
        const angle = random() * 2 * Math.PI;
        const reach = NEW_NODE_JITTER * Math.sqrt(random());
        wave.push(
          i,
          sx / n + reach * Math.cos(angle),
          sy / n + reach * Math.sin(angle),
        );
      }
      const landed: number[] = [];
      for (let w = 0; w < wave.length; w += 3) {
        const i = wave[w];
        out[2 * i] = wave[w + 1];
        out[2 * i + 1] = wave[w + 2];
        placed[i] = 1;
        remaining -= 1;
        landed.push(i);
      }
      frontier = unplacedNeighbours(landed);
    }
    if (remaining === 0) break;
    while (placed[scan]) scan += 1;
    const angle = ringStart + ringSlot * GOLDEN_ANGLE;
    ringSlot += 1;
    out[2 * scan] = ring * Math.cos(angle);
    out[2 * scan + 1] = ring * Math.sin(angle);
    placed[scan] = 1;
    remaining -= 1;
    frontier = unplacedNeighbours([scan]);
  }
  return out;
}

// ── Repulsion over a flat quadtree ──────────────────────────────────────────

/**
 * A quadtree held in typed arrays and rebuilt on every use, as d3's forces
 * rebuild theirs. It is built exactly as d3-quadtree builds one from the
 * same points: the extent starts at the floor of the smallest coordinates
 * and doubles until it covers the largest, a leaf splits until the old and
 * new points part, and a point landing exactly on another joins the front
 * of that leaf's chain. Points with a non-finite coordinate are left out
 * (d3 leaves out NaN, and would never finish covering an infinite one).
 *
 * Each quad's bounds are recorded as it is placed, computed exactly as
 * d3-quadtree's visit computes them on the way down (halving with
 * (x0 + x1) / 2), so a walk reads them instead of carrying them.
 */
class FlatQuadtree {
  /** Four child quads per quad; -1 where a quadrant is empty. */
  child = new Int32Array(64);
  /** A leaf's first point, or -1 for an internal quad. */
  head = new Int32Array(16);
  /** Each quad's x0, y0, x1, y1. */
  bounds = new Float64Array(64);
  /** The next point at exactly the same place, or -1. */
  next = new Int32Array(0);
  size = 0;
  root = -1;
  /** How many levels below the root the deepest quad sits. */
  depth = 0;
  x0 = NaN;
  y0 = NaN;
  x1 = NaN;
  y1 = NaN;

  private quad(
    first: number,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
  ): number {
    if (this.size === this.head.length) {
      const head = new Int32Array(this.head.length * 2);
      head.set(this.head);
      this.head = head;
      const child = new Int32Array(this.child.length * 2);
      child.set(this.child);
      this.child = child;
      const bounds = new Float64Array(this.bounds.length * 2);
      bounds.set(this.bounds);
      this.bounds = bounds;
    }
    const q = this.size;
    this.size += 1;
    this.head[q] = first;
    this.child.fill(-1, 4 * q, 4 * q + 4);
    this.setBounds(q, x0, y0, x1, y1);
    return q;
  }

  private setBounds(q: number, x0: number, y0: number, x1: number, y1: number) {
    const b = 4 * q;
    this.bounds[b] = x0;
    this.bounds[b + 1] = y0;
    this.bounds[b + 2] = x1;
    this.bounds[b + 3] = y1;
  }

  build(px: Float64Array, py: Float64Array, n: number) {
    this.size = 0;
    this.root = -1;
    this.depth = 0;
    if (this.next.length < n) this.next = new Int32Array(n);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let p = 0; p < n; p++) {
      const x = px[p];
      const y = py[p];
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    if (minX > maxX || minY > maxY) {
      this.x0 = this.y0 = this.x1 = this.y1 = NaN;
      return;
    }
    // d3's cover(min) then cover(max): an integer corner, then doubling.
    // The largest point is never below the corner, so only the first of
    // d3's four doubling directions can apply.
    const x0 = Math.floor(minX);
    const y0 = Math.floor(minY);
    let x1 = x0 + 1;
    let y1 = y0 + 1;
    let z = 1;
    while (x0 > maxX || maxX >= x1 || y0 > maxY || maxY >= y1) {
      z *= 2;
      x1 = x0 + z;
      y1 = y0 + z;
    }
    this.x0 = x0;
    this.y0 = y0;
    this.x1 = x1;
    this.y1 = y1;
    for (let p = 0; p < n; p++) {
      const x = px[p];
      const y = py[p];
      if (Number.isFinite(x) && Number.isFinite(y))
        this.insert(p, x, y, px, py);
    }
  }

  private insert(
    p: number,
    x: number,
    y: number,
    px: Float64Array,
    py: Float64Array,
  ) {
    this.next[p] = -1;
    let node = this.root;
    let x0 = this.x0;
    let y0 = this.y0;
    let x1 = this.x1;
    let y1 = this.y1;
    if (node < 0) {
      this.root = this.quad(p, x0, y0, x1, y1);
      return;
    }
    let xm = 0;
    let ym = 0;
    let parent = -1;
    let i = 0;
    let level = 0;
    while (this.head[node] < 0) {
      xm = (x0 + x1) / 2;
      const right = x >= xm ? 1 : 0;
      if (right) x0 = xm;
      else x1 = xm;
      ym = (y0 + y1) / 2;
      const bottom = y >= ym ? 1 : 0;
      if (bottom) y0 = ym;
      else y1 = ym;
      parent = node;
      i = (bottom << 1) | right;
      node = this.child[4 * parent + i];
      level += 1;
      if (node < 0) {
        const leaf = this.quad(p, x0, y0, x1, y1);
        this.child[4 * parent + i] = leaf;
        if (level > this.depth) this.depth = level;
        return;
      }
    }
    const first = this.head[node];
    const xp = px[first];
    const yp = py[first];
    if (x === xp && y === yp) {
      this.next[p] = first;
      this.head[node] = p;
      return;
    }
    // Split the leaf's quad until the two points part. Each new quad takes
    // the bounds before that round's halving; the old leaf moves into the
    // last one's quadrant j, the new point into its quadrant i.
    let j = 0;
    let sx0 = x0;
    let sy0 = y0;
    let sx1 = x1;
    let sy1 = y1;
    do {
      sx0 = x0;
      sy0 = y0;
      sx1 = x1;
      sy1 = y1;
      const split = this.quad(-1, x0, y0, x1, y1);
      if (parent >= 0) this.child[4 * parent + i] = split;
      else this.root = split;
      parent = split;
      xm = (x0 + x1) / 2;
      const right = x >= xm ? 1 : 0;
      if (right) x0 = xm;
      else x1 = xm;
      ym = (y0 + y1) / 2;
      const bottom = y >= ym ? 1 : 0;
      if (bottom) y0 = ym;
      else y1 = ym;
      i = (bottom << 1) | right;
      j = ((yp >= ym ? 1 : 0) << 1) | (xp >= xm ? 1 : 0);
      level += 1;
    } while (i === j);
    this.child[4 * parent + j] = node;
    this.setBounds(
      node,
      j & 1 ? xm : sx0,
      j & 2 ? ym : sy0,
      j & 1 ? sx1 : xm,
      j & 2 ? sy1 : ym,
    );
    const leaf = this.quad(p, x0, y0, x1, y1);
    this.child[4 * parent + i] = leaf;
    if (level > this.depth) this.depth = level;
  }
}

/**
 * Room for a depth-first walk of a tree `depth` levels deep: at most three
 * quads wait at each level besides the one being visited.
 */
const stackRoom = (depth: number) => 3 * depth + 4;

const growFloat = (array: Float64Array, n: number): Float64Array =>
  array.length >= n ? array : new Float64Array(Math.max(n, array.length * 2));

const growInt = (array: Int32Array, n: number): Int32Array =>
  array.length >= n ? array : new Int32Array(Math.max(n, array.length * 2));

/** The repulsion force, with the settings it was given, for inspection. */
export interface ManyBodyForce {
  (alpha: number): void;
  initialize(nodes: LayoutNode[], random: () => number): void;
  readonly settings: Readonly<{
    strength: number;
    theta: number;
    distanceMin: number;
  }>;
  setStrength(strength: number): void;
}

/**
 * d3's `forceManyBody()` with one strength for every node and no maximum
 * distance: Barnes–Hut repulsion over the flat quadtree, with d3's criterion
 * (a quad of width w at squared distance l counts as one body when
 * w²/θ² < l, worked out once per quad here), its minimum distance, its nudge
 * for coincident points, and its order of visits and sums.
 */
export function manyBodyForce(
  strength: number,
  theta: number,
  distanceMin: number,
): ManyBodyForce {
  const settings = { strength, theta, distanceMin };
  const theta2 = theta * theta;
  const distanceMin2 = distanceMin * distanceMin;
  const tree = new FlatQuadtree();
  let nodes: LayoutNode[] = [];
  let random: () => number = () => 0.5;
  let px: Float64Array = new Float64Array(0);
  let py: Float64Array = new Float64Array(0);
  // Per quad: its total strength, its strength-weighted centre, and the
  // squared distance beyond which it counts as one body (w²/θ²).
  let value: Float64Array = new Float64Array(0);
  let cx: Float64Array = new Float64Array(0);
  let cy: Float64Array = new Float64Array(0);
  let far: Float64Array = new Float64Array(0);
  let order: Int32Array = new Int32Array(0);
  let stack: Int32Array = new Int32Array(0);

  /** d3's accumulate: each quad's strength and centre, children first. */
  const accumulate = () => {
    const { bounds, child, head, next, size } = tree;
    const each = settings.strength;
    value = growFloat(value, size);
    cx = growFloat(cx, size);
    cy = growFloat(cy, size);
    far = growFloat(far, size);
    order = growInt(order, size);
    // List each quad before its children, then sum from the end back.
    let count = 0;
    order[count++] = tree.root;
    for (let top = 0; top < count; top++) {
      const q = order[top];
      if (head[q] >= 0) continue;
      for (let c = 4 * q; c < 4 * q + 4; c++) {
        if (child[c] >= 0) order[count++] = child[c];
      }
    }
    for (let o = count - 1; o >= 0; o--) {
      const q = order[o];
      const w = bounds[4 * q + 2] - bounds[4 * q];
      far[q] = (w * w) / theta2;
      let total = 0;
      if (head[q] < 0) {
        let weight = 0;
        let x = 0;
        let y = 0;
        for (let c = 4 * q; c < 4 * q + 4; c++) {
          const k = child[c];
          if (k < 0) continue;
          const kw = Math.abs(value[k]);
          if (!kw) continue;
          total += value[k];
          weight += kw;
          x += kw * cx[k];
          y += kw * cy[k];
        }
        cx[q] = x / weight;
        cy[q] = y / weight;
      } else {
        let p = head[q];
        cx[q] = px[p];
        cy[q] = py[p];
        do {
          total += each;
          p = next[p];
        } while (p >= 0);
      }
      value[q] = total;
    }
  };

  const force = (alpha: number) => {
    const n = nodes.length;
    px = growFloat(px, n);
    py = growFloat(py, n);
    for (let i = 0; i < n; i++) {
      px[i] = nodes[i].x;
      py[i] = nodes[i].y;
    }
    tree.build(px, py, n);
    if (tree.root < 0) return;
    accumulate();
    stack = growInt(stack, stackRoom(tree.depth));
    // Locals, not the closure's variables: the walk below is the hot loop.
    const s = stack;
    const { child, head, next, root } = tree;
    const each = settings.strength;
    const values = value;
    const centreX = cx;
    const centreY = cy;
    const farFrom = far;
    const xs = px;
    const ys = py;
    const draw = random;
    for (let i = 0; i < n; i++) {
      const node = nodes[i];
      const nx = xs[i];
      const ny = ys[i];
      let vx = node.vx;
      let vy = node.vy;
      s[0] = root;
      let sp = 1;
      while (sp > 0) {
        sp -= 1;
        const q = s[sp];
        const quadValue = values[q];
        if (!quadValue) continue;
        let x = centreX[q] - nx;
        let y = centreY[q] - ny;
        let l = x * x + y * y;
        if (farFrom[q] < l) {
          if (x === 0) {
            x = (draw() - 0.5) * 1e-6;
            l += x * x;
          }
          if (y === 0) {
            y = (draw() - 0.5) * 1e-6;
            l += y * y;
          }
          if (l < distanceMin2) l = Math.sqrt(distanceMin2 * l);
          vx += (x * quadValue * alpha) / l;
          vy += (y * quadValue * alpha) / l;
          continue;
        }
        let p = head[q];
        if (p < 0) {
          // Children pop in d3's order, 0 to 3.
          const c = 4 * q;
          if (child[c + 3] >= 0) s[sp++] = child[c + 3];
          if (child[c + 2] >= 0) s[sp++] = child[c + 2];
          if (child[c + 1] >= 0) s[sp++] = child[c + 1];
          if (child[c] >= 0) s[sp++] = child[c];
          continue;
        }
        if (p !== i || next[p] >= 0) {
          if (x === 0) {
            x = (draw() - 0.5) * 1e-6;
            l += x * x;
          }
          if (y === 0) {
            y = (draw() - 0.5) * 1e-6;
            l += y * y;
          }
          if (l < distanceMin2) l = Math.sqrt(distanceMin2 * l);
        }
        do {
          if (p !== i) {
            const w = (each * alpha) / l;
            vx += x * w;
            vy += y * w;
          }
          p = next[p];
        } while (p >= 0);
      }
      node.vx = vx;
      node.vy = vy;
    }
  };

  return Object.assign(force, {
    initialize(next: LayoutNode[], source: () => number) {
      nodes = next;
      random = source;
    },
    settings,
    setStrength(next: number) {
      settings.strength = next;
    },
  });
}

/** The collision force, with the settings it was given, for inspection. */
export interface CollideForce {
  (alpha: number): void;
  initialize(nodes: LayoutNode[], random: () => number): void;
  readonly settings: Readonly<{ radius: number; strength: number }>;
}

/** Bucket of a grid square: a hash of its two whole-number coordinates. */
const squareHash = (cx: number, cy: number, mask: number) =>
  (Math.imul(cx, 73856093) ^ Math.imul(cy, 19349663)) & mask;

/**
 * d3's `forceCollide()` with one radius for every node and one iteration:
 * nodes whose predicted positions (position plus velocity) overlap are
 * pushed apart, each pair once, with d3's arithmetic.
 *
 * Every node has the same radius, so two nodes can touch only when they are
 * within two radii of each other. Instead of d3's quadtree, the predicted
 * positions are filed in a grid of squares two radii wide, and a node looks
 * only at the nine squares round its own. That finds the pairs d3 finds at
 * well under half the cost: about 1.4 ms a tick against 3.5 ms at the
 * Atlas's size, which is what keeps a whole tick near 8 ms.
 *
 * As in d3, each node is tested at its turn with its velocity as it then
 * stands, against the others' as they then stand, so pushes earlier in the
 * pass carry into later ones; and nodes are taken in order, each pushing
 * only nodes numbered after it. The pairs of one node are visited in grid
 * order rather than d3's tree order, so a node's pushes are summed in a
 * different order and its velocity can differ from d3's in the last bits.
 * The tests hold the two to within rounding. (d3 also skips all but one of
 * several nodes predicted to land on exactly the same spot; this tests each
 * of them, which a running layout never notices.)
 */
export function collideForce(radius: number, strength: number): CollideForce {
  const settings = { radius, strength };
  /** Two radii: the farthest apart two nodes can be and still touch. */
  const span = 2 * radius;
  const span2 = span * span;
  let nodes: LayoutNode[] = [];
  let random: () => number = () => 0.5;
  let px: Float64Array = new Float64Array(0);
  let py: Float64Array = new Float64Array(0);
  let vxs: Float64Array = new Float64Array(0);
  let vys: Float64Array = new Float64Array(0);
  // Each node's grid square, the next node in its bucket, and whether it was
  // filed at all (a node with no position is not).
  let squareX: Int32Array = new Int32Array(0);
  let squareY: Int32Array = new Int32Array(0);
  let nextInBucket: Int32Array = new Int32Array(0);
  let filed: Uint8Array = new Uint8Array(0);
  /** Per bucket: its first node, or -1. */
  let buckets: Int32Array = new Int32Array(0);

  const force = () => {
    const n = nodes.length;
    if (px.length < n) {
      const room = Math.max(n, px.length * 2);
      px = new Float64Array(room);
      py = new Float64Array(room);
      vxs = new Float64Array(room);
      vys = new Float64Array(room);
      squareX = new Int32Array(room);
      squareY = new Int32Array(room);
      nextInBucket = new Int32Array(room);
      filed = new Uint8Array(room);
    }
    // Twice as many buckets as nodes, a power of two, so chains stay short.
    const want = Math.max(16, 2 ** Math.ceil(Math.log2(2 * n + 1)));
    if (buckets.length !== want) buckets = new Int32Array(want);
    buckets.fill(-1);
    const mask = want - 1;

    for (let i = 0; i < n; i++) {
      const node = nodes[i];
      px[i] = node.x;
      py[i] = node.y;
      vxs[i] = node.vx;
      vys[i] = node.vy;
      const x = node.x + node.vx;
      const y = node.y + node.vy;
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        filed[i] = 0;
        continue;
      }
      filed[i] = 1;
      const cx = Math.floor(x / span) | 0;
      const cy = Math.floor(y / span) | 0;
      squareX[i] = cx;
      squareY[i] = cy;
      const b = squareHash(cx, cy, mask);
      nextInBucket[i] = buckets[b];
      buckets[b] = i;
    }

    // Locals, not the closure's variables: the loop below is the hot one.
    const xs = px;
    const ys = py;
    const vx = vxs;
    const vy = vys;
    const sqX = squareX;
    const sqY = squareY;
    const chain = nextInBucket;
    const heads = buckets;
    const draw = random;
    // How far any node has been pushed so far in this pass, on each axis. A
    // node was filed where it was predicted before the pass, so one pushed
    // since may now touch a node more than two radii from its square; the
    // search reaches that much further, and so finds every pair that touches.
    let driftX = 0;
    let driftY = 0;
    for (let i = 0; i < n; i++) {
      if (!filed[i]) continue;
      const xi = xs[i] + vx[i];
      const yi = ys[i] + vy[i];
      if (!Number.isFinite(xi) || !Number.isFinite(yi)) continue;
      const x0 = Math.floor((xi - span - driftX) / span) | 0;
      const x1 = Math.floor((xi + span + driftX) / span) | 0;
      const y0 = Math.floor((yi - span - driftY) / span) | 0;
      const y1 = Math.floor((yi + span + driftY) / span) | 0;
      for (let cx = x0; cx <= x1; cx++) {
        for (let cy = y0; cy <= y1; cy++) {
          for (let j = heads[squareHash(cx, cy, mask)]; j >= 0; j = chain[j]) {
            if (j <= i || sqX[j] !== cx || sqY[j] !== cy) continue;
            let x = xi - xs[j] - vx[j];
            let y = yi - ys[j] - vy[j];
            let l = x * x + y * y;
            if (l >= span2) continue;
            if (x === 0) {
              x = (draw() - 0.5) * 1e-6;
              l += x * x;
            }
            if (y === 0) {
              y = (draw() - 0.5) * 1e-6;
              l += y * y;
            }
            l = Math.sqrt(l);
            l = ((span - l) / l) * strength;
            x *= l;
            y *= l;
            // Equal radii share the push equally: d3's rj² / (ri² + rj²)
            // is exactly ½, and so is 1 − ½.
            vx[i] += x * 0.5;
            vy[i] += y * 0.5;
            vx[j] -= x * 0.5;
            vy[j] -= y * 0.5;
            const movedX = Math.abs(vx[j] - nodes[j].vx);
            const movedY = Math.abs(vy[j] - nodes[j].vy);
            if (movedX > driftX) driftX = movedX;
            if (movedY > driftY) driftY = movedY;
          }
        }
      }
    }
    for (let i = 0; i < n; i++) {
      nodes[i].vx = vxs[i];
      nodes[i].vy = vys[i];
    }
  };

  return Object.assign(force, {
    initialize(next: LayoutNode[], source: () => number) {
      nodes = next;
      random = source;
    },
    settings,
  });
}

// ── The simulation ──────────────────────────────────────────────────────────

/** A node as d3 holds it. */
export interface LayoutNode extends SimulationNodeDatum {
  index: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/** A link as d3 holds it, with the degree that divides its strength. */
export interface LayoutLink extends SimulationLinkDatum<LayoutNode> {
  /** The smaller of its two ends' degrees. */
  minDegree: number;
}

export interface ForceLayoutOptions extends LayoutGraph {
  forces: LayoutForces;
  /** Seeds every random choice the layout makes. */
  seed: number;
  /**
   * The alpha to start at. Left out, it is the warm-start alpha when at
   * least 95% of the nodes have a position, and 1 otherwise.
   */
  alpha?: number;
}

export interface ForceLayout {
  /** How many nodes the current graph has. */
  readonly count: number;
  /** Run `iterations` ticks (one by default), settled or not. */
  tick(iterations?: number): void;
  /**
   * Tick until the layout settles or `maxTicks` have run, and return the
   * number of ticks run.
   */
  settle(maxTicks?: number): number;
  /** The current alpha. */
  alpha(): number;
  /** The alpha the simulation is easing toward: 0.3 while dragging, else 0. */
  alphaTarget(): number;
  /**
   * True once alpha is below the alpha minimum and is not easing toward a
   * drag target (so never while a node is held).
   */
  isSettled(): boolean;
  /** Ticks run since the layout was created. */
  ticks(): number;
  /**
   * How far the node that moved furthest moved on the last tick, in world
   * units. d3 moves each node by its velocity after damping, so this is the
   * largest velocity left after the tick. Pinned nodes have none.
   */
  lastMove(): number;
  /**
   * End the run where it is: alpha drops below the minimum, so the layout
   * counts as settled. Nothing happens while a node is held, since a drag
   * keeps the layout moving.
   */
  rest(): void;
  /** Write the positions as x0, y0, x1, y1, … into `out` (or a new array). */
  positions(out?: Float32Array): Float32Array;
  /** How many nodes are pinned by a drag. */
  pinnedCount(): number;
  /** Change the forces and reheat (to 0.3 unless told otherwise). */
  setForces(forces: LayoutForces, alpha?: number): void;
  /** Raise alpha to at least `alpha`; never cools a hotter simulation. */
  reheat(alpha: number): void;
  /**
   * Hold a node at (x, y), as a drag does: alpha rises to at least 0.3 at
   * once and is aimed there while the node is held. Called again as the
   * pointer moves, each call raising alpha again, as Obsidian does.
   */
  pin(index: number, x: number, y: number): void;
  /** Let a dragged node go; alpha eases back to 0 once nothing is pinned. */
  unpin(index: number): void;
  /**
   * Replace the graph after a structural change. `xy` carries the positions
   * the nodes already have, NaN for new ones, which are placed as at the
   * start. Alpha rises to at least 0.1, and drag pins are dropped because
   * node numbers change.
   */
  setGraph(graph: LayoutGraph, alpha?: number): void;
  /** The d3 simulation, for inspection; change it only through this API. */
  simulation(): Simulation<LayoutNode, LayoutLink>;
}

function checkGraph({ count, links, xy }: LayoutGraph) {
  if (!Number.isInteger(count) || count < 0)
    throw new RangeError(`node count ${count} is not a whole number`);
  if (links.length % 2 !== 0)
    throw new RangeError('links must come in pairs of node numbers');
  for (let k = 0; k < links.length; k++) {
    if (links[k] >= count)
      throw new RangeError(
        `link ${k >> 1} names node ${links[k]}, but there are only ${count}`,
      );
  }
  if (xy && xy.length !== count * 2)
    throw new RangeError(
      `positions hold ${xy.length} numbers; ${count * 2} were expected`,
    );
}

/** The degree of each node, counting each link once and skipping self-links. */
export function degreesOf(count: number, links: Uint32Array): Uint32Array {
  const degree = new Uint32Array(count);
  for (let k = 0; k < links.length; k += 2) {
    if (links[k] === links[k + 1]) continue;
    degree[links[k]] += 1;
    degree[links[k + 1]] += 1;
  }
  return degree;
}

export function createForceLayout(options: ForceLayoutOptions): ForceLayout {
  // Two streams from one seed: d3's (jiggles inside the forces) and ours
  // (placing new nodes), so a structural change never shifts d3's draws.
  const simRandom = mulberry32(options.seed);
  const placeRandom = mulberry32(options.seed ^ 0x5bd1e995);
  let forces: LayoutForces = { ...options.forces };
  const pinned = new Set<number>();
  let ticks = 0;

  let nodes: LayoutNode[] = [];
  let sim!: Simulation<LayoutNode, LayoutLink>;
  let centerX!: ForceX<LayoutNode>;
  let centerY!: ForceY<LayoutNode>;
  let link!: ForceLink<LayoutNode, LayoutLink>;
  let charge!: ManyBodyForce;
  let collide!: CollideForce;

  const build = (graph: LayoutGraph, alpha: number) => {
    checkGraph(graph);
    const start = placeNewNodes(
      graph.count,
      graph.links,
      graph.xy,
      placeRandom,
    );
    const degree = degreesOf(graph.count, graph.links);
    nodes = new Array<LayoutNode>(graph.count);
    for (let i = 0; i < graph.count; i++) {
      nodes[i] = {
        index: i,
        x: start[2 * i],
        y: start[2 * i + 1],
        vx: 0,
        vy: 0,
      };
    }
    const links: LayoutLink[] = [];
    for (let k = 0; k < graph.links.length; k += 2) {
      const a = graph.links[k];
      const b = graph.links[k + 1];
      if (a === b) continue;
      links.push({
        source: a,
        target: b,
        minDegree: Math.min(degree[a], degree[b]),
      });
    }

    centerX = forceX<LayoutNode>(0);
    centerY = forceY<LayoutNode>(0);
    link = forceLink<LayoutNode, LayoutLink>(links);
    charge = manyBodyForce(
      forces.repel,
      SIMULATION.repelTheta,
      SIMULATION.repelDistanceMin,
    );
    collide = collideForce(
      SIMULATION.collideRadius,
      SIMULATION.collideStrength,
    );
    applyForces();

    // The simulation's own timer is stopped at once: this layout is ticked
    // by hand. The random source goes in before the forces, which read it
    // as they initialise.
    sim = forceSimulation<LayoutNode, LayoutLink>(nodes)
      .stop()
      .randomSource(simRandom)
      .velocityDecay(SIMULATION.velocityDecay)
      .alphaDecay(SIMULATION.alphaDecay)
      .alphaMin(SIMULATION.alphaMin)
      .alpha(alpha)
      .alphaTarget(0)
      .force('x', centerX)
      .force('y', centerY)
      .force('link', link)
      .force('charge', charge)
      .force('collide', collide);
  };

  const applyForces = () => {
    centerX.strength(forces.center);
    centerY.strength(forces.center);
    link
      .distance(forces.linkDistance)
      .strength((l) => forces.link / l.minDegree);
    charge.setStrength(forces.repel);
  };

  const nodeAt = (index: number) => {
    const node = nodes[index];
    if (!node) throw new RangeError(`there is no node ${index}`);
    return node;
  };

  // At rest only when alpha is below the minimum and will stay there: while
  // a node is held, alpha eases up toward the drag target from wherever it
  // is, even from rest.
  const settled = () =>
    nodes.length === 0 ||
    (sim.alpha() < sim.alphaMin() && sim.alphaTarget() < sim.alphaMin());

  build(
    options,
    options.alpha ?? startAlphaFor(placedFraction(options.xy, options.count)),
  );

  const layout: ForceLayout = {
    get count() {
      return nodes.length;
    },
    tick(iterations = 1) {
      sim.tick(iterations);
      ticks += iterations;
    },
    settle(maxTicks = 10_000) {
      let run = 0;
      while (!settled() && run < maxTicks) {
        layout.tick();
        run += 1;
      }
      return run;
    },
    alpha: () => sim.alpha(),
    alphaTarget: () => sim.alphaTarget(),
    isSettled: settled,
    ticks: () => ticks,
    lastMove() {
      let most = 0;
      for (let i = 0; i < nodes.length; i++) {
        const { vx, vy } = nodes[i];
        const move = vx * vx + vy * vy;
        if (move > most) most = move;
      }
      return Math.sqrt(most);
    },
    rest() {
      if (pinned.size > 0) return;
      sim.alpha(0);
    },
    positions(out = new Float32Array(nodes.length * 2)) {
      for (let i = 0; i < nodes.length; i++) {
        out[2 * i] = nodes[i].x;
        out[2 * i + 1] = nodes[i].y;
      }
      return out;
    },
    pinnedCount: () => pinned.size,
    setForces(next, alpha = ALPHA.forces) {
      forces = { ...next };
      applyForces();
      layout.reheat(alpha);
    },
    reheat(alpha) {
      sim.alpha(Math.max(sim.alpha(), alpha));
    },
    pin(index, x, y) {
      const node = nodeAt(index);
      node.fx = x;
      node.fy = y;
      node.x = x;
      node.y = y;
      node.vx = 0;
      node.vy = 0;
      pinned.add(index);
      // Hot at once, not easing up from rest: Obsidian posts alpha 0.3 with
      // every move of a held node.
      sim.alpha(Math.max(sim.alpha(), ALPHA.drag));
      sim.alphaTarget(ALPHA.drag);
    },
    unpin(index) {
      const node = nodeAt(index);
      node.fx = null;
      node.fy = null;
      pinned.delete(index);
      if (pinned.size === 0) sim.alphaTarget(0);
    },
    setGraph(graph, alpha = ALPHA.structure) {
      build(graph, Math.max(sim.alpha(), alpha));
      pinned.clear();
    },
    simulation: () => sim,
  };
  return layout;
}
