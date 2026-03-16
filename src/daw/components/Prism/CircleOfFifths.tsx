import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useStore } from '@/daw/store';
import {
  KEY_COLORS,
  KEYS,
  ALL_MODES,
  getScaleSpellings,
  MODE_GROUPS,
  MODE_DISPLAY,
  FAMILY_COLOR_INDEX,
  MODE_FAMILY_INFO,
  type ColorIndex,
} from '@prism/engine';

// ── Constants ────────────────────────────────────────────────────────────

/** Circle-of-fifths indices 1-12 mapping to semitone rootNote values */
const SEMITONES: Record<number, number> = {
  1: 0, // C
  2: 7, // G
  3: 2, // D
  4: 9, // A
  5: 4, // E
  6: 11, // B
  7: 6, // F#
  8: 1, // Db
  9: 8, // Ab
  10: 3, // Eb
  11: 10, // Bb
  12: 5, // F
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

export function CircleOfFifths({
  size = DEFAULT_SIZE,
  onNoteClick,
  showModeSelector = true,
}: {
  size?: number;
  onNoteClick?: (semitone: number) => void;
  showModeSelector?: boolean;
} = {}) {
  const rootNote = useStore((s) => s.rootNote);
  const rootLocked = useStore((s) => s.rootLocked);
  const setRootNote = useStore((s) => s.setRootNote);
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  const scale = size / DEFAULT_SIZE;
  const CX = size / 2;
  const CY = size / 2;
  const OUTER_R = 80 * scale;
  const INNER_R = 46 * scale;
  const LABEL_R = 63 * scale;

  const selectedIndex =
    rootNote !== null ? (SEMITONE_TO_INDEX[rootNote] ?? null) : null;

  // Compute which segments are in-scale and the single key-center color
  const scaleInfo = useMemo(() => {
    if (rootNote === null) return null;

    const intervals = ALL_MODES[mode];
    if (!intervals) return null;

    const familyInfo = MODE_FAMILY_INFO[mode];
    if (!familyInfo) return null;

    // Which semitones are in this scale
    const inScaleSemitones = new Set(intervals.map((i) => (rootNote + i) % 12));

    // Determine the single color for all in-scale segments
    let rgb: [number, number, number];

    const fixedColorIdx = FAMILY_COLOR_INDEX[familyInfo.familyLabel];
    if (fixedColorIdx != null) {
      // Non-diatonic family: use fixed family color
      rgb = KEY_COLORS[fixedColorIdx as ColorIndex];
    } else {
      // Diatonic: find parent Ionian root and use its circle-of-fifths color
      // The mode's position interval tells us how far above the Ionian root we are
      const offset =
        intervals[0] === 0 ? ALL_MODES.ionian[familyInfo.position] : 0;
      const parentRoot = (rootNote - offset + 12) % 12;
      const parentIdx = SEMITONE_TO_INDEX[parentRoot] as ColorIndex;
      rgb = KEY_COLORS[parentIdx];
    }

    const spellings = getScaleSpellings(rootNote, mode);
    return { inScaleSemitones, rgb, spellings };
  }, [rootNote, mode]);

  const handleClick = useCallback(
    (semitone: number) => () => {
      if (onNoteClick) {
        onNoteClick(semitone);
      } else {
        setRootNote(semitone);
      }
    },
    [onNoteClick, setRootNote],
  );

  const handleClear = useCallback(() => {
    setRootNote(null);
  }, [setRootNote]);

  const handleModeSelect = useCallback(
    (modeKey: string) => {
      setMode(modeKey);
      setDropdownOpen(false);
    },
    [setMode],
  );

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
          const semitone = SEMITONES[idx];
          const isSelected = idx === selectedIndex;
          const inScale = scaleInfo?.inScaleSemitones.has(semitone);

          let fill: string;
          let opacity: number;

          if (scaleInfo) {
            if (inScale) {
              // In-scale: use the parent key center color
              const [r, g, b] = scaleInfo.rgb;
              fill = `rgb(${r}, ${g}, ${b})`;
              opacity = isSelected ? 1 : rootLocked ? 0.35 : 0.85;
            } else {
              // Out-of-scale: grey
              fill = 'rgb(60, 60, 60)';
              opacity = 0.5;
            }
          } else {
            // No root selected — show mode-aware colors per segment
            const familyInfo = MODE_FAMILY_INFO[mode];
            const fixedColorIdx = familyInfo
              ? FAMILY_COLOR_INDEX[familyInfo.familyLabel]
              : undefined;

            if (fixedColorIdx != null) {
              const [r, g, b] = KEY_COLORS[fixedColorIdx as ColorIndex];
              fill = `rgb(${r}, ${g}, ${b})`;
            } else if (familyInfo) {
              const offset = ALL_MODES.ionian[familyInfo.position];
              const parentRoot = (semitone - offset + 12) % 12;
              const parentIdx = SEMITONE_TO_INDEX[parentRoot] as ColorIndex;
              const [r, g, b] = KEY_COLORS[parentIdx];
              fill = `rgb(${r}, ${g}, ${b})`;
            } else {
              const [r, g, b] = KEY_COLORS[idx];
              fill = `rgb(${r}, ${g}, ${b})`;
            }
            opacity = isSelected ? 1 : rootLocked ? 0.35 : 0.7;
          }

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
              style={{
                cursor: rootLocked && !isSelected ? 'not-allowed' : 'pointer',
              }}
            >
              <path
                d={d}
                fill={fill}
                stroke={isSelected ? '#fff' : 'rgba(0,0,0,0.3)'}
                strokeWidth={isSelected ? 2.5 : 0.5}
                opacity={opacity}
              />
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="central"
                fill={
                  scaleInfo && !inScale
                    ? 'rgba(255,255,255,0.2)'
                    : isSelected
                      ? '#fff'
                      : 'rgba(255,255,255,0.85)'
                }
                fontSize={(idx === 7 ? 9 : 10) * scale}
                fontWeight={isSelected ? 700 : 500}
                style={{ pointerEvents: 'none' }}
              >
                {scaleInfo?.spellings.get(semitone) ?? KEYS[idx]}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Mode selector */}
      {showModeSelector && <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen((v) => !v)}
          className="flex cursor-pointer items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium transition-colors hover:bg-white/10"
          style={{
            color: 'var(--color-text-dim)',
            border: 'none',
            background: 'none',
          }}
        >
          {MODE_DISPLAY[mode] ?? mode}
          <ChevronDown
            size={10}
            strokeWidth={2}
            style={{
              transform: dropdownOpen ? 'rotate(180deg)' : undefined,
              transition: 'transform 0.15s',
            }}
          />
        </button>

        {dropdownOpen && (
          <div
            className="absolute left-1/2 z-50 mt-1 overflow-y-auto rounded-md border"
            style={{
              transform: 'translateX(-50%)',
              maxHeight: 260,
              width: 180,
              backgroundColor: 'var(--color-surface-2, #1e1e2e)',
              borderColor: 'var(--color-border, rgba(255,255,255,0.08))',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            }}
          >
            {MODE_GROUPS.map((group) => (
              <div key={group.label}>
                {/* Group label */}
                <div
                  className="sticky top-0 px-2 pb-0.5 pt-1.5 text-[8px] font-bold uppercase tracking-wider"
                  style={{
                    color: 'var(--color-text-dim, #6b6b80)',
                    backgroundColor: 'var(--color-surface-2, #1e1e2e)',
                  }}
                >
                  {group.label}
                </div>
                {group.modes.map((modeKey) => (
                  <button
                    key={modeKey}
                    onClick={() => handleModeSelect(modeKey)}
                    className="block w-full cursor-pointer px-3 py-[3px] text-left text-[10px] transition-colors hover:bg-white/10"
                    style={{
                      color:
                        modeKey === mode
                          ? '#fff'
                          : 'var(--color-text-secondary, #a0a0b0)',
                      background:
                        modeKey === mode ? 'rgba(255,255,255,0.08)' : 'none',
                      border: 'none',
                      fontWeight: modeKey === mode ? 600 : 400,
                    }}
                  >
                    {MODE_DISPLAY[modeKey] ?? modeKey}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>}

      {selectedIndex !== null && (
        <button
          onClick={handleClear}
          className="cursor-pointer rounded px-3 py-1 text-[10px] font-medium transition-colors hover:bg-white/10"
          style={{
            color: 'var(--color-text-dim)',
            border: 'none',
            background: 'none',
          }}
        >
          Clear
        </button>
      )}
    </div>
  );
}
