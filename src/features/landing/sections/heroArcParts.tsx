import { KEY_RAINBOW_COLORS } from '../rainbow';

/** How far (SVG units) the light streaks rise off the rim before fading out. */
export const STREAK_REACH = 260;

/**
 * The horizon arc's paint, shared by the landing hero (HeroArc) and Home's
 * Globe arc (HomeGlobeArc): the rim's rainbow, the streak pattern and the
 * radial fade that lifts it off the circle, and the bloom's blur. Ids are
 * `${id}-rim`, `-streaks`, `-streak-mask` and `-glow`.
 *
 * The rim gradient spans the frame (0 → `width`), not the circle, which runs
 * far past both sides, so the whole spectrum shows corner to corner. It runs
 * through the 12 key-center colors in circle-of-fifths order: decorative,
 * no key or chord meaning.
 */
export const HeroArcDefs = ({
  id,
  width,
  height,
  cx,
  cy,
  r,
}: {
  id: string;
  width: number;
  height: number;
  cx: number;
  cy: number;
  r: number;
}) => (
  <defs>
    <linearGradient
      id={`${id}-rim`}
      gradientUnits="userSpaceOnUse"
      x1={0}
      y1={0}
      x2={width}
      y2={0}
    >
      {KEY_RAINBOW_COLORS.map((color, i) => (
        <stop
          key={color}
          offset={`${(i / (KEY_RAINBOW_COLORS.length - 1)) * 100}%`}
          stopColor={color}
        />
      ))}
    </linearGradient>
    <pattern
      id={`${id}-streaks`}
      width="7"
      height="10"
      patternUnits="userSpaceOnUse"
    >
      <rect width="1" height="10" fill="rgba(255,255,255,0.09)" />
    </pattern>
    <radialGradient
      id={`${id}-streak-fade`}
      cx={cx}
      cy={cy}
      r={r + STREAK_REACH}
      gradientUnits="userSpaceOnUse"
    >
      <stop offset={r / (r + STREAK_REACH)} stopColor="#fff" stopOpacity="1" />
      <stop offset="1" stopColor="#fff" stopOpacity="0" />
    </radialGradient>
    <mask id={`${id}-streak-mask`}>
      <rect width={width} height={height} fill={`url(#${id}-streak-fade)`} />
    </mask>
    <filter id={`${id}-glow`} x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="22" />
    </filter>
  </defs>
);
