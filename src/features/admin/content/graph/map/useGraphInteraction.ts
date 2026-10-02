import { type RefObject, useEffect, useRef } from 'react';
import {
  type Camera,
  flingVelocity,
  keyPan,
  panBy,
  type PanVelocity,
  type Point,
  type PointerSample,
  screenToWorld,
  type Viewport,
  WHEEL_ZOOM_STEP,
  wheelPixels,
  wheelZoomFactor,
  zoomAround,
} from './model/camera';

/**
 * How Cortex's graph answers the pointer, the wheel and the keys, as
 * Obsidian's graph view does.
 *
 * The hook listens on the graph's region (the focusable box that holds the
 * canvas) with native listeners, so a wheel can be stopped from scrolling
 * the page and a drag can capture the pointer. It knows nothing about
 * drawing: the canvas hands it a host with the view as it stands and the
 * things a gesture can do (hover, open, pin, move the camera), and the hook
 * turns events into those calls.
 *
 * - Pointing at a dot hovers it: the canvas lights it and its neighbours
 *   and fades the rest. Holding Cmd (or Ctrl) shows its preview card too.
 * - A press that moves no more than 5 px before it is let go is a click: on
 *   a dot it opens that dot's row beside the graph (and makes it current
 *   for the keys); on the background it does nothing.
 * - Moving further turns the press into a drag. Dragging a dot pins it under
 *   the pointer, which keeps the layout warm around it; letting go unpins
 *   it. Dragging the background pans, and a flung pan coasts on, losing a
 *   tenth of its speed a frame (not under reduced motion).
 * - The wheel zooms by 1.5^(−Δ/120), in about the cursor and out about the
 *   middle, between Obsidian's limits, easing there as Obsidian's does (the
 *   scene's `zoomToward`; at once under reduced motion). A trackpad pinch
 *   arrives as a wheel with Ctrl held and takes the same path; two fingers
 *   on a touch screen pinch about their midpoint, following the fingers.
 * - Keys on the focused graph: the arrows pan 40 px (120 with Shift); `=`
 *   and `−` zoom one wheel click about the middle, eased the same way; `0`
 *   fits the graph; `/` goes to Find; `[`
 *   and `]` step back and forth through the current item's neighbours;
 *   Enter opens the current item; `L` opens its local graph; Escape lets go
 *   of the current item and the hover. Keys typed into a field, or with Cmd,
 *   Ctrl or Alt held (the browser's own shortcuts), are left alone.
 *
 * Right-clicking is the context menu's (`GraphContextMenu`), which asks the
 * canvas what is under the pointer; this hook leaves the right button alone.
 */

/** A press moving further than this, in CSS pixels, is a drag, not a click. */
const CLICK_SLOP_PX = 5;

/** A fling slower than this (CSS pixels per millisecond) does not coast. */
const FLING_MIN_SPEED = 0.05;

/** What the hook needs from the canvas. */
export interface InteractionHost {
  /** The camera and the stage's size now. */
  camera(): Camera;
  viewport(): Viewport;
  /** The node under a point on the stage (CSS pixels), or -1. */
  hitTest(x: number, y: number): number;
  /** Move the camera; `byUser` stops the graph from fitting itself. */
  setCamera(camera: Camera, byUser: boolean): void;
  /**
   * Zoom by `factor` from where the zoom is heading, easing there: about
   * `at` when zooming in, about the middle when zooming out or with no point.
   */
  zoom(factor: number, at: Point | null): void;
  /** Hover a node (-1 for none), with the pointer and whether to preview it. */
  hover(index: number, at: Point | null, preview: boolean): void;
  /** Hold a node at a world point; let it go. */
  pin(index: number, x: number, y: number): void;
  unpin(index: number): void;
  /**
   * A click on a node, with the keys held as it was let go (Tesseract's
   * Alt-click opens a whole branch; in Cortex, Cmd- or Ctrl-click opens a
   * progression's row beside the graph instead of going to Tesseract).
   */
  open(index: number, keys?: PressKeys): void;
  /** Coast the camera at this velocity (a flung pan). */
  fling(velocity: PanVelocity): void;
  /** Stop any camera motion in progress (a fling, a flight). */
  stopMotion(): void;
  fit(): void;
  /** Put the keyboard in Find. */
  find(): void;
  /** The node the keys act on, or -1. */
  current(): number;
  /** Step to the previous (−1) or next (+1) neighbour of the current node. */
  step(direction: 1 | -1): void;
  /** Open the current node, or its local graph. */
  openCurrent(): void;
  localCurrent(): void;
  /** Let go of the current node and the hover. */
  clear(): void;
  reducedMotion(): boolean;
  /**
   * A key on the focused graph, offered to the canvas before the hook's own
   * keys (none with Cmd, Ctrl or Alt held). True when the canvas used it:
   * the hook then stops it there. Tesseract walks its trees with the arrows
   * this way; Cortex has none, and the arrows pan.
   */
  key?(e: KeyboardEvent): boolean;
}

/** The keys held when a click was let go. */
export interface PressKeys {
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
}

/** Keys typed here belong to the field, not the graph. */
const isTyping = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) return false;
  if (target.closest('[data-graph-settings]')) return true;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
};

/** A Mac's Control-click is a right-click (the context menu's), not a press. */
const isMacContextClick = (e: PointerEvent): boolean =>
  e.ctrlKey &&
  typeof navigator !== 'undefined' &&
  /Mac|iP(hone|ad|od)/.test(navigator.platform || navigator.userAgent);

interface Press {
  pointerId: number;
  start: Point;
  last: Point;
  node: number;
  /** 'press' until it moves past the slop. */
  mode: 'press' | 'drag' | 'pan';
  samples: PointerSample[];
}

export function useGraphInteraction(
  regionRef: RefObject<HTMLElement | null>,
  host: InteractionHost,
): void {
  const hostRef = useRef(host);
  hostRef.current = host;

  useEffect(() => {
    const found = regionRef.current;
    if (!found) return;
    const region: HTMLElement = found;
    const h = () => hostRef.current;

    let press: Press | null = null;
    /** Touch pointers down, for a two-finger pinch. */
    const touches = new Map<number, Point>();
    let pinch: { distance: number; mid: Point } | null = null;
    /** Cmd or Ctrl held, for the preview card. */
    let previewKey = false;
    let lastPointer: Point | null = null;

    const stagePoint = (e: { clientX: number; clientY: number }): Point => {
      const rect = region.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const worldPoint = (p: Point) =>
      screenToWorld(h().camera(), h().viewport(), p);

    const pinchOf = () => {
      const [a, b] = [...touches.values()];
      return {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      };
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 || isMacContextClick(e)) return;
      const p = stagePoint(e);
      h().stopMotion();
      if (e.pointerType === 'touch') {
        touches.set(e.pointerId, p);
        if (touches.size === 2) {
          // A second finger turns whatever the first was doing into a pinch.
          if (press?.mode === 'drag') h().unpin(press.node);
          press = null;
          pinch = pinchOf();
          return;
        }
      }
      const node = h().hitTest(p.x, p.y);
      press = {
        pointerId: e.pointerId,
        start: p,
        last: p,
        node,
        mode: 'press',
        samples: [{ x: p.x, y: p.y, t: e.timeStamp }],
      };
      try {
        region.setPointerCapture(e.pointerId);
      } catch {
        // A synthetic pointer cannot always be captured; the press still works.
      }
      // The press focuses the region by itself (it is focusable), as a
      // pointer's focus, so no keyboard focus ring shows round the graph.
    };

    const onPointerMove = (e: PointerEvent) => {
      const p = stagePoint(e);
      lastPointer = p;
      if (e.pointerType === 'touch' && touches.has(e.pointerId)) {
        touches.set(e.pointerId, p);
        if (pinch && touches.size === 2) {
          const next = pinchOf();
          const factor =
            pinch.distance > 0 ? next.distance / pinch.distance : 1;
          const viewport = h().viewport();
          // The point between the fingers follows them, then the zoom
          // keeps it under them: pan first, then zoom about the new middle.
          let camera = panBy(
            h().camera(),
            next.mid.x - pinch.mid.x,
            next.mid.y - pinch.mid.y,
          );
          camera = zoomAround(camera, viewport, factor, next.mid);
          h().setCamera(camera, true);
          pinch = next;
          return;
        }
      }
      if (press && press.pointerId === e.pointerId) {
        press.samples.push({ x: p.x, y: p.y, t: e.timeStamp });
        if (press.samples.length > 12) press.samples.shift();
        if (press.mode === 'press') {
          const moved = Math.hypot(p.x - press.start.x, p.y - press.start.y);
          if (moved <= CLICK_SLOP_PX) return;
          press.mode = press.node >= 0 ? 'drag' : 'pan';
          if (press.mode === 'pan') h().hover(-1, null, false);
        }
        if (press.mode === 'drag') {
          const world = worldPoint(p);
          h().pin(press.node, world.x, world.y);
          h().hover(press.node, p, false);
        } else {
          h().setCamera(
            panBy(h().camera(), p.x - press.last.x, p.y - press.last.y),
            true,
          );
        }
        press.last = p;
        return;
      }
      if (e.buttons !== 0) return;
      previewKey = e.metaKey || e.ctrlKey;
      h().hover(h().hitTest(p.x, p.y), p, previewKey);
    };

    const endPress = (e: PointerEvent, cancelled: boolean) => {
      if (e.pointerType === 'touch') {
        touches.delete(e.pointerId);
        if (touches.size < 2) pinch = null;
      }
      if (!press || press.pointerId !== e.pointerId) return;
      const ended = press;
      press = null;
      try {
        if (region.hasPointerCapture(e.pointerId)) {
          region.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Nothing was captured.
      }
      if (ended.mode === 'drag') {
        h().unpin(ended.node);
        return;
      }
      if (cancelled) return;
      if (ended.mode === 'press') {
        if (ended.node >= 0) {
          const { altKey, shiftKey, metaKey, ctrlKey } = e;
          h().open(ended.node, { altKey, shiftKey, metaKey, ctrlKey });
        }
        return;
      }
      // A pan let go while still moving coasts on.
      if (h().reducedMotion()) return;
      const velocity = flingVelocity(ended.samples);
      if (velocity && Math.hypot(velocity.vx, velocity.vy) > FLING_MIN_SPEED) {
        h().fling(velocity);
      }
    };
    const onPointerUp = (e: PointerEvent) => endPress(e, false);
    const onPointerCancel = (e: PointerEvent) => endPress(e, true);

    const onPointerLeave = () => {
      lastPointer = null;
      if (!press) h().hover(-1, null, false);
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      h().stopMotion();
      const factor = wheelZoomFactor(wheelPixels(e.deltaY, e.deltaMode));
      if (factor !== 1) h().zoom(factor, stagePoint(e));
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.defaultPrevented) return;
      if (e.key === 'Meta' || e.key === 'Control') {
        if (!previewKey && lastPointer) {
          previewKey = true;
          const at = lastPointer;
          h().hover(h().hitTest(at.x, at.y), at, true);
        }
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (h().key?.(e)) {
        e.preventDefault();
        return;
      }
      const panned = keyPan(h().camera(), e.key, e.shiftKey);
      if (panned) {
        e.preventDefault();
        h().stopMotion();
        h().setCamera(panned, true);
        return;
      }
      switch (e.key) {
        case '=':
        case '+':
          e.preventDefault();
          h().stopMotion();
          h().zoom(WHEEL_ZOOM_STEP, null);
          return;
        case '-':
        case '_':
        case '−':
          e.preventDefault();
          h().stopMotion();
          h().zoom(1 / WHEEL_ZOOM_STEP, null);
          return;
        case '0':
          e.preventDefault();
          h().fit();
          return;
        case '/':
          e.preventDefault();
          h().find();
          return;
        case '[':
          e.preventDefault();
          h().step(-1);
          return;
        case ']':
          e.preventDefault();
          h().step(1);
          return;
        case 'Enter':
          if (h().current() < 0) return;
          e.preventDefault();
          h().openCurrent();
          return;
        case 'l':
        case 'L':
          if (h().current() < 0) return;
          e.preventDefault();
          h().localCurrent();
          return;
        case 'Escape':
          h().clear();
          return;
        default:
          return;
      }
    };

    // The preview follows the key wherever focus is, as Obsidian's does.
    const onKeyUp = (e: KeyboardEvent) => {
      if ((e.key === 'Meta' || e.key === 'Control') && previewKey) {
        previewKey = false;
        if (lastPointer) {
          const at = lastPointer;
          h().hover(h().hitTest(at.x, at.y), at, false);
        }
      }
    };
    const onBlur = () => {
      previewKey = false;
    };

    region.addEventListener('pointerdown', onPointerDown);
    region.addEventListener('pointermove', onPointerMove);
    region.addEventListener('pointerup', onPointerUp);
    region.addEventListener('pointercancel', onPointerCancel);
    region.addEventListener('pointerleave', onPointerLeave);
    region.addEventListener('wheel', onWheel, { passive: false });
    region.addEventListener('keydown', onKeyDown);
    window.addEventListener('keydown', onKeyDownWindow);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    /** Cmd or Ctrl pressed while the pointer rests on the graph, focus anywhere. */
    function onKeyDownWindow(e: KeyboardEvent) {
      if (e.target === region || region.contains(e.target as Node)) return;
      if ((e.key === 'Meta' || e.key === 'Control') && lastPointer) {
        previewKey = true;
        const at = lastPointer;
        h().hover(h().hitTest(at.x, at.y), at, true);
      }
    }

    return () => {
      region.removeEventListener('pointerdown', onPointerDown);
      region.removeEventListener('pointermove', onPointerMove);
      region.removeEventListener('pointerup', onPointerUp);
      region.removeEventListener('pointercancel', onPointerCancel);
      region.removeEventListener('pointerleave', onPointerLeave);
      region.removeEventListener('wheel', onWheel);
      region.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keydown', onKeyDownWindow);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [regionRef]);
}
