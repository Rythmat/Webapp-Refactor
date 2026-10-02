import type { GraphFacets } from './facets';

/**
 * The order the "Animate" timelapse grows the graph in.
 *
 * Obsidian replays a vault in the order its notes were created. Atlas items
 * have no creation dates that mean anything, so the Atlas replays history
 * instead: each node appears in its earliest year, the earliest of the years
 * it is from, was born in or was formed in (`NodeFacets.firstYear`).
 *
 * Most nodes have no year of their own: a city, a progression, a genre. An
 * undated node appears with its first neighbour to appear, so a city turns
 * up with the first thing that happened there, and an undated node reached
 * only through other undated nodes comes with them. Whatever is still
 * hidden after the last year (undated nodes linked to nothing dated) appears
 * at the end. A link appears as soon as both its ends are visible.
 *
 * The plan is a list of batches, earliest first, each with the year its
 * counter shows. A year with many nodes is split over several batches, so
 * the layout is never handed hundreds of new nodes at once; a dated node and
 * the undated nodes it brings in always share a batch. The player decides
 * how fast to step through them.
 *
 * The module is pure: no React, no DOM, no content store.
 */

/** The most dated nodes, with what they bring, that one batch packs together. */
export const TIMELAPSE_BATCH_SIZE = 32;

/** One step of the timelapse. */
export interface TimelapseBatch {
  /** The year on the counter; null for the undated nodes at the end. */
  readonly year: number | null;
  /** The node indices that appear. */
  readonly nodes: Uint32Array;
  /** The link indices (pair numbers in `links`) that appear. */
  readonly links: Uint32Array;
}

export interface TimelapsePlan {
  readonly batches: readonly TimelapseBatch[];
  /** The batch each node appears in. */
  readonly nodeBatch: Int32Array;
  /** The batch each link appears in, or -1 for a link to a node index out of range. */
  readonly linkBatch: Int32Array;
  /** The earliest and latest years on the counter; null with no dated node. */
  readonly firstYear: number | null;
  readonly lastYear: number | null;
}

export interface TimelapseOptions {
  /** Overrides `TIMELAPSE_BATCH_SIZE`. */
  readonly batchSize?: number;
}

/**
 * Each node's earliest year, by index, or NaN when it has none. The ids are
 * the drawn nodes' ids in drawing order.
 */
export function earliestYears(
  ids: ArrayLike<string>,
  facets: GraphFacets,
): Float64Array {
  const years = new Float64Array(ids.length).fill(Number.NaN);
  for (let i = 0; i < ids.length; i++) {
    const first = facets.get(ids[i])?.firstYear;
    if (first !== undefined && first !== null) years[i] = first;
  }
  return years;
}

/** Neighbour lists in compressed form: `next[start[i]..start[i+1]]`. */
function neighbours(count: number, links: ArrayLike<number>) {
  const pairs = Math.floor(links.length / 2);
  const inRange = (v: number) => v >= 0 && v < count;
  const degree = new Uint32Array(count + 1);
  for (let l = 0; l < pairs; l++) {
    const a = links[2 * l];
    const b = links[2 * l + 1];
    if (!inRange(a) || !inRange(b) || a === b) continue;
    degree[a + 1]++;
    degree[b + 1]++;
  }
  for (let i = 0; i < count; i++) degree[i + 1] += degree[i];
  const start = degree.slice();
  const fill = degree.slice(0, count);
  const next = new Uint32Array(start[count]);
  for (let l = 0; l < pairs; l++) {
    const a = links[2 * l];
    const b = links[2 * l + 1];
    if (!inRange(a) || !inRange(b) || a === b) continue;
    next[fill[a]++] = b;
    next[fill[b]++] = a;
  }
  return { start, next, pairs, inRange };
}

/**
 * Plan a timelapse from each node's year (NaN for undated) and the drawn
 * links, given as index pairs `[a0, b0, a1, b1, …]`.
 */
export function planTimelapseFromYears(
  years: ArrayLike<number>,
  links: ArrayLike<number>,
  options: TimelapseOptions = {},
): TimelapsePlan {
  const count = years.length;
  const batchSize = Math.max(1, options.batchSize ?? TIMELAPSE_BATCH_SIZE);
  const { start, next, pairs, inRange } = neighbours(count, links);
  const dated = (i: number) => Number.isFinite(years[i]);

  const shown = new Uint8Array(count);
  /** A node and the hidden undated nodes it brings in, breadth first. */
  const reveal = (seed: number): number[] => {
    const group = [seed];
    shown[seed] = 1;
    for (let k = 0; k < group.length; k++) {
      const u = group[k];
      for (let e = start[u]; e < start[u + 1]; e++) {
        const v = next[e];
        if (shown[v] || dated(v)) continue;
        shown[v] = 1;
        group.push(v);
      }
    }
    return group;
  };

  const groups: { year: number | null; nodes: number[] }[] = [];
  const order = Array.from({ length: count }, (_, i) => i)
    .filter(dated)
    .sort((a, b) => years[a] - years[b] || a - b);
  for (const i of order) groups.push({ year: years[i], nodes: reveal(i) });
  for (let i = 0; i < count; i++) {
    if (!shown[i]) groups.push({ year: null, nodes: reveal(i) });
  }

  // Pack groups of the same year into batches of up to `batchSize` nodes.
  const packed: { year: number | null; nodes: number[] }[] = [];
  for (const group of groups) {
    const last = packed[packed.length - 1];
    if (
      last &&
      last.year === group.year &&
      last.nodes.length + group.nodes.length <= batchSize
    ) {
      last.nodes.push(...group.nodes);
    } else {
      packed.push({ year: group.year, nodes: [...group.nodes] });
    }
  }

  const nodeBatch = new Int32Array(count);
  packed.forEach((batch, b) => {
    for (const i of batch.nodes) nodeBatch[i] = b;
  });
  const linkBatch = new Int32Array(pairs).fill(-1);
  const linksOf: number[][] = packed.map(() => []);
  for (let l = 0; l < pairs; l++) {
    const a = links[2 * l];
    const b = links[2 * l + 1];
    if (!inRange(a) || !inRange(b)) continue;
    const batch = Math.max(nodeBatch[a], nodeBatch[b]);
    linkBatch[l] = batch;
    linksOf[batch].push(l);
  }

  const datedYears = order.map((i) => years[i]);
  return {
    batches: packed.map((batch, b) => ({
      year: batch.year,
      nodes: Uint32Array.from(batch.nodes),
      links: Uint32Array.from(linksOf[b]),
    })),
    nodeBatch,
    linkBatch,
    firstYear: datedYears.length ? datedYears[0] : null,
    lastYear: datedYears.length ? datedYears[datedYears.length - 1] : null,
  };
}

/** The drawn graph a timelapse is planned over. */
export interface TimelapseInput {
  /** The drawn nodes' ids, in drawing order. */
  readonly ids: ArrayLike<string>;
  /** Index pairs `[a0, b0, a1, b1, …]`. */
  readonly links: ArrayLike<number>;
  readonly facets: GraphFacets;
}

/** Plan the timelapse for a drawn graph, dating nodes by their facets. */
export function planTimelapse(
  input: TimelapseInput,
  options?: TimelapseOptions,
): TimelapsePlan {
  return planTimelapseFromYears(
    earliestYears(input.ids, input.facets),
    input.links,
    options,
  );
}
