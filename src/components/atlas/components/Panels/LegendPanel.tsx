import { X } from 'lucide-react';
import { useId, useMemo } from 'react';
import { CITY_MARK } from '@/components/atlas/components/Globe/engine';
import {
  legendEntries,
  type LegendSwatch,
} from '@/components/atlas/components/Globe/legendModel';
import {
  AtlasIconButton,
  AtlasPanel,
  AtlasPanelBody,
} from '@/components/atlas/components/UI/primitives';
import { useAtlasStopSelector } from '@/components/atlas/navigation/useAtlasNavigate';
import { useAtlasSelector } from '@/components/atlas/state/atlasStore';

const NO_ARCS: ReadonlySet<'upstream' | 'downstream'> = new Set();

/** A small drawing of a mark, in the colours the globe paints it. */
function Swatch({ swatch }: { swatch: LegendSwatch }) {
  const gradientId = useId();
  switch (swatch.shape) {
    case 'fill':
      return (
        <span
          className="block size-4 rounded-md"
          style={{ backgroundColor: swatch.color }}
        />
      );
    case 'continents':
      // Drawn as a row of chips under the entry instead (see below).
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
    case 'column':
      return (
        <svg className="size-5" viewBox="0 0 20 20">
          <rect fill={swatch.side} height="11" width="10" x="5" y="7" />
          <ellipse cx="10" cy="7" fill={swatch.top} rx="5" ry="2.5" />
        </svg>
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
    case 'arc':
      return (
        <svg className="size-5" viewBox="0 0 20 20">
          <defs>
            <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor={swatch.colors[1]} />
              <stop offset="1" stopColor={swatch.colors[0]} />
            </linearGradient>
          </defs>
          <path
            d="M2 16 Q10 0 18 16"
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeDasharray="4 2"
            strokeWidth="2"
          />
        </svg>
      );
  }
}

/**
 * The legend, in the Inspector (owner, 2026-10-29: the Globe in the Studio's
 * frame): what each mark on the map means, for the marks on it right now
 * (state lines only once zoomed in, arcs only while an event's are open).
 * Every row names its mark in words, so nothing rests on colour, and every
 * swatch is drawn from the values the map paints with
 * (Globe/legendModel.ts), so the two cannot drift.
 */
export default function LegendPanel({ onClose }: { onClose: () => void }) {
  const layers = useAtlasSelector((s) => s.layers);
  const statesInView = useAtlasSelector((s) => s.statesInView);
  const regionSelected = useAtlasSelector(
    (s) => s.selectedLocation !== null && s.selectedLocation.type !== 'city',
  );
  const cityHighlighted = useAtlasSelector(
    (s) => s.selectedLocation?.type === 'city' || s.pinnedEvent !== null,
  );
  // Arcs are drawn only for a pinned event, whatever directions are open.
  const arcDirections = useAtlasSelector((s) =>
    s.pinnedEvent ? s.visibleArcDirections : NO_ARCS,
  );
  const artistShown = useAtlasStopSelector((stop) => stop.kind === 'artist');

  const entries = useMemo(
    () =>
      legendEntries({
        layers,
        cityMark: CITY_MARK,
        statesInView,
        regionSelected,
        cityHighlighted,
        artistShown,
        arcDirections,
      }),
    [
      layers,
      statesInView,
      regionSelected,
      cityHighlighted,
      artistShown,
      arcDirections,
    ],
  );

  return (
    <AtlasPanel
      actions={
        <AtlasIconButton aria-label="Close" size="sm" onClick={onClose}>
          <X aria-hidden className="size-4" />
        </AtlasIconButton>
      }
      subtitle="What the marks on the map mean."
      title="Legend"
    >
      <AtlasPanelBody>
        <ul className="space-y-3 px-4 py-3">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex gap-3"
              data-legend-entry={entry.id}
            >
              <span
                aria-hidden
                className="mt-0.5 flex size-5 shrink-0 items-center justify-center"
              >
                <Swatch swatch={entry.swatch} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-snug text-atlas-text">
                  {entry.label}
                </p>
                <p className="text-xs text-atlas-text-2">{entry.detail}</p>
                {entry.swatch.shape === 'continents' && (
                  <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                    {entry.swatch.continents.map((c) => (
                      <li
                        key={c.id}
                        className="flex items-center gap-1.5 text-xs text-atlas-text-2"
                      >
                        <span
                          aria-hidden
                          className="h-2.5 w-5 shrink-0 rounded-full"
                          style={{
                            background: `linear-gradient(90deg, ${c.colors.join(', ')})`,
                          }}
                        />
                        {c.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ul>
      </AtlasPanelBody>
    </AtlasPanel>
  );
}
