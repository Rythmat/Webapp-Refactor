import { useMemo, useEffect, useState, useCallback } from 'react'
import { ZoomIn, ZoomOut } from 'lucide-react'
import { useAppState, useAppDispatch } from '@/components/atlas/context/AppContext'
import { CITIES, MUSIC_HISTORY, MUSICAL_ERAS } from '@/components/atlas/data'
import type { MusicalEra } from '@/components/atlas/data/musicalEras'
import type { HistoricalEvent, SelectedLocation } from '@/components/atlas/types'

const COUNTRY_ALIASES: Record<string, string> = {
  'United States of America': 'US',
  'United Kingdom': 'UK',
  'Republic of Korea': 'South Korea',
  'Korea': 'South Korea',
  'Dem. Rep. Korea': 'North Korea',
  'Czech Republic': 'Czechia',
  "Côte d'Ivoire": 'Ivory Coast',
}

function getEventsForLocation(
  selectedLocation: SelectedLocation | null,
): HistoricalEvent[] {
  if (!selectedLocation) return []

  if (selectedLocation.type === 'country') {
    const resolved = COUNTRY_ALIASES[selectedLocation.name] ?? selectedLocation.name
    const cityNames = new Set(
      CITIES.filter((c) => c.country === resolved).map((c) => c.name.toLowerCase()),
    )
    const resolvedLower = resolved.toLowerCase()
    return MUSIC_HISTORY
      .filter(
        (e) =>
          cityNames.has(e.location.city.toLowerCase()) ||
          e.location.country.toLowerCase() === resolvedLower,
      )
      .sort((a, b) => a.year - b.year)
  }

  if (selectedLocation.type === 'state') {
    const cityNames = new Set(
      CITIES.filter((c) => c.subdivision === selectedLocation.name).map((c) =>
        c.name.toLowerCase(),
      ),
    )
    return MUSIC_HISTORY
      .filter((e) => cityNames.has(e.location.city.toLowerCase()))
      .sort((a, b) => a.year - b.year)
  }

  if (selectedLocation.type === 'city') {
    const city = CITIES.find((c) => c.id === selectedLocation.id)
    if (!city) return []
    return MUSIC_HISTORY
      .filter((e) => e.location.city.toLowerCase() === city.name.toLowerCase())
      .sort((a, b) => a.year - b.year)
  }

  return []
}

function filterByEra(events: HistoricalEvent[], eraId: string | null): HistoricalEvent[] {
  if (!eraId) return events
  const era = MUSICAL_ERAS.find((e) => e.id === eraId)
  if (!era) return events
  return events.filter((e) => e.year >= era.yearStart && e.year <= era.yearEnd)
}

// Resolve display names: { country, subtitle? }
// Subtitle is dynamic — city is added only when an event is pinned
function getDisplayNames(
  selectedLocation: SelectedLocation,
  pinnedEvent: HistoricalEvent | null,
): { country: string; subtitle?: string } {
  if (selectedLocation.type === 'country') {
    if (pinnedEvent) {
      const cityName = pinnedEvent.location.city
      const cityData = CITIES.find((c) => c.name.toLowerCase() === cityName.toLowerCase())
      const sub = cityData?.subdivision ? `${cityName}, ${cityData.subdivision}` : cityName
      return { country: selectedLocation.name, subtitle: sub }
    }
    return { country: selectedLocation.name }
  }
  if (selectedLocation.type === 'state') {
    const stateName = selectedLocation.name
    const countryName = selectedLocation.country ?? 'United States'
    if (pinnedEvent) {
      return { country: countryName, subtitle: `${pinnedEvent.location.city}, ${stateName}` }
    }
    return { country: countryName, subtitle: stateName }
  }
  if (selectedLocation.type === 'city') {
    const city = CITIES.find((c) => c.id === selectedLocation.id)
    if (city) {
      const sub = city.subdivision ? `${city.name}, ${city.subdivision}` : city.name
      return { country: city.country, subtitle: sub }
    }
    return { country: 'Unknown' }
  }
  return { country: '' }
}

export function RegionTimeline() {
  const { selectedLocation, pinnedEvent, selectedEra } = useAppState()
  const dispatch = useAppDispatch()

  const locationEvents = useMemo(
    () => getEventsForLocation(selectedLocation),
    [selectedLocation],
  )

  const events = useMemo(
    () => filterByEra(locationEvents, selectedEra),
    [locationEvents, selectedEra],
  )

  // Auto-pin if only one event
  useEffect(() => {
    if (events.length === 1) {
      dispatch({ type: 'PIN_EVENT', payload: events[0] })
    }
  }, [events, dispatch])

  // Only use pinnedEvent for subtitle if it belongs to this region's events
  const relevantPinned = pinnedEvent && events.some((e) => e.id === pinnedEvent.id) ? pinnedEvent : null
  const { country, subtitle } = selectedLocation
    ? getDisplayNames(selectedLocation, relevantPinned)
    : { country: 'Earth', subtitle: undefined }

  const activeEra: MusicalEra | undefined = selectedEra ? MUSICAL_ERAS.find((e) => e.id === selectedEra) : undefined
  const hasEvents = events.length > 0

  // Full range of events (snapped to decades)
  const minYear = hasEvents ? events[0].year : 0
  const maxYear = hasEvents ? events[events.length - 1].year : 0
  const fullStart = Math.floor(minYear / 10) * 10
  const fullEnd = Math.ceil(maxYear / 10) * 10
  const fullRange = fullEnd - fullStart || 1

  // Zoom state: 1 = fit all, higher = zoomed in
  const [zoom, setZoom] = useState(1)
  const [viewCenter, setViewCenter] = useState((fullStart + fullEnd) / 2)

  // Reset zoom when events change (location or era switch)
  useEffect(() => {
    setZoom(1)
    setViewCenter((fullStart + fullEnd) / 2)
  }, [fullStart, fullEnd])

  // Re-center on pinned event
  useEffect(() => {
    if (relevantPinned && zoom > 1) {
      setViewCenter(relevantPinned.year)
    }
  }, [relevantPinned])

  // Visible window
  const viewSpan = fullRange / zoom
  const halfSpan = viewSpan / 2
  const clampedCenter = Math.max(fullStart + halfSpan, Math.min(fullEnd - halfSpan, viewCenter))
  const viewStart = clampedCenter - halfSpan
  const viewEnd = clampedCenter + halfSpan
  const viewRange = viewEnd - viewStart || 1

  // Tick marks for visible window
  const tickStep = viewRange <= 30 ? 5 : viewRange <= 60 ? 10 : viewRange <= 200 ? 20 : viewRange <= 500 ? 50 : 100
  const tickSnapStart = Math.ceil(viewStart / tickStep) * tickStep
  const ticks: number[] = []
  for (let y = tickSnapStart; y <= viewEnd; y += tickStep) ticks.push(y)

  // Visible events
  const visibleEvents = hasEvents ? events.filter((e) => e.year >= viewStart && e.year <= viewEnd) : []

  const pct = (year: number) => ((year - viewStart) / viewRange) * 100

  const canZoomIn = zoom < 16
  const canZoomOut = zoom > 1

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(16, z * 2))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom((z) => {
      const next = z / 2
      if (next <= 1) {
        setViewCenter((fullStart + fullEnd) / 2)
        return 1
      }
      return next
    })
  }, [fullStart, fullEnd])

  const handleSelect = (event: HistoricalEvent) => {
    const city = CITIES.find((c) => c.name.toLowerCase() === event.location.city.toLowerCase())
    if (city) {
      dispatch({ type: 'SELECT_LOCATION', payload: { type: 'city', id: city.id } })
    }
    dispatch({ type: 'PIN_EVENT', payload: event })
    dispatch({
      type: 'EXECUTE_SEARCH',
      payload: { lat: event.location.lat, lng: event.location.lng, zoom: 10 },
    })
  }

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-[min(90vw,800px)]">
      <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-xl shadow-2xl px-6 py-4">
          {/* Region header */}
          <div className="text-center mb-2">
            <h3 className="text-sm font-semibold text-white tracking-wide">
              {country}
            </h3>
            {subtitle && (
              <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>
            )}
          </div>

          {/* Selected era label */}
          {activeEra && (
            <p className={`text-[11px] font-medium text-center mb-2 ${activeEra.activeText}`}>
              {activeEra.label}
            </p>
          )}

          {/* Timeline or empty state */}
          {hasEvents ? (
            <div className="flex items-center gap-2">
              {/* Zoom out */}
              <button
                onClick={handleZoomOut}
                disabled={!canZoomOut}
                className={`shrink-0 p-1 rounded transition-colors ${
                  canZoomOut
                    ? 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
                    : 'text-zinc-700 cursor-default'
                }`}
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              {/* Timeline track */}
              <div className="relative flex-1" style={{ height: '32px' }}>
                {/* Tick labels */}
                <div className="absolute inset-x-0 top-0 h-4">
                  {ticks.map((year) => (
                    <span
                      key={year}
                      className="absolute text-[10px] text-zinc-500 -translate-x-1/2"
                      style={{ left: `${pct(year)}%` }}
                    >
                      {year}
                    </span>
                  ))}
                </div>

                {/* Track line */}
                <div className="absolute inset-x-0 top-[22px] h-[2px] bg-zinc-700 rounded-full" />

                {/* Event dots */}
                {visibleEvents.map((event) => {
                  const isPinned = pinnedEvent?.id === event.id
                  return (
                    <button
                      key={event.id}
                      className={`absolute top-[16px] -translate-x-1/2 rounded-full border-2 transition-all ${
                        isPinned
                          ? 'w-3.5 h-3.5 bg-teal-400 border-teal-300 shadow-[0_0_8px_rgba(45,212,191,0.6)]'
                          : 'w-2.5 h-2.5 bg-white/80 border-zinc-600 hover:bg-teal-400 hover:border-teal-300 hover:shadow-[0_0_6px_rgba(45,212,191,0.4)]'
                      }`}
                      style={{ left: `${pct(event.year)}%` }}
                      onClick={() => handleSelect(event)}
                    />
                  )
                })}
              </div>

              {/* Zoom in */}
              <button
                onClick={handleZoomIn}
                disabled={!canZoomIn}
                className={`shrink-0 p-1 rounded transition-colors ${
                  canZoomIn
                    ? 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
                    : 'text-zinc-700 cursor-default'
                }`}
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <p className="text-xs text-zinc-500 text-center py-2">
              No events{selectedLocation ? ` in ${country}` : ''} for this era
            </p>
          )}
      </div>
    </div>
  )
}
