import { useCallback, useRef } from 'react';

// A rotary volume knob for arcade-game header bars. Drag it (or scroll over it)
// to set a 0–1 value; the indicator sweeps from -135° to +135°.
const DIAL_MIN_ANGLE = -135;
const DIAL_MAX_ANGLE = 135;

interface VolumeDialProps {
  /** Current volume, 0–1. */
  value: number;
  /** Called with the new 0–1 value as the knob is turned. */
  onChange: (v: number) => void;
}

export function VolumeDial({ value, onChange }: VolumeDialProps) {
  const knobRef = useRef<HTMLButtonElement>(null);
  const angle = DIAL_MIN_ANGLE + value * (DIAL_MAX_ANGLE - DIAL_MIN_ANGLE);
  const pct = Math.round(value * 100);

  const setFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const el = knobRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      // 0° points up, positive is clockwise
      let deg = (Math.atan2(clientX - cx, cy - clientY) * 180) / Math.PI;
      deg = Math.max(DIAL_MIN_ANGLE, Math.min(DIAL_MAX_ANGLE, deg));
      onChange((deg - DIAL_MIN_ANGLE) / (DIAL_MAX_ANGLE - DIAL_MIN_ANGLE));
    },
    [onChange],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setFromPointer(e.clientX, e.clientY);
      const move = (ev: PointerEvent) => setFromPointer(ev.clientX, ev.clientY);
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    },
    [setFromPointer],
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      const delta = e.deltaY < 0 ? 0.05 : -0.05;
      onChange(Math.max(0, Math.min(1, value + delta)));
    },
    [onChange, value],
  );

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex flex-col items-end">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          Volume
        </span>
        <span className="text-sm font-medium tabular-nums text-white">
          {pct}%
        </span>
      </div>
      <button
        ref={knobRef}
        type="button"
        onPointerDown={handlePointerDown}
        onWheel={handleWheel}
        aria-label={`Volume ${pct}%`}
        className="relative h-11 w-11 shrink-0 cursor-grab touch-none rounded-full border border-white/10 bg-black/30 shadow-inner backdrop-blur-sm transition-colors hover:border-emerald-400/40 active:cursor-grabbing"
      >
        <div
          className="absolute inset-0"
          style={{ transform: `rotate(${angle}deg)` }}
        >
          <span className="absolute left-1/2 top-[3px] h-3 w-0.5 -translate-x-1/2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
        </div>
        <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-600" />
      </button>
    </div>
  );
}
