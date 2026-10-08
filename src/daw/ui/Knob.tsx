import { type HTMLAttributes } from 'react';
import { cn } from '@/components/utilities';
import { formatValue } from './format';
import { Readout } from './Readout';
import {
  KNOB_TRAVEL_PX,
  quantize,
  toNorm,
  type SliderScale,
} from './sliderMath';
import { FOCUS_RING, TYPE_CLASS } from './styles';
import { useSliderControl } from './useSliderControl';

export type KnobSize = 'sm' | 'md' | 'lg';

/** Knob diameters in px: dense rows, the default, a featured parameter. */
const DIAMETER: Record<KnobSize, number> = { sm: 28, md: 36, lg: 44 };

export interface KnobProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'children'> {
  /** What the knob sets, in words. Required: it is the slider's name. */
  label: string;
  value: number;
  min: number;
  max: number;
  /** Snap to multiples of this; keys always move at least one step. */
  step?: number;
  scale?: SliderScale;
  /** Where Enter and a double-click put it back: usually the default. */
  resetValue?: number;
  /** The value as words and units, shown and read out ('−6.0 dB'). */
  format?: (value: number) => string;
  /** Live preview while turning. */
  onChange(value: number): void;
  /** Once per gesture or key press: write the store and the undo step here. */
  onCommit?(value: number): void;
  size?: KnobSize;
  /** Draw the arc from the centre (pan, detune) rather than from min. */
  bipolar?: boolean;
  disabled?: boolean;
  /** Show the value under the knob. Default true. */
  showValue?: boolean;
  /** Keep the label for screen readers only (it is always the name). */
  hideLabel?: boolean;
}

/** The sweep, in degrees clockwise from 12 o'clock: 7:30 round to 4:30. */
const START = -135;
const SWEEP = 270;

const point = (c: number, r: number, degrees: number) => {
  const rad = (degrees * Math.PI) / 180;
  return { x: c + r * Math.sin(rad), y: c - r * Math.cos(rad) };
};

const arc = (c: number, r: number, from: number, to: number) => {
  if (to - from < 0.5) return '';
  const a = point(c, r, from);
  const b = point(c, r, to);
  const large = to - from > 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`;
};

/**
 * A rotary control: role="slider", keyboard and pointer operable.
 * - Drag up or right to raise (150 px for the whole range), Shift for fine.
 * - Arrows step 1% (Shift: 0.1%), PageUp/PageDown 10%, Home/End the ends.
 * - Enter or a double-click resets to `resetValue`.
 * Colour is neutral: the value arc is text white, never an accent.
 */
export function Knob({
  label,
  value,
  min,
  max,
  step,
  scale,
  resetValue,
  format,
  onChange,
  onCommit,
  size = 'md',
  bipolar = false,
  disabled = false,
  showValue = true,
  hideLabel = false,
  className,
  ...rest
}: KnobProps) {
  const range = { min, max, step, scale };
  const { dragging, handlers } = useSliderControl({
    ...range,
    value,
    resetValue,
    disabled,
    axis: 'vertical',
    travelPx: KNOB_TRAVEL_PX,
    onChange,
    onCommit,
  });

  const shown = quantize(value, range);
  const text = format ? format(shown) : formatValue(shown, step);
  const d = DIAMETER[size];
  const c = d / 2;
  const r = c - 3;
  const t = toNorm(shown, range);
  const angle = START + t * SWEEP;
  const origin = bipolar
    ? START + toNorm((min + max) / 2, range) * SWEEP
    : START;
  const valueArc =
    angle >= origin ? arc(c, r, origin, angle) : arc(c, r, angle, origin);
  const tip = point(c, r - 2, angle);
  const base = point(c, r * 0.35, angle);

  return (
    <div
      className={cn(
        'inline-flex select-none flex-col items-center gap-1',
        disabled && 'opacity-40',
        className,
      )}
      {...rest}
    >
      <div
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={shown}
        aria-valuetext={text}
        aria-disabled={disabled || undefined}
        data-dragging={dragging || undefined}
        className={cn(
          'shrink-0 touch-none rounded-full',
          disabled ? 'cursor-not-allowed' : 'cursor-ns-resize',
          FOCUS_RING,
        )}
        style={{ width: d, height: d }}
        {...handlers}
      >
        <svg width={d} height={d} viewBox={`0 0 ${d} ${d}`} aria-hidden>
          <path
            d={arc(c, r, START, START + SWEEP)}
            className="fill-none stroke-daw-outline"
            strokeWidth={3}
            strokeLinecap="round"
          />
          {valueArc && (
            <path
              d={valueArc}
              className="fill-none stroke-daw-text"
              strokeWidth={3}
              strokeLinecap="round"
            />
          )}
          <line
            x1={base.x}
            y1={base.y}
            x2={tip.x}
            y2={tip.y}
            className="stroke-daw-text"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </svg>
      </div>
      {showValue && <Readout value={text} tone="muted" aria-hidden />}
      {!hideLabel && (
        <span
          aria-hidden
          className={cn(
            TYPE_CLASS.label,
            'max-w-full truncate text-center text-daw-text-3',
          )}
        >
          {label}
        </span>
      )}
    </div>
  );
}
