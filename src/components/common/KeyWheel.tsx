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
/** A wedge outside a lit scale. */
const OUT_OF_SCALE = '#2e2e34';
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
  /** A scale's notes lit on the wheel: these pitch classes in colour
   *  (`scaleColor`, the mode's, or else each wedge's own), the rest grey. */
  inScalePcs?: readonly number[];
  /** The one colour a lit scale's wedges take (C Lydian's orange). */
  scaleColor?: string;
  /** The wedges' order: round the circle of fifths (the default, C G D …)
   *  or chromatically, a semitone a wedge (C D♭ D …), as the mode page's
   *  star turns from one to the other. */
  order?: 'fifths' | 'chromatic';
  /** In chromatic order, the note kept on its circle-of-fifths wedge (the
   *  chosen key); the rest are lettered a semitone a wedge round from it.
   *  C by default: plain chromatic, C at the top. */
  chromaticAnchor?: number;
  /** The key under the pointer or the keyboard focus, null as it leaves. */
  onHoverPc?: (pc: number | null) => void;
  /** Rendered under the wheel: the Studio's mode menu, or a fixed label. */
  footer?: ReactNode;
  ariaLabel?: string;
}

export function KeyWheel({
  selectedPc,
  mode,
  size = DEFAULT_SIZE,
  onSelectPc,
  onHoverPc,
  inScalePcs,
  scaleColor,
  order = 'fifths',
  chromaticAnchor = 0,
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
          // Wedge i (clockwise from the top) holds a fifth more than the
          // last, or in chromatic order a semitone more, round from the
          // anchor on its own fifths wedge.
          const semitone =
            order === 'chromatic'
              ? (((chromaticAnchor +
                  i -
                  (SEMITONE_TO_CIRCLE_INDEX[chromaticAnchor] - 1)) %
                  12) +
                  12) %
                12
              : CIRCLE_SEMITONES[i + 1];
          const index = SEMITONE_TO_CIRCLE_INDEX[semitone];
          const isSelected = semitone === selectedPc;

          // Every wedge always wears the colour that key would be in this
          // mode, so picking a new tonic reads as a colour change: C to F is
          // red to pink in Ionian, and pink to red from C to G in Mixolydian.
          // The keys never move; only the colours shift with the mode.
          const [r, g, b] = wedgeColorRgb(semitone, mode);
          const inScale = !inScalePcs || inScalePcs.includes(semitone);
          // A lit scale: its notes in the mode's colour, the rest grey.
          const fill = !inScale
            ? OUT_OF_SCALE
            : inScalePcs && scaleColor
              ? scaleColor
              : `rgb(${r}, ${g}, ${b})`;
          const opacity = isSelected || inScalePcs ? 1 : 0.8;

          const startAngle = START_OFFSET + i * SLICE_ANGLE;
          const endAngle = startAngle + SLICE_ANGLE;
          const midAngle = startAngle + SLICE_ANGLE / 2;
          const label = displayAccidentals(
            spellings?.get(semitone) ?? circleKeyLabel(index),
          );

          return (
            <g
              key={i}
              onClick={onSelectPc ? () => onSelectPc(semitone) : undefined}
              onPointerEnter={onHoverPc ? () => onHoverPc(semitone) : undefined}
              onPointerLeave={onHoverPc ? () => onHoverPc(null) : undefined}
              onFocus={onHoverPc ? () => onHoverPc(semitone) : undefined}
              onBlur={onHoverPc ? () => onHoverPc(null) : undefined}
              role={onSelectPc ? 'radio' : undefined}
              aria-checked={onSelectPc ? isSelected : undefined}
              aria-label={onSelectPc ? label : undefined}
              tabIndex={onSelectPc ? 0 : undefined}
              // The focused wedge is outlined by the highlight it gets (the
              // selection's white edge), not the browser's box.
              className="outline-none"
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
                data-scale={inScalePcs ? (inScale ? 'in' : 'out') : undefined}
                stroke={isSelected ? '#fff' : 'rgba(0,0,0,0.3)'}
                strokeWidth={isSelected ? 2.5 : 0.5}
                // Eased, as a scale lights or the wheel steps back.
                style={{
                  fill,
                  opacity,
                  transition: 'fill 500ms ease, opacity 400ms ease',
                }}
              />
              <text
                x={cx + labelR * Math.cos(midAngle)}
                y={cy + labelR * Math.sin(midAngle)}
                textAnchor="middle"
                dominantBaseline="central"
                fill={
                  isSelected
                    ? '#fff'
                    : inScale
                      ? 'rgba(255,255,255,0.85)'
                      : 'rgba(255,255,255,0.4)'
                }
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
