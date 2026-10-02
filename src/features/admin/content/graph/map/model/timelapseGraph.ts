import { NODE_ORPHAN, type RenderGraph } from './renderGraph';
import type { TimelapsePlan } from './timelapse';

/**
 * What the "Animate" timelapse draws at each step, and how fast it steps.
 *
 * The timelapse (`timelapse.ts`) plans the order the Atlas appears in: a
 * list of batches, earliest year first. At step `b` the graph shows every
 * node of batches 0 to b, and every line whose two ends are both showing,
 * which is exactly the lines of those batches, since a line belongs to the
 * batch of its later end. This module cuts that graph out of the whole one.
 *
 * The cut-out is an ordinary `RenderGraph`, so the canvas, the layout, hit
 * testing, hover and labels all treat it like any other graph:
 *
 * - its nodes are numbered in the order they appeared, and its lines in
 *   the order their batches came, so each step's graph is the one before
 *   with the new nodes and lines added at the end. A node keeps its number
 *   for the whole run, which is what lets a dot be dragged while the graph
 *   grows (a drag holds its dot by number), and what the renderer keeps
 *   positions by until the layout sends new ones. Unlike other drawn
 *   graphs it is therefore not in id order;
 * - each node's weight is counted again over the lines showing, so a dot
 *   starts small and grows as its links arrive, as in Obsidian;
 * - a node with no line showing yet is flagged as an orphan, as it would be
 *   in a graph that held only these nodes;
 * - its fingerprint is the whole graph's with the step added, so each step
 *   is a new structure to the layout (new nodes to place), while the same
 *   step of the same graph is the same structure.
 *
 * `source` maps each node drawn back to its number in the whole graph, for
 * the colours and anything else kept per node of the whole graph.
 *
 * The module is pure: no React, no DOM, no content store.
 */

/** How long the whole timelapse takes, about: the plan's ~30 seconds. */
export const TIMELAPSE_DURATION_MS = 30_000;

/**
 * The quickest and the slowest step. The Atlas takes about 350 steps, so
 * they come about twelve a second; a small graph steps no slower than
 * four a second, and a huge one no faster than twenty.
 */
export const TIMELAPSE_MIN_STEP_MS = 50;
export const TIMELAPSE_MAX_STEP_MS = 250;

/**
 * How long the finished picture stays, with the counter at its last year,
 * before the timelapse hands the settled layout back.
 */
export const TIMELAPSE_HOLD_MS = 2500;

/** How long each step shows for a plan of `batches` batches. */
export function timelapseStepMs(batches: number): number {
  if (!(batches > 0)) return TIMELAPSE_MAX_STEP_MS;
  return Math.min(
    TIMELAPSE_MAX_STEP_MS,
    Math.max(TIMELAPSE_MIN_STEP_MS, TIMELAPSE_DURATION_MS / batches),
  );
}

/**
 * The steps a timelapse takes, as the last batch each one shows: a step
 * per dated batch, then a single step for everything left undated at the
 * end, however many batches that is. Those leftovers (mostly items linked
 * to nothing, such as chord progressions with no song yet) then land
 * together on one ring outside the grown graph, which is where Obsidian
 * keeps its unlinked notes, instead of ring after ring as they came.
 */
export function timelapseSteps(plan: TimelapsePlan): Int32Array {
  const steps: number[] = [];
  plan.batches.forEach((batch, b) => {
    if (batch.year !== null) steps.push(b);
  });
  const last = plan.batches.length - 1;
  if (last >= 0 && steps[steps.length - 1] !== last) steps.push(last);
  return Int32Array.from(steps);
}

/** The year the counter shows at a step: the batch's, or the last for the undated end. */
export function timelapseYear(
  plan: TimelapsePlan,
  batch: number,
): number | null {
  const step = plan.batches[Math.min(batch, plan.batches.length - 1)];
  if (!step) return plan.firstYear;
  return step.year ?? plan.lastYear;
}

/** The graph showing at one step of a timelapse. */
export interface RevealedGraph {
  /** What is drawn: the nodes and lines of batches 0 to the step. */
  readonly graph: RenderGraph;
  /** For each node drawn, its number in the whole graph. */
  readonly source: Uint32Array;
  /** The step this is, clamped to the plan's last. */
  readonly batch: number;
}

/**
 * Cut the graph showing at step `batch` out of the whole graph `full`, which
 * `plan` was made for (see the notes at the top of this file).
 */
export function revealGraph(
  full: RenderGraph,
  plan: TimelapsePlan,
  batch: number,
): RevealedGraph {
  const last = Math.max(-1, Math.min(batch, plan.batches.length - 1));

  // Nodes, numbered in the order they appeared.
  const rank = new Int32Array(full.count).fill(-1);
  let count = 0;
  for (let b = 0; b <= last; b++) {
    for (const i of plan.batches[b].nodes) {
      if (i < full.count && rank[i] < 0) rank[i] = count++;
    }
  }
  const source = new Uint32Array(count);
  for (let i = 0; i < full.count; i++) {
    if (rank[i] >= 0) source[rank[i]] = i;
  }

  // Lines in the order their batches came. Each pair keeps the whole
  // graph's order of its two ends, so its direction flags still read the
  // same way round.
  const lineRank = new Int32Array(full.linkCount).fill(-1);
  const order: number[] = [];
  for (let b = 0; b <= last; b++) {
    for (const l of plan.batches[b].links) {
      if (l >= full.linkCount || lineRank[l] >= 0) continue;
      const a = rank[full.links[2 * l]];
      const z = rank[full.links[2 * l + 1]];
      if (a < 0 || z < 0) continue;
      lineRank[l] = order.length;
      order.push(l);
    }
  }
  const linkCount = order.length;
  const links = new Uint32Array(linkCount * 2);
  const linkFlags = new Uint8Array(linkCount);
  const weights = new Uint32Array(count);
  order.forEach((l, k) => {
    const a = rank[full.links[2 * l]];
    const z = rank[full.links[2 * l + 1]];
    links[2 * k] = a;
    links[2 * k + 1] = z;
    linkFlags[k] = full.linkFlags[l];
    weights[a] += 1;
    weights[z] += 1;
  });

  // Neighbours, read off the whole graph's lists and put in this graph's
  // node order.
  const neighbourOffsets = new Uint32Array(count + 1);
  for (let k = 0; k < count; k++) neighbourOffsets[k + 1] = weights[k];
  for (let k = 0; k < count; k++)
    neighbourOffsets[k + 1] += neighbourOffsets[k];
  const neighbours = new Uint32Array(neighbourOffsets[count]);
  const neighbourLines = new Uint32Array(neighbourOffsets[count]);
  const around: [number, number][] = [];
  for (let k = 0; k < count; k++) {
    const i = source[k];
    around.length = 0;
    for (
      let e = full.neighbourOffsets[i];
      e < full.neighbourOffsets[i + 1];
      e++
    ) {
      const line = lineRank[full.neighbourLines[e]];
      if (line >= 0) around.push([rank[full.neighbours[e]], line]);
    }
    around.sort((x, y) => x[0] - y[0]);
    let at = neighbourOffsets[k];
    for (const [j, line] of around) {
      neighbours[at] = j;
      neighbourLines[at] = line;
      at += 1;
    }
  }

  const ids = new Array<RenderGraph['ids'][number]>(count);
  const nodes = new Array<RenderGraph['nodes'][number]>(count);
  const indexOf = new Map<RenderGraph['ids'][number], number>();
  const kinds = new Uint8Array(count);
  const flags = new Uint8Array(count);
  for (let k = 0; k < count; k++) {
    const i = source[k];
    ids[k] = full.ids[i];
    nodes[k] = full.nodes[i];
    indexOf.set(full.ids[i], k);
    kinds[k] = full.kinds[i];
    flags[k] =
      (full.flags[i] & ~NODE_ORPHAN) | (weights[k] === 0 ? NODE_ORPHAN : 0);
  }
  const depths = full.depths
    ? Uint8Array.from(source, (i) => full.depths![i])
    : null;

  return {
    graph: {
      count,
      ids,
      nodes,
      indexOf,
      kinds,
      flags,
      weights,
      linkCount,
      links,
      linkFlags,
      neighbourOffsets,
      neighbours,
      neighbourLines,
      focus: full.focus >= 0 ? rank[full.focus] : -1,
      depths,
      fingerprint: `${full.fingerprint}~step${last}`,
    },
    source,
    batch: last,
  };
}

/**
 * Per-node values of the whole graph (`size` numbers each, such as four
 * colour bytes), gathered for the nodes a step draws.
 */
export function gatherPerNode<T extends Uint8Array | Float32Array>(
  values: T,
  source: Uint32Array,
  size = 1,
): T {
  const out = new (values.constructor as { new (n: number): T })(
    source.length * size,
  );
  for (let k = 0; k < source.length; k++) {
    const from = source[k] * size;
    for (let c = 0; c < size; c++) out[k * size + c] = values[from + c];
  }
  return out;
}
