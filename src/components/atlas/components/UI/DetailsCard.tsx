import {
  X,
  ChevronDown,
  ChevronRight,
  Calendar,
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
  GripVertical,
} from 'lucide-react';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useAppState,
  useAppDispatch,
} from '@/components/atlas/context/AppContext';
import {
  CITIES,
  MUSIC_HISTORY,
  getUpstreamChain,
  getDownstreamChain,
  getEventCountryColor,
} from '@/components/atlas/data';
import type { UpstreamChainNode } from '@/components/atlas/data/eventConnections';
import type { HistoricalEvent } from '@/components/atlas/types';
import { mapGenreToCourse } from '@/components/atlas/utils/genreMapping';

// Map GeoJSON country names to CITIES/event country codes
const COUNTRY_ALIASES: Record<string, string> = {
  'United States of America': 'US',
  'United Kingdom': 'UK',
  'Republic of Korea': 'South Korea',
  Korea: 'South Korea',
  'Dem. Rep. Korea': 'North Korea',
  'Czech Republic': 'Czechia',
  "Côte d'Ivoire": 'Ivory Coast',
};

// Recursive influence tree (used for both upstream and downstream)
function InfluenceTree({
  nodes,
  onNavigate,
  depth = 0,
  direction = 'upstream',
}: {
  nodes: UpstreamChainNode[];
  onNavigate: (event: HistoricalEvent) => void;
  depth?: number;
  direction?: 'upstream' | 'downstream';
}) {
  if (nodes.length === 0) return null;
  const Icon = direction === 'upstream' ? ArrowDownRight : ArrowUpRight;
  return (
    <div
      className={depth > 0 ? 'ml-3 mt-1 border-l border-zinc-700/30 pl-2' : ''}
    >
      {nodes.map((node) => {
        const hex = getEventCountryColor(node.event);
        return (
          <div key={node.event.id} className="mb-1">
            <button
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs hover:brightness-125"
              style={{ backgroundColor: `${hex}33`, color: hex }}
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(node.event);
              }}
            >
              <Icon className="size-3" />
              <span>{node.event.title}</span>
              <span className="ml-0.5" style={{ color: `${hex}80` }}>
                {node.event.year}
              </span>
            </button>
            {node.upstream.length > 0 && (
              <InfluenceTree
                depth={depth + 1}
                direction={direction}
                nodes={node.upstream}
                onNavigate={onNavigate}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function countNodes(nodes: UpstreamChainNode[]): number {
  let n = 0;
  for (const node of nodes) {
    n += 1 + countNodes(node.upstream);
  }
  return n;
}

// Collapsible section for influence trees — defaults to collapsed
function CollapsibleInfluence({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        className="mb-1 flex items-center gap-1 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-300"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        <ChevronDown
          className={`size-3 transition-transform ${open ? 'rotate-0' : '-rotate-90'}`}
        />
        {label} ({count})
      </button>
      {open && children}
    </div>
  );
}

function GenreBadge({ genre }: { genre: string }) {
  const navigate = useNavigate();
  const course = mapGenreToCourse(genre);

  const nonCurriculumGenres = ['Classical', 'Film Scoring', 'Musical Theatre', 'Jingles'];
  if (course && !nonCurriculumGenres.includes(course)) {
    return (
      <button
        className="inline-flex cursor-pointer items-center gap-0.5 rounded-full bg-teal-600/30 px-2 py-0.5 text-xs text-teal-300 transition-colors hover:bg-teal-500/40 hover:text-teal-200"
        title={`Explore ${course} in Learn`}
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/learn?genre=${encodeURIComponent(course)}`);
        }}
      >
        {genre}
        <ArrowUpRight className="size-2.5 opacity-60" />
      </button>
    );
  }

  return (
    <span className="rounded-full bg-teal-600/30 px-2 py-0.5 text-xs text-teal-300">
      {genre}
    </span>
  );
}

function EventList({
  events,
  expandedEvents,
  onToggle,
  onNavigateToEvent,
}: {
  events: HistoricalEvent[];
  expandedEvents: Set<string>;
  onToggle: (id: string) => void;
  onNavigateToEvent: (event: HistoricalEvent) => void;
}) {
  if (events.length === 0) {
    return (
      <div className="border-t border-zinc-700/50 px-4 py-3">
        <p className="text-xs text-zinc-500">No events found</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto border-t border-zinc-700/50 px-4 pb-3">
      <p className="mb-2 mt-3 text-sm text-zinc-500">
        {events.length} event{events.length !== 1 && 's'}
      </p>
      <div className="space-y-2">
        {events.map((event) => {
          const isExpanded = expandedEvents.has(event.id);
          return (
            <div
              key={event.id}
              className={`w-full cursor-pointer rounded-lg p-2.5 text-left transition-colors ${
                isExpanded
                  ? 'border border-teal-500/30 bg-teal-600/15'
                  : 'border border-transparent bg-zinc-800/40 hover:bg-zinc-800/70'
              }`}
              role="button"
              tabIndex={0}
              onClick={() => onToggle(event.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onToggle(event.id);
                }
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-semibold leading-snug text-white">
                  {event.title}
                </h4>
                <ChevronDown
                  className={`mt-0.5 size-3.5 shrink-0 text-zinc-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                />
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs text-zinc-400">
                <span className="flex items-center gap-1">
                  <Calendar className="size-3" /> {event.year}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="size-3" /> {event.location.city}
                </span>
              </div>
              {isExpanded &&
                (() => {
                  const upstreamChain = getUpstreamChain(event.id);
                  const downstreamChain = getDownstreamChain(event.id);
                  const hasConnections =
                    upstreamChain.length > 0 || downstreamChain.length > 0;
                  return (
                    <>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {event.genre.map((g) => (
                          <GenreBadge key={g} genre={g} />
                        ))}
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                        {event.description}
                      </p>
                      {hasConnections && (
                        <div className="mt-3 space-y-2 border-t border-zinc-700/40 pt-2">
                          {upstreamChain.length > 0 && (
                            <CollapsibleInfluence
                              count={countNodes(upstreamChain)}
                              label="Influenced by"
                            >
                              <InfluenceTree
                                nodes={upstreamChain}
                                onNavigate={onNavigateToEvent}
                              />
                            </CollapsibleInfluence>
                          )}
                          {downstreamChain.length > 0 && (
                            <CollapsibleInfluence
                              count={countNodes(downstreamChain)}
                              label="Influenced"
                            >
                              <InfluenceTree
                                direction="downstream"
                                nodes={downstreamChain}
                                onNavigate={onNavigateToEvent}
                              />
                            </CollapsibleInfluence>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}
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
  const [width, setWidth] = useState(480);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const onDragStart = useCallback((e: React.MouseEvent) => {
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
  }, [width]);

  const events = useMemo(() => {
    if (!selectedLocation) return [];

    if (selectedLocation.type === 'country') {
      const resolved =
        COUNTRY_ALIASES[selectedLocation.name] ?? selectedLocation.name;
      const cityNames = new Set(
        CITIES.filter((c) => c.country === resolved).map((c) =>
          c.name.toLowerCase(),
        ),
      );
      const resolvedLower = resolved.toLowerCase();
      return MUSIC_HISTORY.filter(
        (e) =>
          cityNames.has(e.location.city.toLowerCase()) ||
          e.location.country.toLowerCase() === resolvedLower,
      ).sort((a, b) => a.year - b.year);
    }

    if (selectedLocation.type === 'state') {
      const cityNames = new Set(
        CITIES.filter((c) => c.subdivision === selectedLocation.name).map((c) =>
          c.name.toLowerCase(),
        ),
      );
      return MUSIC_HISTORY.filter((e) =>
        cityNames.has(e.location.city.toLowerCase()),
      ).sort((a, b) => a.year - b.year);
    }

    if (selectedLocation.type === 'city') {
      const city = CITIES.find((c) => c.id === selectedLocation.id);
      if (!city) return [];
      return MUSIC_HISTORY.filter(
        (e) => e.location.city.toLowerCase() === city.name.toLowerCase(),
      ).sort((a, b) => a.year - b.year);
    }

    return [];
  }, [selectedLocation]);

  // Collapse all events when location changes; auto-expand if only one event
  useEffect(() => {
    if (events.length === 1) {
      setExpandedEvents(new Set([events[0].id]));
    } else {
      setExpandedEvents(new Set());
    }
  }, [selectedLocation, events]);

  // Expand only the pinned event (from timeline click), collapse others
  useEffect(() => {
    if (pinnedEvent) {
      setExpandedEvents(new Set([pinnedEvent.id]));
    }
  }, [pinnedEvent]);

  if (!selectedLocation) return null;

  const close = () => dispatch({ type: 'SELECT_LOCATION', payload: null });

  const navigateToEvent = (event: HistoricalEvent) => {
    const city = CITIES.find(
      (c) => c.name.toLowerCase() === event.location.city.toLowerCase(),
    );
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

  return (
    <div
      className="absolute left-4 top-16 z-[1000] flex flex-col rounded-xl border border-zinc-700/50 bg-zinc-900/80 shadow-2xl backdrop-blur-xl"
      style={{
        width,
        maxHeight: collapsed ? undefined : 'calc(100% - 14rem)',
      }}
    >
      {/* Drag-resize handle on right edge */}
      <div
        className="absolute right-0 top-0 flex h-full w-2 cursor-ew-resize items-center justify-center rounded-r-xl opacity-0 transition-opacity hover:opacity-100 active:opacity-100"
        onMouseDown={onDragStart}
      >
        <GripVertical className="size-3 text-zinc-500" />
      </div>

      <div className="shrink-0 p-4">
        {/* Collapse + Close buttons */}
        <div className="absolute right-3 top-3 flex items-center gap-1">
          <button
            className="text-zinc-500 transition-colors hover:text-white"
            title={collapsed ? 'Expand' : 'Collapse'}
            onClick={() => setCollapsed((c) => !c)}
          >
            <ChevronRight
              className={`size-4 transition-transform ${collapsed ? 'rotate-0' : 'rotate-90'}`}
            />
          </button>
          <button
            className="text-zinc-500 transition-colors hover:text-white"
            onClick={close}
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Country */}
        {selectedLocation.type === 'country' && (
          <>
            <h3 className="text-xl font-semibold">{selectedLocation.name}</h3>
            <p className="mt-0.5 text-sm text-zinc-500">
              ISO: {selectedLocation.iso}
            </p>
          </>
        )}

        {/* State / Province */}
        {selectedLocation.type === 'state' && (
          <>
            <h3 className="text-xl font-semibold">{selectedLocation.name}</h3>
            <p className="mt-0.5 text-sm text-zinc-500">
              {selectedLocation.country ?? 'United States'}
            </p>
          </>
        )}

        {/* City header */}
        {selectedLocation.type === 'city' &&
          (() => {
            const city = CITIES.find((c) => c.id === selectedLocation.id);
            if (!city) return <p className="text-zinc-400">City not found</p>;
            return (
              <>
                <h3 className="text-xl font-semibold">{city.name}</h3>
                <p className="text-sm text-zinc-500">{city.country}</p>
                <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                  {city.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {city.genres.map((genre) => (
                    <GenreBadge key={genre} genre={genre} />
                  ))}
                </div>
                <div className="mt-3 text-sm text-zinc-500">
                  Active: {city.activeDecades.map((d) => `${d}s`).join(', ')}
                </div>
              </>
            );
          })()}
      </div>

      {!collapsed && (
        <EventList
          events={events}
          expandedEvents={expandedEvents}
          onNavigateToEvent={navigateToEvent}
          onToggle={toggleEvent}
        />
      )}
    </div>
  );
}
