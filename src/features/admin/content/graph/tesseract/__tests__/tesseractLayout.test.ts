import { describe, expect, it } from 'vitest';
import CHORD_PROGRESSION_LIBRARY from '@/curriculum/data/chordProgressionLibrary';
import {
  DEPTH_PX,
  type ForestLayout,
  isShown,
  layoutForest,
  openAll,
  openBranch,
  openPathTo,
  openToDepth,
  packColumns,
  ROW_PX,
  TARGET_ASPECT,
} from '../tesseractLayout';
import {
  buildTesseractModel,
  DIATONIC_FIRST,
  readProgressionRows,
  type TesseractModel,
} from '../tesseractModel';

/**
 * Tesseract's tidy forest on the real library: no two dots in a column
 * closer than a row, every parent half way between its first and last
 * child, children in the tree's order top to bottom, the trees stacked
 * diatonic first toward 16:10 without overlapping, and the same picture
 * every time.
 */

const model = buildTesseractModel(
  readProgressionRows(CHORD_PROGRESSION_LIBRARY),
);

/** Each drawn node's children, by number, in the order they were drawn. */
function childrenIn(layout: ForestLayout): number[][] {
  const kids = layout.ids.map((): number[] => []);
  layout.parent.forEach((p, i) => {
    if (p >= 0) kids[p].push(i);
  });
  return kids;
}

function checkInvariants(m: TesseractModel, layout: ForestLayout) {
  const n = layout.ids.length;
  // Every node sits in its depth's column of its tree.
  const treeOf = new Map<string, number>();
  layout.trees.forEach((t, k) => treeOf.set(t.rootId, k));
  for (let i = 0; i < n; i++) {
    const node = m.forest.nodes.get(layout.ids[i])!;
    const tree = layout.trees[treeOf.get(node.rootId)!];
    expect(layout.xy[2 * i]).toBeCloseTo(tree.x + (node.depth - 1) * DEPTH_PX);
    expect(layout.xy[2 * i + 1]).toBeGreaterThanOrEqual(tree.y - 1e-3);
    expect(layout.xy[2 * i + 1]).toBeLessThanOrEqual(
      tree.y + tree.height + 1e-3,
    );
  }
  // No two dots in one column of one tree closer than a row.
  const columns = new Map<string, number[]>();
  for (let i = 0; i < n; i++) {
    const key = `${layout.xy[2 * i]}`;
    columns.set(key, [...(columns.get(key) ?? []), layout.xy[2 * i + 1]]);
  }
  for (const ys of columns.values()) {
    ys.sort((a, b) => a - b);
    for (let k = 1; k < ys.length; k++)
      expect(ys[k] - ys[k - 1]).toBeGreaterThanOrEqual(ROW_PX - 1e-3);
  }
  // Parents half way between their first and last child; children in the
  // tree's order, top to bottom.
  const kids = childrenIn(layout);
  for (let i = 0; i < n; i++) {
    const list = kids[i];
    if (list.length === 0) continue;
    const first = layout.xy[2 * list[0] + 1];
    const last = layout.xy[2 * list[list.length - 1] + 1];
    expect(layout.xy[2 * i + 1]).toBeCloseTo((first + last) / 2, 3);
    const order = m.forest.nodes.get(layout.ids[i])!.childIds;
    expect(list.map((c) => layout.ids[c])).toEqual(order);
    for (let k = 1; k < list.length; k++)
      expect(layout.xy[2 * list[k] + 1]).toBeGreaterThan(
        layout.xy[2 * list[k - 1] + 1],
      );
  }
  // Trees never overlap one another.
  for (let a = 0; a < layout.trees.length; a++) {
    for (let b = a + 1; b < layout.trees.length; b++) {
      const s = layout.trees[a];
      const t = layout.trees[b];
      const apart =
        s.x + s.width <= t.x ||
        t.x + t.width <= s.x ||
        s.y + s.height < t.y ||
        t.y + t.height < s.y;
      expect(apart, `${s.rootId} and ${t.rootId} overlap`).toBe(true);
    }
  }
}

describe('the opening forest', () => {
  it('holds every progression, in 18 trees stacked diatonic first', () => {
    expect(model.entries.size).toBe(CHORD_PROGRESSION_LIBRARY.length);
    expect(model.forest.skippedIds).toEqual([]);
    expect(model.rootIds).toHaveLength(18);
    expect(model.rootIds).toEqual(
      DIATONIC_FIRST.filter((id) => model.forest.nodes.has(id)),
    );
    for (const entry of model.entries.values())
      expect(model.forest.endNodeOf.has(entry.id)).toBe(true);
  });
});

describe('the tidy forest', () => {
  it('opens two chords deep by default: the 18 starts and their next chords', () => {
    const layout = layoutForest(model, openToDepth(model, 2));
    const depth2 = [...model.forest.nodes.values()].filter(
      (n) => n.depth <= 2,
    ).length;
    expect(layout.ids).toHaveLength(depth2);
    expect(Math.max(...layout.depth)).toBe(2);
    checkInvariants(model, layout);
  });

  it('keeps its rules fully expanded and one level deep', () => {
    const full = layoutForest(model, openAll(model));
    expect(full.ids).toHaveLength(model.forest.nodes.size);
    checkInvariants(model, full);
    checkInvariants(model, layoutForest(model, openToDepth(model, 1)));
    checkInvariants(model, layoutForest(model, openToDepth(model, 3)));
  });

  it('is the same picture every time', () => {
    const a = layoutForest(model, openToDepth(model, 3));
    const b = layoutForest(model, openToDepth(model, 3));
    expect(b.ids).toEqual(a.ids);
    expect([...b.xy]).toEqual([...a.xy]);
  });

  it('packs toward 16:10', () => {
    for (const depth of [2, 3, Infinity]) {
      const layout = layoutForest(
        model,
        depth === Infinity ? openAll(model) : openToDepth(model, depth),
      );
      const aspect = layout.width / layout.height;
      // Within a factor of two of the target, on the real library.
      expect(Math.abs(Math.log(aspect / TARGET_ASPECT))).toBeLessThan(
        Math.log(2),
      );
    }
  });

  it('chooses the columns closest to 16:10 for given sizes', () => {
    // Four trees 300 wide and 200 tall, 72 apart in a column and 96 between
    // columns: two columns of two is 696 by 472, about 1.47, the closest.
    const columns = packColumns([300, 300, 300, 300], [200, 200, 200, 200]);
    expect(columns).toEqual([0, 0, 1, 1]);
    expect(packColumns([], [])).toEqual([]);
  });

  it('opens a branch, a path and a whole branch below', () => {
    const start = openToDepth(model, 1);
    const target = model.forest.endNodeOf.get(1)!;
    expect(isShown(model, start, target)).toBe(false);
    const path = openPathTo(model, start, target);
    expect(isShown(model, path, target)).toBe(true);
    const layout = layoutForest(model, path);
    expect(layout.indexOf.has(target)).toBe(true);
    checkInvariants(model, layout);

    const all = openBranch(model, start, '1 major7');
    const shown = layoutForest(model, all);
    const below = [...model.forest.nodes.values()].filter(
      (n) => n.rootId === '1 major7',
    ).length;
    expect(
      shown.ids.filter(
        (id) => model.forest.nodes.get(id)!.rootId === '1 major7',
      ),
    ).toHaveLength(below);
    checkInvariants(model, shown);
  });
});
