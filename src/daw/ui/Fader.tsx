import { type HTMLAttributes } from 'react';
import { cn } from '@/components/utilities';
import { formatValue } from './format';
import { Readout } from './Readout';
import { quantize, toNorm, type SliderScale } from './sliderMath';
import { FOCUS_RING, TYPE_CLASS } from './styles';
import { useSliderControl } from './useSliderControl';

export interface FaderProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'children'> {
  /** What the fader sets, in words. Required: it is the slider's name. */
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** A gain fader passes its taper here (a ValueMapping) or 'log'. */
  scale?: SliderScale;
  /** Where Enter and a double-click put it back: unity, usually. */
  resetValue?: number;
  /** The value as words and units, shown and read out ('−6.0 dB'). */
  format?: (value: number) => string;
  onChange(value: number): void;
  onCommit?(value: number): void;
  orientation?: 'vertical' | 'horizontal';
  /** The travel's length in px, cap included. Default 120. */
  length?: number;
  disabled?: boolean;
  showValue?: boolean;
  hideLabel?: boolean;
}

/** The cap: 24 px across the track and 12 px along it. */
const CAP_ALONG = 12;

/**
 * A linear control: role="slider" with the Knob's keyboard and pointer
 * rules. The drag is relative and one-to-one (the cap follows the pointer),
 * a tenth as far with Shift; it never jumps to where the press landed, so
 * grabbing the fader cannot change the level. The whole 24 px wide track is
 * the target.
 */
export function Fader({
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
  orientation = 'vertical',
  length = 120,
  disabled = false,
  showValue = true,
  hideLabel = false,
  className,
  ...rest
}: FaderProps) {
  const range = { min, max, step, scale };
  const vertical = orientation === 'vertical';
  const { dragging, handlers } = useSliderControl({
    ...range,
    value,
    resetValue,
    disabled,
    axis: orientation,
    travelPx: length - CAP_ALONG,
    onChange,
    onCommit,
  });

  const shown = quantize(value, range);
  const text = format ? format(shown) : formatValue(shown, step);
  const t = toNorm(shown, range);
  const fill = `${t * 100}%`;
  const capOffset = `calc(${t} * (100% - ${CAP_ALONG}px))`;

  return (
    <div
      className={cn(
        'inline-flex select-none items-center gap-1',
        vertical ? 'flex-col' : 'flex-row',
        disabled && 'opacity-40',
        className,
      )}
      {...rest}
    >
      <div
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-orientation={orientation}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={shown}
        aria-valuetext={text}
        aria-disabled={disabled || undefined}
        data-dragging={dragging || undefined}
        className={cn(
          'relative shrink-0 touch-none rounded-[var(--daw-radius-sm)]',
          vertical ? 'w-6' : 'h-6',
          disabled
            ? 'cursor-not-allowed'
            : vertical
              ? 'cursor-ns-resize'
              : 'cursor-ew-resize',
          FOCUS_RING,
        )}
        style={vertical ? { height: length } : { width: length }}
        {...handlers}
      >
        <div
          aria-hidden
          className={cn(
            'absolute rounded-full bg-daw-outline',
            vertical
              ? 'inset-y-1.5 left-1/2 w-1 -translate-x-1/2'
              : 'inset-x-1.5 top-1/2 h-1 -translate-y-1/2',
          )}
        >
          <div
            className={cn(
              'absolute rounded-full bg-daw-text-3',
              vertical ? 'inset-x-0 bottom-0' : 'inset-y-0 left-0',
            )}
            style={vertical ? { height: fill } : { width: fill }}
          />
        </div>
        <div
          aria-hidden
          className={cn(
            'absolute rounded-[var(--daw-radius-sm)] bg-daw-text shadow-md shadow-black/40',
            vertical ? 'inset-x-0 h-3' : 'inset-y-0 w-3',
          )}
          style={vertical ? { bottom: capOffset } : { left: capOffset }}
        />
      </div>
      {showValue && <Readout value={text} tone="muted" aria-hidden />}
      {!hideLabel && (
        <span
          aria-hidden
          className={cn(TYPE_CLASS.label, 'truncate text-daw-text-3')}
        >
          {label}
        </span>
      )}
    </div>
  );
}
