import { useEffect, useRef, type RefObject } from 'react';
import type { RiverCamera } from '@/components/atlas/timeline/riverCamera';
import {
  panBy,
  zoomAt,
  type TimeWindow,
} from '@/components/atlas/timeline/timeWindow';

/**
 * Scroll and pinch to zoom the river about the pointer, a sideways scroll or
 * a drag to pan, and two fingers to pinch on a touch screen.
 *
 * Listeners live on the element (the wheel one non-passive, to keep the page
 * from scrolling) and, during a drag, on the window: pointer capture made the
 * Globe's other drag handles stutter (Globe UI prompt 5). The wheel glides to
 * where it is heading rather than jumping notch by notch, and a drag ends
 * with a little momentum, unless motion is reduced.
 */
export function useRiverGestures(
  ref: RefObject<HTMLElement>,
  camera: RiverCamera,
  options: {
    /** Where the years start, from the element's left edge, in px. */
    plotLeft: () => number;
    /** The width the years are spread over, in px. */
    plotWidth: () => number;
    reducedMotion: boolean;
    /** True while something else holds the river (an event's stage). */
    disabled?: () => boolean;
    /** Called as a gesture starts, to hide what a still view shows. */
    onGesture?: () => void;
  },
): void {
  const opts = useRef(options);
  opts.current = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ppyOf = (w: TimeWindow) =>
      opts.current.plotWidth() / (w.to - w.from || 1);
    const ppy = () => ppyOf(camera.get());
    const yearIn = (w: TimeWindow, clientX: number) => {
      const rect = el.getBoundingClientRect();
      return (
        w.from + (clientX - rect.left - opts.current.plotLeft()) / ppyOf(w)
      );
    };
    const yearAt = (clientX: number) => yearIn(camera.get(), clientX);

    // The wheel's destination, which the camera eases toward.
    let target: TimeWindow | null = null;
    let glide = 0;
    const glideStep = () => {
      glide = 0;
      if (!target) return;
      const cur = camera.get();
      const k = opts.current.reducedMotion ? 1 : 0.3;
      const next = {
        from: cur.from + (target.from - cur.from) * k,
        to: cur.to + (target.to - cur.to) * k,
      };
      const close =
        Math.abs(next.from - target.from) + Math.abs(next.to - target.to) <
        (target.to - target.from) * 0.002;
      camera.set(close ? target : next, 'gesture');
      if (close) target = null;
      else glide = requestAnimationFrame(glideStep);
    };
    const stopGlide = () => {
      if (glide) cancelAnimationFrame(glide);
      glide = 0;
      target = null;
    };

    const onWheel = (e: WheelEvent) => {
      if (opts.current.disabled?.()) return;
      e.preventDefault();
      opts.current.onGesture?.();
      // Lines (Firefox) and pages as pixels.
      const unit =
        e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientHeight : 1;
      const dx = e.deltaX * unit;
      const dy = e.deltaY * unit;
      const base = target ?? camera.get();
      if (e.ctrlKey) {
        // A trackpad pinch arrives as a wheel with ctrlKey.
        target = zoomAt(base, yearIn(base, e.clientX), Math.exp(dy * 0.01));
      } else if (Math.abs(dx) > Math.abs(dy)) {
        target = panBy(base, dx / ppyOf(base));
      } else {
        target = zoomAt(base, yearIn(base, e.clientX), Math.exp(dy * 0.002));
      }
      if (!glide) glide = requestAnimationFrame(glideStep);
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
      if (opts.current.disabled?.()) return;
      if ((e.target as Element).closest('[data-river-item], button, a')) return;
      stopCoast();
      stopGlide();
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
      stopGlide();
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [ref, camera]);
}
