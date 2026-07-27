import React, { useRef, useCallback } from 'react';
import styles from './Knob.module.css';

/**
 * Live modulation indicator: the range the parameter is being swept over by
 * the modulation matrix, in the knob's own value units, plus an optional
 * live source position. Rendered as a translucent arc over the track with a
 * moving dot — modulation is visible on the destination itself.
 */
export interface KnobModArc {
  lo: number;
  hi: number;
  /** Current modulated value (moves the dot); null hides the dot. */
  live?: number | null;
  color?: string;
}

interface KnobProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
  label?: string;
  accent?: string;
  size?: number;
  showValue?: boolean;
  horizontal?: boolean;
  labelLeft?: boolean;
  modArc?: KnobModArc | null;
  formatValue?: (value: number) => string;
  onChange: (value: number) => void;
}

const DRAG_SENSITIVITY = 0.005;
const FINE_MULTIPLIER = 0.1;
const START_ANGLE = 225;
const END_ANGLE = 495;
const SWEEP = END_ANGLE - START_ANGLE; // 270 degrees

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

export const Knob: React.FC<KnobProps> = React.memo(
  ({
    value,
    min,
    max,
    step = 0.01,
    defaultValue,
    label,
    accent = '#7ecfcf',
    size = 40,
    showValue = true,
    horizontal = false,
    labelLeft = false,
    modArc = null,
    formatValue,
    onChange,
  }) => {
    const startY = useRef<number | null>(null);
    const startValue = useRef<number>(0);

    const normalized = clamp((value - min) / (max - min), 0, 1);
    const angle = START_ANGLE + normalized * SWEEP;

    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 4;

    const trackPath = describeArc(cx, cy, r, START_ANGLE, END_ANGLE);
    const arcPath =
      normalized > 0.001 ? describeArc(cx, cy, r, START_ANGLE, angle) : '';

    const indicator = polarToCartesian(cx, cy, r - 6, angle);

    // Modulation range arc + live dot (drawn over the track)
    let modArcPath = '';
    let modLiveDot: { x: number; y: number } | null = null;
    const modColor = modArc?.color ?? accent;
    if (modArc) {
      const loNorm = clamp((modArc.lo - min) / (max - min), 0, 1);
      const hiNorm = clamp((modArc.hi - min) / (max - min), 0, 1);
      if (hiNorm - loNorm > 0.001) {
        modArcPath = describeArc(
          cx,
          cy,
          r,
          START_ANGLE + loNorm * SWEEP,
          START_ANGLE + hiNorm * SWEEP,
        );
      }
      if (modArc.live != null) {
        const liveNorm = clamp((modArc.live - min) / (max - min), 0, 1);
        modLiveDot = polarToCartesian(
          cx,
          cy,
          r,
          START_ANGLE + liveNorm * SWEEP,
        );
      }
    }

    const handlePointerDown = useCallback(
      (e: React.PointerEvent) => {
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        startY.current = e.clientY;
        startValue.current = value;
      },
      [value],
    );

    const handlePointerMove = useCallback(
      (e: React.PointerEvent) => {
        if (startY.current === null) return;
        const dy = startY.current - e.clientY;
        const sensitivity = e.shiftKey
          ? DRAG_SENSITIVITY * FINE_MULTIPLIER
          : DRAG_SENSITIVITY;
        let newValue = startValue.current + dy * sensitivity * (max - min);
        // Snap to step then clamp (clamp last to prevent floating point escape)
        newValue = Math.round(newValue / step) * step;
        newValue = clamp(newValue, min, max);
        onChange(newValue);
      },
      [max, min, step, onChange],
    );

    const handlePointerUp = useCallback(() => {
      startY.current = null;
    }, []);

    const handleDoubleClick = useCallback(() => {
      if (defaultValue !== undefined) {
        onChange(defaultValue);
      }
    }, [defaultValue, onChange]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        let delta = 0;
        const fine = e.shiftKey ? FINE_MULTIPLIER : 1;
        switch (e.key) {
          case 'ArrowUp':
          case 'ArrowRight':
            delta = step * fine;
            break;
          case 'ArrowDown':
          case 'ArrowLeft':
            delta = -step * fine;
            break;
          case 'Home':
            onChange(min);
            e.preventDefault();
            return;
          case 'End':
            onChange(max);
            e.preventDefault();
            return;
          default:
            return;
        }
        e.preventDefault();
        const newValue = clamp(
          Math.round((value + delta) / step) * step,
          min,
          max,
        );
        onChange(newValue);
      },
      [value, min, max, step, onChange],
    );

    const clampedValue = clamp(value, min, max);
    const displayValue = formatValue
      ? formatValue(clampedValue)
      : clampedValue >= 100
        ? Math.round(clampedValue).toString()
        : clampedValue.toFixed(clampedValue % 1 === 0 ? 0 : 1);

    const svgEl = (
      <svg
        className={styles.svgContainer}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        tabIndex={0}
        role="slider"
        aria-label={label ?? 'Knob'}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuetext={displayValue}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
      >
        {/* Background track */}
        <path className={styles.track} d={trackPath} strokeWidth={3} />
        {/* Value arc */}
        {arcPath && (
          <path
            className={styles.arc}
            d={arcPath}
            stroke={accent}
            strokeWidth={3}
          />
        )}
        {/* Position indicator dot */}
        <circle
          className={styles.indicator}
          cx={indicator.x}
          cy={indicator.y}
          r={2.5}
          fill={accent}
        />
        {/* Modulation range arc + live dot */}
        {modArcPath && (
          <path
            d={modArcPath}
            fill="none"
            stroke={modColor}
            strokeOpacity={0.4}
            strokeWidth={3}
            strokeLinecap="round"
            pointerEvents="none"
          />
        )}
        {modLiveDot && (
          <circle
            cx={modLiveDot.x}
            cy={modLiveDot.y}
            r={2}
            fill={modColor}
            pointerEvents="none"
          />
        )}
      </svg>
    );

    const textEls = horizontal ? (
      <div className={labelLeft ? styles.textGroupRight : styles.textGroup}>
        {showValue && <span className={styles.value}>{displayValue}</span>}
        {label && <span className={styles.label}>{label}</span>}
      </div>
    ) : (
      <>
        {showValue && <span className={styles.value}>{displayValue}</span>}
        {label && <span className={styles.label}>{label}</span>}
      </>
    );

    return (
      <div className={horizontal ? styles.containerH : styles.container}>
        {labelLeft && horizontal ? (
          <>
            {textEls}
            {svgEl}
          </>
        ) : (
          <>
            {svgEl}
            {textEls}
          </>
        )}
      </div>
    );
  },
);
