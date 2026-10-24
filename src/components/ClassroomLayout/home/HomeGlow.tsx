import { useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { KEY_RAINBOW_COLORS } from '@/features/landing/rainbow';
import './homeGlow.css';

/**
 * How long the colors hold before one of them (the two sides take turns)
 * eases to a new one; the ease is 5s.
 */
const STEP_MS = 7000;

const KEYS = KEY_RAINBOW_COLORS.length;

/** How far apart two keys are on the circle of fifths, 0 to 6. */
const fifthsApart = (a: number, b: number) => {
  const d = Math.abs(a - b) % KEYS;
  return Math.min(d, KEYS - d);
};

/**
 * A random key-center color for one side: not the one it has, and at least
 * two keys around the circle from the other side's, so the two never read
 * as one color. `random` is Math.random's shape.
 */
export const pickGlowKey = (
  current: number,
  other: number,
  random: () => number = Math.random,
) => {
  const options = Array.from({ length: KEYS }, (_, k) => k).filter(
    (k) => k !== current && fifthsApart(k, other) >= 2,
  );
  return options[Math.floor(random() * options.length)];
};

/** A random pair to start on, so each visit opens on its own colors. */
const randomPair = (): [number, number] => {
  const a = Math.floor(Math.random() * KEYS);
  return [a, pickGlowKey(-1, a)];
};

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
 * Each light's drift about its corner (fractions of its own width / height),
 * built from waves the other light shares nothing with: different periods,
 * phases, reach and breathing, so the two move independently. The reach is
 * small, so each color holds its corner, as the album art's colors hold
 * theirs on Suno's page.
 */
const PATHS: readonly { x: Waves; y: Waves; breathe: Waves }[] = [
  {
    x: [
      [0.04, 43.7, 0.4],
      [0.02, 17.3, 2.1],
    ],
    y: [
      [0.05, 31.1, 1.3],
      [0.02, 13.7, 5.2],
    ],
    breathe: [[0.05, 19.3, 0.8]],
  },
  {
    x: [
      [0.045, 59.3, 3.7],
      [0.02, 23.9, 0.9],
    ],
    y: [
      [0.06, 37.7, 4.4],
      [0.02, 19.9, 1.6],
    ],
    breathe: [[0.06, 27.1, 2.5]],
  },
];

/**
 * Home's top glow, after Suno's album page (the cover art, blurred, washing
 * the top of the page and fading out by half way down): ours is two
 * key-center colors, one in each top corner, reaching past the top edge.
 * Under them a wash runs from one color to the other across the width, and
 * the corner lights reach well past the middle, so the two blend smoothly
 * there at any width. The page opens on a random pair; every few seconds one
 * side (they take turns) eases to another random color (pickGlowKey), so the
 * pairing keeps changing. Each light drifts a little about its corner on its
 * own path. A mask fades the whole to the page by the bottom of its box.
 * Under reduced motion the colors and lights hold still.
 */
export const HomeGlow = () => {
  const reduce = useReducedMotion();
  const [pair, setPair] = useState(randomPair);
  const lights = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (reduce) return;
    let side = 0;
    const id = window.setInterval(() => {
      const turn = side;
      side = 1 - side;
      setPair((p) => {
        const next: [number, number] = [p[0], p[1]];
        next[turn] = pickGlowKey(p[turn], p[1 - turn]);
        return next;
      });
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, [reduce]);

  useEffect(() => {
    if (reduce) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      PATHS.forEach((p, i) => {
        const el = lights.current[i];
        if (!el) return;
        const x = wander(p.x, t) * 100;
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
    '--home-glow-a': KEY_RAINBOW_COLORS[pair[0]],
    '--home-glow-b': KEY_RAINBOW_COLORS[pair[1]],
  } as CSSProperties;

  return (
    <div
      aria-hidden
      // Full bleed: past the scroll area's 8px padding to the panel's edges.
      className="home-glow pointer-events-none absolute -inset-x-2 -top-2 -z-10 h-[clamp(22.5rem,62vh,42.5rem)] overflow-hidden"
      style={colors}
    >
      <div className="home-glow__wash absolute inset-0" />
      {/* Each light is centred on its top corner and 1.6 times the box's
        width, so it reaches well past the middle into the other's. */}
      <div
        ref={(el) => (lights.current[0] = el)}
        className="home-glow__light home-glow__light--a left-[-80%] -top-3/4 h-[150%] w-[160%]"
      />
      <div
        ref={(el) => (lights.current[1] = el)}
        className="home-glow__light home-glow__light--b left-[20%] -top-3/4 h-[150%] w-[160%]"
      />
    </div>
  );
};
