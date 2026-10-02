import type { TesseractModel } from './tesseractModel';

/**
 * Where Tesseract draws each opening: a tidy forest, growing left to right.
 *
 * EACH TREE
 *
 * A tree is laid out the Reingold–Tilford way, with Walker's improvement
 * (Buchheim and Walker's linear-time paper describes both):
 *
 * - a node's column is its depth: the starting chord at the left, each
 *   chord after it `DEPTH_PX` further right, so a progression reads left to
 *   right like the sheet;
 * - siblings go top to bottom in the tree's own order (most progressions
 *   below first), at least one row (`ROW_PX`) apart at every depth their
 *   branches share, so no two nodes in a column ever overlap;
 * - each branch is packed as close to the one above it as their outlines
 *   allow, not merely as close as their widest points: a short branch
 *   tucks in beside a long one;
 * - when a branch is pushed down by one further up than its neighbour,
 *   the small branches between them share the gap evenly instead of
 *   bunching at the top (Walker's spreading);
 * - each parent sits half way between its first and last child.
 *
 * The outlines are kept explicitly, one top and bottom per depth, rather
 * than with Buchheim's threads: a tree here is at most a few hundred
 * nodes and seven deep, so this is as fast and far easier to check.
 *
 * THE FOREST
 *
 * The trees are stacked in the model's order (diatonic first) into
 * columns, a few rows apart, and a new column starts when the next tree
 * would make the column taller than a limit. The limit is chosen from the
 * heights the trees can actually stack to, as the one that brings the
 * whole forest closest to 16:10, so it fills a screen. A column is as wide
 * as its widest tree plus room for the last column's labels.
 *
 * Only open nodes show their children (`open`), so collapsing a branch
 * closes the gap it left and the forest is laid out again. It is a pure
 * function of the model and what is open: the same input always gives the
 * same picture, so nothing needs to be cached.
 */

/** How far right each chord is from the one before it, in world pixels. */
export const DEPTH_PX = 150;
/** The least distance between two nodes in a column, in world pixels. */
export const ROW_PX = 24;
/** Rows of space between two trees in a column. */
export const TREE_GAP_ROWS = 3;
/** Space between two columns of trees, in world pixels. */
export const COLUMN_GAP_PX = 96;
/** Room for the labels right of a tree's last column, in world pixels. */
export const LABEL_ROOM_PX = 150;
/** The shape the forest is packed toward: 16:10. */
export const TARGET_ASPECT = 16 / 10;

/** Where one tree sits in the forest. */
export interface TreeBox {
  rootId: string;
  /** Its top left corner and size, in world pixels. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Which column it is stacked in, from 0. */
  column: number;
}

export interface ForestLayout {
  /** The nodes drawn, depth first in each tree's order, trees in the model's order. */
  ids: string[];
  /** A drawn node's number from its id. */
  indexOf: ReadonlyMap<string, number>;
  /** Each drawn node's parent's number, or -1 for a starting chord. */
  parent: Int32Array;
  /** Each drawn node's depth: 1 for a starting chord. */
  depth: Uint8Array;
  /** Each drawn node's world position: node i at `xy[2i], xy[2i + 1]`. */
  xy: Float32Array;
  /** 1 where a drawn node shows its children (open, with children to show). */
  open: Uint8Array;
  trees: TreeBox[];
  /** The whole forest's size, in world pixels. */
  width: number;
  height: number;
}

/** A branch's outline: its top and bottom row at each depth, from its root's. */
interface Outline {
  top: number[];
  bottom: number[];
}

/**
 * How far below branch `a`'s root branch `b`'s root must sit, in rows, so
 * that `b` clears `a` by a row at every depth they share.
 */
function separation(a: Outline, b: Outline): number {
  let need = 1;
  const shared = Math.min(a.bottom.length, b.top.length);
  for (let d = 0; d < shared; d++) {
    need = Math.max(need, a.bottom[d] - b.top[d] + 1);
  }
  return need;
}

/**
 * Lay out the branch under `id`: each shown child's row relative to its
 * parent goes into `rows`, and the branch's outline comes back.
 */
function tidyBranch(
  id: string,
  childrenOf: (id: string) => readonly string[],
  rows: Map<string, number>,
): Outline {
  const kids = childrenOf(id);
  if (kids.length === 0) return { top: [0], bottom: [0] };
  const shapes = kids.map((kid) => tidyBranch(kid, childrenOf, rows));
  const at = new Array<number>(kids.length).fill(0);
  for (let k = 1; k < kids.length; k++) {
    // Where each branch above would let this one sit; the lowest wins.
    let need = -Infinity;
    let binding = k - 1;
    const wants = new Array<number>(k);
    for (let j = 0; j < k; j++) {
      wants[j] = at[j] + separation(shapes[j], shapes[k]);
      if (wants[j] > need) {
        need = wants[j];
        binding = j;
      }
    }
    // Pushed down by a branch further up than its neighbour: the branches
    // between share the extra space evenly (Walker).
    if (binding < k - 1) {
      let neighbours = -Infinity;
      for (let j = binding + 1; j < k; j++)
        neighbours = Math.max(neighbours, wants[j]);
      const extra = need - neighbours;
      if (extra > 0) {
        const span = k - binding;
        for (let i = binding + 1; i < k; i++)
          at[i] += (extra * (i - binding)) / span;
      }
    }
    at[k] = need;
  }
  // The parent half way between its first and last child.
  const middle = (at[0] + at[kids.length - 1]) / 2;
  const top = [0];
  const bottom = [0];
  kids.forEach((kid, i) => {
    const row = at[i] - middle;
    rows.set(kid, row);
    const shape = shapes[i];
    for (let d = 0; d < shape.top.length; d++) {
      const level = d + 1;
      const t = shape.top[d] + row;
      const b = shape.bottom[d] + row;
      top[level] = top[level] === undefined ? t : Math.min(top[level], t);
      bottom[level] =
        bottom[level] === undefined ? b : Math.max(bottom[level], b);
    }
  });
  return { top, bottom };
}

/** One tree laid out on its own: its nodes' rows from the root, and its extent. */
interface TreeShape {
  rootId: string;
  ids: string[];
  rows: Map<string, number>;
  minRow: number;
  maxRow: number;
  maxDepth: number;
}

function shapeTree(
  model: TesseractModel,
  rootId: string,
  open: ReadonlySet<string>,
): TreeShape {
  const nodes = model.forest.nodes;
  const childrenOf = (id: string): readonly string[] =>
    open.has(id) ? (nodes.get(id)?.childIds ?? []) : [];
  const relative = new Map<string, number>();
  tidyBranch(rootId, childrenOf, relative);
  const rows = new Map<string, number>([[rootId, 0]]);
  const ids: string[] = [];
  let minRow = 0;
  let maxRow = 0;
  let maxDepth = 1;
  const walk = (id: string, row: number, depth: number) => {
    ids.push(id);
    rows.set(id, row);
    if (row < minRow) minRow = row;
    if (row > maxRow) maxRow = row;
    if (depth > maxDepth) maxDepth = depth;
    for (const kid of childrenOf(id))
      walk(kid, row + (relative.get(kid) ?? 0), depth + 1);
  };
  walk(rootId, 0, 1);
  return { rootId, ids, rows, minRow, maxRow, maxDepth };
}

/** A tree's size on the page, in world pixels. */
const treeWidth = (t: TreeShape) => (t.maxDepth - 1) * DEPTH_PX + LABEL_ROOM_PX;
const treeHeight = (t: TreeShape) => (t.maxRow - t.minRow) * ROW_PX;

/**
 * Which column each tree goes in: stacked in order, a new column when the
 * next tree would pass `limit`. Returns each tree's column.
 */
function stack(heights: readonly number[], limit: number): number[] {
  const gap = TREE_GAP_ROWS * ROW_PX;
  const columns: number[] = [];
  let column = 0;
  let filled = -1;
  for (const h of heights) {
    if (filled >= 0 && filled + gap + h > limit) {
      column += 1;
      filled = -1;
    }
    filled = filled < 0 ? h : filled + gap + h;
    columns.push(column);
  }
  return columns;
}

/** The forest's size for a stacking: total width and tallest column. */
function measure(
  columns: readonly number[],
  widths: readonly number[],
  heights: readonly number[],
): { width: number; height: number } {
  const gap = TREE_GAP_ROWS * ROW_PX;
  const colWidth: number[] = [];
  const colHeight: number[] = [];
  columns.forEach((c, i) => {
    colWidth[c] = Math.max(colWidth[c] ?? 0, widths[i]);
    colHeight[c] =
      colHeight[c] === undefined ? heights[i] : colHeight[c] + gap + heights[i];
  });
  const width =
    colWidth.reduce((sum, w) => sum + w, 0) +
    COLUMN_GAP_PX * Math.max(0, colWidth.length - 1);
  return { width, height: Math.max(0, ...colHeight) };
}

/**
 * The columns to stack trees of these sizes into, closest to 16:10. Every
 * height a run of consecutive trees stacks to is tried as the limit.
 */
export function packColumns(
  widths: readonly number[],
  heights: readonly number[],
): number[] {
  if (heights.length === 0) return [];
  const gap = TREE_GAP_ROWS * ROW_PX;
  const limits = new Set<number>();
  for (let i = 0; i < heights.length; i++) {
    let run = -gap;
    for (let j = i; j < heights.length; j++) {
      run += gap + heights[j];
      limits.add(run);
    }
  }
  let best: { columns: number[]; score: number; area: number } | null = null;
  for (const limit of [...limits].sort((a, b) => a - b)) {
    const columns = stack(heights, limit);
    const { width, height } = measure(columns, widths, heights);
    // A forest of single rows has no height to speak of: count it as one row.
    const tall = Math.max(height, ROW_PX);
    const score = Math.abs(Math.log(width / tall / TARGET_ASPECT));
    const area = width * tall;
    if (
      !best ||
      score < best.score - 1e-9 ||
      (Math.abs(score - best.score) <= 1e-9 && area < best.area)
    ) {
      best = { columns, score, area };
    }
  }
  return best!.columns;
}

/** Lay out the forest with these nodes open (see the top of this file). */
export function layoutForest(
  model: TesseractModel,
  open: ReadonlySet<string>,
): ForestLayout {
  const shapes = model.rootIds.map((id) => shapeTree(model, id, open));
  const widths = shapes.map(treeWidth);
  const heights = shapes.map(treeHeight);
  const columns = packColumns(widths, heights);

  // Each column's left edge and width.
  const colWidth: number[] = [];
  columns.forEach((c, i) => {
    colWidth[c] = Math.max(colWidth[c] ?? 0, widths[i]);
  });
  const colLeft: number[] = [];
  let left = 0;
  colWidth.forEach((w, c) => {
    colLeft[c] = left;
    left += w + COLUMN_GAP_PX;
  });

  const count = shapes.reduce((n, s) => n + s.ids.length, 0);
  const ids: string[] = [];
  const indexOf = new Map<string, number>();
  const parent = new Int32Array(count).fill(-1);
  const depth = new Uint8Array(count);
  const xy = new Float32Array(count * 2);
  const openFlags = new Uint8Array(count);
  const trees: TreeBox[] = [];
  const colFilled: number[] = [];
  const gap = TREE_GAP_ROWS * ROW_PX;
  let height = 0;

  shapes.forEach((shape, t) => {
    const c = columns[t];
    const top = colFilled[c] === undefined ? 0 : colFilled[c] + gap;
    colFilled[c] = top + heights[t];
    height = Math.max(height, colFilled[c]);
    trees.push({
      rootId: shape.rootId,
      x: colLeft[c],
      y: top,
      width: widths[t],
      height: heights[t],
      column: c,
    });
    for (const id of shape.ids) {
      const i = ids.length;
      ids.push(id);
      indexOf.set(id, i);
      const node = model.forest.nodes.get(id)!;
      depth[i] = node.depth;
      parent[i] =
        node.parentId === null ? -1 : (indexOf.get(node.parentId) ?? -1);
      xy[2 * i] = colLeft[c] + (node.depth - 1) * DEPTH_PX;
      xy[2 * i + 1] = top + ((shape.rows.get(id) ?? 0) - shape.minRow) * ROW_PX;
      openFlags[i] = open.has(id) && node.childIds.length > 0 ? 1 : 0;
    }
  });

  const width = Math.max(0, left - COLUMN_GAP_PX);
  return {
    ids,
    indexOf,
    parent,
    depth,
    xy,
    open: openFlags,
    trees,
    width,
    height,
  };
}

/* ── What is open ───────────────────────────────────────────────────── */

/** Open every node shallower than `depth`, so the forest shows `depth` chords deep. */
export function openToDepth(model: TesseractModel, depth: number): Set<string> {
  const open = new Set<string>();
  for (const node of model.forest.nodes.values()) {
    if (node.depth < depth && node.childIds.length > 0) open.add(node.id);
  }
  return open;
}

/** Every node with something below it, open. */
export function openAll(model: TesseractModel): Set<string> {
  return openToDepth(model, Infinity);
}

/** `open` with `id` and every node below it opened too (Alt-click). */
export function openBranch(
  model: TesseractModel,
  open: ReadonlySet<string>,
  id: string,
): Set<string> {
  const next = new Set(open);
  const walk = (at: string) => {
    const node = model.forest.nodes.get(at);
    if (!node || node.childIds.length === 0) return;
    next.add(at);
    for (const child of node.childIds) walk(child);
  };
  walk(id);
  return next;
}

/** `open` with every node on the way down to `id` opened, so `id` is drawn. */
export function openPathTo(
  model: TesseractModel,
  open: ReadonlySet<string>,
  id: string,
): Set<string> {
  const next = new Set(open);
  let at = model.forest.nodes.get(id)?.parentId ?? null;
  while (at !== null) {
    next.add(at);
    at = model.forest.nodes.get(at)?.parentId ?? null;
  }
  return next;
}

/** Whether every node on the way down to `id` is open, so `id` is drawn. */
export function isShown(
  model: TesseractModel,
  open: ReadonlySet<string>,
  id: string,
): boolean {
  let at = model.forest.nodes.get(id)?.parentId ?? null;
  while (at !== null) {
    if (!open.has(at)) return false;
    at = model.forest.nodes.get(at)?.parentId ?? null;
  }
  return model.forest.nodes.has(id);
}
