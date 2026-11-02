import { useId } from 'react';

/**
 * The still point everything grows around. It has no name and no lines, and it
 * can't be selected: it's where the web is, not a thing on it. It's opaque, so
 * a line passing behind it never seems to end at it. Inside an `<svg>`.
 */
export const OrbitalCore = ({
  r,
  cx = 0,
  cy = 0,
}: {
  r: number;
  cx?: number;
  cy?: number;
}) => {
  const id = useId();
  return (
    <g aria-hidden pointerEvents="none" data-orbital-core>
      <defs>
        <radialGradient id={id}>
          <stop offset="0%" stopColor="white" stopOpacity={0.95} />
          <stop offset="55%" stopColor="white" stopOpacity={0.45} />
          <stop offset="100%" stopColor="white" stopOpacity={0.12} />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r * 1.7} fill="#101012" />
      <circle
        cx={cx}
        cy={cy}
        r={r * 1.7}
        fill="none"
        stroke="white"
        strokeOpacity={0.16}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={cx} cy={cy} r={r} fill={`url(#${id})`} />
    </g>
  );
};
