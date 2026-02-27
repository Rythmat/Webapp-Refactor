import React, { useCallback, useRef, useEffect } from 'react';

interface SynthKnobProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
  label: string;
  color?: string;
  size?: number;  // diameter in px
  formatValue?: (v: number) => string;
  onChange: (value: number) => void;
}

const SynthKnob: React.FC<SynthKnobProps> = ({
  value, min, max, step = 0.01, defaultValue, label, color = '#50C8A8',
  size = 36, formatValue, onChange,
}) => {
  const knobRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startValueRef = useRef(0);

  const clamp = useCallback((v: number) => {
    const stepped = Math.round(v / step) * step;
    return Math.max(min, Math.min(max, stepped));
  }, [min, max, step]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    startYRef.current = e.clientY;
    startValueRef.current = value;
    document.body.style.cursor = 'ns-resize';
  }, [value]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const dy = startYRef.current - e.clientY;
      const range = max - min;
      // 150px of vertical drag = full range
      const sensitivity = e.shiftKey ? 600 : 150;
      const delta = (dy / sensitivity) * range;
      onChange(clamp(startValueRef.current + delta));
    };

    const handleMouseUp = () => {
      if (draggingRef.current) {
        draggingRef.current = false;
        document.body.style.cursor = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [max, min, clamp, onChange]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -step : step;
    const multiplier = e.shiftKey ? 1 : 5;
    onChange(clamp(value + delta * multiplier));
  }, [value, step, clamp, onChange]);

  const handleDoubleClick = useCallback(() => {
    if (defaultValue !== undefined) {
      onChange(clamp(defaultValue));
    }
  }, [defaultValue, clamp, onChange]);

  // Normalize to 0-1 for visual
  const normalized = (value - min) / (max - min);
  // Knob sweeps from -135deg to +135deg (270deg range)
  const angle = -135 + normalized * 270;

  const displayValue = formatValue
    ? formatValue(value)
    : value >= 1000
      ? `${(value / 1000).toFixed(1)}k`
      : value >= 100
        ? Math.round(value).toString()
        : value.toFixed(step < 0.1 ? 2 : 1);

  const r = size / 2;
  const strokeWidth = 2.5;
  const arcR = r - strokeWidth - 1;
  const cx = r;
  const cy = r;

  // Arc path helper (for the value ring)
  const describeArc = (startAngle: number, endAngle: number) => {
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;
    const x1 = cx + arcR * Math.cos(startRad);
    const y1 = cy + arcR * Math.sin(startRad);
    const x2 = cx + arcR * Math.cos(endRad);
    const y2 = cy + arcR * Math.sin(endRad);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${arcR} ${arcR} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  return (
    <div className="flex flex-col items-center gap-0.5 select-none">
      <div
        ref={knobRef}
        className="relative cursor-ns-resize"
        style={{ width: size, height: size }}
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        title={`${label}: ${displayValue}`}
      >
        <svg width={size} height={size} className="absolute inset-0">
          {/* Background arc (track) */}
          <path
            d={describeArc(-135, 135)}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Value arc */}
          {normalized > 0.005 && (
            <path
              d={describeArc(-135, -135 + normalized * 270)}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 3px ${color}40)` }}
            />
          )}
        </svg>
        {/* Knob body */}
        <div
          className="absolute rounded-full bg-[#2a2a2a] border border-white/10"
          style={{
            width: size - 8,
            height: size - 8,
            top: 4,
            left: 4,
          }}
        >
          {/* Indicator line */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ transform: `rotate(${angle}deg)` }}
          >
            <div
              className="absolute rounded-full"
              style={{
                width: 2,
                height: (size - 8) / 2 - 4,
                top: 3,
                backgroundColor: color,
                left: '50%',
                transform: 'translateX(-50%)',
              }}
            />
          </div>
        </div>
      </div>
      {/* Value display */}
      <span className="text-[8px] font-mono text-white/40 leading-none h-3 text-center">
        {displayValue}
      </span>
      {/* Label */}
      <span className="text-[7px] font-semibold uppercase tracking-wider text-white/25 leading-none text-center">
        {label}
      </span>
    </div>
  );
};

export default SynthKnob;
