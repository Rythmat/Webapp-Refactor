import { memo, useId, type Ref } from 'react';
import { RIVER } from '@/components/atlas/theme/river';
import type { TimeWindow } from '@/components/atlas/timeline/timeWindow';
import {
  bandPath,
  inflowPath,
  strandPath,
  type RiverLayout,
} from './riverLayout';
import { eraStops } from './riverModel';

/**
 * The river's water: each lane's band, tinted along its length by the era
 * it flows through, its strand (centre line), and the thin curves of lanes
 * flowing into others.
 *
 * Drawn once per layout in year space (x in years). The frame writer moves
 * and scales the group with one `transform` per frame; strokes keep their
 * width through it (`non-scaling-stroke`).
 */
export const RiverBands = memo(function RiverBands({
  layout,
  domain,
  top,
  groupRef,
  dimmed,
}: {
  layout: RiverLayout;
  domain: TimeWindow;
  /** The lanes' offset from the river's top (room for the bookends). */
  top: number;
  groupRef: Ref<SVGGElement>;
  /** Lanes to fade, when a lane's family is picked out. */
  dimmed?: ReadonlySet<string>;
}) {
  const gradient = useId();
  const stops = eraStops(domain);
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
    >
      <defs>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id={gradient}
          x1={domain.from}
          x2={domain.to}
          y1={0}
          y2={0}
        >
          {stops.map((s) => (
            <stop key={s.offset} offset={s.offset} stopColor={s.color} />
          ))}
        </linearGradient>
      </defs>
      <g transform={`translate(0 ${top})`}>
        <g ref={groupRef}>
          {layout.lanes.map((lane, i) => (
            <path
              key={lane.id}
              d={bandPath(lane)}
              fill={`url(#${gradient})`}
              fillOpacity={
                (dimmed?.has(lane.id) ? 0.25 : 1) *
                RIVER.bandAlpha[i % RIVER.bandAlpha.length]
              }
            />
          ))}
          {layout.inflows.map((inflow) => (
            <path
              key={`${inflow.from}>${inflow.to}@${inflow.year}`}
              d={inflowPath(inflow)}
              fill="none"
              stroke="white"
              strokeDasharray="3 4"
              strokeOpacity={
                dimmed?.has(inflow.to) || dimmed?.has(inflow.from)
                  ? RIVER.inflowAlpha * 0.25
                  : RIVER.inflowAlpha
              }
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {layout.lanes.map((lane) => (
            <path
              key={`${lane.id}-strand`}
              d={strandPath(lane)}
              fill="none"
              stroke="white"
              strokeOpacity={
                dimmed?.has(lane.id)
                  ? RIVER.strandAlpha * 0.3
                  : RIVER.strandAlpha
              }
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      </g>
    </svg>
  );
});
