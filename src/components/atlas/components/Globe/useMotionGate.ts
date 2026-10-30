import { useEffect, useRef, type RefObject } from 'react';

/**
 * Whether the map's own motion (Spin, flowing links) should run: not while
 * the tab is hidden, the map is scrolled out of view or something covers it
 * (`covered`, set by MapCovered). MapLibre draws only when something
 * changes, so this is the only constant work there is to stop.
 */
export interface MotionGate {
  moving(): boolean;
  covered: { current: boolean };
}

export function useMotionGate(
  containerRef: RefObject<HTMLElement | null>,
): MotionGate {
  const onScreen = useRef(true);
  const covered = useRef(false);
  const gate = useRef<MotionGate>({
    moving: () => onScreen.current && !covered.current,
    covered,
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let intersecting = true;
    const sync = () => {
      onScreen.current = intersecting && !document.hidden;
    };
    const io = new IntersectionObserver(([entry]) => {
      intersecting = !!entry?.isIntersecting;
      sync();
    });
    io.observe(el);
    document.addEventListener('visibilitychange', sync);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, [containerRef]);

  return gate.current;
}
