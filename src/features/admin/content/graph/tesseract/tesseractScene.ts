import type { ChordNotation } from '@/lib/chordNotation';
import type { SceneGraph } from '../map/graphScene';
import { NODE_FLAG_END, NODE_STATE_PATH } from '../map/render/GraphRenderer';
import type { ForestLayout } from './tesseractLayout';
import type { TesseractModel } from './tesseractModel';
import { chordNamer, chordRgb } from './tesseractNaming';

/**
 * What Tesseract hands the shared stage (`map/useGraphStage.ts`) to draw:
 * the drawn openings as the scene's graph, with their names, sizes,
 * colours and flags, built from the model, the layout, the key and the
 * notation. Pure, so a test can read exactly what would be drawn.
 *
 * - Lines are the tree's own, parent to child, drawn straight.
 * - A node's name is its chord in the picked key and notation. A node
 *   whose branch is folded away adds how many progressions lie below it:
 *   "E♭Δ7 · 298".
 * - Every node wears its chord's Prism colour in the key (grey when Prism
 *   does not know the chord).
 * - A node where a progression ends is flagged (`NODE_FLAG_END`): it is
 *   drawn as a ring with a dot inside, in its own colour.
 * - Starting chords are the biggest dots; a folded node grows a little
 *   with what it holds, so a heavy branch reads as heavy before it opens.
 */

/** A starting chord's dot, in device pixels at scale 1. */
export const ROOT_RADIUS = 9;
/** Every other dot's least size. */
export const NODE_RADIUS = 5.5;
/** An end's dot, a little bigger so its ring and inner dot both show. */
export const END_RADIUS = 6.5;

/** Tesseract's graph for the scene: the scene's own, with each node's parent. */
export interface TesseractSceneGraph extends SceneGraph {
  /** Each node's parent's number, or -1 for a starting chord. */
  readonly parents: Int32Array;
}

export interface TesseractDrawing {
  graph: TesseractSceneGraph;
  radii: Float32Array;
  colors: Uint8Array;
  /** `NODE_FLAG_END` per node; the canvas adds the rings. */
  endFlags: Uint8Array;
}

/** A drawn node's label: its chord's name, and the count when folded. */
export function nodeLabel(
  name: string,
  folded: boolean,
  countBelow: number,
): string {
  return folded ? `${name} · ${countBelow.toLocaleString('en-US')}` : name;
}

/** Build what the stage draws for this layout, key and notation. */
export function buildTesseractDrawing(
  model: TesseractModel,
  layout: ForestLayout,
  pc: number,
  notation: ChordNotation,
): TesseractDrawing {
  const count = layout.ids.length;
  const name = chordNamer(notation, pc);
  const nodes: { label: string }[] = new Array(count);
  const weights = new Uint32Array(count);
  const radii = new Float32Array(count);
  const colors = new Uint8Array(count * 4);
  const endFlags = new Uint8Array(count);
  const colourOf = new Map<string, readonly [number, number, number]>();

  for (let i = 0; i < count; i++) {
    const node = model.forest.nodes.get(layout.ids[i])!;
    const folded = node.childIds.length > 0 && layout.open[i] === 0;
    nodes[i] = { label: nodeLabel(name(node.chord), folded, node.countBelow) };
    // Busy branches get their labels first when there is no room for all.
    weights[i] = node.countBelow + (node.depth === 1 ? 10_000 : 0);
    const end = node.endIds.length > 0;
    endFlags[i] = end ? NODE_FLAG_END : 0;
    radii[i] =
      node.depth === 1
        ? ROOT_RADIUS
        : (end ? END_RADIUS : NODE_RADIUS) +
          (folded ? Math.min(3, 0.3 * Math.sqrt(node.countBelow)) : 0);
    let rgb = colourOf.get(node.chord);
    if (!rgb) {
      rgb = chordRgb(node.chord, pc);
      colourOf.set(node.chord, rgb);
    }
    colors[4 * i] = rgb[0];
    colors[4 * i + 1] = rgb[1];
    colors[4 * i + 2] = rgb[2];
    colors[4 * i + 3] = 255;
  }

  // One line per parent and child, the parent (always drawn first) first.
  const children = new Uint32Array(count);
  let linkCount = 0;
  for (let i = 0; i < count; i++) {
    const p = layout.parent[i];
    if (p >= 0) {
      linkCount += 1;
      children[p] += 1;
    }
  }
  const links = new Uint32Array(linkCount * 2);
  const linkFlags = new Uint8Array(linkCount);
  const neighbourOffsets = new Uint32Array(count + 1);
  for (let i = 0; i < count; i++) {
    neighbourOffsets[i + 1] =
      neighbourOffsets[i] + children[i] + (layout.parent[i] >= 0 ? 1 : 0);
  }
  const neighbours = new Uint32Array(neighbourOffsets[count]);
  const fill = neighbourOffsets.slice(0, count);
  let k = 0;
  for (let i = 0; i < count; i++) {
    const p = layout.parent[i];
    if (p < 0) continue;
    links[2 * k] = p;
    links[2 * k + 1] = i;
    k += 1;
    neighbours[fill[p]++] = i;
    neighbours[fill[i]++] = p;
  }

  return {
    graph: {
      count,
      ids: layout.ids,
      nodes,
      weights,
      links,
      linkFlags,
      neighbourOffsets,
      neighbours,
      parents: layout.parent,
    },
    radii,
    colors,
    endFlags,
  };
}

/**
 * Tesseract's hover: the way back to the tree's root is lit (its lines in
 * the highlight), everything else fades. For the scene's `markHover`.
 */
export function markRootPath(
  parents: Int32Array,
  index: number,
  state: Uint8Array,
): void {
  let at = parents[index] ?? -1;
  while (at >= 0) {
    state[at] = NODE_STATE_PATH;
    at = parents[at];
  }
  // The hovered node is on its own path too; the scene marks it hovered.
  state[index] = NODE_STATE_PATH;
}
