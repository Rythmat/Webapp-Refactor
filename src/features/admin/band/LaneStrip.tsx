import { memo } from 'react';
import type { BackingNote } from '@/curriculum/engine/genreGeneration/backingPatterns';

/**
 * One layer's notes across the chart, as the band will play them: pitched
 * layers as a small piano roll fitted to their range, drums one row per pad.
 * Drawn in ticks (the SVG's own units), so it stretches to any width.
 */

interface Props {
  notes: readonly BackingNote[];
  totalTicks: number;
  barTicks: number;
  drums: boolean;
  muted: boolean;
  /** CSS colour of the notes. */
  colour: string;
  height?: number;
}

export const LaneStrip = memo(function LaneStrip({
  notes,
  totalTicks,
  barTicks,
  drums,
  muted,
  colour,
  height = 56,
}: Props) {
  const rows = drums
    ? [...new Set(notes.map((n) => n.note))].sort((a, b) => b - a)
    : [];
  const pitches = notes.map((n) => n.note);
  const lo = pitches.length ? Math.min(...pitches) : 60;
  const hi = pitches.length ? Math.max(...pitches) : 72;
  const span = Math.max(1, hi - lo + 1);
  const rowCount = drums ? Math.max(1, rows.length) : span;
  const rowH = height / rowCount;
  const yOf = (note: number) =>
    drums ? rows.indexOf(note) * rowH : (hi - note) * rowH;
  const bars = Math.max(1, Math.round(totalTicks / barTicks));

  return (
    <svg
      viewBox={`0 0 ${totalTicks} ${height}`}
      preserveAspectRatio="none"
      className="block h-full w-full"
      style={{ height }}
      aria-hidden
    >
      {Array.from({ length: bars }, (_, b) => (
        <line
          key={b}
          x1={b * barTicks}
          x2={b * barTicks}
          y1={0}
          y2={height}
          stroke="currentColor"
          strokeOpacity={b === 0 ? 0 : 0.12}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {notes.map((n, i) => (
        <rect
          key={i}
          x={n.onset}
          y={yOf(n.note) + (drums ? rowH * 0.2 : 0)}
          width={
            drums ? Math.min(60, totalTicks / 64) : Math.max(20, n.duration)
          }
          height={Math.max(1.5, drums ? rowH * 0.6 : rowH)}
          fill={colour}
          fillOpacity={(muted ? 0.25 : 0.45) + (n.velocity / 127) * 0.5}
          rx={drums ? 0 : 4}
        />
      ))}
    </svg>
  );
});
