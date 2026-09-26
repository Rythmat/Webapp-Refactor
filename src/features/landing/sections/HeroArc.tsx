import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion';
import { KEY_CENTERS } from '../music';

// Geometry (viewBox units): a huge circle whose crown sits just under the
// title and whose sides meet the frame's bottom corners (Attio-style horizon).
const W = 1400;
const H = 380;
const R = 900;
const CX = W / 2;
const CY = R + 8;

const EASE = [0.2, 0.8, 0.2, 1] as const;

/**
 * Hero horizon: a dark planet arc with a glowing rim and vertical light
 * streaks rising off it. CSS/SVG only (no canvas). The rim gradient runs
 * through the 12 key-center colors in circle-of-fifths order — the same
 * decorative rainbow as the app's rainbow border; it carries no key or chord
 * meaning. On load the rim reveals from the crown outward; on scroll the arc
 * rises slightly. Static under reduced motion.
 */
export const HeroArc = () => {
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
      aria-hidden
      className="pointer-events-none relative w-full origin-bottom"
      style={reduce ? undefined : { y, scale }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full overflow-visible"
        preserveAspectRatio="xMidYMax meet"
      >
        <defs>
          <linearGradient id="hero-rim" x1="0" y1="0" x2="1" y2="0">
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
          <clipPath id="hero-reveal">
            <motion.rect
              y={-200}
              height={H + 400}
              initial={reduce ? false : { x: CX, width: 0 }}
              animate={{ x: 0, width: W }}
              transition={{ duration: 1.6, delay: 0.35, ease: EASE }}
            />
          </clipPath>
        </defs>

        {/* Light streaks rising off the horizon */}
        <rect
          y={-240}
          width={W}
          height={H + 240}
          fill="url(#hero-streaks)"
          mask="url(#hero-streak-mask)"
        />

        <g clipPath="url(#hero-reveal)">
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
        </g>

        {/* Planet body */}
        <circle cx={CX} cy={CY} r={R} fill="#101012" />

        {/* Crisp rim */}
        <g clipPath="url(#hero-reveal)">
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="url(#hero-rim)"
            strokeWidth="2"
          />
        </g>
      </svg>
    </motion.div>
  );
};
