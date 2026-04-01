import React, { useEffect, useRef, useState } from 'react';

const CDN_URL =
  'https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js';

interface TubesApp {
  tubes: {
    setColors: (colors: string[]) => void;
    setLightsColors: (colors: string[]) => void;
  };
  dispose?: () => void;
}

/**
 * Generates an array of random hex color strings.
 */
function randomColors(count: number): string[] {
  return new Array(count).fill(0).map(
    () =>
      '#' +
      Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, '0'),
  );
}

interface TubesCursorProps {
  className?: string;
  /** When this value changes, tube and light colors randomize automatically. */
  colorKey?: number;
}

export default function TubesCursor({ className, colorKey }: TubesCursorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<TubesApp | null>(null);
  const [loaded, setLoaded] = useState(false);
  const moduleRef = useRef<{
    default: (canvas: HTMLCanvasElement, opts: unknown) => TubesApp;
  } | null>(null);

  // Load the CDN module once via fetch → blob → dynamic import
  useEffect(() => {
    let revoke: string | null = null;
    let cancelled = false;

    fetch(CDN_URL)
      .then((res) => res.text())
      .then((text) => {
        if (cancelled) return;
        const blob = new Blob([text], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        revoke = url;
        return import(/* @vite-ignore */ url);
      })
      .then((mod) => {
        if (cancelled || !mod) return;
        moduleRef.current = mod;
        setLoaded(true);
      })
      .catch((err) => console.error('Failed to load TubesCursor module:', err));

    return () => {
      cancelled = true;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, []);

  // Initialize the tubes app once the module is loaded
  useEffect(() => {
    if (!loaded || !moduleRef.current || !canvasRef.current) return;

    const timer = setTimeout(() => {
      if (!canvasRef.current || !moduleRef.current) return;

      const TubesCursorFn = moduleRef.current.default;
      const app = TubesCursorFn(canvasRef.current, {
        tubes: {
          colors: ['#5e72e4', '#8965e0', '#f5365c'],
          lights: {
            intensity: 200,
            colors: ['#21d4fd', '#b721ff', '#f4d03f', '#11cdef'],
          },
        },
      });
      appRef.current = app;
    }, 100); // 100ms delay to allow for DOM rendering

    return () => {
      clearTimeout(timer);
      if (appRef.current && typeof appRef.current.dispose === 'function') {
        appRef.current.dispose();
      }
      appRef.current = null;
    };
  }, [loaded]);

  // Randomize colors when colorKey changes
  useEffect(() => {
    if (colorKey === undefined || !appRef.current) return;
    const newTubeColors = randomColors(3);
    const newLightColors = randomColors(4);
    appRef.current.tubes.setColors(newTubeColors);
    appRef.current.tubes.setLightsColors(newLightColors);
  }, [colorKey]);

  return (
    <canvas ref={canvasRef} className={className ?? 'fixed inset-0 z-0'} />
  );
}
