import { useCallback } from 'react';
import { useStore } from '@/daw/store';
import { KEY_COLORS, KEYS } from '@prism/engine';
import type { ColorIndex } from '@prism/engine';

// ── Constants ────────────────────────────────────────────────────────────

/** Circle-of-fifths indices 1-12 mapping to semitone rootNote values */
const SEMITONES: Record<number, number> = {
  1: 0,   // C
  2: 7,   // G
  3: 2,   // D
  4: 9,   // A
  5: 4,   // E
  6: 11,  // B
  7: 6,   // F#
  8: 1,   // Db
  9: 8,   // Ab
  10: 3,  // Eb
  11: 10, // Bb
  12: 5,  // F
};

/** Reverse: rootNote semitone → KEYS index */
const SEMITONE_TO_INDEX: Record<number, number> = {};
for (const [idx, semi] of Object.entries(SEMITONES)) {
  SEMITONE_TO_INDEX[semi] = Number(idx);
}

const DEFAULT_SIZE = 180;
const SLICE_ANGLE = (2 * Math.PI) / 12;
const START_OFFSET = -Math.PI / 2 - SLICE_ANGLE / 2; // C centered at top

function arcPath(
  cx: number,
  cy: number,
  r1: number,
  r2: number,
  startAngle: number,
  endAngle: number,
): string {
  const x1o = cx + r2 * Math.cos(startAngle);
  const y1o = cy + r2 * Math.sin(startAngle);
  const x2o = cx + r2 * Math.cos(endAngle);
  const y2o = cy + r2 * Math.sin(endAngle);
  const x1i = cx + r1 * Math.cos(endAngle);
  const y1i = cy + r1 * Math.sin(endAngle);
  const x2i = cx + r1 * Math.cos(startAngle);
  const y2i = cy + r1 * Math.sin(startAngle);
  const large = endAngle - startAngle > Math.PI ? 1 : 0;
  return [
    `M ${x1o} ${y1o}`,
    `A ${r2} ${r2} 0 ${large} 1 ${x2o} ${y2o}`,
    `L ${x1i} ${y1i}`,
    `A ${r1} ${r1} 0 ${large} 0 ${x2i} ${y2i}`,
    'Z',
  ].join(' ');
}

// ── Component ────────────────────────────────────────────────────────────

export function CircleOfFifths({ size = DEFAULT_SIZE }: { size?: number } = {}) {
  const rootNote = useStore((s) => s.rootNote);
  const rootLocked = useStore((s) => s.rootLocked);
  const setRootNote = useStore((s) => s.setRootNote);

  const scale = size / DEFAULT_SIZE;
  const CX = size / 2;
  const CY = size / 2;
  const OUTER_R = 80 * scale;
  const INNER_R = 46 * scale;
  const LABEL_R = 63 * scale;

  const selectedIndex = rootNote !== null ? (SEMITONE_TO_INDEX[rootNote] ?? null) : null;

  const handleClick = useCallback(
    (semitone: number) => () => {
      setRootNote(semitone);
    },
    [setRootNote],
  );

  const handleClear = useCallback(() => {
    setRootNote(null);
  }, [setRootNote]);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="select-none"
      >
        {Array.from({ length: 12 }, (_, i) => {
          const idx = (i + 1) as ColorIndex;
          const [r, g, b] = KEY_COLORS[idx];
          const fill = `rgb(${r}, ${g}, ${b})`;
          const semitone = SEMITONES[idx];
          const isSelected = idx === selectedIndex;

          const startAngle = START_OFFSET + i * SLICE_ANGLE;
          const endAngle = startAngle + SLICE_ANGLE;
          const midAngle = startAngle + SLICE_ANGLE / 2;

          const labelX = CX + LABEL_R * Math.cos(midAngle);
          const labelY = CY + LABEL_R * Math.sin(midAngle);

          const d = arcPath(CX, CY, INNER_R, OUTER_R, startAngle, endAngle);

          return (
            <g
              key={idx}
              onClick={rootLocked ? undefined : handleClick(semitone)}
              style={{ cursor: rootLocked && !isSelected ? 'not-allowed' : 'pointer' }}
            >
              <path
                d={d}
                fill={fill}
                stroke={isSelected ? '#fff' : 'rgba(0,0,0,0.3)'}
                strokeWidth={isSelected ? 2.5 : 0.5}
                opacity={isSelected ? 1 : rootLocked ? 0.35 : 0.7}
              />
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isSelected ? '#fff' : 'rgba(255,255,255,0.85)'}
                fontSize={(idx === 7 ? 9 : 10) * scale}
                fontWeight={isSelected ? 700 : 500}
                style={{ pointerEvents: 'none' }}
              >
                {KEYS[idx]}
              </text>
            </g>
          );
        })}
      </svg>
      {selectedIndex !== null && (
        <button
          onClick={handleClear}
          className="text-[10px] font-medium px-3 py-1 rounded transition-colors hover:bg-white/10 cursor-pointer"
          style={{ color: 'var(--color-text-dim)', border: 'none', background: 'none' }}
        >
          Clear
        </button>
      )}
    </div>
  );
}
