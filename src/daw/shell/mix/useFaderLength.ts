import { useLayoutEffect, useState, type RefObject } from 'react';

// ── A fader's length from its box (milestone 2.10) ─────────────────────────
//
// The Mix view's strips fill the height they are given, so each fader's
// travel is its box's height: measured once on mount and again whenever
// the box resizes (the window, the RackDock opening). `reserve` is the room
// under the bar inside the same box (the value's line), and the length
// never goes under `min`, so a short window keeps a usable fader and the
// strip scrolls instead.

export const MIN_FADER_PX = 80;

export function useFaderLength(
  ref: RefObject<HTMLElement | null>,
  { min = MIN_FADER_PX, reserve = 0 }: { min?: number; reserve?: number } = {},
): number {
  const [length, setLength] = useState(min);

  useLayoutEffect(() => {
    const box = ref.current;
    if (!box) return;
    const measure = () => {
      const next = Math.max(min, Math.floor(box.clientHeight - reserve));
      setLength((current) => (current === next ? current : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, [ref, min, reserve]);

  return length;
}
