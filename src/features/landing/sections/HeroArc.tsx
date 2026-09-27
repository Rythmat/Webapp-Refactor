import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion';
import type { ReactNode } from 'react';
import { KEY_CENTERS } from '../music';

// Geometry (viewBox units): a huge circle whose crown sits just under the
// title and whose sides meet the frame's bottom corners (Attio-style horizon).
// R is sized so the sides reach the corners 28 units above the bottom, keeping
// the band short enough that the next section shows on a laptop screen.
const W = 1400;
const H = 280;
const R = 1126;
const CX = W / 2;
const CY = R + 8;

/**
 * Hero horizon: a dark planet arc with a glowing rim and vertical light
 * streaks rising off it. CSS/SVG only (no canvas). The rim gradient runs
 * through the 12 key-center colors in circle-of-fifths order — the same
 * decorative rainbow as the app's rainbow border; it carries no key or chord
 * meaning. It is fully drawn from the first frame; on scroll the arc rises
 * slightly (static under reduced motion). The section around it clips the
 * rim and its bloom at the frame's edges.
 *
 * `children` sit in the planet's dark body, stacked over the arc in one grid
 * cell (stretched to the arc's height) so they scroll with it. The cell grows
 * past the arc when the children are taller, and the body shares the page
 * color, so the overflow reads as more planet.
 */
export const HeroArc = ({ children }: { children?: ReactNode }) => {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 600], [0, -40]);
  const scale = useTransform(scrollY, [0, 600], [1, 1.04]);

  const stops = KEY_CENTERS.map((k, i) => (
    <stop
      key={k.name}
      offset={`${(i / (KEY_CENTERS.length - 1)) * 100}%`}
      stopColor={k.color}
    />
  ));

  return (
    <motion.div
      className="pointer-events-none relative grid w-full origin-bottom"
      style={reduce ? undefined : { y, scale }}
    >
      <svg
        aria-hidden
        viewBox={`0 0 ${W} ${H}`}
        className="col-start-1 row-start-1 block h-auto w-full self-start overflow-visible"
        preserveAspectRatio="xMidYMax meet"
      >
        <defs>
          {/* Spans the frame, not the circle (which runs far past both
              sides), so the whole spectrum shows corner to corner. */}
          <linearGradient
            id="hero-rim"
            gradientUnits="userSpaceOnUse"
            x1={0}
            y1={0}
            x2={W}
            y2={0}
          >
            {stops}
          </linearGradient>
          <pattern
            id="hero-streaks"
            width="7"
            height="10"
            patternUnits="userSpaceOnUse"
          >
            <rect width="1" height="10" fill="rgba(255,255,255,0.09)" />
          </pattern>
          <radialGradient
            id="hero-streak-fade"
            cx={CX}
            cy={CY}
            r={R + 260}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset={R / (R + 260)} stopColor="#fff" stopOpacity="1" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <mask id="hero-streak-mask">
            <rect width={W} height={H} fill="url(#hero-streak-fade)" />
          </mask>
          <filter id="hero-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="22" />
          </filter>
        </defs>

        {/* Light streaks rising off the horizon */}
        <rect
          y={-240}
          width={W}
          height={H + 240}
          fill="url(#hero-streaks)"
          mask="url(#hero-streak-mask)"
        />

        {/* Soft colored bloom behind the rim */}
        <circle
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke="url(#hero-rim)"
          strokeWidth="46"
          filter="url(#hero-glow)"
          opacity="0.55"
        />

        {/* Planet body */}
        <circle cx={CX} cy={CY} r={R} fill="#101012" />

        {/* Crisp rim */}
        <circle
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke="url(#hero-rim)"
          strokeWidth="2"
        />
      </svg>

      {children && (
        <div className="pointer-events-auto relative col-start-1 row-start-1">
          {children}
        </div>
      )}
    </motion.div>
  );
};
