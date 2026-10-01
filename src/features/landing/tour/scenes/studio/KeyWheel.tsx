import {
  getScaleSpellings,
  KEY_COLORS,
  KEYS,
  type ColorIndex,
} from '@prism/engine';
import { cn } from '@/components/utilities';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import { keyCenterColor, majorScale } from '../../../music';
import { rovingKeyDown, useRovingStop } from './studioHooks';
import { DEMO_KEY_PC } from './studioScript';

/** Circle-of-fifths slices (C at the top, clockwise) → pitch class. */
const SLICE_PC = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
/** `CircleOfFifths.tsx` geometry, drawn at 180px and scaled. */
const BASE = 180;
const SLICE = (2 * Math.PI) / 12;
const START = -Math.PI / 2 - SLICE / 2;
const OUT_OF_KEY = 'rgb(60, 60, 60)';
/** Picking a key sweeps the new colors clockwise, one slice at a time. */
const SWEEP_MS = 30;

const arcPath = (c: number, r1: number, r2: number, a0: number, a1: number) =>
  [
    `M ${c + r2 * Math.cos(a0)} ${c + r2 * Math.sin(a0)}`,
    `A ${r2} ${r2} 0 0 1 ${c + r2 * Math.cos(a1)} ${c + r2 * Math.sin(a1)}`,
    `L ${c + r1 * Math.cos(a1)} ${c + r1 * Math.sin(a1)}`,
    `A ${r1} ${r1} 0 0 0 ${c + r1 * Math.cos(a0)} ${c + r1 * Math.sin(a0)}`,
    'Z',
  ].join(' ');

const rgb = (i: number) => `rgb(${KEY_COLORS[i as ColorIndex].join(', ')})`;

/**
 * The KEY card's circle of fifths — a props-only copy of the Studio's
 * `CircleOfFifths` look (which reads the DAW store): every key in its own
 * color until one is picked, then the key's seven notes in its color and the
 * rest grey. Each slice is a button (roving arrow keys walk the circle); the
 * demo key's slice (D) is the tour's `key` target unless `tourTarget` is false (the cursor
 * has moved on to the spectrum).
 */
export const KeyWheel = ({
  size,
  keyPc,
  onPick,
  staticMode,
  tourTarget = true,
}: {
  size: number;
  keyPc: number | null;
  onPick: (pc: number) => void;
  staticMode: boolean;
  tourTarget?: boolean;
}) => {
  const s = size / BASE;
  const c = size / 2;
  const outer = 80 * s;
  const inner = 46 * s;
  const labelR = 63 * s;
  const hit = outer - inner;
  const inKey = keyPc === null ? null : new Set(majorScale(keyPc));
  const spelled = keyPc === null ? null : getScaleSpellings(keyPc, 'ionian');
  const keyColor = keyPc === null ? null : keyCenterColor(keyPc);
  const roving = useRovingStop(keyPc ?? 0, SLICE_PC);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        aria-hidden
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
      >
        {SLICE_PC.map((pc, i) => {
          const a0 = START + i * SLICE;
          const mid = a0 + SLICE / 2;
          const selected = pc === keyPc;
          const lit = inKey?.has(pc) ?? true;
          const fill = keyColor ? (lit ? keyColor : OUT_OF_KEY) : rgb(i + 1);
          const opacity = keyColor ? (selected ? 1 : lit ? 0.85 : 0.5) : 0.7;
          const delay = staticMode ? 0 : i * SWEEP_MS;
          return (
            <g key={pc}>
              <path
                d={arcPath(c, inner, outer, a0, a0 + SLICE)}
                stroke={selected ? '#ffffff' : 'rgba(0, 0, 0, 0.3)'}
                strokeWidth={selected ? 2.5 : 0.5}
                style={{
                  fill,
                  opacity,
                  transition: `fill 220ms ease ${delay}ms, opacity 220ms ease ${delay}ms`,
                }}
              />
              <text
                x={c + labelR * Math.cos(mid)}
                y={c + labelR * Math.sin(mid)}
                textAnchor="middle"
                dominantBaseline="central"
                fill={
                  keyColor && !lit
                    ? 'rgba(255, 255, 255, 0.2)'
                    : selected
                      ? '#ffffff'
                      : 'rgba(255, 255, 255, 0.85)'
                }
                fontSize={(i === 6 ? 9 : 10) * s}
              >
                {displayAccidentals(spelled?.get(pc) ?? KEYS[i + 1])}
              </text>
            </g>
          );
        })}
      </svg>
      <div
        role="group"
        aria-label="Key center"
        className="absolute inset-0"
        onKeyDown={rovingKeyDown}
      >
        {SLICE_PC.map((pc, i) => {
          const mid = START + i * SLICE + SLICE / 2;
          const name = displayAccidentals(KEYS[i + 1]);
          return (
            <button
              key={pc}
              type="button"
              data-roving
              data-tour-target={
                pc === DEMO_KEY_PC && tourTarget ? 'key' : undefined
              }
              tabIndex={pc === roving.stop ? 0 : -1}
              aria-label={`${name} major`}
              aria-pressed={pc === keyPc}
              onClick={() => onPick(pc)}
              onFocus={() => roving.onFocus(pc)}
              className={cn(
                'absolute rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
                pc !== keyPc && 'hover:bg-white/10',
              )}
              style={{
                left: c + labelR * Math.cos(mid) - hit / 2,
                top: c + labelR * Math.sin(mid) - hit / 2,
                width: hit,
                height: hit,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
