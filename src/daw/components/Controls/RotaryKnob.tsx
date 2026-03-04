import { useRef, useCallback } from 'react';

// ── RotaryKnob ──────────────────────────────────────────────────────────
// SVG rotary knob with vertical drag interaction.
// Rotation range: 225° (from -225/2 to +225/2, i.e. ~7 o'clock to ~5 o'clock).

interface RotaryKnobProps {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
  size?: number;
  formatValue?: (v: number) => string;
  step?: number;
  arcColor?: string;
  log?: boolean; // logarithmic mapping (for frequency knobs)
}

const ARC_RANGE = 270; // degrees of rotation
const START_ANGLE = -135; // degrees (7 o'clock)

function valueToT(value: number, min: number, max: number, log?: boolean): number {
  if (log && min > 0) {
    return Math.log(value / min) / Math.log(max / min);
  }
  return (value - min) / (max - min);
}

function tToValue(t: number, min: number, max: number, log?: boolean): number {
  if (log && min > 0) {
    return min * Math.pow(max / min, t);
  }
  return min + t * (max - min);
}

function valueToAngle(value: number, min: number, max: number, log?: boolean): number {
  const t = valueToT(value, min, max, log);
  return START_ANGLE + t * ARC_RANGE;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

export function RotaryKnob({ value, min, max, onChange, label, size = 48, formatValue, step, arcColor, log }: RotaryKnobProps) {
  const dragRef = useRef<{ startY: number; startValue: number } | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = { startY: e.clientY, startValue: value };
    },
    [value],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      const dy = dragRef.current.startY - e.clientY;
      // Work in normalized t-space (0–1) so log and linear both use the same drag feel
      const startT = valueToT(dragRef.current.startValue, min, max, log);
      const newT = Math.min(1, Math.max(0, startT + dy / 150));
      let newValue = tToValue(newT, min, max, log);
      newValue = Math.min(max, Math.max(min, newValue));
      if (step) {
        newValue = Math.round(newValue / step) * step;
        newValue = Math.min(max, Math.max(min, newValue));
      }
      onChange(newValue);
    },
    [min, max, onChange, step, log],
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 2;
  const arcR = outerR - 4;
  const indicatorR = outerR - 10;
  const angle = valueToAngle(value, min, max, log);
  const indicatorEnd = polarToCartesian(cx, cy, indicatorR, angle);
  const indicatorStart = polarToCartesian(cx, cy, indicatorR * 0.4, angle);

  // Value arc from start to current angle
  const valueArc = angle > START_ANGLE ? describeArc(cx, cy, arcR, START_ANGLE, angle) : '';

  // Track arc (full range, dim)
  const trackArc = describeArc(cx, cy, arcR, START_ANGLE, START_ANGLE + ARC_RANGE);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        width={size}
        height={size}
        className="cursor-ns-resize select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Background circle */}
        <circle cx={cx} cy={cy} r={outerR} fill="rgba(140,160,190,0.12)" stroke="rgba(255,255,255,0.12)" strokeWidth={1} />

        {/* Track arc (dim) */}
        <path
          d={trackArc}
          fill="none"
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth={3}
          strokeLinecap="round"
        />

        {/* Value arc (accent) */}
        {valueArc && (
          <path
            d={valueArc}
            fill="none"
            stroke={arcColor || 'var(--color-accent)'}
            strokeWidth={3}
            strokeLinecap="round"
          />
        )}

        {/* Indicator line */}
        <line
          x1={indicatorStart.x}
          y1={indicatorStart.y}
          x2={indicatorEnd.x}
          y2={indicatorEnd.y}
          stroke="var(--color-text)"
          strokeWidth={2}
          strokeLinecap="round"
        />
      </svg>
      <span className="text-[10px] text-center leading-tight" style={{ color: 'var(--color-text-dim)' }}>
        {label}
      </span>
      {formatValue && (
        <span className="text-[9px] text-center tabular-nums" style={{ color: 'var(--color-text-dim)', opacity: 0.7 }}>
          {formatValue(value)}
        </span>
      )}
    </div>
  );
}
