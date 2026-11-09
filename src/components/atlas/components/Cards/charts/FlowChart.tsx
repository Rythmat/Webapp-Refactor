import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ROOTS_RAMP, ROUTES_RAMP } from '@/components/atlas/theme/marks';
import { flowLayout, type FlowSide } from './flowLayout';

const HEIGHT = 124;

/**
 * Where a stop's music came from and went to, as the map-dashboard
 * reference's flow diagram: the strongest few on each side, banded into
 * the stop in the middle, each band as wide as the influences it carries,
 * in the map's own colours (cool in, warm out). Drawn only: the card's
 * lists say the same in words.
 */
export function FlowChart({
  from,
  to,
}: {
  from: readonly FlowSide[];
  to: readonly FlowSide[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const ids = useId().replace(/:/g, '');
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
  const layout = useMemo(
    () => (width ? flowLayout(from, to, width, HEIGHT) : null),
    [from, to, width],
  );

  return (
    <div ref={ref} aria-hidden className="h-[7.75rem]">
      {layout && (
        <svg className="overflow-visible" height={HEIGHT} width={width}>
          <defs>
            {(
              [
                ['in', ROOTS_RAMP],
                ['out', ROUTES_RAMP],
              ] as const
            ).map(([side, ramp]) => (
              <linearGradient key={side} id={`${ids}-${side}`} x1="0" x2="1">
                {ramp.map((color, i) => (
                  <stop
                    key={color}
                    offset={i / (ramp.length - 1)}
                    stopColor={color}
                  />
                ))}
              </linearGradient>
            ))}
          </defs>
          {layout.bands.map((band, i) => (
            <path
              key={band.key}
              className="atlas-draw"
              d={band.d}
              fill="none"
              opacity={0.85}
              pathLength={1}
              stroke={`url(#${ids}-${band.side})`}
              strokeWidth={band.width}
              style={{ '--i': i } as React.CSSProperties}
            />
          ))}
          <rect
            fill="white"
            height={layout.hub.h}
            rx={2}
            width={4}
            x={layout.hub.x - 2}
            y={layout.hub.y}
          />
          {layout.labels.map((label) => (
            <text
              key={label.key}
              fill="rgb(255 255 255 / 0.85)"
              fontSize={11}
              paintOrder="stroke"
              stroke="rgb(0 0 0 / 0.55)"
              strokeLinejoin="round"
              strokeWidth={3}
              textAnchor={label.anchor}
              x={label.x}
              y={label.y}
            >
              {label.text}
            </text>
          ))}
        </svg>
      )}
    </div>
  );
}
