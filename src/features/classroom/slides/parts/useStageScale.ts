/**
 * useStageScale — fit a fixed 1280×720 slide "design canvas" into any container
 * with a single uniform `transform: scale()` (letterbox / contain), so authored
 * positions and rem type scale together on every surface.
 *
 * It hands back a CALLBACK ref rather than taking a `RefObject`, and that is
 * the whole point of the shape. With a RefObject the effect ran once on mount
 * and observed whatever `ref.current` happened to be at that moment — so if the
 * node was not mounted yet, or was later replaced, nothing ever attached and
 * the stage kept the scale from its first paint. The student surface hit
 * exactly that: it renders the reflow (no stage node at all) below the
 * breakpoint, and on resizing up to the canvas the observer had never bound —
 * a 1280-wide slide rendered inside a 996-wide box and was clipped by the
 * frame's own `overflow-hidden`, silently.
 *
 * A callback ref is called by React with the node on attach and `null` on
 * detach, so the observer follows the element instead of a snapshot of it.
 */
import { useCallback, useRef, useState } from 'react';
import { SLIDE_CANVAS } from '../slideLayout';

export interface StageTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

const fit = (w: number, h: number): StageTransform => {
  const scale = Math.min(w / SLIDE_CANVAS.w, h / SLIDE_CANVAS.h);
  return {
    scale,
    offsetX: (w - SLIDE_CANVAS.w * scale) / 2,
    offsetY: (h - SLIDE_CANVAS.h * scale) / 2,
  };
};

export interface StageScale extends StageTransform {
  ref: (node: HTMLElement | null) => void;
}

export const useStageScale = (): StageScale => {
  const [t, setT] = useState<StageTransform>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });
  const observer = useRef<ResizeObserver | null>(null);

  const ref = useCallback((node: HTMLElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!node) return;

    const measure = (w: number, h: number) => {
      if (w > 0 && h > 0) setT(fit(w, h));
    };

    // `ResizeObserver` fires once on observe, so the initial measurement comes
    // from the same path as every later one — no separate first-paint branch to
    // drift out of step with it.
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      measure(width, height);
    });
    ro.observe(node);
    observer.current = ro;

    const r = node.getBoundingClientRect();
    measure(r.width, r.height);
  }, []);

  return { ...t, ref };
};
