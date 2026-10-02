/**
 * The Mind Map's camera: where it looks and how close, and the arithmetic
 * that moves it. Every number follows Obsidian's graph view.
 *
 * A camera is the world point at the centre of the canvas (`x`, `y`) and a
 * zoom, in CSS pixels per world unit. World units are CSS pixels at zoom 1,
 * so a camera means the same thing at any canvas size. The viewport is the
 * canvas's size in CSS pixels, and its pixel ratio; screen points are CSS
 * pixels from its top left corner.
 *
 * - Obsidian's own zoom (its "scale") is in device pixels and runs from
 *   1/128 to 8. On a Retina screen a device pixel is half a CSS pixel, so
 *   the camera's zoom runs from 1/128 to 8 divided by the pixel ratio (see
 *   `sizing.ts` on the two kinds of pixel).
 * - The wheel multiplies the zoom by 1.5^(−Δ/120), where Δ is the wheel's
 *   movement in pixels. A browser reports lines (×40) or pages (×800) for
 *   some devices, which are turned into pixels first, as Obsidian does. One
 *   click of a mouse wheel is about 120 pixels, so one click zooms by 1.5.
 * - Zooming in keeps the point under the cursor where it is. Zooming out
 *   pulls back about the middle of the view instead, which is what
 *   Obsidian does, so the graph never drifts off to a corner as you leave.
 * - The arrow keys move the view 40 pixels, or 120 with Shift; `=` and `−`
 *   zoom one wheel click about the middle.
 * - A flung pan coasts on, losing a tenth of its speed every frame.
 * - "Fit" frames a set of points with a margin, and never zooms in past 1,
 *   so a small local graph is not blown up to giant dots.
 *
 * The module is pure: it never reads the DOM. Callers hand in the numbers a
 * wheel or key event carries.
 */

import { pixelRatio } from './sizing';

export interface Camera {
  /** The world point at the centre of the canvas. */
  readonly x: number;
  readonly y: number;
  /** CSS pixels per world unit. */
  readonly zoom: number;
}

export interface Viewport {
  /** The canvas size in CSS pixels. */
  readonly width: number;
  readonly height: number;
  /** The canvas's pixel ratio (device pixels per CSS pixel). 1 when left out. */
  readonly dpr?: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** The furthest out Obsidian's scale goes (device pixels per world unit). */
export const ZOOM_MIN = 1 / 128;
/** The furthest in Obsidian's scale goes (device pixels per world unit). */
export const ZOOM_MAX = 8;

/** The wheel movement, in pixels, of one mouse-wheel click. */
export const WHEEL_NOTCH_PX = 120;
/** How much one wheel click zooms. */
export const WHEEL_ZOOM_STEP = 1.5;
/** One wheel "line" in pixels (`deltaMode` 1). */
export const WHEEL_LINE_PX = 40;
/** One wheel "page" in pixels (`deltaMode` 2). */
export const WHEEL_PAGE_PX = 800;

/** How far one arrow key press moves the view, in screen pixels. */
export const KEY_PAN_PX = 40;
/** How many times further it moves with Shift held. */
export const KEY_PAN_SHIFT = 3;

/** How much of its speed a flung pan keeps from one frame to the next. */
export const MOMENTUM_KEEP_PER_FRAME = 0.9;
/** A frame at 60 frames a second, in milliseconds. */
export const FRAME_MS = 1000 / 60;
/** A coasting pan slower than this (screen pixels per millisecond) stops. */
export const MOMENTUM_STOP_SPEED = 0.01;
/** How far back a release looks to measure a fling, in milliseconds. */
export const FLING_WINDOW_MS = 100;

/** The margin "Fit" leaves round the graph, in screen pixels. */
export const FIT_PADDING_PX = 40;
/** The closest "Fit" zooms in. */
export const FIT_MAX_ZOOM = 1;

/** The camera before anything has been laid out. */
export const HOME_CAMERA: Camera = Object.freeze({ x: 0, y: 0, zoom: 1 });

/**
 * A zoom held to the camera's range on a canvas of this pixel ratio: Obsidian's
 * 1/128 to 8, in device pixels. A zoom that is not a number is 1.
 */
export function clampZoom(zoom: number, dpr = 1): number {
  if (Number.isNaN(zoom)) return 1;
  const ratio = pixelRatio(dpr);
  return Math.min(ZOOM_MAX / ratio, Math.max(ZOOM_MIN / ratio, zoom));
}

/* ── Between screen and world ───────────────────────────────────────────── */

/** A world point → where it is on screen. */
export function worldToScreen(
  camera: Camera,
  viewport: Viewport,
  point: Point,
): Point {
  return {
    x: (point.x - camera.x) * camera.zoom + viewport.width / 2,
    y: (point.y - camera.y) * camera.zoom + viewport.height / 2,
  };
}

/** A screen point → the world point under it. */
export function screenToWorld(
  camera: Camera,
  viewport: Viewport,
  point: Point,
): Point {
  return {
    x: (point.x - viewport.width / 2) / camera.zoom + camera.x,
    y: (point.y - viewport.height / 2) / camera.zoom + camera.y,
  };
}

/* ── Zoom ───────────────────────────────────────────────────────────────── */

/** A wheel event's vertical movement in pixels, whatever unit it came in. */
export function wheelPixels(deltaY: number, deltaMode = 0): number {
  if (!Number.isFinite(deltaY)) return 0;
  if (deltaMode === 1) return deltaY * WHEEL_LINE_PX;
  if (deltaMode === 2) return deltaY * WHEEL_PAGE_PX;
  return deltaY;
}

/** How much a wheel movement of `pixels` zooms: 1.5^(−pixels/120). */
export const wheelZoomFactor = (pixels: number): number =>
  WHEEL_ZOOM_STEP ** (-pixels / WHEEL_NOTCH_PX);

/**
 * Zoom by `factor` keeping the screen point `anchor` over the same world
 * point. The zoom is held to its range, and the anchor still holds when it
 * is. Pinching uses this with the pinch's midpoint, both ways.
 */
export function zoomAround(
  camera: Camera,
  viewport: Viewport,
  factor: number,
  anchor: Point,
): Camera {
  const zoom = clampZoom(camera.zoom * factor, viewport.dpr);
  if (zoom === camera.zoom) return camera;
  const world = screenToWorld(camera, viewport, anchor);
  return {
    x: world.x - (anchor.x - viewport.width / 2) / zoom,
    y: world.y - (anchor.y - viewport.height / 2) / zoom,
    zoom,
  };
}

/** Zoom by `factor` about the middle of the view, on a canvas of this pixel ratio. */
export const zoomBy = (camera: Camera, factor: number, dpr = 1): Camera => {
  const zoom = clampZoom(camera.zoom * factor, dpr);
  return zoom === camera.zoom ? camera : { ...camera, zoom };
};

/**
 * Obsidian's zoom: in about `cursor` (when there is one), out about the
 * middle of the view.
 */
export function zoomAt(
  camera: Camera,
  viewport: Viewport,
  factor: number,
  cursor?: Point | null,
): Camera {
  return factor > 1 && cursor
    ? zoomAround(camera, viewport, factor, cursor)
    : zoomBy(camera, factor, viewport.dpr);
}

/** A wheel event, as far as zooming needs it. */
export interface WheelInput {
  readonly deltaY: number;
  /** 0 pixels, 1 lines, 2 pages (`WheelEvent.deltaMode`). */
  readonly deltaMode?: number;
  /** The cursor, in CSS pixels from the canvas's top left corner. */
  readonly x: number;
  readonly y: number;
}

/** The camera after a wheel event (or a trackpad pinch, which is one). */
export function wheelZoom(
  camera: Camera,
  viewport: Viewport,
  wheel: WheelInput,
): Camera {
  const factor = wheelZoomFactor(wheelPixels(wheel.deltaY, wheel.deltaMode));
  return zoomAt(camera, viewport, factor, { x: wheel.x, y: wheel.y });
}

/* ── Pan ────────────────────────────────────────────────────────────────── */

/**
 * The camera after dragging the graph by (dx, dy) screen pixels: the graph
 * follows the pointer, so the camera moves the other way.
 */
export const panBy = (camera: Camera, dx: number, dy: number): Camera => ({
  x: camera.x - dx / camera.zoom,
  y: camera.y - dy / camera.zoom,
  zoom: camera.zoom,
});

const KEY_DIRECTION: Readonly<Record<string, readonly [number, number]>> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/**
 * The camera after an arrow key: the view moves the way the arrow points
 * (Right shows more of what is to the right), 40 screen pixels, or 120 with
 * Shift. Null for any other key.
 */
export function keyPan(
  camera: Camera,
  key: string,
  shift = false,
): Camera | null {
  const direction = KEY_DIRECTION[key];
  if (!direction) return null;
  const step = (KEY_PAN_PX * (shift ? KEY_PAN_SHIFT : 1)) / camera.zoom;
  return {
    x: camera.x + direction[0] * step,
    y: camera.y + direction[1] * step,
    zoom: camera.zoom,
  };
}

/** A pan's speed: screen pixels per millisecond, the way the graph moves. */
export interface PanVelocity {
  readonly vx: number;
  readonly vy: number;
}

/** A pointer position and when it was there (milliseconds). */
export interface PointerSample {
  readonly x: number;
  readonly y: number;
  readonly t: number;
}

/**
 * How fast the pointer was moving when it let go, from its recent
 * positions: the movement over the last 100 milliseconds. Null when there is
 * too little to go on.
 */
export function flingVelocity(
  samples: readonly PointerSample[],
): PanVelocity | null {
  if (samples.length < 2) return null;
  const last = samples[samples.length - 1];
  let first = last;
  for (let i = samples.length - 2; i >= 0; i--) {
    if (last.t - samples[i].t > FLING_WINDOW_MS) break;
    first = samples[i];
  }
  const dt = last.t - first.t;
  if (!(dt > 0)) return null;
  return { vx: (last.x - first.x) / dt, vy: (last.y - first.y) / dt };
}

/**
 * One step of a coasting pan, `dt` milliseconds long: the graph moves on at
 * its speed, which then drops by a tenth per frame's worth of time. The
 * velocity comes back null once it is too slow to see.
 */
export function momentumStep(
  camera: Camera,
  velocity: PanVelocity,
  dt: number = FRAME_MS,
): { camera: Camera; velocity: PanVelocity | null } {
  const moved = panBy(camera, velocity.vx * dt, velocity.vy * dt);
  const keep = MOMENTUM_KEEP_PER_FRAME ** (dt / FRAME_MS);
  const vx = velocity.vx * keep;
  const vy = velocity.vy * keep;
  const still = Math.hypot(vx, vy) < MOMENTUM_STOP_SPEED;
  return { camera: moved, velocity: still ? null : { vx, vy } };
}

/* ── Fit ────────────────────────────────────────────────────────────────── */

export interface Bounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/**
 * The box round a set of positions (`x0, y0, x1, y1, …`), skipping any not
 * placed yet (NaN). Null when none are placed.
 */
export function boundsOf(xy: ArrayLike<number>, count?: number): Bounds | null {
  const n = count ?? Math.floor(xy.length / 2);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < n; i++) {
    const x = xy[2 * i];
    const y = xy[2 * i + 1];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return minX <= maxX ? { minX, minY, maxX, maxY } : null;
}

export interface FitOptions {
  /** The margin round the box, in screen pixels. 40 when left out. */
  readonly padding?: number;
  /** The closest the fit may zoom in. 1 when left out. */
  readonly maxZoom?: number;
}

/**
 * The camera that frames a box: centred on it, as close as the margin and
 * `maxZoom` allow. A single point is shown at `maxZoom`.
 */
export function fitToBounds(
  bounds: Bounds,
  viewport: Viewport,
  options: FitOptions = {},
): Camera {
  const padding = options.padding ?? FIT_PADDING_PX;
  const ratio = pixelRatio(viewport.dpr ?? 1);
  const maxZoom = Math.min(options.maxZoom ?? FIT_MAX_ZOOM, ZOOM_MAX / ratio);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  // A canvas smaller than its margins still frames what it can.
  const roomX =
    viewport.width > 2 * padding
      ? viewport.width - 2 * padding
      : viewport.width;
  const roomY =
    viewport.height > 2 * padding
      ? viewport.height - 2 * padding
      : viewport.height;
  const fits = [
    width > 0 ? roomX / width : Infinity,
    height > 0 ? roomY / height : Infinity,
  ];
  const zoom = Math.max(ZOOM_MIN / ratio, Math.min(maxZoom, ...fits));
  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
    zoom,
  };
}
