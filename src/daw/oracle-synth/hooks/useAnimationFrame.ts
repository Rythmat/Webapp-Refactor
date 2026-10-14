import { useEffect, useRef, useState, type RefObject } from 'react';
import { addFrameTask } from '@/daw/engine/engineClock';

/**
 * Calls a callback on the editor's shared frame loop (engineClock), at up
 * to `targetFps`, while `active` is true. The callback receives the frame's
 * timestamp. Nothing runs while inactive, and it stops on unmount.
 */
export function useAnimationFrame(
  callback: (time: number) => void,
  active: boolean = true,
  targetFps: number = 30,
  name: string = 'animation-frame',
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!active) return;
    return addFrameTask((now) => callbackRef.current(now), {
      fps: targetFps,
      name,
    });
  }, [active, targetFps, name]);
}

/**
 * Whether `ref`'s element is on screen (IntersectionObserver) and the page
 * is visible. A canvas in a hidden panel, scrolled away or under a pop-out
 * has nothing to draw for. Without IntersectionObserver it counts as on
 * screen.
 */
export function useOnScreen(ref: RefObject<Element | null>): boolean {
  const [intersecting, setIntersecting] = useState(true);
  const [pageVisible, setPageVisible] = useState(
    () => typeof document === 'undefined' || !document.hidden,
  );

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => {
      const last = entries[entries.length - 1];
      if (last) setIntersecting(last.isIntersecting);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  useEffect(() => {
    const onChange = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  return intersecting && pageVisible;
}
