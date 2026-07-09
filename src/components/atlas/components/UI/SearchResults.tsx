import { X, MapPin, Calendar, Maximize2, Minimize2 } from 'lucide-react';
import { useState } from 'react';
import { AtlasVideo } from '@/components/atlas/components/UI/AtlasVideo';
import { EventInfluence } from '@/components/atlas/components/UI/EventInfluence';
import {
  useAppState,
  useAppDispatch,
} from '@/components/atlas/context/AppContext';
import { CITIES } from '@/components/atlas/data';
import type { HistoricalEvent } from '@/components/atlas/types';
import { sameCountry } from '@/components/atlas/utils/country';

export function SearchResults() {
  const { searchResults, searchQuery, pinnedEvent } = useAppState();
  const dispatch = useAppDispatch();
  const [enlarged, setEnlarged] = useState(false);

  if (searchResults.length === 0) return null;

  const close = () => {
    dispatch({ type: 'SET_SEARCH_RESULTS', payload: [] });
  };

  // Pin (and fly to) an event, or unpin it if it's already the pinned one.
  const togglePin = (event: HistoricalEvent, isPinned: boolean) => {
    if (isPinned) {
      dispatch({ type: 'PIN_EVENT', payload: null });
      return;
    }
    dispatch({ type: 'PIN_EVENT', payload: event });
    dispatch({
      type: 'EXECUTE_SEARCH',
      payload: {
        lat: event.location.lat,
        lng: event.location.lng,
        zoom: 8,
        year: event.year,
      },
    });
  };

  // Enlarge the panel, focused on an event. If it's the event already playing,
  // don't re-pin it (that would reset the arcs and stop the spin) — just grow
  // the panel so the video keeps playing uninterrupted.
  const enlargeEvent = (event: HistoricalEvent, isPinned: boolean) => {
    if (!isPinned) {
      dispatch({ type: 'PIN_EVENT', payload: event });
      dispatch({
        type: 'EXECUTE_SEARCH',
        payload: {
          lat: event.location.lat,
          lng: event.location.lng,
          zoom: 8,
          year: event.year,
        },
      });
    }
    setEnlarged(true);
  };

  // Navigate to an event reached from an influence chain — select its city
  // (country-aware), pin it, and fly.
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

  return (
    <div
      className="absolute left-4 top-14 z-[1000] flex max-h-[calc(100%-6rem)] w-[min(92vw,24rem)] flex-col rounded-2xl border border-white/10 bg-black/20 shadow-2xl backdrop-blur-md"
      style={enlarged ? { width: 'min(66vw, 900px)' } : undefined}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
        <p className="text-sm text-white/70">
          <span className="font-medium text-white">{searchResults.length}</span>{' '}
          result{searchResults.length !== 1 && 's'} for{' '}
          <span className="text-[#60a5fa]">"{searchQuery}"</span>
        </p>
        <button
          aria-label="Close search results"
          className="text-white/40 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa]"
          onClick={close}
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Results list */}
      <div className="space-y-2 overflow-y-auto p-2">
        {searchResults.map((event) => {
          const isPinned = pinnedEvent?.id === event.id;
          const focused = enlarged && isPinned;
          // While enlarged only the focused card shows; hidden via CSS (not
          // filtered) so the video's <iframe> is never reparented.
          return (
            <div
              key={event.id}
              className={`w-full rounded-xl p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa] ${
                enlarged && !isPinned ? 'hidden' : ''
              } ${enlarged ? 'cursor-default' : 'cursor-pointer'} ${
                isPinned
                  ? 'border border-[#60a5fa66] bg-[#60a5fa1a]'
                  : 'border border-white/10 bg-white/5 hover:bg-white/10'
              }`}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (!enlarged) togglePin(event, isPinned);
              }}
              onKeyDown={(e) => {
                if (
                  !enlarged &&
                  e.target === e.currentTarget &&
                  (e.key === 'Enter' || e.key === ' ')
                ) {
                  e.preventDefault();
                  togglePin(event, isPinned);
                }
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <h4
                  className={`font-semibold leading-snug text-white ${focused ? 'text-lg' : 'text-sm'}`}
                >
                  {event.title}
                </h4>
                <button
                  aria-label={focused ? 'Shrink' : 'Enlarge'}
                  title={focused ? 'Shrink' : 'Enlarge'}
                  className="shrink-0 rounded text-white/40 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa]"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (focused) setEnlarged(false);
                    else enlargeEvent(event, isPinned);
                  }}
                >
                  {focused ? (
                    <Minimize2 className="size-4" />
                  ) : (
                    <Maximize2 className="size-3.5" />
                  )}
                </button>
              </div>

              <div className="mt-1.5 flex items-center gap-3 text-xs text-white/60">
                <span className="flex items-center gap-1">
                  <Calendar className="size-3" /> {event.year}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="size-3" /> {event.location.city},{' '}
                  {event.location.country}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-1">
                {event.genre.map((g) => (
                  <span
                    key={g}
                    className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/70"
                  >
                    {g}
                  </span>
                ))}
              </div>

              <p
                className={`mt-2 text-white/60 ${focused ? 'text-base leading-relaxed' : 'text-xs'} ${isPinned ? '' : 'line-clamp-2'}`}
              >
                {event.description}
              </p>
              {isPinned && event.videoId && (
                <AtlasVideo
                  videoId={event.videoId}
                  title={event.title}
                  onPlay={() => dispatch({ type: 'OPEN_INFLUENCE_ARCS' })}
                  className={`rounded border border-white/10 ${focused ? 'mx-auto mt-4 max-w-2xl' : 'mt-2'}`}
                />
              )}
              {isPinned && (
                <EventInfluence
                  event={event}
                  onNavigate={navigateToEvent}
                  className={
                    focused
                      ? 'mt-4 grid gap-x-8 gap-y-3 border-t border-white/10 pt-4 sm:grid-cols-2 [&>div]:min-w-0'
                      : undefined
                  }
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
