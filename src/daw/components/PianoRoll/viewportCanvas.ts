// ── Viewport-sized piano-roll canvases ──────────────────────────────────────
// The roll's grid, ruler and velocity lane used to be canvases the size of
// the whole clip, so memory and repaint cost grew with clip length × zoom, and
// a long clip at high zoom passed the browser's canvas size limit and went
// blank (finding pianoroll-05). Each lane now keeps two canvases in its
// scroll content:
//
//   - the hit surface: the canvas the mouse handlers already measure. It is
//     still sized to the whole clip, so it sets the scroll extent and the
//     handlers keep their content coordinates, but its bitmap is empty;
//   - the paint canvas behind it, covering only the visible window plus a
//     margin. It is drawn through a translation by the window's origin, so
//     the drawing code keeps working in content coordinates.

/** Painted beyond each edge of the view, so a scroll rarely shows blank. */
export const PAINT_MARGIN = 256;

/** A rectangle in a lane's content coordinates (CSS px). */
export interface PaintRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** What a lane last painted, and the content size it painted against. */
export interface PaintedWindow {
  rect: PaintRect;
  contentW: number;
  contentH: number;
}

/** The part of a scroll container's content that is on screen. */
export function visibleRect(el: HTMLElement): PaintRect {
  return {
    x: el.scrollLeft,
    y: el.scrollTop,
    w: el.clientWidth,
    h: el.clientHeight,
  };
}

/** The visible rect grown by `margin` on every side, kept inside the content. */
export function paintRect(
  view: PaintRect,
  contentW: number,
  contentH: number,
  margin = PAINT_MARGIN,
): PaintRect {
  const x = Math.max(0, Math.floor(view.x - margin));
  const y = Math.max(0, Math.floor(view.y - margin));
  const right = Math.min(contentW, Math.ceil(view.x + view.w + margin));
  const bottom = Math.min(contentH, Math.ceil(view.y + view.h + margin));
  return { x, y, w: Math.max(0, right - x), h: Math.max(0, bottom - y) };
}

/**
 * Whether a lane has to repaint for what it shows now: nothing painted yet,
 * part of the view outside the painted window, or the view within half a
 * margin of a painted edge that is not also the content's edge. The last
 * repaints a steady scroll before anything blank can come into view.
 */
export function needsRepaint(
  painted: PaintedWindow | undefined,
  view: PaintRect,
  margin = PAINT_MARGIN,
): boolean {
  if (!painted) return true;
  const { rect, contentW, contentH } = painted;
  const right = rect.x + rect.w;
  const bottom = rect.y + rect.h;
  if (
    view.x < rect.x ||
    view.y < rect.y ||
    view.x + view.w > right ||
    view.y + view.h > bottom
  ) {
    return true;
  }
  const slack = margin / 2;
  return (
    (rect.x > 0 && view.x < rect.x + slack) ||
    (rect.y > 0 && view.y < rect.y + slack) ||
    (right < contentW && view.x + view.w > right - slack) ||
    (bottom < contentH && view.y + view.h > bottom - slack)
  );
}

/** Gives a hit surface the content's size with an empty bitmap. */
export function sizeHitSurface(
  canvas: HTMLCanvasElement,
  w: number,
  h: number,
): void {
  if (canvas.width !== 0) canvas.width = 0;
  if (canvas.height !== 0) canvas.height = 0;
  setPx(canvas.style, 'width', w);
  setPx(canvas.style, 'height', h);
}

/**
 * Sizes and places a paint canvas over `rect`, and returns its context
 * transformed so that drawing in content coordinates lands in place. The
 * bitmap is reallocated only when the window's size changes, not as it moves.
 */
export function preparePaintCanvas(
  canvas: HTMLCanvasElement,
  rect: PaintRect,
  dpr: number,
): CanvasRenderingContext2D | null {
  const width = Math.round(rect.w * dpr);
  const height = Math.round(rect.h * dpr);
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  setPx(canvas.style, 'left', rect.x);
  setPx(canvas.style, 'top', rect.y);
  setPx(canvas.style, 'width', rect.w);
  setPx(canvas.style, 'height', rect.h);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, -rect.x * dpr, -rect.y * dpr);
  return ctx;
}

/** Writes a px length only when it changed, so a still window costs nothing. */
function setPx(
  style: CSSStyleDeclaration,
  key: 'left' | 'top' | 'width' | 'height',
  value: number,
): void {
  const px = `${value}px`;
  if (style[key] !== px) style[key] = px;
}
