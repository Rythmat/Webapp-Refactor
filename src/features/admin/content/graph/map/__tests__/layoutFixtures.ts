/**
 * Seeded synthetic graphs for the layout tests and the layout benchmark.
 *
 * They are shaped roughly like the Atlas: clusters of items that mostly link
 * inside their cluster, a few hubs (links prefer nodes that already have
 * many), every cluster joined to the rest, and some orphans with no links at
 * all, numbered last.
 */
import { mulberry32 } from '../layout/forceLayout';

export interface SyntheticGraph {
  count: number;
  links: Uint32Array;
  /** Node numbers with no links. */
  orphans: number[];
  /** Node numbers with at least one link. */
  core: number[];
}

export function syntheticGraph({
  nodes,
  edges,
  orphans = 0,
  clusters = Math.max(1, Math.round(Math.sqrt(nodes) / 2)),
  seed = 1,
  inside = 0.85,
}: {
  nodes: number;
  edges: number;
  orphans?: number;
  clusters?: number;
  seed?: number;
  /** The share of extra links that stay inside their cluster. */
  inside?: number;
}): SyntheticGraph {
  const random = mulberry32(seed);
  const linked = nodes - orphans;
  const clusterOf = (i: number) => i % clusters;
  const pick = <T>(list: readonly T[]) =>
    list[Math.floor(random() * list.length)];

  // Every appearance of a node at a link's end, per cluster and overall, so
  // a pick from these lists prefers well-linked nodes.
  const endsIn: number[][] = Array.from({ length: clusters }, () => []);
  const membersOf: number[][] = Array.from({ length: clusters }, () => []);
  const ends: number[] = [];
  const pairs = new Set<number>();
  const out: number[] = [];

  const add = (a: number, b: number) => {
    if (a === b) return false;
    const key = a < b ? a * nodes + b : b * nodes + a;
    if (pairs.has(key)) return false;
    pairs.add(key);
    out.push(a, b);
    ends.push(a, b);
    endsIn[clusterOf(a)].push(a);
    endsIn[clusterOf(b)].push(b);
    return true;
  };

  // A tree inside each cluster, grown by preferential attachment.
  for (let i = 0; i < linked; i++) {
    const c = clusterOf(i);
    const members = membersOf[c];
    if (members.length > 0) {
      const target =
        endsIn[c].length > 0 && random() < 0.7
          ? pick(endsIn[c])
          : pick(members);
      add(i, target);
    }
    members.push(i);
  }
  // Each cluster joined to an earlier one, so the core is one piece.
  for (let c = 1; c < Math.min(clusters, linked); c++) {
    add(membersOf[c][0], pick(membersOf[Math.floor(random() * c)]));
  }
  // The rest of the links, mostly inside clusters, toward hubs.
  let guard = 0;
  while (out.length / 2 < edges && guard < edges * 50) {
    guard += 1;
    const a = Math.floor(random() * linked);
    const c = clusterOf(a);
    const b = random() < inside ? pick(endsIn[c]) : pick(ends);
    add(a, b);
  }

  const core: number[] = [];
  for (let i = 0; i < linked; i++) core.push(i);
  const lonely: number[] = [];
  for (let i = linked; i < nodes; i++) lonely.push(i);
  return { count: nodes, links: Uint32Array.from(out), orphans: lonely, core };
}

/** Distance of each node from the mean position of `around`. */
export function radiiFrom(
  xy: Float32Array,
  nodes: readonly number[],
  around: readonly number[],
): number[] {
  let cx = 0;
  let cy = 0;
  for (const i of around) {
    cx += xy[2 * i];
    cy += xy[2 * i + 1];
  }
  cx /= around.length;
  cy /= around.length;
  return nodes.map((i) => Math.hypot(xy[2 * i] - cx, xy[2 * i + 1] - cy));
}

export const median = (values: readonly number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export const distance = (xy: Float32Array, a: number, b: number) =>
  Math.hypot(xy[2 * a] - xy[2 * b], xy[2 * a + 1] - xy[2 * b + 1]);
