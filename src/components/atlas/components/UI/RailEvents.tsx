import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ATLAS_FOCUS,
  ATLAS_POPOVER,
  ATLAS_TRANSITION,
} from '@/components/atlas/components/UI/primitives';
import { getArtist, getEventsForArtist } from '@/components/atlas/data/artists';
import { stateBoundariesData } from '@/components/atlas/data/loaders';
import { useEscapeLayer } from '@/components/atlas/hooks/useEscapeLayer';
import { useLazyResource } from '@/components/atlas/hooks/useLazyResource';
import {
  useAtlasFrame,
  useAtlasNavigate,
  useAtlasStopSelector,
} from '@/components/atlas/navigation/useAtlasNavigate';
import {
  useAtlasDispatch,
  useAtlasSelector,
} from '@/components/atlas/state/atlasStore';
import {
  inWindow,
  yearToRail,
  type RailSegment,
} from '@/components/atlas/timeline/timeWindow';
import type { HistoricalEvent } from '@/components/atlas/types';
import { clusterDots } from '@/components/atlas/utils/clusterDots';
import { getEventsForLocation } from '@/components/atlas/utils/getEventsForLocation';
import { Tooltip, TooltipGroup } from '@/daw/ui/Tooltip';
import { cn } from '@/lib/utils';

/**
 * Marks closer than this (px, from a cluster's first) merge into one,
 * numbered: a little wider than a two-digit count, so counts never overlap.
 */
const CLUSTER_PX = 18;

/**
 * The events the rail shows: the stop's own, on the map, outside a tour or
 * pathway (whose progress has the bottom then) — an artist's career on an
 * artist stop, else the selected place's. A state's wait for its outlines,
 * which load on demand.
 */
function useStopEvents(): HistoricalEvent[] {
  const timeline = useAtlasFrame((frame) => frame.view === 'timeline');
  const inJourney = useAtlasSelector(
    (s) => s.activeTour !== null || s.activeModule !== null,
  );
  const selectedLocation = useAtlasSelector((s) => s.selectedLocation);
  const artistName = useAtlasStopSelector((stop) =>
    stop.kind === 'artist' ? stop.artist : null,
  );
  const artist = useMemo(
    () => (artistName ? getArtist(artistName) : null),
    [artistName],
  );
  const shown = !timeline && !inJourney;
  const outlines = useLazyResource(
    stateBoundariesData,
    shown && !artist && selectedLocation?.type === 'state',
  ).status;
  const awaitingOutlines =
    !artist && selectedLocation?.type === 'state' && outlines !== 'ready';
  return useMemo(() => {
    if (!shown) return [];
    if (artist) return getEventsForArtist(artist.slug);
    if (awaitingOutlines) return [];
    return getEventsForLocation(selectedLocation);
  }, [shown, artist, awaitingOutlines, selectedLocation]);
}

const span = (items: readonly HistoricalEvent[]) => {
  const first = items[0].year;
  const last = items[items.length - 1].year;
  return first === last ? `${first}` : `${first}–${last}`;
};

/**
 * The stop's events, on the era rail (owner, 2026-10-29: "the events on the
 * timeline integrated with the bottom section to be one sleek event
 * timeline"): each a light on the horizon's rim, at its year on the rail's
 * own scale, with a soft streak rising off it; the pinned one ringed and
 * brighter; those outside the chosen years dimmed. Where marks would crowd
 * they become one numbered mark that opens their list. A lone event in the
 * years shown is pinned, as the place's timeline always did.
 */
export function RailEvents({ segments }: { segments: readonly RailSegment[] }) {
  const events = useStopEvents();
  const pinnedEvent = useAtlasSelector((s) => s.pinnedEvent);
  const timeWindow = useAtlasSelector((s) => s.timeWindow);
  const dispatch = useAtlasDispatch();
  const navigate = useAtlasNavigate();

  // The events in the years shown; a lone one is pinned.
  const inView = useMemo(
    () =>
      timeWindow ? events.filter((e) => inWindow(timeWindow, e.year)) : events,
    [events, timeWindow],
  );
  useEffect(() => {
    if (inView.length === 1) {
      dispatch({ type: 'PIN_EVENT', payload: inView[0] });
    }
  }, [inView, dispatch]);

  // The rail's width, which decides when marks crowd.
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(el.getBoundingClientRect().width);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const clusters = useMemo(
    () =>
      clusterDots(
        events,
        (e) => yearToRail(e.year, segments) * 100,
        width > 0 ? (CLUSTER_PX / width) * 100 : 0,
      ),
    [events, segments, width],
  );

  // A crowded mark's events, as a list over it.
  const [open, setOpen] = useState<{
    key: string;
    events: HistoricalEvent[];
    x: number;
  } | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => setOpen(null), [events]);
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector('button')?.focus();
    const onPointerDown = (e: PointerEvent) => {
      if (!listRef.current?.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);
  // Escape closes the list (before the panel under it) and gives focus back
  // to its mark.
  useEscapeLayer(open !== null, () => {
    const key = open?.key;
    setOpen(null);
    ref.current
      ?.querySelector<HTMLElement>(`[data-cluster-key="${key}"]`)
      ?.focus();
  });

  const shownYear = (year: number) => !timeWindow || inWindow(timeWindow, year);
  const select = (event: HistoricalEvent) => navigate.toEvent(event);

  return (
    <div
      ref={ref}
      aria-label={events.length ? `${events.length} events` : undefined}
      className="pointer-events-none absolute inset-x-0 bottom-0 h-11"
      role={events.length ? 'group' : undefined}
    >
      <TooltipGroup>
        {clusters.map(({ items, x }) => {
          const first = items[0];
          const lit = items.some((e) => shownYear(e.year));
          if (items.length > 1) {
            const holdsPinned = items.some((e) => e.id === pinnedEvent?.id);
            const label = `${items.length} events, ${span(items)}`;
            return (
              <Tooltip key={`cluster:${first.id}`} content={label} side="top">
                <button
                  aria-expanded={open?.key === first.id}
                  aria-label={label}
                  className={cn(
                    'pointer-events-auto absolute bottom-0 flex h-4 min-w-4 -translate-x-1/2 items-center justify-center rounded-full px-1 text-[0.6875rem] font-bold leading-none text-atlas-page ring-1 ring-atlas-panel hover:bg-white',
                    holdsPinned
                      ? 'bg-white ring-2 ring-white/40'
                      : 'bg-white/80',
                    !lit && 'opacity-40',
                    ATLAS_TRANSITION,
                    ATLAS_FOCUS,
                  )}
                  data-cluster-key={first.id}
                  data-cluster-size={items.length}
                  style={{ left: `${x}%` }}
                  type="button"
                  onClick={() =>
                    setOpen(
                      open?.key === first.id
                        ? null
                        : { key: first.id, events: items, x },
                    )
                  }
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {items.length}
                </button>
              </Tooltip>
            );
          }
          const pinned = pinnedEvent?.id === first.id;
          return (
            <Tooltip
              key={first.id}
              content={`${first.title} · ${first.year}`}
              side="top"
            >
              <button
                aria-label={`${first.title} (${first.year})`}
                aria-pressed={pinned}
                className={cn(
                  'group/mark pointer-events-auto absolute bottom-0 flex h-6 w-3 -translate-x-1/2 flex-col items-center justify-end pb-[3px]',
                  !lit && 'opacity-40',
                  ATLAS_FOCUS,
                )}
                data-rail-event={first.id}
                style={{ left: `${x}%` }}
                type="button"
                onClick={() => select(first)}
              >
                {/* A streak off the rim, brighter for the pinned event. */}
                <span
                  aria-hidden
                  className={cn(
                    'w-px bg-gradient-to-t to-transparent',
                    pinned
                      ? 'h-4 from-white'
                      : 'h-2.5 from-white/50 group-hover/mark:h-3.5 group-hover/mark:from-white/80',
                    ATLAS_TRANSITION,
                  )}
                />
                <span
                  aria-hidden
                  className={cn(
                    'rounded-full ring-1 ring-atlas-panel',
                    pinned
                      ? 'size-2.5 bg-white ring-2 ring-white/40'
                      : 'size-[7px] bg-white/80 group-hover/mark:scale-125 group-hover/mark:bg-white',
                    ATLAS_TRANSITION,
                  )}
                />
              </button>
            </Tooltip>
          );
        })}
      </TooltipGroup>

      {open && (
        <ul
          ref={listRef}
          aria-label={`${open.events.length} events`}
          className={cn(
            'pointer-events-auto absolute bottom-full mb-2 max-h-56 w-64 -translate-x-1/2 overflow-y-auto p-1',
            ATLAS_POPOVER,
          )}
          style={{ left: `${Math.min(85, Math.max(15, open.x))}%` }}
        >
          {open.events.map((e) => (
            <li key={e.id}>
              <button
                className={cn(
                  'flex w-full items-baseline gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/[0.06]',
                  e.id === pinnedEvent?.id
                    ? 'font-bold text-white'
                    : 'text-atlas-text',
                  ATLAS_TRANSITION,
                  ATLAS_FOCUS,
                )}
                type="button"
                onClick={() => {
                  setOpen(null);
                  select(e);
                }}
              >
                <span className="shrink-0 text-xs text-atlas-text-2">
                  {e.year}
                </span>
                <span className="truncate">{e.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
