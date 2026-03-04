import { useEffect, useRef } from 'react';

/**
 * Calls a callback on every animation frame, throttled to a target FPS.
 * Returns nothing — the callback receives a timestamp.
 * Automatically stops when the component unmounts.
 */
export function useAnimationFrame(
  callback: (time: number) => void,
  active: boolean = true,
  targetFps: number = 30
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!active) return;

    let rafId: number;
    let lastTime = 0;
    const interval = 1000 / targetFps;

    const loop = (time: number) => {
      rafId = requestAnimationFrame(loop);
      if (time - lastTime < interval) return;
      lastTime = time;
      callbackRef.current(time);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [active, targetFps]);
}
