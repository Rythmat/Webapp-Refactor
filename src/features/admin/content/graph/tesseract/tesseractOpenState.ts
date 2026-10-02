import { openToDepth } from './tesseractLayout';
import type { OpenSpec } from './tesseractLinks';
import type { TesseractModel } from './tesseractModel';

/**
 * Which openings are open, as the URL keeps it (`tesseractLinks.ts`): a
 * depth every tree is open to, plus the openings opened beyond it, minus
 * the ones folded within it.
 *
 * `encodeOpen` writes the shortest such description of what is open: it
 * tries every depth (one deep, the starting chords alone; two deep …
 * everything) and keeps
 * the one with the fewest differences, so "two deep with one branch opened
 * to its end" is `depth=2` and that branch's few openings, and "everything
 * but one branch" is `depth=all` and that branch. Ties go to two deep, the
 * map's own default, then to the shallower depth. Openings with nothing
 * below them are never listed: opening one shows nothing more.
 *
 * `resolveOpen` reads it back. An opening the library no longer has (a
 * progression edited away) is simply not open; nothing fails.
 *
 * Pure: no React, no DOM.
 */

/** The openings that have something below them, open in `open`. */
function openInner(
  model: TesseractModel,
  open: ReadonlySet<string>,
): Set<string> {
  const out = new Set<string>();
  for (const id of open) {
    if ((model.forest.nodes.get(id)?.childIds.length ?? 0) > 0) out.add(id);
  }
  return out;
}

/** The shortest description of what is open (see the top of this file). */
export function encodeOpen(
  model: TesseractModel,
  open: ReadonlySet<string>,
): OpenSpec {
  const live = openInner(model, open);
  // Every opening with something below it, in the model's order, and the
  // deepest of them: open to one deeper than that is everything.
  const inner = model.order.filter(
    (id) => (model.forest.nodes.get(id)?.childIds.length ?? 0) > 0,
  );
  let deepest = 0;
  for (const id of inner)
    deepest = Math.max(deepest, model.forest.nodes.get(id)!.depth);

  // One deep is the starting chords alone, nothing open: the least a
  // depth can say.
  let best: OpenSpec | null = null;
  let bestCost = Infinity;
  for (let depth = 1; depth <= deepest + 1; depth++) {
    const opened: string[] = [];
    const folded: string[] = [];
    for (const id of inner) {
      const inBase = model.forest.nodes.get(id)!.depth < depth;
      const isOpen = live.has(id);
      if (isOpen && !inBase) opened.push(id);
      else if (!isOpen && inBase) folded.push(id);
    }
    const cost = opened.length + folded.length;
    const better =
      cost < bestCost ||
      (cost === bestCost && depth === 2 && best?.depth !== 2);
    if (better) {
      bestCost = cost;
      best = {
        depth: depth > deepest ? Infinity : depth,
        open: opened,
        fold: folded,
      };
    }
  }
  return best ?? { depth: 1, open: [], fold: [] };
}

/** What an open spec opens, in this model. */
export function resolveOpen(
  model: TesseractModel,
  spec: OpenSpec,
): Set<string> {
  const open = openToDepth(model, spec.depth);
  for (const id of spec.open) {
    if ((model.forest.nodes.get(id)?.childIds.length ?? 0) > 0) open.add(id);
  }
  for (const id of spec.fold) open.delete(id);
  return open;
}
