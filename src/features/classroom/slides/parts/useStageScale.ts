/**
 * useStageScale — fit a fixed 1280×720 slide "design canvas" into any container
 * with a single uniform `transform: scale()` (letterbox / contain). Generalizes
 * the ResizeObserver recipe previously duplicated in SlideThumbnail/DeckPreview
 * so authored freeform positions scale identically on every surface.
 */
import { useLayoutEffect, useState, type RefObject } from 'react';
import { SLIDE_CANVAS } from '../slideLayout';

export interface StageTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export const useStageScale = (
  ref: RefObject<HTMLElement | null>,
): StageTransform => {
  const [t, setT] = useState<StageTransform>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const compute = (w: number, h: number): StageTransform => {
      const scale = Math.min(w / SLIDE_CANVAS.w, h / SLIDE_CANVAS.h);
      return {
        scale,
        offsetX: (w - SLIDE_CANVAS.w * scale) / 2,
        offsetY: (h - SLIDE_CANVAS.h * scale) / 2,
      };
    };
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setT(compute(width, height));
    });
    ro.observe(el);
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) setT(compute(r.width, r.height));
    return () => ro.disconnect();
  }, [ref]);

  return t;
};
