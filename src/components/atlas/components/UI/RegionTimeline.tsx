import { ZoomIn, ZoomOut } from 'lucide-react';
import {
  useMemo,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import {
  ATLAS_FOCUS,
  ATLAS_POPOVER,
  ATLAS_SURFACE,
  AtlasIconButton,
} from '@/components/atlas/components/UI/primitives';
import { MUSICAL_ERAS } from '@/components/atlas/data';
import { getArtist, getEventsForArtist } from '@/components/atlas/data/artists';
import { stateBoundariesData } from '@/components/atlas/data/loaders';
import { getCityById, getCityByName } from '@/components/atlas/data/lookups';
import type { MusicalEra } from '@/components/atlas/data/musicalEras';
import { useEscapeLayer } from '@/components/atlas/hooks/useEscapeLayer';
import { useLazyResource } from '@/components/atlas/hooks/useLazyResource';
import {
  useAtlasNavigate,
  useAtlasStopSelector,
} from '@/components/atlas/navigation/useAtlasNavigate';
import {
  useAtlasDispatch,
  useAtlasSelector,
} from '@/components/atlas/state/atlasStore';
import type {
  HistoricalEvent,
  SelectedLocation,
} from '@/components/atlas/types';
import { clusterDots } from '@/components/atlas/utils/clusterDots';
import { getEventsForLocation } from '@/components/atlas/utils/getEventsForLocation';

/** Timeline zoom tops out here: 16× the full range. */
const MAX_ZOOM = 16;
/**
 * Dots closer than this (px, measured from a cluster's first) merge. At least
 * as wide as a three-digit cluster marker, so markers never overlap.
 */
const CLUSTER_PX = 30;

/** The pinned event's dot: the accent, ringed, with a soft glow. */
const PINNED_DOT =
  'border-atlas-accent-strong bg-atlas-accent shadow-[0_0_8px_rgb(var(--atlas-accent)/0.6)]';
/** Any other dot: white, turning to the accent on hover. */
const DOT =
  'border-white/30 bg-white/80 hover:border-atlas-accent-strong hover:bg-atlas-accent';

function filterByEra(
  events: HistoricalEvent[],
  eraId: string | null,
): HistoricalEvent[] {
  if (!eraId) return events;
  const era = MUSICAL_ERAS.find((e) => e.id === eraId);
  if (!era) return events;
  return events.filter((e) => e.year >= era.yearStart && e.year <= era.yearEnd);
}

// Resolve display names: { country, subtitle? }
// Subtitle is dynamic — city is added only when an event is pinned
function getDisplayNames(
  selectedLocation: SelectedLocation,
  pinnedEvent: HistoricalEvent | null,
): { country: string; subtitle?: string } {
  if (selectedLocation.type === 'country') {
    if (pinnedEvent) {
      const cityName = pinnedEvent.location.city;
      const cityData = getCityByName(cityName);
      const sub = cityData?.subdivision
        ? `${cityName}, ${cityData.subdivision}`
        : cityName;
      return { country: selectedLocation.name, subtitle: sub };
    }
    return { country: selectedLocation.name };
  }
  if (selectedLocation.type === 'state') {
    const stateName = selectedLocation.name;
    const countryName = selectedLocation.country ?? 'United States';
    if (pinnedEvent) {
      return {
        country: countryName,
        subtitle: `${pinnedEvent.location.city}, ${stateName}`,
      };
    }
    return { country: countryName, subtitle: stateName };
  }
  if (selectedLocation.type === 'city') {
    const city = getCityById(selectedLocation.id);
    if (city) {
      const sub = city.subdivision
        ? `${city.name}, ${city.subdivision}`
        : city.name;
      return { country: city.country, subtitle: sub };
    }
    return { country: 'Unknown' };
  }
  return { country: '' };
}

export function RegionTimeline() {
  const selectedLocation = useAtlasSelector((s) => s.selectedLocation);
  const pinnedEvent = useAtlasSelector((s) => s.pinnedEvent);
  const selectedEra = useAtlasSelector((s) => s.selectedEra);
  const dispatch = useAtlasDispatch();
  const navigate = useAtlasNavigate();
  // On an artist stop the timeline becomes that artist's career, so the bar
  // along the bottom and the list on the left tell the same story.
  const artistName = useAtlasStopSelector((stop) =>
    stop.kind === 'artist' ? stop.artist : null,
  );
  const artist = useMemo(
    () => (artistName ? getArtist(artistName) : null),
    [artistName],
  );

  // A state's events wait for the on-demand state outlines (the details card
  // says so meanwhile). A partial list would auto-pin the wrong lone event.
  const outlines = useLazyResource(
    stateBoundariesData,
    !artist && selectedLocation?.type === 'state',
  ).status;
  const awaitingOutlines =
    !artist && selectedLocation?.type === 'state' && outlines !== 'ready';
  const locationEvents = useMemo(
    () =>
      artist
        ? getEventsForArtist(artist.slug)
        : awaitingOutlines
          ? []
          : getEventsForLocation(selectedLocation),
    [artist, awaitingOutlines, selectedLocation],
  );

  const events = useMemo(
    () => filterByEra(locationEvents, selectedEra),
    [locationEvents, selectedEra],
  );

  // Auto-pin if only one event
  useEffect(() => {
    if (events.length === 1) {
      dispatch({ type: 'PIN_EVENT', payload: events[0] });
    }
  }, [events, dispatch]);

  // Only use pinnedEvent for subtitle if it belongs to this region's events
  const relevantPinned =
    pinnedEvent && events.some((e) => e.id === pinnedEvent.id)
      ? pinnedEvent
      : null;
  const { country, subtitle } = artist
    ? {
        country: artist.name,
        subtitle: relevantPinned
          ? `${relevantPinned.location.city} · ${relevantPinned.year}`
          : undefined,
      }
    : selectedLocation
      ? getDisplayNames(selectedLocation, relevantPinned)
      : { country: 'Earth', subtitle: undefined };

  const activeEra: MusicalEra | undefined = selectedEra
    ? MUSICAL_ERAS.find((e) => e.id === selectedEra)
    : undefined;
  const hasEvents = events.length > 0;

  // Full range of events (snapped to decades)
  const minYear = hasEvents ? events[0].year : 0;
  const maxYear = hasEvents ? events[events.length - 1].year : 0;
  const fullStart = Math.floor(minYear / 10) * 10;
  const fullEnd = Math.ceil(maxYear / 10) * 10;
  const fullRange = fullEnd - fullStart || 1;

  // Zoom state: 1 = fit all, higher = zoomed in
  const [zoom, setZoom] = useState(1);
  const [viewCenter, setViewCenter] = useState((fullStart + fullEnd) / 2);
  // A year to centre on at the next zoom change, set by clicking a cluster;
  // otherwise zooming in centres on the pinned event.
  const zoomTarget = useRef<number | null>(null);
  // A cluster that zooming cannot pull apart (one year, or fully zoomed),
  // opened as a list.
  const [openCluster, setOpenCluster] = useState<{
    key: string;
    events: HistoricalEvent[];
    x: number;
  } | null>(null);
  const popoverRef = useRef<HTMLUListElement>(null);

  // Reset zoom when events change (location or era switch)
  useEffect(() => {
    setZoom(1);
    setViewCenter((fullStart + fullEnd) / 2);
  }, [fullStart, fullEnd]);

  // Keep the pinned event in view while zoomed in: re-center on it when the
  // pin changes AND when zooming in. Without zoom in the dependencies, zooming
  // in kept the old centre and could push the pinned event out of the window.
  useEffect(() => {
    if (zoomTarget.current !== null) {
      setViewCenter(zoomTarget.current);
      zoomTarget.current = null;
      return;
    }
    if (relevantPinned && zoom > 1) {
      setViewCenter(relevantPinned.year);
    }
  }, [relevantPinned, zoom]);

  // The open cluster's list belongs to the view it was opened in.
  useEffect(() => setOpenCluster(null), [events, zoom]);

  // Focus the list when it opens; close it on a click elsewhere.
  useEffect(() => {
    if (!openCluster) return;
    popoverRef.current?.querySelector('button')?.focus();
    const onPointerDown = (e: PointerEvent) => {
      if (!popoverRef.current?.contains(e.target as Node)) setOpenCluster(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [openCluster]);

  const trackRef = useRef<HTMLDivElement>(null);

  // Escape closes the list (before the panel under it) and returns focus to
  // its cluster.
  useEscapeLayer(openCluster !== null, () => {
    const key = openCluster?.key;
    setOpenCluster(null);
    trackRef.current
      ?.querySelector<HTMLElement>(`[aria-expanded][data-cluster-key="${key}"]`)
      ?.focus();
  });

  // The track's width in px, which is what decides when dots overlap.
  const [trackWidth, setTrackWidth] = useState(0);
  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => setTrackWidth(el.getBoundingClientRect().width);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasEvents]);

  // Visible window
  const viewSpan = fullRange / zoom;
  const halfSpan = viewSpan / 2;
  const clampedCenter = Math.max(
    fullStart + halfSpan,
    Math.min(fullEnd - halfSpan, viewCenter),
  );
  const viewStart = clampedCenter - halfSpan;
  const viewEnd = clampedCenter + halfSpan;
  const viewRange = viewEnd - viewStart || 1;

  // Tick marks for visible window
  const tickStep =
    viewRange <= 30
      ? 5
      : viewRange <= 60
        ? 10
        : viewRange <= 200
          ? 20
          : viewRange <= 500
            ? 50
            : 100;
  const tickSnapStart = Math.ceil(viewStart / tickStep) * tickStep;
  const ticks: number[] = [];
  for (let y = tickSnapStart; y <= viewEnd; y += tickStep) ticks.push(y);

  // Visible events
  const visibleEvents = hasEvents
    ? events.filter((e) => e.year >= viewStart && e.year <= viewEnd)
    : [];

  const pct = (year: number) => ((year - viewStart) / viewRange) * 100;

  // Dots that would overlap become one numbered cluster. Measured in % of
  // the track; before the track has a width, only same-year dots merge.
  const clusters = clusterDots(
    visibleEvents,
    (e) => pct(e.year),
    trackWidth > 0 ? (CLUSTER_PX / trackWidth) * 100 : 0,
  );

  // Zoom in far enough to spread a cluster over a few dot widths, centred on
  // it. Zoom stays a power of two, as the buttons step it.
  const zoomInto = (cluster: HistoricalEvent[]) => {
    const first = cluster[0].year;
    const last = cluster[cluster.length - 1].year;
    const spanPx =
      trackWidth > 0 ? ((last - first) / viewRange) * trackWidth : 0;
    const factor =
      spanPx > 0 ? 2 ** Math.ceil(Math.log2((CLUSTER_PX * 4) / spanPx)) : 2;
    zoomTarget.current = (first + last) / 2;
    setViewCenter((first + last) / 2);
    setZoom((z) => Math.min(MAX_ZOOM, z * Math.max(2, factor)));
  };

  const canZoomIn = zoom < MAX_ZOOM;
  const canZoomOut = zoom > 1;

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(MAX_ZOOM, z * 2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => {
      const next = z / 2;
      if (next <= 1) {
        setViewCenter((fullStart + fullEnd) / 2);
        return 1;
      }
      return next;
    });
  }, [fullStart, fullEnd]);

  const handleSelect = (event: HistoricalEvent) => navigate.toEvent(event);

  return (
    // The bottom zone places it (layout/AtlasZones.tsx).
    <div className="w-full">
      <div className={`px-4 py-4 sm:px-6 ${ATLAS_SURFACE}`}>
        {/* Region header */}
        <div className="mb-2 text-center">
          <h3 className="text-sm font-bold text-atlas-text">{country}</h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-atlas-text-2">{subtitle}</p>
          )}
        </div>

        {/* Selected era label */}
        {activeEra && (
          <p
            className={`mb-2 text-center text-xs font-bold ${activeEra.activeText}`}
          >
            {activeEra.label}
          </p>
        )}

        {/* Timeline or empty state */}
        {hasEvents ? (
          <div className="flex items-center gap-2">
            {/* Zoom out */}
            <AtlasIconButton
              aria-label="Zoom out timeline"
              disabled={!canZoomOut}
              onClick={handleZoomOut}
            >
              <ZoomOut aria-hidden className="size-3.5" />
            </AtlasIconButton>

            {/* Timeline track */}
            <div
              ref={trackRef}
              className="relative flex-1"
              style={{ height: '32px' }}
            >
              {/* Tick labels */}
              <div className="absolute inset-x-0 top-0 h-4">
                {ticks.map((year) => (
                  <span
                    key={year}
                    className="absolute -translate-x-1/2 text-xs leading-none text-atlas-text-2"
                    style={{ left: `${pct(year)}%` }}
                  >
                    {year}
                  </span>
                ))}
              </div>

              {/* Track line */}
              <div className="absolute inset-x-0 top-[22px] h-[2px] rounded-full bg-white/[0.12]" />

              {/* Event dots, and clusters where they would overlap */}
              {clusters.map(({ items, x }) => {
                const event = items[0];
                if (items.length > 1) {
                  const last = items[items.length - 1];
                  const span =
                    event.year === last.year
                      ? `${event.year}`
                      : `${event.year}–${last.year}`;
                  const separable = canZoomIn && last.year > event.year;
                  const holdsPinned = items.some(
                    (e) => e.id === pinnedEvent?.id,
                  );
                  return (
                    <button
                      key={`cluster:${event.id}`}
                      aria-expanded={
                        separable ? undefined : openCluster?.key === event.id
                      }
                      aria-label={`${items.length} events, ${span}${separable ? ' — zoom in' : ''}`}
                      className={`absolute top-[13px] flex h-5 min-w-5 -translate-x-1/2 items-center justify-center rounded-full border px-1 text-xs font-bold leading-none text-atlas-page transition-colors ${ATLAS_FOCUS} ${
                        holdsPinned ? PINNED_DOT : DOT
                      }`}
                      data-cluster-key={event.id}
                      data-cluster-size={items.length}
                      style={{ left: `${x}%` }}
                      title={`${items.length} events, ${span}`}
                      type="button"
                      onClick={() => {
                        if (separable) zoomInto(items);
                        else
                          setOpenCluster({ key: event.id, events: items, x });
                      }}
                    >
                      {items.length}
                    </button>
                  );
                }
                const isPinned = pinnedEvent?.id === event.id;
                return (
                  <button
                    key={event.id}
                    aria-label={`${event.title} (${event.year})`}
                    className={`absolute top-[16px] -translate-x-1/2 rounded-full border-2 transition-all ${ATLAS_FOCUS} ${
                      isPinned ? `size-3.5 ${PINNED_DOT}` : `size-2.5 ${DOT}`
                    }`}
                    style={{ left: `${x}%` }}
                    onClick={() => handleSelect(event)}
                  />
                );
              })}

              {/* A cluster zoom cannot separate, as a list */}
              {openCluster && (
                <ul
                  ref={popoverRef}
                  aria-label={`${openCluster.events.length} events`}
                  className={`absolute bottom-full z-10 mb-2 max-h-56 w-64 -translate-x-1/2 overflow-y-auto p-1 ${ATLAS_POPOVER}`}
                  style={{
                    left: `${Math.min(80, Math.max(20, openCluster.x))}%`,
                  }}
                >
                  {openCluster.events.map((e) => (
                    <li key={e.id}>
                      <button
                        className={`flex w-full items-baseline gap-2 rounded-2xl px-2 py-1.5 text-left text-sm transition-colors hover:bg-white/[0.06] ${ATLAS_FOCUS} ${
                          e.id === pinnedEvent?.id
                            ? 'font-bold text-atlas-accent-strong'
                            : 'text-atlas-text'
                        }`}
                        type="button"
                        onClick={() => {
                          setOpenCluster(null);
                          handleSelect(e);
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

            {/* Zoom in */}
            <AtlasIconButton
              aria-label="Zoom in timeline"
              disabled={!canZoomIn}
              onClick={handleZoomIn}
            >
              <ZoomIn aria-hidden className="size-3.5" />
            </AtlasIconButton>
          </div>
        ) : (
          <p className="py-2 text-center text-xs text-atlas-text-2">
            No events{selectedLocation ? ` in ${country}` : ''} for this era
          </p>
        )}
      </div>
    </div>
  );
}
