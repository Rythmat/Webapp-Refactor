import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { cn } from '@/components/utilities';

// ── A rotary knob, as on a desk or an amp ──────────────────────────────────
// Drag up to turn it up, as on most audio software; arrows, Page Up/Down, Home
// and End from the keyboard. It's a slider to a screen reader, which is what it is.

/** The sweep, either side of straight up, in degrees. */
const SWEEP = 135;
/** How far a drag goes for the whole range, in CSS pixels. */
const DRAG_RANGE = 160;

const angleOf = (value: number, min: number, max: number) =>
  -SWEEP + ((value - min) / (max - min)) * SWEEP * 2;

const polar = (deg: number, r: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: 50 + r * Math.cos(rad), y: 50 + r * Math.sin(rad) };
};

export function Knob({
  label,
  value,
  min,
  max,
  step = 1,
  valueText,
  marks = [],
  accent,
  disabled,
  size = 'md',
  onChange,
}: {
  /** What it's called, for a screen reader and under it. */
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  valueText: string;
  /** Printed round it, as a real one's are. */
  marks?: readonly { value: number; text: string }[];
  accent: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onChange?: (value: number) => void;
}) {
  const drag = useRef<{ y: number; from: number } | null>(null);
  const live = !disabled && !!onChange;

  const set = (next: number) => {
    if (!live) return;
    const snapped = Math.round(next / step) * step;
    const clamped = Math.max(min, Math.min(max, snapped));
    if (clamped !== value) onChange?.(Number(clamped.toFixed(4)));
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!live) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = { y: event.clientY, from: value };
    event.currentTarget.focus();
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const fine = event.shiftKey ? 0.25 : 1;
    const moved = ((drag.current.y - event.clientY) / DRAG_RANGE) * fine;
    set(drag.current.from + moved * (max - min));
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const big = Math.max(step, (max - min) / 10);
    const moves: Record<string, number> = {
      ArrowUp: value + step,
      ArrowRight: value + step,
      ArrowDown: value - step,
      ArrowLeft: value - step,
      PageUp: value + big,
      PageDown: value - big,
      Home: min,
      End: max,
    };
    const next = moves[event.key];
    if (next === undefined) return;
    // The lesson's own keys (back, play) wait while the knob is in hand.
    event.preventDefault();
    event.stopPropagation();
    set(next);
  };

  const angle = angleOf(value, min, max);
  const arcStart = polar(-SWEEP, 40);
  const arcEnd = polar(angle, 40);
  const sweep = angle + SWEEP;
  const pointer = polar(angle, 26);
  const width = { sm: 'w-10', md: 'w-16', lg: 'w-24' }[size];

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        role="slider"
        tabIndex={live ? 0 : -1}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={valueText}
        aria-disabled={!live || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className={cn(
          'relative aspect-square touch-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/70',
          width,
          live ? 'cursor-ns-resize' : 'opacity-45',
        )}
        data-knob={label}
      >
        <svg viewBox="0 0 100 100" className="size-full" aria-hidden>
          {/* The track round it, and how far it's turned. */}
          <path
            d={`M ${arcStart.x} ${arcStart.y} A 40 40 0 1 1 ${polar(SWEEP, 40).x} ${polar(SWEEP, 40).y}`}
            fill="none"
            stroke="rgb(255 255 255 / 0.14)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {sweep > 0.5 && (
            <path
              d={`M ${arcStart.x} ${arcStart.y} A 40 40 0 ${sweep > 180 ? 1 : 0} 1 ${arcEnd.x} ${arcEnd.y}`}
              fill="none"
              stroke={live ? accent : 'rgb(255 255 255 / 0.5)'}
              strokeWidth="5"
              strokeLinecap="round"
            />
          )}
          {/* The cap, with its grip and the line that shows where it points. */}
          <circle
            cx="50"
            cy="50"
            r="30"
            fill="#1c1c21"
            stroke="rgb(255 255 255 / 0.55)"
            strokeWidth="2"
          />
          {Array.from({ length: 12 }, (_, i) => {
            const a = polar(i * 30 + angle, 30);
            const b = polar(i * 30 + angle, 27);
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="rgb(255 255 255 / 0.3)"
                strokeWidth="1.5"
              />
            );
          })}
          <line
            x1={polar(angle, 8).x}
            y1={polar(angle, 8).y}
            x2={pointer.x}
            y2={pointer.y}
            stroke="#ffffff"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
        {marks.map((mark) => {
          const at = polar(angleOf(mark.value, min, max), 56);
          return (
            <span
              key={mark.value}
              aria-hidden
              className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[0.6875rem] tabular-nums leading-none text-white/50"
              style={{ left: `${at.x}%`, top: `${at.y}%` }}
            >
              {mark.text}
            </span>
          );
        })}
      </div>
    </div>
  );
}
