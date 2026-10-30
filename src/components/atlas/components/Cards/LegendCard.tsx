import { ChevronDown } from 'lucide-react';
import { useId, useMemo, type CSSProperties } from 'react';
import { legendEntries } from '@/components/atlas/components/Globe/legendModel';
import {
  ATLAS_CARD,
  ATLAS_EYEBROW,
  ATLAS_FOCUS_INSET,
} from '@/components/atlas/components/UI/primitives';
import { useAtlasStopSelector } from '@/components/atlas/navigation/useAtlasNavigate';
import {
  useAtlasDispatch,
  useAtlasSelector,
} from '@/components/atlas/state/atlasStore';
import { cn } from '@/lib/utils';
import { LegendSwatch } from './LegendSwatch';

const NO_ARCS: ReadonlySet<'upstream' | 'downstream'> = new Set();

/**
 * The legend, as a card at the column's foot (owner, 2026-10-29: the
 * references' collapsible legend card): what each mark on the map means,
 * for the marks on it right now (state lines only once zoomed in, links as
 * the stop draws them). Folded to its title until opened; the viewer's
 * choice is remembered. Every row names its mark in words, so nothing
 * rests on colour, and every swatch is drawn from the values the map
 * paints with (Globe/legendModel.ts), so the two cannot drift.
 */
export function LegendCard({ order }: { order: number }) {
  const open = useAtlasSelector((s) => s.cards.legendOpen);
  const dispatch = useAtlasDispatch();
  const bodyId = useId();
  const layers = useAtlasSelector((s) => s.layers);
  const statesInView = useAtlasSelector((s) => s.statesInView);
  const regionSelected = useAtlasSelector(
    (s) => s.selectedLocation !== null && s.selectedLocation.type !== 'city',
  );
  const cityHighlighted = useAtlasSelector(
    (s) => s.selectedLocation?.type === 'city' || s.pinnedEvent !== null,
  );
  // An event's influences are drawn only for a pinned event.
  const arcDirections = useAtlasSelector((s) =>
    s.pinnedEvent ? s.visibleArcDirections : NO_ARCS,
  );
  const kind = useAtlasStopSelector((stop) => stop.kind);
  const links =
    kind === 'home' || kind === 'search'
      ? 'world'
      : kind === 'event'
        ? 'event'
        : kind === 'place' || kind === 'artist'
          ? 'focus'
          : null;

  const entries = useMemo(
    () =>
      legendEntries({
        layers,
        statesInView,
        regionSelected,
        cityHighlighted,
        artistShown: kind === 'artist',
        arcDirections,
        links,
      }),
    [
      layers,
      statesInView,
      regionSelected,
      cityHighlighted,
      kind,
      arcDirections,
      links,
    ],
  );

  return (
    <section
      aria-label="Legend"
      className={cn(ATLAS_CARD, 'atlas-card-in shrink-0')}
      data-atlas-legend
      style={{ '--i': order } as CSSProperties}
    >
      <button
        aria-controls={bodyId}
        aria-expanded={open}
        className={cn(
          'flex w-full items-center justify-between rounded-[1.25rem] px-4 py-3 text-left',
          ATLAS_FOCUS_INSET,
        )}
        type="button"
        onClick={() =>
          dispatch({ type: 'SET_CARD_PREFS', payload: { legendOpen: !open } })
        }
      >
        <span className={ATLAS_EYEBROW}>Legend</span>
        <ChevronDown
          aria-hidden
          className={cn(
            'size-4 text-atlas-text-2 transition-transform motion-reduce:transition-none',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <ul className="space-y-3 px-4 pb-4" id={bodyId}>
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex gap-3"
              data-legend-entry={entry.id}
            >
              <span
                aria-hidden
                className="mt-0.5 flex h-5 w-8 shrink-0 items-center justify-center"
              >
                <LegendSwatch swatch={entry.swatch} />
              </span>
              <div className="min-w-0">
                <p className="text-[0.8125rem] font-bold leading-snug text-atlas-text">
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
      )}
    </section>
  );
}
