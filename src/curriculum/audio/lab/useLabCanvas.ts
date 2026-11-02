import { useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef } from 'react';

export interface LabFrame {
  ctx: CanvasRenderingContext2D;
  /** The canvas's size in CSS pixels: draw in these. */
  width: number;
  height: number;
  /** Seconds since it started drawing; stands still with reduced motion. */
  time: number;
}

/**
 * One canvas and one animation loop, its drawing read from a ref, so nothing
 * renders in React per frame. Sharp at the device's resolution (to 2×), and
 * paused offscreen and in a hidden tab. With reduced motion there is no loop:
 * the lab calls `redraw` when something changes, and offers a scrubber instead.
 */
export function useLabCanvas(
  draw: (frame: LabFrame) => void,
  /** Reads a live signal: it keeps running with reduced motion, as a meter must. */
  { live = false }: { live?: boolean } = {},
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;
  const reducedMotion = useReducedMotion() ?? false;
  const reduced = reducedMotion && !live;
  const sizeRef = useRef({ width: 0, height: 0 });
  const timeRef = useRef(0);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const { width, height } = sizeRef.current;
    if (!canvas || !ctx || !width || !height) return;
    const scale = canvas.width / width;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, width, height);
    drawRef.current({ ctx, width, height, time: timeRef.current });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let frame = 0;
    let last = 0;
    let onScreen = true;

    const stopLoop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const tick = (now: number) => {
      if (last) timeRef.current += (now - last) / 1000;
      last = now;
      paint();
      frame = requestAnimationFrame(tick);
    };
    const startLoop = () => {
      if (reduced || frame || !onScreen || document.hidden) return;
      last = 0;
      frame = requestAnimationFrame(tick);
    };

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      sizeRef.current = { width, height };
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      paint();
    };
    const resizes =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    resizes?.observe(canvas);
    resize();

    const visibility =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([entry]) => {
            onScreen = entry.isIntersecting;
            if (onScreen) startLoop();
            else stopLoop();
          });
    visibility?.observe(canvas);

    const onVisibility = () => {
      if (document.hidden) stopLoop();
      else startLoop();
    };
    document.addEventListener('visibilitychange', onVisibility);
    startLoop();

    return () => {
      stopLoop();
      resizes?.disconnect();
      visibility?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [paint, reduced]);

  return { canvasRef, redraw: paint, reduced };
}
