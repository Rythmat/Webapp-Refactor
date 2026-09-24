import { useMemo, type ReactNode } from 'react';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import {
  CIRCLE_SEMITONES,
  SEMITONE_TO_CIRCLE_INDEX,
  circleKeyLabel,
  wedgeColorRgb,
  wheelScaleInfo,
} from '@/lib/keyWheelColors';

/**
 * The circle of fifths as a colour wheel, drawn from props alone.
 *
 * The Studio has one of these wired to its own key; this is the same picture
 * with nothing behind it, so a song page can show a song's key without the
 * Studio's state coming along. Clicking is opt-in: with no `onSelectPc` the
 * wheel is a read-only picture.
 */

const DEFAULT_SIZE = 180;
const SLICE_ANGLE = (2 * Math.PI) / 12;
const START_OFFSET = -Math.PI / 2 - SLICE_ANGLE / 2; // C sits at the top

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

export interface KeyWheelProps {
  /** The tonic to highlight, as a pitch class, or null for none. */
  selectedPc: number | null;
  /** Prism mode slug: 'ionian', 'aeolian', 'mixolydian', … */
  mode: string;
  size?: number;
  /** Omit to render a picture rather than a control. */
  onSelectPc?: (pc: number) => void;
  /** Rendered under the wheel: the Studio's mode menu, or a fixed label. */
  footer?: ReactNode;
  ariaLabel?: string;
}

export function KeyWheel({
  selectedPc,
  mode,
  size = DEFAULT_SIZE,
  onSelectPc,
  footer,
  ariaLabel = 'Key',
}: KeyWheelProps) {
  const scale = size / DEFAULT_SIZE;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 80 * scale;
  const innerR = 46 * scale;
  const labelR = 63 * scale;

  // Only for the labels: the chosen key spells B♭, not A♯.
  const spellings = useMemo(
    () =>
      selectedPc === null ? null : wheelScaleInfo(selectedPc, mode)?.spellings,
    [selectedPc, mode],
  );
  const selectedIndex =
    selectedPc === null ? null : (SEMITONE_TO_CIRCLE_INDEX[selectedPc] ?? null);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="select-none"
        role={onSelectPc ? 'radiogroup' : 'img'}
        aria-label={ariaLabel}
      >
        {Array.from({ length: 12 }, (_, i) => {
          const index = i + 1;
          const semitone = CIRCLE_SEMITONES[index];
          const isSelected = index === selectedIndex;

          // Every wedge always wears the colour that key would be in this
          // mode, so picking a new tonic reads as a colour change: C to F is
          // red to pink in Ionian, and pink to red from C to G in Mixolydian.
          // The keys never move; only the colours shift with the mode.
          const [r, g, b] = wedgeColorRgb(semitone, mode);
          const fill = `rgb(${r}, ${g}, ${b})`;
          const opacity = isSelected ? 1 : 0.8;

          const startAngle = START_OFFSET + i * SLICE_ANGLE;
          const endAngle = startAngle + SLICE_ANGLE;
          const midAngle = startAngle + SLICE_ANGLE / 2;
          const label = displayAccidentals(
            spellings?.get(semitone) ?? circleKeyLabel(index),
          );

          return (
            <g
              key={index}
              onClick={onSelectPc ? () => onSelectPc(semitone) : undefined}
              role={onSelectPc ? 'radio' : undefined}
              aria-checked={onSelectPc ? isSelected : undefined}
              aria-label={onSelectPc ? label : undefined}
              tabIndex={onSelectPc ? 0 : undefined}
              onKeyDown={
                onSelectPc
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectPc(semitone);
                      }
                    }
                  : undefined
              }
              style={{ cursor: onSelectPc ? 'pointer' : 'default' }}
            >
              <path
                d={arcPath(cx, cy, innerR, outerR, startAngle, endAngle)}
                fill={fill}
                stroke={isSelected ? '#fff' : 'rgba(0,0,0,0.3)'}
                strokeWidth={isSelected ? 2.5 : 0.5}
                opacity={opacity}
              />
              <text
                x={cx + labelR * Math.cos(midAngle)}
                y={cy + labelR * Math.sin(midAngle)}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isSelected ? '#fff' : 'rgba(255,255,255,0.85)'}
                fontSize={(index === 7 ? 9 : 10) * scale}
                fontWeight={isSelected ? 700 : 500}
                style={{ pointerEvents: 'none' }}
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
      {footer}
    </div>
  );
}
