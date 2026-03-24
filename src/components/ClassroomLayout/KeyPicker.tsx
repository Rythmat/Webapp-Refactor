import { type FC, useEffect, useRef, useState } from 'react';
import { KEY_COLORS, KEYS, type ColorIndex } from '@prism/engine';

// ── Circle of Fifths constants (mirrored from CircleOfFifths.tsx) ────────

const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'Eb',
  'E',
  'F',
  'F#',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
] as const;

/** Circle-of-fifths position (1-12) → semitone (0-11) */
const SEMITONES: Record<number, number> = {
  1: 0,
  2: 7,
  3: 2,
  4: 9,
  5: 4,
  6: 11,
  7: 6,
  8: 1,
  9: 8,
  10: 3,
  11: 10,
  12: 5,
};

/** Reverse: semitone → circle position */
const SEMI_TO_IDX: Record<number, number> = {};
for (const [idx, semi] of Object.entries(SEMITONES)) {
  SEMI_TO_IDX[semi] = Number(idx);
}

/** Aeolian is position 5 in the diatonic family; ionian[5] = 9 semitones */
const AEOLIAN_OFFSET = 9;

const SIZE = 140;
const CX = SIZE / 2;
const CY = SIZE / 2;
const OUTER_R = 60;
const INNER_R = 34;
const LABEL_R = 47;
const SLICE = (2 * Math.PI) / 12;
const START = -Math.PI / 2 - SLICE / 2; // C centered at top

function arcPath(
  cx: number,
  cy: number,
  r1: number,
  r2: number,
  a1: number,
  a2: number,
): string {
  const x1o = cx + r2 * Math.cos(a1);
  const y1o = cy + r2 * Math.sin(a1);
  const x2o = cx + r2 * Math.cos(a2);
  const y2o = cy + r2 * Math.sin(a2);
  const x1i = cx + r1 * Math.cos(a2);
  const y1i = cy + r1 * Math.sin(a2);
  const x2i = cx + r1 * Math.cos(a1);
  const y2i = cy + r1 * Math.sin(a1);
  const lg = a2 - a1 > Math.PI ? 1 : 0;
  return [
    `M ${x1o} ${y1o}`,
    `A ${r2} ${r2} 0 ${lg} 1 ${x2o} ${y2o}`,
    `L ${x1i} ${y1i}`,
    `A ${r1} ${r1} 0 ${lg} 0 ${x2i} ${y2i}`,
    'Z',
  ].join(' ');
}

// ── Types ────────────────────────────────────────────────────────────────

export interface KeySelection {
  root: number; // 0-11
  mode: string; // 'ionian' | 'aeolian'
}

interface KeyPickerProps {
  selected: KeySelection | null;
  onSelect: (key: KeySelection | null) => void;
  onClose: () => void;
}

// ── Component ────────────────────────────────────────────────────────────

export const KeyPicker: FC<KeyPickerProps> = ({
  selected,
  onSelect,
  onClose,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isMinor, setIsMinor] = useState(selected?.mode === 'aeolian');

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const selectedIdx = selected ? (SEMI_TO_IDX[selected.root] ?? null) : null;

  const handleNote = (pc: number) => {
    const mode = isMinor ? 'aeolian' : 'ionian';
    if (selected?.root === pc && selected?.mode === mode) {
      onSelect(null);
    } else {
      onSelect({ root: pc, mode });
    }
    onClose();
  };

  const handleModeToggle = (minor: boolean) => {
    setIsMinor(minor);
    if (selected) {
      onSelect({ root: selected.root, mode: minor ? 'aeolian' : 'ionian' });
    }
  };

  return (
    <div
      ref={ref}
      className="absolute bottom-full mb-2 left-0 z-50 bg-[#1a1a1a] border border-white/10 rounded-xl p-3 shadow-xl"
    >
      {/* Major / Minor toggle */}
      <div className="flex gap-1 mb-2">
        <button
          onClick={() => handleModeToggle(false)}
          className={`flex-1 px-3 py-1.5 rounded-lg text-xs transition-all ${
            !isMinor
              ? 'bg-white text-black font-medium'
              : 'text-gray-400 hover:bg-white/10'
          }`}
        >
          Major
        </button>
        <button
          onClick={() => handleModeToggle(true)}
          className={`flex-1 px-3 py-1.5 rounded-lg text-xs transition-all ${
            isMinor
              ? 'bg-white text-black font-medium'
              : 'text-gray-400 hover:bg-white/10'
          }`}
        >
          Minor
        </button>
      </div>

      {/* Circle of Fifths */}
      <div className="flex justify-center">
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="select-none"
        >
          {Array.from({ length: 12 }, (_, i) => {
            const idx = (i + 1) as ColorIndex;
            const semitone = SEMITONES[idx];
            const isSelected = idx === selectedIdx;

            // Match Studio logic: in minor mode, use the relative major's color
            const colorIdx = isMinor
              ? (SEMI_TO_IDX[
                  (semitone - AEOLIAN_OFFSET + 12) % 12
                ] as ColorIndex)
              : idx;
            const [r, g, b] = KEY_COLORS[colorIdx];
            const fill = `rgb(${r}, ${g}, ${b})`;
            const opacity = isSelected ? 1 : 0.65;

            const a1 = START + i * SLICE;
            const a2 = a1 + SLICE;
            const mid = a1 + SLICE / 2;
            const lx = CX + LABEL_R * Math.cos(mid);
            const ly = CY + LABEL_R * Math.sin(mid);

            return (
              <g
                key={idx}
                onClick={() => handleNote(semitone)}
                style={{ cursor: 'pointer' }}
              >
                <path
                  d={arcPath(CX, CY, INNER_R, OUTER_R, a1, a2)}
                  fill={fill}
                  stroke={isSelected ? '#fff' : 'rgba(0,0,0,0.3)'}
                  strokeWidth={isSelected ? 2.5 : 0.5}
                  opacity={opacity}
                />
                <text
                  x={lx}
                  y={ly}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={isSelected ? '#fff' : 'rgba(255,255,255,0.85)'}
                  fontSize={idx === 7 ? 7 : 8}
                  fontWeight={isSelected ? 700 : 500}
                  style={{ pointerEvents: 'none' }}
                >
                  {KEYS[idx]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

/** Format a KeySelection as a short label (e.g. "Cm", "F#") */
export function keyLabel(key: KeySelection): string {
  const name = NOTE_NAMES[key.root];
  return key.mode === 'aeolian' ? `${name}m` : `${name}`;
}
