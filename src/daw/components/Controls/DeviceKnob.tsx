import { cn } from '@/components/utilities';
import { formatValue } from '@/daw/ui/format';
import {
  KNOB_TRAVEL_PX,
  quantize,
  toNorm,
  type SliderScale,
} from '@/daw/ui/sliderMath';
import { FOCUS_RING } from '@/daw/ui/styles';
import { useSliderControl } from '@/daw/ui/useSliderControl';

// ── A device card's knob (the floating frame, 2026-10-21) ──────────────────
//
// The knob the dock's device cards draw, in three looks after the floating
// frame's synth:
//   'arc'    a faint track round a soft face, the value as an arc in the
//            device's colour, a short pointer on the face;
//   'ticks'  a ring of 25 ticks lit up to the value, round the same face
//            (a position through a table);
//   'value'  the arc with the value written inside, no pointer (Cutoff).
// While modulation moves it (a note playing), it draws the live value and
// keeps its own. A bipolar knob marks its middle with a small triangle over
// the arc and
// draws its arc from there. Its name sits under it (12 px, bold), up into
// the arc's open bottom. The
// geometry scales with the diameter, drawn at 37 px (50 for a lead knob).
//
// It is the design system's slider (useSliderControl): role="slider", drag
// up or right to raise, Shift for fine, the arrows, Home and End, and Enter
// or a double-click back to `resetValue`.

export type DeviceKnobLook = 'arc' | 'ticks' | 'value';

export interface DeviceKnobProps {
  /** The name under the knob, and the slider's. */
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  scale?: SliderScale;
  resetValue?: number;
  /** The value in words ('4.0 kHz'), read out and written in a 'value' knob. */
  format?: (value: number) => string;
  onChange(value: number): void;
  /** The diameter, in px. */
  size?: number;
  look?: DeviceKnobLook;
  bipolar?: boolean;
  /** The device's colour: the lit arc, ticks and pointer. */
  color: string;
  /** Draw the arc unlit (a warp with no mode). */
  dim?: boolean;
  /**
   * Where modulation has the value now, while a note plays: the arc, ticks
   * and pointer follow it, and the knob's own value stays the name's.
   */
  live?: number | null;
  className?: string;
  'data-testid'?: string;
}

/** The sweep: 7:30 round to 4:30, in degrees clockwise from 12 o'clock. */
const START = -135;
const SWEEP = 270;
const TICKS = 25;

const point = (c: number, r: number, deg: number) => {
  const rad = (deg * Math.PI) / 180;
  return { x: c + r * Math.sin(rad), y: c - r * Math.cos(rad) };
};

const arc = (c: number, r: number, from: number, to: number) => {
  if (to - from < 0.5) return '';
  const a = point(c, r, from);
  const b = point(c, r, to);
  const large = to - from > 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`;
};

export function DeviceKnob({
  label,
  value,
  min,
  max,
  step,
  scale,
  resetValue,
  format,
  onChange,
  size = 37,
  look = 'arc',
  bipolar = false,
  color,
  dim = false,
  live = null,
  className,
  'data-testid': testId,
}: DeviceKnobProps) {
  const range = { min, max, step, scale };
  const { dragging, handlers } = useSliderControl({
    ...range,
    value,
    resetValue,
    axis: 'vertical',
    travelPx: KNOB_TRAVEL_PX,
    onChange,
  });
  const shown = quantize(value, range);
  const text = format ? format(shown) : formatValue(shown, step);

  // Drawn at 37 px and scaled: the arc's radius and weight, the face, the
  // ticks' ring and the pointer.
  const k = size / 37;
  const c = size / 2;
  const arcR = 13.15 * k;
  const weight = look === 'value' ? 4.25 * (size / 50) : 3.15 * k;
  const faceR = size / 4;
  const drawn = live ?? shown;
  const angle = START + toNorm(drawn, range) * SWEEP;
  const middle = START + toNorm((min + max) / 2, range) * SWEEP;
  const origin = bipolar ? middle : START;
  const lit =
    angle >= origin ? arc(c, arcR, origin, angle) : arc(c, arcR, angle, origin);
  const tip = point(c, 7.2 * k, angle);
  const base = point(c, 2.3 * k, angle);
  const arcColor = dim ? 'var(--daw-text-3)' : color;

  return (
    <div
      className={cn('inline-flex select-none flex-col items-center', className)}
    >
      <div
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={shown}
        aria-valuetext={text}
        data-dragging={dragging || undefined}
        data-live={live !== null || undefined}
        data-testid={testId}
        title={`${label}: ${text}`}
        className={cn(
          'shrink-0 cursor-ns-resize touch-none rounded-full',
          FOCUS_RING,
        )}
        style={{ width: size, height: size }}
        {...handlers}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          aria-hidden
          className="overflow-visible"
        >
          {look === 'ticks' ? (
            Array.from({ length: TICKS }, (_, i) => {
              const deg = START + (i / (TICKS - 1)) * SWEEP;
              const a = point(c, 12.2 * k, deg);
              const b = point(c, 14.1 * k, deg);
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={deg <= angle + 0.01 ? color : 'var(--daw-outline)'}
                  strokeWidth={1.5 * k}
                  strokeLinecap="round"
                />
              );
            })
          ) : (
            <>
              <path
                d={arc(c, arcR, START, START + SWEEP)}
                fill="none"
                stroke="var(--daw-knob-track)"
                strokeWidth={weight}
                strokeLinecap="round"
              />
              {lit && (
                <path
                  d={lit}
                  fill="none"
                  stroke={arcColor}
                  strokeWidth={weight}
                  strokeLinecap="round"
                />
              )}
            </>
          )}
          {look !== 'value' && (
            <circle cx={c} cy={c} r={faceR} fill="var(--daw-device)" />
          )}
          {look === 'value' ? (
            <text
              x={c}
              y={c}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={Math.round(size * 0.2)}
              fontWeight={400}
              fill="var(--daw-text)"
            >
              {text}
            </text>
          ) : (
            <line
              x1={base.x}
              y1={base.y}
              x2={tip.x}
              y2={tip.y}
              stroke={color}
              strokeWidth={1.5 * k}
              strokeLinecap="round"
            />
          )}
          {bipolar && (
            // The middle, over the arc.
            <path
              d={`M ${c - 3.75 * k} ${-0.6 * k} L ${c + 3.75 * k} ${-0.6 * k} L ${c} ${3.6 * k} Z`}
              fill={color}
            />
          )}
        </svg>
      </div>
      {/* Up into the arc's open bottom: 31 px under a 37 px knob's top. */}
      <span
        aria-hidden
        className="min-w-[50px] whitespace-nowrap text-center text-[length:var(--daw-font-label)] font-bold leading-[15px] text-daw-text-2"
        style={{ marginTop: -Math.round(6 * k) }}
      >
        {label}
      </span>
    </div>
  );
}
