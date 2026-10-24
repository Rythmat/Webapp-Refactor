import { useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { KEY_RAINBOW_COLORS } from '@/features/landing/rainbow';
import './homeGlow.css';

/** How long each pair holds before easing to the next (the ease is 5s). */
const STEP_MS = 7000;

/**
 * A slow wave sum: `[amplitude, period in s, phase]` triples. Periods with no
 * common ratio never line up, so the motion never visibly repeats.
 */
type Waves = readonly (readonly [number, number, number])[];
const wander = (waves: Waves, t: number) =>
  waves.reduce(
    (sum, [amp, period, phase]) =>
      sum + amp * Math.sin((2 * Math.PI * t) / period + phase),
    0,
  );

/**
 * Each light's own path (fractions of its width / height), built from waves
 * the other light shares nothing with: different periods, phases, reach and
 * breathing, so the two move independently. Each keeps to its own side of
 * the section (`home`), and `MIN_GAP` holds them apart, so they meet only at
 * their soft edges.
 */
const PATHS: readonly {
  home: number;
  x: Waves;
  y: Waves;
  breathe: Waves;
}[] = [
  {
    home: -0.32,
    x: [
      [0.11, 43.7, 0.4],
      [0.05, 17.3, 2.1],
      [0.025, 7.9, 4.6],
    ],
    y: [
      [0.13, 31.1, 1.3],
      [0.06, 13.7, 5.2],
    ],
    breathe: [[0.07, 19.3, 0.8]],
  },
  {
    home: 0.32,
    x: [
      [0.12, 59.3, 3.7],
      [0.045, 23.9, 0.9],
      [0.03, 11.1, 2.8],
    ],
    y: [
      [0.15, 37.7, 4.4],
      [0.05, 19.9, 1.6],
      [0.03, 8.3, 3.1],
    ],
    breathe: [[0.09, 27.1, 2.5]],
  },
];

/** The closest the two centres come, in light widths. */
const MIN_GAP = 0.36;

/**
 * Home's hero glow, after Suno's: a soft, wide light behind the heading and
 * the prompt bar. Ours is two complementary key-center colors at a time — a
 * key and its tritone, opposite on the circle of fifths (C and F#, G and
 * C#, …) — stepping one key around the circle every few seconds, so the
 * colors slowly shift. Each light is a wide wash that wanders its own side
 * of the section on its own path, independent of the other; they meet only
 * at their soft edges, where they blend like light.
 * Under reduced motion they hold still on C and F#.
 */
export const HomeGlow = () => {
  const reduce = useReducedMotion();
  const [key, setKey] = useState(0);
  const lights = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(
      () => setKey((k) => (k + 1) % KEY_RAINBOW_COLORS.length),
      STEP_MS,
    );
    return () => window.clearInterval(id);
  }, [reduce]);

  useEffect(() => {
    if (reduce) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      const xs = PATHS.map((p) => p.home + wander(p.x, t));
      // Too close: each gives way by half the shortfall.
      const short = MIN_GAP - (xs[1] - xs[0]);
      if (short > 0) {
        xs[0] -= short / 2;
        xs[1] += short / 2;
      }
      PATHS.forEach((p, i) => {
        const el = lights.current[i];
        if (!el) return;
        const x = xs[i] * 100;
        const y = wander(p.y, t) * 100;
        const s = 1 + wander(p.breathe, t);
        el.style.transform = `translate(${x}%, ${y}%) scale(${s})`;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduce]);

  const colors = {
    '--home-glow-a': KEY_RAINBOW_COLORS[key],
    '--home-glow-b': KEY_RAINBOW_COLORS[(key + 6) % 12],
  } as CSSProperties;

  return (
    <div
      aria-hidden
      className="home-glow pointer-events-none absolute left-1/2 top-[-56px] h-[540px] w-[min(1280px,100%)] -translate-x-1/2"
      style={colors}
    >
      {/* Each light sits centred in the box; its path moves it to its side. */}
      <div
        ref={(el) => (lights.current[0] = el)}
        className="home-glow__light home-glow__light--a left-[15%] top-[12%] h-[76%] w-[70%]"
        style={{ transform: 'translate(-32%, 0)' }}
      />
      <div
        ref={(el) => (lights.current[1] = el)}
        className="home-glow__light home-glow__light--b left-[15%] top-[12%] h-[76%] w-[70%]"
        style={{ transform: 'translate(32%, 0)' }}
      />
    </div>
  );
};
