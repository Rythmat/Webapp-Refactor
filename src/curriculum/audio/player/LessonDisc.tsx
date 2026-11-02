import { motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { lissajousPath } from '@/components/learn/sigil/sigilSpec';

// ── A lesson's disc ────────────────────────────────────────────────────────
// What marks a lesson on its course's path, and what the finish plays around, so
// that they read as one thing: an isometric disc in the course's colour, the
// lesson's own figure drawn on its face. Finished, it becomes a coin with a check.

const WIDTH = 120;
const HEIGHT = 96;

/** Squashes the figure onto the disc's tilted face. */
const FACE = `translate(${WIDTH / 2} ${HEIGHT * 0.4}) scale(1 0.56)`;

export function LessonDisc({
  ratio,
  accent,
  state,
  drawn = true,
  size = 7.5,
}: {
  ratio: readonly [number, number];
  accent: string;
  state: 'todo' | 'next' | 'done';
  /** False to have the figure draw itself in. */
  drawn?: boolean;
  /** Width in rem. */
  size?: number;
}) {
  const reduced = useReducedMotion();
  const done = state === 'done';
  const lit = state !== 'todo';
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
      {/* The edge, then the face. */}
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
        </g>
      )}
    </svg>
  );
}
