import { useEffect, useRef, type RefObject } from 'react';
import type { RiverCamera } from './riverCamera';

/**
 * Scroll and pinch to zoom the river about the pointer, a sideways scroll or
 * a drag to pan, and two fingers to pinch on a touch screen.
 *
 * Listeners live on the element (the wheel one non-passive, to keep the page
 * from scrolling) and, during a drag, on the window: pointer capture made the
 * Globe's other drag handles stutter (Globe UI prompt 5). A drag ends with a
 * little momentum, unless motion is reduced.
 */
export function useRiverGestures(
  ref: RefObject<HTMLElement>,
  camera: RiverCamera,
  options: {
    /** The width the years are spread over, in px. */
    plotWidth: () => number;
    reducedMotion: boolean;
    /** Called as a gesture starts, to hide what a still view shows. */
    onGesture?: () => void;
  },
): void {
  const opts = useRef(options);
  opts.current = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ppy = () => {
      const w = camera.get();
      return opts.current.plotWidth() / (w.to - w.from || 1);
    };
    const yearAt = (clientX: number) => {
      const rect = el.getBoundingClientRect();
      const w = camera.get();
      return w.from + (clientX - rect.left) / ppy();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      opts.current.onGesture?.();
      // Lines (Firefox) and pages as pixels.
      const unit =
        e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientHeight : 1;
      const dx = e.deltaX * unit;
      const dy = e.deltaY * unit;
      if (e.ctrlKey) {
        // A trackpad pinch arrives as a wheel with ctrlKey.
        camera.zoomAt(yearAt(e.clientX), Math.exp(dy * 0.01));
      } else if (Math.abs(dx) > Math.abs(dy)) {
        camera.panBy(dx / ppy());
      } else {
        camera.zoomAt(yearAt(e.clientX), Math.exp(dy * 0.0015));
      }
    };

    // Pointers down on the river itself (not on a marker), by id.
    const pointers = new Map<number, number>();
    let pinchDistance = 0;
    let lastX = 0;
    let lastT = 0;
    let velocity = 0; // years per ms
    let coast = 0;

    const stopCoast = () => {
      if (coast) cancelAnimationFrame(coast);
      coast = 0;
    };

    const onMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, e.clientX);
      if (pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        const distance = Math.abs(a - b) || 1;
        if (pinchDistance) {
          camera.zoomAt(yearAt((a + b) / 2), pinchDistance / distance);
        }
        pinchDistance = distance;
        return;
      }
      const now = performance.now();
      const dx = e.clientX - lastX;
      const years = -dx / ppy();
      camera.panBy(years);
      const dt = now - lastT || 16;
      velocity = 0.8 * (years / dt) + 0.2 * velocity;
      lastX = e.clientX;
      lastT = now;
    };

    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      pinchDistance = 0;
      if (pointers.size === 1) {
        lastX = [...pointers.values()][0];
        lastT = performance.now();
        return;
      }
      if (pointers.size > 0) return;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      if (opts.current.reducedMotion || Math.abs(velocity) < 0.0005) return;
      let last = performance.now();
      const step = (now: number) => {
        const dt = now - last;
        last = now;
        velocity *= Math.pow(0.92, dt / 16);
        camera.panBy(velocity * dt);
        coast = Math.abs(velocity) > 0.0002 ? requestAnimationFrame(step) : 0;
      };
      coast = requestAnimationFrame(step);
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if ((e.target as Element).closest('[data-river-item], button, a')) return;
      stopCoast();
      opts.current.onGesture?.();
      if (pointers.size === 0) {
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
      }
      pointers.set(e.pointerId, e.clientX);
      lastX = e.clientX;
      lastT = performance.now();
      velocity = 0;
      pinchDistance = 0;
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('pointerdown', onDown);
    return () => {
      stopCoast();
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [ref, camera]);
}
