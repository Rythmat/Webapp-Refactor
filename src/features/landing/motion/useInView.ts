import { useEffect, useState, type RefObject } from 'react';

/**
 * `true` while the element intersects the viewport (plus `rootMargin`). Used to
 * pause looping visuals, the product tour clock and the globe when offscreen.
 * Defaults to `true` where IntersectionObserver is unavailable.
 */
export const useInView = (
  ref: RefObject<Element>,
  { rootMargin = '0px', threshold = 0 }: IntersectionObserverInit = {},
): boolean => {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      // One callback can batch several entries for the element; the last is current.
      (entries) => setInView(entries[entries.length - 1].isIntersecting),
      { rootMargin, threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin, threshold]);

  return inView;
};

/**
 * Latches to `true` the first time the element comes near the viewport — for
 * deferring heavy mounts (the globe, below-the-fold chunks) until needed.
 */
export const useNearViewport = (
  ref: RefObject<Element>,
  rootMargin = '400px',
): boolean => {
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin, near]);

  return near;
};
