import { motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { lissajousPath } from '@/components/learn/sigil/sigilSpec';
import { starPoints } from './pathGeometry';
import type { PathFigure } from './types';

// ── A lesson's disc ────────────────────────────────────────────────────────
// What marks a lesson on its course's path, and what the finish plays around, so
// that they read as one thing: an isometric disc in the course's colour, the
// lesson's own figure drawn on its face. Finished, it becomes a coin with a check.

const WIDTH = 120;
const HEIGHT = 96;

/** Squashes the figure onto the disc's tilted face. */
const FACE = `translate(${WIDTH / 2} ${HEIGHT * 0.4}) scale(1 0.56)`;

/** A key's star, small, for a disc's face. */
function MiniStar({
  figure,
  radius,
  line,
  rootColor,
  nodeRadius,
}: {
  figure: PathFigure;
  radius: number;
  line: string;
  rootColor: string;
  nodeRadius: number;
}) {
  const { stars, nodes } = starPoints(figure, radius);
  return (
    <g data-disc-star={figure.label}>
      {stars.map((points, i) => (
        <polygon
          key={i}
          points={points}
          fill="none"
          stroke={line}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {nodes.map(({ pc, at }) => (
        <circle
          key={pc}
          cx={at[0]}
          cy={at[1]}
          r={figure.marked.includes(pc) ? nodeRadius * 1.5 : nodeRadius}
          fill={figure.marked.includes(pc) ? rootColor : line}
        />
      ))}
    </g>
  );
}

export function LessonDisc({
  ratio,
  accent,
  state,
  drawn = true,
  size = 7.5,
  figure,
  selected = false,
}: {
  ratio: readonly [number, number];
  accent: string;
  state: 'todo' | 'next' | 'done';
  /** False to have the figure draw itself in. */
  drawn?: boolean;
  /** Width in rem. */
  size?: number;
  /** A key's star, drawn in place of the interval's figure. */
  figure?: PathFigure;
  /** Lit in its colour, as the one chosen. */
  selected?: boolean;
}) {
  const reduced = useReducedMotion();
  const done = state === 'done';
  const lit = state !== 'todo' || selected;
  const rim = done ? accent : lit ? accent : 'rgb(255 255 255 / 0.1)';
  const top = done
    ? accent
    : lit
      ? 'rgb(255 255 255 / 0.1)'
      : 'rgb(255 255 255 / 0.05)';
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      style={{ width: `${size}rem` }}
      aria-hidden
      data-disc={state}
    >
      {/* Solid underneath, so that the wave it sits on doesn't show through. */}
      <path
        d={`M4 ${HEIGHT * 0.4} v14 a56 ${HEIGHT * 0.35} 0 0 0 112 0 v-14 z`}
        fill="#101012"
      />
      <ellipse
        cx={WIDTH / 2}
        cy={HEIGHT * 0.4}
        rx={56}
        ry={HEIGHT * 0.35}
        fill="#101012"
      />
      {/* The edge, then the face, solid too: the edge's top half lies behind it. */}
      <path
        d={`M4 ${HEIGHT * 0.4} v14 a56 ${HEIGHT * 0.35} 0 0 0 112 0 v-14 z`}
        fill={rim}
        opacity={done ? 0.55 : lit ? 0.45 : 1}
      />
      <ellipse
        cx={WIDTH / 2}
        cy={HEIGHT * 0.4}
        rx={56}
        ry={HEIGHT * 0.35}
        fill="#101012"
      />
      <ellipse
        cx={WIDTH / 2}
        cy={HEIGHT * 0.4}
        rx={56}
        ry={HEIGHT * 0.35}
        fill={top}
        stroke={lit ? accent : 'rgb(255 255 255 / 0.2)'}
        strokeWidth={1.5}
      />
      {/* #101012 on the coin's bright face, white while it's still to do. */}
      {done ? (
        <g
          transform={`translate(${WIDTH / 2 - 16} ${HEIGHT * 0.4 - 13}) scale(1.35 1.08)`}
        >
          <Check color="#101012" strokeWidth={3.2} width={24} height={24} />
        </g>
      ) : (
        <g transform={FACE}>
          {figure ? (
            <MiniStar
              figure={figure}
              radius={44}
              line={
                selected
                  ? figure.accent
                  : lit
                    ? '#ffffff'
                    : 'rgb(255 255 255 / 0.5)'
              }
              rootColor={figure.accent}
              nodeRadius={2.6}
            />
          ) : (
            <motion.path
              d={lissajousPath(ratio, 0, 36)}
              fill="none"
              stroke={lit ? '#ffffff' : 'rgb(255 255 255 / 0.4)'}
              strokeWidth={1.25}
              vectorEffect="non-scaling-stroke"
              initial={drawn || reduced ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.9, ease: 'easeInOut' }}
            />
          )}
        </g>
      )}
    </svg>
  );
}
