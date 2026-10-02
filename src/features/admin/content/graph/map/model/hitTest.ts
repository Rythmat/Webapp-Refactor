import { quadtree, type QuadtreeLeaf } from 'd3-quadtree';

/**
 * Which dot is under the pointer.
 *
 * The Mind Map can hold eight thousand dots, so testing each one on every
 * pointer move would be too slow. A quadtree, d3's spatial index, sorts them
 * by position once, and a question then only looks at the dots near the
 * point asked about. The canvas rebuilds the index at most once a frame,
 * and only after the layout has moved something.
 *
 * Dots have different sizes, so the nearest centre is not always the dot
 * under the pointer: the pointer can be inside a big dot while a small dot's
 * centre is closer. `hit` therefore looks at every dot whose own radius
 * could reach the point, and of those that do reach it, picks the one whose
 * centre is closest.
 *
 * Everything is in world units. The index takes a copy of the positions it
 * was built from, so the layout can go on moving the originals without
 * leaving the index out of step with itself.
 *
 * The module is pure: no React, no DOM.
 */

/** Hit tests over one set of positions. */
export interface HitIndex {
  /** How many nodes were indexed (nodes not placed yet are skipped). */
  readonly size: number;
  /**
   * The node whose dot covers the world point (x, y), or -1. A dot reaches
   * `radii[i] × scale + slack` from its centre: pass the node size times
   * `nodeScale(zoom, dpr)` as `scale` to match the drawn size (see
   * `sizing.ts`), and a few screen pixels' worth of world units as `slack`
   * to make small dots easier to catch.
   */
  hit(x: number, y: number, scale?: number, slack?: number): number;
  /**
   * The node whose centre is nearest the world point (x, y), within
   * `maxDistance` when one is given, or -1.
   */
  nearest(x: number, y: number, maxDistance?: number): number;
}

/**
 * Index the first `count` nodes of `xy` (`x0, y0, x1, y1, …`) with their
 * radii. A node whose position is not a number yet is left out.
 */
export function buildHitIndex(
  xy: ArrayLike<number>,
  radii: ArrayLike<number>,
  count: number = radii.length,
): HitIndex {
  const positions = new Float64Array(count * 2);
  const indexed: number[] = [];
  let maxRadius = 0;
  for (let i = 0; i < count; i++) {
    const x = xy[2 * i];
    const y = xy[2 * i + 1];
    positions[2 * i] = x;
    positions[2 * i + 1] = y;
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    indexed.push(i);
    if (radii[i] > maxRadius) maxRadius = radii[i];
  }
  const tree = quadtree<number>(
    indexed,
    (i) => positions[2 * i],
    (i) => positions[2 * i + 1],
  );

  const hit = (x: number, y: number, scale = 1, slack = 0): number => {
    const reach = maxRadius * scale + slack;
    let best = -1;
    let bestDistance = Infinity;
    tree.visit((node, x0, y0, x1, y1) => {
      // Skip any quadrant no dot inside could reach the point from.
      if (
        x0 > x + reach ||
        x1 < x - reach ||
        y0 > y + reach ||
        y1 < y - reach
      ) {
        return true;
      }
      if (node.length) return false;
      for (
        let leaf: QuadtreeLeaf<number> | undefined = node;
        leaf;
        leaf = leaf.next
      ) {
        const i = leaf.data;
        const dx = positions[2 * i] - x;
        const dy = positions[2 * i + 1] - y;
        const distance = dx * dx + dy * dy;
        const r = radii[i] * scale + slack;
        if (distance > r * r) continue;
        // Closest centre wins; on a tie, the lower node number, every time.
        if (
          distance < bestDistance ||
          (distance === bestDistance && i < best)
        ) {
          best = i;
          bestDistance = distance;
        }
      }
      return false;
    });
    return best;
  };

  const nearest = (x: number, y: number, maxDistance?: number): number =>
    tree.find(x, y, maxDistance) ?? -1;

  return { size: indexed.length, hit, nearest };
}
