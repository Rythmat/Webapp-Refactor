// ── The position box ───────────────────────────────────────────────────────
// One position as the reference sheet draws it: the strings across (high e
// on top), the frets as columns from finger 1's, a dot per note with the
// finger that plays it, and the roots hollow.

import { memo } from 'react';
import type { ModalPosition } from '@/curriculum/data/guitar/modes/modalPositions';
import { DIAGRAM_INK, DIAGRAM_INK_DARK } from '../FretDiagram';

const COLUMNS = 6;
const CELL = 30;
const ROW = 20;
const PAD = { x: 22, top: 14, bottom: 22 };
const R = 8;
const WIDTH = PAD.x * 2 + COLUMNS * CELL;
const HEIGHT = PAD.top + ROW * 5 + PAD.bottom;

export interface PositionBoxProps {
  position: ModalPosition;
  /** Which notes are drawn hollow: the scale's tonic or the shape's root. */
  rootRing: 'tonic' | 'shape';
  keyColor: string;
  /** What the box shows, for assistive tech. */
  label: string;
}

export const PositionBox = memo(function PositionBox({
  position,
  rootRing,
  keyColor,
  label,
}: PositionBoxProps) {
  const x = (fret: number) => PAD.x + (fret - position.firstFret + 0.5) * CELL;
  const y = (string: number) => PAD.top + (string - 1) * ROW;
  return (
    <svg
      data-position-box={position.number}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="block h-auto w-full max-w-[22rem]"
      role="img"
      aria-label={label}
    >
      <g aria-hidden>
        {Array.from({ length: COLUMNS + 1 }, (_, i) => (
          <line
            key={`f${i}`}
            x1={PAD.x + i * CELL}
            x2={PAD.x + i * CELL}
            y1={y(1)}
            y2={y(6)}
            stroke="rgba(232,232,240,0.28)"
            strokeWidth={i === 0 && position.firstFret === 1 ? 3 : 1}
          />
        ))}
        {[1, 2, 3, 4, 5, 6].map((s) => (
          <line
            key={`s${s}`}
            x1={PAD.x}
            x2={PAD.x + COLUMNS * CELL}
            y1={y(s)}
            y2={y(s)}
            stroke="rgba(232,232,240,0.4)"
            strokeWidth={0.6 + (s - 1) * 0.22}
          />
        ))}
        {/* The fret finger 1 is on, under its column. */}
        <text
          x={x(position.firstFret)}
          y={HEIGHT - 6}
          textAnchor="middle"
          fontSize={9}
          fill="rgba(232,232,240,0.62)"
        >
          {position.firstFret}
        </text>
      </g>
      <g aria-hidden>
        {position.notes.map((n) => {
          const root = rootRing === 'tonic' ? n.isTonic : n.isShapeRoot;
          return (
            <g key={`${n.string}:${n.fret}`} data-box-note={n.finger}>
              <circle
                cx={x(n.fret)}
                cy={y(n.string)}
                r={R}
                fill={root ? DIAGRAM_INK_DARK : DIAGRAM_INK}
                stroke={root ? keyColor : 'none'}
                strokeWidth={1.6}
              />
              <text
                x={x(n.fret)}
                y={y(n.string)}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={10}
                fontWeight={700}
                fill={root ? DIAGRAM_INK : DIAGRAM_INK_DARK}
              >
                {n.finger}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
});
