import { useState, useCallback } from 'react';
import {
  MODE_GROUPS,
  MODE_DISPLAY,
  MODES,
} from '@/daw/prism-engine/data/modes';
import { NOTES } from '@/daw/prism-engine/data/notes';
import type { ModeName } from '@/daw/prism-engine/types';

// Diatonic modes: Lydian (outermost) → Locrian (innermost)
const DIATONIC_MODES = MODE_GROUPS[0].modes;

// 12 key signatures (circle of fifths), each with color and 7 mode root notes
const LONGITUDES = [
  {
    label: '\u266E',
    hex: '#d2404a',
    notes: ['F', 'C', 'G', 'D', 'A', 'E', 'B'],
  },
  { label: '#', hex: '#ff7348', notes: ['C', 'G', 'D', 'A', 'E', 'B', 'F#'] },
  { label: '##', hex: '#fea92a', notes: ['G', 'D', 'A', 'E', 'B', 'F#', 'C#'] },
  {
    label: '###',
    hex: '#ffcb30',
    notes: ['D', 'A', 'E', 'B', 'F#', 'C#', 'G#'],
  },
  {
    label: '####',
    hex: '#aed580',
    notes: ['A', 'E', 'B', 'F#', 'C#', 'G#', 'D#'],
  },
  {
    label: '#####',
    hex: '#7fc783',
    notes: ['E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#'],
  },
  {
    label: '######',
    hex: '#28a69a',
    notes: ['B', 'F#', 'C#', 'G#', 'D#', 'A#', 'E#'],
  },
  {
    label: '\u266D\u266D\u266D\u266D\u266D',
    hex: '#62b4f7',
    notes: ['G\u266D', 'D\u266D', 'A\u266D', 'E\u266D', 'B\u266D', 'F', 'C'],
  },
  {
    label: '\u266D\u266D\u266D\u266D',
    hex: '#7885cb',
    notes: ['D\u266D', 'A\u266D', 'E\u266D', 'B\u266D', 'F', 'C', 'G'],
  },
  {
    label: '\u266D\u266D\u266D',
    hex: '#9d7fce',
    notes: ['A\u266D', 'E\u266D', 'B\u266D', 'F', 'C', 'G', 'D'],
  },
  {
    label: '\u266D\u266D',
    hex: '#c785d3',
    notes: ['E\u266D', 'B\u266D', 'F', 'C', 'G', 'D', 'A'],
  },
  {
    label: '\u266D',
    hex: '#f8a8c5',
    notes: ['B\u266D', 'F', 'C', 'G', 'D', 'A', 'E'],
  },
];

// Map note name → pitch class for enharmonic matching
const NOTE_TO_PC: Record<string, number> = {
  C: 0,
  'C#': 1,
  'D\u266D': 1,
  D: 2,
  'D#': 3,
  'E\u266D': 3,
  E: 4,
  'E#': 5,
  F: 5,
  'F#': 6,
  'G\u266D': 6,
  G: 7,
  'G#': 8,
  'A\u266D': 8,
  A: 9,
  'A#': 10,
  'B\u266D': 10,
  B: 11,
};

const PC_NAMES = [
  'C',
  'C#',
  'D',
  'E\u266D',
  'E',
  'F',
  'F#',
  'G',
  'A\u266D',
  'A',
  'B\u266D',
  'B',
];

// Intervals for each diatonic mode (Lydian → Locrian)
const MODE_INTERVALS = [
  '1, 2, 3, #4, 5, 6, 7',
  '1, 2, 3, 4, 5, 6, 7',
  '1, 2, 3, 4, 5, 6, \u266D7',
  '1, 2, \u266D3, 4, 5, 6, \u266D7',
  '1, 2, \u266D3, 4, 5, \u266D6, \u266D7',
  '1, \u266D2, \u266D3, 4, 5, \u266D6, \u266D7',
  '1, \u266D2, \u266D3, 4, \u266D5, \u266D6, \u266D7',
];

const SIZE = 700;
const CENTER = SIZE / 2;
const OUTER_RADIUS = SIZE * 0.45;
const INNER_RADIUS = SIZE * 0.12;
const RING_COUNT = DIATONIC_MODES.length;
const WEDGE_COUNT = LONGITUDES.length;
const WEDGE_ANGLE = (Math.PI * 2) / WEDGE_COUNT;
const WEDGE_DEG = 360 / WEDGE_COUNT;

function ringRadii(modeIdx: number): { r1: number; r2: number } {
  const step = (OUTER_RADIUS - INNER_RADIUS) / RING_COUNT;
  return {
    r1: OUTER_RADIUS - step * modeIdx,
    r2: OUTER_RADIUS - step * (modeIdx + 1),
  };
}

/** Build SVG arc path for a cell (no offset — rotation handled by CSS transform) */
function cellPath(modeIdx: number, wedgeIdx: number): string {
  const { r1, r2 } = ringRadii(modeIdx);
  const a1 = wedgeIdx * WEDGE_ANGLE - Math.PI / 2;
  const a2 = a1 + WEDGE_ANGLE;

  const x1 = CENTER + r1 * Math.cos(a1);
  const y1 = CENTER + r1 * Math.sin(a1);
  const x2 = CENTER + r1 * Math.cos(a2);
  const y2 = CENTER + r1 * Math.sin(a2);
  const x3 = CENTER + r2 * Math.cos(a2);
  const y3 = CENTER + r2 * Math.sin(a2);
  const x4 = CENTER + r2 * Math.cos(a1);
  const y4 = CENTER + r2 * Math.sin(a1);

  return [
    `M ${x1} ${y1}`,
    `A ${r1} ${r1} 0 0 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${r2} ${r2} 0 0 0 ${x4} ${y4}`,
    `Z`,
  ].join(' ');
}

function cellCenterPos(
  modeIdx: number,
  wedgeIdx: number,
): { x: number; y: number } {
  const { r1, r2 } = ringRadii(modeIdx);
  const rMid = (r1 + r2) / 2;
  const aMid = wedgeIdx * WEDGE_ANGLE - Math.PI / 2 + WEDGE_ANGLE / 2;
  return {
    x: CENTER + rMid * Math.cos(aMid),
    y: CENTER + rMid * Math.sin(aMid),
  };
}

/** Build spirals: for each pitch class, which wedge it appears in per mode */
function buildSpirals(): { pc: number; wedges: number[] }[] {
  const spirals: { pc: number; wedges: number[] }[] = [];
  for (let pc = 0; pc < 12; pc++) {
    const wedges: number[] = [];
    for (let m = 0; m < DIATONIC_MODES.length; m++) {
      for (let w = 0; w < LONGITUDES.length; w++) {
        if (NOTE_TO_PC[LONGITUDES[w].notes[m]] === pc) {
          wedges.push(w);
          break;
        }
      }
    }
    spirals.push({ pc, wedges });
  }
  return spirals;
}

const SPIRALS = buildSpirals();

/** Build SVG path for a spiral (uses ring rotation offsets in degrees) */
function spiralPath(
  spiral: { wedges: number[] },
  ringDegOffsets: number[],
): string {
  const points = spiral.wedges.map((w, m) => {
    const { r1, r2 } = ringRadii(m);
    const rMid = (r1 + r2) / 2;
    const offsetRad = (ringDegOffsets[m] * Math.PI) / 180;
    const aMid = w * WEDGE_ANGLE - Math.PI / 2 + WEDGE_ANGLE / 2 + offsetRad;
    return {
      x: CENTER + rMid * Math.cos(aMid),
      y: CENTER + rMid * Math.sin(aMid),
    };
  });
  if (points.length < 2) return '';
  return 'M ' + points.map((p) => `${p.x} ${p.y}`).join(' L ');
}

/** Compute rotation in degrees for each ring to align a spiral to the Lydian (outermost) position */
function computeAlignDegrees(spiral: { wedges: number[] }): number[] {
  const target = spiral.wedges[1]; // Ionian ring (index 1) stays in place, others align to it
  // Determine dominant direction from most rings, then force all to match
  const diffs = spiral.wedges.map((w) => {
    let diff = target - w;
    while (diff > 6) diff -= 12;
    while (diff < -6) diff += 12;
    return diff;
  });
  const positiveCount = diffs.filter((d) => d > 0).length;
  const direction = positiveCount >= diffs.filter((d) => d < 0).length ? 1 : -1;
  return diffs.map((diff) => {
    // Force same direction: if diff disagrees, wrap it around
    if (direction > 0 && diff < 0) diff += 12;
    if (direction < 0 && diff > 0) diff -= 12;
    return diff * WEDGE_DEG;
  });
}

const SPIRAL_COLORS = [
  '#ffffff',
  '#dddddd',
  '#ffffff',
  '#dddddd',
  '#ffffff',
  '#ffffff',
  '#dddddd',
  '#ffffff',
  '#dddddd',
  '#ffffff',
  '#dddddd',
  '#ffffff',
];

export default function ModalSphere() {
  const [selectedSpiral, setSelectedSpiral] = useState<number | null>(null);
  const [selectedMode, setSelectedMode] = useState<number | null>(null);
  const [selectedWedge, setSelectedWedge] = useState<number | null>(null);
  const [selectedCell, setSelectedCell] = useState<{
    w: number;
    m: number;
  } | null>(null);
  const [ringDegOffsets, setRingDegOffsets] = useState<number[]>(
    new Array(7).fill(0),
  );

  const handleSpiralClick = useCallback(
    (pc: number) => {
      setSelectedMode(null);
      setSelectedWedge(null);
      setSelectedCell(null);
      if (selectedSpiral === pc) {
        setSelectedSpiral(null);
        setRingDegOffsets(new Array(7).fill(0));
      } else {
        const spiral = SPIRALS[pc];
        setSelectedSpiral(pc);
        setRingDegOffsets(computeAlignDegrees(spiral));
      }
    },
    [selectedSpiral],
  );

  const handleCellClick = useCallback((modeIdx: number) => {
    setSelectedSpiral(null);
    setSelectedWedge(null);
    setSelectedCell(null);
    setRingDegOffsets(new Array(7).fill(0));
    setSelectedMode((prev) => (prev === modeIdx ? null : modeIdx));
  }, []);

  const handleNoteClick = useCallback(
    (wedgeIdx: number, modeIdx: number) => {
      if (selectedWedge === wedgeIdx || selectedSpiral !== null) {
        // Wedge selected or spiral active — toggle specific cell
        if (selectedCell?.w === wedgeIdx && selectedCell?.m === modeIdx) {
          setSelectedCell(null);
        } else {
          setSelectedCell({ w: wedgeIdx, m: modeIdx });
        }
      } else {
        // Select the wedge
        setSelectedSpiral(null);
        setSelectedMode(null);
        setSelectedCell(null);
        setRingDegOffsets(new Array(7).fill(0));
        setSelectedWedge(wedgeIdx);
      }
    },
    [selectedWedge, selectedSpiral, selectedCell],
  );

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full h-full max-w-[700px] max-h-[700px]"
      >
        {/* Each mode ring is a <g> that rotates via CSS transform */}
        {DIATONIC_MODES.map((_, m) => (
          <g
            key={`ring-group-${m}`}
            style={{
              transformOrigin: `${CENTER}px ${CENTER}px`,
              transform: `rotate(${ringDegOffsets[m]}deg)`,
              transition: 'transform 0.6s ease-in-out',
            }}
          >
            {/* Colored wedge cells for this ring */}
            {LONGITUDES.map((lon, w) => {
              const modeDimmed = selectedMode !== null && selectedMode !== m;
              const wedgeDimmed = selectedWedge !== null && selectedWedge !== w;
              const cellSelected =
                selectedCell?.w === w && selectedCell?.m === m;
              const spiralCell =
                selectedSpiral !== null &&
                SPIRALS[selectedSpiral].wedges[m] === w;
              const cellDimmed = selectedCell !== null && !cellSelected;
              const spiralDimmed =
                selectedSpiral !== null && selectedCell === null && !spiralCell;
              const highlighted =
                selectedMode === m ||
                selectedWedge === w ||
                cellSelected ||
                spiralCell;
              const dimmed =
                modeDimmed || wedgeDimmed || cellDimmed || spiralDimmed;
              return (
                <path
                  key={`${w}-${m}`}
                  d={cellPath(m, w)}
                  fill={lon.hex}
                  stroke={
                    highlighted ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.4)'
                  }
                  strokeWidth={highlighted ? 1.5 : 1}
                  opacity={dimmed ? 0.25 : 1}
                  className="cursor-pointer"
                  style={{ transition: 'opacity 0.3s' }}
                  onClick={() => handleNoteClick(w, m)}
                />
              );
            })}

            {/* Note + mode labels for this ring — counter-rotated to stay upright */}
            {LONGITUDES.map((lon, w) => {
              const mode = DIATONIC_MODES[m];
              const { x, y } = cellCenterPos(m, w);
              const modeName = MODE_DISPLAY[mode] || mode;
              const modeAbbrev = modeName.slice(0, 3);
              const modeDimmed = selectedMode !== null && selectedMode !== m;
              const wedgeDimmed = selectedWedge !== null && selectedWedge !== w;
              const cellSelected =
                selectedCell?.w === w && selectedCell?.m === m;
              const spiralCell =
                selectedSpiral !== null &&
                SPIRALS[selectedSpiral].wedges[m] === w;
              const cellDimmed = selectedCell !== null && !cellSelected;
              const spiralDimmed =
                selectedSpiral !== null && selectedCell === null && !spiralCell;
              const dimmed =
                modeDimmed || wedgeDimmed || cellDimmed || spiralDimmed;
              return (
                <text
                  key={`note-${w}-${m}`}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-white font-bold select-none pointer-events-none"
                  fontSize={9}
                  opacity={dimmed ? 0.2 : 1}
                  style={{
                    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                    transition: 'opacity 0.3s, transform 0.6s ease-in-out',
                    transformOrigin: `${x}px ${y}px`,
                    transform: `rotate(${-ringDegOffsets[m]}deg)`,
                  }}
                >
                  <tspan>{lon.notes[m]}</tspan>
                  <tspan
                    className="fill-white/60 font-normal"
                    fontSize={6}
                  >{` ${modeAbbrev}`}</tspan>
                </text>
              );
            })}
          </g>
        ))}

        {/* Ring borders (static, don't rotate) — clickable for mode selection */}
        {DIATONIC_MODES.map((_, m) => {
          const { r1 } = ringRadii(m);
          return (
            <circle
              key={`ring-${m}`}
              cx={CENTER}
              cy={CENTER}
              r={r1}
              fill="none"
              stroke={
                selectedMode === m
                  ? 'rgba(255,255,255,0.8)'
                  : 'rgba(255,255,255,0.3)'
              }
              strokeWidth={selectedMode === m ? 2.5 : 6}
              className="cursor-pointer"
              style={{ transition: 'stroke 0.3s, stroke-width 0.3s' }}
              onClick={() => handleCellClick(m)}
            />
          );
        })}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={INNER_RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth={1}
        />

        {/* Wedge separator lines (static) */}
        {LONGITUDES.map((_, w) => {
          const a = w * WEDGE_ANGLE - Math.PI / 2;
          const x1 = CENTER + INNER_RADIUS * Math.cos(a);
          const y1 = CENTER + INNER_RADIUS * Math.sin(a);
          const x2 = CENTER + OUTER_RADIUS * Math.cos(a);
          const y2 = CENTER + OUTER_RADIUS * Math.sin(a);
          return (
            <line
              key={`sep-${w}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={1}
            />
          );
        })}

        {/* Spiral paths (computed with degree offsets for position accuracy) */}
        {SPIRALS.map((spiral) => (
          <path
            key={`spiral-${spiral.pc}`}
            d={spiralPath(spiral, ringDegOffsets)}
            fill="none"
            stroke={
              selectedSpiral === spiral.pc
                ? '#ffffff'
                : SPIRAL_COLORS[spiral.pc]
            }
            strokeWidth={selectedSpiral === spiral.pc ? 3 : 1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={
              selectedSpiral === null
                ? 0.5
                : selectedSpiral === spiral.pc
                  ? 1
                  : 0.15
            }
            className="cursor-pointer"
            style={{
              transition: 'd 0.6s ease-in-out, opacity 0.3s, stroke-width 0.3s',
            }}
            onClick={() => handleSpiralClick(spiral.pc)}
          />
        ))}

        {/* Spiral click targets */}
        {SPIRALS.map((spiral) => (
          <path
            key={`spiral-hit-${spiral.pc}`}
            d={spiralPath(spiral, ringDegOffsets)}
            fill="none"
            stroke="transparent"
            strokeWidth={12}
            className="cursor-pointer"
            style={{ transition: 'd 0.6s ease-in-out' }}
            onClick={() => handleSpiralClick(spiral.pc)}
          />
        ))}

        {/* Center label */}
        {selectedSpiral !== null && selectedCell === null && (
          <text
            x={CENTER}
            y={CENTER}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-white font-bold select-none"
            fontSize={18}
          >
            {PC_NAMES[selectedSpiral]}
          </text>
        )}
        {selectedMode !== null && (
          <>
            <text
              x={CENTER}
              y={CENTER - 10}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-white font-bold select-none"
              fontSize={16}
            >
              {MODE_DISPLAY[DIATONIC_MODES[selectedMode]] ||
                DIATONIC_MODES[selectedMode]}
            </text>
            <text
              x={CENTER}
              y={CENTER + 10}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-white/70 select-none"
              fontSize={9}
            >
              {MODE_INTERVALS[selectedMode]}
            </text>
          </>
        )}
        {selectedWedge !== null && selectedCell === null && (
          <text
            x={CENTER}
            y={CENTER}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-white font-bold select-none"
            fontSize={16}
          >
            {LONGITUDES[selectedWedge].label}
          </text>
        )}
        {selectedCell !== null &&
          (() => {
            const rootNote = LONGITUDES[selectedCell.w].notes[selectedCell.m];
            const modeName =
              MODE_DISPLAY[DIATONIC_MODES[selectedCell.m]] ||
              DIATONIC_MODES[selectedCell.m];
            const modeKey = DIATONIC_MODES[selectedCell.m] as ModeName;
            const rootPc = NOTE_TO_PC[rootNote];
            const scaleNotes = MODES[modeKey].map(
              (interval) => NOTES[(rootPc + interval) % 12],
            );
            return (
              <>
                <text
                  x={CENTER}
                  y={CENTER - 16}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-white font-bold select-none"
                  fontSize={16}
                >
                  {rootNote} {modeName}
                </text>
                <text
                  x={CENTER}
                  y={CENTER + 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-white/80 select-none"
                  fontSize={10}
                >
                  {scaleNotes.join('  ')}
                </text>
                <text
                  x={CENTER}
                  y={CENTER + 16}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-white/50 select-none"
                  fontSize={8}
                >
                  {MODE_INTERVALS[selectedCell.m]}
                </text>
              </>
            );
          })()}
      </svg>
    </div>
  );
}
