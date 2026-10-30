import { useId } from 'react';
import type { LegendSwatch as Swatch } from '@/components/atlas/components/Globe/legendModel';
import { withAlpha } from '@/components/atlas/theme/marks';

/** A small drawing of a mark, in the colours the map paints it. */
export function LegendSwatch({ swatch }: { swatch: Swatch }) {
  const gradientId = useId();
  switch (swatch.shape) {
    case 'fill':
      return (
        <span
          className="block size-4 rounded-md"
          style={{ backgroundColor: swatch.color }}
        />
      );
    case 'ramp':
      return (
        <span
          className="block h-2 w-8 rounded-full"
          style={{
            backgroundImage: `linear-gradient(to right, ${swatch.colors.join(', ')})`,
          }}
        />
      );
    case 'continents':
      // Drawn as a row of chips under the entry instead (LegendCard).
      return (
        <span
          className="block size-4 rounded-md"
          style={{
            background: `conic-gradient(${swatch.continents
              .map((c) => c.colors[1])
              .join(', ')})`,
          }}
        />
      );
    case 'point':
      return (
        <svg className="size-5" viewBox="0 0 20 20">
          <circle cx="10" cy="10" fill={swatch.color} r="4" />
        </svg>
      );
    case 'label':
      return (
        <span
          className="block w-5 text-center text-xs font-bold leading-5"
          style={{ color: swatch.color }}
        >
          Aa
        </span>
      );
    case 'outline':
      return (
        <svg className="size-5" viewBox="0 0 20 20">
          <rect
            fill="none"
            height="12"
            rx="2"
            stroke={swatch.color}
            strokeWidth="2"
            width="14"
            x="3"
            y="4"
          />
        </svg>
      );
    case 'halos':
      return (
        <svg className="h-5 w-8" viewBox="0 0 32 20">
          {[
            [5, 10, 3],
            [14, 10, 5],
            [25, 10, 7],
          ].map(([cx, cy, r], i) => (
            <g key={cx}>
              <circle
                cx={cx}
                cy={cy}
                fill={withAlpha(swatch.colors[i], 0.45)}
                r={r}
              />
              <circle cx={cx} cy={cy} fill="white" r={1.5} />
            </g>
          ))}
        </svg>
      );
    case 'sun':
      return (
        <svg className="size-5" viewBox="0 0 20 20">
          <circle cx="10" cy="10" fill={withAlpha(swatch.color, 0.2)} r="9" />
          <circle cx="10" cy="10" fill={withAlpha(swatch.color, 0.45)} r="6" />
          <circle cx="10" cy="10" fill={swatch.color} r="3" />
        </svg>
      );
    case 'line':
      return (
        <svg className="h-5 w-8" viewBox="0 0 32 20">
          <defs>
            <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
              {swatch.colors.map((color, i) => (
                <stop
                  key={color}
                  offset={i / (swatch.colors.length - 1)}
                  stopColor={color}
                />
              ))}
            </linearGradient>
          </defs>
          <path
            d="M2 14 Q16 2 30 14"
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeLinecap="round"
            strokeWidth="3"
          />
        </svg>
      );
    case 'dotted':
      return (
        <svg className="h-5 w-8" viewBox="0 0 32 20">
          <path
            d="M2 14 Q16 2 30 14"
            fill="none"
            stroke={swatch.color}
            strokeDasharray="2 4"
            strokeWidth="2"
          />
        </svg>
      );
    case 'pill':
      return (
        <span className="rounded-md border border-white/20 bg-atlas-panel px-1.5 text-xs font-bold leading-4 text-atlas-text">
          {swatch.text}
        </span>
      );
  }
}
