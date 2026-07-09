import {
  X,
  ChevronDown,
  ChevronRight,
  Calendar,
  MapPin,
  Maximize2,
  Minimize2,
  GripVertical,
} from 'lucide-react';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { AtlasVideo } from '@/components/atlas/components/UI/AtlasVideo';
import { EventInfluence } from '@/components/atlas/components/UI/EventInfluence';
import { GenreBadge } from '@/components/atlas/components/UI/GenreBadge';
import {
  useAppState,
  useAppDispatch,
} from '@/components/atlas/context/AppContext';
import { CITIES } from '@/components/atlas/data';
import type { HistoricalEvent } from '@/components/atlas/types';
import { sameCountry } from '@/components/atlas/utils/country';
import { getEventsForLocation } from '@/components/atlas/utils/getEventsForLocation';

function EventList({
  events,
  expandedEvents,
  enlarged,
  onToggle,
  onEnlarge,
  onShrink,
  onNavigateToEvent,
  onVideoPlay,
}: {
  events: HistoricalEvent[];
  expandedEvents: Set<string>;
  enlarged: boolean;
  onToggle: (id: string) => void;
  onEnlarge: (event: HistoricalEvent) => void;
  onShrink: () => void;
  onNavigateToEvent: (event: HistoricalEvent) => void;
  onVideoPlay: () => void;
}) {
  if (events.length === 0) {
    return (
      <div className="border-t border-white/10 px-4 py-3">
        <p className="text-xs text-white/40">No events found</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto border-t border-white/10 px-4 pb-3">
      {!enlarged && (
        <p className="mb-2 mt-3 text-sm text-white/40">
          {events.length} event{events.length !== 1 && 's'}
        </p>
      )}
      <div className={enlarged ? '' : 'mt-3 space-y-2'}>
        {events.map((event) => {
          const isExpanded = expandedEvents.has(event.id);
          const focused = enlarged && isExpanded;
          // While enlarged, only the focused card is shown. NB: hidden via CSS
          // (not filtered/reordered) so the video's <iframe> is never reparented.
          return (
            <div
              key={event.id}
              className={`group w-full rounded-xl text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa] ${
                enlarged && !isExpanded ? 'hidden' : ''
              } ${focused ? 'p-4' : 'p-2.5'} ${
                enlarged ? 'cursor-default' : 'cursor-pointer'
              } ${
                isExpanded
                  ? 'border border-[#60a5fa66] bg-[#60a5fa1a]'
                  : 'border border-white/10 bg-white/5 hover:bg-white/10'
              }`}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (!enlarged) onToggle(event.id);
              }}
              onKeyDown={(e) => {
                if (
                  !enlarged &&
                  e.target === e.currentTarget &&
                  (e.key === 'Enter' || e.key === ' ')
                ) {
                  e.preventDefault();
                  onToggle(event.id);
                }
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <h4
                  className={`font-semibold leading-snug text-white ${focused ? 'text-lg' : 'text-sm'}`}
                >
                  {event.title}
                </h4>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    aria-label={focused ? 'Shrink' : 'Enlarge'}
                    title={focused ? 'Shrink' : 'Enlarge'}
                    className="rounded text-white/40 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa]"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (focused) onShrink();
                      else onEnlarge(event);
                    }}
                  >
                    {focused ? (
                      <Minimize2 className="size-4" />
                    ) : (
                      <Maximize2 className="size-3.5" />
                    )}
                  </button>
                  {!enlarged && (
                    <ChevronDown
                      aria-hidden
                      className={`size-3.5 text-white/60 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  )}
                </div>
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs text-white/60">
                <span className="flex items-center gap-1">
                  <Calendar className="size-3" /> {event.year}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="size-3" /> {event.location.city}
                </span>
              </div>
              {isExpanded && (
                <>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {event.genre.map((g) => (
                      <GenreBadge key={g} genre={g} />
                    ))}
                  </div>
                  <p
                    className={`mt-2 leading-relaxed text-white/70 ${focused ? 'text-base' : 'text-sm'}`}
                  >
                    {event.description}
                  </p>
                  {event.videoId && (
                    <AtlasVideo
                      videoId={event.videoId}
                      title={event.title}
                      onPlay={onVideoPlay}
                      className={`rounded-lg border border-white/10 ${focused ? 'mx-auto mt-4 max-w-2xl' : 'mt-3'}`}
                    />
                  )}
                  <EventInfluence
                    event={event}
                    onNavigate={onNavigateToEvent}
                    className={
                      focused
                        ? 'mt-4 grid gap-x-8 gap-y-3 border-t border-white/10 pt-4 sm:grid-cols-2 [&>div]:min-w-0'
                        : undefined
                    }
                  />
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DetailsCard() {
  const { selectedLocation, pinnedEvent } = useAppState();
  const dispatch = useAppDispatch();
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState(false);
  const [enlarged, setEnlarged] = useState(false);
  const [width, setWidth] = useState(480);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const onDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragRef.current = { startX: e.clientX, startWidth: width };
      const onMove = (mv: MouseEvent) => {
        if (!dragRef.current) return;
        const delta = mv.clientX - dragRef.current.startX;
        const next = Math.min(
          Math.max(dragRef.current.startWidth + delta, 280),
          Math.round(window.innerWidth * 0.72),
        );
        setWidth(next);
      };
      const onUp = () => {
        dragRef.current = null;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [width],
  );

  const events = useMemo(
    () => getEventsForLocation(selectedLocation),
    [selectedLocation],
  );

  // Collapse all events + exit enlarge when the location changes; auto-expand a
  // lone event.
  useEffect(() => {
    setEnlarged(false);
    if (events.length === 1) {
      setExpandedEvents(new Set([events[0].id]));
    } else {
      setExpandedEvents(new Set());
    }
  }, [selectedLocation, events]);

  // Expand only the pinned event (from timeline click / deep-link), collapse others
  useEffect(() => {
    if (pinnedEvent) {
      setExpandedEvents(new Set([pinnedEvent.id]));
    }
  }, [pinnedEvent]);

  if (!selectedLocation) return null;

  const close = () => dispatch({ type: 'SELECT_LOCATION', payload: null });

  const navigateToEvent = (event: HistoricalEvent) => {
    const cityLower = event.location.city.toLowerCase();
    const nameMatches = CITIES.filter(
      (c) => c.name.toLowerCase() === cityLower,
    );
    const city =
      nameMatches.find((c) => sameCountry(c.country, event.location.country)) ??
      nameMatches[0];
    if (city)
      dispatch({
        type: 'SELECT_LOCATION',
        payload: { type: 'city', id: city.id },
      });
    dispatch({ type: 'PIN_EVENT', payload: event });
    dispatch({
      type: 'EXECUTE_SEARCH',
      payload: { lat: event.location.lat, lng: event.location.lng, zoom: 10 },
    });
  };

  // Toggle the inline expansion of an event card (and pin/unpin it).
  const toggleEvent = (id: string) => {
    setExpandedEvents((prev) => {
      if (prev.has(id)) {
        dispatch({ type: 'PIN_EVENT', payload: null });
        return new Set();
      }
      const event = events.find((e) => e.id === id);
      if (event) dispatch({ type: 'PIN_EVENT', payload: event });
      return new Set([id]);
    });
  };

  // Enlarge the panel, focused on an event. If it's the event already playing,
  // don't re-pin it (that would reset the arcs and stop the globe spinning);
  // just grow the panel so the video keeps playing uninterrupted.
  const enlargeEvent = (event: HistoricalEvent) => {
    if (pinnedEvent?.id !== event.id) {
      dispatch({ type: 'PIN_EVENT', payload: event });
    }
    setExpandedEvents(new Set([event.id]));
    setEnlarged(true);
  };

  return (
    <div
      className="absolute left-4 top-16 z-[1000] flex flex-col rounded-2xl border border-white/10 bg-black/20 shadow-2xl backdrop-blur-md"
      style={{
        width: enlarged ? 'min(66vw, 900px)' : width,
        maxHeight: collapsed
          ? undefined
          : enlarged
            ? 'calc(100% - 6rem)'
            : 'calc(100% - 14rem)',
      }}
    >
      {/* Drag-resize handle on right edge (disabled while enlarged) */}
      {!enlarged && (
        <div
          className="absolute right-0 top-0 flex h-full w-2 cursor-ew-resize items-center justify-center rounded-r-xl opacity-0 transition-opacity hover:opacity-100 active:opacity-100"
          onMouseDown={onDragStart}
        >
          <GripVertical className="size-3 text-white/40" />
        </div>
      )}

      <div className="shrink-0 p-4">
        {/* Collapse + Close buttons */}
        <div className="absolute right-3 top-3 flex items-center gap-1">
          {!enlarged && (
            <button
              aria-label={collapsed ? 'Expand details' : 'Collapse details'}
              className="text-white/40 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa]"
              title={collapsed ? 'Expand' : 'Collapse'}
              onClick={() => setCollapsed((c) => !c)}
            >
              <ChevronRight
                className={`size-4 transition-transform ${collapsed ? 'rotate-0' : 'rotate-90'}`}
              />
            </button>
          )}
          <button
            aria-label="Close details"
            className="text-white/40 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa]"
            onClick={close}
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Country */}
        {selectedLocation.type === 'country' && (
          <>
            <h3 className="text-xl font-medium text-white">
              {selectedLocation.name}
            </h3>
            <p className="mt-0.5 text-sm text-white/40">
              ISO: {selectedLocation.iso}
            </p>
          </>
        )}

        {/* State / Province */}
        {selectedLocation.type === 'state' && (
          <>
            <h3 className="text-xl font-medium text-white">
              {selectedLocation.name}
            </h3>
            <p className="mt-0.5 text-sm text-white/40">
              {selectedLocation.country ?? 'United States'}
            </p>
          </>
        )}

        {/* City header */}
        {selectedLocation.type === 'city' &&
          (() => {
            const city = CITIES.find((c) => c.id === selectedLocation.id);
            if (!city) return <p className="text-white/60">City not found</p>;
            return (
              <>
                <h3 className="text-xl font-medium text-white">{city.name}</h3>
                <p className="text-sm text-white/40">{city.country}</p>
                {!enlarged && (
                  <>
                    <p className="mt-3 text-sm leading-relaxed text-white/70">
                      {city.description}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {city.genres.map((genre) => (
                        <GenreBadge key={genre} genre={genre} />
                      ))}
                    </div>
                    <div className="mt-3 text-sm text-white/40">
                      Active:{' '}
                      {city.activeDecades.map((d) => `${d}s`).join(', ')}
                    </div>
                  </>
                )}
              </>
            );
          })()}
      </div>

      {!collapsed && (
        <EventList
          events={events}
          expandedEvents={expandedEvents}
          enlarged={enlarged}
          onToggle={toggleEvent}
          onEnlarge={enlargeEvent}
          onShrink={() => setEnlarged(false)}
          onNavigateToEvent={navigateToEvent}
          onVideoPlay={() => dispatch({ type: 'OPEN_INFLUENCE_ARCS' })}
        />
      )}
    </div>
  );
}
