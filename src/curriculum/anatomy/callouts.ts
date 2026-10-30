import type { SceneCamera, ScenePose, TermDef } from './anatomyTypes';
import { termAnchor, type CompiledModel } from './compileModel';
import { projectOffset, type V2 } from './iso';

// ── Callouts ───────────────────────────────────────────────────────────────
// The reference chart's labels: a word in a column at each side of the drawing
// and a dashed leader to its part. Each side reads top to bottom in the order
// its parts sit on the page, so leaders don't cross, and the words never
// touch. All in the frame's units; the word's size comes from how large the
// drawing is on screen, so it stays readable at any width.

const ROW_EM = 1.42;
const MARGIN = 0.9;
/** A word's width, in em, for Glacial's average letter. */
const EM_PER_CHAR = 0.54;

export interface Frame {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The drawing's frame, grown to the stage's shape about the same middle, so
 *  the label columns can use all of the stage. */
export function frameFor(
  view: Frame,
  stage: { width: number; height: number },
): Frame {
  if (stage.width <= 0 || stage.height <= 0) return view;
  const shape = stage.width / stage.height;
  const width = Math.max(view.width, view.height * shape);
  const height = Math.max(view.height, view.width / shape);
  return {
    x: view.x - (width - view.width) / 2,
    y: view.y - (height - view.height) / 2,
    width,
    height,
  };
}

/** How far the guitar shrinks to leave room for the columns of words. */
export function labelsScale(
  view: Frame,
  frame: Frame,
  terms: readonly { name: string }[],
  size: number,
): number {
  const longest = Math.max(...terms.map((term) => term.name.length));
  const column = longest * size * EM_PER_CHAR + MARGIN + 1;
  return Math.max(0.55, Math.min(1, (frame.width - column * 2) / view.width));
}

export interface Callout {
  termId: string;
  text: string;
  side: 'left' | 'right';
  /** The word's size, in the frame's units. */
  size: number;
  /** The word's outer edge and baseline. */
  x: number;
  y: number;
  /** The part the leader follows. */
  part: string;
  /** Its anchor when the part is home. */
  anchor: V2;
}

/** A point of the guitar, through the camera, on the page. */
export const throughCamera = ([x, y]: V2, camera: SceneCamera): V2 => [
  x * camera.scale + camera.x,
  y * camera.scale + camera.y,
];

/** Spreads wanted heights so they keep a row apart and stay in the frame. */
function spread(
  wanted: readonly number[],
  top: number,
  bottom: number,
  row: number,
) {
  const out = [...wanted];
  for (let i = 1; i < out.length; i++) {
    out[i] = Math.max(out[i], out[i - 1] + row);
  }
  let over = (out[out.length - 1] ?? 0) - bottom;
  for (let i = out.length - 1; i >= 0 && over > 0; i--) {
    out[i] -= over;
    over = i > 0 ? out[i - 1] + row - out[i] : 0;
  }
  const under = top - (out[0] ?? top);
  if (under > 0) return out.map((y) => y + under);
  return out;
}

export function layoutCallouts(
  model: CompiledModel,
  terms: readonly TermDef[],
  pose: ScenePose,
  camera: SceneCamera,
  size: number,
  frame: Frame = model.view,
): Callout[] {
  const { x, y, width, height } = frame;
  const placed = terms.map((term) => {
    const part = term.parts[0];
    const anchor = termAnchor(model, term);
    const [dx, dy] = projectOffset(pose[part].offset);
    return {
      term,
      part,
      anchor,
      at: throughCamera([anchor[0] + dx, anchor[1] + dy], camera),
    };
  });

  // The half furthest up and left of the guitar's diagonal takes the left
  // column, the rest the right: leaders then run over the empty corners, and
  // however the parts are placed neither column overflows.
  const slope = model.view.height / model.view.width;
  const aboveDiagonal = ([px, py]: V2) => -(py + px * slope);
  const byDiagonal = [...placed].sort(
    (a, b) => aboveDiagonal(b.at) - aboveDiagonal(a.at),
  );
  const leftCount = Math.ceil(byDiagonal.length / 2);
  const onLeft = new Set(byDiagonal.slice(0, leftCount));
  // A word alone goes to the side its part is nearer, unless that leaves it
  // no room between the frame's edge and the part: then to the other side.
  if (placed.length === 1) {
    onLeft.clear();
    const [px] = placed[0].at;
    const room = placed[0].term.name.length * size * EM_PER_CHAR + MARGIN + 1.5;
    const nearerLeft = px < x + width / 2;
    const fits = nearerLeft ? px - x >= room : x + width - px >= room;
    if (nearerLeft === fits) onLeft.add(placed[0]);
  }

  const callouts: Callout[] = [];
  for (const side of ['left', 'right'] as const) {
    const column = placed
      .filter((p) => onLeft.has(p) === (side === 'left'))
      .sort((a, b) => a.at[1] - b.at[1]);
    const rows = spread(
      column.map((p) => p.at[1]),
      y + MARGIN + size,
      y + height - MARGIN,
      size * ROW_EM,
    );
    column.forEach((p, i) => {
      callouts.push({
        termId: p.term.id,
        text: p.term.name,
        side,
        size,
        x: side === 'left' ? x + MARGIN : x + width - MARGIN,
        y: rows[i],
        part: p.part,
        anchor: p.anchor,
      });
    });
  }
  return callouts;
}

/** Where a word's leader starts: just past the word. */
export function leaderStart(callout: Callout): V2 {
  const reach = callout.text.length * callout.size * EM_PER_CHAR + 0.35;
  return [
    callout.side === 'left' ? callout.x + reach : callout.x - reach,
    callout.y - callout.size * 0.32,
  ];
}
