import { useState, useMemo, useEffect } from 'react'
import { X, ChevronDown, Calendar, MapPin, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useAppState, useAppDispatch } from '@/components/atlas/context/AppContext'
import { CITIES, MUSIC_HISTORY, getConnectionsForEvent, getUpstreamChain, getDownstreamChain, getEventCountryColor } from '@/components/atlas/data'
import type { HistoricalEvent } from '@/components/atlas/types'
import type { UpstreamChainNode } from '@/components/atlas/data/eventConnections'

// Map GeoJSON country names to CITIES/event country codes
const COUNTRY_ALIASES: Record<string, string> = {
  'United States of America': 'US',
  'United Kingdom': 'UK',
  'Republic of Korea': 'South Korea',
  'Korea': 'South Korea',
  'Dem. Rep. Korea': 'North Korea',
  'Czech Republic': 'Czechia',
  "Côte d'Ivoire": 'Ivory Coast',
}

// Recursive influence tree (used for both upstream and downstream)
function InfluenceTree({ nodes, onNavigate, depth = 0, direction = 'upstream' }: {
  nodes: UpstreamChainNode[]
  onNavigate: (event: HistoricalEvent) => void
  depth?: number
  direction?: 'upstream' | 'downstream'
}) {
  if (nodes.length === 0) return null
  const Icon = direction === 'upstream' ? ArrowDownRight : ArrowUpRight
  return (
    <div className={depth > 0 ? 'ml-3 pl-2 border-l border-zinc-700/30 mt-1' : ''}>
      {nodes.map((node) => {
        const hex = getEventCountryColor(node.event)
        return (
          <div key={node.event.id} className="mb-1">
            <button
              onClick={(e) => { e.stopPropagation(); onNavigate(node.event) }}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full hover:brightness-125"
              style={{ backgroundColor: `${hex}33`, color: hex }}
            >
              <Icon className="w-3 h-3" />
              <span>{node.event.title}</span>
              <span className="ml-0.5" style={{ color: `${hex}80` }}>{node.event.year}</span>
            </button>
            {node.upstream.length > 0 && (
              <InfluenceTree nodes={node.upstream} onNavigate={onNavigate} depth={depth + 1} direction={direction} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function countNodes(nodes: UpstreamChainNode[]): number {
  let n = 0
  for (const node of nodes) { n += 1 + countNodes(node.upstream) }
  return n
}

// Collapsible section for influence trees — defaults to collapsed
function CollapsibleInfluence({ label, count, children }: {
  label: string
  count: number
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        className="flex items-center gap-1 text-xs text-zinc-400 font-medium mb-1 hover:text-zinc-300 transition-colors"
      >
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-0' : '-rotate-90'}`} />
        {label} ({count})
      </button>
      {open && children}
    </div>
  )
}

function EventList({
  events,
  expandedEvents,
  onToggle,
  onNavigateToEvent,
}: {
  events: HistoricalEvent[]
  expandedEvents: Set<string>
  onToggle: (id: string) => void
  onNavigateToEvent: (event: HistoricalEvent) => void
}) {
  if (events.length === 0) {
    return (
      <div className="border-t border-zinc-700/50 px-4 py-3">
        <p className="text-xs text-zinc-500">No events found</p>
      </div>
    )
  }

  return (
    <div className="border-t border-zinc-700/50 overflow-y-auto px-4 pb-3">
      <p className="text-sm text-zinc-500 mt-3 mb-2">
        {events.length} event{events.length !== 1 && 's'}
      </p>
      <div className="space-y-2">
        {events.map((event) => {
          const isExpanded = expandedEvents.has(event.id)
          return (
            <button
              key={event.id}
              onClick={() => onToggle(event.id)}
              className={`w-full text-left p-2.5 rounded-lg transition-colors ${
                isExpanded
                  ? 'bg-teal-600/15 border border-teal-500/30'
                  : 'bg-zinc-800/40 hover:bg-zinc-800/70 border border-transparent'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-semibold text-white leading-snug">{event.title}</h4>
                <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {event.year}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {event.location.city}
                </span>
              </div>
              {isExpanded && (() => {
                const upstreamChain = getUpstreamChain(event.id)
                const downstreamChain = getDownstreamChain(event.id)
                const hasConnections = upstreamChain.length > 0 || downstreamChain.length > 0
                return (
                  <>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {event.genre.map((g) => (
                        <span key={g} className="px-2 py-0.5 bg-teal-600/30 text-teal-300 text-xs rounded-full">
                          {g}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm text-zinc-300 mt-2 leading-relaxed">{event.description}</p>
                    {hasConnections && (
                      <div className="mt-3 pt-2 border-t border-zinc-700/40 space-y-2">
                        {upstreamChain.length > 0 && (
                          <CollapsibleInfluence label="Influenced by" count={countNodes(upstreamChain)}>
                            <InfluenceTree nodes={upstreamChain} onNavigate={onNavigateToEvent} />
                          </CollapsibleInfluence>
                        )}
                        {downstreamChain.length > 0 && (
                          <CollapsibleInfluence label="Influenced" count={countNodes(downstreamChain)}>
                            <InfluenceTree nodes={downstreamChain} onNavigate={onNavigateToEvent} direction="downstream" />
                          </CollapsibleInfluence>
                        )}
                      </div>
                    )}
                  </>
                )
              })()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function DetailsCard() {
  const { selectedLocation, pinnedEvent } = useAppState()
  const dispatch = useAppDispatch()
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())

  const events = useMemo(() => {
    if (!selectedLocation) return []

    if (selectedLocation.type === 'country') {
      const resolved = COUNTRY_ALIASES[selectedLocation.name] ?? selectedLocation.name
      const cityNames = new Set(
        CITIES.filter((c) => c.country === resolved).map((c) => c.name.toLowerCase())
      )
      const resolvedLower = resolved.toLowerCase()
      return MUSIC_HISTORY
        .filter((e) =>
          cityNames.has(e.location.city.toLowerCase()) ||
          e.location.country.toLowerCase() === resolvedLower
        )
        .sort((a, b) => a.year - b.year)
    }

    if (selectedLocation.type === 'state') {
      const cityNames = new Set(
        CITIES.filter((c) => c.subdivision === selectedLocation.name).map((c) => c.name.toLowerCase())
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
  }, [selectedLocation])

  // Collapse all events when location changes; auto-expand if only one event
  useEffect(() => {
    if (events.length === 1) {
      setExpandedEvents(new Set([events[0].id]))
    } else {
      setExpandedEvents(new Set())
    }
  }, [selectedLocation, events])

  // Expand only the pinned event (from timeline click), collapse others
  useEffect(() => {
    if (pinnedEvent) {
      setExpandedEvents(new Set([pinnedEvent.id]))
    }
  }, [pinnedEvent])

  if (!selectedLocation) return null

  const close = () => dispatch({ type: 'SELECT_LOCATION', payload: null })

  const navigateToEvent = (event: HistoricalEvent) => {
    const city = CITIES.find(c => c.name.toLowerCase() === event.location.city.toLowerCase())
    if (city) dispatch({ type: 'SELECT_LOCATION', payload: { type: 'city', id: city.id } })
    dispatch({ type: 'PIN_EVENT', payload: event })
    dispatch({ type: 'EXECUTE_SEARCH', payload: { lat: event.location.lat, lng: event.location.lng, zoom: 10 } })
  }

  const toggleEvent = (id: string) => {
    setExpandedEvents((prev) => {
      if (prev.has(id)) {
        dispatch({ type: 'PIN_EVENT', payload: null })
        return new Set()
      }
      const event = events.find((e) => e.id === id)
      if (event) dispatch({ type: 'PIN_EVENT', payload: event })
      return new Set([id])
    })
  }

  return (
    <div className="absolute left-4 top-16 z-[1000] w-[480px] max-h-[calc(100%-6rem)] bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-xl shadow-2xl flex flex-col">
      <div className="p-4 shrink-0">
        {/* Close button */}
        <button
          onClick={close}
          className="absolute top-3 right-3 text-zinc-500 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Country */}
        {selectedLocation.type === 'country' && (
          <>
            <h3 className="text-xl font-semibold">{selectedLocation.name}</h3>
            <p className="text-sm text-zinc-500 mt-0.5">ISO: {selectedLocation.iso}</p>
          </>
        )}

        {/* State / Province */}
        {selectedLocation.type === 'state' && (
          <>
            <h3 className="text-xl font-semibold">{selectedLocation.name}</h3>
            <p className="text-sm text-zinc-500 mt-0.5">{selectedLocation.country ?? 'United States'}</p>
          </>
        )}

        {/* City header */}
        {selectedLocation.type === 'city' && (() => {
          const city = CITIES.find((c) => c.id === selectedLocation.id)
          if (!city) return <p className="text-zinc-400">City not found</p>
          return (
            <>
              <h3 className="text-xl font-semibold">{city.name}</h3>
              <p className="text-sm text-zinc-500">{city.country}</p>
              <p className="text-sm text-zinc-300 mt-3 leading-relaxed">{city.description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {city.genres.map((genre) => (
                  <span
                    key={genre}
                    className="px-2.5 py-0.5 bg-teal-600/30 text-teal-300 text-sm rounded-full"
                  >
                    {genre}
                  </span>
                ))}
              </div>
              <div className="mt-3 text-sm text-zinc-500">
                Active: {city.activeDecades.map((d) => `${d}s`).join(', ')}
              </div>
            </>
          )
        })()}
      </div>

      <EventList
        events={events}
        expandedEvents={expandedEvents}
        onToggle={toggleEvent}
        onNavigateToEvent={navigateToEvent}
      />
    </div>
  )
}
