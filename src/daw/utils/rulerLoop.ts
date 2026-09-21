// ── Ruler loop + playhead: press targets, drag math, drawing ───────────────
//
// Shared by the timeline and the piano roll so both rulers look and behave the
// same. Logic-style gestures; each ruler has two
// lanes: a strip along the top that holds the loop region (drag empty strip to
// draw a loop, drag the loop's body to move it, drag an edge to resize it,
// click it to switch looping on/off), and the bar-number lane below it, where
// a click moves the playhead and the playhead's handle can be grabbed. All
// ranges are song ticks; `snap` is the grid size in ticks.

/** px strip along the top of a ruler that holds the loop region. */
export const LOOP_STRIP_H = 14;

// The playhead: a red line with a grab triangle at the foot of the ruler.
export const PLAYHEAD_COLOR = '#ef4444';
export const PLAYHEAD_HANDLE_W = 12; // px
export const PLAYHEAD_HANDLE_H = 9; // px

/**
 * Draw the loop region in a ruler's loop strip — one look for the timeline and
 * the piano roll: light blue (the selection colour) while looping, gray while
 * off, with triangle handles at both ends. `top` is the strip's y.
 */
export function drawLoopRegion(
  ctx: CanvasRenderingContext2D,
  x1: number,
  x2: number,
  top: number,
  selectionRgb: string,
  enabled: boolean,
): void {
  if (x2 <= x1) return;
  const h = LOOP_STRIP_H;
  ctx.fillStyle = enabled
    ? `rgba(${selectionRgb}, 0.25)`
    : 'rgba(148, 163, 184, 0.14)';
  ctx.fillRect(x1, top, x2 - x1, h);

  const handle = Math.min(8, (x2 - x1) / 2);
  ctx.fillStyle = enabled
    ? `rgb(${selectionRgb})`
    : 'rgba(148, 163, 184, 0.55)';
  ctx.beginPath();
  ctx.moveTo(x1, top);
  ctx.lineTo(x1 + handle, top);
  ctx.lineTo(x1, top + h);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x2, top);
  ctx.lineTo(x2 - handle, top);
  ctx.lineTo(x2, top + h);
  ctx.closePath();
  ctx.fill();
}

export type RulerTarget =
  | 'playhead'
  | 'loop-start'
  | 'loop-end'
  | 'loop-body'
  | 'empty';

export interface LoopRange {
  start: number;
  end: number;
}

/** px either side of a loop edge that grabs the edge rather than the body. */
export const LOOP_EDGE_HIT_PX = 6;

/** px either side of the playhead that grabs its handle in the number lane. */
export const PLAYHEAD_HIT_PX = 6;

/** Loop edge / body / empty for a press at `x`, given the loop's pixel span. */
export function hitTestLoop(
  x: number,
  loopX1: number,
  loopX2: number,
  edgePx: number = LOOP_EDGE_HIT_PX,
): RulerTarget {
  if (loopX2 <= loopX1) return 'empty';
  const toStart = Math.abs(x - loopX1);
  const toEnd = Math.abs(x - loopX2);
  // On a loop too narrow for both edge zones, the nearer edge wins.
  if (toStart <= edgePx || toEnd <= edgePx) {
    return toStart <= toEnd ? 'loop-start' : 'loop-end';
  }
  return x > loopX1 && x < loopX2 ? 'loop-body' : 'empty';
}

/**
 * What a ruler press at (`x`, `y`) lands on. The loop only exists in the top
 * strip; the bar-number lane ignores it, so a click there always moves the
 * playhead — even inside the loop's range (a new project starts with an unused
 * bars 1–4 range, which would otherwise swallow every click in those bars).
 * In that lane, a press on or near the playhead grabs its handle.
 */
export function rulerPressTarget(
  x: number,
  y: number,
  loopX1: number,
  loopX2: number,
  loopStripH: number,
  playheadX: number,
): RulerTarget {
  if (y < loopStripH) return hitTestLoop(x, loopX1, loopX2);
  return Math.abs(x - playheadX) <= PLAYHEAD_HIT_PX ? 'playhead' : 'empty';
}

const snapTick = (tick: number, snap: number) =>
  Math.max(0, Math.round(tick / snap) * snap);

/** The loop range a horizontal drag from `pressTick` to `currentTick` gives. */
export function dragLoopRange(
  target: RulerTarget,
  original: LoopRange,
  pressTick: number,
  currentTick: number,
  snap: number,
): LoopRange {
  switch (target) {
    case 'empty': {
      const a = snapTick(pressTick, snap);
      const b = snapTick(currentTick, snap);
      if (a === b) return { start: a, end: a + snap };
      return { start: Math.min(a, b), end: Math.max(a, b) };
    }
    case 'loop-body': {
      const length = original.end - original.start;
      const shift = Math.round((currentTick - pressTick) / snap) * snap;
      const start = Math.max(0, original.start + shift);
      return { start, end: start + length };
    }
    case 'loop-start':
      return {
        start: Math.max(
          0,
          Math.min(snapTick(currentTick, snap), original.end - snap),
        ),
        end: original.end,
      };
    case 'loop-end':
      return {
        start: original.start,
        end: Math.max(snapTick(currentTick, snap), original.start + snap),
      };
    case 'playhead':
      return original; // dragging the playhead never touches the loop
  }
}
