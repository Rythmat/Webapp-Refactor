import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ATLAS_FOCUS } from '@/components/atlas/components/UI/primitives';
import { ERA_HEX, MUSICAL_ERAS } from '@/components/atlas/data/musicalEras';
import type { Bin } from '@/components/atlas/stats/placeStats';
import { cn } from '@/lib/utils';
import { binLabel, describeSeries, eventsWord } from './describe';
import { areaPath, linePath } from './paths';
import { linear, niceMax } from './scales';

const HEIGHT = 92;
const TOP = 16;
const BOTTOM = 4;

/**
 * Events over time as a line over a soft area, after the map-dashboard
 * reference's trend card: the eras behind it as faint bands in their
 * colours, the busiest span marked and named, two dashed guides. The line
 * draws itself on as the card lands. Hovering or the arrow keys move a
 * crosshair along it, read out to readers; the whole is described in a
 * sentence.
 */
export function TrendChart({
  bins,
  label,
  onPick,
  mark,
}: {
  bins: Bin[];
  label: string;
  /** Enter on the crosshair, or a click: these years. */
  onPick?: (bin: Bin) => void;
  /** A year to mark with a line: a pinned event's. */
  mark?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [at, setAt] = useState<number | null>(null);
  const live = useId();
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const geometry = useMemo(() => {
    if (bins.length === 0 || width === 0) return null;
    const first = bins[0].start;
    const last = bins[bins.length - 1].start + bins[0].size;
    const x = linear(first, last, 0, width);
    const max = niceMax(Math.max(...bins.map((b) => b.count)));
    const y = linear(0, max, HEIGHT - BOTTOM, TOP);
    const points = bins.map(
      (b) => [x(b.start + b.size / 2), y(b.count)] as const,
    );
    const busiest = bins.reduce(
      (a, b, i) => (b.count > bins[a].count ? i : a),
      0,
    );
    const bands = MUSICAL_ERAS.flatMap((era) => {
      const a = Math.max(first, era.yearStart);
      const b = Math.min(last, era.yearEnd + 1);
      return b > a
        ? [{ id: era.id, x: x(a), w: x(b) - x(a), color: ERA_HEX[era.id] }]
        : [];
    });
    return { x, y, points, busiest, bands, first, last };
  }, [bins, width]);

  const description = describeSeries(label, bins);
  const index = at ?? null;
  const focusBin = index !== null ? bins[index] : null;

  const move = (to: number) =>
    setAt(Math.max(0, Math.min(bins.length - 1, to)));

  return (
    <div>
      <div
        ref={ref}
        aria-describedby={live}
        aria-label={description}
        className={cn(
          'relative h-[5.75rem] cursor-crosshair rounded-md',
          ATLAS_FOCUS,
        )}
        role="img"
        tabIndex={0}
        onBlur={() => setAt(null)}
        onClick={() => focusBin && onPick?.(focusBin)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') move((index ?? -1) + 1);
          else if (e.key === 'ArrowLeft') move((index ?? bins.length) - 1);
          else if (e.key === 'Enter' && focusBin) onPick?.(focusBin);
          else return;
          e.preventDefault();
        }}
        onPointerLeave={() => setAt(null)}
        onPointerMove={(e) => {
          if (!geometry) return;
          const box = e.currentTarget.getBoundingClientRect();
          const year = geometry.x.invert(e.clientX - box.left);
          move(Math.floor((year - bins[0].start) / bins[0].size));
        }}
      >
        {geometry && (
          <svg
            aria-hidden
            className="absolute inset-0 overflow-visible"
            height={HEIGHT}
            width={width}
          >
            {geometry.bands.map((b) => (
              <rect
                key={b.id}
                fill={b.color}
                height={HEIGHT}
                opacity={0.09}
                width={b.w}
                x={b.x}
                y={0}
              />
            ))}
            {[0.5, 1].map((f) => (
              <line
                key={f}
                stroke="rgb(255 255 255 / 0.08)"
                strokeDasharray="3 3"
                x1={0}
                x2={width}
                y1={geometry.y(
                  niceMax(Math.max(...bins.map((b) => b.count))) * f,
                )}
                y2={geometry.y(
                  niceMax(Math.max(...bins.map((b) => b.count))) * f,
                )}
              />
            ))}
            <path
              d={areaPath(geometry.points, HEIGHT - BOTTOM)}
              fill="rgb(255 255 255 / 0.07)"
            />
            <path
              className="atlas-draw"
              d={linePath(geometry.points)}
              fill="none"
              pathLength={1}
              stroke="rgb(255 255 255 / 0.9)"
              strokeLinecap="round"
              strokeWidth={1.5}
            />
            {mark !== undefined &&
              mark >= geometry.first &&
              mark < geometry.last && (
                <line
                  data-mark={mark}
                  stroke="rgb(255 255 255 / 0.7)"
                  strokeDasharray="2 2"
                  x1={geometry.x(mark)}
                  x2={geometry.x(mark)}
                  y1={TOP - 6}
                  y2={HEIGHT - BOTTOM}
                />
              )}
            {bins[geometry.busiest].count > 0 && (
              <g>
                <circle
                  cx={geometry.points[geometry.busiest][0]}
                  cy={geometry.points[geometry.busiest][1]}
                  fill="white"
                  r={3}
                />
              </g>
            )}
            {focusBin && index !== null && (
              <g>
                <line
                  stroke="rgb(255 255 255 / 0.35)"
                  x1={geometry.points[index][0]}
                  x2={geometry.points[index][0]}
                  y1={TOP - 6}
                  y2={HEIGHT - BOTTOM}
                />
                <circle
                  cx={geometry.points[index][0]}
                  cy={geometry.points[index][1]}
                  fill="white"
                  r={3.5}
                  stroke="rgb(0 0 0 / 0.6)"
                />
              </g>
            )}
          </svg>
        )}
        {/* The busiest span's count, or the crosshair's, above the line. */}
        {geometry && (focusBin ?? bins[geometry.busiest]).count > 0 && (
          <span
            aria-hidden
            className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap text-xs tabular-nums text-atlas-text"
            style={{
              left: Math.min(
                width - 40,
                Math.max(40, geometry.points[index ?? geometry.busiest][0]),
              ),
              top: Math.max(
                -2,
                geometry.points[index ?? geometry.busiest][1] - 20,
              ),
            }}
          >
            {focusBin
              ? `${binLabel(focusBin)} · ${eventsWord(focusBin.count)}`
              : bins[geometry.busiest].count}
          </span>
        )}
      </div>
      {geometry && (
        <div
          aria-hidden
          className="mt-1 flex justify-between text-xs tabular-nums text-atlas-text-2"
        >
          <span>{geometry.first}</span>
          <span>{Math.round((geometry.first + geometry.last) / 2)}</span>
          <span>{Math.min(geometry.last - 1, new Date().getFullYear())}</span>
        </div>
      )}
      <span aria-live="polite" className="sr-only" id={live}>
        {focusBin ? `${binLabel(focusBin)}: ${eventsWord(focusBin.count)}` : ''}
      </span>
    </div>
  );
}
