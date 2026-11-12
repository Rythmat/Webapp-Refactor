import { Check } from 'lucide-react';
import { lissajousPath } from '@/components/learn/sigil/sigilSpec';
import { cn } from '@/components/utilities';
import { starPoints } from './pathGeometry';
import type { PathFigure } from './types';

// ── A lesson's thumbnail ───────────────────────────────────────────────────
// What a lesson shows in its row, as Samply's list shows a project's art
// (owner, 2026-11-10): a small flat square with a hairline, the lesson's own
// figure on it (its key's star, or its interval's curve), in the course's
// colour once it's reached. A check in the corner when it's done; faded while
// it's locked (the row says so).

const RADIUS = 34;

export function LessonThumb({
  ratio,
  figure,
  accent,
  lit,
  done = false,
  locked = false,
  className,
}: {
  ratio: readonly [number, number];
  figure?: PathFigure;
  accent: string;
  /** In its colour: reached, or the one chosen. */
  lit: boolean;
  done?: boolean;
  locked?: boolean;
  className?: string;
}) {
  const line = lit ? accent : 'rgb(255 255 255 / 0.45)';
  return (
    <span
      aria-hidden
      data-lesson-thumb={done ? 'done' : lit ? 'lit' : 'todo'}
      className={cn(
        'relative grid shrink-0 place-items-center overflow-hidden rounded-md bg-[#1b1b1f] ring-1 ring-inset ring-white/[0.08]',
        className,
      )}
    >
      <svg
        viewBox="-44 -44 88 88"
        className={cn('size-full', locked && 'opacity-50')}
      >
        {figure ? (
          <Star figure={figure} line={line} accent={accent} />
        ) : (
          <path
            d={lissajousPath(ratio, 0, RADIUS, 180)}
            fill="none"
            stroke={line}
            strokeWidth={2.5}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      {done && (
        <span
          className="absolute bottom-0.5 right-0.5 grid size-[38%] max-h-5 max-w-5 place-items-center rounded-full text-[#101012]"
          style={{ backgroundColor: accent }}
        >
          <Check className="size-[70%]" strokeWidth={3.5} />
        </span>
      )}
    </span>
  );
}

/** A key's star, as the key wheel draws it. */
function Star({
  figure,
  line,
  accent,
}: {
  figure: PathFigure;
  line: string;
  accent: string;
}) {
  const { stars, nodes } = starPoints(figure, RADIUS);
  // A scale's notes fill only part of the circle: centred on themselves and
  // grown to fill the square, so the star doesn't sit off to one side.
  const xs = nodes.map(({ at }) => at[0]);
  const ys = nodes.map(({ at }) => at[1]);
  const [x0, x1, y0, y1] = [
    Math.min(...xs),
    Math.max(...xs),
    Math.min(...ys),
    Math.max(...ys),
  ];
  const fit = Math.min(1.6, (RADIUS * 2) / Math.max(x1 - x0, y1 - y0, 1));
  const at = `scale(${fit.toFixed(3)}) translate(${(-(x0 + x1) / 2).toFixed(2)} ${(-(y0 + y1) / 2).toFixed(2)})`;
  return (
    <g data-thumb-star={figure.label} transform={at}>
      {stars.map((points, i) => (
        <polygon
          key={i}
          points={points}
          fill="none"
          stroke={line}
          strokeWidth={1.25}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {nodes.map(({ pc, at }) => (
        <circle
          key={pc}
          cx={at[0]}
          cy={at[1]}
          r={(figure.marked.includes(pc) ? 6 : 3.5) / fit}
          fill={figure.marked.includes(pc) ? accent : line}
        />
      ))}
    </g>
  );
}
