/* eslint-disable tailwindcss/classnames-order */
import { useEffect, useId, useMemo, useRef } from 'react';
import type { MeterSource } from '@/daw/ui/Meter';

// ── FxMeter ──────────────────────────────────────────────────────────────
// Vertical level meter bar matching the reference FX rack design.
// Wider bar with dark track, colored fill from bottom, segmented LED look.
//
// The segments are drawn once; the level only moves a clip rect over them,
// written through a ref. With a `source` (a meter bus source) the bar paints
// itself from each reading and nothing re-renders.

interface FxMeterProps {
  /** A fixed level, 0–100 (when there is no source). */
  level?: number;
  /** A meter bus source: its first channel, 1 = full scale (or full reduction). */
  source?: MeterSource | null;
  label: string;
  color?: string;
  height?: number;
}

const SEGMENT_H = 3;
const SEGMENT_GAP = 1;
const BAR_WIDTH = 10;

/** The bar's segments from the bottom up: each one's top edge and height. */
function buildSegments(barH: number): { y: number; h: number }[] {
  const segments: { y: number; h: number }[] = [];
  let y = barH;
  while (y > 0) {
    const segH = Math.min(SEGMENT_H, y);
    y -= segH;
    segments.push({ y, h: segH });
    y -= SEGMENT_GAP;
  }
  return segments;
}

export function FxMeter({
  level = 0,
  source = null,
  label,
  color = 'var(--color-accent)',
  height = 120,
}: FxMeterProps) {
  const totalWidth = 22;
  const labelH = 14;
  const barH = height - labelH;
  const segments = useMemo(() => buildSegments(barH), [barH]);
  const clipRef = useRef<SVGRectElement>(null);
  const clipId = `fxm${useId().replace(/:/g, '')}`;

  // Shows whole segments only: a segment is lit when the fill reaches its top.
  const paint = (value: number) => {
    const rect = clipRef.current;
    if (!rect) return;
    const fillH = (Math.min(100, Math.max(0, value)) / 100) * barH;
    let top = barH;
    for (const seg of segments) {
      if (barH - seg.y <= fillH) top = seg.y;
      else break;
    }
    rect.setAttribute('y', String(top));
    rect.setAttribute('height', String(barH - top));
  };
  const paintRef = useRef(paint);
  paintRef.current = paint;

  useEffect(() => {
    if (!source) paintRef.current(level);
  }, [source, level, segments]);

  useEffect(() => {
    if (!source) return;
    paintRef.current(0);
    const off = source.subscribe((levels) =>
      paintRef.current((levels.peak[0] ?? 0) * 100),
    );
    return () => {
      off();
      paintRef.current(0);
    };
  }, [source, segments]);

  return (
    <div className="flex flex-col items-center" style={{ width: totalWidth }}>
      <svg width={BAR_WIDTH} height={barH}>
        <defs>
          <clipPath id={clipId}>
            <rect ref={clipRef} x={0} y={barH} width={BAR_WIDTH} height={0} />
          </clipPath>
        </defs>
        {/* Track (dark background) */}
        <rect
          x={0}
          y={0}
          width={BAR_WIDTH}
          height={barH}
          rx={2}
          fill="rgba(0, 0, 0, 0.4)"
        />
        {/* Segmented fill, shown up to the level by the clip */}
        <g clipPath={`url(#${clipId})`}>
          {segments.map((seg, i) => (
            <rect
              key={i}
              x={0}
              y={seg.y}
              width={BAR_WIDTH}
              height={seg.h}
              rx={1}
              fill={color}
              opacity={0.85}
            />
          ))}
        </g>
      </svg>
      <span
        className="text-center mt-0.5"
        style={{
          fontSize: 7,
          color: 'rgba(255, 255, 255, 0.4)',
          fontWeight: 600,
        }}
      >
        {label}
      </span>
    </div>
  );
}
